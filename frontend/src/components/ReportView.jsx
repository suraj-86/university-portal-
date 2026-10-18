import React from 'react';
import { createPortal } from 'react-dom';
import { Download, FileSpreadsheet, Printer, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { displayCell, displaySummary, downloadCsv, downloadXlsx } from '../utils/reportExport';

const UNIVERSITY_NAME = 'Babasaheb Bhimrao Ambedkar University';
const PREVIEW_ROWS = 200;

const PRINT_CSS = `
.rp-print-root { display: none; }
@media print {
    @page { size: A4 landscape; margin: 10mm; }
    #root { display: none !important; }
    .rp-print-root { display: block !important; }
    .rp-print-root, .rp-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .rp-print-root table { width: 100%; border-collapse: collapse; font-size: 9px; }
    .rp-print-root th, .rp-print-root td { border: 1px solid #94a3b8; padding: 2px 4px; }
    .rp-print-root thead { display: table-header-group; }
    .rp-print-root tr { break-inside: avoid; }
}
`;

const alignRight = (c) => c.type === 'number' || c.type === 'money' || c.type === 'percent';

const Table = ({ report, limit, compact }) => (
    <table className={`w-full text-left ${compact ? '' : 'text-sm'}`}>
        <thead>
            <tr className={compact ? '' : 'bg-slate-50 dark:bg-slate-800/60'}>
                {report.columns.map((c) => (
                    <th key={c.key} className={`${compact ? '' : 'px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap'} ${alignRight(c) ? 'text-right' : ''} ${c.narrow ? 'text-center' : ''}`}>{c.label}</th>
                ))}
            </tr>
        </thead>
        <tbody>
            {(limit ? report.rows.slice(0, limit) : report.rows).map((row, i) => (
                <tr key={i} className={compact ? '' : 'border-t border-slate-100 dark:border-slate-800'}>
                    {report.columns.map((c) => (
                        <td key={c.key} className={`${compact ? '' : 'px-3 py-1.5 text-slate-700 dark:text-slate-200 whitespace-nowrap'} ${alignRight(c) ? 'text-right tabular-nums' : ''} ${c.narrow ? 'text-center' : ''}`}>
                            {displayCell(row[c.key], c.type)}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

const ReportView = ({ report }) => {
    const exportXlsx = async () => {
        try { await downloadXlsx(report); } catch { toast.error('Could not create the Excel file.'); }
    };
    const empty = report.rows.length === 0;

    return (
        <div className="space-y-4">
            <style>{PRINT_CSS}</style>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{report.title}</h2>
                    {report.subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{report.subtitle}</p>}
                    <p className="text-xs text-slate-400">Generated {report.generated_at}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={empty} onClick={exportXlsx}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
                        <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button type="button" disabled={empty} onClick={() => downloadCsv(report)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50">
                        <Download size={16} /> CSV
                    </button>
                    <button type="button" disabled={empty} onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50">
                        <Printer size={16} /> Print / PDF
                    </button>
                </div>
            </div>

            {report.truncated && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 text-sm text-amber-800 dark:text-amber-200">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>Only the first {report.max_rows.toLocaleString('en-IN')} rows are shown and exported. Narrow the filters to see everything.</span>
                </div>
            )}

            {report.summary && report.summary.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {report.summary.map((s) => (
                        <div key={s.label} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.label}</p>
                            <p className="text-base font-bold text-slate-900 dark:text-white tabular-nums">{displaySummary(s)}</p>
                        </div>
                    ))}
                </div>
            )}

            {empty ? (
                <p className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500">No records match these filters.</p>
            ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                    <Table report={report} limit={PREVIEW_ROWS} />
                    {report.rows.length > PREVIEW_ROWS && (
                        <p className="px-3 py-2 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
                            Showing the first {PREVIEW_ROWS} of {report.rows.length.toLocaleString('en-IN')} rows. Excel, CSV and print include every row.
                        </p>
                    )}
                </div>
            )}

            {createPortal(
                <div className="rp-print-root" style={{ color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>
                    <p style={{ textAlign: 'center', fontWeight: 800, fontSize: 15, textTransform: 'uppercase', margin: 0 }}>{UNIVERSITY_NAME}</p>
                    <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, margin: '2px 0' }}>{report.title}</p>
                    {report.subtitle && <p style={{ textAlign: 'center', fontSize: 10, margin: '0 0 2px' }}>{report.subtitle}</p>}
                    <p style={{ textAlign: 'center', fontSize: 9, margin: '0 0 6px' }}>Generated {report.generated_at}</p>
                    {report.summary && report.summary.length > 0 && (
                        <p style={{ fontSize: 10, margin: '0 0 6px' }}>{report.summary.map((s) => `${s.label}: ${displaySummary(s)}`).join('   ·   ')}</p>
                    )}
                    <Table report={report} compact />
                </div>,
                document.body
            )}
        </div>
    );
};

export default ReportView;
