import React, { useState } from 'react';
import { UploadCloud, Download, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { parseCSV, downloadTextFile } from '../utils/csv';

const CsvImportModal = ({ isOpen, onClose, title, headers, required, sample, templateName, mapRow, previewKeys, onSubmit, onDone }) => {
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState([]);
    const [fileError, setFileError] = useState('');
    const [serverErrors, setServerErrors] = useState([]);
    const [busy, setBusy] = useState(false);

    const reset = () => { setFileName(''); setRows([]); setFileError(''); setServerErrors([]); setBusy(false); };
    const close = () => { reset(); onClose(); };

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        reset();
        if (!file) return;
        if (!/\.csv$/i.test(file.name)) { setFileError('Please choose a .csv file. In Excel use File > Save As > CSV.'); return; }
        if (file.size > 1024 * 1024) { setFileError('File is too large (max 1 MB).'); return; }
        setFileName(file.name);

        const parsed = parseCSV(await file.text()).filter((r) => r.some((c) => String(c).trim() !== ''));
        if (parsed.length < 2) { setFileError('The file has no data rows.'); return; }

        const head = parsed[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
        const missing = (required || headers).filter((h) => !head.includes(h));
        if (missing.length) { setFileError(`Missing column(s): ${missing.join(', ')}. Download the template to see the format.`); return; }

        const out = parsed.slice(1).map((cells, i) => {
            const obj = {};
            headers.forEach((h) => { obj[h] = (cells[head.indexOf(h)] ?? '').toString().trim(); });
            const result = mapRow(obj);
            return { line: i + 2, ...result };
        });
        if (out.length > 500) { setFileError('Too many rows (max 500 per import). Split the file.'); return; }
        setRows(out);
    };

    const validRows = rows.filter((r) => r.value);
    const invalidRows = rows.filter((r) => r.error);

    const confirm = async () => {
        setBusy(true);
        setServerErrors([]);
        try {
            const res = await onSubmit(validRows.map((r) => ({ ...r.value, row: r.line })));
            toast.success(`Imported ${res?.data?.saved ?? validRows.length} row(s).`);
            reset();
            onDone();
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.length) setServerErrors(data.errors);
            toast.error(data?.error || 'Import failed. Nothing was saved.');
            setBusy(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={close} title={title}>
            <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => downloadTextFile(templateName, sample)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <Download size={16} /> Download template
                    </button>
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer">
                        <UploadCloud size={16} /> Choose CSV file
                        <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                    </label>
                    {fileName && <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1"><FileText size={14} /> {fileName}</span>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Columns: <b>{headers.join(', ')}</b>. Dates can be <b>YYYY-MM-DD</b> or <b>DD/MM/YYYY</b>. Existing entries with the same key are updated.
                </p>

                {fileError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-sm font-bold flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" /> {fileError}
                    </div>
                )}

                {rows.length > 0 && (
                    <>
                        <div className="flex gap-3 text-xs font-black uppercase tracking-wider">
                            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{rows.length} rows</span>
                            <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">{validRows.length} valid</span>
                            <span className={`px-3 py-1 rounded-lg ${invalidRows.length ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{invalidRows.length} invalid</span>
                        </div>
                        <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase tracking-wider sticky top-0">
                                    <tr><th className="p-2">Row</th>{previewKeys.map((k) => <th key={k} className="p-2">{k}</th>)}<th className="p-2">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                                    {rows.map((r) => (
                                        <tr key={r.line} className={r.error ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}>
                                            <td className="p-2 font-bold">{r.line}</td>
                                            {previewKeys.map((k) => <td key={k} className="p-2">{r.value ? (r.value[k] ?? '-') : '-'}</td>)}
                                            <td className="p-2 font-bold">{r.error ? <span className="text-rose-600 dark:text-rose-400">{r.error}</span> : <span className="text-emerald-600 dark:text-emerald-400">OK</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {serverErrors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold space-y-1">
                        {serverErrors.map((e, i) => <div key={i}>Row {e.row}: {e.error}</div>)}
                    </div>
                )}

                <button type="button" disabled={busy || rows.length === 0 || invalidRows.length > 0} onClick={confirm}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all">
                    {busy ? 'Importing...' : invalidRows.length > 0 ? 'Fix the invalid rows to continue' : `Confirm import (${validRows.length} rows)`}
                </button>
            </div>
        </Modal>
    );
};

export default CsvImportModal;
