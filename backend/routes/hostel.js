
const { str, isPositiveInt } = require('../lib/validate');
const { todayInTZ } = require('../lib/time');

const PHONE_RE = /^[0-9+\-()\s]{5,30}$/;
const SESSION_RE = /^(\d{4})-(\d{4})$/;
const STATUSES = ['Allotted', 'Vacated'];
const MAX_LIST = 2000;
const PICKER_LIMIT = 25;

const fail = (status, message) => Object.assign(new Error(message), { http: status });

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const validateHostel = (b = {}) => {
    const name = str(b.name);
    const wardenName = str(b.warden_name) || null;
    const wardenContact = str(b.warden_contact) || null;
    const hostelContact = str(b.hostel_contact) || null;
    if (!name) return { error: 'Hostel name is required.' };
    if (name.length > 100) return { error: 'Hostel name is too long (max 100).' };
    if (wardenName && wardenName.length > 100) return { error: 'Warden name is too long (max 100).' };
    if (wardenContact && !PHONE_RE.test(wardenContact)) return { error: 'Warden contact must be a valid phone number.' };
    if (hostelContact && !PHONE_RE.test(hostelContact)) return { error: 'Hostel contact must be a valid phone number.' };
    return { value: { name, wardenName, wardenContact, hostelContact } };
};

const validateAllocation = (b = {}, { create }) => {
    const studentId = Number(b.student_id);
    const hostelId = Number(b.hostel_id);
    const block = str(b.block) || null;
    const room = str(b.room_number);
    const session = str(b.academic_session);
    const rawSemester = str(b.semester);
    const remarks = str(b.remarks) || null;

    if (create && !isPositiveInt(studentId)) return { error: 'Please select a student.' };
    if (!isPositiveInt(hostelId)) return { error: 'Please select a hostel.' };
    if (block && block.length > 50) return { error: 'Block name is too long (max 50).' };
    if (!room) return { error: 'Room number is required.' };
    if (room.length > 20) return { error: 'Room number is too long (max 20).' };

    const m = SESSION_RE.exec(session);
    if (!m || Number(m[2]) !== Number(m[1]) + 1) {
        return { error: 'Session must look like 2026-2027 (two consecutive years).' };
    }

    let semester = null;
    if (rawSemester) {
        semester = Number(rawSemester);
        if (!Number.isInteger(semester) || semester < 1 || semester > 12) {
            return { error: 'Semester must be a whole number from 1 to 12.' };
        }
    }
    if (remarks && remarks.length > 255) return { error: 'Remarks are too long (max 255).' };

    return { value: { studentId, hostelId, block, room, session, semester, remarks } };
};

