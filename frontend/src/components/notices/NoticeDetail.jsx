import React from 'react';
import Modal from '../Modal';
import AttachmentChip from './AttachmentChip';
import { fullDateTime, initials } from '../../utils/format';

export const sourceOf = (n) => {
    if (n.is_personal) return { label: 'For you', cls: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' };
    if (n.author_role === 'teacher') return { label: 'Faculty', cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400' };
    return { label: 'Administration', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
};

const NoticeDetail = ({ notice, onClose }) => {
    if (!notice) return null;
    const source = sourceOf(notice);
    const high = notice.priority === 'High';
    return (
        <Modal isOpen={!!notice} onClose={onClose} title="Notice">
            <div className="flex max-h-[75vh] flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${source.cls}`}>{source.label}</span>
                    {high && <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">High priority</span>}
                    {notice.subject_name && <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{notice.subject_name}</span>}
                </div>

                <div>
                    <h3 className="text-2xl font-black leading-tight text-slate-900 dark:text-slate-100">{notice.title}</h3>
                    <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">{initials(notice.author_name)}</div>
                        <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{notice.author_role === 'admin' ? 'Administration' : notice.author_name}</p>
                            <p className="text-xs text-slate-400">{fullDateTime(notice.created_at)}</p>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{notice.content}</p>
                </div>

                {notice.attachment_url && (
                    <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Attachment</p>
                        <AttachmentChip url={notice.attachment_url} />
                    </div>
                )}

                <button type="button" onClick={onClose} className="w-full rounded-2xl bg-slate-900 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700">
                    Close
                </button>
            </div>
        </Modal>
    );
};

export default NoticeDetail;
