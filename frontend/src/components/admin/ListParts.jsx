import React from 'react';
import { Search, X } from 'lucide-react';

export const primaryBtn = 'inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 shadow-sm';
export const secondaryBtn = 'inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-sm px-5 py-3 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800';
export const selectCls = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-800';
export const modalSelectCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500';

// Title, one quiet line (live counts), and the page actions.
export const ListHeader = ({ title, line, actions }) => (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{title}</h1>
            {line && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{line}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
);

// Search box, dropdown filters, and "Showing x of y" with Clear filters.
// filters: [{ id, label, value, onChange, options: [{ value, label }], allLabel }]
export const FilterBar = ({ search, onSearch, placeholder, filters = [], shown, total, noun, onClear }) => {
    const active = !!search || filters.some((f) => f.value !== '');
    return (
        <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                <input type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} aria-label={placeholder}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-800" />
            </div>
            {filters.map((f) => (
                <select key={f.id} value={f.value} onChange={(e) => f.onChange(e.target.value)} aria-label={f.label} className={selectCls}>
                    <option value="">{f.allLabel || `All ${f.label.toLowerCase()}s`}</option>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            ))}
            <p className="text-sm text-slate-600 dark:text-slate-300 ml-auto" aria-live="polite">
                {active ? `Showing ${shown} of ${total} ${noun}` : `${total} ${noun}`}
            </p>
            {active && (
                <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">
                    <X size={14} aria-hidden="true" /> Clear filters
                </button>
            )}
        </div>
    );
};

export const LoadState = ({ loading, error, onRetry, children }) => {
    if (loading) return <p className="py-10 text-slate-400 font-bold animate-pulse">Loading…</p>;
    if (error) {
        return (
            <div className="rounded-[28px] border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-5 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
                <button type="button" onClick={onRetry} className="text-sm font-bold text-rose-700 dark:text-rose-300 underline">Try again</button>
            </div>
        );
    }
    return children;
};

export const FormError = ({ message }) => message ? (
    <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm font-bold text-rose-700 dark:text-rose-300">{message}</p>
) : null;

export const FieldLabel = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 mb-1">{children}</label>
);

export const ModalActions = ({ onCancel, busy, submitLabel, busyLabel = 'Saving…' }) => (
    <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">Cancel</button>
        <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50">{busy ? busyLabel : submitLabel}</button>
    </div>
);

export const RowActions = ({ children }) => <div className="flex justify-end gap-1">{children}</div>;

export const IconAction = ({ label, onClick, tone = 'indigo', children }) => {
    const tones = {
        indigo: 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50',
        rose: 'text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
    };
    return <button type="button" onClick={onClick} title={label} aria-label={label} className={`p-2 rounded-lg ${tones[tone]}`}>{children}</button>;
};
