import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import RecipientPicker from './RecipientPicker';
import AttachmentPicker from './AttachmentPicker';

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
const labelCls = 'mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400';

const BROADCAST = [
    { id: 'all', label: 'Everyone (students, parents and teachers)' },
    { id: 'student', label: 'All students' },
    { id: 'parent', label: 'All parents' },
    { id: 'teacher', label: 'All teachers' }
];
const AUDIENCE = [
    { id: 'students', label: 'Students' },
    { id: 'parents', label: 'Their parents' },
    { id: 'both', label: 'Students and parents' }
];


const ComposeNotice = ({ role, classes = [], onSent }) => {
    const firstMode = role === 'admin' ? 'broadcast' : 'class';
    const [mode, setMode] = useState(firstMode);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState('Normal');
    const [file, setFile] = useState(null);
    const [classId, setClassId] = useState('');
    const [broadcast, setBroadcast] = useState('all');
    const [audience, setAudience] = useState('students');
    const [selected, setSelected] = useState([]);
    const [targets, setTargets] = useState(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (mode !== 'students' || targets) return;
        api.get('/notices/targets')
            .then((res) => setTargets(res.data.students || []))
            .catch(() => { toast.error('Could not load the student list.'); setTargets([]); });
    }, [mode, targets]);

    const reset = () => { setTitle(''); setContent(''); setPriority('Normal'); setFile(null); setSelected([]); };

    const submit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return toast.error('Please enter a title and a message.');
        if (mode === 'class' && !classId) return toast.error('Please choose a class.');
        if (mode === 'students' && selected.length === 0) return toast.error('Select at least one student.');

        const fd = new FormData();
        fd.append('title', title.trim());
        fd.append('content', content.trim());
        fd.append('priority', priority);
        if (file) fd.append('attachment', file);

        let url = '/notices';
        if (mode === 'class') { fd.append('target_role', 'student'); fd.append('subject_id', classId); }
        else if (mode === 'broadcast') { fd.append('target_role', broadcast); }
        else { url = '/notices/targeted'; fd.append('audience', audience); fd.append('student_ids', JSON.stringify(selected)); }

        setSending(true);
        try {
            const res = await api.post(url, fd);
            toast.success(mode === 'students' ? `Notice sent to ${res.data.recipients} people.` : 'Notice published.');
            reset();
            if (onSent) onSent();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not send the notice.');
        } finally {
            setSending(false);
        }
    };

    const modes = role === 'admin'
        ? [{ id: 'broadcast', label: 'Broadcast' }, { id: 'students', label: 'Specific students / parents' }]
        : [{ id: 'class', label: 'Entire class' }, { id: 'students', label: 'Specific students / parents' }];

    return (
        <form onSubmit={submit} className="space-y-5">
            <div className="inline-flex flex-wrap rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                {modes.map((m) => (
                    <button key={m.id} type="button" onClick={() => setMode(m.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${mode === m.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 dark:text-slate-400'}`}>
                        {m.label}
                    </button>
                ))}
            </div>

            {mode === 'class' && (
                <div>
                    <label className={labelCls}>Class</label>
                    <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
                        <option value="">Select one of your classes</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.subject_code} · {c.subject_name} (Sem {c.semester})</option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-400">Every student in this class sees it, and their parents see it too.</p>
                </div>
            )}

            {mode === 'broadcast' && (
                <div>
                    <label className={labelCls}>Send to</label>
                    <select value={broadcast} onChange={(e) => setBroadcast(e.target.value)} className={inputCls}>
                        {BROADCAST.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                </div>
            )}

            {mode === 'students' && (
                <div className="space-y-4">
                    <div>
                        <label className={labelCls}>Who should receive it?</label>
                        <div className="flex flex-wrap gap-2">
                            {AUDIENCE.map((a) => (
                                <button key={a.id} type="button" onClick={() => setAudience(a.id)}
                                    className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${audience === a.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}>
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Choose students</label>
                        {targets === null
                            ? <p className="py-6 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading students...</p>
                            : <RecipientPicker students={targets} selected={selected} onChange={setSelected} />}
                    </div>
                </div>
            )}

            <div>
                <label className={labelCls}>Title</label>
                <input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Submit your project report by Friday" className={inputCls} />
            </div>

            <div>
                <label className={labelCls}>Message</label>
                <textarea rows={5} maxLength={5000} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your notice here..." className={`${inputCls} resize-none`} />
                <p className="mt-1 text-right text-[11px] text-slate-400">{content.length} / 5000</p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                    <label className={labelCls}>Priority</label>
                    <div className="flex gap-2">
                        {['Normal', 'High'].map((p) => (
                            <button key={p} type="button" onClick={() => setPriority(p)}
                                className={`flex-1 rounded-xl border py-2.5 text-xs font-black uppercase tracking-wider transition-all ${priority === p
                                    ? (p === 'High' ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300')
                                    : 'border-slate-200 text-slate-400 dark:border-slate-700'}`}>
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Attachment</label>
                    <AttachmentPicker file={file} onFile={setFile} />
                </div>
            </div>

            <button type="submit" disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-lg transition-all hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50">
                <Send size={17} /> {sending ? 'Sending...' : 'Send notice'}
            </button>
        </form>
    );
};

export default ComposeNotice;
