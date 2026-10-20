import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import ResetPasswordAction from '../../components/ResetPasswordAction';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/confirm';
import useLoad from '../../hooks/useLoad';
import { plural } from '../../utils/dashboardUi';
import { ListHeader, FilterBar, LoadState, FormError, FieldLabel, ModalActions, RowActions, IconAction, primaryBtn } from '../../components/admin/ListParts';

const EMPTY = { full_name: '', phone: '', email: '', username: '', password: '', student_ids: [] };
const URLS = ['/parents', '/students'];

const AdminParents = () => {
    const { data, loading, error, reload } = useLoad(URLS);
    const parents = data ? data[0] : [];
    const students = data ? data[1] : [];
    const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
    const [linkFilter, setLinkFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [wardSearch, setWardSearch] = useState('');
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const confirm = useConfirm();

    const term = search.trim().toLowerCase();
    const shown = parents.filter((p) =>
        (!linkFilter || (linkFilter === 'none' ? !p.student_name : !!p.student_name)) &&
        (!term || [p.name, p.student_name, p.username, p.phone, p.email].some((v) => (v || '').toLowerCase().includes(term))));
    const unlinked = parents.filter((p) => !p.student_name).length;

    const wTerm = wardSearch.trim().toLowerCase();
    const wardOptions = students.filter((s) => form.student_ids.includes(s.student_id) ||
        !wTerm || [s.full_name, s.enrollment_number, s.roll_number].some((v) => (v || '').toLowerCase().includes(wTerm)));

    const openNew = () => { setEditingId(null); setForm(EMPTY); setWardSearch(''); setFormError(''); setModalOpen(true); };
    const openEdit = (p) => {
        setEditingId(p.id);
        setForm({ full_name: p.name, phone: p.phone || '', email: p.email || '', username: p.username, password: '', student_ids: p.student_ids ? p.student_ids.split(',').map(Number) : [] });
        setWardSearch(''); setFormError(''); setModalOpen(true);
    };

    const submit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            if (editingId) await api.put(`/parents/${editingId}`, form);
            else await api.post('/parents', form);
            setModalOpen(false);
            toast.success(editingId ? 'Parent account updated.' : 'Parent account created.');
            reload();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Could not save the parent account.');
        } finally { setSaving(false); }
    };

    const remove = async (p) => {
        if (!(await confirm({ title: `Delete ${p.name}'s account?`, message: 'Their login will stop working and the account cannot be recovered.', confirmText: 'Delete', tone: 'danger' }))) return;
        try {
            await api.delete(`/parents/${p.id}`);
            toast.success('Parent account deleted.');
            reload();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not delete the parent account.');
        }
    };

    const columns = [
        { header: 'Parent', accessor: 'name', cell: (r) => (
            <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{r.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{r.username}</div>
            </div>
        ) },
        { header: 'Contact', accessor: 'contact', cell: (r) => (
            <div>
                <div className="text-sm text-slate-900 dark:text-slate-200">{r.phone || 'No phone'}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{r.email || 'No email'}</div>
            </div>
        ) },
        { header: 'Linked wards', accessor: 'student_name', cell: (r) => r.student_name
            ? <span className="font-semibold text-slate-900 dark:text-slate-100">{r.student_name}</span>
            : <span className="font-semibold text-amber-700 dark:text-amber-400">None linked</span> },
        { header: '', accessor: 'actions', cell: (r) => (
            <RowActions>
                <ResetPasswordAction kind="parent" id={r.id} name={r.name} />
                <IconAction label={`Edit ${r.name}`} onClick={() => openEdit(r)}><Edit2 size={16} /></IconAction>
                <IconAction label={`Delete ${r.name}`} tone="rose" onClick={() => remove(r)}><Trash2 size={16} /></IconAction>
            </RowActions>
        ) }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <ListHeader title="Parents"
                line={data ? `${plural(parents.length, 'parent account')}${unlinked ? ` · ${unlinked} with no linked ward` : ''}` : 'Parent access and linked students.'}
                actions={<button type="button" onClick={openNew} className={primaryBtn}><Plus size={16} /> Add parent</button>} />
            <LoadState loading={loading} error={error} onRetry={reload}>
                <FilterBar search={search} onSearch={setSearch} placeholder="Search name, ward, username or phone" noun="parents"
                    shown={shown.length} total={parents.length} onClear={() => { setSearch(''); setLinkFilter(''); }}
                    filters={[{ id: 'link', label: 'Ward link', value: linkFilter, onChange: setLinkFilter, allLabel: 'All parents',
                        options: [{ value: 'none', label: 'No linked ward' }, { value: 'linked', label: 'Has a linked ward' }] }]} />
                <Table columns={columns} data={shown} pageSize={10}
                    emptyText={parents.length ? 'No parent matches these filters.' : 'No parent accounts yet. Add the first one.'} />
            </LoadState>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit parent' : 'Register parent'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormError message={formError} />
                    <Input label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                        <FieldLabel htmlFor="ward-search">Linked wards ({form.student_ids.length} selected)</FieldLabel>
                        <input id="ward-search" type="search" value={wardSearch} onChange={(e) => setWardSearch(e.target.value)} placeholder="Search students by name, enrollment or roll"
                            className="w-full mb-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-white dark:bg-slate-900">
                            {wardOptions.length === 0 && <p className="p-3 text-sm text-slate-500 dark:text-slate-400">No student matches.</p>}
                            {wardOptions.map((s) => (
                                <label key={s.student_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                    <input type="checkbox" checked={form.student_ids.includes(s.student_id)}
                                        onChange={(e) => setForm((prev) => ({ ...prev, student_ids: e.target.checked ? [...prev.student_ids, s.student_id] : prev.student_ids.filter((id) => id !== s.student_id) }))} />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{s.full_name} ({s.enrollment_number})</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required disabled={!!editingId} />
                            {!editingId && <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />}
                        </div>
                    </div>
                    <ModalActions onCancel={() => setModalOpen(false)} busy={saving} submitLabel={editingId ? 'Save changes' : 'Create account'} />
                </form>
            </Modal>
        </div>
    );
};

export default AdminParents;
