import React from 'react';

const StatusBadge = ({ type }) => {
    const styles = {
        // For Students/Teachers Status
        Active: "bg-emerald-50 text-emerald-600 border-emerald-100",
        Suspended: "bg-rose-50 text-rose-600 border-rose-100",
        Graduated: "bg-blue-50 text-blue-600 border-blue-100",
        // For Notice Priority
        High: "bg-rose-100 text-rose-700 border-rose-200 font-black",
        Normal: "bg-slate-100 text-slate-600 border-slate-200",
        Urgent: "bg-red-600 text-white border-red-700 animate-pulse"
    };

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-tighter border ${styles[type] || styles.Normal}`}>
            {type}
        </span>
    );
};

export default StatusBadge;