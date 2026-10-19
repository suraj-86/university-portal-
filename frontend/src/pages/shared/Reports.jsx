import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.jsx';
import api from '../../services/api';
import ReportView from '../../components/ReportView';
import { REPORTS, initialValues } from '../../utils/reportCatalog';

const input = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white';

const Reports = () => {
    const { user } = useAuth();
    const role = user?.role;
    const catalog = useMemo(() => REPORTS[role] || [], [role]);
    const [options, setOptions] = useState({ courses: [], subjects: [], hostels: [], wards: [] });
    const [optionsError, setOptionsError] = useState(false);
    const [searchParams] = useSearchParams();
    const [preset] = useState(() => {
        const name = searchParams.get('report');
        const found = (REPORTS[role] || []).find((r) => r.name === name);
        if (!found) return { selected: null, values: {} };
        const v = initialValues(found);
        found.filters.forEach((f) => {
            const q = searchParams.get(f.key);
            if (q !== null) v[f.key] = f.type === 'checkbox' ? q === '1' || q === 'true' : q;
        });
        return { selected: found, values: v };
    });
    const [selected, setSelected] = useState(preset.selected);
    const [values, setValues] = useState(preset.values);
    const [state, setState] = useState({ busy: false, error: '', report: null });

    useEffect(() => {
        let cancelled = false;
        api.get('/reports/options')
            .then((res) => { if (!cancelled) setOptions((o) => ({ ...o, ...res.data })); })
            .catch(() => { if (!cancelled) setOptionsError(true); });
        return () => { cancelled = true; };
    }, []);

    const wards = options.wards;
    const pick = (report) => {
        const v = initialValues(report);
        if (v.student_id === '' && wards.length === 1) v.student_id = String(wards[0].student_id);
        setSelected(report);
        setValues(v);
        setState({ busy: false, error: '', report: null });
    };
    const set = (key, val) => setValues((v) => ({ ...v, [key]: val }));

    const subjectsForCourse = options.subjects.filter((s) =>
        (!values.course_id || String(s.course_id) === String(values.course_id)) &&
        (!values.semester || String(s.semester) === String(values.semester)));

    const generate = async (e) => {
        e.preventDefault();
        const missing = selected.filters.find((f) => f.required && !values[f.key]);
        if (missing) { setState({ busy: false, error: `Choose a value for "${missing.label}".`, report: null }); return; }
        const params = {};
        selected.filters.forEach((f) => {
            const v = values[f.key];
            if (f.type === 'checkbox') { if (v) params[f.key] = 1; } else if (v !== '' && v !== undefined) params[f.key] = v;
        });
        setState({ busy: true, error: '', report: null });
        try {
            const res = await api.get(`/reports/${selected.name}`, { params });
            setState({ busy: false, error: '', report: res.data });
        } catch (err) {
            setState({ busy: false, error: err.response?.data?.error || 'Could not build the report.', report: null });
        }
    };

    const field = (f) => {
        const common = { id: `rf-${f.key}`, className: input };
        if (f.type === 'course') return (
            <select {...common} value={values[f.key]} onChange={(e) => { set(f.key, e.target.value); set('subject_id', ''); }}>
                <option value="">All courses</option>
                {options.courses.map((c) => <option key={c.id} value={c.id}>{c.course_code} - {c.course_name}</option>)}
            </select>);
        if (f.type === 'semester') return (
            <select {...common} value={values[f.key]} onChange={(e) => { set(f.key, e.target.value); set('subject_id', ''); }}>
                <option value="">All semesters</option>
                {Array.from({ length: 8 }, (_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
            </select>);
        if (f.type === 'subject') return (
            <select {...common} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">{subjectsForCourse.length === 0 ? 'No subjects for this selection' : (f.required ? 'Choose a subject' : 'All subjects')}</option>
                {subjectsForCourse.map((s) => <option key={s.id} value={s.id}>{s.course_code} S{s.semester} · {s.subject_code} {s.subject_name}</option>)}
            </select>);
        if (f.type === 'hostel') return (
            <select {...common} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">All hostels</option>
                {options.hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>);
        if (f.type === 'ward') return (
            <select {...common} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">Choose a student</option>
                {wards.map((w) => <option key={w.student_id} value={w.student_id}>{w.full_name} ({w.enrollment_number})</option>)}
            </select>);
        if (f.type === 'select') return (
            <select {...common} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                {f.options.map((o) => <option key={o} value={o}>{o === '' ? 'Any' : (f.labels?.[o] || o)}</option>)}
            </select>);
        if (f.type === 'checkbox') return (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 py-2">
                <input id={`rf-${f.key}`} type="checkbox" checked={!!values[f.key]} onChange={(e) => set(f.key, e.target.checked)} /> Yes
            </label>);
        return <input {...common} type={f.type === 'number' ? 'number' : f.type} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} />;
    };

    const groups = [...new Set(catalog.map((r) => r.group))];

    return (
        <div className="p-6 md:p-10 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{role === 'student' || role === 'parent' ? 'Statements' : 'Reports'}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Choose a report, set the filters and generate it. Download it as Excel or CSV, or print it.</p>
            </div>
            {optionsError && <p className="text-sm text-rose-600">Could not load the filter choices. Refresh the page to try again.</p>}

            <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
                <div className="space-y-4">
                    {groups.map((g) => (
                        <div key={g}>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">{g}</p>
                            <div className="space-y-1">
                                {catalog.filter((r) => r.group === g).map((r) => (
                                    <button key={r.name} type="button" onClick={() => pick(r)}
                                        className={`w-full text-left rounded-lg px-3 py-2 border text-sm transition ${selected?.name === r.name
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                        <span className="font-semibold block">{r.title}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{r.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-5 min-w-0">
                    {!selected ? (
                        <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">Pick a report from the list to begin.</p>
                    ) : (
                        <>
                            <form onSubmit={generate} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                                <h2 className="font-bold text-slate-900 dark:text-white">{selected.title}</h2>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {selected.filters.map((f) => (
                                        <div key={f.key}>
                                            <label htmlFor={`rf-${f.key}`} className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                                {f.label}{f.required ? ' *' : ''}
                                            </label>
                                            {field(f)}
                                        </div>
                                    ))}
                                </div>
                                {state.error && <p role="alert" className="text-sm text-rose-600">{state.error}</p>}
                                <button type="submit" disabled={state.busy}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
                                    {state.busy ? 'Generating…' : 'Generate report'}
                                </button>
                            </form>
                            {state.report && <ReportView report={state.report} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reports;
