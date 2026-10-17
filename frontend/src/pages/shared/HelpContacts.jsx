import React, { useEffect, useMemo, useState } from 'react';
import { LifeBuoy, Search, GraduationCap } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import ContactLinks from '../../components/ContactLinks';
import ContactDirectory from '../../components/ContactDirectory';

const HelpContacts = () => {
    const { user } = useAuth();
    const isParent = user?.role === 'parent';
    const [contacts, setContacts] = useState([]);
    const [wardTeachers, setWardTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [query, setQuery] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [c, t] = await Promise.all([
                    api.get('/university-contacts'),
                    isParent ? api.get('/parent/teachers') : Promise.resolve({ data: [] })
                ]);
                if (cancelled) return;
                setContacts(c.data);
                setWardTeachers(t.data);
                setError('');
            } catch {
                if (!cancelled) setError('Could not load contact information. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [isParent, reloadKey]);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return contacts;
        return contacts.filter((c) => [c.name, c.designation, c.category, c.department, c.course_code, c.course_name, c.location, c.email, c.phone]
            .some((v) => v && String(v).toLowerCase().includes(q)));
    }, [contacts, query]);

    const teachers = useMemo(() => {
        const map = new Map();
        wardTeachers.forEach((w) => w.teachers.forEach((t) => {
            const rec = map.get(t.teacher_id) || { ...t, subjects: new Map() };
            t.subjects.forEach((sub) => {
                const entry = rec.subjects.get(sub.code) || { ...sub, wards: [] };
                if (!entry.wards.includes(w.ward)) entry.wards.push(w.ward);
                rec.subjects.set(sub.code, entry);
            });
            map.set(t.teacher_id, rec);
        }));
        return [...map.values()]
            .map((t) => ({ ...t, subjects: [...t.subjects.values()] }))
            .sort((x, y) => x.name.localeCompare(y.name));
    }, [wardTeachers]);
    const wardNames = wardTeachers.map((w) => w.ward);
    const subjectLabel = (sub) =>
        wardNames.length > 1 && sub.wards.length < wardNames.length
            ? `${sub.name} (${sub.wards.join(', ')})`
            : sub.name;

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Help &amp; Contacts</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Official university offices and how to reach them. There is no ticket system: please use the contact details below.
                </p>
            </header>

            {loading ? (
                <p className="text-slate-400 font-bold animate-pulse">Loading…</p>
            ) : error ? (
                <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-5 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
                    <button onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }} className="text-sm font-bold text-rose-700 dark:text-rose-300 underline">Try again</button>
                </div>
            ) : (
                <>
                    <div className="relative max-w-md mb-6">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search offices, departments, people…"
                            aria-label="Search contacts"
                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>

                    {contacts.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
                            <LifeBuoy size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="font-bold text-slate-700 dark:text-slate-300">No contact information has been added yet.</p>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">The university office will publish contact details here.</p>
                        </div>
                    ) : shown.length === 0 ? (
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No contacts match “{query}”.</p>
                    ) : (
                        <ContactDirectory contacts={shown} />
                    )}

                    {isParent && (
                        <section className="mt-10">
                            <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-1">
                                {wardNames.length > 1 ? "Your wards' teachers" : "Your ward's teachers"}
                            </h3>
                            {wardNames.length > 0 && (
                                <p className="px-2 mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {wardTeachers.map((w) => `${w.ward} (${w.course_code}, Sem ${w.semester})`).join(' · ')}
                                </p>
                            )}
                            {wardNames.length === 0 ? (
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 px-2">No active wards are linked to your account.</p>
                            ) : teachers.length === 0 ? (
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 px-2">No teachers are assigned to your ward&apos;s semester yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {teachers.map((t) => (
                                        <article key={t.teacher_id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-sm">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0"><GraduationCap size={18} /></div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-slate-900 dark:text-slate-100 leading-tight">{t.name}</h4>
                                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.designation} · {t.department}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                                                Teaches: {t.subjects.map(subjectLabel).join(', ')}
                                            </p>
                                            <ContactLinks email={t.email} />
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}
        </div>
    );
};

export default HelpContacts;
