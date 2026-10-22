require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { createAudit } = require('./audit');
const { singleAttachment } = require('./lib/upload');
const { createRateLimiter } = require('./lib/rateLimit');
const { securityHeaders, originGuard, allowedOrigins } = require('./lib/security');
const { publicError } = require('./lib/http');
const { hashPassword, passwordProblem, DUMMY_HASH } = require('./lib/password');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(securityHeaders);

const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyFn: (req) => `${req.ip}|${String((req.body && req.body.username) || '').toLowerCase()}`,
    message: 'Too many login attempts. Please try again in 15 minutes.'
});

const loginIpLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyFn: (req) => req.ip,
    message: 'Too many login attempts. Please try again in 15 minutes.'
});

const passwordChangeLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyFn: (req) => `pw|${req.ip}|${req.params.id}`,
    message: 'Too many password attempts. Please try again in 15 minutes.'
});

app.use(cors({
    origin: allowedOrigins(),
    credentials: true
}));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(originGuard());

const JWT_SECRET = process.env.JWT_SECRET;

if (JWT_SECRET && JWT_SECRET.length < 32) {
    console.warn("⚠️  JWT_SECRET is shorter than 32 characters. Use a long random value.");
}

if (!JWT_SECRET) {
    console.error(
        "❌ JWT_SECRET is not set. Refusing to start with an insecure default secret."
    );
    process.exit(1);
}

const path = require('path');
const fs = require('fs');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const { db, queryAsync, transaction } = require('./lib/db');
const notifier = require('./lib/notify')(queryAsync);

db.getConnection((err, connection) => {
    if (err) {
        console.error(
            "❌ Database connection failed:",
            err.message
        );

        process.exit(1);
    }

    console.log(
        "✅ Successfully connected to MySQL"
    );

    connection.release();
});

const audit = createAudit(db);

const { verifyRole, requireSelfTeacher } = require('./lib/auth');

const verifyStudentOwnership = async (req, res, next) => {
    const requestedId = Number(req.params.id);

    if (!Number.isInteger(requestedId) || requestedId <= 0) {
        return res.status(400).json({
            success: false,
            error: "Invalid student identifier."
        });
    }

    if (req.user.role === 'admin') {
        return next();
    }

    if (req.user.role === 'student') {
        if (Number(req.user.id) === requestedId) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: "You are not authorized to access this student's records."
        });
    }

    if (req.user.role === 'parent') {
        const sql = `
            SELECT s.user_id
            FROM parent_student_map psm
            INNER JOIN parents p ON p.parent_id = psm.parent_id
            INNER JOIN students s ON s.student_id = psm.student_id
            WHERE p.user_id = ?
              AND s.user_id = ?
            LIMIT 1
        `;

        try {
            const rows = await queryAsync(sql, [
                req.user.id,
                requestedId
            ]);

            if (rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: "This student is not linked to your parent account."
                });
            }

            return next();
        } catch (error) {
            console.error(
                "Student ownership SQL error:",
                error.sqlMessage || error.message
            );

            return res.status(500).json({
                success: false,
                error: "Authorization check failed.",
            });
        }
    }

    return res.status(403).json({
        success: false,
        error: "You are not authorized to access this student's records."
    });
};

const teacherOwnsSubject = (teacherUserId, subjectId, callback) => {
    const sql = `
        SELECT 1
        FROM teacher_assignments ta
        JOIN teachers t ON ta.teacher_id = t.teacher_id
        WHERE t.user_id = ? AND ta.subject_id = ?
        LIMIT 1
    `;
    db.query(sql, [teacherUserId, subjectId], (err, rows) => {
        if (err) return callback(err, false);
        callback(null, rows.length > 0);
    });
};

const withTransaction = (res, workFn) => {
    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error(connErr);
            return res.status(500).json({ error: "Failed to acquire a database connection." });
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                return res.status(500).json({ error: "Transaction failed to start" });
            }

            const db = {
                query: (...args) => connection.query(...args),
                commit: (cb) => connection.commit((commitErr) => {
                    connection.release();
                    cb(commitErr);
                }),
                rollback: (cb) => connection.rollback(() => {
                    connection.release();
                    cb();
                })
            };

            workFn(db);
        });
    });
};

app.post("/api/login", loginIpLimiter, loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });
        }

        const sql = `
            SELECT
                u.id,
                u.username,
                u.password,
                u.role,
                u.is_active,
                u.must_change_password,
                COALESCE(
                    t.full_name,
                    s.full_name,
                    p.full_name,
                    u.username
                ) AS full_name
            FROM users u
            LEFT JOIN teachers t ON u.id = t.user_id
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN parents p ON u.id = p.user_id
            WHERE u.username = ?
            LIMIT 1
        `;

        db.query(sql, [username], async (err, results) => {
            if (err) {
                console.error("Login Error:", err);

                return res.status(500).json({
                    success: false,
                    message: "Database error."
                });
            }

            if (!results.length) {
                await bcrypt.compare(String(password), DUMMY_HASH);
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password."
                });
            }

            const user = results[0];

            const passwordMatched = await bcrypt.compare(
                String(password),
                user.password
            );

            if (!passwordMatched) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password."
                });
            }

            if (user.is_active === 0) {
                return res.status(403).json({
                    success: false,
                    message: "This account has been deactivated. Contact the administrator."
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    role: user.role
                },
                JWT_SECRET,
                {
                    algorithm: "HS256",
                    expiresIn: "8h"
                }
            );

            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite:
                    process.env.NODE_ENV === "production"
                        ? "none"
                        : "lax",
                maxAge: 8 * 60 * 60 * 1000
            });

            delete user.password;
            delete user.is_active;
            user.must_change_password = Number(user.must_change_password) === 1;

            db.query(
                "UPDATE users SET last_login = NOW() WHERE id = ?",
                [user.id],
                (updateErr) => {
                    if (updateErr) {
                        console.error("Failed to update last_login:", updateErr.message);
                    }
                }
            );

            const response = {
                success: true,
                user
            };

            const clientType = String(req.headers["x-client"] || "").toLowerCase();

            if (clientType === "mobile") {
                response.token = token;
            }

            return res.json(response);
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
});

app.post("/api/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite:
            process.env.NODE_ENV === "production"
                ? "none"
                : "lax"
    });

    res.json({
        success: true,
        message: "Logged out successfully"
    });
});

