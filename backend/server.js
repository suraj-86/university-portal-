require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const cookieParser = require('cookie-parser'); 

const app = express();

// 1. Updated CORS to exactly match the URL in your screenshot
app.use(cors({
    origin: 'https://university-portal-flax-tau.vercel.app', 
    credentials: true 
}));

app.use(express.json());
app.use(cookieParser()); 

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_college_key_2026'; 

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// DATABASE CONNECTION
// ==========================================
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        return;
    }
    console.log('✅ Successfully connected to MySQL');
});

// ==========================================
// SECURITY MIDDLEWARE (RBAC)
// ==========================================
const verifyRole = (allowedRoles) => {
    return (req, res, next) => {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ error: "Access Denied: No session token provided. Please log in." });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded; 

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ error: "Forbidden: You do not have permission to perform this action." });
            }

            next(); 
        } catch (err) {
            return res.status(401).json({ error: "Invalid or Expired Session. Please log in again." });
        }
    };
};

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const sql = `
        SELECT u.id, u.username, u.password, u.role, 
               COALESCE(t.full_name, s.full_name, p.full_name, u.username) AS full_name
        FROM users u
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN parents p ON u.id = p.user_id
        WHERE u.username = ?`;

    db.query(sql, [username], async (err, data) => {
        if (err) {
            console.error("LOGIN QUERY ERROR:", err);
            return res.status(500).json({
                error: "Database error",
                details: err.message
            });
        }
        
        if (data.length > 0) {
            const user = data[0];
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (isMatch) {
                const tokenPayload = {
                    id: user.id,
                    role: user.role
                };
                const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

                res.cookie('token', token, {
                    httpOnly: true,      
                    secure: true,       
                    sameSite: 'none',  
                    maxAge: 8 * 60 * 60 * 1000 
                });

                delete user.password;
                return res.json({ success: true, user: user });
            } else {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
        } else {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production' 
    });
    res.json({ success: true, message: "Logged out successfully" });
});

app.put('/api/users/:id/change-password', verifyRole(['admin', 'teacher', 'student', 'parent']), async (req, res) => {
    const userId = req.params.id;
    
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { currentPassword, newPassword } = req.body;

    db.query("SELECT password FROM users WHERE id = ?", [userId], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "User not found" });

        const user = results[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: "Incorrect current password" });

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        db.query("UPDATE users SET password = ? WHERE id = ?", [hashedNewPassword, userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Password updated successfully!" });
        });
    });
});

app.put('/api/users/:id/change-username', verifyRole(['admin', 'teacher', 'student', 'parent']), (req, res) => {
    const userId = req.params.id;
    
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { newUsername } = req.body;

    if (!newUsername || newUsername.trim() === '') {
        return res.status(400).json({ error: "Username cannot be empty" });
    }

    db.query("UPDATE users SET username = ? WHERE id = ?", [newUsername.trim(), userId], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "That username is already taken!" });
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: "Username updated successfully! You will use this to log in next time." });
    });
});

const deleteFile = (filePath) => {
    const fullPath = path.join(__dirname, filePath);
    fs.unlink(fullPath, (err) => {
        if (err) {
            console.error(`❌ Error deleting file at ${fullPath}:`, err.message);
        } else {
            console.log(`✅ File deleted successfully: ${fullPath}`);
        }
    });
};

// ==========================================
// STUDENT MANAGEMENT ROUTES
// ==========================================

app.get('/api/students', verifyRole(['admin', 'teacher']), (req, res) => {
    const sql = `
        SELECT students.*, courses.course_name 
        FROM students 
        LEFT JOIN courses ON students.course_id = courses.id
    `;
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(data);
    });
});

app.post('/api/students', verifyRole(['admin']), async (req, res) => { 
    const { name, email, roll, password, semester, course_id } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        const userSql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'student')";
        db.query(userSql, [roll, hashedPassword], (err, userResult) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ error: err.message }));
            }

            const userId = userResult.insertId;
            const studentSql = `
                INSERT INTO students (user_id, course_id, enrollment_number, full_name, email, semester, admission_date, status) 
                VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'Active')
            `;
            
            db.query(studentSql, [userId, course_id, roll, name, email, semester || 1], (err, result) => {
                if (err) {
                    return db.rollback(() => res.status(400).json({ error: err.message }));
                }

                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                    res.json({ success: true });
                });
            });
        });
    });
});

app.put('/api/students/:id', verifyRole(['admin']), (req, res) => {
    const { name, email, roll, semester, course_id } = req.body; 
    const sql = "UPDATE students SET full_name=?, email=?, enrollment_number=?, semester=?, course_id=? WHERE student_id=?";
    
    db.query(sql, [name, email, roll, semester, course_id, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/students/:id', verifyRole(['admin']), (req, res) => {
    const userIdToDelete = req.params.id;
    
    db.query('DELETE FROM students WHERE user_id = ?', [userIdToDelete], (err, studentResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query('DELETE FROM users WHERE id = ?', [userIdToDelete], (err2, userResult) => {
            if (err2) return res.status(500).json({ error: err2.message });
            return res.json({ success: true, message: "Student completely removed!" });
        });
    });
});

// ==========================================
// TEACHER MANAGEMENT ROUTES
// ==========================================

app.get('/api/teachers', verifyRole(['admin']), (req, res) => {
    const sql = "SELECT * FROM teachers";
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(data);
    });
});

