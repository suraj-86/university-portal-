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
import { ListHeader, FilterBar, LoadState, FormError, ModalActions, RowActions, IconAction, primaryBtn } from '../../components/admin/ListParts';

const EMPTY = { course_code: '', course_name: '', department: 'Computer Science', duration_years: 3, total_semesters: 6 };
const URLS = ['/courses'];

const AdminCourses = () => {
    const { data, loading, error, reload } = useLoad(URLS);
    const courses = data ? data[0] : [];
    const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
    const [department, setDepartment] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const confirm = useConfirm();

    const departments = [...new Set(courses.map((c) => c.department).filter(Boolean))].sort();
    const term = search.trim().toLowerCase();
    const shown = courses.filter((c) =>
        (!department || c.department === department) &&
        (!term || [c.course_code, c.course_name, c.department].some((v) => (v || '').toLowerCase().includes(term))));

    const openNew = () => { setEditingId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); };
    const openEdit = (c) => { setEditingId(c.id); setForm({ ...c }); setFormError(''); setModalOpen(true); };

    const submit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            if (editingId) await api.put(`/courses/${editingId}`, form);
            else await api.post('/courses', form);
            setModalOpen(false);
            toast.success(editingId ? 'Course updated.' : 'Course created.');
            reload();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Could not save the course.');
        } finally { setSaving(false); }
    };

    const remove = async (c) => {
        if (!(await confirm({ title: `Delete ${c.course_code}?`, message: `${c.course_name} will be removed. This cannot be undone.`, confirmText: 'Delete', tone: 'danger' }))) return;
        try {
            await api.delete(`/courses/${c.id}`);
            toast.success('Course deleted.');
            reload();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not delete the course. It may still have students or subjects.');
        }
    };

    const columns = [
        { header: 'Code', accessor: 'course_code', cell: (r) => <span className="font-black text-slate-900 dark:text-slate-100">{r.course_code}</span> },
        { header: 'Course', accessor: 'course_name', cell: (r) => (
            <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{r.course_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{r.department}</div>
            </div>
        ) },
        { header: 'Duration', accessor: 'duration_years', cell: (r) => <span className="text-slate-600 dark:text-slate-300">{plural(Number(r.duration_years), 'year')} · {plural(Number(r.total_semesters), 'semester')}</span> },
        { header: '', accessor: 'actions', cell: (r) => (
            <RowActions>
                <IconAction label={`Edit ${r.course_code}`} onClick={() => openEdit(r)}><Edit2 size={16} /></IconAction>
                <IconAction label={`Delete ${r.course_code}`} tone="rose" onClick={() => remove(r)}><Trash2 size={16} /></IconAction>
            </RowActions>
        ) }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <ListHeader title="Courses"
                line={data ? `${plural(courses.length, 'course')} · ${plural(departments.length, 'department')}` : 'Degree programs and their structure.'}
                actions={<button type="button" onClick={openNew} className={primaryBtn}><Plus size={16} /> New course</button>} />
            <LoadState loading={loading} error={error} onRetry={reload}>
                <FilterBar search={search} onSearch={setSearch} placeholder="Search code, name or department" noun="courses"
                    shown={shown.length} total={courses.length} onClear={() => { setSearch(''); setDepartment(''); }}
                    filters={departments.length > 1 ? [{ id: 'dept', label: 'Department', value: department, onChange: setDepartment, options: departments.map((d) => ({ value: d, label: d })) }] : []} />
                <Table columns={columns} data={shown} pageSize={10}
                    emptyText={courses.length ? 'No course matches these filters.' : 'No courses yet. Add the first one.'} />
            </LoadState>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit course' : 'New course'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormError message={formError} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Course Code" value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value.toUpperCase() })} placeholder="e.g. BCA" required />
                        <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Computer Science" required />
                    </div>
                    <Input label="Full Course Name" value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} placeholder="Bachelor of Computer Applications" required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Duration (Years)" type="number" value={form.duration_years} onChange={(e) => setForm({ ...form, duration_years: e.target.value })} required />
                        <Input label="Total Semesters" type="number" value={form.total_semesters} onChange={(e) => setForm({ ...form, total_semesters: e.target.value })} required />
                    </div>
                    <ModalActions onCancel={() => setModalOpen(false)} busy={saving} submitLabel={editingId ? 'Save changes' : 'Create course'} />
                </form>
            </Modal>
        </div>
    );
};

export default AdminCourses;
