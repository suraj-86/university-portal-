import React, { useState } from 'react';
import { Edit2, Trash2, Eye, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../Modal';
import AttachmentChip from './AttachmentChip';
import AttachmentPicker from './AttachmentPicker';
import { relativeTime, fullDateTime } from '../../utils/format';
import { useConfirm } from '../../context/confirm';

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
const labelCls = 'mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400';

export const audienceLabel = (n) => {
    if (n.target_role === 'targeted') return `${n.recipient_count} selected recipient${n.recipient_count === 1 ? '' : 's'}`;
    if (n.subject_id) return `Class · ${n.subject_name || 'Subject'}${n.semester ? ` · Sem ${n.semester}` : ''}`;
    return { all: 'Everyone', teacher: 'All teachers', student: 'All students', parent: 'All parents' }[n.target_role] || 'Everyone';
};

const SentCard = ({ notice, showAuthor, onEdit, onDelete }) => {
    const [open, setOpen] = useState(false);
    const [readers, setReaders] = useState(null);
    const targeted = notice.target_role === 'targeted';
    const high = notice.priority === 'High';
    const pct = targeted && notice.recipient_count ? Math.round((notice.read_count / notice.recipient_count) * 100) : null;

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (next && targeted && readers === null) {
            try {
                const res = await api.get(`/notices/${notice.id}/readers`);
                setReaders(res.data.recipients || []);
            } catch (e) {
                setReaders([]);
                toast.error('Could not load the recipient list.');
            }
        }
    };

    return (
        <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 pl-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className={`absolute bottom-0 left-0 top-0 w-1.5 ${high ? 'bg-rose-500' : 'bg-indigo-500'}`} />
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">{audienceLabel(notice)}</span>
                {high && <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">High priority</span>}
                {showAuthor && <span className="text-[11px] font-bold text-slate-400">by {notice.author_name || 'Unknown'}</span>}
                <span className="ml-auto text-[11px] font-bold text-slate-400" title={fullDateTime(notice.created_at)}>{relativeTime(notice.created_at)}</span>
            </div>

            <h3 className="mt-2 text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">{notice.title}</h3>
            <p className={`mt-1 whitespace-pre-wrap break-words text-sm text-slate-500 dark:text-slate-400 ${open ? '' : 'line-clamp-2'}`}>{notice.content}</p>
            {notice.attachment_url && <div className="mt-3"><AttachmentChip url={notice.attachment_url} /></div>}

            <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="min-w-[160px] flex-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>{targeted ? `${notice.read_count} of ${notice.recipient_count} read` : `${notice.read_count} read`}</span>
                        {pct !== null && <span>{pct}%</span>}
                    </div>
                    {pct !== null && (
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={toggle} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800">
                        <Eye size={15} /> {open ? 'Hide' : 'Details'}
                    </button>
                    <button onClick={() => onEdit(notice)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50" title="Edit"><Edit2 size={16} /></button>
                    <button onClick={() => onDelete(notice)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Delete"><Trash2 size={16} /></button>
                </div>
            </div>

            {open && targeted && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Recipients</p>
                    {readers === null ? <p className="text-xs font-bold text-slate-400">Loading...</p> : (
                        <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
                            {readers.map((r, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{r.name} <span className="text-xs font-medium capitalize text-slate-400">{r.role}</span></span>
                                    <span className={`text-[11px] font-black uppercase ${r.is_read ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{r.is_read ? 'Read' : 'Not read'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const EditModal = ({ notice, onClose, onSaved }) => {
    const [title, setTitle] = useState(notice.title);
    const [content, setContent] = useState(notice.content);
    const [priority, setPriority] = useState(notice.priority || 'Normal');
    const [file, setFile] = useState(null);
    const [removeExisting, setRemoveExisting] = useState(false);
    const [saving, setSaving] = useState(false);
    const targeted = notice.target_role === 'targeted';
    const existingUrl = removeExisting ? null : notice.attachment_url;

    const submit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return toast.error('Title and message are required.');
        const fd = new FormData();
        fd.append('title', title.trim());
        fd.append('content', content.trim());
        fd.append('priority', priority);
        if (file) fd.append('attachment', file);
        setSaving(true);
        try {
            if (targeted) {
                if (!file && removeExisting) fd.append('remove_attachment', 'true');
                await api.put(`/notices/targeted/${notice.id}`, fd);
            } else {
                fd.append('target_role', notice.target_role);
                if (notice.subject_id) fd.append('subject_id', notice.subject_id);
                if (!file && notice.attachment_url && !removeExisting) fd.append('attachment_url', notice.attachment_url);
                await api.put(`/notices/${notice.id}`, fd);
            }
            toast.success('Notice updated.');
            onSaved();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not update the notice.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title="Edit notice">
            <form onSubmit={submit} className="space-y-5">
                <p className="text-xs font-bold text-slate-400">Audience: {audienceLabel(notice)} (cannot be changed)</p>
                <div><label className={labelCls}>Title</label><input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Message</label><textarea rows={5} maxLength={5000} value={content} onChange={(e) => setContent(e.target.value)} className={`${inputCls} resize-none`} /></div>
                <div>
                    <label className={labelCls}>Priority</label>
                    <div className="flex gap-2">
                        {['Normal', 'High'].map((p) => (
                            <button key={p} type="button" onClick={() => setPriority(p)}
                                className={`flex-1 rounded-xl border py-2.5 text-xs font-black uppercase tracking-wider ${priority === p ? (p === 'High' ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300') : 'border-slate-200 text-slate-400 dark:border-slate-700'}`}>{p}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Attachment</label>
                    <AttachmentPicker file={file} onFile={setFile} existingUrl={existingUrl} onRemoveExisting={() => setRemoveExisting(true)} />
                </div>
                <button type="submit" disabled={saving} className="w-full rounded-2xl bg-indigo-600 py-3.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button>
            </form>
        </Modal>
    );
};

const SentNoticeList = ({ notices, onChanged, showAuthor = false, emptyText = 'Nothing sent yet.' }) => {
    const [editing, setEditing] = useState(null);

    const confirm = useConfirm();
    const remove = async (n) => {
        if (!(await confirm({ title: 'Delete this notice?', message: `"${n.title}" will be removed and everyone will lose access to it.`, confirmText: 'Delete', tone: 'danger' }))) return;
        try {
            await api.delete(n.target_role === 'targeted' ? `/notices/targeted/${n.id}` : `/notices/${n.id}`);
            toast.success('Notice deleted.');
            onChanged();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not delete the notice.');
        }
    };

    if (notices.length === 0) {
        return (
            <div className="rounded-[28px] border-2 border-dashed border-slate-200 bg-white py-20 text-center dark:border-slate-800 dark:bg-slate-900">
                <Megaphone size={40} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{emptyText}</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {notices.map((n) => <SentCard key={n.id} notice={n} showAuthor={showAuthor} onEdit={setEditing} onDelete={remove} />)}
            </div>
            {editing && <EditModal notice={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
        </>
    );
};

export default SentNoticeList;
