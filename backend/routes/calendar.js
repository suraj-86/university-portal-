const { isValidDate, str, isPositiveInt } = require('../lib/validate');

const ALL_ROLES = ['admin', 'teacher', 'student', 'parent'];
const EVENT_TYPES = ['Semester Start', 'Semester End', 'Examination', 'Result', 'Event', 'Deadline', 'Other'];
const MAX_BULK_ROWS = 500;

const validateHoliday = (b = {}) => {
    const date = str(b.date);
    const name = str(b.name);
    const description = str(b.description) || null;
    if (!isValidDate(date)) return { error: 'Date must be a valid date (YYYY-MM-DD).' };
    if (!name) return { error: 'Holiday name is required.' };
    if (name.length > 150) return { error: 'Holiday name is too long (max 150).' };
    if (description && description.length > 255) return { error: 'Description is too long (max 255).' };
    return { value: { date, name, description } };
};

const validateEvent = (b = {}) => {
    const title = str(b.title);
    const type = str(b.type) || 'Event';
    const startDate = str(b.start_date);
    const endDate = str(b.end_date) || null;
    const description = str(b.description) || null;
    if (!title) return { error: 'Title is required.' };
    if (title.length > 150) return { error: 'Title is too long (max 150).' };
    if (!EVENT_TYPES.includes(type)) return { error: `Type must be one of: ${EVENT_TYPES.join(', ')}.` };
    if (!isValidDate(startDate)) return { error: 'Start date must be a valid date (YYYY-MM-DD).' };
    if (endDate !== null && !isValidDate(endDate)) return { error: 'End date must be a valid date (YYYY-MM-DD).' };
    if (endDate !== null && endDate < startDate) return { error: 'End date cannot be before the start date.' };
    if (description && description.length > 500) return { error: 'Description is too long (max 500).' };
    return { value: { title, type, startDate, endDate, description } };
};

