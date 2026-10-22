import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Megaphone, CheckCircle2, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import NoticeDetail, { sourceOf } from './NoticeDetail';
import { relativeTime, fullDateTime, initials, refreshInbox } from '../../utils/format';

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'personal', label: 'For you' },
    { id: 'faculty', label: 'Faculty' },
    { id: 'admin', label: 'Administration' },
    { id: 'high', label: 'High priority' }
];

const matches = (n, filter) => {
    switch (filter) {
        case 'unread': return !n.is_read;
        case 'personal': return n.is_personal;
        case 'faculty': return n.author_role === 'teacher';
        case 'admin': return n.author_role !== 'teacher';
        case 'high': return n.priority === 'High';
        default: return true;
    }
};

const NoticeCard = ({ notice, onOpen }) => {
    const source = sourceOf(notice);
    const high = notice.priority === 'High';
    return (
        <button
            type="button"
            onClick={() => onOpen(notice)}
            className={`group relative flex w-full flex-col gap-3 overflow-hidden rounded-[24px] border p-5 pl-7 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                notice.is_read
                    ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    : 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-900 dark:bg-indigo-950/20'
            }`}
        >
            <span className={`absolute bottom-0 left-0 top-0 w-1.5 ${high ? 'bg-rose-500' : 'bg-indigo-500'}`} />
            <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${source.cls}`}>{source.label}</span>
                {high && <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">High priority</span>}
                {notice.subject_name && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{notice.subject_name}</span>}
                <span className="ml-auto text-[11px] font-bold text-slate-400" title={fullDateTime(notice.created_at)}>{relativeTime(notice.created_at)}</span>
                {!notice.is_read && <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" title="Unread" />}
            </div>
            <div>
                <h3 className={`text-lg leading-snug text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400 ${notice.is_read ? 'font-bold' : 'font-black'}`}>{notice.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{notice.content}</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white dark:bg-slate-700">{initials(notice.author_name)}</div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{notice.author_role === 'admin' ? 'Administration' : notice.author_name}</span>
                {notice.attachment_url && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400"><Paperclip size={12} /> Attachment</span>
                )}
            </div>
        </button>
    );
};

/**
 * Feed of notices for the logged-in student, parent or teacher.
 * endpoint/params choose what to load (parents can pass { student_id }).
 */
const NoticeFeed = ({ title = 'Notices', subtitle, endpoint = '/notices/feed', params = {}, headerRight, topSlot = null, embedded = false }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(null);
    const paramKey = JSON.stringify(params);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(endpoint, { params: JSON.parse(paramKey) });
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            setError(e.response?.data?.error || 'Could not load notices.');
        } finally {
            setLoading(false);
        }
    }, [endpoint, paramKey]);

    useEffect(() => { load(); }, [load]);

    const markRead = async (ids) => {
        if (!ids.length) return;
        setItems((cur) => cur.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
        try {
            await api.post('/notices/read', { ids });
            refreshInbox();
        } catch {
            /* the badge will correct itself on the next refresh */
        }
    };

    const open = (notice) => {
        setActive(notice);
        if (!notice.is_read) markRead([notice.id]);
    };

    const unread = items.filter((n) => !n.is_read);
    const markAll = async () => {
        await markRead(unread.slice(0, 200).map((n) => n.id));
        toast.success('All notices marked as read.');
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items.filter((n) => matches(n, filter) && (
            !q || n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q) || (n.author_name || '').toLowerCase().includes(q)
        ));
    }, [items, filter, query]);

    const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, items.filter((n) => matches(n, f.id)).length])), [items]);

    const markAllButton = unread.length > 0 && (
        <button onClick={markAll} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <CheckCircle2 size={16} className="text-emerald-500" /> Mark all read
        </button>
    );

    return (
        <div className={embedded ? 'font-sans' : 'min-h-screen bg-slate-50 p-6 font-sans dark:bg-slate-950 md:p-10'}>
            {!embedded && topSlot}
            {!embedded && <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {title}
                        {unread.length > 0 && <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">{unread.length} new</span>}
                    </h2>
                    {subtitle && <p className="mt-1 text-slate-500 dark:text-slate-400">{subtitle}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {headerRight}
                    {markAllButton}
                </div>
            </header>}

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative w-full lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search notices..."
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
                                filter === f.id
                                    ? 'bg-slate-900 text-white shadow dark:bg-indigo-600'
                                    : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            {f.label} <span className="opacity-60">{counts[f.id]}</span>
                        </button>
                    ))}
                </div>
                {embedded && <div className="lg:ml-auto">{markAllButton}</div>}
            </div>

            {loading ? (
                <div className="py-24 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading notices...</div>
            ) : error ? (
                <div className="rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">{error}</div>
            ) : visible.length === 0 ? (
                <div className="rounded-[28px] border-2 border-dashed border-slate-200 bg-white py-24 text-center dark:border-slate-800 dark:bg-slate-900">
                    <Megaphone size={40} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{items.length === 0 ? 'No notices yet' : 'No notices match your filters'}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visible.map((n) => <NoticeCard key={n.id} notice={n} onOpen={open} />)}
                </div>
            )}

            <NoticeDetail notice={active} onClose={() => setActive(null)} />
        </div>
    );
};

export default NoticeFeed;
