const { str, isPositiveInt } = require('../lib/validate');
const { studentsFor } = require('../lib/people');

const OFFICE_GROUPS = ['Leadership', 'Administration', 'Academic', 'Admission', 'Examination', 'Student Welfare', 'Hostel & Mess', 'Technical', 'Other'];
const SCOPES = ['university', 'department', 'course'];
const AUDIENCES = ['all', 'student', 'parent', 'teacher'];
const PHONE_RE = /^[0-9+\-()\s]{5,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (b = {}) => {
    const v = {
        scope: str(b.scope) || 'university',
        category: str(b.category) || 'Administration',
        department: str(b.department) || null,
        course_id: b.course_id === undefined || b.course_id === null || b.course_id === '' ? null : Number(b.course_id),
        name: str(b.name),
        designation: str(b.designation) || null,
        phone: str(b.phone) || null,
        whatsapp: str(b.whatsapp) || null,
        email: str(b.email) || null,
        location: str(b.location) || null,
        office_hours: str(b.office_hours) || null,
        audience: str(b.audience) || 'all',
        sort_order: b.sort_order === undefined || b.sort_order === null || b.sort_order === '' ? 0 : Number(b.sort_order),
        is_visible: b.is_visible === undefined ? 1 : (b.is_visible === true || b.is_visible === 1 || b.is_visible === '1' || b.is_visible === 'true' ? 1 : 0)
    };
    if (!SCOPES.includes(v.scope)) return { error: 'Invalid contact type.' };
    if (v.scope === 'university') {
        if (!OFFICE_GROUPS.includes(v.category)) return { error: 'Invalid office group.' };
        v.department = null; v.course_id = null;
    } else if (v.scope === 'department') {
        if (!v.department) return { error: 'Please choose a department.' };
        if (v.department.length > 100) return { error: 'Department name is too long.' };
        v.category = 'Department'; v.course_id = null;
    } else {
        if (!isPositiveInt(v.course_id)) return { error: 'Please choose a course.' };
        v.category = 'Department'; v.department = null;
    }
    if (!AUDIENCES.includes(v.audience)) return { error: 'Invalid audience.' };
    if (!v.name) return { error: 'Name is required.' };
    if (v.name.length > 120) return { error: 'Name is too long (max 120).' };
    if (v.designation && v.designation.length > 120) return { error: 'Designation is too long (max 120).' };
    if (v.phone && !PHONE_RE.test(v.phone)) return { error: 'Phone must be a valid phone number.' };
    if (v.whatsapp && !PHONE_RE.test(v.whatsapp)) return { error: 'WhatsApp must be a valid phone number.' };
    if (v.email && (v.email.length > 150 || !EMAIL_RE.test(v.email))) return { error: 'Email address is not valid.' };
    if (v.location && v.location.length > 200) return { error: 'Location is too long (max 200).' };
    if (v.office_hours && v.office_hours.length > 120) return { error: 'Office hours text is too long (max 120).' };
    if (!Number.isInteger(v.sort_order) || v.sort_order < 0 || v.sort_order > 9999) return { error: 'Display order must be a whole number from 0 to 9999.' };
    if (!v.phone && !v.whatsapp && !v.email) return { error: 'Add at least a phone number, WhatsApp number or email.' };
    return { value: v };
};

module.exports = (app, { queryAsync, verifyRole, audit }) => {
    const anyRole = verifyRole(['admin', 'teacher', 'student', 'parent']);
    const admin = verifyRole(['admin']);
    const teacher = verifyRole(['teacher']);
    const parent = verifyRole(['parent']);

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Contacts route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });
    const idOr400 = (req, res) => {
        if (!isPositiveInt(req.params.id)) { res.status(400).json({ error: 'Invalid id.' }); return null; }
        return Number(req.params.id);
    };

    const SELECT_ROWS = `SELECT uc.id, uc.category, uc.department AS own_department, uc.course_id,
                                c.course_code, c.course_name, c.department AS course_department,
                                uc.name, uc.designation, uc.phone, uc.whatsapp, uc.email, uc.location,
                                uc.office_hours, uc.audience, uc.sort_order, uc.is_visible
                           FROM university_contacts uc
                           LEFT JOIN courses c ON c.id = uc.course_id`;
    const shape = (r) => ({
        id: r.id,
        scope: r.course_id ? 'course' : (r.own_department ? 'department' : 'university'),
        category: r.category,
        department: r.course_id ? r.course_department : r.own_department,
        course_id: r.course_id, course_code: r.course_code || null, course_name: r.course_name || null,
        name: r.name, designation: r.designation, phone: r.phone, whatsapp: r.whatsapp, email: r.email,
        location: r.location, office_hours: r.office_hours, audience: r.audience,
        sort_order: r.sort_order, is_visible: r.is_visible
    });

    const checkTarget = async (v) => {
        if (v.scope === 'department') {
            const r = await queryAsync('SELECT 1 AS ok FROM courses WHERE department = ? LIMIT 1', [v.department]);
            if (!r.length) return 'That department does not exist in the courses list.';
        } else if (v.scope === 'course') {
            const r = await queryAsync('SELECT id FROM courses WHERE id = ?', [v.course_id]);
            if (!r.length) return 'That course does not exist.';
        }
        return null;
    };
    const stored = (v) => [v.category, v.department, v.course_id, v.name, v.designation, v.phone, v.whatsapp, v.email,
        v.location, v.office_hours, v.audience, v.sort_order, v.is_visible];

    app.get('/api/university-contacts', anyRole, safe(async (req, res) => {
        const rows = req.user.role === 'admin'
            ? await queryAsync(`${SELECT_ROWS} ORDER BY uc.sort_order, uc.name`)
            : await queryAsync(
                `${SELECT_ROWS}
                  WHERE uc.is_visible = 1 AND (uc.audience = 'all' OR uc.audience = ?)
                  ORDER BY uc.sort_order, uc.name`, [req.user.role]);
        res.json(rows.map(shape));
    }));

    app.post('/api/university-contacts', admin, safe(async (req, res) => {
        const { value, error } = validate(req.body);
        if (error) return res.status(400).json({ error });
        const bad = await checkTarget(value);
        if (bad) return res.status(400).json({ error: bad });
        const r = await queryAsync(
            `INSERT INTO university_contacts
                (category, department, course_id, name, designation, phone, whatsapp, email, location, office_hours,
                 audience, sort_order, is_visible, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [...stored(value), req.user.id]);
        audit(req, { action: 'CONTACT_CREATE', entity: 'university_contacts', entityId: r.insertId, newValue: value });
        res.status(201).json({ success: true, id: r.insertId });
    }));

    app.put('/api/university-contacts/:id', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const { value, error } = validate(req.body);
        if (error) return res.status(400).json({ error });
        const old = await queryAsync('SELECT * FROM university_contacts WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Contact not found.' });
        const bad = await checkTarget(value);
        if (bad) return res.status(400).json({ error: bad });
        await queryAsync(
            `UPDATE university_contacts SET category = ?, department = ?, course_id = ?, name = ?, designation = ?,
                    phone = ?, whatsapp = ?, email = ?, location = ?, office_hours = ?, audience = ?, sort_order = ?,
                    is_visible = ? WHERE id = ?`,
            [...stored(value), id]);
        audit(req, { action: 'CONTACT_UPDATE', entity: 'university_contacts', entityId: id, oldValue: old[0], newValue: value });
        res.json({ success: true });
    }));

    app.delete('/api/university-contacts/:id', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const old = await queryAsync('SELECT * FROM university_contacts WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Contact not found.' });
        await queryAsync('DELETE FROM university_contacts WHERE id = ?', [id]);
        audit(req, { action: 'CONTACT_DELETE', entity: 'university_contacts', entityId: id, oldValue: old[0] });
        res.json({ success: true });
    }));

    app.get('/api/teacher/contacts', teacher, safe(async (req, res) => {
        const students = await studentsFor(queryAsync, req.user);
        const ids = students.map((s) => s.student_id);
        const details = ids.length
            ? await queryAsync(
                `SELECT student_id, phone_number, email, guardian_name, guardian_phone, guardian_relation
                   FROM students WHERE student_id IN (?)`, [ids])
            : [];
        const byId = new Map(details.map((d) => [d.student_id, d]));

        const parentRows = ids.length
            ? await queryAsync(
                `SELECT psm.student_id, p.parent_id, p.full_name, p.phone, p.email
                   FROM parent_student_map psm
                   JOIN parents p ON p.parent_id = psm.parent_id
                   JOIN users pu ON pu.id = p.user_id
                  WHERE psm.student_id IN (?) AND COALESCE(pu.is_active, 1) <> 0
                  ORDER BY p.full_name`, [ids])
            : [];
        const parentsOf = new Map();
        parentRows.forEach((r) => {
            const list = parentsOf.get(r.student_id) || [];
            list.push({ name: r.full_name, phone: r.phone || null, email: r.email || null });
            parentsOf.set(r.student_id, list);
        });

        res.json({
            students: students.map((s) => {
                const d = byId.get(s.student_id) || {};
                return {
                    student_id: s.student_id, name: s.full_name, roll_number: s.roll_number,
                    enrollment_number: s.enrollment_number, course_id: s.course_id, course_code: s.course_code,
                    course_name: s.course_name, semester: s.semester,
                    phone: d.phone_number || null, email: d.email || null,
                    guardian_name: d.guardian_name || null, guardian_phone: d.guardian_phone || null,
                    guardian_relation: d.guardian_relation || null,
                    parents: parentsOf.get(s.student_id) || []
                };
            })
        });
    }));

    app.get('/api/parent/teachers', parent, safe(async (req, res) => {
        const wards = await queryAsync(
            `SELECT s.student_id, s.full_name, s.course_id, s.semester, c.course_code
               FROM parents p
               JOIN parent_student_map psm ON psm.parent_id = p.parent_id
               JOIN students s ON s.student_id = psm.student_id
               JOIN courses c ON c.id = s.course_id
              WHERE p.user_id = ? AND s.status = 'Active'
              ORDER BY s.full_name`, [req.user.id]);
        const out = [];
        for (const w of wards) {
            const rows = await queryAsync(
                `SELECT t.teacher_id, t.full_name, t.designation, t.department, t.email,
                        sub.subject_code, sub.subject_name
                   FROM teacher_assignments ta
                   JOIN subjects sub ON sub.id = ta.subject_id
                   JOIN teachers t ON t.teacher_id = ta.teacher_id
                   JOIN users tu ON tu.id = t.user_id
                  WHERE sub.course_id = ? AND sub.semester = ? AND COALESCE(tu.is_active, 1) <> 0
                  ORDER BY t.full_name, sub.subject_code`, [w.course_id, w.semester]);
            const map = new Map();
            rows.forEach((r) => {
                const t = map.get(r.teacher_id) || {
                    teacher_id: r.teacher_id, name: r.full_name, designation: r.designation,
                    department: r.department, email: r.email || null, subjects: []
                };
                t.subjects.push({ code: r.subject_code, name: r.subject_name });
                map.set(r.teacher_id, t);
            });
            out.push({
                student_id: w.student_id, ward: w.full_name, course_code: w.course_code,
                semester: w.semester, teachers: [...map.values()]
            });
        }
        res.json(out);
    }));
};
