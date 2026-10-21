import React from 'react';
import { Link } from 'react-router-dom';
import { todayLabel, greeting } from '../../utils/dashboardUi';

const DashHeader = ({ name, facts = [] }) => (
    <header className="mb-6 rounded-3xl bg-gradient-to-r from-blue-50 to-sky-100 dark:from-slate-900 dark:to-blue-950/60 border border-blue-100 dark:border-slate-800 px-6 py-5 md:px-8 md:py-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{todayLabel()}</p>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{greeting()}, <span className="text-blue-600 dark:text-blue-400">{name}</span></h1>
        {facts.length > 0 && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-2">
                {facts.map((f, i) => (
                    <span key={f.label}>
                        {f.to
                            ? <Link to={f.to} className="font-semibold text-slate-900 dark:text-slate-100 hover:underline">{f.label}</Link>
                            : <span className="font-semibold text-slate-900 dark:text-slate-100">{f.label}</span>}
                        {i < facts.length - 1 && <span className="ml-2 text-slate-400">·</span>}
                    </span>
                ))}
            </p>
        )}
    </header>
);

export default DashHeader;
