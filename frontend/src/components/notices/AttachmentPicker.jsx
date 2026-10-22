import React from 'react';
import { Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateAttachment, fileDisplayName } from '../../utils/format';

const AttachmentPicker = ({ file, onFile, existingUrl, onRemoveExisting }) => {
    const choose = (e) => {
        const picked = e.target.files?.[0] || null;
        e.target.value = '';
        const problem = validateAttachment(picked);
        if (problem) { toast.error(problem); return; }
        onFile(picked);
    };

    const current = file ? file.name : existingUrl ? fileDisplayName(existingUrl) : '';

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Paperclip size={14} className="text-indigo-500" />
                {current ? 'Replace file' : 'Attach a file'}
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={choose} />
            </label>
            {current ? (
                <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span className="truncate">{current}</span>
                    <button
                        type="button"
                        onClick={() => (file ? onFile(null) : onRemoveExisting && onRemoveExisting())}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                        title="Remove"
                    >
                        <X size={14} />
                    </button>
                </span>
            ) : (
                <span className="text-[11px] text-slate-400">PDF, DOC or DOCX, up to 5 MB (optional)</span>
            )}
        </div>
    );
};

export default AttachmentPicker;
