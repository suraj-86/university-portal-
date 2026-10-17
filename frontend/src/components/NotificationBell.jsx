import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuth from '../hooks/useAuth.jsx';
import { typeMeta, timeAgo } from '../utils/notificationUi';

const NotificationBell = ({ unread }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState(null);
    const [failed, setFailed] = useState(false);
    const box = useRef(null);

    const refreshBadge = () => window.dispatchEvent(new Event('inbox:refresh'));

    const load = useCallback(async () => {
        try {
            const res = await api.get('/notifications', { params: { limit: 10 } });
            setItems(res.data.items);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, []);

    const toggle = () => {
        if (!open) load();
        setOpen((o) => !o);
    };

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const openItem = (n) => {
        setOpen(false);
        if (!n.read) {
            api.post('/notifications/read', { ids: [n.id] }).then(refreshBadge).catch(() => {});
        }
        if (n.link) navigate(n.link);
    };

    const markAll = async () => {
        try {
            await api.post('/notifications/read', { all: true });
            setItems((list) => (list || []).map((n) => ({ ...n, read: true })));
            refreshBadge();
        } catch {
        }
    };

    const badge = unread > 99 ? '99+' : unread;

    return (
        <div className="relative" ref={box}>
            <button
                type="button"
                onClick={toggle}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                title="Notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900">{badge}</span>
                )}
            </button>

            {open && (
                <div role="dialog" aria-label="Notifications"
                    className="fixed inset-x-4 top-[4.5rem] z-[60] overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[22rem] rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
                        <button type="button" onClick={markAll} disabled={!unread}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 disabled:opacity-40">
                            <CheckCheck size={14} /> Mark all read
                        </button>
                    </div>

                    <div className="max-h-[26rem] overflow-y-auto">
                        {items === null && !failed && <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>}
                        {failed && (
                            <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                Could not load notifications. <button type="button" onClick={load} className="font-bold text-blue-600 dark:text-blue-400">Try again</button>
                            </p>
                        )}
                        {items && items.length === 0 && !failed && (
                            <p className="px-5 py-10 text-center text-sm text-slate-400">You are all caught up.</p>
                        )}
                        {items && items.map((n) => {
                            const { Icon, tone } = typeMeta(n.type);
                            return (
                                <button key={n.id} type="button" onClick={() => openItem(n)}
                                    className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${n.read ? '' : 'bg-blue-50/40 dark:bg-blue-950/20'}`}>
                                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={16} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className={`block text-sm text-slate-900 dark:text-slate-100 ${n.read ? 'font-semibold' : 'font-bold'}`}>{n.title}</span>
                                        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs font-medium text-slate-500 dark:text-slate-400">{n.body}</span>}
                                        <span className="mt-1 block text-[11px] font-semibold text-slate-400 dark:text-slate-500">{timeAgo(n.created_at)}</span>
                                    </span>
                                    {!n.read && <span aria-label="Unread" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                                </button>
                            );
                        })}
                    </div>

                    <button type="button" onClick={() => { setOpen(false); navigate(`/${user?.role}/notifications`); }}
                        className="w-full border-t border-slate-100 dark:border-slate-800 px-5 py-3 text-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        View all notifications
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
