const { isPositiveInt, str, isValidDate } = require('../lib/validate');
const { todayInTZ } = require('../lib/time');
const H = require('../lib/reportHelpers');

const { bad, forbidden, num, round2, percent, isoDate, stamp, dayInTZ, startOfDay, nextDay, lastDayOfMonth, prettyDate, build, MAX_ROWS } = H;

const FEE_TYPES = ['Tuition', 'Hostel', 'Library Fine', 'Exam'];
const STUDENT_STATUSES = ['Active', 'Graduated', 'Suspended'];
const METHODS = ['Online', 'Cash', 'Bank Transfer'];
const DEFAULT_LOW_PERCENT = 75;
const DEFAULT_MIN_CLASSES = 5;
const EXAM_ORDER = ['Sessional 1', 'Sessional 2', 'Practical', 'Assignment', 'End Sem', 'Other'];

module.exports = (app, { queryAsync, verifyRole, audit }) => {
    const idParam = (q, key, label) => {
        const raw = q[key];
        if (raw === undefined || raw === null || raw === '') return null;
        if (!isPositiveInt(raw)) throw bad(`${label} is not valid.`);
        return Number(raw);
    };
    const semesterParam = (q) => {
        const raw = q.semester;
        if (raw === undefined || raw === null || raw === '') return null;
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1 || n > 12) throw bad('Semester is not valid.');
        return n;
    };
    const dateParam = (q, key, label) => {
        const raw = str(q[key]);
        if (!raw) return null;
        if (!isValidDate(raw)) throw bad(`${label} must be a valid date.`);
        return raw;
    };
    const rangeParams = (q, { required = false } = {}) => {
        const from = dateParam(q, 'from', 'The start date');
        const to = dateParam(q, 'to', 'The end date');
        if (required && (!from || !to)) throw bad('Choose a start and end date.');
        if (from && to && from > to) throw bad('The start date must not be after the end date.');
        return { from, to };
    };
    const choice = (q, key, allowed, label, fallback = null) => {
        const raw = str(q[key]);
        if (!raw) return fallback;
        const hit = allowed.find((a) => a.toLowerCase() === raw.toLowerCase());
        if (!hit) throw bad(`${label} is not valid.`);
        return hit;
    };
    const rangeText = ({ from, to }) => (from || to ? `${from ? prettyDate(from) : 'start'} to ${to ? prettyDate(to) : 'today'}` : '');

    const courseOf = async (id) => {
        if (!id) return null;
        const rows = await queryAsync('SELECT id, course_code, course_name FROM courses WHERE id = ?', [id]);
        if (!rows.length) throw bad('That course does not exist.');
        return rows[0];
    };
    const subjectFor = async (actor, id) => {
        const rows = await queryAsync(
            `SELECT sub.id, sub.subject_code, sub.subject_name, sub.course_id, sub.semester, c.course_code, c.course_name
               FROM subjects sub JOIN courses c ON c.id = sub.course_id WHERE sub.id = ?`, [id]);
        if (!rows.length) throw bad('That subject does not exist.');
        if (actor.role === 'teacher') {
            const owns = await queryAsync(
                `SELECT 1 FROM teachers t JOIN teacher_assignments ta ON ta.teacher_id = t.teacher_id
                  WHERE t.user_id = ? AND ta.subject_id = ? LIMIT 1`, [actor.id, id]);
            if (!owns.length) throw forbidden('You are not assigned to this subject.');
        }
        return rows[0];
    };
    const subjectLabel = (s) => `${s.subject_code} ${s.subject_name}`;
    const requiredSubject = async (actor, q) => {
        const id = idParam(q, 'subject_id', 'The subject');
        if (!id) throw bad('Choose a subject.');
        return subjectFor(actor, id);
    };
    const rosterOf = (subject) => queryAsync(
        `SELECT st.student_id, st.enrollment_number, st.roll_number, st.full_name
           FROM students st WHERE st.course_id = ? AND st.semester = ? AND st.status = 'Active'
          ORDER BY st.roll_number, st.full_name`, [subject.course_id, subject.semester]);

    const attendanceTotals = async (actor, q) => {
        const courseId = idParam(q, 'course_id', 'The course');
        const semester = semesterParam(q);
        const subjectId = idParam(q, 'subject_id', 'The subject');
        const range = rangeParams(q);
        if (actor.role === 'teacher' && !subjectId) throw bad('Choose a subject.');
        const course = await courseOf(courseId);
        const subject = subjectId ? await subjectFor(actor, subjectId) : null;

        const where = ["st.status = 'Active'"];
        const params = [];
        if (courseId) { where.push('st.course_id = ?'); params.push(courseId); }
        if (semester) { where.push('st.semester = ?'); params.push(semester); }
        if (subjectId) { where.push('dc.subject_id = ?'); params.push(subjectId); }
        if (range.from) { where.push('dc.class_date >= ?'); params.push(range.from); }
        if (range.to) { where.push('dc.class_date <= ?'); params.push(range.to); }
        const rows = await queryAsync(
            `SELECT st.student_id, st.enrollment_number, st.roll_number, st.full_name, c.course_code, st.semester,
                    COUNT(a.id) AS total,
                    SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
                    SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
                    SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) AS late,
                    SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) AS excused
               FROM attendance a
               JOIN daily_classes dc ON dc.id = a.daily_class_id
               JOIN students st ON st.student_id = a.student_id
               JOIN courses c ON c.id = st.course_id
              WHERE ${where.join(' AND ')}
              GROUP BY st.student_id, st.enrollment_number, st.roll_number, st.full_name, c.course_code, st.semester
              ORDER BY c.course_code, st.semester, st.roll_number, st.full_name`, params);
        const filters = [
            course && `Course: ${course.course_code}`, semester && `Semester ${semester}`,
            subject && `Subject: ${subjectLabel(subject)}`, rangeText(range) && `Dates: ${rangeText(range)}`];
        return { rows: rows.map((r) => ({ ...r, total: num(r.total), present: num(r.present), absent: num(r.absent), late: num(r.late), excused: num(r.excused) })), filters };
    };
    const attendanceCols = [
        { key: 'enrollment', label: 'Enrollment No.' }, { key: 'roll', label: 'Roll No.' }, { key: 'name', label: 'Name' },
        { key: 'course', label: 'Course' }, { key: 'semester', label: 'Sem', type: 'number' },
        { key: 'total', label: 'Classes', type: 'number' }, { key: 'present', label: 'Present', type: 'number' },
        { key: 'absent', label: 'Absent', type: 'number' }, { key: 'late', label: 'Late', type: 'number' },
        { key: 'excused', label: 'Excused', type: 'number' }, { key: 'percent', label: 'Present %', type: 'percent' }];
    const attendanceRow = (r) => ({
        enrollment: r.enrollment_number, roll: r.roll_number || '', name: r.full_name, course: r.course_code, semester: r.semester,
        total: r.total, present: r.present, absent: r.absent, late: r.late, excused: r.excused, percent: percent(r.present, r.total)
    });

    const feeFilters = async (q) => {
        const courseId = idParam(q, 'course_id', 'The course');
        const semester = semesterParam(q);
        const feeType = choice(q, 'fee_type', FEE_TYPES, 'The fee type');
        const course = await courseOf(courseId);
        const where = [];
        const params = [];
        if (courseId) { where.push('st.course_id = ?'); params.push(courseId); }
        if (semester) { where.push('f.semester = ?'); params.push(semester); }
        if (feeType) { where.push('f.fee_type = ?'); params.push(feeType); }
        const text = [course && `Course: ${course.course_code}`, semester && `Semester ${semester}`, feeType && `Fee type: ${feeType}`];
        return { where, params, text };
    };

    const reports = {
        students: {
            roles: ['admin'],
            run: async (_a, q) => {
                const courseId = idParam(q, 'course_id', 'The course');
                const semester = semesterParam(q);
                const status = choice(q, 'status', [...STUDENT_STATUSES, 'All'], 'The status', 'Active');
                const course = await courseOf(courseId);
                const where = [];
                const params = [];
                if (courseId) { where.push('st.course_id = ?'); params.push(courseId); }
                if (semester) { where.push('st.semester = ?'); params.push(semester); }
                if (status !== 'All') { where.push('st.status = ?'); params.push(status); }
                const rows = await queryAsync(
                    `SELECT st.enrollment_number, st.roll_number, st.full_name, c.course_code, st.semester, st.status,
                            st.gender, st.email, st.phone_number, st.guardian_name, st.guardian_phone
                       FROM students st JOIN courses c ON c.id = st.course_id
                       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
                      ORDER BY c.course_code, st.semester, st.roll_number, st.full_name LIMIT ?`, [...params, MAX_ROWS + 1]);
                return build({
                    title: 'Student directory',
                    filters: [course && `Course: ${course.course_code}`, semester && `Semester ${semester}`, `Status: ${status}`],
                    columns: [
                        { key: 'enrollment', label: 'Enrollment No.' }, { key: 'roll', label: 'Roll No.' }, { key: 'name', label: 'Name' },
                        { key: 'course', label: 'Course' }, { key: 'semester', label: 'Sem', type: 'number' }, { key: 'status', label: 'Status' },
                        { key: 'gender', label: 'Gender' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
                        { key: 'guardian', label: 'Guardian' }, { key: 'guardian_phone', label: 'Guardian phone' }],
                    rows: rows.map((r) => ({
                        enrollment: r.enrollment_number, roll: r.roll_number || '', name: r.full_name, course: r.course_code, semester: r.semester,
                        status: r.status, gender: r.gender || '', email: r.email || '', phone: r.phone_number || '',
                        guardian: r.guardian_name || '', guardian_phone: r.guardian_phone || ''
                    })),
                    summary: [{ label: 'Students', value: rows.length }]
                });
            }
        },

        'attendance-summary': {
            roles: ['admin', 'teacher'],
            run: async (actor, q) => {
                const { rows, filters } = await attendanceTotals(actor, q);
                return build({ title: 'Attendance summary', filters, columns: attendanceCols, rows: rows.map(attendanceRow),
                    summary: [{ label: 'Students', value: rows.length }] });
            }
        },

        'attendance-low': {
            roles: ['admin', 'teacher'],
            run: async (actor, q) => {
                const below = q.below === undefined || q.below === '' ? DEFAULT_LOW_PERCENT : Number(q.below);
                const minClasses = q.min_classes === undefined || q.min_classes === '' ? DEFAULT_MIN_CLASSES : Number(q.min_classes);
                if (!Number.isFinite(below) || below < 1 || below > 100) throw bad('The percentage must be between 1 and 100.');
                if (!Number.isInteger(minClasses) || minClasses < 1 || minClasses > 500) throw bad('The minimum number of classes must be between 1 and 500.');
                const { rows, filters } = await attendanceTotals(actor, q);
                const low = rows
                    .map((r) => ({ ...r, pct: percent(r.present, r.total) }))
                    .filter((r) => r.total >= minClasses && r.pct !== null && r.pct < below)
                    .sort((a, b) => a.pct - b.pct);
                return build({
                    title: 'Low attendance list',
                    filters: [...filters, `Below ${below}%`, `At least ${minClasses} classes held`],
                    columns: [...attendanceCols, { key: 'needed', label: `Classes to attend in a row to reach ${below}%`, type: 'number' }],
                    rows: low.map((r) => ({
                        ...attendanceRow(r),
                        needed: below >= 100 ? null : Math.max(0, Math.ceil((below * r.total - 100 * r.present) / (100 - below)))
                    })),
                    summary: [{ label: 'Students below the limit', value: low.length }, { label: 'Students checked', value: rows.length }]
                });
            }
        },

        'attendance-sheet': {
            roles: ['admin', 'teacher'],
            run: async (actor, q) => {
                const subject = await requiredSubject(actor, q);
                const month = str(q.month);
                if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw bad('Choose a month.');
                const start = `${month}-01`;
                const end = lastDayOfMonth(month);
                const classes = await queryAsync(
                    `SELECT dc.id, dc.class_date FROM daily_classes dc
                      WHERE dc.subject_id = ? AND dc.class_date >= ? AND dc.class_date <= ? AND dc.status <> 'Cancelled'
                      ORDER BY dc.class_date, dc.id`, [subject.id, start, end]);
                const roster = await rosterOf(subject);
                const records = classes.length
                    ? await queryAsync('SELECT a.student_id, a.daily_class_id, a.status FROM attendance a WHERE a.daily_class_id IN (?)', [classes.map((c) => c.id)])
                    : [];
                const byStudent = new Map();
                records.forEach((r) => {
                    if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, new Map());
                    byStudent.get(r.student_id).set(r.daily_class_id, r.status);
                });
                const seenDay = new Map();
                const dateCols = classes.map((c) => {
                    const iso = isoDate(c.class_date);
                    const nth = (seenDay.get(iso) || 0) + 1;
                    seenDay.set(iso, nth);
                    const label = `${iso.slice(8, 10)}${nth > 1 ? `·${nth}` : ''}`;
                    return { key: `c${c.id}`, label, id: c.id };
                });
                const code = { Present: 'P', Absent: 'A', Late: 'L', Excused: 'E' };
                const rows = roster.map((s) => {
                    const mine = byStudent.get(s.student_id) || new Map();
                    const row = { roll: s.roll_number || '', name: s.full_name };
                    let present = 0;
                    let marked = 0;
                    dateCols.forEach((d) => {
                        const st = mine.get(d.id);
                        row[d.key] = st ? code[st] || '' : '';
                        if (st) { marked += 1; if (st === 'Present') present += 1; }
                    });
                    row.present = present;
                    row.marked = marked;
                    row.percent = percent(present, marked);
                    return row;
                });
                return build({
                    title: 'Monthly attendance sheet',
                    filters: [`Subject: ${subjectLabel(subject)}`, `${subject.course_code} semester ${subject.semester}`,
                        `Month: ${new Date(`${start}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`,
                        'P present · A absent · L late · E excused'],
                    columns: [
                        { key: 'roll', label: 'Roll No.' }, { key: 'name', label: 'Name' },
                        ...dateCols.map((d) => ({ key: d.key, label: d.label, narrow: true })),
                        { key: 'present', label: 'Present', type: 'number' }, { key: 'marked', label: 'Classes', type: 'number' },
                        { key: 'percent', label: 'Present %', type: 'percent' }],
                    rows,
                    summary: [{ label: 'Classes this month', value: classes.length }, { label: 'Students', value: roster.length }]
                });
            }
        },

        'marks-sheet': {
            roles: ['admin', 'teacher'],
            run: async (actor, q) => {
                const subject = await requiredSubject(actor, q);
                const groups = await queryAsync(
                    `SELECT exam_type, assessment_name, MAX(max_score) AS max_score FROM marks WHERE subject_id = ?
                      GROUP BY exam_type, assessment_name`, [subject.id]);
                groups.sort((a, b) => (EXAM_ORDER.indexOf(a.exam_type) - EXAM_ORDER.indexOf(b.exam_type)) || String(a.assessment_name).localeCompare(String(b.assessment_name)));
                const names = new Map((await queryAsync('SELECT exam_type, display_name FROM assessment_settings WHERE subject_id = ?', [subject.id]))
                    .map((r) => [r.exam_type, r.display_name]));
                const marks = await queryAsync('SELECT student_id, exam_type, assessment_name, score, max_score FROM marks WHERE subject_id = ?', [subject.id]);
                const roster = await rosterOf(subject);

                const cols = groups.map((g, i) => {
                    const base = g.exam_type === 'Other' ? (g.assessment_name || 'Other') : (names.get(g.exam_type) || g.exam_type);
                    return { key: `a${i}`, label: `${base} (out of ${num(g.max_score)})`, type: 'number', exam: g.exam_type, name: g.assessment_name };
                });
                const byStudent = new Map();
                marks.forEach((m) => {
                    if (!byStudent.has(m.student_id)) byStudent.set(m.student_id, new Map());
                    byStudent.get(m.student_id).set(`${m.exam_type}|${m.assessment_name}`, m);
                });
                const rows = roster.map((s) => {
                    const mine = byStudent.get(s.student_id) || new Map();
                    const row = { enrollment: s.enrollment_number, roll: s.roll_number || '', name: s.full_name };
                    let total = 0;
                    let outOf = 0;
                    cols.forEach((c) => {
                        const m = mine.get(`${c.exam}|${c.name}`);
                        row[c.key] = m ? num(m.score) : null;
                        if (m) { total += num(m.score); outOf += num(m.max_score); }
                    });
                    row.total = outOf ? round2(total) : null;
                    row.out_of = outOf || null;
                    row.percent = percent(total, outOf);
                    return row;
                });
                return build({
                    title: 'Marks sheet',
                    filters: [`Subject: ${subjectLabel(subject)}`, `${subject.course_code} semester ${subject.semester}`, 'Raw marks only, no grades'],
                    columns: [
                        { key: 'enrollment', label: 'Enrollment No.' }, { key: 'roll', label: 'Roll No.' }, { key: 'name', label: 'Name' },
                        ...cols.map(({ key, label, type }) => ({ key, label, type })),
                        { key: 'total', label: 'Total', type: 'number' }, { key: 'out_of', label: 'Out of', type: 'number' }, { key: 'percent', label: '%', type: 'percent' }],
                    rows,
                    summary: [{ label: 'Students', value: roster.length }, { label: 'Assessments', value: cols.length }]
                });
            }
        },

        'fees-outstanding': {
            roles: ['admin'],
            run: async (_a, q) => {
                const f = await feeFilters(q);
                const overdueOnly = q.overdue_only === '1' || q.overdue_only === 'true';
                const today = todayInTZ();
                const where = ["f.status <> 'Paid'", 'f.total_fee > f.paid_amount', ...f.where];
                const params = [today, ...f.params];
                if (overdueOnly) { where.push('f.due_date < ?'); params.push(today); }
                const rows = await queryAsync(
                    `SELECT st.enrollment_number, st.full_name, c.course_code, f.semester, f.fee_type, f.total_fee, f.paid_amount,
                            f.due_date, f.status, DATEDIFF(?, f.due_date) AS days_over
                       FROM fees f JOIN students st ON st.student_id = f.student_id JOIN courses c ON c.id = st.course_id
                      WHERE ${where.join(' AND ')}
                      ORDER BY f.due_date, c.course_code, st.full_name LIMIT ?`, [...params, MAX_ROWS + 1]);
                const out = rows.map((r) => ({
                    enrollment: r.enrollment_number, name: r.full_name, course: r.course_code, semester: r.semester, fee_type: r.fee_type,
                    total: num(r.total_fee), paid: num(r.paid_amount), balance: round2(num(r.total_fee) - num(r.paid_amount)),
                    due: isoDate(r.due_date), status: r.status, days_over: num(r.days_over) > 0 ? num(r.days_over) : 0
                }));
                const owed = round2(out.reduce((s, r) => s + r.balance, 0));
                return build({
                    title: overdueOnly ? 'Fee defaulters (overdue)' : 'Outstanding fees',
                    filters: [...f.text, overdueOnly && 'Overdue only', `As on ${prettyDate(today)}`],
                    columns: [
                        { key: 'enrollment', label: 'Enrollment No.' }, { key: 'name', label: 'Name' }, { key: 'course', label: 'Course' },
                        { key: 'semester', label: 'Sem', type: 'number' }, { key: 'fee_type', label: 'Fee type' },
                        { key: 'total', label: 'Total', type: 'money' }, { key: 'paid', label: 'Paid', type: 'money' }, { key: 'balance', label: 'Balance', type: 'money' },
                        { key: 'due', label: 'Due date' }, { key: 'status', label: 'Status' }, { key: 'days_over', label: 'Days overdue', type: 'number' }],
                    rows: out,
                    summary: [{ label: 'Total outstanding', value: owed, type: 'money' }, { label: 'Fees', value: out.length },
                        { label: 'Students', value: new Set(out.map((r) => r.enrollment)).size }]
                });
            }
        },

        'fees-by-course': {
            roles: ['admin'],
            run: async (_a, q) => {
                const f = await feeFilters(q);
                const rows = await queryAsync(
                    `SELECT c.course_code, c.course_name, f.semester, COUNT(DISTINCT f.student_id) AS students,
                            SUM(f.total_fee) AS billed, SUM(f.paid_amount) AS collected
                       FROM fees f JOIN students st ON st.student_id = f.student_id JOIN courses c ON c.id = st.course_id
                      ${f.where.length ? `WHERE ${f.where.join(' AND ')}` : ''}
                      GROUP BY c.id, c.course_code, c.course_name, f.semester
                      ORDER BY c.course_code, f.semester`, f.params);
                const out = rows.map((r) => {
                    const billed = num(r.billed);
                    const collected = num(r.collected);
                    return { course: r.course_code, course_name: r.course_name, semester: r.semester, students: num(r.students), billed,
                        collected, outstanding: round2(billed - collected), percent: percent(collected, billed) };
                });
                const billed = out.reduce((s, r) => s + r.billed, 0);
                const collected = out.reduce((s, r) => s + r.collected, 0);
                return build({
                    title: 'Fee summary by course',
                    filters: f.text,
                    columns: [
                        { key: 'course', label: 'Course' }, { key: 'course_name', label: 'Course name' }, { key: 'semester', label: 'Sem', type: 'number' },
                        { key: 'students', label: 'Students', type: 'number' }, { key: 'billed', label: 'Billed', type: 'money' },
                        { key: 'collected', label: 'Collected', type: 'money' }, { key: 'outstanding', label: 'Outstanding', type: 'money' },
                        { key: 'percent', label: 'Collected %', type: 'percent' }],
                    rows: out,
                    summary: [{ label: 'Billed', value: round2(billed), type: 'money' }, { label: 'Collected', value: round2(collected), type: 'money' },
                        { label: 'Outstanding', value: round2(billed - collected), type: 'money' }]
                });
            }
        },

        'fees-collection': {
            roles: ['admin'],
            run: async (_a, q) => {
                const range = rangeParams(q, { required: true });
                const rows = await queryAsync(
                    `SELECT p.payment_date, p.payment_method, p.amount_paid FROM payments p
                      WHERE p.payment_date >= ? AND p.payment_date < ? ORDER BY p.payment_date LIMIT ?`,
                    [startOfDay(range.from), startOfDay(nextDay(range.to)), 50001]);
                if (rows.length > 50000) throw bad('That date range has too many payments. Choose a shorter range.');
                const days = new Map();
                rows.forEach((r) => {
                    const day = dayInTZ(r.payment_date);
                    const rec = days.get(day) || { day, count: 0, Online: 0, Cash: 0, 'Bank Transfer': 0, total: 0 };
                    rec.count += 1;
                    rec[r.payment_method] = round2((rec[r.payment_method] || 0) + num(r.amount_paid));
                    rec.total = round2(rec.total + num(r.amount_paid));
                    days.set(day, rec);
                });
                const out = [...days.values()].sort((a, b) => a.day.localeCompare(b.day)).map((d) => ({
                    day: d.day, count: d.count, online: d.Online, cash: d.Cash, bank: d['Bank Transfer'], total: d.total }));
                return build({
                    title: 'Fee collection by day',
                    filters: [`Dates: ${rangeText(range)}`],
                    columns: [
                        { key: 'day', label: 'Date' }, { key: 'count', label: 'Payments', type: 'number' }, { key: 'online', label: 'Online', type: 'money' },
                        { key: 'cash', label: 'Cash', type: 'money' }, { key: 'bank', label: 'Bank transfer', type: 'money' }, { key: 'total', label: 'Total', type: 'money' }],
                    rows: out,
                    summary: [{ label: 'Total collected', value: round2(out.reduce((s, r) => s + r.total, 0)), type: 'money' },
                        { label: 'Payments', value: out.reduce((s, r) => s + r.count, 0) }]
                });
            }
        },

        payments: {
            roles: ['admin'],
            run: async (_a, q) => {
                const range = rangeParams(q, { required: true });
                const method = choice(q, 'method', METHODS, 'The payment method');
                const params = [startOfDay(range.from), startOfDay(nextDay(range.to))];
                if (method) params.push(method);
                const rows = await queryAsync(
                    `SELECT p.id, p.payment_date, p.amount_paid, p.payment_method, p.transaction_reference,
                            st.enrollment_number, st.full_name, c.course_code, f.fee_type, f.semester, u.username AS processed_by
                       FROM payments p
                       JOIN fees f ON f.id = p.fee_id
                       JOIN students st ON st.student_id = f.student_id
                       JOIN courses c ON c.id = st.course_id
                       LEFT JOIN users u ON u.id = p.processed_by
                      WHERE p.payment_date >= ? AND p.payment_date < ? ${method ? 'AND p.payment_method = ?' : ''}
                      ORDER BY p.payment_date DESC, p.id DESC LIMIT ?`, [...params, MAX_ROWS + 1]);
                const out = rows.map((r) => ({
                    receipt: r.id, date: stamp(r.payment_date), enrollment: r.enrollment_number, name: r.full_name, course: r.course_code,
                    semester: r.semester, fee_type: r.fee_type, amount: num(r.amount_paid), method: r.payment_method,
                    reference: r.transaction_reference || '', processed_by: r.processed_by || 'Student/parent (online)'
                }));
                return build({
                    title: 'Payments ledger',
                    filters: [`Dates: ${rangeText(range)}`, method && `Method: ${method}`],
                    columns: [
                        { key: 'receipt', label: 'Receipt No.', type: 'number' }, { key: 'date', label: 'Date and time' }, { key: 'enrollment', label: 'Enrollment No.' },
                        { key: 'name', label: 'Name' }, { key: 'course', label: 'Course' }, { key: 'semester', label: 'Sem', type: 'number' },
                        { key: 'fee_type', label: 'Fee type' }, { key: 'amount', label: 'Amount', type: 'money' }, { key: 'method', label: 'Method' },
                        { key: 'reference', label: 'Reference' }, { key: 'processed_by', label: 'Recorded by' }],
                    rows: out,
                    summary: [{ label: 'Total', value: round2(out.reduce((s, r) => s + r.amount, 0)), type: 'money' }, { label: 'Payments', value: out.length }]
                });
            }
        },

        'hostel-occupancy': {
            roles: ['admin'],
            run: async (_a, q) => {
                const hostelId = idParam(q, 'hostel_id', 'The hostel');
                const status = choice(q, 'status', ['Allotted', 'Vacated', 'All'], 'The status', 'Allotted');
                let hostelName = null;
                if (hostelId) {
                    const h = await queryAsync('SELECT name FROM hostels WHERE id = ?', [hostelId]);
                    if (!h.length) throw bad('That hostel does not exist.');
                    hostelName = h[0].name;
                }
                const where = [];
                const params = [];
                if (hostelId) { where.push('a.hostel_id = ?'); params.push(hostelId); }
                if (status !== 'All') { where.push('a.status = ?'); params.push(status); }
                const rows = await queryAsync(
                    `SELECT h.name AS hostel, a.block, a.room_number, st.enrollment_number, st.full_name, c.course_code, st.semester,
                            a.academic_session, a.allotted_on, a.vacated_on, a.status
                       FROM hostel_allocations a
                       JOIN hostels h ON h.id = a.hostel_id
                       JOIN students st ON st.student_id = a.student_id
                       JOIN courses c ON c.id = st.course_id
                       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
                      ORDER BY h.name, a.block, a.room_number, st.full_name LIMIT ?`, [...params, MAX_ROWS + 1]);
                const out = rows.map((r) => ({
                    hostel: r.hostel, block: r.block || '', room: r.room_number, enrollment: r.enrollment_number, name: r.full_name, course: r.course_code,
                    semester: r.semester, session: r.academic_session, allotted: isoDate(r.allotted_on), vacated: isoDate(r.vacated_on), status: r.status }));
                const per = new Map();
                out.forEach((r) => per.set(r.hostel, (per.get(r.hostel) || 0) + 1));
                return build({
                    title: 'Hostel occupancy',
                    filters: [hostelName && `Hostel: ${hostelName}`, `Status: ${status}`],
                    columns: [
                        { key: 'hostel', label: 'Hostel' }, { key: 'block', label: 'Block' }, { key: 'room', label: 'Room' },
                        { key: 'enrollment', label: 'Enrollment No.' }, { key: 'name', label: 'Name' }, { key: 'course', label: 'Course' },
                        { key: 'semester', label: 'Sem', type: 'number' }, { key: 'session', label: 'Session' },
                        { key: 'allotted', label: 'Allotted on' }, { key: 'vacated', label: 'Vacated on' }, { key: 'status', label: 'Status' }],
                    rows: out,
                    summary: [{ label: 'Records', value: out.length }, ...[...per.entries()].map(([label, value]) => ({ label, value }))]
                });
            }
        },

        'my-attendance': {
            roles: ['student', 'parent'],
            run: async (actor, q) => {
                const ward = await wardFor(actor, q);
                const view = choice(q, 'view', ['summary', 'daily'], 'The view', 'summary');
                const range = rangeParams(q);
                const where = ['a.student_id = ?'];
                const params = [ward.student_id];
                if (range.from) { where.push('dc.class_date >= ?'); params.push(range.from); }
                if (range.to) { where.push('dc.class_date <= ?'); params.push(range.to); }
                const filters = [`${ward.full_name} (${ward.enrollment_number})`, rangeText(range) && `Dates: ${rangeText(range)}`];

                if (view === 'daily') {
                    const rows = await queryAsync(
                        `SELECT dc.class_date, sub.subject_code, sub.subject_name, a.status, a.remarks
                           FROM attendance a JOIN daily_classes dc ON dc.id = a.daily_class_id JOIN subjects sub ON sub.id = dc.subject_id
                          WHERE ${where.join(' AND ')} ORDER BY dc.class_date DESC, sub.subject_code LIMIT ?`, [...params, MAX_ROWS + 1]);
                    return build({
                        title: 'Attendance statement (day by day)', filters,
                        columns: [{ key: 'date', label: 'Date' }, { key: 'code', label: 'Subject code' }, { key: 'subject', label: 'Subject' },
                            { key: 'status', label: 'Status' }, { key: 'remarks', label: 'Remarks' }],
                        rows: rows.map((r) => ({ date: isoDate(r.class_date), code: r.subject_code, subject: r.subject_name, status: r.status, remarks: r.remarks || '' }))
                    });
                }
                const rows = await queryAsync(
                    `SELECT sub.subject_code, sub.subject_name, COUNT(a.id) AS total,
                            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
                            SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
                            SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) AS late,
                            SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) AS excused
                       FROM attendance a JOIN daily_classes dc ON dc.id = a.daily_class_id JOIN subjects sub ON sub.id = dc.subject_id
                      WHERE ${where.join(' AND ')}
                      GROUP BY sub.id, sub.subject_code, sub.subject_name ORDER BY sub.subject_code`, params);
                const out = rows.map((r) => ({ code: r.subject_code, subject: r.subject_name, total: num(r.total), present: num(r.present),
                    absent: num(r.absent), late: num(r.late), excused: num(r.excused), percent: percent(num(r.present), num(r.total)) }));
                const total = out.reduce((s, r) => s + r.total, 0);
                const present = out.reduce((s, r) => s + r.present, 0);
                return build({
                    title: 'Attendance statement', filters,
                    columns: [{ key: 'code', label: 'Subject code' }, { key: 'subject', label: 'Subject' }, { key: 'total', label: 'Classes', type: 'number' },
                        { key: 'present', label: 'Present', type: 'number' }, { key: 'absent', label: 'Absent', type: 'number' },
                        { key: 'late', label: 'Late', type: 'number' }, { key: 'excused', label: 'Excused', type: 'number' },
                        { key: 'percent', label: 'Present %', type: 'percent' }],
                    rows: out,
                    summary: [{ label: 'Overall present', value: percent(present, total) === null ? '—' : `${percent(present, total)}%` }, { label: 'Classes', value: total }]
                });
            }
        },

        'my-fees': {
            roles: ['student', 'parent'],
            run: async (actor, q) => {
                const ward = await wardFor(actor, q);
                const view = choice(q, 'view', ['fees', 'payments'], 'The view', 'fees');
                const filters = [`${ward.full_name} (${ward.enrollment_number})`];
                if (view === 'payments') {
                    const rows = await queryAsync(
                        `SELECT p.id, p.payment_date, f.fee_type, f.semester, p.amount_paid, p.payment_method, p.transaction_reference
                           FROM payments p JOIN fees f ON f.id = p.fee_id WHERE f.student_id = ?
                          ORDER BY p.payment_date DESC, p.id DESC LIMIT ?`, [ward.student_id, MAX_ROWS + 1]);
                    const out = rows.map((r) => ({ receipt: r.id, date: stamp(r.payment_date), fee_type: r.fee_type, semester: r.semester,
                        amount: num(r.amount_paid), method: r.payment_method, reference: r.transaction_reference || '' }));
                    return build({
                        title: 'Payment history', filters,
                        columns: [{ key: 'receipt', label: 'Receipt No.', type: 'number' }, { key: 'date', label: 'Date and time' }, { key: 'fee_type', label: 'Fee type' },
                            { key: 'semester', label: 'Sem', type: 'number' }, { key: 'amount', label: 'Amount', type: 'money' }, { key: 'method', label: 'Method' },
                            { key: 'reference', label: 'Reference' }],
                        rows: out,
                        summary: [{ label: 'Total paid', value: round2(out.reduce((s, r) => s + r.amount, 0)), type: 'money' }]
                    });
                }
                const rows = await queryAsync(
                    `SELECT f.semester, f.fee_type, f.total_fee, f.paid_amount, f.due_date, f.status FROM fees f
                      WHERE f.student_id = ? ORDER BY f.semester, f.due_date`, [ward.student_id]);
                const out = rows.map((r) => ({ semester: r.semester, fee_type: r.fee_type, total: num(r.total_fee), paid: num(r.paid_amount),
                    balance: round2(num(r.total_fee) - num(r.paid_amount)), due: isoDate(r.due_date), status: r.status }));
                const total = out.reduce((s, r) => s + r.total, 0);
                const paid = out.reduce((s, r) => s + r.paid, 0);
                return build({
                    title: 'Fee statement', filters,
                    columns: [{ key: 'semester', label: 'Sem', type: 'number' }, { key: 'fee_type', label: 'Fee type' }, { key: 'total', label: 'Total', type: 'money' },
                        { key: 'paid', label: 'Paid', type: 'money' }, { key: 'balance', label: 'Balance', type: 'money' }, { key: 'due', label: 'Due date' }, { key: 'status', label: 'Status' }],
                    rows: out,
                    summary: [{ label: 'Total fees', value: round2(total), type: 'money' }, { label: 'Paid', value: round2(paid), type: 'money' },
                        { label: 'Outstanding', value: round2(total - paid), type: 'money' }]
                });
            }
        }
    };

    async function wardFor(actor, q) {
        if (actor.role === 'student') {
            const rows = await queryAsync('SELECT student_id, full_name, enrollment_number FROM students WHERE user_id = ? LIMIT 1', [actor.id]);
            if (!rows.length) throw new H.ReportError(404, 'No student record found for this account.');
            return rows[0];
        }
        const wards = await queryAsync(
            `SELECT st.student_id, st.full_name, st.enrollment_number FROM students st
               JOIN parent_student_map psm ON psm.student_id = st.student_id JOIN parents p ON p.parent_id = psm.parent_id
              WHERE p.user_id = ? ORDER BY st.full_name`, [actor.id]);
        if (!wards.length) throw new H.ReportError(404, 'No student is linked to this account.');
        const wanted = idParam(q, 'student_id', 'The student');
        if (!wanted) {
            if (wards.length === 1) return wards[0];
            throw bad('Choose a student.');
        }
        const hit = wards.find((w) => w.student_id === wanted);
        if (!hit) throw forbidden('This student is not linked to your account.');
        return hit;
    }

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            if (e instanceof H.ReportError) return res.status(e.status).json({ error: e.message });
            console.error('Reports route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong while building the report. Please try again.' });
        });

    app.get('/api/reports/options', verifyRole(['admin', 'teacher', 'student', 'parent']), safe(async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const role = req.user.role;
        if (role === 'admin') {
            const [courses, subjects, hostels] = await Promise.all([
                queryAsync('SELECT id, course_code, course_name, total_semesters FROM courses ORDER BY course_code'),
                queryAsync(`SELECT sub.id, sub.subject_code, sub.subject_name, sub.course_id, sub.semester, c.course_code
                              FROM subjects sub JOIN courses c ON c.id = sub.course_id ORDER BY c.course_code, sub.semester, sub.subject_code`),
                queryAsync('SELECT id, name FROM hostels ORDER BY name')]);
            return res.json({ courses, subjects, hostels });
        }
        if (role === 'teacher') {
            const subjects = await queryAsync(
                `SELECT DISTINCT sub.id, sub.subject_code, sub.subject_name, sub.course_id, sub.semester, c.course_code
                   FROM teachers t JOIN teacher_assignments ta ON ta.teacher_id = t.teacher_id
                   JOIN subjects sub ON sub.id = ta.subject_id JOIN courses c ON c.id = sub.course_id
                  WHERE t.user_id = ? ORDER BY c.course_code, sub.semester, sub.subject_code`, [req.user.id]);
            return res.json({ subjects });
        }
        if (role === 'student') {
            const wards = await queryAsync('SELECT student_id, full_name, enrollment_number FROM students WHERE user_id = ? LIMIT 1', [req.user.id]);
            return res.json({ wards });
        }
        const wards = await queryAsync(
            `SELECT st.student_id, st.full_name, st.enrollment_number FROM students st
               JOIN parent_student_map psm ON psm.student_id = st.student_id JOIN parents p ON p.parent_id = psm.parent_id
              WHERE p.user_id = ? ORDER BY st.full_name`, [req.user.id]);
        res.json({ wards });
    }));

    app.get('/api/reports/:name', verifyRole(['admin', 'teacher', 'student', 'parent']), safe(async (req, res) => {
        const report = Object.prototype.hasOwnProperty.call(reports, req.params.name) ? reports[req.params.name] : null;
        if (!report) return res.status(404).json({ error: 'Unknown report.' });
        if (!report.roles.includes(req.user.role)) return res.status(403).json({ error: 'You cannot run this report.' });

        const result = await report.run(req.user, req.query || {});
        res.set('Cache-Control', 'no-store');
        if (req.user.role === 'admin' || req.user.role === 'teacher') {
            const filters = {};
            Object.keys(req.query || {}).forEach((k) => { filters[k] = String(req.query[k]).slice(0, 60); });
            audit(req, { action: 'REPORT_RUN', entity: 'reports', newValue: { report: req.params.name, filters, rows: result.total_rows } });
        }
        res.json(result);
    }));
};
