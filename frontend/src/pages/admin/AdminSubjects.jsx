import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/confirm';
import useLoad from '../../hooks/useLoad';
import { plural } from '../../utils/dashboardUi';
import { ListHeader, FilterBar, LoadState, FormError, FieldLabel, ModalActions, RowActions, IconAction, primaryBtn, modalSelectCls } from '../../components/admin/ListParts';

const EMPTY = { subject_code: '', subject_name: '', course_id: '', semester: '', subject_type: 'Core', credits: 3, teacher_id: '' };
const URLS = ['/subjects', '/courses', '/teachers'];

const AdminSubjects = () => {
    const { data, loading, error, reload } = useLoad(URLS);
    const [subjects, courses, teachers] = data || [[], [], []];
    const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
    const [courseFilter, setCourseFilter] = useState('');
    const [semFilter, setSemFilter] = useState('');
    const [teacherFilter, setTeacherFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const confirm = useConfirm();

    const formCourse = courses.find((c) => String(c.id) === String(form.course_id));
    const formMaxSem = formCourse ? Number(formCourse.total_semesters) : 8;
    const filterCourse = courses.find((c) => String(c.id) === courseFilter);
    const semMax = filterCourse ? Number(filterCourse.total_semesters) : Math.max(0, ...courses.map((c) => Number(c.total_semesters)));

    const pickCourse = (v) => {
        setCourseFilter(v);
        const c = courses.find((x) => String(x.id) === v);
        if (c && semFilter && Number(semFilter) > Number(c.total_semesters)) setSemFilter('');
    };

    const term = search.trim().toLowerCase();
    const shown = subjects.filter((s) =>
        (!courseFilter || String(s.course_id) === courseFilter) &&
        (!semFilter || String(s.semester) === semFilter) &&
        (!teacherFilter || String(s.teacher_id) === teacherFilter) &&
        (!term || [s.subject_code, s.subject_name, s.course_name, s.teacher_name].some((v) => (v || '').toLowerCase().includes(term))));
    const taughtBy = new Set(subjects.map((s) => s.teacher_id).filter(Boolean)).size;

    const openNew = () => { setEditingId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); };
    const openEdit = (s) => {
        setEditingId(s.id);
        setForm({ subject_code: s.subject_code, subject_name: s.subject_name, course_id: s.course_id, semester: s.semester, subject_type: s.subject_type, credits: s.credits, teacher_id: s.teacher_id || '' });
        setFormError(''); setModalOpen(true);
    };

    const submit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            const payload = { ...form, credits: Number(form.credits) };
            if (editingId) await api.put(`/subjects/${editingId}`, payload);
            else await api.post('/subjects', payload);
            setModalOpen(false);
            toast.success(editingId ? 'Subject updated.' : 'Subject created.');
            reload();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Could not save the subject.');
        } finally { setSaving(false); }
    };

    const remove = async (s) => {
        if (!(await confirm({ title: `Delete ${s.subject_name}?`, message: 'This cannot be undone.', confirmText: 'Delete', tone: 'danger' }))) return;
        try {
            await api.delete(`/subjects/${s.id}`);
            toast.success('Subject deleted.');
            reload();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not delete the subject. It may already have attendance or marks.');
        }
    };

    const columns = [
        { header: 'Code', accessor: 'subject_code', cell: (r) => <span className="font-black text-slate-900 dark:text-slate-100">{r.subject_code}</span> },
        { header: 'Subject', accessor: 'subject_name', cell: (r) => (
            <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{r.subject_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{r.course_name} · Sem {r.semester} · {plural(Number(r.credits), 'credit')}</div>
            </div>
        ) },
        { header: 'Faculty', accessor: 'teacher_name', cell: (r) => r.teacher_name || <span className="text-amber-700 dark:text-amber-400 font-semibold">Not assigned</span> },
        { header: '', accessor: 'actions', cell: (r) => (
            <RowActions>
                <IconAction label={`Edit ${r.subject_name}`} onClick={() => openEdit(r)}><Edit2 size={16} /></IconAction>
                <IconAction label={`Delete ${r.subject_name}`} tone="rose" onClick={() => remove(r)}><Trash2 size={16} /></IconAction>
            </RowActions>
        ) }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <ListHeader title="Subjects"
                line={data ? `${plural(subjects.length, 'subject')} · ${plural(courses.length, 'course')} · taught by ${plural(taughtBy, 'teacher')}` : 'Curriculum and teacher assignments.'}
                actions={<button type="button" onClick={openNew} className={primaryBtn}><Plus size={16} /> Add subject</button>} />
            <LoadState loading={loading} error={error} onRetry={reload}>
                <FilterBar search={search} onSearch={setSearch} placeholder="Search subject, code, course or teacher" noun="subjects"
                    shown={shown.length} total={subjects.length} onClear={() => { setSearch(''); setCourseFilter(''); setSemFilter(''); setTeacherFilter(''); }}
                    filters={[
                        { id: 'course', label: 'Course', value: courseFilter, onChange: pickCourse, options: courses.map((c) => ({ value: String(c.id), label: c.course_code })) },
                        { id: 'sem', label: 'Semester', value: semFilter, onChange: setSemFilter, options: Array.from({ length: semMax }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` })) },
                        { id: 'teacher', label: 'Teacher', value: teacherFilter, onChange: setTeacherFilter, options: teachers.map((t) => ({ value: String(t.teacher_id), label: t.full_name })) }
                    ]} />
                <Table columns={columns} data={shown} pageSize={10}
                    emptyText={subjects.length ? 'No subject matches these filters.' : 'No subjects yet. Add the first one.'} />
            </LoadState>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit subject' : 'New subject'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormError message={formError} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Subject Name" value={form.subject_name} onChange={(e) => setForm({ ...form, subject_name: e.target.value })} required />
                        <Input label="Subject Code" value={form.subject_code} onChange={(e) => setForm({ ...form, subject_code: e.target.value.toUpperCase() })} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <FieldLabel htmlFor="sub-course">Course</FieldLabel>
                            <select id="sub-course" required value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value, semester: '' })} className={modalSelectCls}>
                                <option value="">Select course</option>
                                {courses.map((c) => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <FieldLabel htmlFor="sub-sem">Semester</FieldLabel>
                            <select id="sub-sem" required value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className={modalSelectCls}>
                                <option value="">Select semester</option>
                                {Array.from({ length: formMaxSem }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Semester {n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <Input label="Credits" type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} placeholder="1 to 10" required />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-1">Whole number from 1 to 10. Used for credits earned, SGPA and CGPA.</p>
                    </div>
                    <div>
                        <FieldLabel htmlFor="sub-teacher">Teacher</FieldLabel>
                        <select id="sub-teacher" required value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className={modalSelectCls}>
                            <option value="">Select teacher</option>
                            {teachers.map((t) => <option key={t.teacher_id} value={t.teacher_id}>{t.full_name}</option>)}
                        </select>
                    </div>
                    <ModalActions onCancel={() => setModalOpen(false)} busy={saving} submitLabel={editingId ? 'Save changes' : 'Create subject'} />
                </form>
            </Modal>
        </div>
    );
};

export default AdminSubjects;
