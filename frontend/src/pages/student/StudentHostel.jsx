import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import HostelInfo from '../../components/HostelInfo';

const StudentHostel = () => {
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
                const res = await api.get(`/student/${userId}/hostel`);
                if (!cancelled) setData(res.data);
            } catch (err) {
                console.error('Error fetching hostel information:', err);
                if (!cancelled) setError(err.response?.data?.error || 'Could not load your hostel information. Please try again.');
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
                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Hostel</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Your hostel, block, room and warden details.</p>
            </header>

            {loading && <div className="p-10 text-center font-semibold text-slate-400 dark:text-slate-500">Loading hostel information...</div>}

            {!loading && error && (
                <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold">
                    {error}
                </div>
            )}

            {!loading && !error && data && <HostelInfo data={data} />}
        </div>
    );
};

export default StudentHostel;
