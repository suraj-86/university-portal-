const { str } = require('../lib/validate');
const { todayInTZ } = require('../lib/time');

const LOW_ATTENDANCE_PERCENT = 75;
const MIN_CLASSES_FOR_ATTENDANCE_FLAG = 5;
const SEARCH_MIN = 2;
const SEARCH_MAX = 50;
const SEARCH_LIMIT = 6;

const n = (v) => Number(v) || 0;
const round1 = (v) => Math.round(v * 10) / 10;
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const monthStart = (isoDate, back) => {
    const [y, m] = isoDate.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 - back, 1));
    return d.toISOString().slice(0, 10);
};
const monthKeys = (isoDate, count) => {
    const keys = [];
    for (let i = count - 1; i >= 0; i--) keys.push(monthStart(isoDate, i).slice(0, 7));
    return keys;
};

module.exports = (app, { queryAsync, verifyRole }) => {
    const admin = verifyRole(['admin']);

    const sections = {
        async users() {
            const roles = await queryAsync('SELECT role, is_active, COUNT(*) AS n FROM users GROUP BY role, is_active');
            const byRole = {};
            roles.forEach((r) => {
                const key = r.role;
                byRole[key] = byRole[key] || { active: 0, inactive: 0 };
                if (Number(r.is_active) === 0) byRole[key].inactive += n(r.n);
                else byRole[key].active += n(r.n);
            });
            const statuses = await queryAsync('SELECT status, COUNT(*) AS n FROM students GROUP BY status');
            const studentStatus = {};
            statuses.forEach((r) => { studentStatus[r.status || 'Unknown'] = n(r.n); });
            return { byRole, studentStatus };
        },

        async academic() {
            const counts = (await queryAsync(
                `SELECT (SELECT COUNT(*) FROM courses) AS courses,
                        (SELECT COUNT(*) FROM subjects) AS subjects,
                        (SELECT COUNT(*) FROM teachers) AS teachers,
                        (SELECT COUNT(*) FROM parents) AS parents`))[0] || {};

            const perCourse = await queryAsync(
                `SELECT c.id, c.course_code, c.course_name, COUNT(s.student_id) AS students
                   FROM courses c
                   LEFT JOIN students s ON s.course_id = c.id AND s.status = 'Active'
                  GROUP BY c.id, c.course_code, c.course_name
                  ORDER BY c.course_code`);

            const att = await queryAsync(
                `SELECT c.course_code, a.status, COUNT(*) AS n
                   FROM attendance a
                   JOIN students s ON s.student_id = a.student_id
                   JOIN courses c ON c.id = s.course_id
                  GROUP BY c.course_code, a.status`);
            const attByCourse = new Map();
            let presentAll = 0;
            let totalAll = 0;
            att.forEach((r) => {
                const rec = attByCourse.get(r.course_code) || { present: 0, total: 0 };
                rec.total += n(r.n);
                totalAll += n(r.n);
                if (r.status === 'Present') { rec.present += n(r.n); presentAll += n(r.n); }
                attByCourse.set(r.course_code, rec);
            });
            const attendanceByCourse = [...attByCourse.entries()]
                .map(([course_code, v]) => ({
                    course_code,
                    percentage: v.total ? round1((v.present / v.total) * 100) : null,
                    records: v.total
                }))
                .sort((a, b) => a.course_code.localeCompare(b.course_code));

            const perStudent = await queryAsync(
                `SELECT s.student_id, s.full_name, s.enrollment_number,
                        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
                        COUNT(*) AS total
                   FROM attendance a
                   JOIN students s ON s.student_id = a.student_id
                  WHERE s.status = 'Active'
                  GROUP BY s.student_id, s.full_name, s.enrollment_number`);
            const flagged = perStudent
                .map((r) => ({
                    student_id: r.student_id,
                    full_name: r.full_name,
                    enrollment_number: r.enrollment_number,
                    total: n(r.total),
                    percentage: n(r.total) ? round1((n(r.present) / n(r.total)) * 100) : null
                }))
                .filter((r) => r.total >= MIN_CLASSES_FOR_ATTENDANCE_FLAG && r.percentage < LOW_ATTENDANCE_PERCENT)
                .sort((a, b) => a.percentage - b.percentage);

            const marksByCourse = await queryAsync(
                `SELECT c.course_code, AVG(m.score * 100.0 / m.max_score) AS avg_percent, COUNT(*) AS entries
                   FROM marks m
                   JOIN students s ON s.student_id = m.student_id
                   JOIN courses c ON c.id = s.course_id
                  WHERE m.max_score > 0
                  GROUP BY c.course_code
                  ORDER BY c.course_code`);
            const buckets = await queryAsync(
                `SELECT FLOOR(LEAST(m.score * 100.0 / m.max_score, 99.99) / 10) AS bucket, COUNT(*) AS n
                   FROM marks m
                  WHERE m.max_score > 0
                  GROUP BY bucket`);
            const bands = [
                { label: 'Below 40%', count: 0 },
                { label: '40-59%', count: 0 },
                { label: '60-79%', count: 0 },
                { label: '80% and above', count: 0 }
            ];
            buckets.forEach((b) => {
                const k = Math.max(0, Math.floor(n(b.bucket)));
                const idx = k <= 3 ? 0 : k <= 5 ? 1 : k <= 7 ? 2 : 3;
                bands[idx].count += n(b.n);
            });
            const marksEntries = marksByCourse.reduce((s, r) => s + n(r.entries), 0);
            const marksWeighted = marksByCourse.reduce((s, r) => s + n(r.avg_percent) * n(r.entries), 0);

            return {
                counts: {
                    courses: n(counts.courses), subjects: n(counts.subjects),
                    teachers: n(counts.teachers), parents: n(counts.parents)
                },
                studentsPerCourse: perCourse.map((r) => ({
                    course_code: r.course_code, course_name: r.course_name, students: n(r.students)
                })),
                attendance: {
                    overallPercentage: totalAll ? round1((presentAll / totalAll) * 100) : null,
                    records: totalAll,
                    byCourse: attendanceByCourse,
                    lowThreshold: LOW_ATTENDANCE_PERCENT,
                    minClasses: MIN_CLASSES_FOR_ATTENDANCE_FLAG,
                    belowThresholdCount: flagged.length,
                    lowestStudents: flagged.slice(0, 5)
                },
                marks: {
                    entries: marksEntries,
                    averagePercent: marksEntries ? round1(marksWeighted / marksEntries) : null,
                    byCourse: marksByCourse.map((r) => ({
                        course_code: r.course_code, averagePercent: round1(n(r.avg_percent)), entries: n(r.entries)
                    })),
                    bands
                }
            };
        },

        async financial() {
            const today = todayInTZ();
            const rows = await queryAsync(
                `SELECT fee_type, status, COUNT(*) AS n, SUM(total_fee) AS total, SUM(paid_amount) AS paid
                   FROM fees GROUP BY fee_type, status`);
            let total = 0; let paid = 0;
            const byStatus = { Pending: 0, Partial: 0, Paid: 0 };
            const typeMap = new Map();
            rows.forEach((r) => {
                total += n(r.total); paid += n(r.paid);
                byStatus[r.status] = (byStatus[r.status] || 0) + n(r.n);
                const t = typeMap.get(r.fee_type) || { fee_type: r.fee_type, total: 0, paid: 0 };
                t.total += n(r.total); t.paid += n(r.paid);
                typeMap.set(r.fee_type, t);
            });
            const overdue = (await queryAsync(
                `SELECT COUNT(*) AS n, COALESCE(SUM(total_fee - paid_amount), 0) AS amount
                   FROM fees WHERE status <> 'Paid' AND due_date < ?`, [today]))[0] || {};

            const keys = monthKeys(today, 6);
            const pay = await queryAsync(
                `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS ym, SUM(amount_paid) AS amount
                   FROM payments WHERE payment_date >= ? GROUP BY ym ORDER BY ym`,
                [`${keys[0]}-01`]);
            const payMap = new Map(pay.map((r) => [r.ym, n(r.amount)]));

            return {
                totalBilled: total,
                collected: paid,
                outstanding: Math.max(total - paid, 0),
                collectionRate: total ? round1((paid / total) * 100) : null,
                byStatus,
                byType: [...typeMap.values()].map((t) => ({ ...t, outstanding: Math.max(t.total - t.paid, 0) })),
                overdue: { count: n(overdue.n), amount: n(overdue.amount) },
                monthlyCollections: keys.map((k) => ({ month: k, amount: payMap.get(k) || 0 }))
            };
        },

        async operations() {
            const since = `${monthStart(todayInTZ(), 0)} 00:00:00`;
            const c = (await queryAsync(
                `SELECT (SELECT COUNT(*) FROM notices) AS notices,
                        (SELECT COUNT(*) FROM announcements) AS announcements,
                        (SELECT COUNT(*) FROM messages WHERE created_at >= ?) AS messages_this_month,
                        (SELECT COUNT(*) FROM hostels) AS hostels,
                        (SELECT COUNT(*) FROM hostel_allocations WHERE status = 'Allotted') AS hostel_allotted`,
                [since]))[0] || {};
            const activity = await queryAsync(
                `SELECT al.id, al.action, al.entity, al.entity_id, al.actor_role, al.created_at, u.username AS actor
                   FROM audit_log al
                   LEFT JOIN users u ON u.id = al.actor_user_id
                  ORDER BY al.id DESC LIMIT 10`);
            return {
                notices: n(c.notices), announcements: n(c.announcements),
                messagesThisMonth: n(c.messages_this_month),
                hostels: n(c.hostels), hostelAllotted: n(c.hostel_allotted),
                recentActivity: activity.map((a) => ({
                    id: a.id, action: a.action, entity: a.entity, entityId: a.entity_id,
                    actor: a.actor || null, actorRole: a.actor_role || null, at: a.created_at
                }))
            };
        }
    };

    app.get('/api/admin/analytics', admin, async (req, res) => {
        const out = { generatedAt: new Date().toISOString(), errors: {} };
        await Promise.all(Object.entries(sections).map(async ([name, fn]) => {
            try {
                out[name] = await fn();
            } catch (e) {
                console.error(`Analytics section "${name}" failed:`, e.code || e.message);
                out[name] = null;
                out.errors[name] = true;
            }
        }));
        res.json(out);
    });

    app.get('/api/admin/search', admin, async (req, res) => {
        try {
            const q = str(req.query.q).replace(/\s+/g, ' ');
            if (q.length < SEARCH_MIN) return res.json({ query: q, total: 0, groups: [] });
            if (q.length > SEARCH_MAX) return res.status(400).json({ error: `Search text is too long (max ${SEARCH_MAX}).` });
            const like = `%${escapeLike(q)}%`;
            const link = (path, term) => `${path}?q=${encodeURIComponent(term)}`;

            const [students, teachers, parents, courses, subjects, notices] = await Promise.all([
                queryAsync(
                    `SELECT s.student_id, s.full_name, s.enrollment_number, s.roll_number, s.semester, s.status, c.course_code
                       FROM students s JOIN courses c ON c.id = s.course_id
                      WHERE s.full_name LIKE ? OR s.enrollment_number LIKE ? OR s.roll_number LIKE ?
                         OR s.email LIKE ? OR s.phone_number LIKE ?
                      ORDER BY s.full_name LIMIT ${SEARCH_LIMIT}`, [like, like, like, like, like]),
                queryAsync(
                    `SELECT teacher_id, full_name, employee_id, department, designation
                       FROM teachers
                      WHERE full_name LIKE ? OR employee_id LIKE ? OR email LIKE ? OR phone_number LIKE ? OR department LIKE ?
                      ORDER BY full_name LIMIT ${SEARCH_LIMIT}`, [like, like, like, like, like]),
                queryAsync(
                    `SELECT p.parent_id, p.full_name, p.phone,
                            (SELECT GROUP_CONCAT(st.full_name ORDER BY st.full_name SEPARATOR ', ')
                               FROM parent_student_map psm JOIN students st ON st.student_id = psm.student_id
                              WHERE psm.parent_id = p.parent_id) AS wards
                       FROM parents p
                      WHERE p.full_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ?
                         OR p.parent_id IN (SELECT psm2.parent_id FROM parent_student_map psm2
                                              JOIN students st2 ON st2.student_id = psm2.student_id
                                             WHERE st2.full_name LIKE ?)
                      ORDER BY p.full_name LIMIT ${SEARCH_LIMIT}`, [like, like, like, like]),
                queryAsync(
                    `SELECT id, course_code, course_name, department FROM courses
                      WHERE course_code LIKE ? OR course_name LIKE ? OR department LIKE ?
                      ORDER BY course_code LIMIT ${SEARCH_LIMIT}`, [like, like, like]),
                queryAsync(
                    `SELECT sub.id, sub.subject_code, sub.subject_name, sub.semester, c.course_code
                       FROM subjects sub JOIN courses c ON c.id = sub.course_id
                      WHERE sub.subject_code LIKE ? OR sub.subject_name LIKE ?
                      ORDER BY sub.subject_code LIMIT ${SEARCH_LIMIT}`, [like, like]),
                queryAsync(
                    `SELECT id, title, priority FROM notices
                      WHERE title LIKE ? ORDER BY id DESC LIMIT ${SEARCH_LIMIT}`, [like])
            ]);

            const groups = [
                {
                    key: 'students', label: 'Students',
                    items: students.map((s) => ({
                        id: s.student_id, title: s.full_name,
                        subtitle: `${s.enrollment_number} · ${s.course_code} · Sem ${s.semester}`,
                        badge: s.status && s.status !== 'Active' ? s.status : null,
                        path: link('/admin/students', s.enrollment_number)
                    }))
                },
                {
                    key: 'teachers', label: 'Teachers',
                    items: teachers.map((t) => ({
                        id: t.teacher_id, title: t.full_name,
                        subtitle: `${t.employee_id} · ${t.department}`,
                        badge: null, path: link('/admin/teachers', t.employee_id)
                    }))
                },
                {
                    key: 'parents', label: 'Parents',
                    items: parents.map((p) => ({
                        id: p.parent_id, title: p.full_name,
                        subtitle: p.wards ? `Ward: ${p.wards}` : (p.phone || 'No ward linked'),
                        badge: null, path: link('/admin/parents', p.full_name)
                    }))
                },
                {
                    key: 'courses', label: 'Courses',
                    items: courses.map((c) => ({
                        id: c.id, title: c.course_name, subtitle: `${c.course_code} · ${c.department}`,
                        badge: null, path: link('/admin/courses', c.course_code)
                    }))
                },
                {
                    key: 'subjects', label: 'Subjects',
                    items: subjects.map((s) => ({
                        id: s.id, title: s.subject_name,
                        subtitle: `${s.subject_code} · ${s.course_code} · Sem ${s.semester}`,
                        badge: null, path: link('/admin/subjects', s.subject_code)
                    }))
                },
                {
                    key: 'notices', label: 'Notices',
                    items: notices.map((x) => ({
                        id: x.id, title: x.title, subtitle: `Priority: ${x.priority}`,
                        badge: null, path: link('/admin/notices', x.title)
                    }))
                }
            ].filter((g) => g.items.length);

            res.json({ query: q, total: groups.reduce((s, g) => s + g.items.length, 0), groups });
        } catch (e) {
            console.error('Admin search error:', e.code || e.message);
            res.status(500).json({ error: 'Search failed. Please try again.' });
        }
    });
};