app.put(
    "/api/users/:id/change-password",
    verifyRole(["admin", "teacher", "student", "parent"]),
    passwordChangeLimiter,
    async (req, res) => {
        try {
            const userId = Number(req.params.id);

            if (req.user.id !== userId && req.user.role !== "admin") {
                return res.status(403).json({
                    success: false,
                    error: "You are not authorized to change this password."
                });
            }

            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: "Current password and new password are required."
                });
            }

            const weak = passwordProblem(newPassword);
            if (weak) {
                return res.status(400).json({ success: false, error: weak });
            }

            db.query(
                "SELECT password FROM users WHERE id = ?",
                [userId],
                async (err, results) => {
                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            success: false,
                            error: "Database error."
                        });
                    }

                    if (results.length === 0) {
                        return res.status(404).json({
                            success: false,
                            error: "User not found."
                        });
                    }

                    const passwordMatched = await bcrypt.compare(
                        String(currentPassword),
                        results[0].password
                    );

                    if (!passwordMatched) {
                        return res.status(401).json({
                            success: false,
                            error: "Current password is incorrect."
                        });
                    }

                    const samePassword = await bcrypt.compare(
                        String(newPassword),
                        results[0].password
                    );

                    if (samePassword) {
                        return res.status(400).json({
                            success: false,
                            error: "New password must be different from the current password."
                        });
                    }

                    const hashedPassword = await hashPassword(newPassword);

                    db.query(
                        "UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?",
                        [hashedPassword, userId],
                        (updateErr) => {
                            if (updateErr) {
                                console.error(updateErr);

                                return res.status(500).json({
                                    success: false,
                                    error: "Failed to update password."
                                });
                            }

                            audit(req, { action: 'PASSWORD_CHANGE', entity: 'users', entityId: userId });
                            notifier.run(() => notifier.send([userId], {
                                type: 'security', section: 'settings', title: 'Password changed',
                                body: 'Your password was changed. If this was not you, contact the university office.'
                            }));
                            return res.json({
                                success: true,
                                message: "Password updated successfully."
                            });
                        }
                    );
                }
            );
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                error: "Internal server error."
            });
        }
    }
);
app.put(
    "/api/users/:id/change-username",
    verifyRole(["admin", "teacher", "student", "parent"]),
    (req, res) => {
        const userId = Number(req.params.id);

        if (req.user.id !== userId && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                error: "You are not authorized to change this username."
            });
        }

        const { newUsername } = req.body;

        if (!newUsername || typeof newUsername !== "string") {
            return res.status(400).json({
                success: false,
                error: "Username is required."
            });
        }

        const username = newUsername.trim();

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                error: "Username must be at least 3 characters long."
            });
        }

        if (username.length > 50) {
            return res.status(400).json({
                success: false,
                error: "Username is too long."
            });
        }

        const checkSql = "SELECT id FROM users WHERE username = ? AND id != ?";

        db.query(checkSql, [username, userId], (checkErr, users) => {
            if (checkErr) {
                console.error(checkErr);

                return res.status(500).json({
                    success: false,
                    error: "Database error."
                });
            }

            if (users.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: "Username already exists."
                });
            }

            const updateSql =
                "UPDATE users SET username = ? WHERE id = ?";

            db.query(updateSql, [username, userId], (updateErr) => {
                if (updateErr) {
                    console.error(updateErr);

                    return res.status(500).json({
                        success: false,
                        error: "Failed to update username."
                    });
                }

                return res.json({
                    success: true,
                    message: "Username updated successfully."
                });
            });
        });
    }
);


const deleteFile = (filePath) => {

    if (!filePath) return;

    const fullPath = path.join(
        __dirname,
        filePath
    );

    fs.access(fullPath, fs.constants.F_OK, (err) => {

        if (err) return;

        fs.unlink(fullPath, (unlinkErr) => {

            if (unlinkErr) {

                console.error(
                    "Delete Error:",
                    unlinkErr.message
                );

            }

        });

    });

};


app.get('/api/students', verifyRole(['admin', 'teacher']), (req, res) => {
    const columns = req.user.role === 'admin'
        ? 'students.*'
        : 'students.student_id, students.user_id, students.course_id, students.enrollment_number, students.roll_number, students.full_name, students.semester, students.status';
    const sql = `
        SELECT ${columns}, courses.course_name
FROM students
LEFT JOIN courses ON students.course_id = courses.id
ORDER BY students.student_id DESC
    `;
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: "Database error." });
        return res.json(data);
    });
});

app.post('/api/students', verifyRole(['admin']), async (req, res) => { 
    const { name, email, enrollment_number, roll_number, password, semester, course_id } = req.body;
    if (!name || !enrollment_number || !password || !course_id) {
        return res.status(400).json({
            error: "Please fill all required fields."
        });
    }
    const weakPassword = passwordProblem(password);
    if (weakPassword) return res.status(400).json({ error: weakPassword });
    const hashedPassword = await hashPassword(password);

    withTransaction(res, (db) => {
        const userSql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'student')";
        db.query(userSql, [enrollment_number, hashedPassword], (err, userResult) => {
            if (err) {
                console.error(err);

                return db.rollback(() =>
                   res.status(500).json({
                   error: "Enrollment No. already exists. "
                })
             );
            }

            const userId = userResult.insertId;
            const studentSql = `
                INSERT INTO students (user_id, course_id, enrollment_number, roll_number, full_name, email, semester, admission_date, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Active')
            `;
            
            db.query(studentSql, [userId, course_id, enrollment_number, roll_number || null, name, email || null, semester || 1], (err, result) => {
               if (err) {
    console.error(err);

    return db.rollback(() =>
        res.status(500).json({
            error: publicError(err)
        })
    );
}

                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: "Commit failed" }));
                    res.json({ success: true });
                });
            });
        });
    });
});

app.put('/api/students/:id', verifyRole(['admin']), (req, res) => {
    const { name, email, enrollment_number, roll_number, semester, course_id, password } = req.body;

    if (password && String(password).trim() !== '') {
        const weakPassword = passwordProblem(password);
        if (weakPassword) return res.status(400).json({ error: weakPassword });
    }

    if (!name || !enrollment_number || !course_id) {
        return res.status(400).json({
            error: "Please fill all required fields."
        });
    }

    withTransaction(res, (db) => {
        db.query(
            "SELECT user_id FROM students WHERE student_id = ?",
            [req.params.id],
            async (err, result) => {
                if (err) {
                    return db.rollback(() =>
                        res.status(500).json({ error: publicError(err) })
                    );
                }

                if (result.length === 0) {
                    return db.rollback(() =>
                        res.status(404).json({
                            error: "Student not found."
                        })
                    );
                }

                const userId = result[0].user_id;

                const studentSql = `
                    UPDATE students
                    SET
                        full_name = ?,
                        email = ?,
                        enrollment_number = ?,
                        roll_number = ?,
                        semester = ?,
                        course_id = ?
                    WHERE student_id = ?
                `;

                db.query(
                    studentSql,
                    [name, email, enrollment_number, roll_number || null, semester, course_id, req.params.id],
                    async (err) => {
                        if (err) {
                            return db.rollback(() =>
                                res.status(500).json({ error: publicError(err) })
                            );
                        }

                        let userSql = "UPDATE users SET username = ? WHERE id = ?";
                        let params = [enrollment_number, userId];

                        if (password && password.trim() !== "") {
                            const hashedPassword = await hashPassword(password);

                            userSql = `
                                UPDATE users
                                SET username = ?, password = ?
                                WHERE id = ?
                            `;

                            params = [enrollment_number, hashedPassword, userId];
                        }

                        db.query(userSql, params, (err) => {
                            if (err) {
                                return db.rollback(() =>
                                    res.status(500).json({ error: publicError(err) })
                                );
                            }

                            db.commit((err) => {
                                if (err) {
                                    return db.rollback(() =>
                                        res.status(500).json({ error: publicError(err) })
                                    );
                                }

                                res.json({
                                    success: true,
                                    message: "Student updated successfully!"
                                });
                            });
                        });
                    }
                );
            }
        );
    });
});

