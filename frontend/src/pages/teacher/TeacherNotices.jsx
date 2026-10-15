import React, { useState, useEffect, useCallback } from 'react';
import { Send, Inbox, History } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import ComposeNotice from '../../components/notices/ComposeNotice';
import SentNoticeList from '../../components/notices/SentNoticeList';
import NoticeFeed from '../../components/notices/NoticeFeed';

const TABS = [
    { id: 'compose', label: 'Compose', icon: Send },
    { id: 'sent', label: 'Sent', icon: History },
    { id: 'inbox', label: 'University inbox', icon: Inbox }
];

const TeacherNotices = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState('compose');
    const [classes, setClasses] = useState([]);
    const [sent, setSent] = useState([]);
    const [loadingSent, setLoadingSent] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        api.get(`/teacher/${user.id}/assigned-subjects`)
            .then((res) => setClasses(Array.isArray(res.data) ? res.data : []))
            .catch(() => toast.error('Could not load your classes.'));
    }, [user]);

    const loadSent = useCallback(async () => {
        setLoadingSent(true);
        try {
            const res = await api.get('/notices/sent');
            setSent(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            toast.error(e.response?.data?.error || 'Could not load sent notices.');
        } finally {
            setLoadingSent(false);
        }
    }, []);

    useEffect(() => { if (tab === 'sent') loadSent(); }, [tab, loadSent]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans dark:bg-slate-950 md:p-10">
            <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Notices</h2>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Send notices to a whole class or to specific students and parents, and track who has read them.</p>
                </div>
                <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${tab === t.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 dark:text-slate-400'}`}>
                                <Icon size={14} /> {t.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            {tab === 'compose' && (
                <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
                    <ComposeNotice role="teacher" classes={classes} onSent={() => setTab('sent')} />
                </div>
            )}

            {tab === 'sent' && (
                <div className="mx-auto max-w-4xl">
                    {loadingSent
                        ? <div className="py-24 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading...</div>
                        : <SentNoticeList notices={sent} onChanged={loadSent} emptyText="You have not sent any notices yet." />}
                </div>
            )}

            {tab === 'inbox' && (
                <NoticeFeed embedded endpoint="/notices/feed" />
            )}
        </div>
    );
};

export default TeacherNotices;
