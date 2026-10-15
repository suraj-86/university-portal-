const STUDENT_COLUMNS = `st.student_id, st.user_id, st.full_name, st.roll_number, st.enrollment_number,
    st.course_id, st.semester, c.course_name, c.course_code`;
const ACTIVE = `st.status = 'Active' AND COALESCE(su.is_active, 1) <> 0`;

const studentsFor = (queryAsync, user) => {
    if (user.role === 'admin') {
        return queryAsync(
            `SELECT ${STUDENT_COLUMNS} FROM students st JOIN courses c ON c.id = st.course_id JOIN users su ON su.id = st.user_id
              WHERE ${ACTIVE} ORDER BY st.full_name`);
    }
    return queryAsync(
        `SELECT DISTINCT ${STUDENT_COLUMNS}
           FROM teachers t
           JOIN teacher_assignments ta ON ta.teacher_id = t.teacher_id
           JOIN subjects sub ON sub.id = ta.subject_id
           JOIN students st ON st.course_id = sub.course_id AND st.semester = sub.semester
           JOIN courses c ON c.id = st.course_id
           JOIN users su ON su.id = st.user_id
          WHERE t.user_id = ? AND ${ACTIVE} ORDER BY st.full_name`, [user.id]);
};

const parentsOfStudents = (queryAsync, studentIds) => {
    if (!studentIds.length) return Promise.resolve([]);
    return queryAsync(
        `SELECT p.user_id, p.full_name,
                GROUP_CONCAT(DISTINCT st.full_name ORDER BY st.full_name SEPARATOR ', ') AS wards
           FROM parent_student_map psm
           JOIN parents p ON p.parent_id = psm.parent_id
           JOIN students st ON st.student_id = psm.student_id
           JOIN users pu ON pu.id = p.user_id
          WHERE psm.student_id IN (?) AND COALESCE(pu.is_active, 1) <> 0
          GROUP BY p.user_id, p.full_name ORDER BY p.full_name`, [studentIds]);
};

module.exports = { studentsFor, parentsOfStudents };
