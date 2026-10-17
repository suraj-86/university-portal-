const { noticeVisibility, announcementVisibility } = require('../lib/visibility');

module.exports = (app, { queryAsync, verifyRole }) => {
    const unreadNotifications = async (userId) =>
        Number((await queryAsync('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL', [userId]))[0].c);

    app.get('/api/inbox/counts', verifyRole(['admin', 'teacher', 'student', 'parent']), async (req, res) => {
        try {
            if (req.user.role === 'admin') return res.json({ notices: 0, announcements: 0, messages: 0, notifications: await unreadNotifications(req.user.id) });
            const me = req.user.id;
            const nv = noticeVisibility(req.user.role, me, null);
            const av = announcementVisibility(req.user.role, me);

            const [notices, announcements, messages, unread] = await Promise.all([
                queryAsync(
                    `SELECT COUNT(*) AS c FROM notices n LEFT JOIN subjects sub ON sub.id = n.subject_id
                      WHERE ${nv.sql} AND NOT EXISTS (SELECT 1 FROM notice_reads x WHERE x.notice_id = n.id AND x.user_id = ?)`,
                    [...nv.params, me]),
                queryAsync(
                    `SELECT COUNT(*) AS c FROM announcements a
                      WHERE ${av.sql} AND NOT EXISTS (SELECT 1 FROM announcement_reads x WHERE x.announcement_id = a.id AND x.user_id = ?)`,
                    [...av.params, me]),
                queryAsync(
                    `SELECT COUNT(*) AS c FROM messages m JOIN message_threads th ON th.id = m.thread_id
                      WHERE (th.teacher_user_id = ? OR th.participant_user_id = ?) AND m.sender_user_id <> ? AND m.read_at IS NULL`,
                    [me, me, me]),
                unreadNotifications(me)
            ]);
            res.json({ notices: Number(notices[0].c), announcements: Number(announcements[0].c), messages: Number(messages[0].c), notifications: unread });
        } catch (e) {
            console.error('Inbox counts error:', e.code || e.message);
            res.status(500).json({ error: 'Could not load counts.' });
        }
    });
};
