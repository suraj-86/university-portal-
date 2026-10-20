import React, { useState } from 'react';
import { Plus, Edit2, Trash2, KeyRound } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import ResetPasswordAction from '../../components/ResetPasswordAction';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/confirm';
import useLoad from '../../hooks/useLoad';
import { plural } from '../../utils/dashboardUi';
import { ListHeader, FilterBar, LoadState, FormError, FieldLabel, ModalActions, RowActions, IconAction, primaryBtn, modalSelectCls } from '../../components/admin/ListParts';

const EMPTY = { full_name: '', email: '', employee_id: '', department: '', qualification: '', designation: 'Assistant Professor', password: '' };
const DESIGNATIONS = ['Professor', 'Assistant Professor', 'Guest Lecturer'];
const URLS = ['/teachers', '/courses'];

const AdminTeachers = () => {
    const { data, loading, error, reload } = useLoad(URLS);
    const [teachers, courses] = data || [[], []];
    const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
    const [deptFilter, setDeptFilter] = useState('');
    const [desigFilter, setDesigFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const confirm = useConfirm();

    const departments = [...new Set(courses.map((c) => c.department).filter(Boolean))].sort();
    const teacherDepts = [...new Set(teachers.map((t) => t.department).filter(Boolean))].sort();
    const term = search.trim().toLowerCase();
    const shown = teachers.filter((t) =>
        (!deptFilter || t.department === deptFilter) &&
        (!desigFilter || t.designation === desigFilter) &&
        (!term || [t.full_name, t.employee_id, t.email].some((v) => (v || '').toLowerCase().includes(term))));

    const openNew = () => { setEditingId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); };
    const openEdit = (t) => { setEditingId(t.teacher_id); setForm({ ...t, password: '' }); setFormError(''); setModalOpen(true); };

    const submit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            if (editingId) await api.put(`/teachers/${editingId}`, form);
            else await api.post('/teachers', form);
            setModalOpen(false);
            toast.success(editingId ? 'Faculty record updated.' : 'Faculty member registered.');
            reload();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Could not save the faculty record.');
        } finally { setSaving(false); }
    };

    const remove = async (t) => {
        if (!(await confirm({ title: `Remove ${t.full_name}?`, message: 'Their record and login will be removed. This cannot be undone.', confirmText: 'Delete', tone: 'danger' }))) return;
        try {
            await api.delete(`/teachers/${t.teacher_id}`);
            toast.success('Faculty member removed.');
            reload();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not remove this faculty member. They may still be assigned to subjects.');
        }
    };

    const columns = [
        { header: 'Emp ID', accessor: 'employee_id', cell: (r) => <span className="font-black text-slate-900 dark:text-slate-100">{r.employee_id}</span> },
        { header: 'Faculty', accessor: 'full_name', cell: (r) => (
            <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{r.full_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{r.email}</div>
            </div>
        ) },
        { header: 'Department', accessor: 'department' },
        { header: 'Designation', accessor: 'designation' },
        { header: '', accessor: 'actions', cell: (r) => (
            <RowActions>
                <ResetPasswordAction kind="teacher" id={r.teacher_id} name={r.full_name} />
                <IconAction label={`Edit ${r.full_name}`} onClick={() => openEdit(r)}><Edit2 size={16} /></IconAction>
                <IconAction label={`Delete ${r.full_name}`} tone="rose" onClick={() => remove(r)}><Trash2 size={16} /></IconAction>
            </RowActions>
        ) }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <ListHeader title="Teachers"
                line={data ? `${plural(teachers.length, 'faculty member')} · ${plural(teacherDepts.length, 'department')}` : 'Teaching staff and department assignments.'}
                actions={<button type="button" onClick={openNew} className={primaryBtn}><Plus size={16} /> Add faculty</button>} />
            <LoadState loading={loading} error={error} onRetry={reload}>
                <FilterBar search={search} onSearch={setSearch} placeholder="Search name, employee ID or email" noun="faculty"
                    shown={shown.length} total={teachers.length} onClear={() => { setSearch(''); setDeptFilter(''); setDesigFilter(''); }}
                    filters={[
                        { id: 'dept', label: 'Department', value: deptFilter, onChange: setDeptFilter, options: teacherDepts.map((d) => ({ value: d, label: d })) },
                        { id: 'desig', label: 'Designation', value: desigFilter, onChange: setDesigFilter, allLabel: 'All designations', options: DESIGNATIONS.map((d) => ({ value: d, label: d })) }
                    ]} />
                <Table columns={columns} data={shown} pageSize={10}
                    emptyText={teachers.length ? 'No faculty member matches these filters.' : 'No faculty yet. Add the first one.'} />
            </LoadState>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit faculty record' : 'Register faculty'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormError message={formError} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                        <Input label="Employee ID" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required />
                        <Input label="Email Address" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        <div>
                            <FieldLabel htmlFor="t-dept">Department</FieldLabel>
                            <select id="t-dept" required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={modalSelectCls}>
                                <option value="">Select department</option>
                                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <FieldLabel htmlFor="t-desig">Designation</FieldLabel>
                            <select id="t-desig" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className={modalSelectCls}>
                                {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <Input label="Qualification" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} required />
                    </div>
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                        <h4 className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2"><KeyRound size={14} /> Security</h4>
                        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingId ? 'Leave blank to keep current' : 'Set initial password'} required={!editingId} />
                    </div>
                    <ModalActions onCancel={() => setModalOpen(false)} busy={saving} submitLabel={editingId ? 'Save changes' : 'Register faculty'} />
                </form>
            </Modal>
        </div>
    );
};

export default AdminTeachers;
