import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { Users, GraduationCap, BookOpen, Wallet, AlertTriangle, CalendarCheck, Award, Activity, Building2, RefreshCw } from 'lucide-react';
import api from '../services/api';

const BLUE = '#3b82f6';
const BLUE_DARK = '#1d4ed8';
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const pct = (v) => (v === null || v === undefined ? '—' : `${v}%`);
const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
};
const ago = (iso) => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const prettyAction = (a) => String(a || '').toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const Section = ({ title, children }) => (
  <section className="mb-10">
    <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-4">{title}</h3>
    {children}
  </section>
);

const Unavailable = () => (
  <div className="rounded-[28px] border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm font-medium text-slate-500 dark:text-slate-400">
    This section could not be loaded right now.
  </div>
);

const Tile = ({ label, value, hint, icon, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-sm flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate">{value}</p>
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{hint}</p>}
      </div>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}>{icon}</div>
    </div>
  );
};

const ChartTooltip = ({ active, payload, label, format }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-slate-900 dark:text-slate-100">{label}</p>
      <p className="font-medium text-slate-600 dark:text-slate-300">{p.name}: {format ? format(p.value) : p.value}</p>
    </div>
  );
};

const BarCard = ({ title, subtitle, data, xKey, yKey, yName, format, domain, reference, layout = 'horizontal', emptyText = 'No data yet.' }) => {
  const [asTable, setAsTable] = useState(false);
  const has = data && data.length > 0;
  const vertical = layout === 'vertical';
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="font-black text-slate-900 dark:text-slate-100">{title}</h4>
          {subtitle && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {has && (
          <button type="button" onClick={() => setAsTable((v) => !v)}
            className="shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            {asTable ? 'Show chart' : 'Show table'}
          </button>
        )}
      </div>
      {!has ? (
        <p className="py-10 text-center text-sm font-medium text-slate-400">{emptyText}</p>
      ) : asTable ? (
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[10px] uppercase tracking-widest text-slate-400">
              <th className="py-1 pr-4">Item</th><th className="py-1">{yName}</th></tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r[xKey]} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-4 font-medium text-slate-700 dark:text-slate-300">{r[xKey]}</td>
                  <td className="py-1.5 font-bold text-slate-900 dark:text-slate-100">{format ? format(r[yKey]) : r[yKey]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-60 text-slate-500 dark:text-slate-400" role="img" aria-label={`${title}. Use "Show table" for the values.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, bottom: 0, left: vertical ? 8 : -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} vertical={vertical} horizontal={!vertical} />
              {vertical ? (
                <>
                  <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} domain={domain} />
                  <YAxis type="category" dataKey={xKey} width={64} tick={{ fill: 'currentColor', fontSize: 11 }} axisLine={false} tickLine={false} />
                </>
              ) : (
                <>
                  <XAxis dataKey={xKey} tick={{ fill: 'currentColor', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} domain={domain} />
                </>
              )}
              <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} content={<ChartTooltip format={format} />} />
              {reference && <ReferenceLine y={reference.value} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: reference.label, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />}
              <Bar dataKey={yKey} name={yName} fill={BLUE} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={36}>
                {data.map((d, i) => <Cell key={i} fill={BLUE} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const AdminAnalytics = () => {
  const [state, setState] = useState({ loading: true, data: null, error: false });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await api.get('/admin/analytics');
        if (!cancelled) setState({ loading: false, data: res.data, error: false });
      } catch {
        if (!cancelled) setState({ loading: false, data: null, error: true });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const refresh = () => { setState((s) => ({ ...s, loading: true })); setReloadKey((k) => k + 1); };

  if (state.loading && !state.data) {
    return <div className="mb-10 px-2 text-slate-400 font-bold animate-pulse">Loading analytics…</div>;
  }
  if (state.error || !state.data) {
    return (
      <div className="mb-10 rounded-[28px] border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Analytics could not be loaded.</p>
        <button onClick={refresh} className="text-sm font-bold text-rose-700 dark:text-rose-300 underline">Try again</button>
      </div>
    );
  }

  const { users, academic, financial, operations } = state.data;
  const sumRole = (role, key) => (users && users.byRole[role] ? users.byRole[role][key] : 0);
  const inactiveTotal = users ? Object.values(users.byRole).reduce((s, r) => s + r.inactive, 0) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Analytics</h3>
        <button onClick={refresh} disabled={state.loading}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 disabled:opacity-50">
          <RefreshCw size={14} className={state.loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <Section title="People">
        {!users ? <Unavailable /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile label="Students" value={sumRole('student', 'active') + sumRole('student', 'inactive')}
              hint={`${users.studentStatus.Active || 0} active · ${users.studentStatus.Graduated || 0} graduated · ${users.studentStatus.Suspended || 0} suspended`}
              icon={<Users size={22} />} />
            <Tile label="Teachers" value={sumRole('teacher', 'active') + sumRole('teacher', 'inactive')}
              hint={`${sumRole('teacher', 'active')} active accounts`} icon={<GraduationCap size={22} />} />
            <Tile label="Parents" value={sumRole('parent', 'active') + sumRole('parent', 'inactive')}
              hint={`${sumRole('parent', 'active')} active accounts`} icon={<Users size={22} />} />
            <Tile label="Deactivated accounts" value={inactiveTotal} hint="Across all roles"
              tone={inactiveTotal ? 'amber' : 'emerald'} icon={<AlertTriangle size={22} />} />
          </div>
        )}
      </Section>

      <Section title="Academics">
        {!academic ? <Unavailable /> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Tile label="Courses · Subjects" value={`${academic.counts.courses} · ${academic.counts.subjects}`} icon={<BookOpen size={22} />} />
              <Tile label="Average attendance" value={pct(academic.attendance.overallPercentage)}
                hint={`${academic.attendance.records} records (only “Present” counts)`} icon={<CalendarCheck size={22} />} />
              <Tile label={`Below ${academic.attendance.lowThreshold}% attendance`} value={academic.attendance.belowThresholdCount}
                hint={`students with ${academic.attendance.minClasses}+ classes`} tone={academic.attendance.belowThresholdCount ? 'rose' : 'emerald'}
                icon={<AlertTriangle size={22} />} />
              <Tile label="Average marks" value={pct(academic.marks.averagePercent)} hint={`${academic.marks.entries} mark entries`} icon={<Award size={22} />} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BarCard title="Active students per course" data={academic.studentsPerCourse} xKey="course_code" yKey="students" yName="Students" layout="vertical" />
              <BarCard title="Attendance by course" subtitle={`Dashed line = ${academic.attendance.lowThreshold}% requirement`}
                data={academic.attendance.byCourse} xKey="course_code" yKey="percentage" yName="Attendance" format={(v) => `${v}%`}
                domain={[0, 100]} reference={{ value: academic.attendance.lowThreshold, label: `${academic.attendance.lowThreshold}%` }}
                emptyText="No attendance has been marked yet." />
              <BarCard title="Marks distribution" subtitle="Every recorded mark, by percentage band"
                data={academic.marks.bands} xKey="label" yKey="count" yName="Marks entries" emptyText="No marks have been entered yet." />
              <BarCard title="Average marks by course" data={academic.marks.byCourse} xKey="course_code" yKey="averagePercent" yName="Average"
                format={(v) => `${v}%`} domain={[0, 100]} emptyText="No marks have been entered yet." />
            </div>
            {academic.attendance.lowestStudents.length > 0 && (
              <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-sm">
                <h4 className="font-black text-slate-900 dark:text-slate-100 mb-3">Lowest attendance</h4>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {academic.attendance.lowestStudents.map((s) => (
                    <li key={s.student_id} className="py-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{s.full_name}
                        <span className="ml-2 text-xs font-medium text-slate-400">{s.enrollment_number}</span></span>
                      <span className="font-black text-rose-600 dark:text-rose-400">{s.percentage}% <span className="text-xs font-medium text-slate-400">({s.total} classes)</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Section>

      <Section title="Fees">
        {!financial ? <Unavailable /> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Tile label="Total billed" value={money(financial.totalBilled)} icon={<Wallet size={22} />} />
              <Tile label="Collected" value={money(financial.collected)} hint={`${pct(financial.collectionRate)} of billed`} tone="emerald" icon={<Wallet size={22} />} />
              <Tile label="Outstanding" value={money(financial.outstanding)} tone={financial.outstanding ? 'amber' : 'emerald'} icon={<Wallet size={22} />} />
              <Tile label="Overdue" value={money(financial.overdue.amount)} hint={`${financial.overdue.count} unpaid fee records past due date`}
                tone={financial.overdue.count ? 'rose' : 'emerald'} icon={<AlertTriangle size={22} />} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BarCard title="Payments received" subtitle="Last 6 months"
                data={financial.monthlyCollections.map((m) => ({ ...m, label: monthLabel(m.month) }))}
                xKey="label" yKey="amount" yName="Collected" format={money} />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-sm">
                <h4 className="font-black text-slate-900 dark:text-slate-100 mb-1">By fee type</h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                  {financial.byStatus.Paid || 0} paid · {financial.byStatus.Partial || 0} partial · {financial.byStatus.Pending || 0} pending
                </p>
                {financial.byType.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No fees recorded yet.</p> : (
                  <ul className="space-y-3">
                    {financial.byType.map((t) => {
                      const rate = t.total ? Math.round((t.paid / t.total) * 100) : 0;
                      return (
                        <li key={t.fee_type}>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{t.fee_type}</span>
                            <span className="font-medium text-slate-500 dark:text-slate-400">{money(t.paid)} of {money(t.total)}</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                            role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label={`${t.fee_type} collected`}>
                            <div className="h-full rounded-full" style={{ width: `${rate}%`, background: BLUE_DARK }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </Section>

      <Section title="Operations">
        {!operations ? <Unavailable /> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <Tile label="Notices · Announcements" value={`${operations.notices} · ${operations.announcements}`} icon={<Activity size={22} />} />
              <Tile label="Messages this month" value={operations.messagesThisMonth} icon={<Activity size={22} />} />
              <Tile label="Hostel" value={`${operations.hostelAllotted} allotted`} hint={`${operations.hostels} hostel${operations.hostels === 1 ? '' : 's'}`} icon={<Building2 size={22} />} />
            </div>
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-sm">
              <h4 className="font-black text-slate-900 dark:text-slate-100 mb-3">Recent activity</h4>
              {operations.recentActivity.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No recorded activity yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {operations.recentActivity.map((a) => (
                    <li key={a.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{prettyAction(a.action)}</span>
                        <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                          {a.actor ? `${a.actor}${a.actorRole ? ` (${a.actorRole})` : ''}` : 'System'} · {a.entity}{a.entityId ? ` #${a.entityId}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-slate-400">{ago(a.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
};

export default AdminAnalytics;
