const { str, isPositiveInt } = require('../lib/validate');
const { publicError } = require('../lib/http');
const createNotifier = require('../lib/notify');

const METHODS = ['Online', 'Bank Transfer', 'Cash'];
const MAX_AMOUNT = 10000000;
const round2 = (n) => Math.round(n * 100) / 100;

class PaymentError extends Error {
    constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}

const isOnlinePaymentOn = async (queryAsync) => {
    const rows = await queryAsync("SELECT setting_value FROM app_settings WHERE setting_key = 'online_payments' LIMIT 1");
    return rows.length > 0 && rows[0].setting_value === 'on';
};

function createPaymentReceiptPdf(receipt) {
    const clean = (value) =>
        String(value ?? 'N/A')
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/[^\x20-\x7E]/g, '?');

    const formatDate = (value) => {
        if (!value) return 'N/A';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const amount = Number(receipt.amount_paid || 0).toLocaleString('en-IN');


    const text = (font, size, x, y, value) =>
        `BT\n/${font} ${size} Tf\n1 0 0 1 ${x} ${y} Tm\n(${clean(value)}) Tj\nET\n`;

    const line = (x1, y1, x2, y2) =>
        `${x1} ${y1} m\n${x2} ${y2} l\nS\n`;

    let content = '';


    content += text('F2', 22, 50, 785, 'University Portal');
    content += text('F1', 12, 50, 765, 'Payment Receipt');

    content += line(50, 748, 545, 748);


    content += text(
        'F1',
        10,
        50,
        720,
        `Receipt ID: ${receipt.id}`
    );

    content += text(
        'F1',
        10,
        50,
        700,
        `Transaction Reference: ${receipt.transaction_reference}`
    );

    content += text(
        'F1',
        10,
        50,
        680,
        `Payment Date: ${formatDate(receipt.payment_date)}`
    );


    content += text('F2', 13, 50, 640, 'Student Details');

    content += line(50, 628, 545, 628);

    content += text(
        'F1',
        11,
        50,
        605,
        `Student Name: ${receipt.student_name}`
    );

    content += text(
        'F1',
        11,
        50,
        580,
        `Roll No: ${receipt.roll_number || 'Not Assigned'}`
    );

    content += text(
        'F1',
        11,
        50,
        555,
        `Course: ${receipt.course_name}`
    );

    content += text(
        'F1',
        11,
        50,
        530,
        `Semester: ${receipt.semester}`
    );


    content += text('F2', 13, 50, 490, 'Payment Details');

    content += line(50, 478, 545, 478);

    content += text(
        'F1',
        11,
        50,
        450,
        `Fee Type: ${receipt.fee_type}`
    );

    content += text(
        'F1',
        11,
        50,
        425,
        `Payment Method: ${receipt.payment_method}`
    );

    content += text(
        'F2',
        14,
        50,
        385,
        `Amount Paid: INR ${amount}`
    );

    content += text(
        'F2',
        11,
        50,
        355,
        'Status: Payment Successful'
    );


    content += line(50, 325, 545, 325);

    content += text(
        'F1',
        9,
        50,
        300,
        'This is a system-generated payment receipt.'
    );

    content += text(
        'F1',
        9,
        50,
        282,
        'Please keep this receipt for your records.'
    );


    const objects = [];

    objects.push(
        '<< /Type /Catalog /Pages 2 0 R >>'
    );

    objects.push(
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'
    );

    objects.push(
        '<< /Type /Page ' +
        '/Parent 2 0 R ' +
        '/MediaBox [0 0 595 842] ' +
        '/Resources << ' +
            '/Font << ' +
                '/F1 4 0 R ' +
                '/F2 5 0 R ' +
            '>> ' +
        '>> ' +
        '/Contents 6 0 R >>'
    );

    objects.push(
        '<< /Type /Font ' +
        '/Subtype /Type1 ' +
        '/BaseFont /Helvetica >>'
    );

    objects.push(
        '<< /Type /Font ' +
        '/Subtype /Type1 ' +
        '/BaseFont /Helvetica-Bold >>'
    );

    objects.push(
        `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\n` +
        `stream\n${content}endstream`
    );


    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

    const offsets = [0];

    objects.forEach((object, index) => {
        offsets.push(
            Buffer.byteLength(pdf, 'binary')
        );

        pdf += `${index + 1} 0 obj\n`;
        pdf += `${object}\n`;
        pdf += 'endobj\n';
    });

    const xrefOffset = Buffer.byteLength(pdf, 'binary');

    pdf += `xref\n`;
    pdf += `0 ${objects.length + 1}\n`;
    pdf += `0000000000 65535 f \n`;

    for (let i = 1; i <= objects.length; i++) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n`;
    pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n`;
    pdf += `${xrefOffset}\n`;
    pdf += `%%EOF`;

    return Buffer.from(pdf, 'binary');
}

