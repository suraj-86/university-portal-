const { str } = require('../lib/validate');
const { generatePassword, hashPassword, passwordProblem } = require('../lib/password');

const MAX_ROWS = 300;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;

const validateRow = (raw, coursesByCode) => {
    const b = raw || {};
    const enrollment = str(b.enrollment_number);
    const name = str(b.name);
    const courseCode = str(b.course_code);
    const semesterText = str(b.semester);
    const roll = str(b.roll_number) || null;
    const email = str(b.email) || null;
    const phone = str(b.phone) || null;
    const password = str(b.password) || null;

    if (!enrollment) return { error: 'Enrollment number is required.' };
    if (enrollment.length > 50) return { error: 'Enrollment number is too long (max 50).' };
    if (/\s/.test(enrollment)) return { error: 'Enrollment number cannot contain spaces.' };
    if (!name) return { error: 'Name is required.' };
    if (name.length > 100) return { error: 'Name is too long (max 100).' };
    if (!courseCode) return { error: 'Course code is required.' };
    const course = coursesByCode.get(courseCode.toLowerCase());
    if (!course) return { error: `Unknown course code "${courseCode}". Use the code shown on the Courses page.` };

    let semester = null;
    if (semesterText) {
        if (!/^\d{1,2}$/.test(semesterText) || Number(semesterText) < 1) return { error: 'Semester must be a whole number, 1 or more.' };
        semester = Number(semesterText);
        if (course.total_semesters && semester > course.total_semesters) {
            return { error: `${course.course_code} has only ${course.total_semesters} semesters.` };
        }
    }
    if (roll && roll.length > 50) return { error: 'Roll number is too long (max 50).' };
    if (email && (email.length > 150 || !EMAIL_RE.test(email))) return { error: 'Email address is not valid.' };
    if (phone && !PHONE_RE.test(phone)) return { error: 'Phone number is not valid.' };
    if (password && passwordProblem(password)) return { error: passwordProblem(password) };

    return { value: { enrollment, name, courseId: course.id, courseCode: course.course_code, semester, roll, email, phone, password } };
};

module.exports = (app, { queryAsync, transaction, verifyRole, audit }) => {
    const prepare = async (rows) => {
        const courses = await queryAsync('SELECT id, course_code, total_semesters FROM courses');
        const coursesByCode = new Map(courses.map((c) => [String(c.course_code).toLowerCase(), c]));

        const errors = [];
        const items = [];
        const firstSeen = new Map();
        rows.forEach((r, i) => {
            const rowNo = (r && Number(r.row)) || i + 1;
            const result = validateRow(r, coursesByCode);
            if (result.error) return errors.push({ row: rowNo, error: result.error });
            const key = result.value.enrollment.toLowerCase();
            if (firstSeen.has(key)) return errors.push({ row: rowNo, error: `Enrollment number repeats row ${firstSeen.get(key)} of this file.` });
            firstSeen.set(key, rowNo);
            items.push({ row: rowNo, ...result.value });
        });

        if (items.length) {
            const enrollments = items.map((it) => it.enrollment);
            const existing = await queryAsync(
                'SELECT student_id, user_id, enrollment_number FROM students WHERE enrollment_number IN (?)', [enrollments]);
            const existingMap = new Map(existing.map((s) => [String(s.enrollment_number).toLowerCase(), s]));
            const usernames = await queryAsync('SELECT username FROM users WHERE username IN (?)', [enrollments]);
            const taken = new Set(usernames.map((u) => String(u.username).toLowerCase()));

            const keep = [];
            items.forEach((it) => {
                const found = existingMap.get(it.enrollment.toLowerCase());
                if (found) {
                    keep.push({ ...it, action: 'update', studentId: found.student_id });
                } else if (taken.has(it.enrollment.toLowerCase())) {
                    errors.push({ row: it.row, error: 'This enrollment number is already used by another login account.' });
                } else {
                    keep.push({ ...it, action: 'create' });
                }
            });
            errors.sort((a, b) => a.row - b.row);
            return { items: keep, errors };
        }
        errors.sort((a, b) => a.row - b.row);
        return { items, errors };
    };

    app.post('/api/students/bulk', verifyRole(['admin']), async (req, res) => {
        try {
            const rows = req.body && req.body.rows;
            if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'No rows to import.' });
            if (rows.length > MAX_ROWS) return res.status(400).json({ error: `Too many rows (max ${MAX_ROWS} per import). Split the file.` });

            const { items, errors } = await prepare(rows);
            const create = items.filter((it) => it.action === 'create');
            const update = items.filter((it) => it.action === 'update');

            if (req.body.dry_run) {
                return res.json({
                    dry_run: true,
                    total: rows.length,
                    create: create.length,
                    update: update.length,
                    generated_passwords: create.filter((it) => !it.password).length,
                    actions: items.map((it) => ({ row: it.row, action: it.action })),
                    errors
                });
            }
            if (errors.length) {
                return res.status(400).json({ error: 'Some rows are invalid. Nothing was imported.', errors: errors.slice(0, 100) });
            }

            const credentials = [];
            await Promise.all(create.map(async (it) => {
                const plain = it.password || generatePassword();
                it.hash = await hashPassword(plain, 10);
                if (!it.password) credentials.push({ row: it.row, enrollment_number: it.enrollment, name: it.name, password: plain });
            }));

            await transaction(async (q) => {
                for (const it of create) {
                    const user = await q("INSERT INTO users (username, password, role) VALUES (?, ?, 'student')", [it.enrollment, it.hash]);
                    await q(
                        `INSERT INTO students (user_id, course_id, enrollment_number, roll_number, full_name, email, phone_number, semester, admission_date, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Active')`,
                        [user.insertId, it.courseId, it.enrollment, it.roll, it.name, it.email, it.phone, it.semester || 1]);
                }
                for (const it of update) {
                    await q(
                        `UPDATE students SET full_name = ?, course_id = ?,
                            semester = COALESCE(?, semester), roll_number = COALESCE(?, roll_number),
                            email = COALESCE(?, email), phone_number = COALESCE(?, phone_number)
                         WHERE student_id = ?`,
                        [it.name, it.courseId, it.semester, it.roll, it.email, it.phone, it.studentId]);
                }
            });

            audit(req, { action: 'STUDENT_BULK_IMPORT', entity: 'students', newValue: { created: create.length, updated: update.length } });
            credentials.sort((a, b) => a.row - b.row);
            res.json({ success: true, saved: items.length, created: create.length, updated: update.length, credentials });
        } catch (e) {
            if (e && e.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Another change used one of these enrollment numbers while importing. Nothing was saved. Please preview again.' });
            }
            console.error('Student import error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Nothing was imported.' });
        }
    });
};
