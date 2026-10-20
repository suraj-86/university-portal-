import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck, UploadCloud, Download } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import toast from 'react-hot-toast';
import CsvImportModal from '../../components/CsvImportModal';
import ResetPasswordAction from '../../components/ResetPasswordAction';
import { downloadTextFile } from '../../utils/csv';
import { toCSV } from '../../utils/spreadsheet';
import { useConfirm } from '../../context/confirm';
import useLoad from '../../hooks/useLoad';
import { plural } from '../../utils/dashboardUi';
import { ListHeader, FilterBar, LoadState, FormError, FieldLabel, ModalActions, RowActions, IconAction, primaryBtn, secondaryBtn, modalSelectCls } from '../../components/admin/ListParts';

const IMPORT_HEADERS = ['enrollment_number', 'name', 'course_code', 'semester', 'roll_number', 'email', 'phone', 'password'];
const IMPORT_ALIASES = {
    enrollment_number: ['enrollment_no', 'enrollment', 'enrolment_number', 'enrolment_no'],
    name: ['full_name', 'student_name'],
    course_code: ['course', 'program', 'programme'],
    semester: ['sem'],
    roll_number: ['roll_no', 'roll'],
    phone: ['phone_number', 'mobile', 'mobile_number']
};
const IMPORT_SAMPLE = 'enrollment_number,name,course_code,semester,roll_number,email,phone,password\nAC-001/24,Asha Verma,BCA,1,2401,asha@example.com,9876543210,\n';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const importMapRow = (o) => {
    if (!o.enrollment_number) return { error: 'Enrollment number is required.' };
    if (!o.name) return { error: 'Name is required.' };
    if (!o.course_code) return { error: 'Course code is required.' };
    if (o.semester && !/^\d{1,2}$/.test(o.semester)) return { error: 'Semester must be a whole number.' };
    if (o.email && !EMAIL_RE.test(o.email)) return { error: 'Email address is not valid.' };
    return { value: { ...o } };
};

const EMPTY = { name: '', email: '', enrollment_number: '', roll_number: '', course_id: '', semester: 1, password: '' };
const URLS = ['/students', '/courses'];

