const { isPositiveInt, str } = require('../lib/validate');
const { studentsFor, parentsOfStudents } = require('../lib/people');
const { createRateLimiter } = require('../lib/rateLimit');

const MAX_BODY = 2000;
const MAX_BATCH = 200;

module.exports = (app, { queryAsync, transaction, verifyRole, audit }) => {
    const members = verifyRole(['teacher', 'student', 'parent']);
    const teacherOnly = verifyRole(['teacher']);
    const sendLimiter = createRateLimiter({
        windowMs: 60 * 1000, max: 30,
        keyFn: (req) => `msg:${req.user ? req.user.id : req.ip}`,
        message: 'You are sending messages too quickly. Please wait a minute.'
    });

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Messages route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });

    const cleanBody = (raw) => {
        const body = str(raw);
        if (!body) return { error: 'Please write a message.' };
        if (body.length > MAX_BODY) return { error: `Messages can be at most ${MAX_BODY} characters.` };
        return { body };
    };

    const contactsOf = async (user) => {
        const students = await studentsFor(queryAsync, user);
        const parents = await parentsOfStudents(queryAsync, students.map((s) => s.student_id));
        return { students, parents };
    };

    app.get('/api/messages/contacts', teacherOnly, safe(async (req, res) => {
        const { students, parents } = await contactsOf(req.user);
        res.json({
            students: students.map((s) => ({ user_id: s.user_id, name: s.full_name, roll: s.roll_number, course_id: s.course_id, course_name: s.course_name, semester: s.semester })),
            parents: parents.map((p) => ({ user_id: p.user_id, name: p.full_name, wards: p.wards }))
        });
    }));

    const describeUsers = async (ids) => {
        if (!ids.length) return new Map();
        const rows = await queryAsync(
            `SELECT u.id, u.role, COALESCE(t.full_name, s.full_name, p.full_name, u.username) AS name,
                    s.roll_number, c.course_name, s.semester,
                    (SELECT GROUP_CONCAT(ws.full_name ORDER BY ws.full_name SEPARATOR ', ')
                       FROM parent_student_map wm JOIN students ws ON ws.student_id = wm.student_id
                      WHERE wm.parent_id = p.parent_id) AS wards
               FROM users u
               LEFT JOIN teachers t ON t.user_id = u.id
               LEFT JOIN students s ON s.user_id = u.id
               LEFT JOIN courses c ON c.id = s.course_id
               LEFT JOIN parents p ON p.user_id = u.id
              WHERE u.id IN (?)`, [ids]);
        const map = new Map();
        rows.forEach((r) => {
            let subtitle = '';
            if (r.role === 'teacher') subtitle = 'Faculty';
            else if (r.role === 'student') subtitle = [r.course_name, r.semester ? `Sem ${r.semester}` : null].filter(Boolean).join(' · ');
            else if (r.role === 'parent') subtitle = r.wards ? `Parent of ${r.wards}` : 'Parent';
            map.set(r.id, { id: r.id, role: r.role, name: r.name, subtitle });
        });
        return map;
    };

    app.get('/api/messages/threads', members, safe(async (req, res) => {
        const me = req.user.id;
        const threads = await queryAsync(
            `SELECT th.id, th.teacher_user_id, th.participant_user_id, th.last_message_at,
                    (SELECT m.body FROM messages m WHERE m.thread_id = th.id ORDER BY m.id DESC LIMIT 1) AS last_body,
                    (SELECT m.sender_user_id FROM messages m WHERE m.thread_id = th.id ORDER BY m.id DESC LIMIT 1) AS last_sender,
                    (SELECT COUNT(*) FROM messages m WHERE m.thread_id = th.id AND m.sender_user_id <> ? AND m.read_at IS NULL) AS unread
               FROM message_threads th
              WHERE th.teacher_user_id = ? OR th.participant_user_id = ?
              ORDER BY th.last_message_at DESC, th.id DESC LIMIT 200`, [me, me, me]);
        const others = threads.map((t) => (t.teacher_user_id === me ? t.participant_user_id : t.teacher_user_id));
        const people = await describeUsers([...new Set(others)]);
        res.json(threads.map((t, i) => ({
            id: t.id,
            other: people.get(others[i]) || { id: others[i], role: 'user', name: 'Unknown user', subtitle: '' },
            last_body: t.last_body,
            last_from_me: t.last_sender === me,
            last_message_at: t.last_message_at,
            unread: Number(t.unread)
        })));
    }));

    const loadThread = async (req, res) => {
        if (!isPositiveInt(req.params.id)) { res.status(400).json({ error: 'Invalid identifier.' }); return null; }
        const rows = await queryAsync('SELECT id, teacher_user_id, participant_user_id FROM message_threads WHERE id = ?', [Number(req.params.id)]);
        const th = rows[0];
        if (!th || (th.teacher_user_id !== req.user.id && th.participant_user_id !== req.user.id)) {
            res.status(404).json({ error: 'Conversation not found.' });
            return null;
        }
        return th;
    };

    app.get('/api/messages/threads/:id', members, safe(async (req, res) => {
        const th = await loadThread(req, res);
        if (!th) return;
        const me = req.user.id;
        const otherId = th.teacher_user_id === me ? th.participant_user_id : th.teacher_user_id;
        const rows = await queryAsync(
            'SELECT id, sender_user_id, body, created_at, read_at FROM messages WHERE thread_id = ? ORDER BY id DESC LIMIT 300', [th.id]);
        await queryAsync('UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE thread_id = ? AND sender_user_id <> ? AND read_at IS NULL', [th.id, me]);
        const people = await describeUsers([otherId]);
        res.json({
            id: th.id,
            other: people.get(otherId) || { id: otherId, role: 'user', name: 'Unknown user', subtitle: '' },
            messages: rows.reverse().map((m) => ({ id: m.id, mine: m.sender_user_id === me, body: m.body, created_at: m.created_at, read: !!m.read_at }))
        });
    }));

    app.post('/api/messages/threads/:id/reply', members, sendLimiter, safe(async (req, res) => {
        const th = await loadThread(req, res);
        if (!th) return;
        const { body, error } = cleanBody(req.body && req.body.body);
        if (error) return res.status(400).json({ error });
        await transaction(async (q) => {
            await q('INSERT INTO messages (thread_id, sender_user_id, body) VALUES (?, ?, ?)', [th.id, req.user.id, body]);
            await q('UPDATE message_threads SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', [th.id]);
        });
        res.json({ success: true });
    }));

    app.post('/api/messages/send', teacherOnly, sendLimiter, safe(async (req, res) => {
        const b = req.body || {};
        const { body, error } = cleanBody(b.body);
        if (error) return res.status(400).json({ error });
        const ids = [...new Set((Array.isArray(b.recipient_user_ids) ? b.recipient_user_ids : []).map(Number))];
        if (!ids.length || !ids.every(isPositiveInt)) return res.status(400).json({ error: 'Choose at least one recipient.' });
        if (ids.length > MAX_BATCH) return res.status(400).json({ error: `You can message at most ${MAX_BATCH} people at once.` });

        const { students, parents } = await contactsOf(req.user);
        const allowed = new Set([...students.map((s) => s.user_id), ...parents.map((p) => p.user_id)]);
        if (ids.some((id) => !allowed.has(id))) {
            return res.status(403).json({ error: 'You can only message students in your classes and their parents.' });
        }

        const threadIds = await transaction(async (q) => {
            const out = [];
            for (const uid of ids) {
                const th = await q(
                    'INSERT INTO message_threads (teacher_user_id, participant_user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
                    [req.user.id, uid]);
                await q('INSERT INTO messages (thread_id, sender_user_id, body) VALUES (?, ?, ?)', [th.insertId, req.user.id, body]);
                await q('UPDATE message_threads SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', [th.insertId]);
                out.push(th.insertId);
            }
            return out;
        });

        audit(req, { action: 'MESSAGE_SEND', entity: 'messages', entityId: threadIds.length === 1 ? threadIds[0] : null, newValue: { recipients: ids.length } });
        res.json({ success: true, sent: ids.length, thread_id: threadIds.length === 1 ? threadIds[0] : null });
    }));
};