app.delete('/api/students/:id', verifyRole(['admin']), (req, res) => {
    const userIdToDelete = req.params.id;
    
    db.query('DELETE FROM students WHERE user_id = ?', [userIdToDelete], (err, studentResult) => {
        if (err) return res.status(500).json({ error: "Failed to delete student profile" });
        
        db.query('DELETE FROM users WHERE id = ?', [userIdToDelete], (err2, userResult) => {
            if (err2) return res.status(500).json({ error: "Failed to delete user login" });
            audit(req, { action: 'STUDENT_DELETE', entity: 'users', entityId: userIdToDelete });
            return res.json({ success: true, message: "Student completely removed!" });
        });
    });
});


app.get('/api/teachers', verifyRole(['admin']), (req, res) => {
    const sql = "SELECT * FROM teachers";
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        return res.json(data);
    });
});

app.post('/api/teachers', verifyRole(['admin']), async (req, res) => { 
    const { full_name, email, employee_id, department, qualification, designation, password } = req.body;
if (
    !full_name ||
    !email ||
    !employee_id ||
    !department ||
    !designation ||
    !password
) {
    return res.status(400).json({
        error: "Please fill all required fields."
    });
}
    const weakPassword = passwordProblem(password);
    if (weakPassword) return res.status(400).json({ error: weakPassword });
    const hashedPassword = await hashPassword(password);

    withTransaction(res, (db) => {
        const userSql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'teacher')";
        db.query(userSql, [employee_id, hashedPassword], (err, userResult) => {
            if (err) return db.rollback(() => res.status(400).json({ error: "Employee ID (Username) already exists." }));

            const userId = userResult.insertId;
            const teacherSql = `
                INSERT INTO teachers (user_id, employee_id, full_name, email, department, qualification, designation, joining_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())
            `;
            
            db.query(teacherSql, [userId, employee_id, full_name, email, department, qualification, designation], (err, result) => {
if (err) {
    console.error(err);

    return db.rollback(() =>
        res.status(500).json({
            error: publicError(err)
        })
    );
}
                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: "Commit failed" }));
                    res.json({ success: true, message: "Faculty registered successfully" });
                });
            });
        });
    });
});

app.put('/api/teachers/:id', verifyRole(['admin']), async (req, res) => {
    if (req.body.password && String(req.body.password).trim() !== '') {
        const weakPassword = passwordProblem(req.body.password);
        if (weakPassword) return res.status(400).json({ error: weakPassword });
    }
    const {
        full_name,
        email,
        employee_id,
        department,
        qualification,
        designation,
        password
    } = req.body;

    if (
        !full_name ||
        !email ||
        !employee_id ||
        !department ||
        !qualification ||
        !designation
    ) {
        return res.status(400).json({
            error: "Please fill all required fields."
        });
    }

    try {
        withTransaction(res, (db) => {
            db.query(
                "SELECT user_id FROM teachers WHERE teacher_id = ?",
                [req.params.id],
                async (err, result) => {
                    if (err) {
                        return db.rollback(() =>
                            res.status(500).json({ error: publicError(err) })
                        );
                    }

                    if (result.length === 0) {
                        return db.rollback(() =>
                            res.status(404).json({
                                error: "Teacher not found."
                            })
                        );
                    }

                    const userId = result[0].user_id;

                    const teacherSql = `
                        UPDATE teachers
                        SET
                            full_name = ?,
                            email = ?,
                            employee_id = ?,
                            department = ?,
                            qualification = ?,
                            designation = ?
                        WHERE teacher_id = ?
                    `;

                    db.query(
                        teacherSql,
                        [
                            full_name,
                            email,
                            employee_id,
                            department,
                            qualification,
                            designation,
                            req.params.id
                        ],
                        async (err) => {
                            if (err) {
                                return db.rollback(() =>
                                    res.status(500).json({ error: publicError(err) })
                                );
                            }

                            let userSql = "UPDATE users SET username = ? WHERE id = ?";
                            let params = [employee_id, userId];

                            if (password && password.trim() !== "") {
                                const hashedPassword = await hashPassword(password);

                                userSql = `
                                    UPDATE users
                                    SET username = ?, password = ?
                                    WHERE id = ?
                                `;

                                params = [employee_id, hashedPassword, userId];
                            }

                            db.query(userSql, params, (err) => {
                                if (err) {
                                    return db.rollback(() =>
                                        res.status(500).json({ error: publicError(err) })
                                    );
                                }

                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() =>
                                            res.status(500).json({ error: publicError(err) })
                                        );
                                    }

                                    res.json({
                                        success: true,
                                        message: "Teacher updated successfully!"
                                    });
                                });
                            });
                        }
                    );
                }
            );
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Unexpected server error."
        });
    }
});

app.delete('/api/teachers/:id', verifyRole(['admin']), (req, res) => {
    withTransaction(res, (db) => {
        const getUserSql = "SELECT user_id FROM teachers WHERE teacher_id = ?";

        db.query(getUserSql, [req.params.id], (err, result) => {
            if (err) {
                return db.rollback(() =>
                    res.status(500).json({ error: publicError(err) })
                );
            }

            if (result.length === 0) {
                return db.rollback(() =>
                    res.status(404).json({ error: "Teacher not found." })
                );
            }

            const userId = result[0].user_id;

            db.query(
                "DELETE FROM teachers WHERE teacher_id = ?",
                [req.params.id],
                (err) => {
                    if (err) {
                        return db.rollback(() =>
                            res.status(500).json({ error: publicError(err) })
                        );
                    }

                    db.query(
                        "DELETE FROM users WHERE id = ?",
                        [userId],
                        (err) => {
                            if (err) {
                                return db.rollback(() =>
                                    res.status(500).json({ error: publicError(err) })
                                );
                            }

                            db.commit((err) => {
                                if (err) {
                                    return db.rollback(() =>
                                        res.status(500).json({ error: publicError(err) })
                                    );
                                }

                                audit(req, { action: 'TEACHER_DELETE', entity: 'users', entityId: userId });
                                res.json({ success: true });
                            });
                        }
                    );
                }
            );
        });
    });
});


app.get('/api/courses', verifyRole(['admin', 'teacher', 'student', 'parent']), (req, res) => {
    const sql = "SELECT * FROM courses";
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        return res.json(data);
    });
});

app.post('/api/courses', verifyRole(['admin']), (req, res) => {
    const { course_code, course_name, department, duration_years, total_semesters } = req.body;
    if (
    !course_code ||
    !course_name ||
    !department ||
    !duration_years ||
    !total_semesters
) {
    return res.status(400).json({
        error: "Please fill all required fields."
    });
}
    const sql = "INSERT INTO courses (course_code, course_name, department, duration_years, total_semesters) VALUES (?, ?, ?, ?, ?)";
    
    db.query(sql, [course_code, course_name, department, duration_years, total_semesters], (err, result) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json({ success: true, message: "Course added successfully" });
    });
});

app.put('/api/courses/:id', verifyRole(['admin']), (req, res) => {
    const { course_code, course_name, department, duration_years, total_semesters } = req.body;
    const sql = "UPDATE courses SET course_code=?, course_name=?, department=?, duration_years=?, total_semesters=? WHERE id=?";
    
    db.query(sql, [course_code, course_name, department, duration_years, total_semesters, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json({ success: true });
    });
});

app.delete('/api/courses/:id', verifyRole(['admin']), (req, res) => {
    const sql = "DELETE FROM courses WHERE id = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json({ success: true });
    });
});


