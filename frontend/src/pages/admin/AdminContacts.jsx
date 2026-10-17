import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import ContactDirectory from '../../components/ContactDirectory';
import { OFFICE_GROUPS } from '../../utils/contactGroups';

const AUDIENCES = [
    { value: 'all', label: 'Everyone' },
    { value: 'student', label: 'Students only' },
    { value: 'parent', label: 'Parents only' },
    { value: 'teacher', label: 'Teachers only' }
];
const SCOPES = [
    { value: 'university', label: 'University office', hint: 'VC, Registrar, Director, OSD, Proctorial Board, Mess In-charge…' },
    { value: 'department', label: 'Department', hint: 'HOD, department office, coordinators…' },
    { value: 'course', label: 'Course', hint: 'Course coordinator or class in-charge' }
];
const EMPTY = {
    scope: 'university', category: 'Administration', department: '', course_id: '',
    name: '', designation: '', phone: '', whatsapp: '', email: '', location: '', office_hours: '',
    audience: 'all', sort_order: '0', is_visible: true
};
const selectCls = 'w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none';
const labelCls = 'text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1';
const errorText = (e, fallback) => e.response?.data?.error || fallback;

const AdminContacts = () => {
    const [rows, setRows] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const reload = () => setReloadKey((k) => k + 1);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [c, co] = await Promise.all([api.get('/university-contacts'), api.get('/courses')]);
                if (cancelled) return;
                setRows(c.data);
                setCourses(co.data);
                setLoadError('');
            } catch {
                if (!cancelled) setLoadError('Could not load contacts.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [reloadKey]);

    const departments = useMemo(
        () => [...new Set(courses.map((c) => c.department).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [courses]
    );
    const sortedCourses = useMemo(
        () => courses.slice().sort((a, b) => String(a.course_code).localeCompare(String(b.course_code))),
        [courses]
    );

    const openCreate = () => { setEditingId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); };
    const openEdit = (c) => {
        setEditingId(c.id);
        setForm({
            scope: c.scope,
            category: c.scope === 'university' ? c.category : 'Administration',
            department: c.scope === 'department' ? (c.department || '') : '',
            course_id: c.scope === 'course' ? String(c.course_id) : '',
            name: c.name, designation: c.designation || '', phone: c.phone || '', whatsapp: c.whatsapp || '', email: c.email || '',
            location: c.location || '', office_hours: c.office_hours || '', audience: c.audience,
            sort_order: String(c.sort_order ?? 0), is_visible: !!c.is_visible
        });
        setFormError('');
        setModalOpen(true);
    };
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError('');
        try {
            const payload = { ...form, sort_order: Number(form.sort_order || 0), course_id: form.course_id ? Number(form.course_id) : null };
            if (editingId) await api.put(`/university-contacts/${editingId}`, payload);
            else await api.post('/university-contacts', payload);
            toast.success(editingId ? 'Contact updated.' : 'Contact added.');
            setModalOpen(false);
            reload();
        } catch (err) {
            setFormError(errorText(err, 'Could not save the contact.'));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (c) => {
        if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/university-contacts/${c.id}`);
            toast.success('Contact deleted.');
            reload();
        } catch (err) {
            toast.error(errorText(err, 'Could not delete the contact.'));
        }
    };

    const actions = (c) => (
        <>
            <button onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`} className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"><Edit2 size={16} /></button>
            <button onClick={() => remove(c)} aria-label={`Delete ${c.name}`} className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800"><Trash2 size={16} /></button>
        </>
    );

    const scopeInfo = SCOPES.find((s) => s.value === form.scope);

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">University Contacts</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
                        Shown on the Help &amp; Contacts page. Department and course contacts follow the Courses page; university offices are grouped by type. Only add official contact details.
                    </p>
                </div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 shadow-sm">
                    <Plus size={16} /> Add Contact
                </button>
            </header>

            {loading ? (
                <p className="text-slate-400 font-bold animate-pulse">Loading…</p>
            ) : loadError ? (
                <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-5 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{loadError}</p>
                    <button onClick={() => { setLoading(true); reload(); }} className="text-sm font-bold text-rose-700 dark:text-rose-300 underline">Try again</button>
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
                    <p className="font-bold text-slate-700 dark:text-slate-300">No contacts yet.</p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Start with the Vice Chancellor, Registrar and each department&apos;s head, then add the other offices.</p>
                </div>
            ) : (
                <ContactDirectory contacts={rows} actions={actions} showAudience />
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Contact' : 'Add Contact'}>
                <form onSubmit={submit} className="space-y-4">
                    {formError && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm font-bold text-rose-700 dark:text-rose-300">{formError}</p>}

                    <div className="space-y-1">
                        <label className={labelCls} htmlFor="uc-scope">This contact belongs to</label>
                        <select id="uc-scope" value={form.scope} onChange={set('scope')} className={selectCls}>
                            {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        {scopeInfo && <p className="text-xs font-medium text-slate-400 ml-1">{scopeInfo.hint}</p>}
                    </div>

                    {form.scope === 'university' && (
                        <div className="space-y-1">
                            <label className={labelCls} htmlFor="uc-category">Office group</label>
                            <select id="uc-category" value={form.category} onChange={set('category')} className={selectCls}>
                                {OFFICE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    )}
                    {form.scope === 'department' && (
                        <div className="space-y-1">
                            <label className={labelCls} htmlFor="uc-department">Department</label>
                            <select id="uc-department" value={form.department} onChange={set('department')} className={selectCls} required>
                                <option value="">Choose a department…</option>
                                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                            {departments.length === 0 && <p className="text-xs font-medium text-amber-600 ml-1">No departments found. Add courses first.</p>}
                        </div>
                    )}
                    {form.scope === 'course' && (
                        <div className="space-y-1">
                            <label className={labelCls} htmlFor="uc-course">Course</label>
                            <select id="uc-course" value={form.course_id} onChange={set('course_id')} className={selectCls} required>
                                <option value="">Choose a course…</option>
                                {sortedCourses.map((c) => <option key={c.id} value={c.id}>{c.course_code} · {c.course_name}</option>)}
                            </select>
                        </div>
                    )}

                    <Input label="Name or office" value={form.name} onChange={set('name')} placeholder="e.g. Dr. A. K. Sharma, or Proctorial Board" required />
                    <Input label="Designation (optional)" value={form.designation} onChange={set('designation')} placeholder="e.g. Head of Department, Mess In-charge" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="e.g. 0522-1234567" />
                        <Input label="WhatsApp" value={form.whatsapp} onChange={set('whatsapp')} placeholder="Only if officially used" />
                    </div>
                    <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="office@university.ac.in" />
                    <p className="text-xs font-medium text-slate-400 -mt-2 ml-1">Add at least one of phone, WhatsApp or email.</p>
                    <Input label="Location (optional)" value={form.location} onChange={set('location')} placeholder="e.g. Administrative Block, Room 12" />
                    <Input label="Office hours (optional)" value={form.office_hours} onChange={set('office_hours')} placeholder="e.g. Mon-Sat, 10:00 AM to 5:00 PM" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelCls} htmlFor="uc-audience">Shown to</label>
                            <select id="uc-audience" value={form.audience} onChange={set('audience')} className={selectCls}>
                                {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                            </select>
                        </div>
                        <Input label="Display order" type="number" value={form.sort_order} onChange={set('sort_order')} placeholder="0 shows first" />
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                        <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="w-4 h-4" />
                        Visible on the Help page
                    </label>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminContacts;
