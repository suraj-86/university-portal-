const { str, isPositiveInt } = require('../lib/validate');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const SELECT = `
    SELECT ts.id, ts.subject_id, ts.day_of_week AS day,
           TIME_FORMAT(ts.start_time, '%H:%i') AS start_time,
           TIME_FORMAT(ts.end_time, '%H:%i') AS end_time,
           ts.room, sub.subject_code, sub.subject_name, sub.semester, sub.course_id,
           c.course_code, c.course_name,
           (SELECT GROUP_CONCAT(DISTINCT t.full_name ORDER BY t.full_name SEPARATOR ', ')
              FROM teacher_assignments ta JOIN teachers t ON t.teacher_id = ta.teacher_id
             WHERE ta.subject_id = sub.id) AS faculty
    FROM timetable_slots ts
    JOIN subjects sub ON sub.id = ts.subject_id
    JOIN courses c ON c.id = sub.course_id`;
const ORDER = `ORDER BY FIELD(ts.day_of_week, ${DAYS.map((d) => `'${d}'`).join(',')}), ts.start_time`;

const validateSlot = (b = {}) => {
    const subjectId = Number(b.subject_id);
    const day = str(b.day);
    const start = str(b.start_time);
    const end = str(b.end_time);
    const room = str(b.room);
    if (!isPositiveInt(subjectId)) return { error: 'Please select a subject.' };
    if (!DAYS.includes(day)) return { error: 'Please select a valid day (Monday to Saturday).' };
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) return { error: 'Start and end time must be valid times (HH:MM).' };
    if (end <= start) return { error: 'End time must be after the start time.' };
    if (!room) return { error: 'Room is required.' };
    if (room.length > 50) return { error: 'Room name is too long (max 50).' };
    return { value: { subjectId, day, start, end, room } };
};

