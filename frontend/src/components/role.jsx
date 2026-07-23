import React from 'react';

const RoleBadge = ({ role }) => {
    const getRoleStyles = (r) => {
        const lower = r?.toLowerCase();
        if (lower === 'admin') return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900';
        if (lower === 'teacher' || lower === 'faculty') return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900';
        if (lower === 'student') return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900';
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    };

    return (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${getRoleStyles(role)}`}>
            {role}
        </span>
    );
};

export default RoleBadge;