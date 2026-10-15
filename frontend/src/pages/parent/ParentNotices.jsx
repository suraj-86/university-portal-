import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import NoticeFeed from '../../components/notices/NoticeFeed';

const ParentNotices = () => {
    const { user } = useAuth();
    const [wards, setWards] = useState([]);
    const [wardId, setWardId] = useState('');

    useEffect(() => {
        if (!user?.id) return;
        api.get(`/parent/${user.id}/wards-overview`)
            .then((res) => setWards(res.data?.allWards || []))
            .catch(() => setWards([]));
    }, [user]);

    const picker = wards.length > 1 && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Showing notices for</p>
                <select
                    value={wardId}
                    onChange={(e) => setWardId(e.target.value)}
                    className="cursor-pointer bg-transparent text-sm font-bold text-slate-800 outline-none dark:text-slate-200"
                >
                    <option value="" className="dark:bg-slate-900">All my children</option>
                    {wards.map((w) => (
                        <option key={w.student_id} value={w.student_id} className="dark:bg-slate-900">{w.full_name} ({w.course_name})</option>
                    ))}
                </select>
            </div>
        </div>
    );

    return (
        <NoticeFeed
            title="Campus Notices"
            subtitle="Official announcements about your ward, and messages from faculty to you."
            params={wardId ? { student_id: wardId } : {}}
            headerRight={picker}
        />
    );
};

export default ParentNotices;
