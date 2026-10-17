const { str, isPositiveInt } = require('../lib/validate');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const EVERY_DAY = 'Every day';
const NO_SATURDAY = "ts.day_of_week <> 'Saturday'";
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

const validateSlot = (b = {}, { allowEveryDay = false } = {}) => {
    const subjectId = Number(b.subject_id);
    const day = str(b.day);
    const start = str(b.start_time);
    const end = str(b.end_time);
    const room = str(b.room);
    if (!isPositiveInt(subjectId)) return { error: 'Please select a subject.' };
    if (!(DAYS.includes(day) || (allowEveryDay && day === EVERY_DAY))) return { error: 'Please select a valid day (Monday to Friday).' };
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) return { error: 'Start and end time must be valid times (HH:MM).' };
    if (end <= start) return { error: 'End time must be after the start time.' };
    if (!room) return { error: 'Room is required.' };
    if (room.length > 50) return { error: 'Room name is too long (max 50).' };
    return { value: { subjectId, day, start, end, room } };
};

const MAX_IMPORT_ROWS = 300;
const DAY_ALIASES = { mon: 'Monday', tue: 'Tuesday', tues: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday', fri: 'Friday' };

const normDay = (text) => {
    const t = str(text).toLowerCase();
    if (!t) return '';
    if (t === 'every day' || t === 'everyday' || t === 'all days' || t === 'daily') return EVERY_DAY;
    return DAYS.find((d) => d.toLowerCase() === t) || DAY_ALIASES[t] || '';
};

const normTime = (text) => {
    const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i.exec(str(text));
    if (!m) return '';
    let h = Number(m[1]);
    const min = Number(m[2]);
    if (m[3]) {
        if (h < 1 || h > 12) return '';
        h = (h % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0);
    }
    if (h > 23 || min > 59) return '';
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

module.exports = (app, { queryAsync, transaction, verifyRole, requireSelfTeacher, verifyStudentOwnership, audit }) => {
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
        res.json(await queryAsync(`${SELECT} WHERE sub.course_id = ? AND sub.semester = ? AND ${NO_SATURDAY} ${ORDER}`,
            [Number(req.query.course_id), Number(req.query.semester)]));
    }));

    app.get('/api/student/:id/timetable', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, safe(async (req, res) => {
        res.json(await queryAsync(
            `${SELECT} WHERE (sub.course_id, sub.semester) = (SELECT course_id, semester FROM students WHERE user_id = ? LIMIT 1) AND ${NO_SATURDAY} ${ORDER}`,
            [Number(req.params.id)]));
    }));

    app.get('/api/teacher/:id/timetable', verifyRole(['teacher']), requireSelfTeacher, safe(async (req, res) => {
        res.json(await queryAsync(
            `${SELECT} WHERE ts.subject_id IN (
                SELECT ta.subject_id FROM teacher_assignments ta
                JOIN teachers t ON t.teacher_id = ta.teacher_id WHERE t.user_id = ?) AND ${NO_SATURDAY} ${ORDER}`,
            [Number(req.params.id)]));
    }));

    app.post('/api/timetable', admin, safe(async (req, res) => {
        const { value: v, error } = validateSlot(req.body, { allowEveryDay: true });
        if (error) return res.status(400).json({ error });
        if (!(await subjectExists(v.subjectId))) return res.status(400).json({ error: 'Selected subject does not exist.' });

        if (v.day === EVERY_DAY) {
            for (const d of DAYS) {
                const clash = await findClash({ ...v, day: d }, 0);
                if (clash) return res.status(409).json({ error: `Nothing was added. ${clash}` });
            }
            const ids = await transaction(async (q) => {
                const out = [];
                for (const d of DAYS) {
                    const r = await q(
                        'INSERT INTO timetable_slots (subject_id, day_of_week, start_time, end_time, room, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                        [v.subjectId, d, v.start, v.end, v.room, req.user.id]);
                    out.push(r.insertId);
                }
                return out;
            });
            audit(req, { action: 'TIMETABLE_CREATE_EVERYDAY', entity: 'timetable_slots', entityId: ids.join(','), newValue: { ...v, days: DAYS } });
            return res.json({ success: true, ids, created: ids.length });
        }

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

    app.post('/api/timetable/import', admin, safe(async (req, res) => {
        const rows = req.body && req.body.rows;
        if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'No rows to import.' });
        if (rows.length > MAX_IMPORT_ROWS) return res.status(400).json({ error: `Too many rows (max ${MAX_IMPORT_ROWS} per import). Split the file.` });

        const subjects = await queryAsync(
            `SELECT sub.id, sub.subject_code, sub.semester, c.course_code
               FROM subjects sub JOIN courses c ON c.id = sub.course_id`);
        const subjectByCode = new Map(subjects.map((x) => [String(x.subject_code).toLowerCase(), x]));
        const teacherRows = await queryAsync('SELECT subject_id, teacher_id FROM teacher_assignments');
        const teachersOf = new Map();
        teacherRows.forEach((t) => {
            if (!teachersOf.has(t.subject_id)) teachersOf.set(t.subject_id, new Set());
            teachersOf.get(t.subject_id).add(t.teacher_id);
        });

        const errors = [];
        const slots = [];
        rows.forEach((r, i) => {
            const rowNo = (r && Number(r.row)) || i + 1;
            const b = r || {};
            const subject = subjectByCode.get(str(b.subject_code).toLowerCase());
            if (!str(b.subject_code)) return errors.push({ row: rowNo, error: 'Subject code is required.' });
            if (!subject) return errors.push({ row: rowNo, error: `Unknown subject code "${str(b.subject_code)}".` });
            if (str(b.course_code) && str(b.course_code).toLowerCase() !== String(subject.course_code).toLowerCase()) {
                return errors.push({ row: rowNo, error: `${subject.subject_code} belongs to ${subject.course_code}, not ${str(b.course_code)}.` });
            }
            if (str(b.semester) && Number(str(b.semester)) !== subject.semester) {
                return errors.push({ row: rowNo, error: `${subject.subject_code} is in semester ${subject.semester}, not ${str(b.semester)}.` });
            }
            const day = normDay(b.day);
            if (!day) return errors.push({ row: rowNo, error: 'Day must be Monday to Friday, or "Every day".' });
            const start = normTime(b.start_time);
            const end = normTime(b.end_time);
            const { value: v, error } = validateSlot(
                { subject_id: subject.id, day, start_time: start, end_time: end, room: b.room }, { allowEveryDay: true });
            if (error) return errors.push({ row: rowNo, error });
            (v.day === EVERY_DAY ? DAYS : [v.day]).forEach((d) => slots.push({ row: rowNo, ...v, day: d, courseSem: `${subject.course_code}|${subject.semester}`, subject }));
        });

        const bad = new Set(errors.map((e) => e.row));
        for (const slot of slots) {
            if (bad.has(slot.row)) continue;
            const clash = await findClash(slot, 0);
            if (clash) { errors.push({ row: slot.row, error: clash }); bad.add(slot.row); }
        }
        const accepted = [];
        for (const slot of slots) {
            if (bad.has(slot.row)) continue;
            const hit = accepted.find((o) => o.row !== slot.row && o.day === slot.day && o.start < slot.end && o.end > slot.start && (
                o.courseSem === slot.courseSem
                || o.room.toLowerCase() === slot.room.toLowerCase()
                || [...(teachersOf.get(o.subjectId) || [])].some((t) => (teachersOf.get(slot.subjectId) || new Set()).has(t))));
            if (hit) {
                const why = hit.courseSem === slot.courseSem ? 'the same course and semester'
                    : hit.room.toLowerCase() === slot.room.toLowerCase() ? `room ${slot.room}` : 'the same teacher';
                errors.push({ row: slot.row, error: `Clashes with row ${hit.row} of this file (${why}, ${slot.day} ${hit.start}-${hit.end}).` });
                bad.add(slot.row);
            } else {
                accepted.push(slot);
            }
        }
        errors.sort((a, b) => a.row - b.row);
        const rowsOk = new Map();
        accepted.forEach((sl) => { if (!bad.has(sl.row)) rowsOk.set(sl.row, (rowsOk.get(sl.row) || 0) + 1); });
        const finalSlots = accepted.filter((sl) => !bad.has(sl.row));

        if (req.body.dry_run) {
            return res.json({ dry_run: true, total: rows.length, create: finalSlots.length, update: 0,
                actions: [...rowsOk.keys()].map((row) => ({ row, action: 'create' })), errors });
        }
        if (errors.length) return res.status(400).json({ error: 'Some rows are invalid. Nothing was imported.', errors: errors.slice(0, 100) });

        await transaction(async (q) => {
            for (const sl of finalSlots) {
                await q('INSERT INTO timetable_slots (subject_id, day_of_week, start_time, end_time, room, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                    [sl.subjectId, sl.day, sl.start, sl.end, sl.room, req.user.id]);
            }
        });
        audit(req, { action: 'TIMETABLE_BULK_IMPORT', entity: 'timetable_slots', newValue: { slots: finalSlots.length, rows: rows.length } });
        res.json({ success: true, saved: finalSlots.length, created: finalSlots.length });
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
