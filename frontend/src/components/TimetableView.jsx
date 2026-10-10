import React, { useState, useMemo } from 'react';
import { MapPin, User, Clock3 } from 'lucide-react';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const fmtTime = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${period}`;
};

const todayName = () => {
    const name = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS.includes(name) ? name : null;
};


const TimetableView = ({ slots, showCourse = false, showFaculty = true, renderActions }) => {
    const today = todayName();
    const [view, setView] = useState('weekly');
    const [day, setDay] = useState(today || 'Monday');

    const byDay = useMemo(() => {
        const map = Object.fromEntries(DAYS.map((d) => [d, []]));
        slots.forEach((s) => { if (map[s.day]) map[s.day].push(s); });
        DAYS.forEach((d) => map[d].sort((a, b) => a.start_time.localeCompare(b.start_time)));
        return map;
    }, [slots]);

    const renderCard = (s) => (
        <div key={s.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                    <Clock3 size={12} /> {fmtTime(s.start_time)} - {fmtTime(s.end_time)}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{s.subject_code}</span>
            </div>
            <p className="mt-2 font-bold text-slate-900 dark:text-slate-100 leading-snug">{s.subject_name}</p>
            {showCourse && <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">{s.course_code} - Sem {s.semester}</p>}
            {showFaculty && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <User size={12} className="shrink-0" /> {s.faculty || 'Faculty not assigned'}
                </p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin size={12} className="shrink-0" /> {s.room}
            </p>
            {renderActions && <div className="mt-3 flex gap-2">{renderActions(s)}</div>}
        </div>
    );

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
                    {['weekly', 'daily'].map((v) => (
                        <button key={v} onClick={() => setView(v)}
                            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === v ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 dark:text-slate-400'}`}>
                            {v}
                        </button>
                    ))}
                </div>
                {view === 'daily' && (
                    <div className="flex flex-wrap gap-2">
                        {DAYS.map((d) => (
                            <button key={d} onClick={() => setDay(d)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${day === d ? 'bg-slate-900 dark:bg-slate-700 text-white border-transparent' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'}`}>
                                {d.slice(0, 3)}{d === today ? ' (today)' : ''}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {view === 'weekly' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {DAYS.map((d) => (
                        <section key={d} className={`rounded-[24px] border p-4 bg-white dark:bg-slate-900 shadow-sm ${d === today ? 'border-indigo-300 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-800'}`}>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-1">
                                {d}{d === today && <span className="ml-2 text-indigo-600 dark:text-indigo-400">Today</span>}
                            </h3>
                            <div className="space-y-3">
                                {byDay[d].length ? byDay[d].map(renderCard)
                                    : <p className="text-sm text-slate-400 dark:text-slate-500 italic px-1 py-4">No classes</p>}
                            </div>
                        </section>
                    ))}
                </div>
            ) : (
                <div className="max-w-2xl space-y-3">
                    {byDay[day].length ? byDay[day].map(renderCard)
                        : <div className="py-16 text-center rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 font-bold uppercase text-xs tracking-widest">No classes on {day}</div>}
                </div>
            )}
        </div>
    );
};

export default TimetableView;
