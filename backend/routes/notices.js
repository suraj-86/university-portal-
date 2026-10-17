const { isPositiveInt, str } = require('../lib/validate');
const { noticeVisibility } = require('../lib/visibility');
const { studentsFor, parentsOfStudents } = require('../lib/people');
const { singleAttachment, removeAttachment } = require('../lib/upload');
const makeNotifier = require('../lib/notify');

const PRIORITIES = ['Low', 'Normal', 'High'];
const AUDIENCES = ['students', 'parents', 'both'];
const MAX_RECIPIENT_STUDENTS = 500;

module.exports = (app, { queryAsync, transaction, verifyRole, audit }) => {
    const notifier = makeNotifier(queryAsync);
    const readers = verifyRole(['student', 'parent', 'teacher']);
    const senders = verifyRole(['teacher', 'admin']);

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Notices route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });

    const wardOf = async (req, res) => {
        if (req.user.role !== 'parent' || !req.query.student_id) return null;
        if (!isPositiveInt(req.query.student_id)) { res.status(400).json({ error: 'Invalid student.' }); return false; }
        const ok = await queryAsync(
            `SELECT 1 FROM parent_student_map psm JOIN parents p ON p.parent_id = psm.parent_id
              WHERE p.user_id = ? AND psm.student_id = ? LIMIT 1`, [req.user.id, Number(req.query.student_id)]);
        if (!ok.length) { res.status(403).json({ error: 'This student is not linked to your account.' }); return false; }
        return Number(req.query.student_id);
    };

    app.get('/api/notices/feed', readers, safe(async (req, res) => {
        const ward = await wardOf(req, res);
        if (ward === false) return;
        const vis = noticeVisibility(req.user.role, req.user.id, ward);
        const rows = await queryAsync(
            `SELECT n.id, n.title, n.content, n.priority, n.attachment_url, n.target_role, n.created_at,
                    COALESCE(t.full_name, au.username, 'Administration') AS author_name,
                    COALESCE(au.role, 'admin') AS author_role,
                    sub.subject_name,
                    (nr.read_at IS NOT NULL) AS is_read,
                    EXISTS (SELECT 1 FROM notice_recipients pr WHERE pr.notice_id = n.id AND pr.user_id = ?) AS is_personal
               FROM notices n
               LEFT JOIN subjects sub ON sub.id = n.subject_id
               LEFT JOIN users au ON au.id = n.posted_by
               LEFT JOIN teachers t ON t.user_id = au.id
               LEFT JOIN notice_reads nr ON nr.notice_id = n.id AND nr.user_id = ?
              WHERE ${vis.sql}
              ORDER BY n.created_at DESC, n.id DESC LIMIT 300`,
            [req.user.id, req.user.id, ...vis.params]);
        res.json(rows.map((r) => ({ ...r, is_read: !!Number(r.is_read), is_personal: !!Number(r.is_personal) })));
    }));

    app.post('/api/notices/read', readers, safe(async (req, res) => {
        const ids = [...new Set(((req.body && req.body.ids) || []).map(Number).filter(isPositiveInt))].slice(0, 200);
        if (!ids.length) return res.json({ success: true, marked: 0 });
        const vis = noticeVisibility(req.user.role, req.user.id, null);
        const visible = await queryAsync(
            `SELECT n.id FROM notices n LEFT JOIN subjects sub ON sub.id = n.subject_id WHERE n.id IN (?) AND ${vis.sql}`,
            [ids, ...vis.params]);
        if (visible.length) {
            await queryAsync('INSERT IGNORE INTO notice_reads (notice_id, user_id) VALUES ?',
                [visible.map((v) => [v.id, req.user.id])]);
            await notifier.markRead(req.user.id, 'notice', visible.map((v) => v.id));
        }
        res.json({ success: true, marked: visible.length });
    }));

    app.get('/api/notices/targets', senders, safe(async (req, res) => {
        const students = await studentsFor(queryAsync, req.user);
        const counts = students.length
            ? await queryAsync('SELECT student_id, COUNT(*) AS c FROM parent_student_map WHERE student_id IN (?) GROUP BY student_id', [students.map((s) => s.student_id)])
            : [];
        const parentCount = new Map(counts.map((r) => [r.student_id, Number(r.c)]));
        res.json({
            students: students.map((s) => ({
                student_id: s.student_id, name: s.full_name, roll: s.roll_number, enrollment: s.enrollment_number,
                course_id: s.course_id, course_name: s.course_name, course_code: s.course_code, semester: s.semester,
                parents: parentCount.get(s.student_id) || 0
            }))
        });
    }));

    const parseIds = (raw) => {
        let value = raw;
        if (typeof value === 'string') { try { value = JSON.parse(value); } catch (e) { return null; } }
        if (!Array.isArray(value)) return null;
        const ids = [...new Set(value.map(Number))];
        return ids.every(isPositiveInt) ? ids : null;
    };

    app.post('/api/notices/targeted', senders, singleAttachment, safe(async (req, res) => {
        const b = req.body || {};
        const title = str(b.title);
        const content = str(b.content);
        const priority = str(b.priority) || 'Normal';
        const audience = str(b.audience) || 'students';
        const studentIds = parseIds(b.student_ids);
        const cleanup = () => { if (req.file) removeAttachment(req.file.filename); };

        if (!title || title.length > 255) { cleanup(); return res.status(400).json({ error: 'A title (up to 255 characters) is required.' }); }
        if (!content || content.length > 5000) { cleanup(); return res.status(400).json({ error: 'Message content (up to 5000 characters) is required.' }); }
        if (!PRIORITIES.includes(priority) || !AUDIENCES.includes(audience)) { cleanup(); return res.status(400).json({ error: 'Invalid priority or audience.' }); }
        if (!studentIds || studentIds.length === 0) { cleanup(); return res.status(400).json({ error: 'Select at least one student.' }); }
        if (studentIds.length > MAX_RECIPIENT_STUDENTS) { cleanup(); return res.status(400).json({ error: `Too many students (max ${MAX_RECIPIENT_STUDENTS}).` }); }

        const allowed = await studentsFor(queryAsync, req.user);
        const allowedMap = new Map(allowed.map((s) => [s.student_id, s]));
        if (studentIds.some((id) => !allowedMap.has(id))) {
            cleanup();
            return res.status(403).json({ error: 'Some selected students are not in your classes.' });
        }

        const recipientUsers = new Set();
        if (audience === 'students' || audience === 'both') studentIds.forEach((id) => recipientUsers.add(allowedMap.get(id).user_id));
        let parents = [];
        if (audience === 'parents' || audience === 'both') {
            parents = await parentsOfStudents(queryAsync, studentIds);
            parents.forEach((p) => recipientUsers.add(p.user_id));
        }
        if (recipientUsers.size === 0) {
            cleanup();
            return res.status(400).json({ error: 'None of the selected students have a parent account linked.' });
        }

        const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;
        const noticeId = await transaction(async (q) => {
            const r = await q(
                `INSERT INTO notices (title, content, target_role, priority, attachment_url, posted_by, subject_id)
                 VALUES (?, ?, 'targeted', ?, ?, ?, NULL)`,
                [title, content, priority, attachmentUrl, req.user.id]);
            await q('INSERT INTO notice_recipients (notice_id, user_id) VALUES ?', [[...recipientUsers].map((u) => [r.insertId, u])]);
            return r.insertId;
        });

        audit(req, { action: 'NOTICE_TARGETED', entity: 'notices', entityId: noticeId, newValue: { title, audience, recipients: recipientUsers.size, students: studentIds.length } });
        notifier.run(() => notifier.send([...recipientUsers], {
            type: 'notice', section: 'notices', refId: noticeId,
            title: priority === 'High' ? 'Important notice' : 'New notice', body: title
        }, { exclude: [req.user.id] }));
        res.json({ success: true, id: noticeId, recipients: recipientUsers.size });
    }));

    app.get('/api/notices/sent', senders, safe(async (req, res) => {
        const rows = await queryAsync(
            `SELECT n.id, n.title, n.content, n.priority, n.attachment_url, n.target_role, n.subject_id, n.created_at,
                    sub.subject_name, sub.semester, c.course_name,
                    COALESCE(t.full_name, au.username) AS author_name,
                    (SELECT COUNT(*) FROM notice_recipients r WHERE r.notice_id = n.id) AS recipient_count,
                    (SELECT COUNT(*) FROM notice_reads x WHERE x.notice_id = n.id) AS read_count
               FROM notices n
               LEFT JOIN subjects sub ON sub.id = n.subject_id
               LEFT JOIN courses c ON c.id = sub.course_id
               LEFT JOIN users au ON au.id = n.posted_by
               LEFT JOIN teachers t ON t.user_id = au.id
              WHERE (? = 'admin' OR n.posted_by = ?)
              ORDER BY n.created_at DESC, n.id DESC LIMIT 300`,
            [req.user.role, req.user.id]);
        res.json(rows.map((r) => ({ ...r, recipient_count: Number(r.recipient_count), read_count: Number(r.read_count) })));
    }));

    app.get('/api/notices/:id/readers', senders, safe(async (req, res) => {
        if (!isPositiveInt(req.params.id)) return res.status(400).json({ error: 'Invalid identifier.' });
        const id = Number(req.params.id);
        const notice = await queryAsync('SELECT id, posted_by, target_role FROM notices WHERE id = ?', [id]);
        if (!notice.length) return res.status(404).json({ error: 'Notice not found.' });
        if (req.user.role !== 'admin' && notice[0].posted_by !== req.user.id) return res.status(403).json({ error: 'You can only view your own notices.' });
        if (notice[0].target_role !== 'targeted') return res.json({ targeted: false, recipients: [] });
        const rows = await queryAsync(
            `SELECT u.role, COALESCE(s.full_name, p.full_name, tt.full_name, u.username) AS name,
                    (nr.read_at IS NOT NULL) AS is_read, nr.read_at
               FROM notice_recipients r
               JOIN users u ON u.id = r.user_id
               LEFT JOIN students s ON s.user_id = u.id
               LEFT JOIN parents p ON p.user_id = u.id
               LEFT JOIN teachers tt ON tt.user_id = u.id
               LEFT JOIN notice_reads nr ON nr.notice_id = r.notice_id AND nr.user_id = r.user_id
              WHERE r.notice_id = ?
              ORDER BY is_read ASC, name ASC`, [id]);
        res.json({ targeted: true, recipients: rows.map((r) => ({ ...r, is_read: !!Number(r.is_read) })) });
    }));

    const loadOwned = async (req, res) => {
        if (!isPositiveInt(req.params.id)) { res.status(400).json({ error: 'Invalid identifier.' }); return null; }
        const rows = await queryAsync('SELECT id, posted_by, target_role, attachment_url, title FROM notices WHERE id = ?', [Number(req.params.id)]);
        if (!rows.length) { res.status(404).json({ error: 'Notice not found.' }); return null; }
        if (rows[0].target_role !== 'targeted') { res.status(400).json({ error: 'Use the standard notice screen for class and broadcast notices.' }); return null; }
        if (req.user.role !== 'admin' && rows[0].posted_by !== req.user.id) { res.status(403).json({ error: 'You can only change your own notices.' }); return null; }
        return rows[0];
    };

    app.put('/api/notices/targeted/:id', senders, singleAttachment, safe(async (req, res) => {
        const cleanup = () => { if (req.file) removeAttachment(req.file.filename); };
        const notice = await loadOwned(req, res);
        if (!notice) return cleanup();
        const b = req.body || {};
        const title = str(b.title);
        const content = str(b.content);
        const priority = str(b.priority) || 'Normal';
        if (!title || title.length > 255 || !content || content.length > 5000 || !PRIORITIES.includes(priority)) {
            cleanup();
            return res.status(400).json({ error: 'Please provide a valid title, message and priority.' });
        }
        let attachmentUrl = notice.attachment_url;
        if (req.file) attachmentUrl = `/uploads/${req.file.filename}`;
        else if (str(b.remove_attachment) === 'true') attachmentUrl = null;

        await queryAsync('UPDATE notices SET title = ?, content = ?, priority = ?, attachment_url = ? WHERE id = ?',
            [title, content, priority, attachmentUrl, notice.id]);
        if (attachmentUrl !== notice.attachment_url) removeAttachment(notice.attachment_url);
        audit(req, { action: 'NOTICE_TARGETED_EDIT', entity: 'notices', entityId: notice.id, oldValue: { title: notice.title }, newValue: { title, priority } });
        res.json({ success: true });
    }));

    app.delete('/api/notices/targeted/:id', senders, safe(async (req, res) => {
        const notice = await loadOwned(req, res);
        if (!notice) return;
        await queryAsync('DELETE FROM notices WHERE id = ?', [notice.id]);
        removeAttachment(notice.attachment_url);
        notifier.dropFor('notice', notice.id);
        audit(req, { action: 'NOTICE_TARGETED_DELETE', entity: 'notices', entityId: notice.id, oldValue: { title: notice.title } });
        res.json({ success: true });
    }));
};
