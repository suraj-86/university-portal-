const { isPositiveInt, str } = require('../lib/validate');
const { announcementVisibility } = require('../lib/visibility');

const CATEGORIES = ['University', 'Department', 'Academic', 'Event', 'Other'];
const AUDIENCES = ['all', 'teacher', 'student', 'parent'];
const PRIORITIES = ['Normal', 'High'];

module.exports = (app, { queryAsync, verifyRole, audit }) => {
    const everyone = verifyRole(['admin', 'teacher', 'student', 'parent']);
    const admin = verifyRole(['admin']);
    const nonAdmin = verifyRole(['teacher', 'student', 'parent']);

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Announcements route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });

    const validate = async (b = {}) => {
        const title = str(b.title);
        const content = str(b.content);
        const category = str(b.category) || 'University';
        const audience = str(b.audience) || 'all';
        const priority = str(b.priority) || 'Normal';
        const pinned = b.pinned === true || b.pinned === 'true' || b.pinned === 1 ? 1 : 0;
        const courseId = b.course_id === '' || b.course_id === null || b.course_id === undefined ? null : Number(b.course_id);
        const semester = b.semester === '' || b.semester === null || b.semester === undefined ? null : Number(b.semester);

        if (!title || title.length > 200) return { error: 'A title (up to 200 characters) is required.' };
        if (!content || content.length > 5000) return { error: 'Content (up to 5000 characters) is required.' };
        if (!CATEGORIES.includes(category)) return { error: 'Invalid category.' };
        if (!AUDIENCES.includes(audience)) return { error: 'Invalid audience.' };
        if (!PRIORITIES.includes(priority)) return { error: 'Invalid priority.' };
        if (courseId !== null && !isPositiveInt(courseId)) return { error: 'Invalid course.' };
        if (semester !== null && (!Number.isInteger(semester) || semester < 1 || semester > 12)) return { error: 'Invalid semester.' };
        if (semester !== null && courseId === null) return { error: 'Choose a course to target a semester.' };
        if (courseId !== null) {
            const found = await queryAsync('SELECT id FROM courses WHERE id = ?', [courseId]);
            if (!found.length) return { error: 'That course does not exist.' };
        }
        return { value: { title, content, category, audience, priority, pinned, courseId, semester } };
    };

    app.get('/api/announcements', everyone, safe(async (req, res) => {
        const vis = announcementVisibility(req.user.role, req.user.id);
        const rows = await queryAsync(
            `SELECT a.id, a.title, a.content, a.category, a.audience, a.course_id, a.semester, a.priority, a.pinned,
                    a.created_at, a.updated_at, c.course_name,
                    (ar.read_at IS NOT NULL) AS is_read,
                    (SELECT COUNT(*) FROM announcement_reads x WHERE x.announcement_id = a.id) AS read_count
               FROM announcements a
               LEFT JOIN courses c ON c.id = a.course_id
               LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
              WHERE ${vis.sql}
              ORDER BY a.pinned DESC, a.created_at DESC, a.id DESC LIMIT 300`,
            [req.user.id, ...vis.params]);
        res.json(rows.map((r) => ({
            ...r,
            pinned: !!Number(r.pinned),
            is_read: req.user.role === 'admin' ? true : !!Number(r.is_read),
            read_count: req.user.role === 'admin' ? Number(r.read_count) : undefined
        })));
    }));

    app.post('/api/announcements/read', nonAdmin, safe(async (req, res) => {
        const ids = [...new Set(((req.body && req.body.ids) || []).map(Number).filter(isPositiveInt))].slice(0, 200);
        if (!ids.length) return res.json({ success: true, marked: 0 });
        const vis = announcementVisibility(req.user.role, req.user.id);
        const visible = await queryAsync(`SELECT a.id FROM announcements a WHERE a.id IN (?) AND ${vis.sql}`, [ids, ...vis.params]);
        if (visible.length) {
            await queryAsync('INSERT IGNORE INTO announcement_reads (announcement_id, user_id) VALUES ?',
                [visible.map((v) => [v.id, req.user.id])]);
        }
        res.json({ success: true, marked: visible.length });
    }));

    app.post('/api/announcements', admin, safe(async (req, res) => {
        const { value: v, error } = await validate(req.body);
        if (error) return res.status(400).json({ error });
        const r = await queryAsync(
            `INSERT INTO announcements (title, content, category, audience, course_id, semester, priority, pinned, published_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [v.title, v.content, v.category, v.audience, v.courseId, v.semester, v.priority, v.pinned, req.user.id]);
        audit(req, { action: 'ANNOUNCEMENT_CREATE', entity: 'announcements', entityId: r.insertId, newValue: { title: v.title, audience: v.audience, category: v.category } });
        res.json({ success: true, id: r.insertId });
    }));

    app.put('/api/announcements/:id', admin, safe(async (req, res) => {
        if (!isPositiveInt(req.params.id)) return res.status(400).json({ error: 'Invalid identifier.' });
        const id = Number(req.params.id);
        const { value: v, error } = await validate(req.body);
        if (error) return res.status(400).json({ error });
        const old = await queryAsync('SELECT title, audience, category FROM announcements WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Announcement not found.' });
        await queryAsync(
            `UPDATE announcements SET title = ?, content = ?, category = ?, audience = ?, course_id = ?, semester = ?, priority = ?, pinned = ? WHERE id = ?`,
            [v.title, v.content, v.category, v.audience, v.courseId, v.semester, v.priority, v.pinned, id]);
        audit(req, { action: 'ANNOUNCEMENT_UPDATE', entity: 'announcements', entityId: id, oldValue: old[0], newValue: { title: v.title, audience: v.audience, category: v.category } });
        res.json({ success: true });
    }));

    app.delete('/api/announcements/:id', admin, safe(async (req, res) => {
        if (!isPositiveInt(req.params.id)) return res.status(400).json({ error: 'Invalid identifier.' });
        const id = Number(req.params.id);
        const old = await queryAsync('SELECT title, audience FROM announcements WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Announcement not found.' });
        await queryAsync('DELETE FROM announcements WHERE id = ?', [id]);
        audit(req, { action: 'ANNOUNCEMENT_DELETE', entity: 'announcements', entityId: id, oldValue: old[0] });
        res.json({ success: true });
    }));
};