app.get('/api/subjects', verifyRole(['admin', 'teacher']), (req, res) => {
    const sql = `
        SELECT subjects.*, courses.course_name, teacher_assignments.teacher_id AS teacher_id, teachers.full_name as teacher_name 
        FROM subjects 
        LEFT JOIN courses ON subjects.course_id = courses.id
        LEFT JOIN teacher_assignments ON subjects.id = teacher_assignments.subject_id
        LEFT JOIN teachers ON teacher_assignments.teacher_id = teachers.teacher_id
    `;
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json(data);
    });
});

app.post('/api/subjects', verifyRole(['admin']), (req, res) => {
    const { course_id, semester, subject_code, subject_name, subject_type, credits } = req.body;
    if (
    !course_id ||
    !semester ||
    !subject_code ||
    !subject_name ||
    !subject_type ||
    !credits
) {
    return res.status(400).json({
        error: "Please fill all required fields."
    });
}
    const creditsNum = Number(credits);
    if (!Number.isInteger(creditsNum) || creditsNum < 1 || creditsNum > 10) {
        return res.status(400).json({ error: "Credits must be a whole number from 1 to 10." });
    }
    const sql = "INSERT INTO subjects (course_id, semester, subject_code, subject_name, subject_type, credits) VALUES (?, ?, ?, ?, ?, ?)";

    db.query(sql, [course_id, semester, subject_code, subject_name, subject_type, creditsNum], (err, result) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/subjects/:id', verifyRole(['admin']), (req, res) => {
    const subjectId = req.params.id;
    const { subject_code, subject_name, course_id, semester, subject_type, credits, teacher_id } = req.body;

    const creditsNum = Number(credits);
    if (!Number.isInteger(creditsNum) || creditsNum < 1 || creditsNum > 10) {
        return res.status(400).json({ error: "Credits must be a whole number from 1 to 10." });
    }

    withTransaction(res, (db) => {
        const subSql = "UPDATE subjects SET course_id=?, semester=?, subject_code=?, subject_name=?, subject_type=?, credits=? WHERE id=?";
        db.query(subSql, [course_id, semester, subject_code, subject_name, subject_type, creditsNum, subjectId], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: "Database error." }));

            const assignSql = "REPLACE INTO teacher_assignments (teacher_id, subject_id, academic_year) VALUES (?, ?, '2026-2027')";
            db.query(assignSql, [teacher_id, subjectId], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: "Database error." }));

                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: "Database error." }));
                    res.json({ success: true });
                });
            });
        });
    });
});

app.delete('/api/subjects/:id', verifyRole(['admin']), (req, res) => {
    const sql = "DELETE FROM subjects WHERE id = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json({ success: true });
    });
});

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
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json(data);
    });
});

app.post('/api/parents', verifyRole(['admin']), async (req, res) => { 
    const { full_name, phone, email, username, password, student_ids } = req.body; 
    if (
    !full_name ||
    !phone ||
    !email ||
    !username ||
    !password
) {
    return res.status(400).json({
        error: "Please fill all required fields."
    });
}

if (!Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({
        error: "Please select at least one student."
    });
}
    const weakPassword = passwordProblem(password);
    if (weakPassword) return res.status(400).json({ error: weakPassword });
    const hashedPassword = await hashPassword(password);

    withTransaction(res, (db) => {
        const userSql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'parent')";
        db.query(userSql, [username, hashedPassword], (err, userResult) => {      
            if (err) return db.rollback(() => res.status(400).json({ error: "Username already exists" }));
            const userId = userResult.insertId;

            const parentSql = "INSERT INTO parents (user_id, full_name, phone, email) VALUES (?, ?, ?, ?)";
            db.query(parentSql, [userId, full_name, phone, email], (err, parentResult) => {
                if (err) return db.rollback(() => res.status(500).json({ error: "Failed to create parent profile" }));
                const parentId = parentResult.insertId;

                const values = student_ids.map(sId => [parentId, sId]);
                const mapSql = "INSERT INTO parent_student_map (parent_id, student_id) VALUES ?";
                db.query(mapSql, [values], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: "Failed to link students" }));

                    db.commit((err) => {
                        if (err) return db.rollback(() => res.status(500).json({ error: "Commit failed" }));
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
    if (
    !full_name ||
    !phone ||
    !email
) {
    return res.status(400).json({
        error: "Please fill all required fields."
    });
}

if (!Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({
        error: "Please select at least one student."
    });
}
    
    withTransaction(res, (db) => {
        db.query("UPDATE parents SET full_name = ?, phone = ?, email = ? WHERE parent_id = ?", [full_name, phone, email, parentId], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: publicError(err) }));
            
            db.query("DELETE FROM parent_student_map WHERE parent_id = ?", [parentId], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: publicError(err) }));
                
                const values = student_ids.map(sId => [parentId, sId]);
                db.query("INSERT INTO parent_student_map (parent_id, student_id) VALUES ?", [values], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: publicError(err) }));
                    
                    db.commit((err) => {
                        if (err) return db.rollback(() => res.status(500).json({ error: "Commit failed" }));
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
        if (err || results.length === 0) return res.status(500).json({ error: "Parent not found" });
        
        const userId = results[0].user_id;
        
        db.query("DELETE FROM users WHERE id = ?", [userId], (err) => {
            if (err) return res.status(500).json({ error: publicError(err) });
            audit(req, { action: 'PARENT_DELETE', entity: 'users', entityId: userId });
            res.json({ success: true, message: "Parent account deleted" });
        });
    });
});


app.get('/api/notices', verifyRole(['admin']), (req, res) => {
    const sql = `
        SELECT
            n.id,
            n.title,
            n.content,
            n.target_role,
            n.priority,
            n.attachment_url,
            n.posted_by,
            COALESCE(t.full_name, u.username) AS posted_by_name,
            n.subject_id,
            DATE_FORMAT(n.created_at,'%Y-%m-%d') AS date
        FROM notices n
        LEFT JOIN users u ON n.posted_by = u.id
        LEFT JOIN teachers t ON u.id = t.user_id
        ORDER BY n.created_at DESC
    `;

    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: publicError(err)
            });
        }

        res.json(data);
    });
});

