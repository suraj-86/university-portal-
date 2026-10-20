import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useLoad from '../../hooks/useLoad';
import { plural } from '../../utils/dashboardUi';
import { ListHeader, LoadState, selectCls } from '../../components/admin/ListParts';

const Page = ({ children }) => <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">{children}</div>;

const SubjectCards = ({ userId, insights }) => {
    const current = Number(insights.profile.semester) || 1;
    const [semester, setSemester] = useState(current);
    const { data, loading, error, reload } = useLoad([`/student/${userId}/subjects?semester=${semester}`]);
    const subjects = data ? data[0].subjects || [] : [];
    const semesters = data && data[0].available_semesters?.length ? data[0].available_semesters : Array.from({ length: Math.max(current, 4) }, (_, i) => i + 1);
    const attBy = new Map(insights.attendance.bySubject.map((a) => [a.subject_id, a]));
    const low = insights.attendance.lowThreshold;
    const credits = subjects.reduce((s, x) => s + (Number(x.credits) || 0), 0);

    return (
        <Page>
            <ListHeader title="My subjects"
                line={data ? `Semester ${semester}${semester === current ? ' (current)' : ''} · ${plural(subjects.length, 'subject')}${credits ? ` · ${plural(credits, 'credit')}` : ''}` : ' '}
                actions={
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Semester
                        <select value={semester} onChange={(e) => setSemester(Number(e.target.value))} className={selectCls}>
                            {semesters.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                    </label>
                } />
            <LoadState loading={loading} error={error} onRetry={reload}>
                {subjects.length === 0 ? (
                    <p className="py-16 text-center text-slate-500 dark:text-slate-400 font-semibold bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[28px]">No subjects are listed for this semester yet.</p>
                ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {subjects.map((s) => {
                            const att = semester === current ? attBy.get(s.id) : null;
                            const isLow = att && att.percent !== null && att.percent < low;
                            return (
                                <li key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 shadow-sm flex flex-col gap-4">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.code}{s.credits ? ` · ${plural(Number(s.credits), 'credit')}` : ''}</p>
                                        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-snug mt-1">{s.name}</h2>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">Taught by <b className="text-slate-900 dark:text-slate-100">{s.teacher_name}</b></p>
                                    {att && att.total > 0 && (
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-600 dark:text-slate-300">Attendance</span>
                                                <span className={`font-bold ${isLow ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>{att.percent}%{isLow ? ' (below ' + low + '%)' : ''}</span>
                                            </div>
                                            <div role="progressbar" aria-valuenow={Math.round(att.percent)} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.name} attendance`} className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                <div className={`h-full ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, att.percent)}%` }} />
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{att.present} of {att.total} classes attended</p>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                <p className="mt-5 text-sm"><Link to="/student/attendance" className="font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">Open attendance →</Link></p>
            </LoadState>
        </Page>
    );
};

const StudentSubjects = () => {
    const { user } = useAuth();
    const urls = user?.id ? [`/student/${user.id}/insights`] : [];
    const { data, loading, error, reload } = useLoad(urls);
    if (!data) return <Page><LoadState loading={loading} error={error} onRetry={reload} /></Page>;
    return <SubjectCards key={user.id} userId={user.id} insights={data[0]} />;
};

export default StudentSubjects;
