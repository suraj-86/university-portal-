const bcrypt = require('bcrypt');
const { str, isPositiveInt } = require('../lib/validate');
const { generatePassword } = require('../lib/password');

const USERNAME_RE = /^[A-Za-z0-9._-]{3,50}$/;
const KINDS = {
    student: 'SELECT u.id, u.username, u.role FROM students s JOIN users u ON u.id = s.user_id WHERE s.student_id = ? LIMIT 1',
    teacher: 'SELECT u.id, u.username, u.role FROM teachers t JOIN users u ON u.id = t.user_id WHERE t.teacher_id = ? LIMIT 1',
    parent: 'SELECT u.id, u.username, u.role FROM parents p JOIN users u ON u.id = p.user_id WHERE p.parent_id = ? LIMIT 1',
    admin: "SELECT u.id, u.username, u.role FROM users u WHERE u.id = ? AND u.role = 'admin' LIMIT 1"
};

const fail = (status, message) => Object.assign(new Error(message), { http: status });

module.exports = (app, { queryAsync, transaction, verifyRole, audit }) => {
    const admin = verifyRole(['admin']);

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            if (e && e.http) return res.status(e.http).json({ error: e.message });
            console.error('Account admin error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });

    app.post('/api/admin/users/reset-password', admin, safe(async (req, res) => {
        const kind = str(req.body && req.body.kind);
        const id = req.body && req.body.id;
        if (!KINDS[kind]) return res.status(400).json({ error: 'Unknown account type.' });
        if (!isPositiveInt(id)) return res.status(400).json({ error: 'Invalid identifier.' });

        const rows = await queryAsync(KINDS[kind], [Number(id)]);
        if (!rows.length) return res.status(404).json({ error: 'Account not found.' });
        const target = rows[0];
        if (Number(target.id) === Number(req.user.id)) {
            return res.status(400).json({ error: 'You cannot reset your own password here. Use Settings to change it.' });
        }

        const password = generatePassword();
        const hash = await bcrypt.hash(password, 10);
        await queryAsync('UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?', [hash, target.id]);

        audit(req, { action: 'PASSWORD_RESET', entity: 'users', entityId: target.id, newValue: { username: target.username, role: target.role } });
        res.json({ success: true, username: target.username, role: target.role, password });
    }));

    app.get('/api/admin/admins', admin, safe(async (req, res) => {
        const rows = await queryAsync(
            `SELECT id, username, is_active, must_change_password, last_login, created_at
               FROM users WHERE role = 'admin' ORDER BY username ASC`);
        res.json(rows.map((r) => ({
            id: r.id,
            username: r.username,
            active: Number(r.is_active) === 1,
            mustChangePassword: Number(r.must_change_password) === 1,
            lastLogin: r.last_login || null,
            createdAt: r.created_at || null,
            isYou: Number(r.id) === Number(req.user.id)
        })));
    }));

    app.post('/api/admin/admins', admin, safe(async (req, res) => {
        const username = str(req.body && req.body.username);
        const given = str(req.body && req.body.password);
        if (!USERNAME_RE.test(username)) {
            return res.status(400).json({ error: 'Username must be 3 to 50 characters: letters, numbers, dot, dash or underscore.' });
        }
        if (given && (given.length < 8 || given.length > 72)) {
            return res.status(400).json({ error: 'Password must be 8 to 72 characters.' });
        }
        const generated = !given;
        const password = given || generatePassword();
        const hash = await bcrypt.hash(password, 10);
        try {
            const r = await queryAsync(
                "INSERT INTO users (username, password, role, must_change_password) VALUES (?, ?, 'admin', 1)", [username, hash]);
            audit(req, { action: 'ADMIN_CREATE', entity: 'users', entityId: r.insertId, newValue: { username } });
            res.json({ success: true, id: r.insertId, username, ...(generated ? { password } : {}) });
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This username is already taken.' });
            throw e;
        }
    }));

    app.put('/api/admin/admins/:id/active', admin, safe(async (req, res) => {
        if (!isPositiveInt(req.params.id)) return res.status(400).json({ error: 'Invalid identifier.' });
        if (typeof (req.body && req.body.active) !== 'boolean') return res.status(400).json({ error: 'Say whether the account should be active.' });
        const id = Number(req.params.id);
        const active = req.body.active;

        const username = await transaction(async (q) => {
            const admins = await q("SELECT id, username, is_active FROM users WHERE role = 'admin' FOR UPDATE");
            const target = admins.find((a) => Number(a.id) === id);
            if (!target) throw fail(404, 'Admin account not found.');
            if (!active) {
                if (id === Number(req.user.id)) throw fail(400, 'You cannot deactivate your own account.');
                const othersActive = admins.filter((a) => Number(a.id) !== id && Number(a.is_active) === 1).length;
                if (Number(target.is_active) === 1 && othersActive === 0) throw fail(400, 'At least one admin account must stay active.');
            }
            await q('UPDATE users SET is_active = ? WHERE id = ?', [active ? 1 : 0, id]);
            return target.username;
        });

        audit(req, { action: active ? 'ADMIN_REACTIVATE' : 'ADMIN_DEACTIVATE', entity: 'users', entityId: id, newValue: { username } });
        res.json({ success: true });
    }));
};
