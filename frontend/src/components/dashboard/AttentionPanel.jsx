import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

const DOT = { rose: 'bg-rose-500', amber: 'bg-amber-500', blue: 'bg-blue-500' };

const AttentionPanel = ({ title = 'Needs your attention', items, allClearText = 'Nothing needs your attention right now.', doneItems = [] }) => (
    <section aria-labelledby="attention-title" className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5">
            <h2 id="attention-title" className="text-lg font-black text-slate-900 dark:text-slate-100">{title}</h2>
            {items.length > 0 && (
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 rounded-full px-3 py-1">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
            )}
        </div>
        {items.map((it) => (
            <div key={it.key} className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT[it.tone] || DOT.blue}`} />
                <p className="flex-1 min-w-0 text-[15px] leading-snug text-slate-800 dark:text-slate-200">{it.text}</p>
                {it.to && (
                    <Link to={it.to}
                        className={it.button
                            ? 'shrink-0 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4 py-2'
                            : 'shrink-0 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline whitespace-nowrap'}>
                        {it.linkLabel}
                    </Link>
                )}
            </div>
        ))}
        {items.length === 0 && (
            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <p className="text-[15px] text-slate-600 dark:text-slate-300">{allClearText}</p>
            </div>
        )}
        {doneItems.map((text) => (
            <div key={text} className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <p className="text-[15px] text-slate-600 dark:text-slate-300">{text}</p>
            </div>
        ))}
    </section>
);

export default AttentionPanel;
