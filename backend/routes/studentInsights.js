const { todayInTZ, TZ } = require('../lib/time');

const LOW_PERCENT = 75;
const WEEKS = 8;
const DUE_SOON_DAYS = 14;

const num = (v) => Number(v) || 0;
const round1 = (v) => Math.round(v * 10) / 10;
const round2 = (v) => Math.round(v * 100) / 100;
const pct = (part, whole) => (whole ? round1((part / whole) * 100) : null);
const iso = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return v.slice(0, 10);
    return new Date(v).toISOString().slice(0, 10);
};
const addDays = (isoDate, days) => {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};
const daysBetween = (fromIso, toIso) => Math.round((new Date(`${toIso}T00:00:00Z`) - new Date(`${fromIso}T00:00:00Z`)) / 86400000);
const mondayOf = (isoDate) => addDays(isoDate, -((new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7));
const nowTimeInTZ = () => new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false });
const clock = (t) => {
    const [h, m] = String(t || '00:00').split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const dayLabel = (isoDate, today) => {
    const diff = daysBetween(today, isoDate);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};

module.exports = (app, { queryAsync, verifyRole, verifyStudentOwnership }) => {
    app.get('/api/student/:id/insights', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, async (req, res) => {
        try {
            const st = (await queryAsync(
                `SELECT s.student_id, s.full_name, s.roll_number, s.enrollment_number, s.course_id, s.semester,
                        c.course_code, c.course_name
                   FROM students s JOIN courses c ON c.id = s.course_id WHERE s.user_id = ?`, [req.params.id]))[0];
            if (!st) return res.status(404).json({ error: 'Student not found' });

            const today = todayInTZ();
            const nowTime = nowTimeInTZ();
            const subjects = await queryAsync(
                'SELECT id, subject_code, subject_name FROM subjects WHERE course_id = ? AND semester = ? ORDER BY subject_code', [st.course_id, st.semester]);
            const subjectIds = subjects.map((s) => s.id);

            let attendance = { overall: null, bySubject: [], lowThreshold: LOW_PERCENT, trend: { weeks: [], values: [] } };
            let marks = [];
            if (subjectIds.length) {
                const rows = await queryAsync(
                    `SELECT dc.subject_id, COUNT(*) AS total, SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present
                       FROM attendance a JOIN daily_classes dc ON dc.id = a.daily_class_id
                      WHERE a.student_id = ? AND dc.subject_id IN (?) GROUP BY dc.subject_id`, [st.student_id, subjectIds]);
                const byId = new Map(rows.map((r) => [r.subject_id, { total: num(r.total), present: num(r.present) }]));
                const bySubject = subjects.filter((s) => byId.has(s.id)).map((s) => {
                    const { total, present } = byId.get(s.id);
                    const percent = pct(present, total);
                    return {
                        subject_id: s.id, subject: s.subject_name, present, total, percent,
                        needed: percent !== null && percent < LOW_PERCENT ? Math.max(0, Math.ceil((LOW_PERCENT * total - 100 * present) / (100 - LOW_PERCENT))) : 0
                    };
                });
                const sums = bySubject.reduce((a, r) => ({ present: a.present + r.present, total: a.total + r.total }), { present: 0, total: 0 });

                const firstWeek = addDays(mondayOf(today), -7 * (WEEKS - 1));
                const trendRows = await queryAsync(
                    `SELECT DATE_SUB(dc.class_date, INTERVAL WEEKDAY(dc.class_date) DAY) AS week_start,
                            COUNT(*) AS total, SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present
                       FROM attendance a JOIN daily_classes dc ON dc.id = a.daily_class_id
                      WHERE a.student_id = ? AND dc.subject_id IN (?) AND dc.class_date >= ? GROUP BY week_start`, [st.student_id, subjectIds, firstWeek]);
                const weekMap = new Map(trendRows.map((r) => [iso(r.week_start), r]));
                const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(firstWeek, 7 * i));
                attendance = {
                    overall: pct(sums.present, sums.total), bySubject, lowThreshold: LOW_PERCENT,
                    trend: { weeks, values: weeks.map((w) => { const r = weekMap.get(w); return r ? pct(num(r.present), num(r.total)) : null; }) }
                };

                const mine = await queryAsync(
                    `SELECT subject_id, SUM(score) AS score, SUM(max_score) AS max_score FROM marks
                      WHERE student_id = ? AND subject_id IN (?) AND max_score > 0 GROUP BY subject_id`, [st.student_id, subjectIds]);
                const cls = await queryAsync(
                    `SELECT m.subject_id, SUM(m.score) AS score, SUM(m.max_score) AS max_score
                       FROM marks m JOIN students s2 ON s2.student_id = m.student_id
                      WHERE m.subject_id IN (?) AND s2.course_id = ? AND s2.semester = ? AND m.max_score > 0 GROUP BY m.subject_id`,
                    [subjectIds, st.course_id, st.semester]);
                const clsMap = new Map(cls.map((r) => [r.subject_id, r]));
                const nameOf = new Map(subjects.map((s) => [s.id, s.subject_name]));
                marks = mine.map((r) => ({
                    subject_id: r.subject_id, subject: nameOf.get(r.subject_id) || '',
                    mine: pct(num(r.score), num(r.max_score)),
                    classAverage: clsMap.has(r.subject_id) ? pct(num(clsMap.get(r.subject_id).score), num(clsMap.get(r.subject_id).max_score)) : null
                }));
            }

            const fees = await queryAsync(
                'SELECT id, fee_type, semester, total_fee, paid_amount, due_date, status FROM fees WHERE student_id = ? ORDER BY due_date, id', [st.student_id]);
            const feeRows = fees.map((f) => {
                const total = num(f.total_fee); const paid = num(f.paid_amount);
                const due = iso(f.due_date);
                return { id: f.id, fee_type: f.fee_type, semester: f.semester, total, paid, balance: round2(total - paid), due, status: f.status, daysToDue: due ? daysBetween(today, due) : null };
            });
            const unpaid = feeRows.filter((f) => f.balance > 0);
            const feeSummary = {
                billed: round2(feeRows.reduce((s, f) => s + f.total, 0)),
                paid: round2(feeRows.reduce((s, f) => s + f.paid, 0)),
                outstanding: round2(unpaid.reduce((s, f) => s + f.balance, 0)),
                overdueAmount: round2(unpaid.filter((f) => f.daysToDue !== null && f.daysToDue < 0).reduce((s, f) => s + f.balance, 0)),
                dueSoonDays: DUE_SOON_DAYS,
                unpaid: unpaid.slice(0, 5)
            };

            const payments = (await queryAsync(
                `SELECT p.id, p.amount_paid, p.payment_method, p.payment_date, f.fee_type
                   FROM payments p JOIN fees f ON f.id = p.fee_id WHERE f.student_id = ? ORDER BY p.payment_date DESC, p.id DESC LIMIT 3`, [st.student_id]))
                .map((p) => ({ id: p.id, amount: num(p.amount_paid), method: p.payment_method, date: p.payment_date, fee_type: p.fee_type }));

            const upcoming = await queryAsync(
                `SELECT dc.id, dc.class_date, dc.start_time, dc.end_time, sub.subject_name, dc.room_number, t.full_name AS faculty
                   FROM daily_classes dc
                   JOIN subjects sub ON sub.id = dc.subject_id
                   LEFT JOIN teachers t ON t.teacher_id = dc.teacher_id
                  WHERE sub.course_id = ? AND sub.semester = ? AND dc.status <> 'Cancelled'
                    AND (dc.class_date > ? OR (dc.class_date = ? AND dc.end_time >= ?))
                  ORDER BY dc.class_date, dc.start_time LIMIT 5`, [st.course_id, st.semester, today, today, nowTime]);
            const nextClasses = upcoming.map((c) => ({
                id: c.id, day: dayLabel(iso(c.class_date), today), start: clock(c.start_time), end: clock(c.end_time),
                subject: c.subject_name, room: c.room_number || null, faculty: c.faculty || null
            }));
            const classesToday = nextClasses.filter((c) => c.day === 'Today').length;

            const hostel = (await queryAsync(
                `SELECT h.name, a.block, a.room_number FROM hostel_allocations a JOIN hostels h ON h.id = a.hostel_id
                  WHERE a.student_id = ? AND a.status = 'Allotted' LIMIT 1`, [st.student_id]))[0] || null;

            res.json({
                today,
                profile: {
                    name: st.full_name, roll: st.roll_number || null, enrollment: st.enrollment_number,
                    course: st.course_code, courseName: st.course_name, semester: st.semester
                },
                attendance, marks, fees: feeSummary, payments, nextClasses, classesToday,
                hostel: hostel ? { name: hostel.name, block: hostel.block || null, room: hostel.room_number } : null
            });
        } catch (e) {
            console.error('Student insights error:', e.code || e.message);
            res.status(500).json({ error: 'Could not load the dashboard right now.' });
        }
    });
};