app.post('/api/notices', verifyRole(['admin', 'teacher']), singleAttachment, (req, res) => {
    const {
        title,
        content,
        target_role,
        subject_id = null,
        priority = "Normal"
    } = req.body;

    if (!title || !content || !target_role) {
        return res.status(400).json({
            error: "Please fill all required fields."
        });
    }

    if (
        !['all', 'teacher', 'student', 'parent'].includes(target_role) ||
        !['Low', 'Normal', 'High'].includes(priority) ||
        String(title).trim().length > 255
    ) {
        return res.status(400).json({
            error: "Invalid audience, priority or title length."
        });
    }

    const authorId = req.user.id;

    const continueCreate = () => {
        const attachment_url = req.file
            ? `/uploads/${req.file.filename}`
            : (req.body.attachment_url || null);

        const sql = `
            INSERT INTO notices
            (
                title,
                content,
                target_role,
                priority,
                attachment_url,
                posted_by,
                subject_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [
                title.trim(),
                content.trim(),
                target_role,
                priority,
                attachment_url,
                authorId,
                subject_id || null
            ],
            (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        error: publicError(err)
                    });
                }

                notifier.run(async () => {
                    const who = await notifier.noticeAudience(target_role, subject_id || null);
                    await notifier.send(who, {
                        type: 'notice', section: 'notices', refId: result.insertId,
                        title: priority === 'High' ? 'Important notice' : 'New notice', body: title.trim()
                    }, { exclude: [authorId] });
                });

                res.json({
                    success: true,
                    id: result.insertId
                });
            }
        );
    };

    if (req.user.role === 'admin') {
        return continueCreate();
    }

    if (target_role !== 'student') {
        return res.status(403).json({
            error: "Teachers can only send notices to students."
        });
    }

    if (!subject_id) {
        return res.status(400).json({
            error: "A target class/subject is required."
        });
    }

    teacherOwnsSubject(req.user.id, subject_id, (err, owns) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Authorization check failed."
            });
        }

        if (!owns) {
            return res.status(403).json({
                error: "You are not assigned to this subject."
            });
        }

        continueCreate();
    });
});

app.put('/api/notices/:id', verifyRole(['admin', 'teacher']), singleAttachment, (req, res) => {
    const {
        title,
        content,
        target_role,
        subject_id = null,
        priority = "Normal"
    } = req.body;

    if (!title || !content || !target_role) {
        return res.status(400).json({
            error: "Please fill all required fields."
        });
    }

    if (
        !['all', 'teacher', 'student', 'parent'].includes(target_role) ||
        !['Low', 'Normal', 'High'].includes(priority) ||
        String(title).trim().length > 255
    ) {
        return res.status(400).json({
            error: "Invalid audience, priority or title length."
        });
    }

    const noticeId = Number(req.params.id);

    if (!Number.isInteger(noticeId) || noticeId <= 0) {
        return res.status(400).json({
            error: "Invalid notice identifier."
        });
    }

    const continueUpdate = () => {
        const attachment_url = req.file
            ? `/uploads/${req.file.filename}`
            : req.body.attachment_url;

        const sql = `
            UPDATE notices
            SET
                title = ?,
                content = ?,
                target_role = ?,
                priority = ?,
                attachment_url = ?,
                subject_id = ?
            WHERE id = ?
        `;

        db.query(
            sql,
            [
                title.trim(),
                content.trim(),
                target_role,
                priority,
                attachment_url || null,
                subject_id || null,
                noticeId
            ],
            (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        error: publicError(err)
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        error: "Notice not found."
                    });
                }

                res.json({
                    success: true,
                    message: "Notice updated successfully."
                });
            }
        );
    };

    const authorizationSql = `
        SELECT
            n.id,
            n.posted_by,
            n.target_role,
            n.subject_id
        FROM notices n
        WHERE n.id = ?
        LIMIT 1
    `;

    db.query(authorizationSql, [noticeId], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Failed to verify notice ownership."
            });
        }

        if (rows.length === 0) {
            return res.status(404).json({
                error: "Notice not found."
            });
        }

        const notice = rows[0];

        if (req.user.role === 'admin') {
            return continueUpdate();
        }

        if (
            Number(notice.posted_by) !== Number(req.user.id) ||
            notice.target_role !== 'student'
        ) {
            return res.status(403).json({
                error: "You can only edit notices created by your teacher account."
            });
        }

        if (!subject_id) {
            return res.status(400).json({
                error: "A target class/subject is required."
            });
        }

        teacherOwnsSubject(req.user.id, subject_id, (assignmentErr, owns) => {
            if (assignmentErr) {
                console.error(assignmentErr);
                return res.status(500).json({
                    error: "Authorization check failed."
                });
            }

            if (!owns) {
                return res.status(403).json({
                    error: "You are not assigned to the selected subject."
                });
            }

            continueUpdate();
        });
    });
});

app.delete('/api/notices/:id', verifyRole(['admin', 'teacher']), (req, res) => {
    const noticeId = Number(req.params.id);

    if (!Number.isInteger(noticeId) || noticeId <= 0) {
        return res.status(400).json({
            error: "Invalid notice identifier."
        });
    }

    const ownershipSql = `
        SELECT id, posted_by, target_role, attachment_url
        FROM notices
        WHERE id = ?
        LIMIT 1
    `;

    db.query(ownershipSql, [noticeId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: publicError(err)
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                error: "Notice not found."
            });
        }

        const notice = results[0];

        if (
            req.user.role === 'teacher' &&
            (
                Number(notice.posted_by) !== Number(req.user.id) ||
                notice.target_role !== 'student'
            )
        ) {
            return res.status(403).json({
                error: "You can only delete notices created by your teacher account."
            });
        }

        db.query(
            "DELETE FROM notices WHERE id=?",
            [noticeId],
            (deleteErr) => {
                if (deleteErr) {
                    console.error(deleteErr);
                    return res.status(500).json({
                        error: publicError(deleteErr)
                    });
                }

                notifier.dropFor('notice', noticeId);

                if (notice.attachment_url) {
                    deleteFile(notice.attachment_url);
                }

                res.json({
                    success: true,
                    message: "Notice deleted successfully."
                });
            }
        );
    });
});

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
if (err) {
    console.error(err);

    return res.status(500).json({
        error: publicError(err)
    });
}        
        db.query(activitySql, (err, activityData) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: publicError(err)
                });
            }

            res.json({
                stats: statsData[0],
                activities: activityData
            });
        });
    });
});


app.get('/api/teacher/:id/assigned-subjects', verifyRole(['teacher']), requireSelfTeacher, (req, res) => {
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
        if (err) return res.status(500).json({ error: "Database error." });
        res.json(data);
    });
});

app.get('/api/teacher/:id/notices', verifyRole(['teacher']), (req, res) => {
    if (Number(req.params.id) !== Number(req.user.id)) {
        return res.status(403).json({
            error: "You are not authorized to view another teacher's notices."
        });
    }

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
    db.query(sql, [req.user.id], (err, data) => {
        if (err) return res.status(500).json({ error: "Database error." });
        res.json(data);
    });
});

app.get('/api/subjects/:id/students', verifyRole(['teacher', 'admin']), (req, res) => {
    if (!req.params.id) {
    return res.status(400).json({
        error: "Subject ID is required."
    });
}

    const runQuery = () => {
    const sql = `
        SELECT 
            st.student_id, 
            st.roll_number AS roll,
            st.full_name AS name
        FROM students st
        JOIN subjects sub ON st.course_id = sub.course_id AND st.semester = sub.semester
        WHERE sub.id = ?
        ORDER BY st.full_name ASC
    `;
    
    db.query(sql, [req.params.id], (err, data) => {
if (err) {
    console.error(err);

    return res.status(500).json({
        error: "Database rejected the query"
    });
}        const studentsWithStatus = data.map(student => ({
    ...student,
    status: "Absent"
}));
        res.json(studentsWithStatus);
    });
    };

    if (req.user.role === 'admin') {
        return runQuery();
    }

    teacherOwnsSubject(req.user.id, req.params.id, (err, owns) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Authorization check failed." });
        }
        if (!owns) {
            return res.status(403).json({ error: "You are not assigned to this subject." });
        }
        runQuery();
    });
});

app.get('/api/teacher/:id/attendance-history', verifyRole(['teacher']), requireSelfTeacher, (req, res) => {
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
        if (err) {
    console.error(err);

    return res.status(500).json({
        error: "Failed to load history"
    });
}
        res.json(data);
    });
});

app.get('/api/attendance/class/:classId', verifyRole(['teacher']), (req, res) => {
    const ownershipSql = `
        SELECT dc.id
        FROM daily_classes dc
        JOIN teachers t ON dc.teacher_id = t.teacher_id
        WHERE dc.id = ? AND t.user_id = ?
    `;

    db.query(ownershipSql, [req.params.classId, req.user.id], (ownErr, ownRows) => {
        if (ownErr) {
            console.error(ownErr);
            return res.status(500).json({ error: "Authorization check failed." });
        }

        if (ownRows.length === 0) {
            return res.status(403).json({ error: "You are not authorized to view this class." });
        }

        const sql = `
            SELECT 
                st.roll_number as roll, 
                st.full_name as name, 
                a.status 
            FROM attendance a
            JOIN students st ON a.student_id = st.student_id
            WHERE a.daily_class_id = ?
            ORDER BY st.full_name ASC
        `;

        db.query(sql, [req.params.classId], (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to load details" });
            res.json(data);
        });
    });
});


app.get('/api/marks/details', verifyRole(['teacher']), (req, res) => {
    const { subject_id, exam_type } = req.query;
    const assessmentName = String(req.query.assessment_name || '').trim().replace(/\s+/g, ' ');
    if (!subject_id || !exam_type) {
    return res.status(400).json({
        error: "Subject and exam type are required."
    });
}

    teacherOwnsSubject(req.user.id, subject_id, (ownErr, owns) => {
        if (ownErr) {
            console.error(ownErr);
            return res.status(500).json({ error: "Authorization check failed." });
        }

        if (!owns) {
            return res.status(403).json({ error: "You are not assigned to this subject." });
        }

    const sql = `
        SELECT m.student_id as id, st.roll_number as roll, st.roll_number as roll_number, st.full_name as name, m.score, m.max_score
        FROM marks m
        JOIN students st ON m.student_id = st.student_id
        WHERE m.subject_id = ? AND m.exam_type = ? AND m.assessment_name = ?
    `;
    db.query(sql, [subject_id, exam_type, assessmentName], (err, data) => {
        if (err) {
    console.error(err);

    return res.status(500).json({
        error: publicError(err)
    });
}
        res.json(data);
    });
    });
});

app.get('/api/teacher/:id/marks-ledger', verifyRole(['teacher']), requireSelfTeacher, (req, res) => {
    const sql = `
        SELECT 
            m.subject_id as classId, 
            m.exam_type as type, 
            m.assessment_name as name,
            MAX(ast.display_name) as display_name,
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
        LEFT JOIN assessment_settings ast ON ast.subject_id = m.subject_id AND ast.exam_type COLLATE utf8mb4_general_ci = m.exam_type COLLATE utf8mb4_general_ci
        WHERE m.uploaded_by = (SELECT teacher_id FROM teachers WHERE user_id = ?)
        GROUP BY m.subject_id, m.exam_type, m.assessment_name, s.subject_name, s.semester, c.course_name
        ORDER BY MAX(m.created_at) DESC
    `;
    db.query(sql, [req.params.id], (err, data) => {
        if (err) {
    console.error(err);

    return res.status(500).json({
        error: "Failed to load marks ledger"
    });
}
        res.json(data);
    });
});

app.get('/api/teacher/:id/dashboard', verifyRole(['teacher']), requireSelfTeacher, (req, res) => {
    const userId = req.params.id;

    const teacherSql = `SELECT teacher_id, full_name FROM teachers WHERE user_id = ?`;

    db.query(teacherSql, [userId], (err, teacherResult) => {
        if (err || teacherResult.length === 0) return res.status(404).json({ error: "Teacher not found" });

        const teacherId = teacherResult[0].teacher_id;
        const teacherName = teacherResult[0].full_name;

        const statsSql = `
            SELECT 
                (SELECT COUNT(*) FROM teacher_assignments WHERE teacher_id = ?) as totalSubjects,
                (SELECT COUNT(DISTINCT st.student_id) FROM students st 
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
            SELECT id, title, content, attachment_url, DATE_FORMAT(created_at, '%b %d') as date, priority 
            FROM notices 
            WHERE target_role IN ('all', 'teacher') 
               OR EXISTS (SELECT 1 FROM notice_recipients nrc WHERE nrc.notice_id = notices.id AND nrc.user_id = ?)
            ORDER BY created_at DESC LIMIT 3
        `;

        db.query(statsSql, [teacherId, teacherId], (err, statsResult) => {
            db.query(classesSql, [teacherId], (err, classesResult) => {
                db.query(noticesSql, [req.user.id], (err, noticesResult) => {
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
    const { subjectId, date, startTime, endTime, room } = req.body;
    const userId = req.user.id;
    if (
    !subjectId ||
    !date ||
    !startTime ||
    !endTime ||
    !room
) {
    return res.status(400).json({
        error: "Please fill all required fields."
    });
}

    const findTeacherSql = `SELECT teacher_id FROM teachers WHERE user_id = ?`;

    db.query(findTeacherSql, [userId], (err, teacherResult) => {
        if (err || teacherResult.length === 0) return res.status(404).json({ error: "Teacher account not found for this user." });

        const exactTeacherId = teacherResult[0].teacher_id;

        teacherOwnsSubject(req.user.id, subjectId, (ownErr, owns) => {
            if (ownErr) return res.status(500).json({ error: "Authorization check failed." });
            if (!owns) return res.status(403).json({ error: "You are not assigned to this subject." });

            const insertSql = `
                INSERT INTO daily_classes (teacher_id, subject_id, class_date, start_time, end_time, room_number) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(insertSql, [exactTeacherId, subjectId, date, startTime, endTime, room], (err, result) => {
                if (err) return res.status(500).json({ error: "Failed to schedule class in database." });
                audit(req, { action: 'CLASS_SCHEDULE', entity: 'daily_classes', entityId: result.insertId, newValue: { subjectId, date, startTime, endTime, room } });
                res.json({ success: true, message: "Class successfully scheduled!" });
            });
        });
    });
});