module.exports = (app, { queryAsync, transaction, verifyRole, audit }) => {
    const readers = verifyRole(ALL_ROLES);
    const admin = verifyRole(['admin']);

    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Calendar route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });

    const idOr400 = (req, res) => {
        if (!isPositiveInt(req.params.id)) {
            res.status(400).json({ error: 'Invalid identifier.' });
            return null;
        }
        return Number(req.params.id);
    };

    const checkBulk = (req, res, validator) => {
        const rows = req.body && req.body.rows;
        if (!Array.isArray(rows) || rows.length === 0) {
            res.status(400).json({ error: 'No rows to import.' });
            return null;
        }
        if (rows.length > MAX_BULK_ROWS) {
            res.status(400).json({ error: `Too many rows (max ${MAX_BULK_ROWS} per import).` });
            return null;
        }
        const values = [];
        const errors = [];
        rows.forEach((r, i) => {
            const result = validator(r);
            if (result.error) errors.push({ row: (r && r.row) || i + 1, error: result.error });
            else values.push(result.value);
        });
        if (errors.length) {
            res.status(400).json({ error: 'Some rows are invalid. Nothing was imported.', errors: errors.slice(0, 50) });
            return null;
        }
        return values;
    };

    app.get('/api/holidays', readers, safe(async (req, res) => {
        const year = str(req.query.year);
        const params = [];
        let where = '';
        if (year) {
            if (!/^\d{4}$/.test(year)) return res.status(400).json({ error: 'Invalid year.' });
            where = 'WHERE YEAR(holiday_date) = ?';
            params.push(Number(year));
        }
        const rows = await queryAsync(
            `SELECT id, DATE_FORMAT(holiday_date, '%Y-%m-%d') AS date, name, description
             FROM holidays ${where} ORDER BY holiday_date ASC, name ASC`, params);
        res.json(rows);
    }));

    app.post('/api/holidays', admin, safe(async (req, res) => {
        const { value, error } = validateHoliday(req.body);
        if (error) return res.status(400).json({ error });
        try {
            const r = await queryAsync(
                'INSERT INTO holidays (holiday_date, name, description, created_by) VALUES (?, ?, ?, ?)',
                [value.date, value.name, value.description, req.user.id]);
            audit(req, { action: 'HOLIDAY_CREATE', entity: 'holidays', entityId: r.insertId, newValue: value });
            res.json({ success: true, id: r.insertId });
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This holiday already exists on that date.' });
            throw e;
        }
    }));

    app.put('/api/holidays/:id', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const { value, error } = validateHoliday(req.body);
        if (error) return res.status(400).json({ error });
        const old = await queryAsync("SELECT DATE_FORMAT(holiday_date,'%Y-%m-%d') AS date, name, description FROM holidays WHERE id = ?", [id]);
        if (!old.length) return res.status(404).json({ error: 'Holiday not found.' });
        try {
            await queryAsync('UPDATE holidays SET holiday_date = ?, name = ?, description = ? WHERE id = ?',
                [value.date, value.name, value.description, id]);
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This holiday already exists on that date.' });
            throw e;
        }
        audit(req, { action: 'HOLIDAY_UPDATE', entity: 'holidays', entityId: id, oldValue: old[0], newValue: value });
        res.json({ success: true });
    }));

    app.delete('/api/holidays/:id', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const old = await queryAsync("SELECT DATE_FORMAT(holiday_date,'%Y-%m-%d') AS date, name, description FROM holidays WHERE id = ?", [id]);
        if (!old.length) return res.status(404).json({ error: 'Holiday not found.' });
        await queryAsync('DELETE FROM holidays WHERE id = ?', [id]);
        audit(req, { action: 'HOLIDAY_DELETE', entity: 'holidays', entityId: id, oldValue: old[0] });
        res.json({ success: true });
    }));

    app.post('/api/holidays/bulk', admin, safe(async (req, res) => {
        const values = checkBulk(req, res, validateHoliday);
        if (!values) return;
        await transaction(async (q) => {
            for (const v of values) {
                await q(`INSERT INTO holidays (holiday_date, name, description, created_by) VALUES (?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
                    [v.date, v.name, v.description, req.user.id]);
            }
        });
        audit(req, { action: 'HOLIDAY_BULK_IMPORT', entity: 'holidays', newValue: { rows: values.length } });
        res.json({ success: true, saved: values.length });
    }));

    const EVENT_SELECT = `SELECT id, title, event_type AS type,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, description
        FROM academic_events`;

    app.get('/api/academic-events', readers, safe(async (req, res) => {
        const year = str(req.query.year);
        const params = [];
        let where = '';
        if (year) {
            if (!/^\d{4}$/.test(year)) return res.status(400).json({ error: 'Invalid year.' });
            where = 'WHERE YEAR(start_date) = ?';
            params.push(Number(year));
        }
        res.json(await queryAsync(`${EVENT_SELECT} ${where} ORDER BY start_date ASC, title ASC`, params));
    }));

    app.post('/api/academic-events', admin, safe(async (req, res) => {
        const { value, error } = validateEvent(req.body);
        if (error) return res.status(400).json({ error });
        try {
            const r = await queryAsync(
                `INSERT INTO academic_events (title, event_type, start_date, end_date, description, created_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [value.title, value.type, value.startDate, value.endDate, value.description, req.user.id]);
            audit(req, { action: 'CALENDAR_EVENT_CREATE', entity: 'academic_events', entityId: r.insertId, newValue: value });
            res.json({ success: true, id: r.insertId });
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An event with this title already exists on that date.' });
            throw e;
        }
    }));

    app.put('/api/academic-events/:id', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const { value, error } = validateEvent(req.body);
        if (error) return res.status(400).json({ error });
        const old = await queryAsync(`${EVENT_SELECT} WHERE id = ?`, [id]);
        if (!old.length) return res.status(404).json({ error: 'Event not found.' });
        try {
            await queryAsync(
                `UPDATE academic_events SET title = ?, event_type = ?, start_date = ?, end_date = ?, description = ? WHERE id = ?`,
                [value.title, value.type, value.startDate, value.endDate, value.description, id]);
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An event with this title already exists on that date.' });
            throw e;
        }
        audit(req, { action: 'CALENDAR_EVENT_UPDATE', entity: 'academic_events', entityId: id, oldValue: old[0], newValue: value });
        res.json({ success: true });
    }));

    app.delete('/api/academic-events/:id', admin, safe(async (req, res) => {
        const id = idOr400(req, res); if (id === null) return;
        const old = await queryAsync(`${EVENT_SELECT} WHERE id = ?`, [id]);
        if (!old.length) return res.status(404).json({ error: 'Event not found.' });
        await queryAsync('DELETE FROM academic_events WHERE id = ?', [id]);
        audit(req, { action: 'CALENDAR_EVENT_DELETE', entity: 'academic_events', entityId: id, oldValue: old[0] });
        res.json({ success: true });
    }));

    app.post('/api/academic-events/bulk', admin, safe(async (req, res) => {
        const values = checkBulk(req, res, validateEvent);
        if (!values) return;
        await transaction(async (q) => {
            for (const v of values) {
                await q(`INSERT INTO academic_events (title, event_type, start_date, end_date, description, created_by)
                         VALUES (?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE event_type = VALUES(event_type), end_date = VALUES(end_date), description = VALUES(description)`,
                    [v.title, v.type, v.startDate, v.endDate, v.description, req.user.id]);
            }
        });
        audit(req, { action: 'CALENDAR_EVENT_BULK_IMPORT', entity: 'academic_events', newValue: { rows: values.length } });
        res.json({ success: true, saved: values.length });
    }));
};
