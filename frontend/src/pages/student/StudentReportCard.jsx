import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import ReportCard from '../../components/ReportCard';

const StudentReportCard = () => {
    const { user } = useAuth();
    const userId = user?.id;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.get(`/student/${userId}/report-card`);
                if (!cancelled) setData(res.data);
            } catch (err) {
                console.error('Error fetching report card:', err);
                if (!cancelled) setError(err.response?.data?.error || 'Could not load your report card. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [userId]);

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Report Card</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Your semester-wise marks, grades, SGPA, CGPA and attendance in one formal statement.</p>
            </header>

            {loading && (
                <div className="p-10 text-center font-semibold text-slate-400 dark:text-slate-500">Loading report card...</div>
            )}

            {!loading && error && (
                <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold">
                    {error}
                </div>
            )}

            {!loading && !error && data && <ReportCard data={data} />}
        </div>
    );
};

export default StudentReportCard;
