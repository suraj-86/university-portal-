import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit2, Trash2, Megaphone, Search, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import { relativeTime, fullDateTime, refreshInbox } from '../../utils/format';
import { useConfirm } from '../../context/confirm';

const CATEGORIES = ['University', 'Department', 'Academic', 'Event', 'Other'];
const AUDIENCES = [
    { id: 'all', label: 'Everyone' },
    { id: 'student', label: 'Students' },
    { id: 'parent', label: 'Parents' },
    { id: 'teacher', label: 'Teachers' }
];
const CATEGORY_STYLES = {
    University: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
    Department: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    Academic: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    Event: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    Other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
};
const EMPTY = { title: '', content: '', category: 'University', audience: 'all', course_id: '', semester: '', priority: 'Normal', pinned: false };
const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
const labelCls = 'mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400';

const audienceText = (a) => {
    const base = AUDIENCES.find((x) => x.id === a.audience)?.label || 'Everyone';
    if (!a.course_id) return base;
    return `${base} · ${a.course_name || 'Course'}${a.semester ? ` · Sem ${a.semester}` : ''}`;
};

const Announcements = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [category, setCategory] = useState('All');
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(null);
    const [courses, setCourses] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/announcements');
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            setError(e.response?.data?.error || 'Could not load announcements.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (isAdmin) api.get('/courses').then((r) => setCourses(r.data || [])).catch(() => setCourses([]));
    }, [isAdmin]);

    const markRead = async (ids) => {
        if (isAdmin || !ids.length) return;
        setItems((cur) => cur.map((a) => (ids.includes(a.id) ? { ...a, is_read: true } : a)));
        try { await api.post('/announcements/read', { ids }); refreshInbox(); } catch (e) { }
    };

    const toggle = (a) => {
        const next = expanded === a.id ? null : a.id;
        setExpanded(next);
        if (next && !a.is_read) markRead([a.id]);
    };

    const unread = items.filter((a) => !a.is_read);
    const markAll = async () => { await markRead(unread.slice(0, 200).map((a) => a.id)); toast.success('All announcements marked as read.'); };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items.filter((a) => (category === 'All' || a.category === category) && (!q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)));
    }, [items, category, query]);

    const openAdd = () => { setEditingId(null); setForm(EMPTY); setModalOpen(true); };
    const openEdit = (a) => {
        setEditingId(a.id);
        setForm({ title: a.title, content: a.content, category: a.category, audience: a.audience, course_id: a.course_id || '', semester: a.semester || '', priority: a.priority, pinned: a.pinned });
        setModalOpen(true);
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body = { ...form, course_id: form.course_id || null, semester: form.course_id && form.semester ? Number(form.semester) : null };
            if (editingId) await api.put(`/announcements/${editingId}`, body);
            else await api.post('/announcements', body);
            toast.success(editingId ? 'Announcement updated.' : 'Announcement published.');
            setModalOpen(false);
            load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not save the announcement.');
        } finally {
            setSaving(false);
        }
    };

    const confirm = useConfirm();
    const remove = async (a) => {
        if (!(await confirm({ title: 'Delete this announcement?', message: `"${a.title}" will be removed.`, confirmText: 'Delete', tone: 'danger' }))) return;
        try { await api.delete(`/announcements/${a.id}`); toast.success('Announcement deleted.'); load(); }
        catch (err) { toast.error(err.response?.data?.error || 'Could not delete the announcement.'); }
    };

    const selectedCourse = courses.find((c) => String(c.id) === String(form.course_id));

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans dark:bg-slate-950 md:p-10">
            <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        Announcements
                        {unread.length > 0 && <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">{unread.length} new</span>}
                    </h2>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Official information from the university and your departments.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {!isAdmin && unread.length > 0 && (
                        <button onClick={markAll} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                            <CheckCircle2 size={16} className="text-emerald-500" /> Mark all read
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={openAdd} className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95">
                            <Plus size={18} /> New announcement
                        </button>
                    )}
                </div>
            </header>

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative w-full lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search announcements..."
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
                </div>
                <div className="flex flex-wrap gap-2">
                    {['All', ...CATEGORIES].map((c) => (
                        <button key={c} onClick={() => setCategory(c)}
                            className={`rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${category === c ? 'bg-slate-900 text-white shadow dark:bg-indigo-600' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'}`}>
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-24 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading announcements...</div>
            ) : error ? (
                <div className="rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">{error}</div>
            ) : visible.length === 0 ? (
                <div className="rounded-[28px] border-2 border-dashed border-slate-200 bg-white py-24 text-center dark:border-slate-800 dark:bg-slate-900">
                    <Megaphone size={40} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No announcements</p>
                </div>
            ) : (
                <div className="mx-auto max-w-4xl space-y-4">
                    {visible.map((a) => {
                        const open = expanded === a.id;
                        return (
                            <article key={a.id}
                                className={`relative overflow-hidden rounded-[24px] border p-5 pl-7 shadow-sm transition-all ${a.is_read ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900' : 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-900 dark:bg-indigo-950/20'}`}>
                                <span className={`absolute bottom-0 left-0 top-0 w-1.5 ${a.priority === 'High' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                                <button type="button" onClick={() => toggle(a)} className="block w-full text-left">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {a.pinned && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">Pinned</span>}
                                        <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${CATEGORY_STYLES[a.category] || CATEGORY_STYLES.Other}`}>{a.category}</span>
                                        {a.priority === 'High' && <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">Important</span>}
                                        {isAdmin && <span className="text-[11px] font-bold text-slate-400">To: {audienceText(a)}</span>}
                                        <span className="ml-auto text-[11px] font-bold text-slate-400" title={fullDateTime(a.created_at)}>{relativeTime(a.created_at)}</span>
                                        {!a.is_read && <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
                                    </div>
                                    <h3 className={`mt-2 text-lg leading-snug text-slate-900 dark:text-slate-100 ${a.is_read ? 'font-bold' : 'font-black'}`}>{a.title}</h3>
                                    <p className={`mt-1 whitespace-pre-wrap break-words text-sm text-slate-500 dark:text-slate-400 ${open ? '' : 'line-clamp-3'}`}>{a.content}</p>
                                    <span className="mt-2 inline-block text-xs font-bold text-indigo-600 dark:text-indigo-400">{open ? 'Show less' : 'Read more'}</span>
                                </button>
                                {isAdmin && (
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                                        <span className="text-[11px] font-bold text-slate-400">{a.read_count} {a.read_count === 1 ? 'person has' : 'people have'} read this</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => openEdit(a)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"><Edit2 size={16} /></button>
                                            <button onClick={() => remove(a)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}

            {isAdmin && (
                <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit announcement' : 'New announcement'}>
                    <form onSubmit={submit} className="space-y-5">
                        <div><label className={labelCls}>Title</label><input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. Winter vacation schedule" /></div>
                        <div><label className={labelCls}>Content</label><textarea required rows={6} maxLength={5000} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={`${inputCls} resize-none`} /></div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className={labelCls}>Category</label>
                                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Audience</label>
                                <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className={inputCls}>
                                    {AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className={labelCls}>Only for course (optional)</label>
                                <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value, semester: '' })} className={inputCls}>
                                    <option value="">All courses</option>
                                    {courses.map((c) => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Semester (optional)</label>
                                <select disabled={!form.course_id} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className={`${inputCls} disabled:opacity-50`}>
                                    <option value="">All semesters</option>
                                    {Array.from({ length: selectedCourse?.total_semesters || 8 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Semester {n}</option>)}
                                </select>
                            </div>
                        </div>
                        <p className="-mt-2 text-xs text-slate-400">The course and semester filter applies to students and parents. Teachers in the audience always see it.</p>
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                                <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={form.priority === 'High'} onChange={(e) => setForm({ ...form, priority: e.target.checked ? 'High' : 'Normal' })} /> Mark as important
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                                <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> Pin to the top
                            </label>
                        </div>
                        <button type="submit" disabled={saving} className="w-full rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Publish announcement'}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Announcements;
