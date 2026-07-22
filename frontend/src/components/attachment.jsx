import React from 'react';
import { FileText, Download } from 'lucide-react';
import { getFileUrl } from '../services/api';

const AttachmentCard = ({ fileName }) => {
    if (!fileName) return null;

    const handleDownload = () => {
        window.open(getFileUrl(fileName), '_blank');
    };

    return (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 w-full sm:w-80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 mt-2 shadow-sm gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                    <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{fileName.replace('/uploads/', '')}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Document Attached</p>
                </div>
            </div>
            <button 
                onClick={handleDownload} 
                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors shrink-0" 
                title="Download Document"
            >
                <Download size={16} />
            </button>
        </div>
    );
};

export default AttachmentCard;