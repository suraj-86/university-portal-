import React, { useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import Modal from './Modal';
import { downloadTextFile } from '../utils/csv';
import { toCSV } from '../utils/spreadsheet';

const PasswordResultModal = ({ isOpen, onClose, title = 'Temporary password', entries = [] }) => {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(entries.map((e) => `${e.username}: ${e.password}`).join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
        }
    };

    const close = () => { setCopied(false); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={close} title={title}>
            <div className="space-y-4">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    This is shown only once. Give it to the user securely. They must choose their own password the first time they log in.
                </p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                    {entries.map((e) => (
                        <div key={e.username} className="p-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{e.username}</span>
                            <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100 select-all">{e.password}</span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={copy}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">
                        {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button type="button"
                        onClick={() => downloadTextFile('temporary_passwords.csv', toCSV([['username', 'temporary_password'], ...entries.map((e) => [e.username, e.password])]))}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">
                        <Download size={16} /> Download CSV
                    </button>
                    <button type="button" onClick={close} className="ml-auto px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400">Done</button>
                </div>
            </div>
        </Modal>
    );
};

export default PasswordResultModal;
