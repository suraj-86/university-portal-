import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import WardDashboard from '../../components/dashboard/WardDashboard';

const ParentDashboard = () => {
    const { user } = useAuth();
    const [selected, setSelected] = useState('');
    const [state, setState] = useState({ key: null, wards: [], current: null, error: false });
    const key = `${user?.id}:${selected}`;
    const loading = !!user?.id && state.key !== key;

    useEffect(() => {
        if (!user?.id) return undefined;
        let cancelled = false;
        api.get(`/parent/${user.id}/wards-overview${selected ? `?student_id=${selected}` : ''}`)
            .then((r) => { if (!cancelled) setState({ key, wards: r.data.allWards || [], current: r.data.childProfile || null, error: false }); })
            .catch(() => { if (!cancelled) setState({ key, wards: [], current: null, error: true }); });
        return () => { cancelled = true; };
    }, [user, selected, key]);

    const wrap = (node) => <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">{node}</div>;
    if (loading && !state.current) return wrap(<div className="p-10 text-slate-400 font-bold animate-pulse">Loading ward information…</div>);
    if (state.error) return wrap(<div className="p-10 text-center text-rose-600 dark:text-rose-400 font-bold">Ward information could not be loaded.</div>);
    if (!state.current) return wrap(<div className="p-10 text-center text-slate-500 dark:text-slate-400 font-bold">No active students are currently linked to your parent account.</div>);

    const { current, wards } = state;
    const firstName = (current.full_name || 'your ward').split(' ')[0];
    const switcher = wards.length > 1 ? (
        <div className="mb-4 flex items-center gap-3">
            <label htmlFor="ward-switch" className="text-sm font-semibold text-slate-600 dark:text-slate-300">Showing</label>
            <select id="ward-switch" value={current.student_id} onChange={(e) => setSelected(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold px-3 py-2">
                {wards.map((w) => <option key={w.student_id} value={w.student_id}>{w.full_name}{w.roll_number ? ` (Roll ${w.roll_number})` : ''}</option>)}
            </select>
        </div>
    ) : null;

    return (
        <WardDashboard key={current.user_id} studentUserId={current.user_id} base="/parent" parent subject={firstName}
            greetingName={(user?.full_name || 'there').split(' ')[0]} switcher={switcher} />
    );
};

export default ParentDashboard;
