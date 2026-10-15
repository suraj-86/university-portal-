import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../../components/Modal';
import ComposeNotice from '../../components/notices/ComposeNotice';
import SentNoticeList from '../../components/notices/SentNoticeList';

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'broadcast', label: 'Broadcast' },
    { id: 'class', label: 'Class notices' },
    { id: 'targeted', label: 'Specific people' },
    { id: 'high', label: 'High priority' }
];

const kindOf = (n) => (n.target_role === 'targeted' ? 'targeted' : n.subject_id ? 'class' : 'broadcast');

const AdminNotices = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [composing, setComposing] = useState(false);
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/notices/sent');
            setNotices(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            toast.error(e.response?.data?.error || 'Could not load notices.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return notices.filter((n) =>
            (filter === 'all' || (filter === 'high' ? n.priority === 'High' : kindOf(n) === filter)) &&
            (!q || n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q) || (n.author_name || '').toLowerCase().includes(q))
        );
    }, [notices, filter, query]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans dark:bg-slate-950 md:p-10">
            <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Campus Notices</h2>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Publish notices to everyone, or to specific students and their parents. See who has read them.</p>
                </div>
                <button onClick={() => setComposing(true)} className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-md transition-all hover:bg-indigo-700 active:scale-95">
                    <Plus size={18} /> New notice
                </button>
            </header>

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative w-full lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notices..."
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
                </div>
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button key={f.id} onClick={() => setFilter(f.id)}
                            className={`rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${filter === f.id ? 'bg-slate-900 text-white shadow dark:bg-indigo-600' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mx-auto max-w-4xl">
                {loading
                    ? <div className="py-24 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading notices...</div>
                    : <SentNoticeList notices={visible} onChanged={load} showAuthor emptyText="No notices found." />}
            </div>

            <Modal isOpen={composing} onClose={() => setComposing(false)} title="New notice">
                <ComposeNotice role="admin" onSent={() => { setComposing(false); load(); }} />
            </Modal>
        </div>
    );
};

export default AdminNotices;
