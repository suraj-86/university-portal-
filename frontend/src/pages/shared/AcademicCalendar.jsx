import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit2, Trash2, CalendarDays, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import CsvImportModal from '../../components/CsvImportModal';
import { normalizeDate, parseISODate, todayISO } from '../../utils/csv';

const EVENT_TYPES = ['Semester Start', 'Semester End', 'Examination', 'Result', 'Event', 'Deadline', 'Other'];
const TYPE_STYLES = {
    'Semester Start': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    'Semester End': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    Examination: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    Result: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    Event: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
    Deadline: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    Other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
};
const EMPTY = { title: '', type: 'Event', start_date: '', end_date: '', description: '' };
const SAMPLE = 'title,type,start_date,end_date,description\nSemester 1 begins,Semester Start,2026-07-15,,Odd semester\nMid-semester exams,Examination,2026-09-20,2026-09-28,All courses\n';

const mapRow = (o) => {
    if (!o.title) return { error: 'Title is required' };
    if (o.title.length > 150) return { error: 'Title too long' };
    const type = EVENT_TYPES.find((t) => t.toLowerCase() === (o.type || 'Event').toLowerCase());
    if (!type) return { error: `Type must be one of: ${EVENT_TYPES.join(', ')}` };
    const start = normalizeDate(o.start_date);
    if (!start) return { error: 'Invalid start_date' };
    let end = '';
    if (o.end_date) {
        end = normalizeDate(o.end_date);
        if (!end) return { error: 'Invalid end_date' };
        if (end < start) return { error: 'end_date is before start_date' };
    }
    if (o.description.length > 500) return { error: 'Description too long' };
    return { value: { title: o.title, type, start_date: start, end_date: end, description: o.description || '' } };
};

const AcademicCalendar = () => {
    const { user } = useAuth();
    const canManage = user?.role === 'admin';
    const thisYear = new Date().getFullYear();

    const [year, setYear] = useState(thisYear);
    const [typeFilter, setTypeFilter] = useState('All');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/academic-events?year=${year}`);
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            toast.error('Could not load the academic calendar.');
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => { load(); }, [load]);

    const today = todayISO();
    const visible = useMemo(() => items.filter((e) => typeFilter === 'All' || e.type === typeFilter), [items, typeFilter]);
    const grouped = useMemo(() => {
        const map = new Map();
        visible.forEach((e) => {
            const key = e.start_date.slice(0, 7);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(e);
        });
        return [...map.entries()];
    }, [visible]);

    const upcoming = items.filter((e) => (e.end_date || e.start_date) >= today).slice(0, 3);

    const openAdd = () => { setEditingId(null); setForm({ ...EMPTY, start_date: `${year}-01-01` }); setModalOpen(true); };
    const openEdit = (ev) => {
        setEditingId(ev.id);
        setForm({ title: ev.title, type: ev.type, start_date: ev.start_date, end_date: ev.end_date || '', description: ev.description || '' });
        setModalOpen(true);
    };

    const submit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) await api.put(`/academic-events/${editingId}`, form);
            else await api.post('/academic-events', form);
            toast.success(editingId ? 'Event updated.' : 'Event added.');
            setModalOpen(false);
            load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not save event.');
        }
    };

    const remove = async (ev) => {
        if (!window.confirm(`Delete "${ev.title}"?`)) return;
        try { await api.delete(`/academic-events/${ev.id}`); toast.success('Event deleted.'); load(); }
        catch (err) { toast.error(err.response?.data?.error || 'Could not delete event.'); }
    };

    const fmt = (iso) => parseISODate(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const range = (ev) => (ev.end_date && ev.end_date !== ev.start_date ? `${fmt(ev.start_date)} - ${fmt(ev.end_date)}` : fmt(ev.start_date));
    const monthName = (key) => parseISODate(`${key}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Academic Calendar</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Semesters, examinations, results and important dates.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                        className="py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none">
                        {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                        className="py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none">
                        <option value="All">All types</option>
                        {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {canManage && (
                        <>
                            <button onClick={() => setImportOpen(true)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-5 rounded-2xl flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <UploadCloud size={18} /> Import CSV
                            </button>
                            <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2">
                                <Plus size={18} /> Add Event
                            </button>
                        </>
                    )}
                </div>
            </header>

            {upcoming.length > 0 && (
                <div className="mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] p-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Coming up</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {upcoming.map((ev) => (
                            <div key={ev.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${TYPE_STYLES[ev.type]}`}>{ev.type}</span>
                                <p className="font-bold text-slate-900 dark:text-slate-100 mt-2">{ev.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{range(ev)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading calendar...</div>
            ) : grouped.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[28px] bg-white dark:bg-slate-900">
                    <CalendarDays size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No calendar entries for {year}.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {grouped.map(([key, list]) => (
                        <section key={key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="font-black text-slate-900 dark:text-slate-100">{monthName(key)}</h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {list.map((ev) => (
                                    <div key={ev.id} className={`px-6 py-4 flex items-center justify-between gap-4 ${(ev.end_date || ev.start_date) < today ? 'opacity-60' : ''}`}>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${TYPE_STYLES[ev.type]}`}>{ev.type}</span>
                                                <span className="text-xs font-bold text-slate-400">{range(ev)}</span>
                                            </div>
                                            <p className="font-bold text-slate-900 dark:text-slate-100 mt-1">{ev.title}</p>
                                            {ev.description && <p className="text-xs text-slate-500 dark:text-slate-400">{ev.description}</p>}
                                        </div>
                                        {canManage && (
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => openEdit(ev)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"><Edit2 size={16} /></button>
                                                <button onClick={() => remove(ev)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"><Trash2 size={16} /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {canManage && (
                <>
                    <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Event' : 'Add Event'}>
                        <form onSubmit={submit} className="space-y-5">
                            <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mid-semester examinations" />
                            <div className="space-y-1">
                                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Type</span>
                                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none">
                                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Start Date" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                                <Input label="End Date (optional)" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                            </div>
                            <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg">
                                {editingId ? 'Save Changes' : 'Add Event'}
                            </button>
                        </form>
                    </Modal>
                    <CsvImportModal
                        isOpen={importOpen}
                        onClose={() => setImportOpen(false)}
                        title="Import Academic Calendar (CSV)"
                        headers={['title', 'type', 'start_date', 'end_date', 'description']}
                        required={['title', 'start_date']}
                        sample={SAMPLE}
                        templateName="academic_calendar_template.csv"
                        mapRow={mapRow}
                        previewKeys={['title', 'type', 'start_date', 'end_date']}
                        onSubmit={(rows) => api.post('/academic-events/bulk', { rows })}
                        onDone={() => { setImportOpen(false); load(); }}
                    />
                </>
            )}
        </div>
    );
};

export default AcademicCalendar;