app.post('/api/teachers', verifyRole(['admin']), async (req, res) => { 
    const { full_name, email, employee_id, department, qualification, designation, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        const userSql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'teacher')";
        db.query(userSql, [employee_id, hashedPassword], (err, userResult) => {
            if (err) return db.rollback(() => res.status(400).json({ error: err.message }));

            const userId = userResult.insertId;
            const teacherSql = `
                INSERT INTO teachers (user_id, employee_id, full_name, email, department, qualification, designation, joining_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())
            `;
            
            db.query(teacherSql, [userId, employee_id, full_name, email, department, qualification, designation], (err, result) => {
                if (err) return db.rollback(() => res.status(400).json({ error: err.message }));

                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                    res.json({ success: true, message: "Faculty registered successfully" });
                });
            });
        });
    });
});

app.put('/api/teachers/:id', verifyRole(['admin']), (req, res) => {
    const { full_name, email, employee_id, department, qualification, designation } = req.body;
    const sql = "UPDATE teachers SET full_name=?, email=?, employee_id=?, department=?, qualification=?, designation=? WHERE teacher_id=?";
    db.query(sql, [full_name, email, employee_id, department, qualification, designation, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/teachers/:id', verifyRole(['admin']), (req, res) => {
    const sql = "DELETE FROM teachers WHERE teacher_id = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// COURSE MANAGEMENT ROUTES
// ==========================================

app.get('/api/courses', verifyRole(['admin', 'teacher', 'student', 'parent']), (req, res) => {
    const sql = "SELECT * FROM courses";
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(data);
    });
});

app.post('/api/courses', verifyRole(['admin']), (req, res) => {
    const { course_code, course_name, department, duration_years, total_semesters } = req.body;
    const sql = "INSERT INTO courses (course_code, course_name, department, duration_years, total_semesters) VALUES (?, ?, ?, ?, ?)";
    
    db.query(sql, [course_code, course_name, department, duration_years, total_semesters], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Course added successfully" });
    });
});

app.put('/api/courses/:id', verifyRole(['admin']), (req, res) => {
    const { course_code, course_name, department, duration_years, total_semesters } = req.body;
    const sql = "UPDATE courses SET course_code=?, course_name=?, department=?, duration_years=?, total_semesters=? WHERE id=?";
    
    db.query(sql, [course_code, course_name, department, duration_years, total_semesters, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/courses/:id', verifyRole(['admin']), (req, res) => {
    const sql = "DELETE FROM courses WHERE id = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// SUBJECT MANAGEMENT ROUTES
// ==========================================

app.get('/api/subjects', verifyRole(['admin', 'teacher']), (req, res) => {
    const sql = `
        SELECT subjects.*, courses.course_name, teachers.full_name as teacher_name 
        FROM subjects 
        LEFT JOIN courses ON subjects.course_id = courses.id
        LEFT JOIN teacher_assignments ON subjects.id = teacher_assignments.subject_id
        LEFT JOIN teachers ON teacher_assignments.teacher_id = teachers.teacher_id
    `;
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.post('/api/subjects', verifyRole(['admin']), (req, res) => {
    const { course_id, semester, subject_code, subject_name, subject_type, credits } = req.body;
    const sql = "INSERT INTO subjects (course_id, semester, subject_code, subject_name, subject_type, credits) VALUES (?, ?, ?, ?, ?, ?)";
    
    db.query(sql, [course_id, semester, subject_code, subject_name, subject_type, credits], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/subjects/:id', verifyRole(['admin']), (req, res) => {
    const subjectId = req.params.id;
    const { subject_code, subject_name, course_id, semester, subject_type, credits, teacher_id } = req.body;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        const subSql = "UPDATE subjects SET course_id=?, semester=?, subject_code=?, subject_name=?, subject_type=?, credits=? WHERE id=?";
        db.query(subSql, [course_id, semester, subject_code, subject_name, subject_type, credits, subjectId], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

            const assignSql = "REPLACE INTO teacher_assignments (teacher_id, subject_id, academic_year) VALUES (?, ?, '2026-2027')";
            db.query(assignSql, [teacher_id, subjectId], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                    res.json({ success: true });
                });
            });
        });
    });
});

app.delete('/api/subjects/:id', verifyRole(['admin']), (req, res) => {
    const sql = "DELETE FROM subjects WHERE id = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// PARENT MANAGEMENT ROUTES (ADMIN)
// ==========================================

app.get('/api/parents', verifyRole(['admin']), (req, res) => {
    const sql = `
        SELECT 
            p.parent_id as id, 
            p.full_name as name, 
            p.phone, 
            p.email, 
            u.username, 
            GROUP_CONCAT(s.student_id) as student_ids, 
            GROUP_CONCAT(s.full_name) as student_name, 
            GROUP_CONCAT(s.enrollment_number) as roll
        FROM parents p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN parent_student_map psm ON p.parent_id = psm.parent_id
        LEFT JOIN students s ON psm.student_id = s.student_id
        GROUP BY p.parent_id
    `;
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.post('/api/parents', verifyRole(['admin']), async (req, res) => { 
    const { full_name, phone, email, username, password, student_ids } = req.body; 
    const hashedPassword = await bcrypt.hash(password, 10);

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        const userSql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'parent')";
        db.query(userSql, [username, hashedPassword], (err, userResult) => {      
            if (err) return db.rollback(() => res.status(400).json({ error: err.message }));
            const userId = userResult.insertId;

            const parentSql = "INSERT INTO parents (user_id, full_name, phone, email) VALUES (?, ?, ?, ?)";
            db.query(parentSql, [userId, full_name, phone, email], (err, parentResult) => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                const parentId = parentResult.insertId;

                const values = student_ids.map(sId => [parentId, sId]);
                const mapSql = "INSERT INTO parent_student_map (parent_id, student_id) VALUES ?";
                db.query(mapSql, [values], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

                    db.commit((err) => {
                        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                        res.json({ success: true, message: "Parent account created and linked!" });
                    });
                });
            });
        });
    });
});

app.put('/api/parents/:id', verifyRole(['admin']), (req, res) => {
    const parentId = req.params.id;
    const { full_name, phone, email, student_ids } = req.body; 
    
    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query("UPDATE parents SET full_name = ?, phone = ?, email = ? WHERE parent_id = ?", [full_name, phone, email, parentId], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
            
            db.query("DELETE FROM parent_student_map WHERE parent_id = ?", [parentId], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                
                const values = student_ids.map(sId => [parentId, sId]);
                db.query("INSERT INTO parent_student_map (parent_id, student_id) VALUES ?", [values], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                    
                    db.commit((err) => {
                        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                        res.json({ success: true, message: "Parent updated successfully" });
                    });
                });
            });
        });
    });
});

