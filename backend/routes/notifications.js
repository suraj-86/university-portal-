const { isPositiveInt } = require('../lib/validate');
const makeNotifier = require('../lib/notify');

const ALL_ROLES = ['admin', 'teacher', 'student', 'parent'];
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dateText = (d) => {
    const x = d instanceof Date ? d : new Date(d);
    return Number.isNaN(x.getTime()) ? '' : x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

module.exports = (app, { queryAsync, verifyRole, audit }) => {
    const notifier = makeNotifier(queryAsync);
    const everyone = verifyRole(ALL_ROLES);
    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Notifications route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });

    const shape = (role) => (r) => ({
        id: Number(r.id),
        type: r.type,
        title: r.title,
        body: r.body,
        link: r.section ? `/${role}/${r.section}` : null,
        read: r.read_at != null,
        created_at: r.created_at
    });

    app.get('/api/notifications', everyone, safe(async (req, res) => {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
        const before = isPositiveInt(req.query.before) ? Number(req.query.before) : null;
        const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
        notifier.purgeOld();

        const rows = await queryAsync(
            `SELECT id, type, title, body, section, read_at, created_at FROM notifications
              WHERE user_id = ? ${before ? 'AND id < ?' : ''} ${unreadOnly ? 'AND read_at IS NULL' : ''}
              ORDER BY id DESC LIMIT ?`,
            [req.user.id, ...(before ? [before] : []), limit + 1]);
        const unread = await queryAsync('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
        res.json({
            unread: Number(unread[0].c),
            has_more: rows.length > limit,
            items: rows.slice(0, limit).map(shape(req.user.role))
        });
    }));

    app.post('/api/notifications/read', everyone, safe(async (req, res) => {
        const body = req.body || {};
        if (body.all === true) {
            const r = await queryAsync('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
            return res.json({ success: true, marked: r.affectedRows || 0 });
        }
        const list = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(Number).filter(isPositiveInt))].slice(0, 200);
        if (!list.length) return res.json({ success: true, marked: 0 });
        const r = await queryAsync(
            'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id IN (?) AND read_at IS NULL', [req.user.id, list]);
        res.json({ success: true, marked: r.affectedRows || 0 });
    }));

    app.post('/api/admin/fees/remind', verifyRole(['admin']), safe(async (req, res) => {
        const b = req.body || {};
        const courseId = b.course_id === '' || b.course_id == null ? null : Number(b.course_id);
        const semester = b.semester === '' || b.semester == null ? null : Number(b.semester);
        if (courseId !== null && !isPositiveInt(courseId)) return res.status(400).json({ error: 'Invalid course.' });
        if (semester !== null && (!Number.isInteger(semester) || semester < 1 || semester > 12)) return res.status(400).json({ error: 'Invalid semester.' });
        if (semester !== null && courseId === null) return res.status(400).json({ error: 'Choose a course to pick a semester.' });

        const rows = await queryAsync(
            `SELECT f.student_id, st.user_id, COUNT(*) AS pending_count,
                    SUM(f.total_fee - f.paid_amount) AS outstanding, MIN(f.due_date) AS first_due
               FROM fees f
               JOIN students st ON st.student_id = f.student_id
               JOIN users u ON u.id = st.user_id
              WHERE f.status <> 'Paid' AND f.total_fee > f.paid_amount AND st.status = 'Active' AND COALESCE(u.is_active, 1) <> 0
                ${courseId ? 'AND st.course_id = ?' : ''} ${semester ? 'AND st.semester = ?' : ''}
              GROUP BY f.student_id, st.user_id`,
            [courseId, semester].filter((v) => v !== null));
        if (!rows.length) return res.json({ success: true, students: 0, notified: 0, already: 0 });

        const parents = await queryAsync(
            `SELECT psm.student_id, p.user_id FROM parent_student_map psm
               JOIN parents p ON p.parent_id = psm.parent_id JOIN users u ON u.id = p.user_id
              WHERE psm.student_id IN (?) AND COALESCE(u.is_active, 1) <> 0`, [rows.map((r) => r.student_id)]);
        const parentsOf = new Map();
        parents.forEach((p) => { if (!parentsOf.has(p.student_id)) parentsOf.set(p.student_id, []); parentsOf.get(p.student_id).push(p.user_id); });

        const items = [];
        for (const r of rows) {
            const n = Number(r.pending_count);
            const due = dateText(r.first_due);
            const body = `${n} unpaid fee${n === 1 ? '' : 's'}, ${rupees(r.outstanding)} outstanding${due ? `. Earliest due date: ${due}` : ''}.`;
            [r.user_id, ...(parentsOf.get(r.student_id) || [])].forEach((userId) =>
                items.push({ userId, type: 'fee_reminder', title: 'Fee payment reminder', body, section: 'fees', refId: r.student_id }));
        }
        const out = await notifier.sendMany(items, { mode: 'skip' });
        if (out.failed) return res.status(500).json({ error: 'Could not send the reminders. Please try again.' });
        audit(req, { action: 'FEE_REMINDER_SEND', entity: 'fees', newValue: { course_id: courseId, semester, students: rows.length, notified: out.created } });
        res.json({ success: true, students: rows.length, notified: out.created, already: out.skipped });
    }));
};
