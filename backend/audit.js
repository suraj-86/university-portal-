// Audit helper. Never throws: a failed audit write must not break the request.
// Safe to deploy before the audit_log table exists (it just logs a warning).
const SENSITIVE = /password|token|secret/i;

const clean = (v) => {
    if (v === undefined || v === null) return null;
    if (typeof v !== 'object') return v;
    const out = Array.isArray(v) ? [] : {};
    for (const k of Object.keys(v)) {
        out[k] = SENSITIVE.test(k) ? '[redacted]' : clean(v[k]);
    }
    return out;
};

const createAudit = (db) => (req, { action, entity, entityId = null, oldValue = null, newValue = null, reason = null }) => {
    try {
        const ip = req && (req.ip || (req.connection && req.connection.remoteAddress)) || null;
        db.query(
            `INSERT INTO audit_log (actor_user_id, actor_role, action, entity, entity_id, old_value, new_value, reason, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req && req.user ? req.user.id : null,
                req && req.user ? req.user.role : null,
                action,
                entity,
                entityId === null ? null : String(entityId),
                oldValue === null ? null : JSON.stringify(clean(oldValue)),
                newValue === null ? null : JSON.stringify(clean(newValue)),
                reason,
                ip
            ],
            (err) => { if (err) console.warn('Audit write failed:', err.code || err.message); }
        );
    } catch (e) {
        console.warn('Audit error:', e.message);
    }
};

module.exports = { createAudit };
