const jwt = require('jsonwebtoken');
const { queryAsync } = require('./db');

const verifyRole = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            let token = req.cookies.token;

            if (!token) {
                const authHeader = req.headers.authorization;

                if (authHeader && authHeader.startsWith("Bearer ")) {
                    token = authHeader.substring(7);
                }
            }

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: "Authentication required. Please log in."
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = {
                id: decoded.id,
                role: decoded.role
            };

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    error: "You are not authorized to access this resource."
                });
            }

            let rows;
            try {
                rows = await queryAsync("SELECT is_active FROM users WHERE id = ? LIMIT 1", [req.user.id]);
            } catch (dbErr) {
                console.error("Auth DB check failed:", dbErr.message);
                return res.status(500).json({ success: false, error: "Authentication check failed." });
            }

            if (rows.length === 0 || rows[0].is_active === 0) {
                res.clearCookie("token");
                return res.status(401).json({
                    success: false,
                    error: "This account is no longer active. Please contact the administrator."
                });
            }

            next();

        } catch (error) {
            console.error("JWT Verification Error:", error.message);

            return res.status(401).json({
                success: false,
                error: "Session expired or invalid token. Please log in again."
            });
        }
    };
};

const requireSelfTeacher = (req, res, next) => {
    if (Number(req.params.id) !== Number(req.user.id)) {
        return res.status(403).json({ error: "You are not authorized to access another teacher's data." });
    }
    next();
};

module.exports = { verifyRole, requireSelfTeacher };
