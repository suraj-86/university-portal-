import React, { useState, useEffect } from 'react';
import { Bell, Users, FileText, Download, User, Clock, ChevronRight } from 'lucide-react';
import api, { getFileUrl } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import Modal from '../../components/Modal';

const ParentNotices = () => {
    const { user } = useAuth();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWardId, setSelectedWardId] = useState('');
    const [allWards, setAllWards] = useState([]);
    const [viewingNotice, setViewingNotice] = useState(null);

    useEffect(() => {
        const fetchNotices = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                const url = selectedWardId 
                    ? `/parent/${user.id}/wards-overview?student_id=${selectedWardId}`
                    : `/parent/${user.id}/wards-overview`;
                
                const summaryRes = await api.get(url);
                const summaryData = summaryRes.data;
                
                if (summaryData.childProfile) {
                    setAllWards(summaryData.allWards || []);
                    if (!selectedWardId) setSelectedWardId(summaryData.childProfile.student_id);
                    
                    const childUserId = summaryData.childProfile.user_id;
                    const res = await api.get(`/student/${childUserId}/notices`);
                    setNotices(res.data || []);
                }
            } catch (error) {
                console.error("Error fetching notices:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotices();
    }, [user, selectedWardId]);

    const handleDownload = (e, fileName) => {
        e.stopPropagation();
        if (!fileName) return;
        window.open(getFileUrl(fileName), '_blank');
    };

    if (loading && notices.length === 0) return <div className="p-10 text-slate-500 dark:text-slate-400 font-bold animate-pulse uppercase tracking-widest text-sm bg-slate-50 dark:bg-slate-950 min-h-screen">Loading Notices...</div>;

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Campus Notices</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Official announcements regarding your ward.</p>
                </div>
                {allWards.length > 1 && (
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Ward</p>
                            <select 
                                value={selectedWardId}
                                onChange={(e) => setSelectedWardId(e.target.value)}
                                className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
                            >
                                {allWards.map(ward => (
                                    <option key={ward.student_id} value={ward.student_id} className="dark:bg-slate-900">
                                        {ward.full_name} ({ward.course_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </header>

            <div className="space-y-4">
                {notices.length > 0 ? notices.map(notice => (
                    <div 
                        key={notice.id}
                        onClick={() => setViewingNotice(notice)}
                        className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-[24px] p-5 flex flex-col lg:flex-row lg:items-center gap-6 transition-all cursor-pointer group relative overflow-hidden shadow-sm"
                    >
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${notice.priority === 'High' ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${notice.author_role === 'teacher' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                    {notice.author_role === 'teacher' ? 'Faculty' : 'Admin'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase flex items-center gap-1.5">
                                    <Clock size={12}/> {notice.date}
                                </span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1 truncate capitalize">
                                {notice.title}
                            </h3>
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium line-clamp-1">
                                {notice.content}
                            </p>
                        </div>

                        {notice.attachment_url && (
                            <div 
                                onClick={(e) => handleDownload(e, notice.attachment_url)}
                                className="shrink-0 flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all group/file"
                            >
                                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-indigo-600 dark:text-indigo-400 group-hover/file:bg-indigo-600 group-hover/file:text-white transition-colors">
                                    <FileText size={20} />
                                </div>
                                <div className="min-w-0 pr-4">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">Attachment</p>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{notice.attachment_url.replace('/uploads/', '')}</p>
                                </div>
                                <Download size={16} className="text-slate-300 dark:text-slate-600 group-hover/file:text-indigo-600" />
                            </div>
                        )}

                        <div className="flex items-center justify-between lg:justify-end gap-6 lg:border-l lg:border-slate-100 dark:lg:border-slate-800 lg:pl-6 shrink-0">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    </div>
                )) : <p className="text-slate-400 dark:text-slate-500 italic">No recent notices available for this ward.</p>}
            </div>

            {viewingNotice && (
                <Modal 
                    isOpen={!!viewingNotice} 
                    onClose={() => setViewingNotice(null)} 
                    title="Notice Preview"
                >
                    <div className="flex flex-col h-full max-h-[80vh]">
                        <div className="shrink-0 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${viewingNotice.priority === 'High' ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'}`}>
                                    {viewingNotice.priority} Priority
                                </span>
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{viewingNotice.date}</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight capitalize">
                                {viewingNotice.title}
                            </h2>
                            {viewingNotice.author_role !== 'admin' && (
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <User size={12}/> By: {viewingNotice.author_name}
                                </p>
                            )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto py-6 my-2 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                            <div className="px-6">
                                <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed whitespace-pre-wrap break-words font-medium">
                                    {viewingNotice.content}
                                </p>
                            </div>
                        </div>
                        
                        <div className="shrink-0 pt-4 space-y-4">
                            {viewingNotice.attachment_url && (
                                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">Attachment</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{viewingNotice.attachment_url.replace('/uploads/', '')}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDownload(e, viewingNotice.attachment_url)}
                                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                                    >
                                        <Download size={18} />
                                    </button>
                                </div>
                            )}
                            <button 
                                onClick={() => setViewingNotice(null)}
                                className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-95 text-xs uppercase tracking-[0.2em]"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ParentNotices;