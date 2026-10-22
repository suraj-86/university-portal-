const { publicError } = require('../lib/http');

module.exports = (app, { queryAsync, verifyRole, audit }) => {
    const everyone = verifyRole(['admin', 'teacher', 'student', 'parent']);
    const admin = verifyRole(['admin']);

    const onlinePaymentsOn = async () => {
        const rows = await queryAsync("SELECT setting_value FROM app_settings WHERE setting_key = 'online_payments' LIMIT 1");
        return rows.length > 0 && rows[0].setting_value === 'on';
    };

    app.get('/api/settings/public', everyone, async (req, res) => {
        try {
            res.json({ onlinePayments: await onlinePaymentsOn() });
        } catch (e) {
            res.status(500).json({ error: publicError(e) });
        }
    });

    app.put('/api/admin/settings/online-payments', admin, async (req, res) => {
        const enabled = req.body && req.body.enabled;
        if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'Send enabled as true or false.' });
        try {
            const before = await onlinePaymentsOn();
            await queryAsync(
                `INSERT INTO app_settings (setting_key, setting_value, updated_by) VALUES ('online_payments', ?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
                [enabled ? 'on' : 'off', req.user.id]);
            audit(req, { action: 'SETTING_CHANGE', entity: 'online_payments', oldValue: { enabled: before }, newValue: { enabled } });
            res.json({ success: true, onlinePayments: enabled });
        } catch (e) {
            res.status(500).json({ error: publicError(e) });
        }
    });
};
