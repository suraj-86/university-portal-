import React from 'react';
import { Link } from 'react-router-dom';

const DashCard = ({ title, subtitle, footer, children, className = '' }) => (
    <section aria-label={title} className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 shadow-sm ${className}`}>
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">{subtitle}</p>}
        {!subtitle && <div className="mb-3" />}
        {children}
        {footer && (
            <p className="mt-3 text-sm">
                <Link to={footer.to} className="font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">{footer.label}</Link>
            </p>
        )}
    </section>
);

export default DashCard;
