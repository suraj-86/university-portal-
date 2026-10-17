import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users, UserRound } from 'lucide-react';
import api from '../../services/api';
import ContactLinks from '../../components/ContactLinks';

const ALL = 'all';
const classKey = (s) => `${s.course_id}-${s.semester}`;

const TeacherContacts = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [picked, setPicked] = useState('');
    const [query, setQuery] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await api.get('/teacher/contacts');
                if (cancelled) return;
                setStudents(res.data.students || []);
                setError('');
            } catch {
                if (!cancelled) setError('Could not load contacts. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [reloadKey]);

    const classes = useMemo(() => {
        const map = new Map();
        students.forEach((s) => {
            const key = classKey(s);
            const rec = map.get(key) || { key, course_code: s.course_code, course_name: s.course_name, semester: s.semester, count: 0 };
            rec.count += 1;
            map.set(key, rec);
        });
        return [...map.values()].sort((a, b) => a.course_code.localeCompare(b.course_code) || a.semester - b.semester);
    }, [students]);

    const selected = picked && (picked === ALL || classes.some((c) => c.key === picked)) ? picked : (classes[0] ? classes[0].key : ALL);
    const current = classes.find((c) => c.key === selected);

    const q = query.trim().toLowerCase();
    const shown = students.filter((s) => {
        if (selected !== ALL && classKey(s) !== selected) return false;
        if (!q) return true;
        return [s.name, s.roll_number, s.enrollment_number, s.guardian_name, ...s.parents.map((p) => p.name)]
            .some((v) => v && String(v).toLowerCase().includes(q));
    });

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Student &amp; Parent Contacts</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Only students in the courses and semesters you teach. Please use these details for academic purposes only.
                </p>
            </header>

            {loading ? (
                <p className="text-slate-400 font-bold animate-pulse">Loading…</p>
            ) : error ? (
                <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-5 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
                    <button onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }} className="text-sm font-bold text-rose-700 dark:text-rose-300 underline">Try again</button>
                </div>
            ) : students.length === 0 ? (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No students are linked to your assigned subjects yet.</p>
            ) : (
                <>
                    <div className="flex flex-wrap items-end gap-3 mb-2">
                        <div className="space-y-1">
                            <label htmlFor="tc-class" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Class</label>
                            <select id="tc-class" value={selected} onChange={(e) => setPicked(e.target.value)}
                                className="block py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none min-w-[220px]">
                                {classes.map((c) => (
                                    <option key={c.key} value={c.key}>{c.course_code} · Semester {c.semester} ({c.count})</option>
                                ))}
                                {classes.length > 1 && <option value={ALL}>All my classes ({students.length})</option>}
                            </select>
                        </div>
                        <div className="space-y-1 flex-1 min-w-[220px] max-w-md">
                            <label htmlFor="tc-search" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Search</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input id="tc-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Student name, roll number or parent name…"
                                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/40" />
                            </div>
                        </div>
                    </div>
                    <p className="mb-5 ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {current ? `${current.course_name} · Semester ${current.semester} · ` : 'All classes · '}
                        showing {shown.length} of {current ? current.count : students.length} students
                    </p>

                    {shown.length === 0 ? (
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            No students match “{query}” in {current ? `${current.course_code} Sem ${current.semester}` : 'your classes'}.
                            {classes.length > 1 && selected !== ALL && ' Try “All my classes”.'}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {shown.map((s) => {
                                const parentPhones = s.parents.map((p) => String(p.phone || '').replace(/\D/g, ''));
                                const showGuardian = (s.guardian_name || s.guardian_phone) &&
                                    !(s.guardian_phone && parentPhones.includes(String(s.guardian_phone).replace(/\D/g, '')));
                                return (
                                    <article key={s.student_id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-sm">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"><Users size={18} /></div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-slate-900 dark:text-slate-100 leading-tight">{s.name}</h4>
                                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    {[s.roll_number && `Roll ${s.roll_number}`, s.course_code, `Sem ${s.semester}`].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                        </div>
                                        <ContactLinks phone={s.phone} email={s.email} />

                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                            {s.parents.map((p, i) => (
                                                <div key={`${p.name}-${i}`}>
                                                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                                        <UserRound size={12} /> Parent: <span className="normal-case tracking-normal text-slate-600 dark:text-slate-300 text-xs font-bold">{p.name}</span>
                                                    </p>
                                                    <ContactLinks phone={p.phone} email={p.email} />
                                                </div>
                                            ))}
                                            {showGuardian && (
                                                <div>
                                                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                                        <UserRound size={12} /> Guardian:
                                                        <span className="normal-case tracking-normal text-slate-600 dark:text-slate-300 text-xs font-bold">
                                                            {s.guardian_name || 'On file'}{s.guardian_relation ? ` (${s.guardian_relation})` : ''}
                                                        </span>
                                                    </p>
                                                    <ContactLinks phone={s.guardian_phone} />
                                                </div>
                                            )}
                                            {s.parents.length === 0 && !showGuardian && (
                                                <p className="text-xs font-medium text-slate-400">No parent or guardian contact on file</p>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TeacherContacts;
