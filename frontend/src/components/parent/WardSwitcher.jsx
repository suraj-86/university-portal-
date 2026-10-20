import React from 'react';

const WardSwitcher = ({ wards, currentId, onChange }) => wards.length > 1 ? (
    <div className="mb-4 flex items-center gap-3">
        <label htmlFor="ward-switch" className="text-sm font-semibold text-slate-600 dark:text-slate-300">Showing</label>
        <select id="ward-switch" value={currentId} onChange={(e) => onChange(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold px-3 py-2">
            {wards.map((w) => <option key={w.student_id} value={w.student_id}>{w.full_name}{w.roll_number ? ` (Roll ${w.roll_number})` : ''}</option>)}
        </select>
    </div>
) : null;

export default WardSwitcher;
