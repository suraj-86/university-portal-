
const grading = require('../lib/grading');
const { todayInTZ } = require('../lib/time');

const DEFAULT_LABELS = {
    Assignment: 'Assignment',
    'Sessional 1': 'Sessional 1',
    'Sessional 2': 'Sessional 2',
    Practical: 'Practical',
    Other: 'Other',
    'End Sem': 'End Semester Exam'
};
const COMPONENT_ORDER = ['Assignment', 'Sessional 1', 'Sessional 2', 'Practical', 'Other', 'End Sem'];
const FINAL_TYPES = ['End Sem', 'Practical'];

const emptyAttendance = () => ({ present: 0, absent: 0, late: 0, excused: 0, total: 0, percentage: null });

const addAttendance = (target, status, n) => {
    const key = String(status || '').toLowerCase();
    if (key in target && key !== 'total' && key !== 'percentage') target[key] += n;
    target.total += n;
};

const finishAttendance = (a) => {
    a.percentage = a.total > 0 ? grading.round((a.present / a.total) * 100, 1) : null;
    return a;
};

module.exports = (app, { queryAsync, verifyRole, verifyStudentOwnership }) => {
    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Report card route error:', e.code || e.message);
            res.status(500).json({ error: 'Could not load the report card. Please try again.' });
        });

    app.get(
        '/api/student/:id/report-card',
        verifyRole(['student', 'parent', 'admin']),
        verifyStudentOwnership,
        safe(async (req, res) => {
            const userId = Number(req.params.id);

            const students = await queryAsync(
                `SELECT s.student_id, s.full_name, s.enrollment_number, s.roll_number, s.course_id,
                        s.semester AS current_semester, s.status,
                        DATE_FORMAT(s.date_of_birth, '%d %b %Y') AS date_of_birth,
                        DATE_FORMAT(s.admission_date, '%d %b %Y') AS admission_date,
                        c.course_code, c.course_name, c.department
                   FROM students s
                   JOIN courses c ON c.id = s.course_id
                  WHERE s.user_id = ? LIMIT 1`,
                [userId]
            );
            if (!students.length) return res.status(404).json({ error: 'Student record not found.' });
            const st = students[0];

            const subjects = await queryAsync(
                `SELECT id, semester, subject_code, subject_name, subject_type, credits
                   FROM subjects
                  WHERE course_id = ?
                     OR id IN (SELECT DISTINCT subject_id FROM marks WHERE student_id = ?)
                  ORDER BY semester, subject_code`,
                [st.course_id, st.student_id]
            );

            const marks = await queryAsync(
                'SELECT subject_id, exam_type, assessment_name, score, max_score FROM marks WHERE student_id = ?',
                [st.student_id]
            );

            const subjectIds = subjects.map((s) => s.id);
            const settings = subjectIds.length
                ? await queryAsync(
                      'SELECT subject_id, exam_type, display_name FROM assessment_settings WHERE subject_id IN (?)',
                      [subjectIds]
                  )
                : [];

            const attendanceRows = await queryAsync(
                `SELECT dc.subject_id, a.status, COUNT(*) AS n
                   FROM attendance a
                   JOIN daily_classes dc ON dc.id = a.daily_class_id
                  WHERE a.student_id = ?
                  GROUP BY dc.subject_id, a.status`,
                [st.student_id]
            );

            const customName = new Map();
            settings.forEach((s) => {
                if (s.display_name) customName.set(`${s.subject_id}|${s.exam_type}`, s.display_name);
            });

            const marksBySubject = new Map();
            marks.forEach((m) => {
                if (!marksBySubject.has(m.subject_id)) marksBySubject.set(m.subject_id, []);
                marksBySubject.get(m.subject_id).push(m);
            });

            const attendanceBySubject = new Map();
            attendanceRows.forEach((r) => {
                if (!attendanceBySubject.has(r.subject_id)) attendanceBySubject.set(r.subject_id, emptyAttendance());
                addAttendance(attendanceBySubject.get(r.subject_id), r.status, Number(r.n));
            });

            const buildSubject = (sub) => {
                const rows = marksBySubject.get(sub.id) || [];
                const components = rows
                    .map((m) => ({
                        type: m.exam_type,
                        label:
                            m.exam_type === 'Other'
                                ? m.assessment_name || DEFAULT_LABELS.Other
                                : customName.get(`${sub.id}|${m.exam_type}`) || DEFAULT_LABELS[m.exam_type] || m.exam_type,
                        score: Number(m.score),
                        max: Number(m.max_score)
                    }))
                    .sort(
                        (a, b) =>
                            COMPONENT_ORDER.indexOf(a.type) - COMPONENT_ORDER.indexOf(b.type) ||
                            a.label.localeCompare(b.label)
                    );

                const credits = Number(sub.credits) || 0;
                const base = {
                    id: sub.id,
                    code: sub.subject_code,
                    name: sub.subject_name,
                    type: sub.subject_type,
                    credits,
                    components: components.map(({ label, score, max }) => ({ label, score, max })),
                    attendance: finishAttendance(attendanceBySubject.get(sub.id) || emptyAttendance())
                };

                if (!components.length) {
                    return {
                        ...base,
                        evaluated: false,
                        total: null,
                        totalMax: null,
                        percentage: null,
                        grade: null,
                        gradePoint: null,
                        passed: null,
                        provisional: false
                    };
                }

                const total = components.reduce((sum, c) => sum + c.score, 0);
                const rawMax = components.reduce((sum, c) => sum + c.max, 0);
                const totalMax = rawMax > 0 ? rawMax : 100;
                const percentage = grading.round((total / totalMax) * 100, 1);

                return {
                    ...base,
                    evaluated: true,
                    total: grading.round(total, 2),
                    totalMax,
                    percentage,
                    grade: grading.gradeFor(percentage),
                    gradePoint: grading.gradePointFor(percentage),
                    passed: grading.isPass(percentage),
                    provisional: !rows.some((m) => FINAL_TYPES.includes(m.exam_type))
                };
            };

            const bySemester = new Map();
            subjects.forEach((sub) => {
                if (!bySemester.has(sub.semester)) bySemester.set(sub.semester, []);
                bySemester.get(sub.semester).push(buildSubject(sub));
            });

            const semesters = [...bySemester.entries()]
                .filter(([sem, subs]) => subs.some((s) => s.evaluated) || sem === st.current_semester)
                .sort((a, b) => a[0] - b[0])
                .map(([sem, subs]) => {
                    const evaluated = subs.filter((s) => s.evaluated);
                    const obtained = evaluated.reduce((sum, s) => sum + s.total, 0);
                    const maximum = evaluated.reduce((sum, s) => sum + s.totalMax, 0);
                    const failed = evaluated.filter((s) => !s.passed).length;
                    const complete = evaluated.length === subs.length && evaluated.every((s) => !s.provisional);

                    const attendance = emptyAttendance();
                    subs.forEach((s) => {
                        ['present', 'absent', 'late', 'excused', 'total'].forEach((k) => {
                            attendance[k] += s.attendance[k];
                        });
                    });
                    finishAttendance(attendance);

                    let status = 'PASSED';
                    if (!evaluated.length) status = 'PENDING';
                    else if (failed > 0) status = 'BACKLOG';
                    else if (!complete) status = 'PROVISIONAL';

                    return {
                        semester: sem,
                        subjects: subs,
                        totalCredits: subs.reduce((sum, s) => sum + s.credits, 0),
                        earnedCredits: evaluated.filter((s) => s.passed).reduce((sum, s) => sum + s.credits, 0),
                        obtained: grading.round(obtained, 2),
                        maximum,
                        percentage: maximum > 0 ? grading.round((obtained / maximum) * 100, 1) : null,
                        sgpa: grading.weightedGradePoint(evaluated),
                        failedSubjects: failed,
                        status,
                        attendance
                    };
                });

            const allEvaluated = semesters.flatMap((s) => s.subjects).filter((s) => s.evaluated);
            const overallObtained = allEvaluated.reduce((sum, s) => sum + s.total, 0);
            const overallMax = allEvaluated.reduce((sum, s) => sum + s.totalMax, 0);

            res.json({
                student: {
                    name: st.full_name,
                    enrollmentNumber: st.enrollment_number,
                    rollNumber: st.roll_number,
                    courseCode: st.course_code,
                    courseName: st.course_name,
                    department: st.department,
                    currentSemester: st.current_semester,
                    dateOfBirth: st.date_of_birth,
                    admissionDate: st.admission_date,
                    status: st.status
                },
                semesters,
                overall: {
                    cgpa: grading.weightedGradePoint(allEvaluated),
                    percentage: overallMax > 0 ? grading.round((overallObtained / overallMax) * 100, 1) : null,
                    earnedCredits: semesters.reduce((sum, s) => sum + s.earnedCredits, 0),
                    backlogs: semesters.reduce((sum, s) => sum + s.failedSubjects, 0)
                },
                grading: grading.describe(),
                generatedOn: todayInTZ()
            });
        })
    );
};
