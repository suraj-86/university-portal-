import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import HostelInfo from '../../components/HostelInfo';
import WardSwitcher from '../../components/parent/WardSwitcher';

const ParentHostel = () => {
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
                setWards(res.data?.allWards || []);
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

        const loadHostel = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.get(`/student/${ward.user_id}/hostel`);
                if (!cancelled) setData(res.data);
            } catch (err) {
                console.error('Error fetching hostel information:', err);
                if (!cancelled) {
                    setData(null);
                    setError(err.response?.data?.error || "Could not load your ward's hostel information. Please try again.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadHostel();
        return () => { cancelled = true; };
    }, [selectedWardId, wards]);

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <WardSwitcher wards={wards} currentId={selectedWardId} onChange={setSelectedWardId} />
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Hostel</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Your ward's hostel, block, room and warden details.</p>
                </div>
                
            </header>

            {loading && <div className="p-10 text-center font-semibold text-slate-400 dark:text-slate-500">Loading hostel information...</div>}

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

            {!loading && !error && data && <HostelInfo data={data} />}
        </div>
    );
};

export default ParentHostel;
