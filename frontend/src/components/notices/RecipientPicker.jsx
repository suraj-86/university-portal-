import React, { useState, useMemo } from 'react';
import { Search, Users } from 'lucide-react';

// Multi-select list of students, with a class filter and search.
// students: [{ student_id, name, roll, course_code, course_name, semester, parents }]
const RecipientPicker = ({ students, selected, onChange }) => {
    const [classKey, setClassKey] = useState('all');
    const [query, setQuery] = useState('');

    const classes = useMemo(() => {
        const map = new Map();
        students.forEach((s) => {
            const key = `${s.course_id}-${s.semester}`;
            if (!map.has(key)) map.set(key, { key, label: `${s.course_code || s.course_name} · Sem ${s.semester}` });
        });
        return [...map.values()];
    }, [students]);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return students.filter((s) =>
            (classKey === 'all' || `${s.course_id}-${s.semester}` === classKey) &&
            (!q || s.name.toLowerCase().includes(q) || String(s.roll || '').toLowerCase().includes(q))
        );
    }, [students, classKey, query]);

    const chosen = new Set(selected);
    const toggle = (id) => onChange(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    const selectShown = () => onChange([...new Set([...selected, ...shown.map((s) => s.student_id)])]);
    const clearShown = () => { const hide = new Set(shown.map((s) => s.student_id)); onChange(selected.filter((id) => !hide.has(id))); };
    const allShownChosen = shown.length > 0 && shown.every((s) => chosen.has(s.student_id));

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-3 dark:border-slate-800 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search name or roll no."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                </div>
                <select
                    value={classKey}
                    onChange={(e) => setClassKey(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                    <option value="all">All classes</option>
                    {classes.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
            </div>

            <div className="flex items-center justify-between gap-3 bg-slate-50/70 px-4 py-2 text-xs font-bold dark:bg-slate-800/40">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Users size={14} /> {selected.length} selected · {shown.length} shown</span>
                <span className="flex gap-3">
                    <button type="button" onClick={allShownChosen ? clearShown : selectShown} className="text-indigo-600 hover:underline dark:text-indigo-400">
                        {allShownChosen ? 'Unselect shown' : 'Select all shown'}
                    </button>
                    {selected.length > 0 && <button type="button" onClick={() => onChange([])} className="text-rose-500 hover:underline">Clear</button>}
                </span>
            </div>

            <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {shown.length === 0 ? (
                    <p className="p-6 text-center text-sm font-bold text-slate-400">No students found.</p>
                ) : shown.map((s) => (
                    <label key={s.student_id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <input type="checkbox" checked={chosen.has(s.student_id)} onChange={() => toggle(s.student_id)} className="h-4 w-4 accent-indigo-600" />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                            <span className="block truncate text-[11px] text-slate-400">{s.roll || 'No roll no.'} · {s.course_code || s.course_name} Sem {s.semester}</span>
                        </span>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${s.parents ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                            {s.parents ? `${s.parents} parent${s.parents > 1 ? 's' : ''}` : 'no parent'}
                        </span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default RecipientPicker;