const AdminStudents = () => {
    const { data, loading, error, reload } = useLoad(URLS);
    const rawStudents = data ? data[0] : [];
    const courses = data ? data[1] : [];
    const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
    const [courseFilter, setCourseFilter] = useState('');
    const [semFilter, setSemFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [credentials, setCredentials] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const confirm = useConfirm();

    const students = rawStudents.map((s) => ({
        id: s.student_id, user_id: s.user_id, course_id: s.course_id, enrollment_number: s.enrollment_number || '',
        roll_number: s.roll_number || '', name: s.full_name || '', email: s.email, course: s.course_name || 'N/A',
        semester: s.semester, status: s.status || 'Active'
    }));
    const codeOf = new Map(courses.map((c) => [c.id, c.course_code]));
    const filterCourse = courses.find((c) => String(c.id) === courseFilter);
    const semMax = filterCourse ? Number(filterCourse.total_semesters) : Math.max(0, ...courses.map((c) => Number(c.total_semesters)));
    const formCourse = courses.find((c) => String(c.id) === String(form.course_id));
    const formMaxSem = formCourse ? Number(formCourse.total_semesters) : 8;

    const pickCourse = (v) => {
        setCourseFilter(v);
        const c = courses.find((x) => String(x.id) === v);
        if (c && semFilter && Number(semFilter) > Number(c.total_semesters)) setSemFilter('');
    };

    const term = search.trim().toLowerCase();
    const shown = students.filter((s) =>
        (!courseFilter || String(s.course_id) === courseFilter) &&
        (!semFilter || String(s.semester) === semFilter) &&
        (!term || [s.name, s.enrollment_number, s.roll_number, s.email].some((v) => (v || '').toLowerCase().includes(term))));

    const perCourse = courses
        .map((c) => ({ code: c.course_code, n: students.filter((s) => s.course_id === c.id).length }))
        .filter((c) => c.n > 0);
    const line = data
        ? [plural(students.length, 'student'), ...perCourse.slice(0, 4).map((c) => `${c.n} ${c.code}`)].join(' · ')
        : 'Enrollments and academic records.';

    const openNew = () => { setEditingId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); };
    const openEdit = (s) => { setEditingId(s.id); setForm({ ...s, password: '' }); setFormError(''); setModalOpen(true); };

    const submit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            if (editingId) await api.put(`/students/${editingId}`, form);
            else await api.post('/students', form);
            setModalOpen(false);
            toast.success(editingId ? 'Student record updated.' : 'Student account created.');
            reload();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Could not save the student.');
        } finally { setSaving(false); }
    };

    const remove = async (s) => {
        if (!(await confirm({ title: `Delete ${s.name}?`, message: 'The student record and login will be removed. This cannot be undone.', confirmText: 'Delete', tone: 'danger' }))) return;
        try {
            await api.delete(`/students/${s.user_id}`);
            toast.success('Student deleted.');
            reload();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not delete the student.');
        }
    };

    const columns = [
        { header: 'Roll No.', accessor: 'roll_number' },
        { header: 'Enrollment No.', accessor: 'enrollment_number' },
        { header: 'Student', accessor: 'name', cell: (r) => (
            <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{r.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{r.email}</div>
            </div>
        ) },
        { header: 'Course', accessor: 'course', cell: (r) => <span className="font-semibold">{codeOf.get(r.course_id) || r.course}</span> },
        { header: 'Sem', accessor: 'semester' },
        { header: '', accessor: 'actions', cell: (r) => (
            <RowActions>
                <ResetPasswordAction kind="student" id={r.id} name={r.name} />
                <IconAction label={`Edit ${r.name}`} onClick={() => openEdit(r)}><Edit2 size={16} /></IconAction>
                <IconAction label={`Delete ${r.name}`} tone="rose" onClick={() => remove(r)}><Trash2 size={16} /></IconAction>
            </RowActions>
        ) }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <ListHeader title="Students" line={line}
                actions={<>
                    <button type="button" onClick={() => setImportOpen(true)} className={secondaryBtn}><UploadCloud size={16} /> Import Excel/CSV</button>
                    <button type="button" onClick={openNew} className={primaryBtn}><Plus size={16} /> Add student</button>
                </>} />
            <LoadState loading={loading} error={error} onRetry={reload}>
                <FilterBar search={search} onSearch={setSearch} placeholder="Search name, enrollment, roll or email" noun="students"
                    shown={shown.length} total={students.length} onClear={() => { setSearch(''); setCourseFilter(''); setSemFilter(''); }}
                    filters={[
                        { id: 'course', label: 'Course', value: courseFilter, onChange: pickCourse, options: courses.map((c) => ({ value: String(c.id), label: c.course_code })) },
                        { id: 'sem', label: 'Semester', value: semFilter, onChange: setSemFilter, options: Array.from({ length: semMax }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` })) }
                    ]} />
                <Table columns={columns} data={shown} pageSize={10}
                    emptyText={students.length ? 'No student matches these filters.' : 'No students yet. Add one or import a spreadsheet.'} />
            </LoadState>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit student record' : 'Register student'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormError message={formError} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full Name" required />
                        <Input label="Enrollment No." value={form.enrollment_number} onChange={(e) => setForm({ ...form, enrollment_number: e.target.value })} placeholder="AC-000/00" required />
                        <Input label="Roll No." value={form.roll_number} onChange={(e) => setForm({ ...form, roll_number: e.target.value })} placeholder="e.g. 0000000" required />
                        <Input label="Email Address" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
                        <div>
                            <FieldLabel htmlFor="st-course">Course</FieldLabel>
                            <select id="st-course" required value={form.course_id} onChange={(e) => {
                                const c = courses.find((x) => String(x.id) === e.target.value);
                                setForm({ ...form, course_id: e.target.value, semester: c && form.semester > Number(c.total_semesters) ? 1 : form.semester });
                            }} className={modalSelectCls}>
                                <option value="">Select course</option>
                                {courses.map((c) => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <FieldLabel htmlFor="st-sem">Semester</FieldLabel>
                            <select id="st-sem" required value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} className={modalSelectCls}>
                                {Array.from({ length: formMaxSem }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Semester {n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                        <h4 className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldCheck size={14} /> Account security</h4>
                        <Input label="Login Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder={editingId ? 'Leave blank to keep current' : 'Set initial password'} required={!editingId} />
                    </div>
                    <ModalActions onCancel={() => setModalOpen(false)} busy={saving} submitLabel={editingId ? 'Save changes' : 'Create account'} />
                </form>
            </Modal>

            <CsvImportModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                title="Import Students"
                headers={IMPORT_HEADERS}
                required={['enrollment_number', 'name', 'course_code']}
                aliases={IMPORT_ALIASES}
                sample={IMPORT_SAMPLE}
                templateName="students_template.csv"
                mapRow={importMapRow}
                previewKeys={['enrollment_number', 'name', 'course_code', 'semester']}
                maxRows={300}
                note="course_code is the code on the Courses page (e.g. BCA). A new student without a password gets a random one, shown once after the import. A student whose enrollment number already exists is updated; blank cells keep the current value. Tip: format enrollment, roll and phone columns as Text so leading zeros are kept."
                onPreview={(rows) => api.post('/students/bulk', { rows, dry_run: true })}
                onSubmit={(rows) => api.post('/students/bulk', { rows })}
                onDone={(res) => {
                    setImportOpen(false);
                    reload();
                    setCredentials(res?.data?.credentials || []);
                }}
            />

            <Modal isOpen={credentials.length > 0} onClose={() => setCredentials([])} title="New student passwords">
                <div className="space-y-4">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        These passwords are shown only once. Download the list and hand it to the students securely.
                    </p>
                    <div className="max-h-64 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase tracking-wider sticky top-0">
                                <tr><th className="p-2">Enrollment</th><th className="p-2">Name</th><th className="p-2">Password</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                                {credentials.map((c) => (
                                    <tr key={c.enrollment_number}>
                                        <td className="p-2 font-bold">{c.enrollment_number}</td>
                                        <td className="p-2">{c.name}</td>
                                        <td className="p-2 font-mono">{c.password}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        type="button"
                        onClick={() => downloadTextFile('new_student_passwords.csv', toCSV([['enrollment_number', 'name', 'password'], ...credentials.map((c) => [c.enrollment_number, c.name, c.password])]))}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold"
                    >
                        <Download size={16} /> Download passwords (CSV)
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default AdminStudents;