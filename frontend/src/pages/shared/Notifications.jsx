import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { typeMeta, timeAgo } from '../../utils/notificationUi';

const PAGE = 30;

const Notifications = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');
    const [reloadKey, setReloadKey] = useState(0);
    const [data, setData] = useState({ key: null, items: [], hasMore: false, unread: 0, error: false });
    const [loadingMore, setLoadingMore] = useState(false);

    const key = `${filter}:${reloadKey}`;
    const loading = data.key !== key;

    useEffect(() => {
        let cancelled = false;
        api.get('/notifications', { params: { limit: PAGE, unread: filter === 'unread' ? 1 : undefined } })
            .then((res) => { if (!cancelled) setData({ key, items: res.data.items, hasMore: res.data.has_more, unread: res.data.unread, error: false }); })
            .catch(() => { if (!cancelled) setData({ key, items: [], hasMore: false, unread: 0, error: true }); });
        return () => { cancelled = true; };
    }, [filter, key]);

    const refreshBadge = () => window.dispatchEvent(new Event('inbox:refresh'));

    const loadMore = async () => {
        const last = data.items[data.items.length - 1];
        if (!last) return;
        setLoadingMore(true);
        try {
            const res = await api.get('/notifications', { params: { limit: PAGE, before: last.id, unread: filter === 'unread' ? 1 : undefined } });
            setData((d) => ({ ...d, items: [...d.items, ...res.data.items], hasMore: res.data.has_more, unread: res.data.unread }));
        } catch {
            toast.error('Could not load older notifications.');
        } finally {
            setLoadingMore(false);
        }
    };

    const markAll = async () => {
        try {
            await api.post('/notifications/read', { all: true });
            refreshBadge();
            setReloadKey((k) => k + 1);
        } catch {
            toast.error('Could not mark them as read.');
        }
    };

    const open = (n) => {
        if (!n.read) {
            setData((d) => ({ ...d, unread: Math.max(0, d.unread - 1), items: d.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }));
            api.post('/notifications/read', { ids: [n.id] }).then(refreshBadge).catch(() => {});
        }
        if (n.link) navigate(n.link);
    };

    const tab = (value, label) => (
        <button type="button" onClick={() => setFilter(value)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${filter === value ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            {label}
        </button>
    );

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Notifications</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {loading ? 'Loading…' : data.unread > 0 ? `${data.unread} unread` : 'You are all caught up.'} Items are kept for 90 days.
                    </p>
                </div>
                <button type="button" onClick={markAll} disabled={loading || data.unread === 0}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm disabled:opacity-40">
                    <CheckCheck size={16} /> Mark all as read
                </button>
            </header>

            <div className="mb-5 flex gap-2">{tab('all', 'All')}{tab('unread', 'Unread')}</div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                {loading && <p className="p-10 text-center text-slate-400">Loading notifications…</p>}
                {!loading && data.error && (
                    <p className="p-10 text-center text-slate-500 dark:text-slate-400">
                        Could not load notifications. <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-bold text-blue-600 dark:text-blue-400">Try again</button>
                    </p>
                )}
                {!loading && !data.error && data.items.length === 0 && (
                    <p className="p-12 text-center text-slate-400">{filter === 'unread' ? 'Nothing unread.' : 'No notifications yet.'}</p>
                )}
                {!loading && data.items.map((n) => {
                    const { Icon, tone } = typeMeta(n.type);
                    return (
                        <button key={n.id} type="button" onClick={() => open(n)}
                            className={`flex w-full items-start gap-4 border-b border-slate-100 dark:border-slate-800 px-6 py-4 text-left transition last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${n.read ? '' : 'bg-blue-50/40 dark:bg-blue-950/20'}`}>
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon size={18} /></span>
                            <span className="min-w-0 flex-1">
                                <span className={`block text-slate-900 dark:text-slate-100 ${n.read ? 'font-semibold' : 'font-bold'}`}>{n.title}</span>
                                {n.body && <span className="mt-0.5 block text-sm font-medium text-slate-500 dark:text-slate-400 break-words">{n.body}</span>}
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-2">
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{timeAgo(n.created_at)}</span>
                                {!n.read && <span aria-label="Unread" className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                            </span>
                        </button>
                    );
                })}
            </div>

            {!loading && data.hasMore && (
                <div className="mt-5 text-center">
                    <button type="button" onClick={loadMore} disabled={loadingMore}
                        className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50">
                        {loadingMore ? 'Loading…' : 'Load older'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Notifications;