app.get('/api/student/:id/notices', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, (req, res) => {
    const userId = req.params.id;

    const sql = `
        SELECT 
            n.id,
            n.title,
            n.content,
            n.priority,
            n.attachment_url,
            DATE_FORMAT(n.created_at, '%b %d, %Y') AS date,
            COALESCE(t.full_name, s_author.full_name, u.username, 'Admin') AS author_name,
            COALESCE(u.role, 'admin') AS author_role
        FROM notices n
        LEFT JOIN users u ON n.posted_by = u.id
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN students s_author ON u.id = s_author.user_id
        LEFT JOIN subjects sub ON n.subject_id = sub.id
        JOIN students st ON st.user_id = ?
        WHERE n.target_role IN ('all', 'student')
          AND (
              n.subject_id IS NULL
              OR (sub.course_id = st.course_id AND sub.semester = st.semester)
          )
        ORDER BY n.created_at DESC
    `;

    db.query(sql, [userId], (err, data) => {
        if (err) {
            console.error("Notice fetch error:", err);
            return res.status(500).json({
                error: publicError(err)
            });
        }
        res.json(data || []);
    });
});

app.get('/api/parent/:id/wards-overview', verifyRole(['parent']), (req, res) => {
    const parentUserId = Number(req.params.id);

    if (!Number.isInteger(parentUserId) || parentUserId <= 0) {
        return res.status(400).json({
            success: false,
            error: "Invalid parent identifier."
        });
    }

    if (parentUserId !== Number(req.user.id)) {
        return res.status(403).json({
            success: false,
            error: "You are not authorized to access this parent's records."
        });
    }

    const requestedStudentId = req.query.student_id
        ? Number(req.query.student_id)
        : null;

    if (req.query.student_id && (!Number.isInteger(requestedStudentId) || requestedStudentId <= 0)) {
        return res.status(400).json({
            success: false,
            error: "Invalid student identifier."
        });
    }

    const childSql = `
        SELECT
            s.student_id,
            s.user_id,
            s.full_name,
            s.roll_number,
            s.enrollment_number,
            s.semester,
            s.course_id,
            c.course_name
        FROM students s
        INNER JOIN courses c ON c.id = s.course_id
        INNER JOIN parent_student_map psm ON psm.student_id = s.student_id
        INNER JOIN parents p ON p.parent_id = psm.parent_id
        WHERE p.user_id = ?
        ORDER BY s.full_name ASC
    `;

    db.query(childSql, [parentUserId], (err, children) => {
        if (err) {
            console.error("Parent wards SQL error:", err.sqlMessage || err.message);
            return res.status(500).json({
                success: false,
                error: "Failed to load child information.",
            });
        }

        if (!children || children.length === 0) {
            return res.json({
                allWards: [],
                childProfile: null,
                summaryMetrics: {
                    attendanceRate: 0,
                    totalDues: 0,
                    classAverage: 0
                },
                message: "No children linked to this parent record."
            });
        }

        let targetStudent = children[0];

        if (requestedStudentId !== null) {
            targetStudent = children.find(
                child => Number(child.student_id) === requestedStudentId
            );

            if (!targetStudent) {
                return res.status(403).json({
                    success: false,
                    error: "This student is not linked to your parent account."
                });
            }
        }

        const metricsSql = `
            SELECT
                COALESCE((
                    SELECT ROUND(
                        (SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100,
                        1
                    )
                    FROM attendance a
                    WHERE a.student_id = ?
                ), 0) AS attendanceRate,
                COALESCE((
                    SELECT SUM(f.total_fee - f.paid_amount)
                    FROM fees f
                    WHERE f.student_id = ?
                ), 0) AS totalDues,
                COALESCE((
                    SELECT ROUND(AVG(m.score), 1)
                    FROM marks m
                    WHERE m.student_id = ?
                ), 0) AS classAverage
        `;

        db.query(
            metricsSql,
            [targetStudent.student_id, targetStudent.student_id, targetStudent.student_id],
            (metricsErr, metrics) => {
                if (metricsErr) {
                    console.error("Parent metrics SQL error:", metricsErr.sqlMessage || metricsErr.message);
                    return res.status(500).json({
                        success: false,
                        error: "Failed to load summary metrics.",
                    });
                }

                return res.json({
                    allWards: children,
                    childProfile: targetStudent,
                    summaryMetrics: metrics[0] || {
                        attendanceRate: 0,
                        totalDues: 0,
                        classAverage: 0
                    }
                });
            }
        );
    });
});

