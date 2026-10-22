import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Send, Plus, ArrowLeft, MessageSquare, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import { relativeTime, initials, refreshInbox } from '../../utils/format';

const MAX_LEN = 2000;

const Avatar = ({ name, size = 'h-11 w-11', tone = 'bg-indigo-600' }) => (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${tone}`}>{initials(name)}</div>
);

const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

const NewMessageModal = ({ isOpen, onClose, onSent }) => {
    const [contacts, setContacts] = useState(null);
    const [tab, setTab] = useState('students');
    const [query, setQuery] = useState('');
    const [classKey, setClassKey] = useState('all');
    const [selected, setSelected] = useState([]);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setSelected([]); setBody(''); setQuery(''); setTab('students'); setClassKey('all');
        api.get('/messages/contacts')
            .then((res) => setContacts(res.data))
            .catch(() => { toast.error('Could not load your contacts.'); setContacts({ students: [], parents: [] }); });
    }, [isOpen]);

    const classes = useMemo(() => {
        const map = new Map();
        (contacts?.students || []).forEach((s) => {
            const key = `${s.course_id}-${s.semester}`;
            if (!map.has(key)) map.set(key, `${s.course_name} · Sem ${s.semester}`);
        });
        return [...map.entries()];
    }, [contacts]);

    const list = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (tab === 'students') {
            return (contacts?.students || [])
                .filter((s) => (classKey === 'all' || `${s.course_id}-${s.semester}` === classKey) && (!q || s.name.toLowerCase().includes(q) || String(s.roll || '').toLowerCase().includes(q)))
                .map((s) => ({ id: s.user_id, name: s.name, sub: `${s.roll || 'No roll no.'} · ${s.course_name} Sem ${s.semester}` }));
        }
        return (contacts?.parents || [])
            .filter((p) => !q || p.name.toLowerCase().includes(q) || String(p.wards || '').toLowerCase().includes(q))
            .map((p) => ({ id: p.user_id, name: p.name, sub: `Parent of ${p.wards}` }));
    }, [contacts, tab, query, classKey]);

    const chosen = new Set(selected);
    const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    const allShown = list.length > 0 && list.every((p) => chosen.has(p.id));
    const toggleShown = () => setSelected((cur) => (allShown
        ? cur.filter((id) => !list.some((p) => p.id === id))
        : [...new Set([...cur, ...list.map((p) => p.id)])]));

    const send = async () => {
        if (!selected.length) return toast.error('Choose at least one recipient.');
        if (!body.trim()) return toast.error('Please write a message.');
        setSending(true);
        try {
            const res = await api.post('/messages/send', { recipient_user_ids: selected, body: body.trim() });
            toast.success(res.data.sent === 1 ? 'Message sent.' : `Message sent to ${res.data.sent} people.`);
            onSent(res.data.thread_id);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not send the message.');
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => !sending && onClose()} title="New message">
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                        {['students', 'parents'].map((t) => (
                            <button key={t} type="button" onClick={() => setTab(t)}
                                className={`rounded-lg px-4 py-1.5 text-xs font-black uppercase tracking-wider ${tab === t ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 dark:text-slate-400'}`}>{t}</button>
                        ))}
                    </div>
                    {tab === 'students' && classes.length > 1 && (
                        <select value={classKey} onChange={(e) => setClassKey(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <option value="all">All classes</option>
                            {classes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                    )}
                    <div className="relative min-w-[160px] flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between bg-slate-50/70 px-4 py-2 text-xs font-bold dark:bg-slate-800/40">
                        <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Users size={14} /> {selected.length} selected</span>
                        <span className="flex gap-3">
                            <button type="button" onClick={toggleShown} className="text-indigo-600 hover:underline dark:text-indigo-400">{allShown ? 'Unselect shown' : 'Select all shown'}</button>
                            {selected.length > 0 && <button type="button" onClick={() => setSelected([])} className="text-rose-500 hover:underline">Clear</button>}
                        </span>
                    </div>
                    <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                        {contacts === null ? (
                            <p className="p-6 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading...</p>
                        ) : list.length === 0 ? (
                            <p className="p-6 text-center text-sm font-bold text-slate-400">{tab === 'parents' ? 'No parent accounts found for your classes.' : 'No students found.'}</p>
                        ) : list.map((p) => (
                            <label key={p.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <input type="checkbox" checked={chosen.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-indigo-600" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                                    <span className="block truncate text-[11px] text-slate-400">{p.sub}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <textarea rows={4} maxLength={MAX_LEN} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                    <p className="mt-1 flex justify-between text-[11px] text-slate-400">
                        <span>{selected.length > 1 ? 'Each person gets a private conversation, they cannot see each other.' : ''}</span>
                        <span>{body.length} / {MAX_LEN}</span>
                    </p>
                </div>

                <button type="button" onClick={send} disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 font-bold text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50">
                    <Send size={16} /> {sending ? 'Sending...' : `Send${selected.length > 1 ? ` to ${selected.length} people` : ''}`}
                </button>
            </div>
        </Modal>
    );
};

const Messages = () => {
    const { user } = useAuth();
    const isTeacher = user?.role === 'teacher';
    const [threads, setThreads] = useState([]);
    const [loadingThreads, setLoadingThreads] = useState(true);
    const [query, setQuery] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [conversation, setConversation] = useState(null);
    const [loadingConv, setLoadingConv] = useState(false);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const bottomRef = useRef(null);

    const loadThreads = useCallback(async () => {
        try {
            const res = await api.get('/messages/threads');
            setThreads(Array.isArray(res.data) ? res.data : []);
        } catch { /* best effort */ }
        finally { setLoadingThreads(false); }
    }, []);

    const loadConversation = useCallback(async (id, silent = false) => {
        if (!silent) setLoadingConv(true);
        try {
            const res = await api.get(`/messages/threads/${id}`);
            setConversation(res.data);
            refreshInbox();
        } catch (e) {
            if (!silent) toast.error(e.response?.data?.error || 'Could not open the conversation.');
        } finally {
            if (!silent) setLoadingConv(false);
        }
    }, []);

    useEffect(() => {
        loadThreads();
        const timer = setInterval(() => { if (!document.hidden) loadThreads(); }, 20000);
        return () => clearInterval(timer);
    }, [loadThreads]);

    useEffect(() => {
        if (!activeId) return undefined;
        const timer = setInterval(() => { if (!document.hidden) loadConversation(activeId, true); }, 8000);
        return () => clearInterval(timer);
    }, [activeId, loadConversation]);

    const messageCount = conversation?.messages?.length || 0;
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messageCount, activeId]);

    const open = (id) => {
        setActiveId(id);
        setConversation(null);
        setDraft('');
        loadConversation(id).then(loadThreads);
    };

    const reply = async () => {
        const text = draft.trim();
        if (!text || !activeId || sending) return;
        setSending(true);
        try {
            await api.post(`/messages/threads/${activeId}/reply`, { body: text });
            setDraft('');
            await loadConversation(activeId, true);
            loadThreads();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not send the message.');
        } finally {
            setSending(false);
        }
    };

    const onKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reply(); }
    };

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return threads.filter((t) => !q || t.other.name.toLowerCase().includes(q) || (t.last_body || '').toLowerCase().includes(q));
    }, [threads, query]);

    const rows = useMemo(() => {
        const out = [];
        let lastDay = '';
        (conversation?.messages || []).forEach((m) => {
            const day = new Date(m.created_at).toDateString();
            if (day !== lastDay) { out.push({ type: 'day', id: `d-${m.id}`, label: dayLabel(m.created_at) }); lastDay = day; }
            out.push({ type: 'msg', id: m.id, m });
        });
        return out;
    }, [conversation]);

    return (
        <div className="h-[calc(100vh-4rem)] bg-slate-50 p-4 font-sans dark:bg-slate-950 md:p-6">
            <div className="grid h-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[340px_1fr]">
                <aside className={`${activeId ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-slate-100 dark:border-slate-800`}>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
                        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Messages</h2>
                        {isTeacher && (
                            <button onClick={() => setComposeOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                                <Plus size={14} /> New
                            </button>
                        )}
                    </div>
                    <div className="p-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {loadingThreads ? (
                            <p className="p-8 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading...</p>
                        ) : shown.length === 0 ? (
                            <div className="p-8 text-center">
                                <MessageSquare size={34} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                                <p className="text-sm font-bold text-slate-400">{threads.length === 0 ? (isTeacher ? 'No conversations yet. Start one with the New button.' : 'No messages yet. Messages from your teachers will appear here.') : 'No conversations match your search.'}</p>
                            </div>
                        ) : shown.map((t) => (
                            <button key={t.id} onClick={() => open(t.id)}
                                className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/50 ${activeId === t.id ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : ''}`}>
                                <Avatar name={t.other.name} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p className={`truncate text-sm ${t.unread ? 'font-black text-slate-900 dark:text-slate-100' : 'font-bold text-slate-700 dark:text-slate-200'}`}>{t.other.name}</p>
                                        <span className="shrink-0 text-[10px] font-bold text-slate-400">{relativeTime(t.last_message_at)}</span>
                                    </div>
                                    <p className="truncate text-[11px] text-slate-400">{t.other.subtitle}</p>
                                    <p className={`mt-0.5 truncate text-xs ${t.unread ? 'font-bold text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{t.last_from_me ? 'You: ' : ''}{t.last_body}</p>
                                </div>
                                {t.unread > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-black text-white">{t.unread}</span>}
                            </button>
                        ))}
                    </div>
                </aside>

                <section className={`${activeId ? 'flex' : 'hidden md:flex'} min-h-0 flex-col`}>
                    {!activeId ? (
                        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                            <MessageSquare size={48} className="mb-4 text-slate-200 dark:text-slate-700" />
                            <p className="text-sm font-bold text-slate-400">Select a conversation to read it.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
                                <button onClick={() => { setActiveId(null); setConversation(null); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"><ArrowLeft size={18} /></button>
                                {conversation && <Avatar name={conversation.other.name} />}
                                <div className="min-w-0">
                                    <p className="truncate font-black text-slate-900 dark:text-slate-100">{conversation?.other.name || 'Loading...'}</p>
                                    <p className="truncate text-xs text-slate-400">{conversation?.other.subtitle}</p>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50/60 p-5 dark:bg-slate-950/40">
                                {loadingConv && !conversation ? (
                                    <p className="py-10 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading...</p>
                                ) : rows.map((r) => r.type === 'day' ? (
                                    <div key={r.id} className="py-2 text-center"><span className="rounded-full bg-slate-200/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-800 dark:text-slate-400">{r.label}</span></div>
                                ) : (
                                    <div key={r.id} className={`flex ${r.m.mine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${r.m.mine ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>
                                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{r.m.body}</p>
                                            <p className={`mt-1 text-right text-[10px] font-bold ${r.m.mine ? 'text-indigo-200' : 'text-slate-400'}`}>{timeOf(r.m.created_at)}{r.m.mine && r.m.read ? ' · Seen' : ''}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={bottomRef} />
                            </div>

                            <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                                <div className="flex items-end gap-3">
                                    <textarea rows={1} maxLength={MAX_LEN} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey}
                                        placeholder="Write a reply... (Enter to send, Shift+Enter for a new line)"
                                        className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                                    <button onClick={reply} disabled={sending || !draft.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40" title="Send">
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>

            {isTeacher && (
                <NewMessageModal
                    isOpen={composeOpen}
                    onClose={() => setComposeOpen(false)}
                    onSent={(threadId) => { setComposeOpen(false); loadThreads(); if (threadId) open(threadId); }}
                />
            )}
        </div>
    );
};

export default Messages;
