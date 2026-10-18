const sem = { key: 'semester', label: 'Semester', type: 'semester' };
const course = { key: 'course_id', label: 'Course', type: 'course' };
const subj = (required = true) => ({ key: 'subject_id', label: 'Subject', type: 'subject', required });
const from = (required) => ({ key: 'from', label: 'From', type: 'date', required });
const to = (required) => ({ key: 'to', label: 'To', type: 'date', required });

const adminAttendance = [course, sem, { ...subj(false) }, from(false), to(false)];

export const REPORTS = {
    admin: [
        { group: 'People', name: 'students', title: 'Student directory', desc: 'Contact and guardian details for a course or semester.',
            filters: [course, sem, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Graduated', 'Suspended', 'All'], initial: 'Active' }] },
        { group: 'Attendance', name: 'attendance-summary', title: 'Attendance summary', desc: 'Present, absent and late counts per student.', filters: adminAttendance },
        { group: 'Attendance', name: 'attendance-low', title: 'Low attendance list', desc: 'Students below the limit, with classes needed to recover.',
            filters: [...adminAttendance,
                { key: 'below', label: 'Below %', type: 'number', initial: '75' },
                { key: 'min_classes', label: 'Min. classes held', type: 'number', initial: '5' }] },
        { group: 'Attendance', name: 'attendance-sheet', title: 'Monthly attendance sheet', desc: 'Class-by-class register for one subject and month.',
            filters: [subj(), { key: 'month', label: 'Month', type: 'month', required: true }] },
        { group: 'Academics', name: 'marks-sheet', title: 'Marks sheet', desc: 'Raw marks for every assessment of a subject (no grades).', filters: [subj()] },
        { group: 'Fees', name: 'fees-outstanding', title: 'Outstanding fees', desc: 'Unpaid and part-paid fees, with days overdue.',
            filters: [course, sem, { key: 'fee_type', label: 'Fee type', type: 'select', options: ['', 'Tuition', 'Hostel', 'Library Fine', 'Exam'] },
                { key: 'overdue_only', label: 'Overdue only', type: 'checkbox' }] },
        { group: 'Fees', name: 'fees-by-course', title: 'Fee summary by course', desc: 'Billed, collected and outstanding per course and semester.',
            filters: [course, sem, { key: 'fee_type', label: 'Fee type', type: 'select', options: ['', 'Tuition', 'Hostel', 'Library Fine', 'Exam'] }] },
        { group: 'Fees', name: 'fees-collection', title: 'Fee collection by day', desc: 'Money received each day, split by payment method.', filters: [from(true), to(true)] },
        { group: 'Fees', name: 'payments', title: 'Payments ledger', desc: 'Every payment with receipt number and who recorded it.',
            filters: [from(true), to(true), { key: 'method', label: 'Method', type: 'select', options: ['', 'Online', 'Cash', 'Bank Transfer'] }] },
        { group: 'Hostel', name: 'hostel-occupancy', title: 'Hostel occupancy', desc: 'Who is in which room.',
            filters: [{ key: 'hostel_id', label: 'Hostel', type: 'hostel' },
                { key: 'status', label: 'Status', type: 'select', options: ['Allotted', 'Vacated', 'All'], initial: 'Allotted' }] }
    ],
    teacher: [
        { group: 'Attendance', name: 'attendance-sheet', title: 'Monthly attendance sheet', desc: 'Class-by-class register for one of your subjects.',
            filters: [subj(), { key: 'month', label: 'Month', type: 'month', required: true }] },
        { group: 'Attendance', name: 'attendance-summary', title: 'Attendance summary', desc: 'Present, absent and late counts per student.', filters: [subj(), from(false), to(false)] },
        { group: 'Attendance', name: 'attendance-low', title: 'Low attendance list', desc: 'Students below the limit in your subject.',
            filters: [subj(), from(false), to(false),
                { key: 'below', label: 'Below %', type: 'number', initial: '75' },
                { key: 'min_classes', label: 'Min. classes held', type: 'number', initial: '5' }] },
        { group: 'Academics', name: 'marks-sheet', title: 'Marks sheet', desc: 'Raw marks for every assessment of your subject.', filters: [subj()] }
    ],
    student: [
        { group: 'My records', name: 'my-attendance', title: 'Attendance statement', desc: 'Subject-wise summary or day-by-day list.',
            filters: [{ key: 'view', label: 'View', type: 'select', options: ['summary', 'daily'], labels: { summary: 'Subject summary', daily: 'Day by day' }, initial: 'summary' }, from(false), to(false)] },
        { group: 'My records', name: 'my-fees', title: 'Fee statement', desc: 'Fees due and paid, or your payment history.',
            filters: [{ key: 'view', label: 'View', type: 'select', options: ['fees', 'payments'], labels: { fees: 'Fees', payments: 'Payment history' }, initial: 'fees' }] }
    ]
};
REPORTS.parent = REPORTS.student.map((r) => ({ ...r, filters: [{ key: 'student_id', label: 'Student', type: 'ward', required: true }, ...r.filters] }));

export const initialValues = (report) => {
    const v = {};
    report.filters.forEach((f) => { v[f.key] = f.initial ?? (f.type === 'checkbox' ? false : ''); });
    return v;
};