app.get('/api/student/:id/results', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, (req, res) => {
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
            SUM(CASE WHEN m.exam_type = 'Assignment' THEN m.score END) as assignment,
            SUM(CASE WHEN m.exam_type = 'Sessional 1' THEN m.score END) as sessional1,
            SUM(CASE WHEN m.exam_type = 'Sessional 2' THEN m.score END) as sessional2,
            SUM(CASE WHEN m.exam_type = 'End Sem' THEN m.score END) as endSem,
            SUM(CASE WHEN m.exam_type NOT IN ('Assignment','Sessional 1','Sessional 2','End Sem') THEN m.score END) as other,
            MAX(a1.display_name) as assignmentLabel,
            MAX(a2.display_name) as sessional1Label,
            MAX(a3.display_name) as sessional2Label,
            MAX(a4.display_name) as endSemLabel,
            SUM(m.score) as total,
            SUM(m.max_score) as totalMax
        FROM subjects sub
        JOIN marks m ON sub.id = m.subject_id
        JOIN students s ON m.student_id = s.student_id
        LEFT JOIN assessment_settings a1 ON a1.subject_id = sub.id AND a1.exam_type = 'Assignment'
        LEFT JOIN assessment_settings a2 ON a2.subject_id = sub.id AND a2.exam_type = 'Sessional 1'
        LEFT JOIN assessment_settings a3 ON a3.subject_id = sub.id AND a3.exam_type = 'Sessional 2'
        LEFT JOIN assessment_settings a4 ON a4.subject_id = sub.id AND a4.exam_type = 'End Sem'
        WHERE s.user_id = ?
        GROUP BY sub.id, sub.subject_name, sub.semester, sub.credits
        ORDER BY sub.semester ASC;
    `;

    db.query(sql, [userId], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Failed to fetch results"
            });
        }

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
                assignment: row.assignment === null ? null : parseFloat(row.assignment),
                sessional1: row.sessional1 === null ? null : parseFloat(row.sessional1),
                sessional2: row.sessional2 === null ? null : parseFloat(row.sessional2),
                endSem: row.endSem === null ? null : parseFloat(row.endSem),
                other: row.other === null ? null : parseFloat(row.other),
                labels: {
                    assignment: row.assignmentLabel || null,
                    sessional1: row.sessional1Label || null,
                    sessional2: row.sessional2Label || null,
                    endSem: row.endSemLabel || null
                },
                total: total,
                totalMax: parseFloat(row.totalMax) || 0,
                grade: grade,
                credits: row.credits
            });
        });

        res.json(formattedResults);
    });
});

app.get('/api/student/:id/subjects-list', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, (req, res) => {
    const userId = req.params.id;
    const semester = req.query.semester;
    if (!semester) {
    return res.status(400).json({
        error: "Semester is required."
    });
}
    const sql = `
        SELECT DISTINCT s.subject_name 
        FROM subjects s
        JOIN students st ON s.course_id = st.course_id
        WHERE st.user_id = ? AND s.semester = ?`;
    db.query(sql, [userId, semester], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Failed to load subjects list"
            });
        }
        res.json(data);
    });
});

app.get('/api/student/:id/attendance-logs', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, (req, res) => {
    const userId = req.params.id;
    const semester = req.query.semester;
    if (!semester) {
    return res.status(400).json({
        error: "Semester is required."
    });
}
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
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json(data);
    });
});

app.get('/api/student/:id/subjects', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, (req, res) => {
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
        if (err) return res.status(500).json({ error: publicError(err) });
        
        const totalCredits = data.reduce((sum, sub) => sum + (sub.credits || 0), 0);
        
        res.json({
            available_semesters: [1, 2, 3, 4, 5, 6, 7, 8],
            total_credits: totalCredits,
            subjects: data
        });
    });
});

app.get('/api/student/:id/profile', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, (req, res) => {
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
        if (err) return res.status(500).json({ error: publicError(err) });
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
                roll_no: dbStudent.roll_number,
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


app.get('/api/admin/fees', verifyRole(['admin']), (req, res) => {
    const sql = `
        SELECT f.*, s.full_name as name, s.enrollment_number as enrollment, c.course_name as course
        FROM fees f
        JOIN students s ON f.student_id = s.student_id
        JOIN courses c ON s.course_id = c.id
        ORDER BY f.due_date ASC
    `;
    db.query(sql, (err, data) => {
        if (err) {
    console.error(err);

    return res.status(500).json({
        error: publicError(err)
    });
}
        res.json(data);
    });
});

app.get('/api/student/:id/fees', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, (req, res) => {
    const userId = req.params.id;
    const sql = `
        SELECT f.* FROM fees f
        JOIN students s ON f.student_id = s.student_id
        WHERE s.user_id = ?
        ORDER BY f.due_date ASC
    `;
    db.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json(data || []);
    });
});

app.get('/api/student/:id/payments', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, (req, res) => {
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
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json(data || []);
    });
});

app.get('/api/admin/payments', verifyRole(['admin']), (req, res) => {
    const sql = `
        SELECT p.*, s.full_name as student_name, s.enrollment_number as enrollment, s.roll_number
        FROM payments p
        JOIN fees f ON p.fee_id = f.id
        JOIN students s ON f.student_id = s.student_id
        ORDER BY p.payment_date DESC
    `;
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json(data);
    });
});

app.post('/api/fees', verifyRole(['admin']), (req, res) => {
    const { student_id, semester, fee_type, total_fee, due_date } = req.body;
    if (
    !student_id ||
    !semester ||
    !fee_type ||
    !total_fee ||
    !due_date
) {
    return res.status(400).json({
        error: "Please fill all required fields."
    });
}
    const sql = `
        INSERT INTO fees (student_id, semester, fee_type, total_fee, paid_amount, due_date, status)
        VALUES (?, ?, ?, ?, 0, ?, 'Pending')
    `;
    db.query(sql, [student_id, semester, fee_type, total_fee, due_date], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "This fee type already exists for this student & semester." });
            return res.status(500).json({ error: publicError(err) });
        }
        const feeId = result.insertId;
        notifier.run(async () => {
            const family = (await notifier.familyByStudent([Number(student_id)])).get(Number(student_id)) || [];
            await notifier.send(family, {
                type: 'fee', section: 'fees', refId: feeId, title: 'New fee assigned',
                body: `${fee_type}: ₹${Number(total_fee).toLocaleString('en-IN')} due by ${String(due_date).slice(0, 10)}.`
            });
        });
        res.json({ success: true, id: feeId });
    });
});

app.post('/api/fees/bulk-assign', verifyRole(['admin']), (req, res) => {
    const { course_id, semester, fee_type, total_fee, due_date } = req.body;

    if (
        !course_id ||
        !semester ||
        !fee_type ||
        !total_fee ||
        !due_date
    ) {
        return res.status(400).json({
            error: "Please fill all required fields."
        });
    }

    const studentsSql = `
        SELECT student_id
        FROM students
        WHERE course_id = ? AND semester = ? AND status = 'Active'
    `;

    db.query(studentsSql, [course_id, semester], (err, students) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: publicError(err) });
        }

        if (students.length === 0) {
            return res.status(404).json({
                error: "No active students found for that course & semester."
            });
        }

        const values = students.map(s => [
            s.student_id,
            semester,
            fee_type,
            total_fee,
            0,
            due_date,
            'Pending'
        ]);

        const insertSql = `
            INSERT INTO fees (student_id, semester, fee_type, total_fee, paid_amount, due_date, status)
            VALUES ?
            ON DUPLICATE KEY UPDATE
                total_fee = VALUES(total_fee),
                due_date = VALUES(due_date)
        `;

        db.query(insertSql, [values], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: publicError(err) });
            }

            notifier.run(async () => {
                const family = await notifier.familyByStudent(students.map((s) => s.student_id));
                await notifier.send([...family.values()].flat(), {
                    type: 'fee', section: 'fees', title: 'New fee assigned',
                    body: `${fee_type} (semester ${semester}): ₹${Number(total_fee).toLocaleString('en-IN')} due by ${String(due_date).slice(0, 10)}.`
                });
            });

            res.json({
                success: true,
                assigned: students.length
            });
        });
    });
});

app.put('/api/fees/:id', verifyRole(['admin']), (req, res) => {
    const { total_fee, due_date, fee_type } = req.body;
    if (
    !total_fee ||
    !due_date ||
    !fee_type
) {
    return res.status(400).json({
        error: "Please fill all required fields."
    });
}
    const sql = `UPDATE fees SET total_fee = ?, due_date = ?, fee_type = ? WHERE id = ?`;
    db.query(sql, [total_fee, due_date, fee_type, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        res.json({ success: true });
    });
});

app.delete('/api/fees/:id', verifyRole(['admin']), (req, res) => {
    db.query(`DELETE FROM fees WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: publicError(err) });
        audit(req, { action: 'FEE_DELETE', entity: 'fees', entityId: req.params.id });
        res.json({ success: true });
    });
});

