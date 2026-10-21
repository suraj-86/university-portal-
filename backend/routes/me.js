module.exports = (app, { queryAsync, verifyRole }) => {
    app.get('/api/me/summary', verifyRole(['admin', 'teacher', 'student', 'parent']), async (req, res) => {
        try {
            const { id, role } = req.user;
            let line = '';
            if (role === 'admin') {
                line = 'Administrator';
            } else if (role === 'student') {
                const r = (await queryAsync(
                    `SELECT s.roll_number, s.enrollment_number, c.course_name, c.course_code
                     FROM students s LEFT JOIN courses c ON c.id = s.course_id WHERE s.user_id = ?`, [id]))[0];
                if (r) line = [r.course_code || r.course_name, r.enrollment_number ? `Enr. ${r.enrollment_number}` : (r.roll_number ? `Roll ${r.roll_number}` : '')].filter(Boolean).join(' · ');
            } else if (role === 'teacher') {
                const r = (await queryAsync('SELECT department, designation FROM teachers WHERE user_id = ?', [id]))[0];
                if (r) line = [r.designation, r.department].filter(Boolean).join(' · ');
            } else if (role === 'parent') {
                const rows = await queryAsync(
                    `SELECT s.full_name FROM students s
                     JOIN parent_student_map psm ON psm.student_id = s.student_id
                     JOIN parents p ON p.parent_id = psm.parent_id
                     WHERE p.user_id = ? ORDER BY s.full_name`, [id]);
                if (rows.length === 1) line = `Parent of ${rows[0].full_name}`;
                else if (rows.length > 1) line = `Parent of ${rows.length} students`;
            }
            res.json({ line });
        } catch (e) {
            res.json({ line: '' });
        }
    });
};
