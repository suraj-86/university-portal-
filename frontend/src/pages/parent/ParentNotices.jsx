import React, { useState, useEffect } from 'react';
import { Bell, Users } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const ParentNotices = () => {
    const { user } = useAuth();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedWardId, setSelectedWardId] = useState('');
    const [allWards, setAllWards] = useState([]);

    useEffect(() => {
        const fetchNotices = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                const url = selectedWardId 
                    ? `http://localhost:5000/api/parent/${user.id}/wards-overview?student_id=${selectedWardId}`
                    : `http://localhost:5000/api/parent/${user.id}/wards-overview`;

                const summaryRes = await fetch(url);
                const summaryData = await summaryRes.json();
                
                if (summaryData.childProfile) {
                    setAllWards(summaryData.allWards || []);
                    if (!selectedWardId) setSelectedWardId(summaryData.childProfile.student_id);

                    const childUserId = summaryData.childProfile.user_id;
                    const res = await fetch(`http://localhost:5000/api/student/${childUserId}/custom-dashboard`);
                    const data = await res.json();
                    setNotices(data.notices || []);
                }
            } catch (error) {
                console.error("Error fetching notices:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotices();
    }, [user, selectedWardId]);

    if (loading && notices.length === 0) return <div className="p-10 text-slate-500 font-bold animate-pulse uppercase tracking-widest text-sm">Loading Notices...</div>;

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Campus Notices</h2>
                    <p className="text-slate-500 mt-1 font-medium">Official announcements regarding your ward.</p>
                </div>

                {allWards.length > 1 && (
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                        <Users size={18} className="text-indigo-600" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Ward</p>
                            <select 
                                value={selectedWardId} 
                                onChange={(e) => setSelectedWardId(e.target.value)}
                                className="text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                            >
                                {allWards.map(ward => (
                                    <option key={ward.student_id} value={ward.student_id}>
                                        {ward.full_name} ({ward.course_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all">
                {notices.length > 0 ? notices.map(notice => (
                    <div key={notice.id} className={`p-6 rounded-3xl border shadow-sm transition-all bg-white ${notice.border}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notice.iconBg} ${notice.text}`}>
                                <Bell size={18} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{notice.date}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest block ${notice.text}`}>{notice.type} Alert</span>
                            </div>
                        </div>
                        <h4 className="font-bold text-slate-900 text-lg leading-tight mb-2">{notice.title}</h4>
                    </div>
                )) : <p className="text-slate-400 italic">No recent notices available.</p>}
            </div>
        </div>
    );
};

export default ParentNotices;