app.put('/api/student/:id/profile', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, (req, res) => {
    const userId = req.params.id;
    
    const { 
        contact, blood_group, address, city, state, pin_code, 
        father_name, emergency_contact, guardian_relation
    } = req.body;
    if (!contact) {
    return res.status(400).json({
        error: "Contact number is required."
    });
}

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
        father_name, emergency_contact, guardian_relation,
        null,
        userId
    ];

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to update database records." });
        res.json({ success: true, message: "Profile updated successfully!" });
    });
});

app.get('/api/student/:id/custom-dashboard', verifyRole(['student', 'parent', 'admin']), verifyStudentOwnership, (req, res) => {
    const userId = req.params.id;

    const profileSql = `
        SELECT s.full_name, c.course_name, s.semester, s.email, s.roll_number, s.student_id
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
        JOIN students st ON sub.course_id = st.course_id AND sub.semester = st.semester
        WHERE st.user_id = ? AND dc.class_date = CURDATE()
        ORDER BY dc.start_time ASC
    `;

    const noticesSql = `
        SELECT n.id, n.title, n.content, n.attachment_url, 
               CASE 
                   WHEN DATE(n.created_at) = CURDATE() THEN 'Today'
                   WHEN DATE(n.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 'Yesterday'
                   ELSE DATE_FORMAT(n.created_at, '%b %d') 
               END as date,
               n.priority as type
        FROM notices n
        LEFT JOIN subjects sub ON n.subject_id = sub.id
        JOIN students st ON st.user_id = ?
        WHERE (
              n.target_role IN ('all', 'student')
              AND (
                  n.subject_id IS NULL
                  OR (sub.course_id = st.course_id AND sub.semester = st.semester)
              )
          )
          OR (? = 'student' AND EXISTS (SELECT 1 FROM notice_recipients nrc WHERE nrc.notice_id = n.id AND nrc.user_id = ?))
        ORDER BY n.created_at DESC
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
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Profile fetch failed" });
        }
        if (profileData.length === 0) return res.status(404).json({ error: "Student not found" });

        db.query(classesSql, [userId], (err, classesData) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Classes fetch failed" });
            }

            db.query(noticesSql, [userId, req.user.role, req.user.id], (err, noticesData) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: "Notices fetch failed" });
                }

                db.query(performanceSql, [userId], (err, perfData) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: "Performance fetch failed" });
                    }

                    const mappedNotices = noticesData.map(n => ({
                        id: n.id,
                        title: n.title,
                        content: n.content,
                        attachment_url: n.attachment_url,
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

require('./routes')(app, { db, queryAsync, transaction, verifyRole, requireSelfTeacher, verifyStudentOwnership, audit });

const PORT = process.env.PORT || 5000;
process.on("uncaughtException", err => {
    console.error(err);
});

process.on("unhandledRejection", err => {
    console.error(err);
});
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});