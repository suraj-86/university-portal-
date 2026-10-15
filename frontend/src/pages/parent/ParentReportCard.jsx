import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import ReportCard from '../../components/ReportCard';

const ParentReportCard = () => {
    const { user } = useAuth();
    const parentId = user?.id;

    const [wards, setWards] = useState([]);
    const [selectedWardId, setSelectedWardId] = useState('');
    const [wardsLoaded, setWardsLoaded] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!parentId) return;
        let cancelled = false;

        const loadWards = async () => {
            try {
                const res = await api.get(`/parent/${parentId}/wards-overview`);
                if (cancelled) return;
                const list = res.data?.allWards || [];
                setWards(list);
                if (res.data?.childProfile) setSelectedWardId(String(res.data.childProfile.student_id));
            } catch (err) {
                console.error('Error fetching wards:', err);
                if (!cancelled) setError(err.response?.data?.error || 'Could not load your ward information. Please try again.');
            } finally {
                if (!cancelled) {
                    setWardsLoaded(true);
                    setLoading(false);
                }
            }
        };

        loadWards();
        return () => { cancelled = true; };
    }, [parentId]);

    useEffect(() => {
        if (!selectedWardId) return;
        const ward = wards.find((w) => String(w.student_id) === String(selectedWardId));
        if (!ward) return;
        let cancelled = false;

        const loadCard = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.get(`/student/${ward.user_id}/report-card`);
                if (!cancelled) setData(res.data);
            } catch (err) {
                console.error('Error fetching report card:', err);
                if (!cancelled) {
                    setData(null);
                    setError(err.response?.data?.error || "Could not load your ward's report card. Please try again.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadCard();
        return () => { cancelled = true; };
    }, [selectedWardId, wards]);

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Report Card</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Your ward's semester-wise marks, grades, SGPA, CGPA and attendance in one formal statement.</p>
                </div>
                {wards.length > 1 && (
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Ward</p>
                            <select
                                value={selectedWardId}
                                onChange={(e) => setSelectedWardId(e.target.value)}
                                className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
                            >
                                {wards.map((ward) => (
                                    <option key={ward.student_id} value={ward.student_id} className="dark:bg-slate-900">
                                        {ward.full_name} ({ward.course_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </header>

            {loading && (
                <div className="p-10 text-center font-semibold text-slate-400 dark:text-slate-500">Loading report card...</div>
            )}

            {!loading && error && (
                <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold">
                    {error}
                </div>
            )}

            {!loading && !error && wardsLoaded && wards.length === 0 && (
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold">
                    No ward is linked to your account yet. Please contact the administrator.
                </div>
            )}

            {!loading && !error && data && <ReportCard key={selectedWardId} data={data} />}
        </div>
    );
};

export default ParentReportCard;
