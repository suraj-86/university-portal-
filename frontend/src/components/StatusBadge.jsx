import React from 'react';

const StatusBadge = ({ status }) => {
    const getStyles = (st) => {
        const lower = st?.toLowerCase();
        if (lower === 'paid' || lower === 'active' || lower === 'present' || lower === 'high') {
            return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900';
        }
        if (lower === 'partial' || lower === 'pending' || lower === 'normal') {
            return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900';
        }
        return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900';
    };

    return (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStyles(status)}`}>
            {status}
        </span>
    );
};

export default StatusBadge;