module.exports = (app, { queryAsync, transaction, verifyRole, verifyStudentOwnership, audit }) => {
    const admin = verifyRole(['admin']);

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            if (e && e.http) return res.status(e.http).json({ error: e.message });
            console.error('Hostel route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });

    const idOr400 = (req, res) => {
        if (!isPositiveInt(req.params.id)) {
            res.status(400).json({ error: 'Invalid identifier.' });
            return null;
        }
        return Number(req.params.id);
    };

    const snapshot = (row) => ({
        student_id: row.student_id,
        hostel_id: row.hostel_id,
        block: row.block,
        room_number: row.room_number,
        academic_session: row.academic_session,
        semester: row.semester,
        status: row.status,
        remarks: row.remarks
    });


    app.get('/api/hostels', admin, safe(async (req, res) => {
        const rows = await queryAsync(
            `SELECT h.id, h.name, h.warden_name, h.warden_contact, h.hostel_contact,
                    (SELECT COUNT(*) FROM hostel_allocations a
                      WHERE a.hostel_id = h.id AND a.status = 'Allotted') AS occupants
               FROM hostels h
              ORDER BY h.name ASC`);
        res.json(rows.map((r) => ({ ...r, occupants: Number(r.occupants) })));
    }));

    app.post('/api/hostels', admin, safe(async (req, res) => {
        const { value, error } = validateHostel(req.body);
        if (error) return res.status(400).json({ error });
        try {
            const r = await queryAsync(
                'INSERT INTO hostels (name, warden_name, warden_contact, hostel_contact, created_by) VALUES (?, ?, ?, ?, ?)',
                [value.name, value.wardenName, value.wardenContact, value.hostelContact, req.user.id]);
            audit(req, { action: 'HOSTEL_CREATE', entity: 'hostels', entityId: r.insertId, newValue: value });
            res.json({ success: true, id: r.insertId });
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A hostel with this name already exists.' });
            throw e;
        }
    }));

    app.put('/api/hostels/:id', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const { value, error } = validateHostel(req.body);
        if (error) return res.status(400).json({ error });
        const old = await queryAsync(
            'SELECT name, warden_name, warden_contact, hostel_contact FROM hostels WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Hostel not found.' });
        try {
            await queryAsync(
                'UPDATE hostels SET name = ?, warden_name = ?, warden_contact = ?, hostel_contact = ? WHERE id = ?',
                [value.name, value.wardenName, value.wardenContact, value.hostelContact, id]);
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A hostel with this name already exists.' });
            throw e;
        }
        audit(req, { action: 'HOSTEL_UPDATE', entity: 'hostels', entityId: id, oldValue: old[0], newValue: value });
        res.json({ success: true });
    }));

    app.delete('/api/hostels/:id', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const old = await queryAsync('SELECT name, warden_name, warden_contact, hostel_contact FROM hostels WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Hostel not found.' });
        const used = await queryAsync('SELECT COUNT(*) AS n FROM hostel_allocations WHERE hostel_id = ?', [id]);
        if (Number(used[0].n) > 0) {
            return res.status(409).json({
                error: `This hostel has ${used[0].n} allotment record(s). Remove them before deleting the hostel.`
            });
        }
        try {
            await queryAsync('DELETE FROM hostels WHERE id = ?', [id]);
        } catch (e) {
            if (e.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({ error: 'This hostel still has allotment records.' });
            }
            throw e;
        }
        audit(req, { action: 'HOSTEL_DELETE', entity: 'hostels', entityId: id, oldValue: old[0] });
        res.json({ success: true });
    }));


    app.get('/api/hostel-allocations', admin, safe(async (req, res) => {
        const status = str(req.query.status) || 'Allotted';
        const hostelId = str(req.query.hostel_id);
        const q = str(req.query.q);
        if (status !== 'all' && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
        if (hostelId && !isPositiveInt(hostelId)) return res.status(400).json({ error: 'Invalid hostel.' });

        const where = [];
        const params = [];
        if (status !== 'all') { where.push('a.status = ?'); params.push(status); }
        if (hostelId) { where.push('a.hostel_id = ?'); params.push(Number(hostelId)); }
        if (q) {
            const like = `%${escapeLike(q)}%`;
            where.push('(s.full_name LIKE ? OR s.enrollment_number LIKE ? OR s.roll_number LIKE ? OR a.room_number LIKE ?)');
            params.push(like, like, like, like);
        }

        const rows = await queryAsync(
            `SELECT a.id, a.student_id, s.full_name AS student_name, s.enrollment_number, s.roll_number,
                    s.semester AS current_semester, c.course_name,
                    a.hostel_id, h.name AS hostel_name, a.block, a.room_number,
                    a.academic_session, a.semester, a.status, a.remarks,
                    DATE_FORMAT(a.allotted_on, '%Y-%m-%d') AS allotted_on,
                    DATE_FORMAT(a.vacated_on, '%Y-%m-%d') AS vacated_on
               FROM hostel_allocations a
               JOIN students s ON s.student_id = a.student_id
               JOIN hostels h ON h.id = a.hostel_id
               LEFT JOIN courses c ON c.id = s.course_id
               ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
              ORDER BY a.status ASC, h.name ASC, a.block ASC, a.room_number ASC, s.full_name ASC
              LIMIT ${MAX_LIST}`,
            params);
        res.json(rows);
    }));

    app.get('/api/hostel/unallotted-students', admin, safe(async (req, res) => {
        const q = str(req.query.q);
        const params = [];
        let search = '';
        if (q) {
            const like = `%${escapeLike(q)}%`;
            search = 'AND (s.full_name LIKE ? OR s.enrollment_number LIKE ? OR s.roll_number LIKE ?)';
            params.push(like, like, like);
        }
        const rows = await queryAsync(
            `SELECT s.student_id, s.full_name, s.enrollment_number, s.roll_number, s.semester, c.course_name
               FROM students s
               LEFT JOIN courses c ON c.id = s.course_id
              WHERE s.status = 'Active'
                AND NOT EXISTS (SELECT 1 FROM hostel_allocations a
                                 WHERE a.student_id = s.student_id AND a.status = 'Allotted')
                ${search}
              ORDER BY s.full_name ASC
              LIMIT ${PICKER_LIMIT}`,
            params);
        res.json(rows);
    }));

    app.post('/api/hostel-allocations', admin, safe(async (req, res) => {
        const { value: v, error } = validateAllocation(req.body, { create: true });
        if (error) return res.status(400).json({ error });

        const id = await transaction(async (q) => {
            const students = await q('SELECT student_id, status FROM students WHERE student_id = ? FOR UPDATE', [v.studentId]);
            if (!students.length) throw fail(404, 'Student not found.');
            if (students[0].status !== 'Active') throw fail(400, 'Only active students can be allotted a hostel.');

            const hostels = await q('SELECT id FROM hostels WHERE id = ?', [v.hostelId]);
            if (!hostels.length) throw fail(404, 'Hostel not found.');

            const existing = await q(
                "SELECT id FROM hostel_allocations WHERE student_id = ? AND status = 'Allotted' LIMIT 1", [v.studentId]);
            if (existing.length) throw fail(409, 'This student already has a hostel allotment. Edit or vacate it first.');

            const r = await q(
                `INSERT INTO hostel_allocations
                    (student_id, hostel_id, block, room_number, academic_session, semester, status, allotted_on, remarks, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'Allotted', ?, ?, ?)`,
                [v.studentId, v.hostelId, v.block, v.room, v.session, v.semester, todayInTZ(), v.remarks, req.user.id]);
            return r.insertId;
        });

        audit(req, {
            action: 'HOSTEL_ALLOCATE', entity: 'hostel_allocations', entityId: id,
            newValue: { student_id: v.studentId, hostel_id: v.hostelId, block: v.block, room_number: v.room, academic_session: v.session, semester: v.semester }
        });
        res.json({ success: true, id });
    }));

    app.put('/api/hostel-allocations/:id', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const { value: v, error } = validateAllocation(req.body, { create: false });
        if (error) return res.status(400).json({ error });

        const old = await transaction(async (q) => {
            const rows = await q(
                `SELECT student_id, hostel_id, block, room_number, academic_session, semester, status, remarks
                   FROM hostel_allocations WHERE id = ? FOR UPDATE`, [id]);
            if (!rows.length) throw fail(404, 'Allotment not found.');
            if (rows[0].status !== 'Allotted') throw fail(400, 'A vacated allotment cannot be edited.');

            const hostels = await q('SELECT id FROM hostels WHERE id = ?', [v.hostelId]);
            if (!hostels.length) throw fail(404, 'Hostel not found.');

            await q(
                `UPDATE hostel_allocations
                    SET hostel_id = ?, block = ?, room_number = ?, academic_session = ?, semester = ?, remarks = ?
                  WHERE id = ?`,
                [v.hostelId, v.block, v.room, v.session, v.semester, v.remarks, id]);
            return rows[0];
        });

        audit(req, {
            action: 'HOSTEL_ALLOCATION_UPDATE', entity: 'hostel_allocations', entityId: id,
            oldValue: snapshot(old),
            newValue: { student_id: old.student_id, hostel_id: v.hostelId, block: v.block, room_number: v.room, academic_session: v.session, semester: v.semester, remarks: v.remarks }
        });
        res.json({ success: true });
    }));

    app.post('/api/hostel-allocations/:id/vacate', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const today = todayInTZ();

        const old = await transaction(async (q) => {
            const rows = await q(
                `SELECT student_id, hostel_id, block, room_number, academic_session, semester, status, remarks
                   FROM hostel_allocations WHERE id = ? FOR UPDATE`, [id]);
            if (!rows.length) throw fail(404, 'Allotment not found.');
            if (rows[0].status !== 'Allotted') throw fail(400, 'This allotment is already vacated.');
            await q("UPDATE hostel_allocations SET status = 'Vacated', vacated_on = ? WHERE id = ?", [today, id]);
            return rows[0];
        });

        audit(req, {
            action: 'HOSTEL_VACATE', entity: 'hostel_allocations', entityId: id,
            oldValue: snapshot(old), newValue: { status: 'Vacated', vacated_on: today }
        });
        res.json({ success: true });
    }));

    app.delete('/api/hostel-allocations/:id', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const rows = await queryAsync(
            `SELECT student_id, hostel_id, block, room_number, academic_session, semester, status, remarks
               FROM hostel_allocations WHERE id = ?`, [id]);
        if (!rows.length) return res.status(404).json({ error: 'Allotment not found.' });
        await queryAsync('DELETE FROM hostel_allocations WHERE id = ?', [id]);
        audit(req, { action: 'HOSTEL_ALLOCATION_DELETE', entity: 'hostel_allocations', entityId: id, oldValue: snapshot(rows[0]) });
        res.json({ success: true });
    }));


    app.get(
        '/api/student/:id/hostel',
        verifyRole(['student', 'parent', 'admin']),
        verifyStudentOwnership,
        safe(async (req, res) => {
            const rows = await queryAsync(
                `SELECT s.student_id, a.id AS allocation_id, a.block, a.room_number, a.academic_session, a.semester,
                        DATE_FORMAT(a.allotted_on, '%d %b %Y') AS allotted_on,
                        h.name AS hostel_name, h.warden_name, h.warden_contact, h.hostel_contact
                   FROM students s
                   LEFT JOIN hostel_allocations a ON a.student_id = s.student_id AND a.status = 'Allotted'
                   LEFT JOIN hostels h ON h.id = a.hostel_id
                  WHERE s.user_id = ?
                  LIMIT 1`,
                [Number(req.params.id)]);
            if (!rows.length) return res.status(404).json({ error: 'Student record not found.' });

            const r = rows[0];
            if (r.allocation_id === null) return res.json({ allotted: false });
            res.json({
                allotted: true,
                hostel: r.hostel_name,
                block: r.block,
                room: r.room_number,
                session: r.academic_session,
                semester: r.semester,
                allottedOn: r.allotted_on,
                warden: { name: r.warden_name, contact: r.warden_contact },
                hostelContact: r.hostel_contact
            });
        })
    );
};
