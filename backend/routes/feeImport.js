const { str, isValidDate } = require('../lib/validate');

const MAX_ROWS = 300;
const FEE_TYPES = ['Tuition', 'Hostel', 'Library Fine', 'Exam'];
const MAX_AMOUNT = 99999999.99;

const validateRow = (raw) => {
    const b = raw || {};
    const enrollment = str(b.enrollment_number);
    const semesterText = str(b.semester);
    const typeText = str(b.fee_type);
    const amountText = str(b.total_fee).replace(/[,\s₹]/g, '').replace(/^rs\.?/i, '');
    const dueDate = str(b.due_date);

    if (!enrollment) return { error: 'Enrollment number is required.' };
    if (!/^\d{1,2}$/.test(semesterText) || Number(semesterText) < 1) return { error: 'Semester must be a whole number, 1 or more.' };
    const feeType = FEE_TYPES.find((t) => t.toLowerCase() === typeText.toLowerCase());
    if (!feeType) return { error: `Fee type must be one of: ${FEE_TYPES.join(', ')}.` };
    if (!/^\d+(\.\d{1,2})?$/.test(amountText) || Number(amountText) <= 0 || Number(amountText) > MAX_AMOUNT) {
        return { error: 'Total fee must be a positive amount (up to 2 decimals).' };
    }
    if (!isValidDate(dueDate)) return { error: 'Due date must be a valid date (YYYY-MM-DD).' };
    return { value: { enrollment, semester: Number(semesterText), feeType, total: Number(amountText), dueDate } };
};

const makeNotifier = require('../lib/notify');

module.exports = (app, { queryAsync, transaction, verifyRole, audit }) => {
    const notifier = makeNotifier(queryAsync);
    const prepare = async (rows) => {
        const errors = [];
        const items = [];
        const firstSeen = new Map();
        rows.forEach((r, i) => {
            const rowNo = (r && Number(r.row)) || i + 1;
            const result = validateRow(r);
            if (result.error) return errors.push({ row: rowNo, error: result.error });
            const v = result.value;
            const key = `${v.enrollment.toLowerCase()}|${v.semester}|${v.feeType}`;
            if (firstSeen.has(key)) return errors.push({ row: rowNo, error: `Same student, semester and fee type as row ${firstSeen.get(key)}.` });
            firstSeen.set(key, rowNo);
            items.push({ row: rowNo, ...v });
        });

        if (items.length) {
            const students = await queryAsync(
                'SELECT student_id, enrollment_number, status FROM students WHERE enrollment_number IN (?)',
                [[...new Set(items.map((it) => it.enrollment))]]);
            const byEnrollment = new Map(students.map((s) => [String(s.enrollment_number).toLowerCase(), s]));
            const known = items.filter((it) => byEnrollment.has(it.enrollment.toLowerCase()));
            let fees = [];
            if (known.length) {
                fees = await queryAsync(
                    'SELECT id, student_id, semester, fee_type, paid_amount FROM fees WHERE student_id IN (?)',
                    [[...new Set(known.map((it) => byEnrollment.get(it.enrollment.toLowerCase()).student_id))]]);
            }
            const feeMap = new Map(fees.map((f) => [`${f.student_id}|${f.semester}|${f.fee_type}`, f]));

            const keep = [];
            items.forEach((it) => {
                const s = byEnrollment.get(it.enrollment.toLowerCase());
                if (!s) return errors.push({ row: it.row, error: `No student with enrollment number "${it.enrollment}".` });
                const existing = feeMap.get(`${s.student_id}|${it.semester}|${it.feeType}`);
                if (existing) {
                    if (Number(existing.paid_amount) > it.total) {
                        return errors.push({ row: it.row, error: `Total fee is less than the ${Number(existing.paid_amount).toFixed(2)} already paid.` });
                    }
                    return keep.push({ ...it, action: 'update', studentId: s.student_id });
                }
                if (s.status !== 'Active') return errors.push({ row: it.row, error: `Student is ${s.status}; fees can only be added for active students.` });
                keep.push({ ...it, action: 'create', studentId: s.student_id });
            });
            errors.sort((a, b) => a.row - b.row);
            return { items: keep, errors };
        }
        errors.sort((a, b) => a.row - b.row);
        return { items, errors };
    };

    app.post('/api/fees/import', verifyRole(['admin']), async (req, res) => {
        try {
            const rows = req.body && req.body.rows;
            if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'No rows to import.' });
            if (rows.length > MAX_ROWS) return res.status(400).json({ error: `Too many rows (max ${MAX_ROWS} per import). Split the file.` });

            const { items, errors } = await prepare(rows);
            const create = items.filter((it) => it.action === 'create').length;
            const update = items.length - create;

            if (req.body.dry_run) {
                return res.json({ dry_run: true, total: rows.length, create, update, actions: items.map((it) => ({ row: it.row, action: it.action })), errors });
            }
            if (errors.length) return res.status(400).json({ error: 'Some rows are invalid. Nothing was imported.', errors: errors.slice(0, 100) });

            await transaction(async (q) => {
                for (const it of items) {
                    await q(
                        `INSERT INTO fees (student_id, semester, fee_type, total_fee, paid_amount, due_date, status)
                         VALUES (?, ?, ?, ?, 0, ?, 'Pending')
                         ON DUPLICATE KEY UPDATE total_fee = VALUES(total_fee), due_date = VALUES(due_date),
                            status = CASE WHEN paid_amount >= VALUES(total_fee) THEN 'Paid' WHEN paid_amount > 0 THEN 'Partial' ELSE 'Pending' END`,
                        [it.studentId, it.semester, it.feeType, it.total, it.dueDate]);
                }
            });
            audit(req, { action: 'FEE_BULK_IMPORT', entity: 'fees', newValue: { created: create, updated: update } });
            notifier.run(async () => {
                const fresh = items.filter((it) => it.action === 'create');
                const family = await notifier.familyByStudent(fresh.map((it) => it.studentId));
                await notifier.sendMany(fresh.flatMap((it) => (family.get(it.studentId) || []).map((userId) => ({
                    userId, type: 'fee', section: 'fees', title: 'New fee assigned',
                    body: `${it.feeType}: ₹${Number(it.total).toLocaleString('en-IN')} due by ${String(it.dueDate).slice(0, 10)}.`
                }))));
            });
            res.json({ success: true, saved: items.length, created: create, updated: update });
        } catch (e) {
            console.error('Fee import error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Nothing was imported.' });
        }
    });
};
