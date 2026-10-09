import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit2, Trash2, Calendar, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import CsvImportModal from '../../components/CsvImportModal';
import { normalizeDate, parseISODate, todayISO } from '../../utils/csv';

const EMPTY = { date: '', name: '', description: '' };
const SAMPLE = 'date,name,description\n2026-01-26,Republic Day,National holiday\n2026-08-15,Independence Day,National holiday\n';

const mapRow = (o) => {
    const date = normalizeDate(o.date);
    if (!date) return { error: 'Invalid date' };
    if (!o.name) return { error: 'Name is required' };
    if (o.name.length > 150) return { error: 'Name too long' };
    if (o.description.length > 255) return { error: 'Description too long' };
    return { value: { date, name: o.name, description: o.description || '' } };
};

const Holidays = () => {
    const { user } = useAuth();
    const canManage = user?.role === 'admin';
    const thisYear = new Date().getFullYear();

    const [year, setYear] = useState(thisYear);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/holidays?year=${year}`);
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            toast.error('Could not load holidays.');
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => { load(); }, [load]);

    const today = todayISO();
    const next = items.find((h) => h.date >= today);
    const daysToNext = next ? Math.round((parseISODate(next.date) - parseISODate(today)) / 86400000) : null;

    const grouped = useMemo(() => {
        const map = new Map();
        items.forEach((h) => {
            const key = h.date.slice(0, 7);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(h);
        });
        return [...map.entries()];
    }, [items]);

    const openAdd = () => { setEditingId(null); setForm({ ...EMPTY, date: `${year}-01-01` }); setModalOpen(true); };
    const openEdit = (h) => { setEditingId(h.id); setForm({ date: h.date, name: h.name, description: h.description || '' }); setModalOpen(true); };

    const submit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) await api.put(`/holidays/${editingId}`, form);
            else await api.post('/holidays', form);
            toast.success(editingId ? 'Holiday updated.' : 'Holiday added.');
            setModalOpen(false);
            load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not save holiday.');
        }
    };

    const remove = async (h) => {
        if (!window.confirm(`Delete "${h.name}" (${h.date})?`)) return;
        try { await api.delete(`/holidays/${h.id}`); toast.success('Holiday deleted.'); load(); }
        catch (err) { toast.error(err.response?.data?.error || 'Could not delete holiday.'); }
    };

    const fmtDay = (iso) => parseISODate(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
    const monthName = (key) => parseISODate(`${key}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Holidays</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">University holiday list for the academic year.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                        className="py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none">
                        {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {canManage && (
                        <>
                            <button onClick={() => setImportOpen(true)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-5 rounded-2xl flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <UploadCloud size={18} /> Import CSV
                            </button>
                            <button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2">
                                <Plus size={18} /> Add Holiday
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] p-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Holidays in {year}</p>
                    <h3 className="text-4xl font-black text-slate-900 dark:text-slate-100 mt-1">{items.length}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] p-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next holiday</p>
                    {next ? (
                        <>
                            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{next.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{fmtDay(next.date)} · {daysToNext === 0 ? 'Today' : `in ${daysToNext} day${daysToNext === 1 ? '' : 's'}`}</p>
                        </>
                    ) : <p className="text-sm text-slate-400 mt-2">No upcoming holidays in {year}.</p>}
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading holidays...</div>
            ) : grouped.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[28px] bg-white dark:bg-slate-900">
                    <Calendar size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No holidays listed for {year}.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {grouped.map(([key, list]) => (
                        <section key={key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="font-black text-slate-900 dark:text-slate-100">{monthName(key)}</h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {list.map((h) => (
                                    <div key={h.id} className={`px-6 py-4 flex items-center justify-between gap-4 ${h.date < today ? 'opacity-60' : ''}`}>
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-16 shrink-0 text-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 py-2">
                                                <div className="text-lg font-black leading-none">{h.date.slice(8)}</div>
                                                <div className="text-[10px] font-bold uppercase mt-1">{parseISODate(h.date).toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{h.name}</p>
                                                {h.description && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{h.description}</p>}
                                            </div>
                                        </div>
                                        {canManage && (
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => openEdit(h)} className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg"><Edit2 size={16} /></button>
                                                <button onClick={() => remove(h)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"><Trash2 size={16} /></button>
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
                    <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Holiday' : 'Add Holiday'}>
                        <form onSubmit={submit} className="space-y-5">
                            <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                            <Input label="Holiday Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Diwali" />
                            <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg">
                                {editingId ? 'Save Changes' : 'Add Holiday'}
                            </button>
                        </form>
                    </Modal>
                    <CsvImportModal
                        isOpen={importOpen}
                        onClose={() => setImportOpen(false)}
                        title="Import Holidays (CSV)"
                        headers={['date', 'name', 'description']}
                        sample={SAMPLE}
                        templateName="holidays_template.csv"
                        mapRow={mapRow}
                        previewKeys={['date', 'name', 'description']}
                        onSubmit={(rows) => api.post('/holidays/bulk', { rows })}
                        onDone={() => { setImportOpen(false); load(); }}
                    />
                </>
            )}
        </div>
    );
};

export default Holidays;