module.exports = (app, { queryAsync, transaction, verifyRole, audit }) => {
    const notifier = createNotifier(queryAsync);
    const anyUser = verifyRole(['student', 'parent', 'admin']);

    // Whether students and parents may record a payment themselves (switched by an admin in Settings).
    const checkPayer = async (q, user, studentUserId) => {
        if (user.role === 'admin') return;
        if (user.role === 'student') {
            if (Number(user.id) !== Number(studentUserId)) throw new PaymentError(403, 'You are not authorized to pay this fee.');
            return;
        }
        const linked = await q(
            `SELECT 1 FROM parent_student_map psm
               JOIN parents p ON psm.parent_id = p.parent_id
               JOIN students s ON psm.student_id = s.student_id
              WHERE p.user_id = ? AND s.user_id = ? LIMIT 1`, [user.id, studentUserId]);
        if (linked.length === 0) throw new PaymentError(403, 'This fee does not belong to your linked child.');
    };

    app.post('/api/payments', anyUser, async (req, res) => {
        const b = req.body || {};
        const feeId = Number(b.fee_id);
        const amount = round2(Number(b.amount_paid));
        const method = str(b.payment_method);
        const reference = str(b.transaction_reference).slice(0, 100) || null;

        if (!isPositiveInt(feeId) || !method) return res.status(400).json({ error: 'Please fill all required fields.' });
        if (!METHODS.includes(method)) return res.status(400).json({ error: 'Choose a valid payment method.' });
        if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
            return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
        }

        try {
            if (req.user.role !== 'admin' && !(await isOnlinePaymentOn(queryAsync))) {
                return res.status(403).json({ code: 'ONLINE_PAYMENTS_OFF', error: 'Online payment is switched off. Please pay at the accounts office.' });
            }

            const fee = await transaction(async (q) => {
                // Lock the fee row so two simultaneous payments cannot both pass the balance check.
                const rows = await q(
                    `SELECT f.student_id, f.fee_type, f.total_fee, f.paid_amount, s.user_id AS student_user_id
                       FROM fees f JOIN students s ON f.student_id = s.student_id
                      WHERE f.id = ? FOR UPDATE`, [feeId]);
                if (rows.length === 0) throw new PaymentError(404, 'Fee record not found.');
                const row = rows[0];
                await checkPayer(q, req.user, row.student_user_id);

                const remaining = round2(Number(row.total_fee) - Number(row.paid_amount));
                if (amount > remaining + 0.001) throw new PaymentError(400, `Amount exceeds the outstanding balance (${remaining}).`);

                const newPaid = Math.min(round2(Number(row.paid_amount) + amount), Number(row.total_fee));
                await q(
                    'INSERT INTO payments (fee_id, amount_paid, payment_method, transaction_reference, processed_by, payment_date) VALUES (?, ?, ?, ?, ?, NOW())',
                    [feeId, amount, method, reference, req.user.role === 'admin' ? req.user.id : null]);
                await q('UPDATE fees SET paid_amount = ?, status = ? WHERE id = ?',
                    [newPaid, newPaid >= Number(row.total_fee) ? 'Paid' : 'Partial', feeId]);
                return row;
            });

            audit(req, { action: 'PAYMENT_CREATE', entity: 'fees', entityId: feeId, newValue: { amount_paid: amount, payment_method: method, transaction_reference: reference } });
            notifier.run(async () => {
                const family = (await notifier.familyByStudent([fee.student_id])).get(fee.student_id) || [];
                await notifier.send(family, {
                    type: 'payment', section: 'fees', refId: feeId, title: 'Payment received',
                    body: `\u20b9${amount.toLocaleString('en-IN')} received towards ${fee.fee_type}.`
                });
            });
            res.json({ success: true, message: 'Payment processed successfully!' });
        } catch (e) {
            if (e instanceof PaymentError) return res.status(e.status).json({ error: e.message, ...e.extra });
            res.status(500).json({ error: publicError(e) });
        }
    });

    app.get('/api/payments/:id/receipt', verifyRole(['student', 'parent', 'admin']), async (req, res) => {
        const paymentId = Number(req.params.id);

        if (!Number.isInteger(paymentId) || paymentId <= 0) {
            return res.status(400).json({ error: "Invalid payment identifier." });
        }

        const sql = `
            SELECT
                p.id,
                p.transaction_reference,
                p.payment_date,
                p.amount_paid,
                p.payment_method,
                f.fee_type,
                s.user_id AS student_user_id,
                s.full_name AS student_name,
                s.roll_number,
                s.semester,
                c.course_name
            FROM payments p
            JOIN fees f ON p.fee_id = f.id
            JOIN students s ON f.student_id = s.student_id
            JOIN courses c ON s.course_id = c.id
            WHERE p.id = ?
            LIMIT 1
        `;

        try {
            const rows = await queryAsync(sql, [paymentId]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Payment not found." });
            }

            const payment = rows[0];

            if (req.user.role === 'student' && Number(req.user.id) !== Number(payment.student_user_id)) {
                return res.status(403).json({ error: "You are not authorized to access this receipt." });
            }

            if (req.user.role === 'parent') {
                const parentRows = await queryAsync(`
                    SELECT 1
                    FROM parent_student_map psm
                    JOIN parents p ON p.parent_id = psm.parent_id
                    JOIN students s ON s.student_id = psm.student_id
                    WHERE p.user_id = ? AND s.user_id = ?
                    LIMIT 1
                `, [req.user.id, payment.student_user_id]);

                if (parentRows.length === 0) {
                    return res.status(403).json({ error: "You are not authorized to access this receipt." });
                }
            }

            const pdf = createPaymentReceiptPdf(payment);
            const safeReference = String(payment.transaction_reference || payment.id).replace(/[^a-zA-Z0-9_-]/g, '_');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="payment-receipt-${safeReference}.pdf"`);
            res.setHeader('Content-Length', pdf.length);
            return res.send(pdf);
        } catch (error) {
            console.error("Payment receipt error:", error);
            return res.status(500).json({ error: "Failed to generate payment receipt." });
        }
    });

};
