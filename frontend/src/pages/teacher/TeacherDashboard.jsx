import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import DashHeader from '../../components/dashboard/DashHeader';
import AttentionPanel from '../../components/dashboard/AttentionPanel';
import DashCard from '../../components/dashboard/DashCard';
import { TrendLines, ThresholdBars, ColumnChart, ProgressList } from '../../components/dashboard/DashCharts';
import { plural, weekLabel, shortBand } from '../../utils/dashboardUi';

const STATE_CHIP = {
    unmarked: { label: 'Not marked', cls: 'text-rose-800 bg-rose-100 dark:text-rose-200 dark:bg-rose-900/40' },
    marked: { label: 'Marked', cls: 'text-emerald-800 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/40' },
    upcoming: { label: 'Upcoming', cls: 'text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800' }
};

const TeacherDashboard = () => {
    const { user } = useAuth();
    const [state, setState] = useState({ key: null, insights: null, notices: [], counts: {}, error: false });
    const [reloadKey, setReloadKey] = useState(0);
    const key = `${user?.id}:${reloadKey}`;
    const loading = !!user?.id && state.key !== key;

    useEffect(() => {
        if (!user?.id) return undefined;
        let cancelled = false;
        // Notices and unread counts are nice to have; the dashboard still works without them.
        Promise.all([
            api.get(`/teacher/${user.id}/insights`),
            api.get(`/teacher/${user.id}/dashboard`).then((r) => r.data.notices || []).catch(() => []),
            api.get('/inbox/counts').then((r) => r.data || {}).catch(() => ({}))
        ])
            .then(([ins, notices, counts]) => { if (!cancelled) setState({ key, insights: ins.data, notices, counts, error: false }); })
            .catch(() => { if (!cancelled) setState({ key, insights: null, notices: [], counts: {}, error: true }); });
        return () => { cancelled = true; };
    }, [user, key]);

    if (loading) return <div className="p-10 text-slate-400 font-bold animate-pulse">Loading your dashboard…</div>;
    if (state.error || !state.insights) {
        return (
            <div className="p-6 md:p-10">
                <div className="rounded-[28px] border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">The dashboard could not be loaded.</p>
                    <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-bold text-rose-700 dark:text-rose-300 underline">Try again</button>
                </div>
            </div>
        );
    }

    const { insights, notices, counts } = state;
    const { todayClasses, atRisk, trend, analytics } = insights;
    const attBySubject = analytics.attendanceBySubject.map((x) => ({ name: x.subject, value: x.percent }));
    const marksAvg = analytics.marksBySubject.map((x) => ({ name: x.subject, value: x.average }));
    const bands = analytics.marksBands.map((b) => ({ name: shortBand(b.label), count: b.count }));
    const passRows = analytics.marksBySubject.map((x) => ({ label: x.subject, value: x.passRate || 0, total: 100, caption: `${x.passRate}% passed (${x.entries} entries)` }));
    const first = insights.firstUnmarked;

    const facts = [
        { label: plural(insights.counts.subjects, 'subject'), to: '/teacher/subjects' },
        { label: plural(insights.counts.students, 'student') },
        { label: plural(insights.counts.classesToday, 'class', 'classes') + ' today', to: '/teacher/timetable' }
    ];
    if (insights.counts.averageAttendance !== null) facts.push({ label: `${insights.counts.averageAttendance}% average attendance`, to: '/teacher/reports' });

    const items = [];
    if (first) {
        const more = insights.unmarkedCount - 1;
        items.push({
            key: 'unmarked', tone: 'rose', button: true, to: '/teacher/attendance', linkLabel: 'Mark attendance',
            text: <>Attendance is <b>not marked</b> for <b>{first.subject}, {first.start}</b> ({first.course} Sem {first.semester}){more > 0 ? ` and ${plural(more, 'other class', 'other classes')}` : ''}</>
        });
    }
    if (atRisk.count > 0) {
        const sid = atRisk.items[0]?.subject_id;
        items.push({
            key: 'risk', tone: 'amber', to: `/teacher/reports?report=attendance-low${sid ? `&subject_id=${sid}` : ''}`, linkLabel: 'See who →',
            text: <><b>{plural(atRisk.count, 'student')}</b> {atRisk.count === 1 ? 'is' : 'are'} below {trend.lowThreshold}% attendance in your subjects</>
        });
    }
    if (counts.messages > 0) {
        items.push({ key: 'msg', tone: 'blue', to: '/teacher/messages', linkLabel: 'Open messages →', text: <><b>{plural(counts.messages, 'unread message')}</b></> });
    }
    if (counts.notices > 0) {
        items.push({ key: 'notice', tone: 'blue', to: '/teacher/notices', linkLabel: 'Open notices →', text: <><b>{plural(counts.notices, 'unread notice')}</b></> });
    }

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <DashHeader name={insights.teacherName || user?.full_name || 'Professor'} facts={facts} />
            <AttentionPanel items={items} allClearText={todayClasses.length ? 'Attendance is up to date and nothing is waiting for you.' : 'No classes today and nothing is waiting for you.'} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <DashCard title="Today's classes" footer={{ to: '/teacher/timetable', label: 'Open timetable →' }}>
                    {todayClasses.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">You have no classes scheduled today.</p>
                    ) : (
                        <ul>
                            {todayClasses.map((c) => {
                                const chip = STATE_CHIP[c.state];
                                return (
                                    <li key={c.id} className="flex items-center gap-4 py-3.5 border-t border-slate-100 dark:border-slate-800">
                                        <span className="w-20 text-sm font-bold text-slate-900 dark:text-slate-100">{c.start}</span>
                                        <span className="flex-1 min-w-0 text-sm">
                                            <b className="text-slate-900 dark:text-slate-100 block truncate">{c.subject}</b>
                                            <span className="text-slate-500 dark:text-slate-400">{c.course} Sem {c.semester}{c.room ? ` · Room ${c.room}` : ''}</span>
                                        </span>
                                        <span className={`text-xs font-bold rounded-full px-2.5 py-1 whitespace-nowrap ${chip.cls}`}>{chip.label}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </DashCard>

                <DashCard title="Attendance by subject" subtitle={`Present % per week, last ${trend.weeks.length} weeks. Dashed line is ${trend.lowThreshold}%.`}>
                    <TrendLines weeks={trend.weeks.map(weekLabel)} series={trend.series} min={trend.lowThreshold}
                        label="Weekly attendance percentage for each of your subjects" />
                </DashCard>
            </div>

            <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mt-10 mb-4">Your subjects at a glance</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <DashCard title="Overall attendance by subject" subtitle={`Present % across all classes so far. Dashed line is ${trend.lowThreshold}%.`}
                    footer={{ to: '/teacher/reports?report=attendance-summary', label: 'Open attendance summary →' }}>
                    <ThresholdBars data={attBySubject} min={trend.lowThreshold} label="Overall attendance percentage for each of your subjects" />
                </DashCard>
                <DashCard title="Average marks by subject" subtitle={`% of marks across all assessments. Dashed line is the ${analytics.passPercent}% pass mark.`}
                    footer={{ to: '/teacher/reports?report=marks-sheet', label: 'Open marks sheet →' }}>
                    <ThresholdBars data={marksAvg} min={analytics.passPercent} label="Average marks percentage for each of your subjects" emptyText="No marks entered yet." />
                </DashCard>
                <DashCard title="Marks distribution" subtitle="All marks you have entered, by percentage band.">
                    <ColumnChart data={bands} xKey="name" yKey="count" name="Marks entries" label="Number of marks entries in each percentage band" emptyText="No marks entered yet." />
                </DashCard>
                <DashCard title="Pass rate by subject" subtitle={`Share of marks entries at or above ${analytics.passPercent}%.`}>
                    <ProgressList rows={passRows} emptyText="No marks entered yet." />
                </DashCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashCard title="Students at risk in your subjects" className="lg:col-span-2"
                    subtitle={atRisk.count > 8 ? `Showing the 8 lowest of ${atRisk.count}.` : undefined}
                    footer={{ to: '/teacher/reports', label: 'Open reports →' }}>
                    {atRisk.items.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">No student is below {trend.lowThreshold}% attendance.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[480px]">
                                <thead>
                                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <th className="py-2 pr-3 font-semibold">Student</th>
                                        <th className="py-2 px-3 font-semibold">Subject</th>
                                        <th className="py-2 px-3 font-semibold text-right">Present</th>
                                        <th className="py-2 pl-3 font-semibold text-right">Classes in a row to recover</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {atRisk.items.map((s) => (
                                        <tr key={`${s.student_id}-${s.subject_id}`} className="border-t border-slate-100 dark:border-slate-800">
                                            <td className="py-3 pr-3 text-slate-900 dark:text-slate-100"><b>{s.name}</b>{s.roll ? <span className="text-slate-500 dark:text-slate-400"> · Roll {s.roll}</span> : null}</td>
                                            <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{s.subject}</td>
                                            <td className={`py-3 px-3 text-right font-bold ${s.percent < 60 ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>{s.percent}%</td>
                                            <td className="py-3 pl-3 text-right text-slate-700 dark:text-slate-300">{s.needed}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DashCard>

                <DashCard title="Recent notices" footer={{ to: '/teacher/notices', label: 'Open notices →' }}>
                    {notices.length === 0 ? (
                        <p className="py-6 text-sm text-slate-400">No recent notices.</p>
                    ) : (
                        <ul>
                            {notices.map((n) => (
                                <li key={n.id} className="py-3 border-t border-slate-100 dark:border-slate-800 text-sm">
                                    <Link to="/teacher/notices" className="font-semibold text-slate-900 dark:text-slate-100 hover:underline line-clamp-2">{n.title}</Link>
                                    <span className="block text-slate-500 dark:text-slate-400">{n.date}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </DashCard>
            </div>
        </div>
    );
};

export default TeacherDashboard;
