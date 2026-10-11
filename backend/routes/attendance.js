const { isPositiveInt, str } = require('../lib/validate');
const { todayInTZ, weekdayName } = require('../lib/time');

const STATUSES = ['Present', 'Absent', 'Late', 'Excused'];
const MAX_STUDENTS = 500;

module.exports = (app, { queryAsync, transaction, verifyRole, audit }) => {
    const teacherOnly = verifyRole(['teacher']);

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Attendance route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });

    const teacherIdOf = async (userId) => {
        const rows = await queryAsync('SELECT teacher_id FROM teachers WHERE user_id = ? LIMIT 1', [userId]);
        return rows.length ? rows[0].teacher_id : null;
    };
    const owns = async (teacherId, subjectId) =>
        (await queryAsync('SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND subject_id = ? LIMIT 1', [teacherId, subjectId])).length > 0;
    const rosterOf = (subjectId) => queryAsync(
        `SELECT st.student_id, st.roll_number AS roll, st.full_name AS name
           FROM students st JOIN subjects sub ON st.course_id = sub.course_id AND st.semester = sub.semester
          WHERE sub.id = ? ORDER BY st.full_name ASC`, [subjectId]);

    app.get('/api/attendance/sheet', teacherOnly, safe(async (req, res) => {
        if (!isPositiveInt(req.query.subject_id)) return res.status(400).json({ error: 'Subject is required.' });
        const subjectId = Number(req.query.subject_id);
        const teacherId = await teacherIdOf(req.user.id);
        if (!teacherId) return res.status(404).json({ error: 'No teacher record found for this account.' });
        if (!(await owns(teacherId, subjectId))) return res.status(403).json({ error: 'You are not assigned to this subject.' });

        const date = todayInTZ();
        const roster = await rosterOf(subjectId);
        const saved = await queryAsync(
            `SELECT a.student_id, a.status FROM attendance a JOIN daily_classes dc ON dc.id = a.daily_class_id
              WHERE dc.subject_id = ? AND dc.class_date = ?`, [subjectId, date]);
        const savedMap = new Map(saved.map((r) => [r.student_id, r.status]));
        res.json({
            date,
            already_marked: saved.length > 0,
            students: roster.map((s) => ({ ...s, status: savedMap.get(s.student_id) || 'Absent' }))
        });
    }));

    app.post('/api/attendance', teacherOnly, safe(async (req, res) => {
        const body = req.body || {};
        const date = str(body.date);
        if (!isPositiveInt(body.subject_id) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(body.students)) {
            return res.status(400).json({ error: 'Invalid attendance data.' });
        }
        if (body.students.length === 0) return res.status(400).json({ error: 'No students found.' });
        if (body.students.length > MAX_STUDENTS) return res.status(400).json({ error: 'Too many students in one sheet.' });

        const today = todayInTZ();
        if (date !== today) {
            return res.status(403).json({ error: `Attendance can only be marked or edited on the day of the class (today is ${today}).` });
        }

        const subjectId = Number(body.subject_id);
        const entries = [];
        const seen = new Set();
        for (const s of body.students) {
            const id = Number(s && s.student_id);
            if (!isPositiveInt(id) || !STATUSES.includes(s.status)) {
                return res.status(400).json({ error: 'Each student needs a valid id and status (Present or Absent).' });
            }
            if (seen.has(id)) return res.status(400).json({ error: 'A student appears more than once in the sheet.' });
            seen.add(id);
            entries.push({ id, status: s.status });
        }

        const teacherId = await teacherIdOf(req.user.id);
        if (!teacherId) return res.status(404).json({ error: 'No teacher record found for this account.' });
        if (!(await owns(teacherId, subjectId))) return res.status(403).json({ error: 'You are not assigned to this subject.' });

        const roster = new Set((await rosterOf(subjectId)).map((r) => r.student_id));
        if (entries.some((e) => !roster.has(e.id))) {
            return res.status(400).json({ error: "Some students are not enrolled in this subject's class." });
        }

        const result = await transaction(async (q) => {
            let classes = await q('SELECT id FROM daily_classes WHERE subject_id = ? AND class_date = ? ORDER BY id LIMIT 1', [subjectId, date]);
            let classId;
            if (classes.length) {
                classId = classes[0].id;
            } else {
                const slot = await q(
                    `SELECT TIME_FORMAT(start_time,'%H:%i') AS s, TIME_FORMAT(end_time,'%H:%i') AS e, room
                       FROM timetable_slots WHERE subject_id = ? AND day_of_week = ? ORDER BY start_time LIMIT 1`,
                    [subjectId, weekdayName(date)]);
                const t = slot[0] || { s: '09:00', e: '10:00', room: 'TBA' };
                const ins = await q(
                    `INSERT INTO daily_classes (subject_id, teacher_id, class_date, start_time, end_time, room_number, status)
                     VALUES (?, ?, ?, ?, ?, ?, 'Completed')`,
                    [subjectId, teacherId, date, t.s, t.e, String(t.room).slice(0, 20)]);
                classId = ins.insertId;
            }

            const existing = await q('SELECT student_id, status FROM attendance WHERE daily_class_id = ?', [classId]);
            const before = new Map(existing.map((r) => [r.student_id, r.status]));

            await q(
                `INSERT INTO attendance (student_id, daily_class_id, status, remarks, marked_by) VALUES ?
                 ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)`,
                [entries.map((e) => [e.id, classId, e.status, 'Marked via Quick Attendance', teacherId])]);

            const changes = entries
                .filter((e) => before.has(e.id) && before.get(e.id) !== e.status)
                .map((e) => ({ student_id: e.id, old: before.get(e.id), new: e.status }));
            return { classId, edited: existing.length > 0, changes };
        });

        const present = entries.filter((e) => e.status === 'Present').length;
        audit(req, {
            action: result.edited ? 'ATTENDANCE_EDIT' : 'ATTENDANCE_SAVE',
            entity: 'daily_classes',
            entityId: result.classId,
            newValue: { subject_id: subjectId, date, total: entries.length, present, absent: entries.length - present, changes: result.changes.slice(0, 100) }
        });

        res.json({ success: true, message: result.edited ? 'Attendance updated.' : 'Attendance saved successfully!', edited: result.edited, changed: result.changes.length });
    }));
};
