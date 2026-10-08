module.exports = (app, { queryAsync }) => {
    app.get('/api/health', async (req, res) => {
        try {
            await queryAsync('SELECT 1');
            res.json({ ok: true, db: true, time: new Date().toISOString() });
        } catch (e) {
            res.status(503).json({ ok: false, db: false });
        }
    });
};