app.delete('/api/parents/:id', verifyRole(['admin']), (req, res) => {
    const parentId = req.params.id;
    
    db.query("SELECT user_id FROM parents WHERE parent_id = ?", [parentId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Parent not found" });
        
        const userId = results[0].user_id;
        
        db.query("DELETE FROM users WHERE id = ?", [userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Parent account deleted" });
        });
    });
});

// ==========================================
// CAMPUS NOTICE ROUTES
// ==========================================

app.get('/api/notices', verifyRole(['admin', 'teacher', 'student', 'parent']), (req, res) => {
    const sql = "SELECT id, title, content, target_role, priority, attachment_url, DATE_FORMAT(created_at, '%Y-%m-%d') as date FROM notices ORDER BY created_at DESC";
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.post('/api/notices', verifyRole(['admin', 'teacher']), upload.single('attachment'), (req, res) => {
    const { title, content, target_role, priority, posted_by } = req.body;
    
    if (!posted_by) {
        return res.status(400).json({ error: "Admin/Teacher ID (posted_by) is required." });
    }

    const attachment_url = req.file ? `/uploads/${req.file.filename}` : (req.body.attachment_url || null);

    const sql = "INSERT INTO notices (title, content, target_role, priority, attachment_url, posted_by) VALUES (?, ?, ?, ?, ?, ?)";
    
    db.query(sql, [title, content, target_role, priority, attachment_url, posted_by], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/notices/:id', verifyRole(['admin', 'teacher']), upload.single('attachment'), (req, res) => {
    const { title, content, target_role, priority } = req.body;
    
    const attachment_url = req.file ? `/uploads/${req.file.filename}` : req.body.attachment_url;

    const sql = "UPDATE notices SET title=?, content=?, target_role=?, priority=?, attachment_url=? WHERE id=?";
    
    db.query(sql, [title, content, target_role, priority, attachment_url, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/notices/:id', verifyRole(['admin', 'teacher']), (req, res) => {
    const noticeId = req.params.id;

    db.query("SELECT attachment_url FROM notices WHERE id = ?", [noticeId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const fileToDelete = results[0]?.attachment_url;

        db.query("DELETE FROM notices WHERE id = ?", [noticeId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            if (fileToDelete) {
                deleteFile(fileToDelete);
            }

            res.json({ success: true, message: "Notice and attachment deleted." });
        });
    });
});

// ==========================================
// ADMIN DASHBOARD
// ==========================================

app.get('/api/admin/dashboard-stats', verifyRole(['admin']), (req, res) => {
    const statsSql = `
        SELECT 
            (SELECT COUNT(*) FROM students) as totalStudents,
            (SELECT COUNT(*) FROM teachers) as totalTeachers,
            (SELECT COUNT(*) FROM courses) as totalCourses,
            (SELECT COUNT(*) FROM notices) as totalNotices
    `;

    const activitySql = `
        SELECT 
            u.username as user, 
            'System Access' as action, 
            u.role as target, 
            DATE_FORMAT(u.created_at, '%b %d, %Y') as time,
            'Active' as status
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT 5
    `;

    db.query(statsSql, (err, statsData) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query(activitySql, (err, activityData) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
                stats: statsData[0],
                activities: activityData
            });
        });
    });
});

// ==========================================
// TEACHER NOTICE & CLASS ROUTES
// ==========================================

app.get('/api/teacher/:id/assigned-subjects', verifyRole(['teacher']), (req, res) => {
    const sql = `
        SELECT 
            s.id, 
            s.subject_code, 
            s.subject_name, 
            c.course_name,
            s.semester,
            s.credits,
            (SELECT COUNT(*) FROM students st 
             WHERE st.course_id = s.course_id AND st.semester = s.semester) as enrolled_count
        FROM subjects s
        JOIN teacher_assignments ta ON s.id = ta.subject_id
        JOIN courses c ON s.course_id = c.id
        WHERE ta.teacher_id = (SELECT teacher_id FROM teachers WHERE user_id = ?)
    `;

    db.query(sql, [req.params.id], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/teacher/:id/notices', verifyRole(['teacher']), (req, res) => {
    const sql = `
        SELECT n.*, DATE_FORMAT(n.created_at, '%Y-%m-%d') as date, 
               u.username as author, s.subject_name
        FROM notices n
        LEFT JOIN users u ON n.posted_by = u.id
        LEFT JOIN subjects s ON n.subject_id = s.id
        WHERE n.target_role IN ('all', 'teacher') 
           OR n.posted_by = ?
        ORDER BY n.created_at DESC
    `;
    db.query(sql, [req.params.id], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

// Save Attendance
app.post('/api/attendance', verifyRole(['teacher']), (req, res) => {
    const { subject_id, date, students, marked_by } = req.body;

    const getTeacherSql = `SELECT teacher_id FROM teachers WHERE user_id = ?`;

    db.query(getTeacherSql, [marked_by], (err, teacherData) => {
        if (err) return res.status(500).json({ error: err.message });
        if (teacherData.length === 0) return res.status(404).json({ error: "Teacher lookup failed" });
        
        const actualTeacherId = teacherData[0].teacher_id;

        const checkClassSql = `SELECT id FROM daily_classes WHERE subject_id = ? AND class_date = ?`;

        db.query(checkClassSql, [subject_id, date], (err, classData) => {
            if (err) return res.status(500).json({ error: err.message });

            const insertAttendance = (dailyClassId) => {
                const values = students.map(student => [
                    student.student_id,
                    dailyClassId,
                    student.status,
                    'Marked via Quick Attendance',
                    actualTeacherId
                ]);

                const insertSql = `
                    INSERT INTO attendance (student_id, daily_class_id, status, remarks, marked_by) 
                    VALUES ?
                    ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)
                `;

                db.query(insertSql, [values], (insertErr, result) => {
                    if (insertErr) return res.status(500).json({ error: insertErr.message });
                    res.json({ success: true, message: "Attendance saved successfully!" });
                });
            };

            if (classData.length > 0) {
                insertAttendance(classData[0].id);
            } else {
                const createClassSql = `
                    INSERT INTO daily_classes (subject_id, teacher_id, class_date, start_time, end_time, room_number, status) 
                    VALUES (?, ?, ?, '09:00', '10:00', 'TBA', 'Completed')
                `;
                db.query(createClassSql, [subject_id, actualTeacherId, date], (err, newClass) => {
                    if (err) return res.status(500).json({ error: err.message });
                    insertAttendance(newClass.insertId); 
                });
            }
        });
    });
});

app.get('/api/subjects/:id/students', verifyRole(['teacher', 'admin']), (req, res) => {
    const sql = `
        SELECT 
            st.student_id, 
            st.enrollment_number AS roll, 
            st.full_name AS name
        FROM students st
        JOIN subjects sub ON st.course_id = sub.course_id AND st.semester = sub.semester
        WHERE sub.id = ?
    `;
    
    db.query(sql, [req.params.id], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        const studentsWithStatus = data.map(st => ({ ...st, status: 'Absent' }));
        res.json(studentsWithStatus);
    });
});

app.get('/api/teacher/:id/attendance-history', verifyRole(['teacher']), (req, res) => {
    const sql = `
        SELECT 
            dc.id, 
            DATE_FORMAT(dc.class_date, '%Y-%m-%d') as date, 
            c.course_name as class, 
            CONCAT('Sem ', s.semester) as semester, 
            s.subject_name as subject,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent
        FROM daily_classes dc
        JOIN subjects s ON dc.subject_id = s.id
        JOIN courses c ON s.course_id = c.id
        LEFT JOIN attendance a ON dc.id = a.daily_class_id
        WHERE dc.teacher_id = (SELECT teacher_id FROM teachers WHERE user_id = ?)
        GROUP BY dc.id
        ORDER BY dc.class_date DESC
    `;

    db.query(sql, [req.params.id], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/attendance/class/:classId', verifyRole(['teacher']), (req, res) => {
    const sql = `
        SELECT 
            st.enrollment_number as roll, 
            st.full_name as name, 
            a.status 
        FROM attendance a
        JOIN students st ON a.student_id = st.student_id
        WHERE a.daily_class_id = ?
    `;

    db.query(sql, [req.params.classId], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

// ==========================================
// MARKS MANAGEMENT ROUTES
// ==========================================

app.get('/api/marks/details', verifyRole(['teacher']), (req, res) => {
    const { subject_id, exam_type } = req.query;
    const sql = `
        SELECT m.student_id as id, st.enrollment_number as enrollment, st.full_name as name, m.score, m.max_score
        FROM marks m
        JOIN students st ON m.student_id = st.student_id
        WHERE m.subject_id = ? AND m.exam_type = ?
    `;
    db.query(sql, [subject_id, exam_type], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.post('/api/marks', verifyRole(['teacher']), (req, res) => {
    const { subject_id, exam_type, max_score, marks, uploaded_by_user_id } = req.body;

    const getTeacherSql = `SELECT teacher_id FROM teachers WHERE user_id = ?`;
    db.query(getTeacherSql, [uploaded_by_user_id], (err, teacherData) => {
        if (err) return res.status(500).json({ error: err.message });
        if (teacherData.length === 0) return res.status(404).json({ error: "Teacher lookup failed" });

        const teacherId = teacherData[0].teacher_id;
        
        const validMarks = marks.filter(m => m.score !== '');
        if (validMarks.length === 0) return res.json({ success: true, message: "Nothing to save" });

        const values = validMarks.map(m => [
            m.id, subject_id, exam_type, m.score, max_score, teacherId
        ]);

        const sql = `
            INSERT INTO marks (student_id, subject_id, exam_type, score, max_score, uploaded_by)
            VALUES ?
            ON DUPLICATE KEY UPDATE score = VALUES(score), max_score = VALUES(max_score), uploaded_by = VALUES(uploaded_by)
        `;

        db.query(sql, [values], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

app.get('/api/teacher/:id/marks-ledger', verifyRole(['teacher']), (req, res) => {
    const sql = `
        SELECT 
            m.subject_id as classId, 
            m.exam_type as type, 
            DATE_FORMAT(MAX(m.created_at), '%Y-%m-%d') as date,
            s.subject_name as subject,
            s.semester, 
            c.course_name as course,
            MAX(m.max_score) as max,
            ROUND(AVG(m.score), 1) as avg,
            'Published' as status
        FROM marks m
        JOIN subjects s ON m.subject_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE m.uploaded_by = (SELECT teacher_id FROM teachers WHERE user_id = ?)
        GROUP BY m.subject_id, m.exam_type, s.subject_name, s.semester, c.course_name
        ORDER BY MAX(m.created_at) DESC
    `;
    db.query(sql, [req.params.id], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/teacher/:id/dashboard', verifyRole(['teacher']), (req, res) => {
    const userId = req.params.id;

    const teacherSql = `SELECT teacher_id, full_name FROM teachers WHERE user_id = ?`;

    db.query(teacherSql, [userId], (err, teacherResult) => {
        if (err) return res.status(500).json({ error: err.message });
        if (teacherResult.length === 0) return res.status(404).json({ error: "Teacher not found" });

        const teacherId = teacherResult[0].teacher_id;
        const teacherName = teacherResult[0].full_name;

        const statsSql = `
            SELECT 
                (SELECT COUNT(*) FROM teacher_assignments WHERE teacher_id = ?) as totalSubjects,
                (SELECT COUNT(st.student_id) FROM students st 
                 JOIN subjects sub ON st.course_id = sub.course_id 
                 JOIN teacher_assignments ta ON sub.id = ta.subject_id 
                 WHERE ta.teacher_id = ?) as totalStudents
        `;

        const classesSql = `
            SELECT 
                dc.id as class_id,
                dc.subject_id,
                s.subject_code,
                s.subject_name,
                s.semester,
                c.course_name,
                TIME_FORMAT(dc.start_time, '%h:%i %p') as start_time,
                TIME_FORMAT(dc.end_time, '%h:%i %p') as end_time,
                dc.room_number
            FROM daily_classes dc
            JOIN subjects s ON dc.subject_id = s.id
            JOIN courses c ON s.course_id = c.id
            WHERE dc.teacher_id = ? AND dc.class_date = CURDATE()
            ORDER BY dc.start_time ASC
        `;

        const noticesSql = `
            SELECT id, title, DATE_FORMAT(created_at, '%b %d') as date, priority 
            FROM notices 
            WHERE target_role IN ('all', 'teacher') 
            ORDER BY created_at DESC LIMIT 3
        `;

        db.query(statsSql, [teacherId, teacherId], (err, statsResult) => {
            if (err) return res.status(500).json({ error: err.message });
            db.query(classesSql, [teacherId], (err, classesResult) => {
                if (err) return res.status(500).json({ error: err.message });
                db.query(noticesSql, (err, noticesResult) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({
                        teacherName: teacherName,
                        stats: {
                            totalSubjects: statsResult[0]?.totalSubjects || 0,
                            totalStudents: statsResult[0]?.totalStudents || 0,
                            classesConducted: classesResult.length 
                        },
                        scheduledClasses: classesResult, 
                        notices: noticesResult
                    });
                });
            });
        });
    });
});

app.post('/api/teacher/schedule-class', verifyRole(['teacher']), (req, res) => {
    const { userId, subjectId, date, startTime, endTime, room } = req.body;

    const findTeacherSql = `SELECT teacher_id FROM teachers WHERE user_id = ?`;

    db.query(findTeacherSql, [userId], (err, teacherResult) => {
        if (err) return res.status(500).json({ error: err.message });
        if (teacherResult.length === 0) return res.status(404).json({ error: "Teacher account not found for this user." });

        const exactTeacherId = teacherResult[0].teacher_id;

        const insertSql = `
            INSERT INTO daily_classes (teacher_id, subject_id, class_date, start_time, end_time, room_number) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(insertSql, [exactTeacherId, subjectId, date, startTime, endTime, room], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Class successfully scheduled!" });
        });
    });
});

// ==========================================
// STUDENT / PARENT DATA ROUTES
// ==========================================

app.get('/api/student/:id/notices', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const userId = req.params.id;

    const sql = `
        SELECT DISTINCT 
            n.id, 
            n.title, 
            n.content, 
            n.priority, 
            n.attachment_url,
            DATE_FORMAT(n.created_at, '%b %d, %Y') as date,
            COALESCE(t.full_name, s.full_name, u.username) as author_name,
            u.role as author_role
        FROM notices n
        JOIN users u ON n.posted_by = u.id
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN students s ON u.id = s.user_id
        WHERE n.target_role IN ('all', 'student')
        OR u.role = 'admin'
        OR n.posted_by IN (
            SELECT t2.user_id FROM teachers t2
            JOIN teacher_assignments ta ON t2.teacher_id = ta.teacher_id
            JOIN subjects sub ON ta.subject_id = sub.id
            JOIN students st ON sub.course_id = st.course_id AND sub.semester = st.semester
            WHERE st.user_id = ?
        )
        ORDER BY n.created_at DESC
    `;

    db.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data || []);
    });
});

app.get('/api/parent/:id/wards-overview', verifyRole(['parent']), (req, res) => {
    const userId = req.params.id;
    const requestedStudentId = req.query.student_id; 

    const childSql = `
        SELECT s.student_id, s.user_id, s.full_name, s.enrollment_number, s.semester, c.course_name
        FROM students s
        JOIN courses c ON s.course_id = c.id
        JOIN parent_student_map psm ON s.student_id = psm.student_id
        JOIN parents p ON psm.parent_id = p.parent_id
        WHERE p.user_id = ?
    `;

    db.query(childSql, [userId], (err, children) => {
        if (err) return res.status(500).json({ error: err.message });
        if (children.length === 0) return res.json({ message: "No children linked to this parent record." });

        let targetStudent = children[0];
        if (requestedStudentId) {
            const found = children.find(c => c.student_id == requestedStudentId);
            if (found) targetStudent = found;
        }

        const metricsSql = `
            SELECT 
                (SELECT ROUND((SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) 
                 FROM attendance WHERE student_id = ?) as attendanceRate,
                (SELECT SUM(total_fee - paid_amount) FROM fees WHERE student_id = ?) as totalDues,
                (SELECT ROUND(AVG(score), 1) FROM marks WHERE student_id = ?) as classAverage
        `;

        db.query(metricsSql, [targetStudent.student_id, targetStudent.student_id, targetStudent.student_id], (err, metrics) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
                allWards: children, 
                childProfile: targetStudent,
                summaryMetrics: metrics[0] || { attendanceRate: 0, totalDues: 0, classAverage: 0 }
            });
        });
    });
});

app.get('/api/student/:id/results', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const userId = req.params.id;

    const sql = `
        SELECT 
            sub.id,
            sub.subject_name as subject,
            sub.semester,
            sub.credits,
            SUM(CASE WHEN m.exam_type != 'End Sem' THEN m.score ELSE 0 END) as midTerm,
            SUM(CASE WHEN m.exam_type != 'End Sem' THEN m.max_score ELSE 0 END) as midTermMax,
            SUM(CASE WHEN m.exam_type = 'End Sem' THEN m.score ELSE 0 END) as final,
            SUM(CASE WHEN m.exam_type = 'End Sem' THEN m.max_score ELSE 0 END) as finalMax,
            SUM(m.score) as total,
            SUM(m.max_score) as totalMax
        FROM subjects sub
        JOIN marks m ON sub.id = m.subject_id
        JOIN students s ON m.student_id = s.student_id
        WHERE s.user_id = ?
        GROUP BY sub.id, sub.subject_name, sub.semester, sub.credits
        ORDER BY sub.semester ASC;
    `;

    db.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });

        const formattedResults = {};

        data.forEach(row => {
            const total = parseFloat(row.total) || 0;
            const totalMax = parseFloat(row.totalMax) > 0 ? parseFloat(row.totalMax) : 100; 

            const percentage = (total / totalMax) * 100;
            let grade = 'F';
            if (percentage >= 90) grade = 'A+';
            else if (percentage >= 80) grade = 'A';
            else if (percentage >= 70) grade = 'B';
            else if (percentage >= 60) grade = 'C';
            else if (percentage >= 40) grade = 'D';

            if (!formattedResults[row.semester]) formattedResults[row.semester] = [];

            formattedResults[row.semester].push({
                id: row.id,
                subject: row.subject,
                midTerm: parseFloat(row.midTerm) || 0,
                midTermMax: parseFloat(row.midTermMax) || 0,
                final: parseFloat(row.final) || 0,
                finalMax: parseFloat(row.finalMax) || 0,
                total: total,
                totalMax: parseFloat(row.totalMax) || 0,
                grade: grade,
                credits: row.credits
            });
        });

        res.json(formattedResults);
    });
});

app.get('/api/student/:id/subjects-list', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const userId = req.params.id;
    const semester = req.query.semester;
    const sql = `
        SELECT DISTINCT s.subject_name 
        FROM subjects s
        JOIN students st ON s.course_id = st.course_id
        WHERE st.user_id = ? AND s.semester = ?`;
    db.query(sql, [userId, semester], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/student/:id/attendance-logs', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const userId = req.params.id;
    const semester = req.query.semester;
    const sql = `
        SELECT 
            dc.class_date, 
            s.subject_name, 
            a.status        
        FROM attendance a
        JOIN daily_classes dc ON a.daily_class_id = dc.id
        JOIN subjects s ON dc.subject_id = s.id
        JOIN students st ON a.student_id = st.student_id
        WHERE st.user_id = ? AND s.semester = ?
        ORDER BY dc.class_date DESC`;
    db.query(sql, [userId, semester], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/student/:id/subjects', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const userId = req.params.id;
    const semester = req.query.semester;

    const sql = `
        SELECT 
            s.id, 
            s.subject_code as code, 
            s.subject_name as name, 
            s.credits, 
            COALESCE(t.full_name, 'Not Assigned') as teacher_name
        FROM subjects s
        JOIN students st ON s.course_id = st.course_id
        LEFT JOIN teacher_assignments ta ON s.id = ta.subject_id
        LEFT JOIN teachers t ON ta.teacher_id = t.teacher_id
        WHERE st.user_id = ? AND s.semester = ?
    `;

    db.query(sql, [userId, semester], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const totalCredits = data.reduce((sum, sub) => sum + (sub.credits || 0), 0);
        
        res.json({
            available_semesters: [1, 2, 3, 4, 5, 6, 7, 8],
            total_credits: totalCredits,
            subjects: data
        });
    });
});

app.get('/api/student/:id/profile', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const userId = req.params.id;
    
    const sql = `
        SELECT 
            s.*, 
            DATE_FORMAT(s.date_of_birth, '%d %b %Y') as formatted_dob,
            c.course_name 
        FROM students s
        JOIN courses c ON s.course_id = c.id
        WHERE s.user_id = ?
    `;
    
    db.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        if (data.length === 0) return res.status(404).json({ message: "Student not found" });

        const dbStudent = data[0];

        const formattedData = {
            personal: {
                name: dbStudent.full_name,
                dob: dbStudent.formatted_dob || "Not Available",
                blood_group: dbStudent.blood_group || "N/A",
                gender: dbStudent.gender,
                contact: dbStudent.phone_number,
                email: dbStudent.email,
                address: dbStudent.address,
                city: dbStudent.city,
                state: dbStudent.state,
                pin_code: dbStudent.pin_code,
                profile_picture: dbStudent.profile_picture_url 
            },
            academic: {
                enrollment_no: dbStudent.enrollment_number,
                course: dbStudent.course_name,
                semester: `Semester ${dbStudent.semester}`,
                batch: "2024-2027", 
                current_cgpa: "N/A", 
                attendance_overall: "N/A" 
            },
            guardians: {
                father_name: dbStudent.guardian_name,
                mother_name: "Not available in DB", 
                guardian_relation: dbStudent.guardian_relation,
                emergency_contact: dbStudent.guardian_phone
            }
        };

        res.json(formattedData);
    });
});

// ==========================================
// FEE & PAYMENT MANAGEMENT ROUTES
// ==========================================

app.get('/api/admin/fees', verifyRole(['admin']), (req, res) => {
    const sql = `
        SELECT f.*, s.full_name as name, s.enrollment_number as enrollment, c.course_name as course
        FROM fees f
        JOIN students s ON f.student_id = s.student_id
        JOIN courses c ON s.course_id = c.id
        ORDER BY f.due_date ASC
    `;
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/student/:id/fees', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const userId = req.params.id;
    const sql = `
        SELECT f.* FROM fees f
        JOIN students s ON f.student_id = s.student_id
        WHERE s.user_id = ?
        ORDER BY f.due_date ASC
    `;
    db.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data || []);
    });
});

app.get('/api/student/:id/payments', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const userId = req.params.id;
    const sql = `
        SELECT p.*, f.fee_type
        FROM payments p
        JOIN fees f ON p.fee_id = f.id
        JOIN students s ON f.student_id = s.student_id
        WHERE s.user_id = ?
        ORDER BY p.payment_date DESC
    `;
    db.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data || []);
    });
});

app.post('/api/payments', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const { fee_id, amount_paid, payment_method, transaction_reference, processed_by } = req.body;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        const insertPaymentSql = `
            INSERT INTO payments (fee_id, amount_paid, payment_method, transaction_reference, processed_by, payment_date)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;

        db.query(insertPaymentSql, [fee_id, amount_paid, payment_method, transaction_reference, processed_by || null], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

            db.query(`SELECT total_fee, paid_amount FROM fees WHERE id = ?`, [fee_id], (err, feeRows) => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                if (feeRows.length === 0) return db.rollback(() => res.status(404).json({ error: "Fee lookup failed." }));

                const newPaid = parseFloat(feeRows[0].paid_amount) + parseFloat(amount_paid);
                const newStatus = newPaid >= parseFloat(feeRows[0].total_fee) ? 'Paid' : 'Partial';

                db.query(`UPDATE fees SET paid_amount = ?, status = ? WHERE id = ?`, [newPaid, newStatus, fee_id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                    db.commit((err) => {
                        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                        res.json({ success: true, message: "Payment processed successfully!" });
                    });
                });
            });
        });
    });
});

app.get('/api/admin/payments', verifyRole(['admin']), (req, res) => {
    const sql = `
        SELECT p.*, s.full_name as student_name, s.enrollment_number as enrollment
        FROM payments p
        JOIN fees f ON p.fee_id = f.id
        JOIN students s ON f.student_id = s.student_id
        ORDER BY p.payment_date DESC
    `;
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.post('/api/fees', verifyRole(['admin']), (req, res) => {
    const { student_id, semester, fee_type, total_fee, due_date } = req.body;
    const sql = `
        INSERT INTO fees (student_id, semester, fee_type, total_fee, paid_amount, due_date, status)
        VALUES (?, ?, ?, ?, 0, ?, 'Pending')
    `;
    db.query(sql, [student_id, semester, fee_type, total_fee, due_date], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "This fee type already exists for this student & semester." });
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: result.insertId });
    });
});

app.post('/api/fees/bulk-assign', verifyRole(['admin']), (req, res) => {
    const { course_id, semester, fee_type, total_fee, due_date } = req.body;

    const studentsSql = `SELECT student_id FROM students WHERE course_id = ? AND semester = ? AND status = 'Active'`;
    db.query(studentsSql, [course_id, semester], (err, students) => {
        if (err) return res.status(500).json({ error: err.message });
        if (students.length === 0) return res.status(404).json({ error: "No active students found for that course & semester." });

        const values = students.map(s => [s.student_id, semester, fee_type, total_fee, 0, due_date, 'Pending']);

        const insertSql = `
            INSERT INTO fees (student_id, semester, fee_type, total_fee, paid_amount, due_date, status)
            VALUES ?
            ON DUPLICATE KEY UPDATE total_fee = VALUES(total_fee), due_date = VALUES(due_date)
        `;
        db.query(insertSql, [values], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, assigned: students.length });
        });
    });
});

app.put('/api/fees/:id', verifyRole(['admin']), (req, res) => {
    const { total_fee, due_date, fee_type } = req.body;
    const sql = `UPDATE fees SET total_fee = ?, due_date = ?, fee_type = ? WHERE id = ?`;
    db.query(sql, [total_fee, due_date, fee_type, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/fees/:id', verifyRole(['admin']), (req, res) => {
    db.query(`DELETE FROM fees WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.put('/api/student/:id/profile', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const userId = req.params.id;
    
    const { 
        contact, blood_group, address, city, state, pin_code, 
        father_name, emergency_contact, guardian_relation, profile_picture
    } = req.body;

    const sql = `
        UPDATE students SET 
            phone_number = ?, 
            blood_group = ?, 
            address = ?, 
            city = ?, 
            state = ?, 
            pin_code = COALESCE(?, pin_code), 
            guardian_name = ?, 
            guardian_phone = ?, 
            guardian_relation = ?,
            profile_picture_url = COALESCE(?, profile_picture_url)
        WHERE user_id = ?
    `;

    const params = [
        contact, blood_group, address, city, state, pin_code, 
        father_name, emergency_contact, guardian_relation, profile_picture, userId
    ];

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Profile updated successfully!" });
    });
});

app.get('/api/student/:id/custom-dashboard', verifyRole(['student', 'parent', 'admin']), (req, res) => {
    const userId = req.params.id;

    const profileSql = `
        SELECT s.full_name, c.course_name, s.semester, s.email, s.enrollment_number as student_id
        FROM students s
        JOIN courses c ON s.course_id = c.id
        WHERE s.user_id = ?
    `;

    const classesSql = `
        SELECT dc.id, sub.subject_name as subject, 
               CONCAT(TIME_FORMAT(dc.start_time, '%h:%i %p'), ' - ', TIME_FORMAT(dc.end_time, '%h:%i %p')) as time,
               t.full_name as faculty, dc.room_number as room, dc.status
        FROM daily_classes dc
        JOIN subjects sub ON dc.subject_id = sub.id
        JOIN teachers t ON dc.teacher_id = t.teacher_id
        JOIN students st ON sub.course_id = st.course_id AND sub.semester = sub.semester
        WHERE st.user_id = ? AND dc.class_date = CURDATE()
        ORDER BY dc.start_time ASC
    `;

    const noticesSql = `
        SELECT id, title, 
               CASE 
                   WHEN DATE(created_at) = CURDATE() THEN 'Today'
                   WHEN DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 'Yesterday'
                   ELSE DATE_FORMAT(created_at, '%b %d') 
               END as date,
               priority as type
        FROM notices
        WHERE target_role IN ('all', 'student')
        ORDER BY created_at DESC
        LIMIT 3
    `;

    const performanceSql = `
        SELECT CONCAT('Sem ', sub.semester) as semester, 
               ROUND((SUM(m.score) / SUM(m.max_score)) * 10, 1) as cgpa
        FROM marks m
        JOIN subjects sub ON m.subject_id = sub.id
        JOIN students st ON m.student_id = st.student_id
        WHERE st.user_id = ?
        GROUP BY sub.semester
        ORDER BY sub.semester ASC
    `;

    db.query(profileSql, [userId], (err, profileData) => {
        if (err) return res.status(500).json({ error: err.message });
        if (profileData.length === 0) return res.status(404).json({ error: "Student not found" });

        db.query(classesSql, [userId], (err, classesData) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(noticesSql, (err, noticesData) => {
                if (err) return res.status(500).json({ error: err.message });

                db.query(performanceSql, [userId], (err, perfData) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const mappedNotices = noticesData.map(n => ({
                        id: n.id,
                        title: n.title,
                        date: n.date,
                        type: n.type === 'High' ? 'Alert' : (n.type === 'Low' ? 'General' : 'Academic'),
                        bg: n.type === 'High' ? 'bg-amber-50' : (n.type === 'Low' ? 'bg-indigo-50' : 'bg-blue-50'),
                        iconBg: n.type === 'High' ? 'bg-amber-100' : (n.type === 'Low' ? 'bg-indigo-100' : 'bg-blue-100'),
                        text: n.type === 'High' ? 'text-amber-700' : (n.type === 'Low' ? 'text-indigo-700' : 'text-blue-700'),
                        border: n.type === 'High' ? 'border-amber-100' : (n.type === 'Low' ? 'border-indigo-100' : 'border-blue-100')
                    }));

                    res.json({
                        profile: profileData[0],
                        upcoming_classes: classesData,
                        notices: mappedNotices,
                        performanceData: perfData.length > 0 ? perfData : [
                            { semester: 'Sem 1', cgpa: 0 } 
                        ]
                    });
                });
            });
        });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});