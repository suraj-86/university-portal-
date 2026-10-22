import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, ChevronDown, ChevronLeft, ChevronRight, ScrollText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { prettyAction, actionTone } from '../../utils/auditLabels';
import { downloadTextFile } from '../../utils/csv';
import { toCSV } from '../../utils/spreadsheet';

const TONES = {
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
};
const selectCls = 'py-2.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none';
const labelCls = 'text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1';
const NO_FILTERS = { q: '', action: '', entity: '', role: '', from: '', to: '' };
const PAGE_SIZE = 25;

const when = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};
const toParams = (filters, extra = {}) => {
    const p = new URLSearchParams();
    Object.entries({ ...filters, ...extra }).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) p.set(k, v); });
    return p.toString();
};
const show = (v) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

const Changes = ({ oldValue, newValue }) => {
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (!isObj(oldValue) && !isObj(newValue)) {
        return <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{show(newValue ?? oldValue)}</p>;
    }
    const keys = [...new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})])];
    const hasOld = isObj(oldValue);
    return (
        <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase tracking-wider">
                <tr><th className="py-1 pr-3">Field</th>{hasOld && <th className="py-1 pr-3">Before</th>}<th className="py-1">{hasOld ? 'After' : 'Value'}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {keys.map((k) => {
                    const changed = hasOld && JSON.stringify(oldValue?.[k]) !== JSON.stringify(newValue?.[k]);
                    return (
                        <tr key={k} className={changed ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}>
                            <td className="py-1 pr-3 font-bold align-top">{k}</td>
                            {hasOld && <td className="py-1 pr-3 align-top break-all">{show(oldValue?.[k])}</td>}
                            <td className="py-1 align-top break-all">{show(newValue?.[k] ?? (hasOld ? undefined : oldValue?.[k]))}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

const AdminAuditLog = () => {
    const [filters, setFilters] = useState(NO_FILTERS);
    const [qInput, setQInput] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ rows: [], total: 0 });
    const [options, setOptions] = useState({ actions: [], entities: [], roles: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [openId, setOpenId] = useState(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await api.get('/admin/audit/filters');
                if (!cancelled) setOptions(res.data);
            } catch { /* best effort */ }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await api.get(`/admin/audit?${toParams(filters, { page, page_size: PAGE_SIZE })}`);
                if (cancelled) return;
                setData(res.data);
                setError('');
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.error || 'Could not load the audit log.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [filters, page, reloadKey]);

    const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    const anyFilter = useMemo(() => Object.values(filters).some(Boolean), [filters]);

    const change = (k) => (e) => { setLoading(true); setOpenId(null); setPage(1); setFilters({ ...filters, [k]: e.target.value }); };
    const submitSearch = (e) => {
        e.preventDefault();
        if (qInput.trim() === filters.q) return;
        setLoading(true); setOpenId(null); setPage(1); setFilters({ ...filters, q: qInput.trim() });
    };
    const clear = () => { setLoading(true); setOpenId(null); setPage(1); setQInput(''); setFilters(NO_FILTERS); };
    const goTo = (p) => { setLoading(true); setOpenId(null); setPage(p); };

    const exportCsv = async () => {
        setExporting(true);
        try {
            const res = await api.get(`/admin/audit/export?${toParams(filters)}`);
            const rows = res.data.rows;
            if (rows.length === 0) { toast('Nothing to export for these filters.'); return; }
            const csv = toCSV([
                ['time', 'actor', 'role', 'action', 'entity', 'entity_id', 'reason', 'ip', 'before', 'after'],
                ...rows.map((r) => [new Date(r.at).toISOString(), r.actor || 'System', r.actorRole || '', r.action, r.entity, r.entityId || '', r.reason || '', r.ip || '',
                    r.oldValue === null ? '' : JSON.stringify(r.oldValue), r.newValue === null ? '' : JSON.stringify(r.newValue)])
            ]);
            downloadTextFile('audit_log.csv', csv);
            toast.success(res.data.truncated ? `Exported the newest ${res.data.max} entries.` : `Exported ${rows.length} entries.`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not export the audit log.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Audit Log</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
                        A read-only record of who changed what. Passwords and tokens are never stored here.
                    </p>
                </div>
                <button onClick={exportCsv} disabled={exporting || data.total === 0}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm px-5 py-3 shadow-sm disabled:opacity-50">
                    <Download size={16} /> {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
            </header>

            <div className="flex flex-wrap items-end gap-3 mb-5">
                <form onSubmit={submitSearch} className="space-y-1 flex-1 min-w-[220px] max-w-sm">
                    <label htmlFor="al-q" className={labelCls}>Search</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input id="al-q" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Person, action or record id…"
                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>
                </form>
                <div className="space-y-1">
                    <label htmlFor="al-action" className={labelCls}>Action</label>
                    <select id="al-action" value={filters.action} onChange={change('action')} className={`${selectCls} block max-w-[220px]`}>
                        <option value="">All actions</option>
                        {options.actions.map((a) => <option key={a} value={a}>{prettyAction(a)}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label htmlFor="al-entity" className={labelCls}>Record type</label>
                    <select id="al-entity" value={filters.entity} onChange={change('entity')} className={`${selectCls} block`}>
                        <option value="">All types</option>
                        {options.entities.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label htmlFor="al-role" className={labelCls}>Done by</label>
                    <select id="al-role" value={filters.role} onChange={change('role')} className={`${selectCls} block`}>
                        <option value="">Anyone</option>
                        {options.roles.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label htmlFor="al-from" className={labelCls}>From</label>
                    <input id="al-from" type="date" value={filters.from} max={filters.to || undefined} onChange={change('from')} className={`${selectCls} block`} />
                </div>
                <div className="space-y-1">
                    <label htmlFor="al-to" className={labelCls}>To</label>
                    <input id="al-to" type="date" value={filters.to} min={filters.from || undefined} onChange={change('to')} className={`${selectCls} block`} />
                </div>
                {anyFilter && (
                    <button onClick={clear} className="inline-flex items-center gap-1.5 py-2.5 px-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                        <X size={14} /> Clear
                    </button>
                )}
            </div>

            {loading ? (
                <p className="text-slate-400 font-bold animate-pulse">Loading…</p>
            ) : error ? (
                <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-5 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
                    <button onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }} className="text-sm font-bold text-rose-700 dark:text-rose-300 underline">Try again</button>
                </div>
            ) : data.rows.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
                    <ScrollText size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">{anyFilter ? 'No entries match these filters.' : 'No activity has been recorded yet.'}</p>
                </div>
            ) : (
                <>
                    <ul className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                        {data.rows.map((r) => {
                            const open = openId === r.id;
                            const hasDetail = r.oldValue !== null || r.newValue !== null || r.reason || r.ip;
                            return (
                                <li key={r.id}>
                                    <button type="button" onClick={() => setOpenId(open ? null : r.id)} aria-expanded={open}
                                        className="w-full text-left px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${TONES[actionTone(r.action)]}`}>{prettyAction(r.action)}</span>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            {r.entity}{r.entityId ? ` #${r.entityId}` : ''}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                            {r.actor ? `${r.actor}${r.actorRole ? ` (${r.actorRole})` : ''}` : 'System'}
                                        </span>
                                        <span className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-400">
                                            {when(r.at)}
                                            <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                                        </span>
                                    </button>
                                    {open && (
                                        <div className="px-5 pb-4 space-y-3 bg-slate-50/60 dark:bg-slate-950/40">
                                            {hasDetail ? (
                                                <>
                                                    {(r.oldValue !== null || r.newValue !== null) && <Changes oldValue={r.oldValue} newValue={r.newValue} />}
                                                    {r.reason && <p className="text-xs font-medium text-slate-600 dark:text-slate-300"><b>Reason:</b> {r.reason}</p>}
                                                    {r.ip && <p className="text-xs font-medium text-slate-400">From IP {r.ip}</p>}
                                                </>
                                            ) : (
                                                <p className="text-xs font-medium text-slate-400">No further details were recorded.</p>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                        <span>{data.total} entr{data.total === 1 ? 'y' : 'ies'} · page {page} of {pages}</span>
                        <span className="flex items-center gap-2">
                            <button onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page"
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40"><ChevronLeft size={16} /></button>
                            <button onClick={() => goTo(page + 1)} disabled={page >= pages} aria-label="Next page"
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40"><ChevronRight size={16} /></button>
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminAuditLog;
