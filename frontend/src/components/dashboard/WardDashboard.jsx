import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getFileUrl } from '../../services/api';
import DashHeader from './DashHeader';
import AttentionPanel from './AttentionPanel';
import DashCard from './DashCard';
import { TrendLines, ThresholdBars, ColumnChart, GroupedColumns, FigureList } from './DashCharts';
import Modal from '../Modal';
import { fileDisplayName } from '../../utils/format';
import { plural, money, weekLabel } from '../../utils/dashboardUi';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const WardDashboard = ({ studentUserId, base, parent = false, greetingName, subject = 'You', switcher = null }) => {
    const [state, setState] = useState({ key: null, insights: null, card: null, notices: [], counts: {}, error: false });
    const [reloadKey, setReloadKey] = useState(0);
    const [viewing, setViewing] = useState(null);
    const key = `${studentUserId}:${reloadKey}`;
    const loading = !!studentUserId && state.key !== key;

    useEffect(() => {
        if (!studentUserId) return undefined;
        let cancelled = false;
        Promise.all([
            api.get(`/student/${studentUserId}/insights`),
            api.get(`/student/${studentUserId}/report-card`).then((r) => r.data).catch(() => null),
            api.get(`/student/${studentUserId}/custom-dashboard`).then((r) => r.data.notices || []).catch(() => []),
            api.get('/inbox/counts').then((r) => r.data || {}).catch(() => ({}))
        ])
            .then(([ins, card, notices, counts]) => { if (!cancelled) setState({ key, insights: ins.data, card, notices, counts, error: false }); })
            .catch(() => { if (!cancelled) setState({ key, insights: null, card: null, notices: [], counts: {}, error: true }); });
        return () => { cancelled = true; };
    }, [studentUserId, key]);

    const downloadReceipt = async (id) => {
        try {
            const res = await api.get(`/payments/${id}/receipt`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url; a.download = `payment-receipt-${id}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            toast.error(e.response?.data?.error || 'Unable to download receipt.');
        }
    };

    const shell = (body) => (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            {switcher}
            {body}
        </div>
    );

    if (loading) return shell(<div className="py-10 text-slate-400 font-bold animate-pulse">Loading the dashboard…</div>);
    if (state.error || !state.insights) {
        return shell(
            <div className="rounded-[28px] border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">The dashboard could not be loaded.</p>
                <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="text-sm font-bold text-rose-700 dark:text-rose-300 underline">Try again</button>
            </div>
        );
    }

    const { insights: d, card, notices, counts } = state;
    const { attendance, marks, fees, payments, nextClasses, hostel, profile } = d;
    const low = attendance.lowThreshold;
    const have = parent ? 'has' : 'have';
    const possessive = parent ? `${subject}'s` : 'Your';
    const lowSubjects = attendance.bySubject.filter((s) => s.percent !== null && s.percent < low && s.total >= 5);
    const overdue = fees.unpaid.filter((f) => f.daysToDue !== null && f.daysToDue < 0);
    const dueSoon = fees.unpaid.filter((f) => f.daysToDue !== null && f.daysToDue >= 0 && f.daysToDue <= fees.dueSoonDays);
    const unreadNotices = counts.notices || 0;

    const facts = [{ label: `${profile.course} Semester ${profile.semester}`, to: `${base}/subjects` }];
    if (attendance.overall !== null) facts.push({ label: `${attendance.overall}% attendance`, to: `${base}/attendance` });
    if (card?.overall?.cgpa) facts.push({ label: `CGPA ${card.overall.cgpa} (provisional)`, to: `${base}/report-card` });
    facts.push({ label: plural(d.classesToday, 'class', 'classes') + ' today', to: `${base}/timetable` });

    const items = [];
    if (overdue.length) {
        const amount = overdue.reduce((s, f) => s + f.balance, 0);
        items.push({
            key: 'overdue', tone: 'rose', button: true, to: `${base}/fees`, linkLabel: parent ? 'Pay fees' : 'Pay now',
            text: <><b>{money(amount)}</b> in fees {parent ? `for ${subject} ` : ''}{overdue.length === 1 ? 'is' : 'are'} <b>overdue</b> ({overdue.map((f) => f.fee_type).join(', ')})</>
        });
    }
    if (dueSoon.length) {
        const f = dueSoon[0];
        const when = f.daysToDue === 0 ? 'today' : `in ${plural(f.daysToDue, 'day')}`;
        items.push({
            key: 'duesoon', tone: 'amber', to: `${base}/fees`, linkLabel: 'View fees →',
            text: <><b>{money(f.balance)}</b> for <b>{f.fee_type}</b> is due <b>{when}</b>{dueSoon.length > 1 ? ` and ${plural(dueSoon.length - 1, 'other fee')} soon` : ''}</>
        });
    }
    if (lowSubjects.length) {
        const worst = [...lowSubjects].sort((a, b) => a.percent - b.percent)[0];
        items.push({
            key: 'lowatt', tone: 'amber', to: `${base}/attendance`, linkLabel: 'See attendance →',
            text: <>{possessive} attendance is below {low}% in <b>{plural(lowSubjects.length, 'subject')}</b>; lowest is <b>{worst.subject} at {worst.percent}%</b>, so {parent ? 'they need' : 'you need'} <b>{plural(worst.needed, 'class', 'classes')} in a row</b> to recover</>
        });
    }
    if (card?.overall?.backlogs > 0) {
        items.push({
            key: 'backlog', tone: 'amber', to: `${base}/report-card`, linkLabel: 'Open report card →',
            text: <>{parent ? `${subject} ${have}` : 'You have'} <b>{plural(card.overall.backlogs, 'backlog')}</b> in the provisional results</>
        });
    }
    if (counts.messages > 0) items.push({ key: 'msg', tone: 'blue', to: `${base}/messages`, linkLabel: 'Open messages →', text: <><b>{plural(counts.messages, 'unread message')}</b></> });
    if (unreadNotices > 0) items.push({ key: 'notice', tone: 'blue', to: `${base}/notices`, linkLabel: 'Open notices →', text: <><b>{plural(unreadNotices, 'unread notice')}</b></> });

    const attData = attendance.bySubject.map((s) => ({ name: s.subject, value: s.percent }));
    const marksData = marks.map((m) => ({ name: m.subject, mine: m.mine, classAverage: m.classAverage }));
    const semData = (card?.semesters || []).filter((s) => s.percentage !== null && s.percentage !== undefined).map((s) => ({ name: `Sem ${s.semester}`, value: Number(s.percentage) }));
    const paidPct = fees.billed ? Math.min(100, Math.round((fees.paid / fees.billed) * 100)) : 0;

    return shell(
        <>
            <DashHeader name={greetingName} facts={facts} />
            <AttentionPanel items={items}
                allClearText={parent ? `Nothing needs your attention for ${subject} right now.` : 'Attendance, fees and notices are all in good shape.'} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <DashCard title="Coming up" footer={{ to: `${base}/timetable`, label: 'Open timetable →' }}>
                    {nextClasses.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">No upcoming classes are scheduled.</p>
                    ) : (
                        <ul>
                            {nextClasses.map((c) => (
                                <li key={c.id} className="flex items-center gap-4 py-3.5 border-t border-slate-100 dark:border-slate-800">
                                    <span className="w-24 text-sm text-slate-900 dark:text-slate-100"><b className="block">{c.start}</b><span className="text-xs text-slate-500 dark:text-slate-400">{c.day}</span></span>
                                    <span className="flex-1 min-w-0 text-sm">
                                        <b className="text-slate-900 dark:text-slate-100 block truncate">{c.subject}</b>
                                        <span className="text-slate-500 dark:text-slate-400">{[c.room ? `Room ${c.room}` : null, c.faculty].filter(Boolean).join(' · ') || 'Room to be announced'}</span>
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">until {c.end}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </DashCard>

                <DashCard title="Attendance, week by week" subtitle={`Present % per week, last ${attendance.trend.weeks.length} weeks. Dashed line is ${low}%.`}>
                    <TrendLines weeks={attendance.trend.weeks.map(weekLabel)} min={low}
                        series={[{ subject_id: 0, subject: 'Overall', values: attendance.trend.values }]}
                        label={`Weekly attendance percentage for ${subject === 'You' ? 'you' : subject}`} />
                </DashCard>
            </div>

            <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mt-10 mb-4">This semester in detail</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <DashCard title="Attendance by subject" subtitle={`Present % across all classes so far. Dashed line is ${low}%.`}
                    footer={{ to: `${base}/attendance`, label: 'Open attendance →' }}>
                    <ThresholdBars data={attData} min={low} label="Attendance percentage for each subject" />
                </DashCard>
                <DashCard title="Marks compared with the class" subtitle="% of marks across all assessments so far, next to the class average."
                    footer={{ to: `${base}/results`, label: 'Open results →' }}>
                    <GroupedColumns data={marksData} xKey="name" label="Marks percentage for each subject compared with the class average"
                        series={[{ key: 'mine', name: parent ? subject : 'You' }, { key: 'classAverage', name: 'Class average' }]} emptyText="No marks have been entered yet." />
                </DashCard>
                {semData.length > 0 && (
                    <DashCard title="Marks by semester" subtitle="Overall percentage in each semester (provisional)."
                        footer={{ to: `${base}/report-card`, label: 'Open report card →' }}>
                        <ColumnChart data={semData} xKey="name" yKey="value" name="Percentage" format={(v) => `${v}%`} label="Overall percentage for each semester" />
                    </DashCard>
                )}
                <DashCard title="Fees" subtitle={`${money(fees.paid)} paid of ${money(fees.billed)} billed.`} footer={{ to: `${base}/fees`, label: 'Open fees →' }}>
                    <div role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Fees ${paidPct}% paid`}
                        className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-3">
                        <div className="h-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
                    </div>
                    <FigureList rows={[
                        { label: 'Outstanding', value: money(fees.outstanding), tone: fees.outstanding > 0 ? 'rose' : undefined },
                        { label: 'Overdue', value: money(fees.overdueAmount), tone: fees.overdueAmount > 0 ? 'rose' : undefined },
                        ...fees.unpaid.slice(0, 3).map((f) => ({ label: `${f.fee_type} due ${fmtDate(f.due)}`, value: money(f.balance) }))
                    ]} />
                </DashCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashCard title="Recent payments" footer={{ to: `${base}/fees`, label: 'All payments →' }}>
                    {payments.length === 0 ? (
                        <p className="py-6 text-sm text-slate-400">No payments recorded yet.</p>
                    ) : (
                        <ul>
                            {payments.map((p) => (
                                <li key={p.id} className="flex items-center gap-3 py-3 border-t border-slate-100 dark:border-slate-800 text-sm">
                                    <span className="flex-1 min-w-0">
                                        <b className="text-slate-900 dark:text-slate-100">{money(p.amount)}</b> <span className="text-slate-500 dark:text-slate-400">· {p.fee_type}</span>
                                        <span className="block text-xs text-slate-500 dark:text-slate-400">{fmtDate(p.date)}{p.method ? ` · ${p.method}` : ''}</span>
                                    </span>
                                    <button type="button" onClick={() => downloadReceipt(p.id)} aria-label={`Download receipt for ${money(p.amount)}`}
                                        className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"><Download size={14} /></button>
                                </li>
                            ))}
                        </ul>
                    )}
                </DashCard>

                <DashCard title="Campus board" footer={{ to: `${base}/notices`, label: 'Open notices →' }}>
                    {notices.length === 0 ? (
                        <p className="py-6 text-sm text-slate-400">No recent notices.</p>
                    ) : (
                        <ul>
                            {notices.map((n) => (
                                <li key={n.id} className="py-3 border-t border-slate-100 dark:border-slate-800 text-sm">
                                    <button type="button" onClick={() => setViewing(n)} className="text-left font-semibold text-slate-900 dark:text-slate-100 hover:underline line-clamp-2">{n.title}</button>
                                    <span className="block text-slate-500 dark:text-slate-400">{n.date}{n.type ? ` · ${n.type}` : ''}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </DashCard>

                <DashCard title="Hostel" footer={hostel ? { to: `${base}/hostel`, label: 'Open hostel →' } : undefined}>
                    {hostel ? (
                        <FigureList rows={[{ label: 'Hostel', value: hostel.name }, ...(hostel.block ? [{ label: 'Block', value: hostel.block }] : []), { label: 'Room', value: hostel.room }]} />
                    ) : (
                        <p className="py-6 text-sm text-slate-400">{parent ? `${subject} has` : 'You have'} no hostel room allotted.</p>
                    )}
                </DashCard>
            </div>

            {viewing && (
                <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Notice Preview">
                    <div className="p-2">
                        <div className="flex items-center justify-between mb-4">
                            <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">{viewing.type} Priority</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{viewing.date}</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight mb-4">{viewing.title}</h2>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">{viewing.content || viewing.title}</p>
                        {viewing.attachment_url && (
                            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{fileDisplayName(viewing.attachment_url)}</p>
                                <button type="button" onClick={() => window.open(getFileUrl(viewing.attachment_url), '_blank')} aria-label="Download attachment"
                                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"><Download size={14} /></button>
                            </div>
                        )}
                        <div className="mt-6 flex justify-end">
                            <button type="button" onClick={() => setViewing(null)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"><X size={14} /> Close</button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default WardDashboard;
