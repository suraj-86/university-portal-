import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import DashHeader from '../../components/dashboard/DashHeader';
import AttentionPanel from '../../components/dashboard/AttentionPanel';
import DashCard from '../../components/dashboard/DashCard';
import { ColumnChart, ThresholdBars, DonutChart, StackedBars, ProgressList, FigureList } from '../../components/dashboard/DashCharts';
import { money, moneyShort, plural, monthShort, shortBand } from '../../utils/dashboardUi';
import { prettyAction } from '../../utils/auditLabels';
import { relativeTime } from '../../utils/format';

const SectionTitle = ({ children }) => (
    <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mt-10 mb-4">{children}</h2>
);

const Unavailable = () => <p className="py-10 text-center text-sm text-slate-400">This section could not be loaded right now.</p>;

const QUICK = [
    { label: 'Add a student', to: '/admin/students' },
    { label: 'Record a payment', to: '/admin/fees' },
    { label: 'Send a notice', to: '/admin/notices' }
];

const AdminDashboard = () => {
    const { user } = useAuth();
    const [reloadKey, setReloadKey] = useState(0);
    const [state, setState] = useState({ key: null, data: null, error: false });
    const loading = state.key !== reloadKey;

    useEffect(() => {
        let cancelled = false;
        api.get('/admin/analytics')
            .then((res) => { if (!cancelled) setState({ key: reloadKey, data: res.data, error: false }); })
            .catch(() => { if (!cancelled) setState({ key: reloadKey, data: null, error: true }); });
        return () => { cancelled = true; };
    }, [reloadKey]);

    if (loading) return <div className="p-10 text-slate-400 font-bold animate-pulse">Loading your dashboard…</div>;
    if (state.error || !state.data) {
        return (
            <div className="p-6 md:p-10">
                <div className="rounded-[28px] border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">The dashboard could not be loaded.</p>
                    <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-bold text-rose-700 dark:text-rose-300 underline">Try again</button>
                </div>
            </div>
        );
    }

    const { users, academic, financial, security, operations } = state.data;
    const students = academic ? academic.studentsPerCourse.reduce((s, c) => s + c.students, 0) : null;
    const collectedThisMonth = financial ? financial.monthlyCollections[financial.monthlyCollections.length - 1]?.amount || 0 : null;

    const facts = [];
    if (students !== null) facts.push({ label: plural(students, 'student'), to: '/admin/students' });
    if (academic) {
        facts.push({ label: plural(academic.counts.teachers, 'faculty member'), to: '/admin/teachers' });
        facts.push({ label: plural(academic.counts.courses, 'program'), to: '/admin/courses' });
    }
    if (collectedThisMonth !== null) facts.push({ label: `${moneyShort(collectedThisMonth)} collected this month`, to: '/admin/payments' });

    const items = [];
    if (financial && financial.overdue.count > 0) {
        items.push({
            key: 'overdue', tone: 'rose',
            text: <><b>{money(financial.overdue.amount)}</b> is overdue across <b>{plural(financial.overdue.count, 'unpaid fee')}</b></>,
            to: '/admin/reports?report=fees-outstanding&overdue_only=1', linkLabel: 'Open overdue fees →'
        });
    }
    if (academic && academic.attendance.belowThresholdCount > 0) {
        const lowest = academic.attendance.lowestStudents[0];
        items.push({
            key: 'low', tone: 'amber',
            text: <><b>{plural(academic.attendance.belowThresholdCount, 'student')}</b> {academic.attendance.belowThresholdCount === 1 ? 'is' : 'are'} below {academic.attendance.lowThreshold}% attendance{lowest ? ` (lowest: ${lowest.percentage}%)` : ''}</>,
            to: '/admin/reports?report=attendance-low', linkLabel: 'Open low attendance list →'
        });
    }
    if (security && security.mustChangePassword > 0) {
        items.push({
            key: 'pw', tone: 'blue',
            text: <><b>{plural(security.mustChangePassword, 'user')}</b> still {security.mustChangePassword === 1 ? 'has' : 'have'} to change a temporary password</>
        });
    }

    const feeData = financial ? financial.monthlyCollections.map((m) => ({ month: monthShort(m.month), amount: m.amount })) : [];
    const attData = academic ? academic.attendance.byCourse.filter((c) => c.percentage !== null).map((c) => ({ name: c.course_code, value: c.percentage })) : [];
    const perCourse = academic ? academic.studentsPerCourse.map((c) => ({ name: c.course_code, students: c.students })) : [];
    const bands = academic ? academic.marks.bands.map((b) => ({ name: shortBand(b.label), count: b.count })) : [];
    const marksByCourse = academic ? academic.marks.byCourse.map((c) => ({ name: c.course_code, value: c.averagePercent })) : [];
    const FEE_STATUS_COLOR = { Paid: '#059669', Partial: '#f59e0b', Pending: '#e11d48' };
    const statusData = financial ? ['Paid', 'Partial', 'Pending'].map((k) => ({ name: k, value: financial.byStatus[k] || 0, color: FEE_STATUS_COLOR[k] })) : [];
    const feeTypes = financial ? financial.byType.map((t) => ({ label: t.fee_type, value: t.paid, total: t.total, caption: `${money(t.paid)} of ${money(t.total)}` })) : [];
    const ROLE_NAME = { student: 'Students', teacher: 'Teachers', parent: 'Parents', admin: 'Admins' };
    const roleData = users ? Object.entries(users.byRole).map(([role, v]) => ({ name: ROLE_NAME[role] || role, active: v.active, inactive: v.inactive })) : [];
    const inactiveTotal = users ? Object.values(users.byRole).reduce((sum, r) => sum + r.inactive, 0) : 0;
    const activity = operations ? operations.recentActivity.slice(0, 5) : [];

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <DashHeader name={user?.full_name || user?.username || 'Admin'} facts={facts} />
            <AttentionPanel items={items} allClearText="Nothing needs your attention right now." />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashCard title="Fee collection" subtitle="Last 6 months. The lighter bar is the month so far."
                    footer={{ to: '/admin/reports?report=fees-collection', label: 'Open fee collection report →' }}>
                    {financial
                        ? <ColumnChart data={feeData} xKey="month" yKey="amount" name="Collected" format={moneyShort} partialLast
                            label="Bar chart of fees collected in each of the last 6 months" emptyText="No payments recorded yet." />
                        : <Unavailable />}
                </DashCard>
                <DashCard title="Attendance by course" subtitle="Present % overall. The dashed line is the 75% minimum."
                    footer={{ to: '/admin/reports?report=attendance-summary', label: 'Open attendance summary →' }}>
                    {academic
                        ? <ThresholdBars data={attData} min={academic.attendance.lowThreshold} label="Attendance percentage for each course" />
                        : <Unavailable />}
                </DashCard>
            </div>

            <SectionTitle>Academics</SectionTitle>
            {academic ? (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <DashCard title="Students per course" subtitle="Active students only.">
                            <ColumnChart data={perCourse} xKey="name" yKey="students" name="Students" label="Number of active students in each course" emptyText="No students yet." />
                        </DashCard>
                        <DashCard title="Marks distribution" subtitle={`All ${academic.marks.entries} recorded marks, by percentage band.`}>
                            <ColumnChart data={bands} xKey="name" yKey="count" name="Marks entries" label="Number of marks entries in each percentage band" emptyText="No marks recorded yet." />
                        </DashCard>
                        <DashCard title="Average marks by course" subtitle={academic.marks.averagePercent === null ? undefined : `Overall average ${academic.marks.averagePercent}%.`}>
                            <ThresholdBars data={marksByCourse} min={null} label="Average marks percentage for each course" emptyText="No marks recorded yet." />
                        </DashCard>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <DashCard title="Lowest attendance" subtitle={`Students under ${academic.attendance.lowThreshold}% (at least ${academic.attendance.minClasses} classes held).`}
                            className="lg:col-span-2" footer={{ to: '/admin/reports?report=attendance-low', label: 'Open the full list →' }}>
                            {academic.attendance.lowestStudents.length === 0 ? (
                                <p className="py-6 text-sm text-slate-400">No student is below the minimum.</p>
                            ) : (
                                <ul>
                                    {academic.attendance.lowestStudents.map((st) => (
                                        <li key={st.student_id} className="flex items-center justify-between gap-3 py-3 border-t border-slate-100 dark:border-slate-800 text-sm">
                                            <span className="text-slate-800 dark:text-slate-200"><b>{st.full_name}</b> <span className="text-slate-500 dark:text-slate-400">· {st.enrollment_number}</span></span>
                                            <span className="font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">{st.percentage}% <span className="font-normal text-slate-500 dark:text-slate-400">of {st.total} classes</span></span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </DashCard>
                        <DashCard title="Campus at a glance">
                            <FigureList rows={[
                                { label: 'Courses', value: academic.counts.courses },
                                { label: 'Subjects', value: academic.counts.subjects },
                                { label: 'Faculty', value: academic.counts.teachers },
                                { label: 'Parents', value: academic.counts.parents },
                                { label: 'Average attendance', value: academic.attendance.overallPercentage === null ? '-' : `${academic.attendance.overallPercentage}%` }
                            ]} />
                        </DashCard>
                    </div>
                </>
            ) : <Unavailable />}

            <SectionTitle>Fees</SectionTitle>
            {financial ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <DashCard title="Fee overview" subtitle={financial.collectionRate === null ? undefined : `${financial.collectionRate}% of billed fees collected.`}
                        footer={{ to: '/admin/reports?report=fees-by-course', label: 'Open fee summary by course →' }}>
                        <FigureList rows={[
                            { label: 'Total billed', value: money(financial.totalBilled) },
                            { label: 'Collected', value: money(financial.collected) },
                            { label: 'Outstanding', value: money(financial.outstanding) },
                            { label: 'Overdue', value: money(financial.overdue.amount), tone: financial.overdue.amount > 0 ? 'rose' : undefined },
                            { label: 'Fee records past due date', value: financial.overdue.count }
                        ]} />
                    </DashCard>
                    <DashCard title="Collected by fee type" subtitle="How much of each type has been paid.">
                        <ProgressList rows={feeTypes} emptyText="No fees have been created yet." />
                    </DashCard>
                    <DashCard title="Fee status" subtitle="Number of fee records.">
                        <DonutChart data={statusData} label="Number of fee records that are paid, partly paid and pending" emptyText="No fees have been created yet." />
                    </DashCard>
                </div>
            ) : <Unavailable />}

            <SectionTitle>People and operations</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <DashCard title="Accounts by role" subtitle="Active and deactivated accounts.">
                    {users ? <StackedBars data={roleData} keys={[{ key: 'active', name: 'Active', color: '#4f46e5' }, { key: 'inactive', name: 'Deactivated', color: '#94a3b8' }]} label="Active and deactivated accounts for each role" /> : <Unavailable />}
                </DashCard>
                <DashCard title="This month on campus">
                    {operations ? (
                        <FigureList rows={[
                            { label: 'Notices', value: operations.notices },
                            { label: 'Announcements', value: operations.announcements },
                            { label: 'Messages sent this month', value: operations.messagesThisMonth },
                            { label: 'Hostel rooms allotted', value: `${operations.hostelAllotted} in ${plural(operations.hostels, 'hostel')}` },
                            { label: 'Deactivated accounts', value: inactiveTotal }
                        ]} />
                    ) : <Unavailable />}
                </DashCard>
            </div>

            <SectionTitle>Recent activity</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashCard title="Recent activity" className="lg:col-span-2" footer={{ to: '/admin/audit', label: 'Open audit log →' }}>
                    {activity.length === 0 ? (
                        <p className="py-6 text-sm text-slate-400">Nothing has been recorded yet.</p>
                    ) : (
                        <ul>
                            {activity.map((a) => (
                                <li key={a.id} className="flex items-start justify-between gap-3 py-3 border-t border-slate-100 dark:border-slate-800 text-sm">
                                    <span className="text-slate-700 dark:text-slate-300 min-w-0">
                                        <b className="text-slate-900 dark:text-slate-100">{a.actor || 'System'}</b> · {prettyAction(a.action)}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{relativeTime(a.at)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </DashCard>
                <DashCard title="Quick actions">
                    <div className="flex flex-col gap-2.5">
                        {QUICK.map((q) => (
                            <Link key={q.to} to={q.to} className="block px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800">{q.label}</Link>
                        ))}
                        <Link to="/admin/reports" className="block px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white">Open reports</Link>
                    </div>
                </DashCard>
            </div>
        </div>
    );
};

export default AdminDashboard;
