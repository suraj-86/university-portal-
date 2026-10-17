const { str, isValidDate } = require('../lib/validate');

const ROLES = ['admin', 'teacher', 'student', 'parent'];
const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;
const EXPORT_MAX = 5000;
const ACTION_RE = /^[A-Z0-9_]{1,60}$/;
const ENTITY_RE = /^[A-Za-z0-9_]{1,60}$/;
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const parseJson = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return v; }
};

const buildFilter = (query) => {
    const where = [];
    const params = [];
    const action = str(query.action);
    const entity = str(query.entity);
    const role = str(query.role);
    const from = str(query.from);
    const to = str(query.to);
    const q = str(query.q);

    if (action) {
        if (!ACTION_RE.test(action)) return { error: 'Invalid action filter.' };
        where.push('al.action = ?'); params.push(action);
    }
    if (entity) {
        if (!ENTITY_RE.test(entity)) return { error: 'Invalid entity filter.' };
        where.push('al.entity = ?'); params.push(entity);
    }
    if (role) {
        if (!ROLES.includes(role)) return { error: 'Invalid role filter.' };
        where.push('al.actor_role = ?'); params.push(role);
    }
    if (from) {
        if (!isValidDate(from)) return { error: 'From date must be YYYY-MM-DD.' };
        where.push('al.created_at >= ?'); params.push(`${from} 00:00:00`);
    }
    if (to) {
        if (!isValidDate(to)) return { error: 'To date must be YYYY-MM-DD.' };
        where.push('al.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${to} 00:00:00`);
    }
    if (from && to && to < from) return { error: 'To date cannot be before the from date.' };
    if (q) {
        if (q.length > 60) return { error: 'Search text is too long.' };
        const like = `%${escapeLike(q)}%`;
        where.push('(al.entity_id = ? OR u.username LIKE ? OR al.action LIKE ?)');
        params.push(q, like, like);
    }
    return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
};

const FROM = 'FROM audit_log al LEFT JOIN users u ON u.id = al.actor_user_id';
const COLUMNS = `al.id, al.created_at, al.actor_user_id, al.actor_role, u.username AS actor,
    al.action, al.entity, al.entity_id, al.reason, al.ip_address, al.old_value, al.new_value`;

const shape = (r) => ({
    id: r.id,
    at: r.created_at,
    actorId: r.actor_user_id,
    actor: r.actor || null,
    actorRole: r.actor_role || null,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    reason: r.reason || null,
    ip: r.ip_address || null,
    oldValue: parseJson(r.old_value),
    newValue: parseJson(r.new_value)
});

module.exports = (app, { queryAsync, verifyRole }) => {
    const admin = verifyRole(['admin']);

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Audit viewer error:', e.code || e.message);
            res.status(500).json({ error: 'Could not load the audit log. Please try again.' });
        });

    app.get('/api/admin/audit', admin, safe(async (req, res) => {
        const f = buildFilter(req.query);
        if (f.error) return res.status(400).json({ error: f.error });
        const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(req.query.page_size, 10) || PAGE_SIZE_DEFAULT));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);

        const total = Number((await queryAsync(`SELECT COUNT(*) AS n ${FROM} ${f.clause}`, f.params))[0].n) || 0;
        const rows = await queryAsync(
            `SELECT ${COLUMNS} ${FROM} ${f.clause} ORDER BY al.id DESC LIMIT ? OFFSET ?`,
            [...f.params, pageSize, (page - 1) * pageSize]);
        res.json({ rows: rows.map(shape), total, page, pageSize });
    }));

    app.get('/api/admin/audit/filters', admin, safe(async (req, res) => {
        const actions = await queryAsync('SELECT DISTINCT action FROM audit_log ORDER BY action');
        const entities = await queryAsync('SELECT DISTINCT entity FROM audit_log ORDER BY entity');
        res.json({ actions: actions.map((a) => a.action), entities: entities.map((e) => e.entity), roles: ROLES });
    }));

    app.get('/api/admin/audit/export', admin, safe(async (req, res) => {
        const f = buildFilter(req.query);
        if (f.error) return res.status(400).json({ error: f.error });
        const rows = await queryAsync(
            `SELECT ${COLUMNS} ${FROM} ${f.clause} ORDER BY al.id DESC LIMIT ?`, [...f.params, EXPORT_MAX + 1]);
        res.json({ rows: rows.slice(0, EXPORT_MAX).map(shape), truncated: rows.length > EXPORT_MAX, max: EXPORT_MAX });
    }));
};
