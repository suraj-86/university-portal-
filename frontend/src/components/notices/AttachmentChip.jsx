import React from 'react';
import { FileText, Download } from 'lucide-react';
import { getFileUrl } from '../../services/api';
import { fileDisplayName } from '../../utils/format';

// Compact attachment link: icon, readable name, download arrow
const AttachmentChip = ({ url, className = '' }) => {
    if (!url) return null;
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); window.open(getFileUrl(url), '_blank'); }}
            className={`inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 ${className}`}
        >
            <FileText size={14} className="shrink-0 text-indigo-500" />
            <span className="truncate">{fileDisplayName(url)}</span>
            <Download size={13} className="shrink-0 opacity-60" />
        </button>
    );
};

export default AttachmentChip;