module.exports = (app, { queryAsync, verifyRole, requireSelfTeacher, verifyStudentOwnership, audit }) => {
    const admin = verifyRole(['admin']);

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Timetable route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });

    const findClash = async ({ subjectId, day, start, end, room }, excludeId) => {
        const overlap = 'ts.day_of_week = ? AND ts.start_time < ? AND ts.end_time > ? AND ts.id <> ?';
        const base = [day, `${end}:00`, `${start}:00`, excludeId];
        const info = `sub.subject_code, c.course_code, sub.semester, TIME_FORMAT(ts.start_time,'%H:%i') AS s, TIME_FORMAT(ts.end_time,'%H:%i') AS e, ts.room`;
        const from = `FROM timetable_slots ts JOIN subjects sub ON sub.id = ts.subject_id JOIN courses c ON c.id = sub.course_id`;

        const own = await queryAsync(
            `SELECT ${info} ${from} WHERE ${overlap}
               AND (sub.course_id, sub.semester) = (SELECT course_id, semester FROM subjects WHERE id = ?) LIMIT 1`,
            [...base, subjectId]);
        if (own.length) return `Class clash: ${own[0].subject_code} is already scheduled ${own[0].s}-${own[0].e} on ${day} for this course and semester.`;

        const roomRows = await queryAsync(
            `SELECT ${info} ${from} WHERE ${overlap} AND LOWER(TRIM(ts.room)) = LOWER(?) LIMIT 1`,
            [...base, room]);
        if (roomRows.length) {
            const r = roomRows[0];
            return `Room clash: ${room} is already used ${r.s}-${r.e} on ${day} by ${r.subject_code} (${r.course_code} Sem ${r.semester}).`;
        }

        const teacherRows = await queryAsync(
            `SELECT ${info},
                    (SELECT GROUP_CONCAT(DISTINCT t.full_name SEPARATOR ', ')
                       FROM teacher_assignments ta JOIN teachers t ON t.teacher_id = ta.teacher_id
                      WHERE ta.subject_id = ts.subject_id
                        AND ta.teacher_id IN (SELECT teacher_id FROM teacher_assignments WHERE subject_id = ?)) AS shared
             ${from} WHERE ${overlap}
               AND ts.subject_id IN (SELECT ta2.subject_id FROM teacher_assignments ta2
                                      WHERE ta2.teacher_id IN (SELECT teacher_id FROM teacher_assignments WHERE subject_id = ?))
             LIMIT 1`,
            [subjectId, ...base, subjectId]);
        if (teacherRows.length) {
            const r = teacherRows[0];
            return `Faculty clash: ${r.shared || 'the assigned teacher'} already teaches ${r.subject_code} (${r.course_code} Sem ${r.semester}) ${r.s}-${r.e} on ${day}.`;
        }
        return null;
    };

    const subjectExists = async (id) => (await queryAsync('SELECT id FROM subjects WHERE id = ?', [id])).length > 0;

    app.get('/api/timetable', admin, safe(async (req, res) => {
        if (!isPositiveInt(req.query.course_id) || !isPositiveInt(req.query.semester)) {
            return res.status(400).json({ error: 'course_id and semester are required.' });
        }
        res.json(await queryAsync(`${SELECT} WHERE sub.course_id = ? AND sub.semester = ? ${ORDER}`,
            [Number(req.query.course_id), Number(req.query.semester)]));
    }));

    app.get('/api/student/:id/timetable', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, safe(async (req, res) => {
        res.json(await queryAsync(
            `${SELECT} WHERE (sub.course_id, sub.semester) = (SELECT course_id, semester FROM students WHERE user_id = ? LIMIT 1) ${ORDER}`,
            [Number(req.params.id)]));
    }));

    app.get('/api/teacher/:id/timetable', verifyRole(['teacher']), requireSelfTeacher, safe(async (req, res) => {
        res.json(await queryAsync(
            `${SELECT} WHERE ts.subject_id IN (
                SELECT ta.subject_id FROM teacher_assignments ta
                JOIN teachers t ON t.teacher_id = ta.teacher_id WHERE t.user_id = ?) ${ORDER}`,
            [Number(req.params.id)]));
    }));

    app.post('/api/timetable', admin, safe(async (req, res) => {
        const { value: v, error } = validateSlot(req.body);
        if (error) return res.status(400).json({ error });
        if (!(await subjectExists(v.subjectId))) return res.status(400).json({ error: 'Selected subject does not exist.' });
        const clash = await findClash(v, 0);
        if (clash) return res.status(409).json({ error: clash });
        const r = await queryAsync(
            'INSERT INTO timetable_slots (subject_id, day_of_week, start_time, end_time, room, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [v.subjectId, v.day, v.start, v.end, v.room, req.user.id]);
        audit(req, { action: 'TIMETABLE_CREATE', entity: 'timetable_slots', entityId: r.insertId, newValue: v });
        res.json({ success: true, id: r.insertId });
    }));

    app.put('/api/timetable/:id', admin, safe(async (req, res) => {
        if (!isPositiveInt(req.params.id)) return res.status(400).json({ error: 'Invalid identifier.' });
        const id = Number(req.params.id);
        const { value: v, error } = validateSlot(req.body);
        if (error) return res.status(400).json({ error });
        const old = await queryAsync(`${SELECT} WHERE ts.id = ?`, [id]);
        if (!old.length) return res.status(404).json({ error: 'Timetable entry not found.' });
        if (!(await subjectExists(v.subjectId))) return res.status(400).json({ error: 'Selected subject does not exist.' });
        const clash = await findClash(v, id);
        if (clash) return res.status(409).json({ error: clash });
        await queryAsync(
            'UPDATE timetable_slots SET subject_id = ?, day_of_week = ?, start_time = ?, end_time = ?, room = ? WHERE id = ?',
            [v.subjectId, v.day, v.start, v.end, v.room, id]);
        audit(req, { action: 'TIMETABLE_UPDATE', entity: 'timetable_slots', entityId: id, oldValue: old[0], newValue: v });
        res.json({ success: true });
    }));

    app.delete('/api/timetable/:id', admin, safe(async (req, res) => {
        if (!isPositiveInt(req.params.id)) return res.status(400).json({ error: 'Invalid identifier.' });
        const id = Number(req.params.id);
        const old = await queryAsync(`${SELECT} WHERE ts.id = ?`, [id]);
        if (!old.length) return res.status(404).json({ error: 'Timetable entry not found.' });
        await queryAsync('DELETE FROM timetable_slots WHERE id = ?', [id]);
        audit(req, { action: 'TIMETABLE_DELETE', entity: 'timetable_slots', entityId: id, oldValue: old[0] });
        res.json({ success: true });
    }));
};
