const personal = `EXISTS (SELECT 1 FROM notice_recipients vr WHERE vr.notice_id = n.id AND vr.user_id = ?)`;

const noticeVisibility = (role, userId, wardStudentId = null) => {
    if (role === 'admin') return { sql: '1 = 1', params: [] };
    if (role === 'teacher') {
        return { sql: `(n.target_role IN ('all','teacher') OR ${personal})`, params: [userId] };
    }
    if (role === 'student') {
        return {
            sql: `((n.target_role IN ('all','student') AND (n.subject_id IS NULL OR EXISTS (
                        SELECT 1 FROM students vs WHERE vs.user_id = ? AND vs.course_id = sub.course_id AND vs.semester = sub.semester)))
                   OR ${personal})`,
            params: [userId, userId]
        };
    }
    if (role === 'parent') {
        const ward = wardStudentId ? 'AND vs.student_id = ?' : '';
        const params = [userId];
        if (wardStudentId) params.push(wardStudentId);
        params.push(userId);
        return {
            sql: `((n.target_role IN ('all','student') AND (n.subject_id IS NULL OR EXISTS (
                        SELECT 1 FROM students vs
                          JOIN parent_student_map vm ON vm.student_id = vs.student_id
                          JOIN parents vp ON vp.parent_id = vm.parent_id
                         WHERE vp.user_id = ? ${ward} AND vs.course_id = sub.course_id AND vs.semester = sub.semester)))
                   OR n.target_role IN ('all','parent')
                   OR ${personal})`,
            params
        };
    }
    throw new Error(`Unknown role: ${role}`);
};

const announcementVisibility = (role, userId) => {
    if (role === 'admin') return { sql: '1 = 1', params: [] };
    if (role === 'teacher') return { sql: `a.audience IN ('all','teacher')`, params: [] };
    if (role === 'student') {
        return {
            sql: `(a.audience IN ('all','student') AND (a.course_id IS NULL OR EXISTS (
                        SELECT 1 FROM students vs WHERE vs.user_id = ? AND vs.course_id = a.course_id
                           AND (a.semester IS NULL OR vs.semester = a.semester))))`,
            params: [userId]
        };
    }
    if (role === 'parent') {
        return {
            sql: `(a.audience IN ('all','parent') AND (a.course_id IS NULL OR EXISTS (
                        SELECT 1 FROM students vs
                          JOIN parent_student_map vm ON vm.student_id = vs.student_id
                          JOIN parents vp ON vp.parent_id = vm.parent_id
                         WHERE vp.user_id = ? AND vs.course_id = a.course_id
                           AND (a.semester IS NULL OR vs.semester = a.semester))))`,
            params: [userId]
        };
    }
    throw new Error(`Unknown role: ${role}`);
};

module.exports = { noticeVisibility, announcementVisibility };
