import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList,
    LineChart, Line, Legend, PieChart, Pie
} from 'recharts';

const INDIGO = '#2563eb';
const INDIGO_SOFT = '#93c5fd';
const AMBER = '#f59e0b';
const SLATE = '#94a3b8';
const ROSE = '#e11d48';
const axis = { fill: 'currentColor', fontSize: 11 };

const Tip = ({ active, payload, label, format }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg text-xs">
            <p className="font-bold text-slate-900 dark:text-slate-100">{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} className="font-medium text-slate-600 dark:text-slate-300">{p.name}: {format ? format(p.value) : p.value}</p>
            ))}
        </div>
    );
};

const Empty = ({ text }) => <p className="py-10 text-center text-sm text-slate-400">{text}</p>;

export const ColumnChart = ({ data, xKey, yKey, name, format, label, partialLast = false, emptyText = 'No data yet.' }) => {
    if (!data || !data.length || data.every((d) => !d[yKey])) return <Empty text={emptyText} />;
    return (
        <div className="h-60 text-slate-500 dark:text-slate-400" role="img" aria-label={label}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={axis} axisLine={false} tickLine={false} width={44} tickFormatter={format} />
                    <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} content={<Tip format={format} />} />
                    <Bar dataKey={yKey} name={name} radius={[6, 6, 0, 0]} maxBarSize={44}>
                        {data.map((d, i) => <Cell key={d[xKey]} fill={partialLast && i === data.length - 1 ? INDIGO_SOFT : INDIGO} />)}
                        <LabelList dataKey={yKey} position="top" formatter={format} style={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const ThresholdBars = ({ data, min = 75, label, emptyText = 'No attendance recorded yet.', height }) => {
    if (!data || !data.length) return <Empty text={emptyText} />;
    const h = height || Math.max(150, data.length * 44 + 30);
    return (
        <div style={{ height: h }} className="text-slate-500 dark:text-slate-400" role="img" aria-label={label}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 4, right: 70, bottom: 14, left: 4 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis type="category" dataKey="name" width={96} tick={{ ...axis, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} content={<Tip format={(v) => `${v}%`} />} />
                    {min !== null && <ReferenceLine x={min} stroke={SLATE} strokeDasharray="5 4" label={{ value: `${min}%`, position: 'bottom', fill: 'currentColor', fontSize: 11 }} />}
                    <Bar dataKey="value" name="Present" radius={[0, 6, 6, 0]} barSize={22}>
                        {data.map((d) => <Cell key={d.name} fill={min !== null && d.value < min ? AMBER : INDIGO} />)}
                        <LabelList dataKey="value" position="right"
                            formatter={(v) => (min !== null && v < min ? `${v}% ▼ below` : `${v}%`)}
                            style={{ fill: 'currentColor', fontSize: 12, fontWeight: 700 }} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const TrendLines = ({ weeks, series, min = 75, label, emptyText = 'No attendance recorded in the last few weeks.' }) => {
    const has = series && series.some((s) => s.values.some((v) => v !== null));
    if (!has) return <Empty text={emptyText} />;
    const data = weeks.map((w, i) => {
        const row = { week: w };
        series.forEach((s) => { row[s.subject] = s.values[i]; });
        return row;
    });
    const avg = (s) => { const v = s.values.filter((x) => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 101; };
    const weakest = [...series].sort((a, b) => avg(a) - avg(b))[0];
    const palette = [INDIGO, SLATE, '#0ea5e9', '#14b8a6', '#8b5cf6'];
    return (
        <div className="h-64 text-slate-500 dark:text-slate-400" role="img" aria-label={label}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<Tip format={(v) => (v === null || v === undefined ? '-' : `${v}%`)} />} />
                    <ReferenceLine y={min} stroke={SLATE} strokeDasharray="5 4" />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {series.map((s, i) => (
                        <Line key={s.subject} type="monotone" dataKey={s.subject} connectNulls
                            stroke={s.subject === weakest.subject && avg(s) < min ? ROSE : palette[i % palette.length]}
                            strokeWidth={s.subject === weakest.subject && avg(s) < min ? 3.5 : 2.5}
                            dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export const DonutChart = ({ data, label, emptyText = 'No data yet.' }) => {
    const total = (data || []).reduce((s, d) => s + d.value, 0);
    if (!total) return <Empty text={emptyText} />;
    return (
        <div className="flex items-center gap-5 flex-wrap">
            <div className="w-36 h-36 shrink-0" role="img" aria-label={label}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="100%" paddingAngle={2} stroke="none">
                            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ul className="text-sm space-y-1.5">
                {data.map((d) => (
                    <li key={d.name} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span>{d.name}: <b className="text-slate-900 dark:text-slate-100">{d.value}</b> ({Math.round((d.value / total) * 100)}%)</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const StackedBars = ({ data, keys, label, emptyText = 'No data yet.' }) => {
    if (!data || !data.length) return <Empty text={emptyText} />;
    return (
        <div style={{ height: Math.max(130, data.length * 46 + 30) }} className="text-slate-500 dark:text-slate-400" role="img" aria-label={label}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} horizontal={false} />
                    <XAxis type="number" tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={70} tick={{ ...axis, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} content={<Tip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {keys.map((k) => <Bar key={k.key} dataKey={k.key} name={k.name} stackId="a" fill={k.color} maxBarSize={24} />)}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const ProgressList = ({ rows, emptyText = 'No data yet.' }) => {
    if (!rows || !rows.length) return <Empty text={emptyText} />;
    return (
        <ul className="space-y-4">
            {rows.map((r) => {
                const pct = r.total ? Math.min(100, Math.round((r.value / r.total) * 100)) : 0;
                return (
                    <li key={r.label}>
                        <div className="flex justify-between gap-2 text-sm mb-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{r.label}</span>
                            <span className="text-slate-600 dark:text-slate-300">{r.caption}</span>
                        </div>
                        <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.label} ${pct}%`}
                            className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};

export const FigureList = ({ rows }) => (
    <dl>
        {rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3 py-2.5 border-t border-slate-100 dark:border-slate-800 first:border-t-0 text-sm">
                <dt className="text-slate-600 dark:text-slate-300">{r.label}</dt>
                <dd className={`font-bold ${r.tone === 'rose' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>{r.value}</dd>
            </div>
        ))}
    </dl>
);

export const GroupedColumns = ({ data, xKey, series, format = (v) => `${v}%`, label, emptyText = 'No data yet.' }) => {
    if (!data || !data.length) return <Empty text={emptyText} />;
    const colors = [INDIGO, SLATE];
    return (
        <div className="h-64 text-slate-500 dark:text-slate-400" role="img" aria-label={label}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} interval={0} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axis} axisLine={false} tickLine={false} tickFormatter={format} width={44} />
                    <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} content={<Tip format={(v) => (v === null || v === undefined ? '-' : format(v))} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {series.map((s, i) => (
                        <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color || colors[i % colors.length]} radius={[6, 6, 0, 0]} maxBarSize={32}>
                            <LabelList dataKey={s.key} position="top" formatter={format} style={{ fill: 'currentColor', fontSize: 10, fontWeight: 600 }} />
                        </Bar>
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
