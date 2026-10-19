const { todayInTZ, TZ } = require('../lib/time');

const LOW_PERCENT = 75;
const MIN_CLASSES = 5;
const WEEKS = 8;
const AT_RISK_LIMIT = 8;
const PASS_PERCENT = 40;

const num = (v) => Number(v) || 0;
const round1 = (v) => Math.round(v * 10) / 10;
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
const mondayOf = (isoDate) => {
    const d = new Date(`${isoDate}T00:00:00Z`);
    const back = (d.getUTCDay() + 6) % 7;
    return addDays(isoDate, -back);
};
const nowTimeInTZ = () => new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false });
const clock = (t) => {
    const [h, m] = String(t || '00:00').split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
};

module.exports = (app, { queryAsync, verifyRole, requireSelfTeacher }) => {
    app.get('/api/teacher/:id/insights', verifyRole(['teacher']), requireSelfTeacher, async (req, res) => {
        try {
            const teacher = (await queryAsync('SELECT teacher_id, full_name FROM teachers WHERE user_id = ?', [req.user.id]))[0];
            if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
            const today = todayInTZ();
            const nowTime = nowTimeInTZ();

            const subjects = await queryAsync(
                `SELECT sub.id, sub.subject_code, sub.subject_name, sub.semester, sub.course_id, c.course_code
                   FROM teacher_assignments ta
                   JOIN subjects sub ON sub.id = ta.subject_id
                   JOIN courses c ON c.id = sub.course_id
                  WHERE ta.teacher_id = ? ORDER BY c.course_code, sub.semester, sub.subject_code`, [teacher.teacher_id]);
            const subjectIds = subjects.map((s) => s.id);

            const studentCount = subjectIds.length
                ? num((await queryAsync(
                    `SELECT COUNT(DISTINCT st.student_id) AS n
                       FROM subjects sub JOIN students st ON st.course_id = sub.course_id AND st.semester = sub.semester AND st.status = 'Active'
                      WHERE sub.id IN (?)`, [subjectIds]))[0]?.n)
                : 0;

            const classes = await queryAsync(
                `SELECT dc.id, dc.subject_id, sub.subject_name, sub.semester, c.course_code, dc.start_time, dc.end_time, dc.room_number, dc.status,
                        (SELECT COUNT(*) FROM attendance a WHERE a.daily_class_id = dc.id) AS marked_count
                   FROM daily_classes dc
                   JOIN subjects sub ON sub.id = dc.subject_id
                   JOIN courses c ON c.id = sub.course_id
                  WHERE dc.teacher_id = ? AND dc.class_date = ? AND dc.status <> 'Cancelled'
                  ORDER BY dc.start_time`, [teacher.teacher_id, today]);
            const todayClasses = classes.map((k) => {
                const marked = num(k.marked_count) > 0;
                const started = String(k.start_time) <= nowTime;
                return {
                    id: k.id, subject_id: k.subject_id, subject: k.subject_name, course: k.course_code, semester: k.semester,
                    start: clock(k.start_time), end: clock(k.end_time), room: k.room_number || null,
                    state: marked ? 'marked' : started ? 'unmarked' : 'upcoming'
                };
            });

            let atRisk = [];
            let weeks = [];
            let series = [];
            let overall = null;
            let analytics = { attendanceBySubject: [], marksBySubject: [], marksBands: [], passPercent: PASS_PERCENT };
            if (subjectIds.length) {
                const perStudent = await queryAsync(
                    `SELECT st.student_id, st.full_name, st.roll_number, dc.subject_id,
                            COUNT(*) AS total, SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present
                       FROM attendance a
                       JOIN daily_classes dc ON dc.id = a.daily_class_id
                       JOIN students st ON st.student_id = a.student_id
                      WHERE dc.subject_id IN (?) AND st.status = 'Active'
                      GROUP BY st.student_id, st.full_name, st.roll_number, dc.subject_id`, [subjectIds]);
                const nameOf = new Map(subjects.map((s) => [s.id, s.subject_name]));
                const flagged = perStudent
                    .map((r) => ({ ...r, total: num(r.total), present: num(r.present) }))
                    .filter((r) => r.total >= MIN_CLASSES && (r.present / r.total) * 100 < LOW_PERCENT)
                    .map((r) => ({
                        student_id: r.student_id, name: r.full_name, roll: r.roll_number || '', subject_id: r.subject_id,
                        subject: nameOf.get(r.subject_id) || '', percent: pct(r.present, r.total),
                        needed: Math.max(0, Math.ceil((LOW_PERCENT * r.total - 100 * r.present) / (100 - LOW_PERCENT)))
                    }))
                    .sort((a, b) => a.percent - b.percent);
                atRisk = { count: flagged.length, items: flagged.slice(0, AT_RISK_LIMIT) };

                const firstWeek = addDays(mondayOf(today), -7 * (WEEKS - 1));
                const trend = await queryAsync(
                    `SELECT dc.subject_id, DATE_SUB(dc.class_date, INTERVAL WEEKDAY(dc.class_date) DAY) AS week_start,
                            COUNT(*) AS total, SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present
                       FROM attendance a JOIN daily_classes dc ON dc.id = a.daily_class_id
                      WHERE dc.subject_id IN (?) AND dc.class_date >= ?
                      GROUP BY dc.subject_id, week_start`, [subjectIds, firstWeek]);
                weeks = Array.from({ length: WEEKS }, (_, i) => addDays(firstWeek, 7 * i));
                const cell = new Map(trend.map((r) => [`${r.subject_id}|${iso(r.week_start)}`, r]));
                series = subjects.map((s) => ({
                    subject_id: s.id, subject: s.subject_name,
                    values: weeks.map((w) => { const r = cell.get(`${s.id}|${w}`); return r ? pct(num(r.present), num(r.total)) : null; })
                }));

                const bySubject = new Map();
                perStudent.forEach((r) => {
                    const rec = bySubject.get(r.subject_id) || { present: 0, total: 0 };
                    rec.present += num(r.present); rec.total += num(r.total);
                    bySubject.set(r.subject_id, rec);
                });
                const marksRows = await queryAsync(
                    `SELECT subject_id, COUNT(*) AS entries, AVG(score * 100.0 / max_score) AS avg_percent,
                            SUM(CASE WHEN score * 100.0 / max_score >= ? THEN 1 ELSE 0 END) AS passed
                       FROM marks WHERE subject_id IN (?) AND max_score > 0 GROUP BY subject_id`, [PASS_PERCENT, subjectIds]);
                const marksOf = new Map(marksRows.map((r) => [r.subject_id, r]));
                const buckets = await queryAsync(
                    `SELECT FLOOR(LEAST(score * 100.0 / max_score, 99.99) / 10) AS bucket, COUNT(*) AS n
                       FROM marks WHERE subject_id IN (?) AND max_score > 0 GROUP BY bucket`, [subjectIds]);
                const bands = [{ label: 'Below 40%', count: 0 }, { label: '40-59%', count: 0 }, { label: '60-79%', count: 0 }, { label: '80% and above', count: 0 }];
                buckets.forEach((b) => {
                    const k = Math.max(0, Math.floor(num(b.bucket)));
                    bands[k <= 3 ? 0 : k <= 5 ? 1 : k <= 7 ? 2 : 3].count += num(b.n);
                });
                analytics = {
                    attendanceBySubject: subjects.map((s) => ({ subject_id: s.id, subject: s.subject_name, percent: pct((bySubject.get(s.id) || {}).present || 0, (bySubject.get(s.id) || {}).total || 0) }))
                        .filter((x) => x.percent !== null),
                    marksBySubject: subjects.filter((s) => marksOf.has(s.id)).map((s) => {
                        const m = marksOf.get(s.id);
                        return { subject_id: s.id, subject: s.subject_name, average: round1(num(m.avg_percent)), entries: num(m.entries), passRate: pct(num(m.passed), num(m.entries)) };
                    }),
                    marksBands: bands,
                    passPercent: PASS_PERCENT
                };

                const all = perStudent.reduce((acc, r) => ({ present: acc.present + num(r.present), total: acc.total + num(r.total) }), { present: 0, total: 0 });
                overall = pct(all.present, all.total);
            } else {
                atRisk = { count: 0, items: [] };
            }

            res.json({
                teacherName: teacher.full_name,
                today,
                counts: { subjects: subjects.length, students: studentCount, classesToday: todayClasses.length, averageAttendance: overall },
                todayClasses,
                unmarkedCount: todayClasses.filter((k) => k.state === 'unmarked').length,
                firstUnmarked: todayClasses.find((k) => k.state === 'unmarked') || null,
                atRisk,
                analytics,
                trend: { weeks, series, lowThreshold: LOW_PERCENT }
            });
        } catch (e) {
            console.error('Teacher insights error:', e.code || e.message);
            res.status(500).json({ error: 'Could not load the dashboard right now.' });
        }
    });
};
