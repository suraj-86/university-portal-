import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, FileText, Download, X, Megaphone, User, Clock, ChevronRight } from 'lucide-react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import useAuth from '../../hooks/useAuth';

const StudentNotices = () => {
    const { user } = useAuth();
    const [filterType, setFilterType] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingNotice, setViewingNotice] = useState(null);

    useEffect(() => {
        if (user?.id) {
            fetch(`http://localhost:5000/api/student/${user.id}/notices`)
                .then(res => res.json())
                .then(data => {
                    setNotices(Array.isArray(data) ? data : []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Fetch Error:", err);
                    setLoading(false);
                });
        }
    }, [user]);

    const filteredNotices = useMemo(() => {
        return notices
            .filter(n => {
                const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase()));
                if (filterType === 'All') return matchesSearch;
                if (filterType === 'Teacher') return n.author_role === 'teacher' && matchesSearch;
                if (filterType === 'Admin') return n.author_role === 'admin' && matchesSearch;
                return matchesSearch;
            })
            .sort((a, b) => (a.priority === 'High' ? -1 : 1));
    }, [filterType, searchTerm, notices]);

    // Download Logic
    const handleDownload = (e, fileName) => {
        e.stopPropagation(); 
        if (!fileName) return;
        window.open(`http://localhost:5000/uploads/${fileName}`, '_blank');
    };

    return (
        <div className="p-4 md:p-10 bg-[#fbfcfd] min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        NOTICE <span className="text-blue-600 italic"> UPDATES</span>
                    </h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Official University Announcements</p>
                </div>
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <input 
                        type="text" placeholder="Search notices..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                    />
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                {['All', 'Teacher', 'Admin'].map(type => (
                    <button 
                        key={type} 
                        onClick={() => setFilterType(type)} 
                        className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                            filterType === type ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                        }`}
                    >
                        {type === 'Teacher' ? 'Academic' : type === 'Admin' ? 'Official' : 'All Updates'}
                    </button>
                ))}
            </div>

            {/* Horizontal Full Width List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="py-20 text-center animate-pulse font-bold text-slate-300 uppercase text-[10px] tracking-widest">Loading Board...</div>
                ) : filteredNotices.length > 0 ? filteredNotices.map(notice => (
                    <div 
                        key={notice.id} 
                        onClick={() => setViewingNotice(notice)}
                        className="bg-white hover:bg-slate-50 border border-slate-100 rounded-[24px] p-5 flex flex-col lg:flex-row lg:items-center gap-6 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        {/* Priority Accent */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${notice.priority === 'High' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>

                        {/* Title & Body Area */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${notice.author_role === 'teacher' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {notice.author_role === 'teacher' ? 'Faculty' : 'Admin'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1.5">
                                    <Clock size={12}/> {notice.date}
                                </span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 group-hover:text-blue-600 transition-colors mb-1 truncate capitalize">
                                {notice.title}
                            </h3>
                            <p className="text-slate-400 text-sm font-medium line-clamp-1">
                                {notice.content}
                            </p>
                        </div>

                        {/* FULL ATTACHMENT BOX ON THE NOTICE BOX */}
                        {notice.attachment_url && (
                            <div 
                                onClick={(e) => handleDownload(e, notice.attachment_url)}
                                className="shrink-0 flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group/file"
                            >
                                <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600 group-hover/file:bg-blue-600 group-hover/file:text-white transition-colors">
                                    <FileText size={20} />
                                </div>
                                <div className="min-w-0 pr-4">
                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Attachment</p>
                                    <p className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{notice.attachment_url}</p>
                                </div>
                                <Download size={16} className="text-slate-300 group-hover/file:text-blue-600" />
                            </div>
                        )}

                        {/* Author & Action Area */}
                        <div className="flex items-center justify-between lg:justify-end gap-6 lg:border-l lg:border-slate-100 lg:pl-6 shrink-0">
                            {notice.author_role !== 'admin' && (
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-black text-white uppercase">
                                        {notice.author_name?.charAt(0)}
                                    </div>
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-tight">{notice.author_name}</p>
                                </div>
                            )}
                            <div className="p-2.5 bg-slate-50 text-slate-300 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="py-32 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                        <Megaphone size={40} className="mx-auto text-slate-100 mb-4" />
                        <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">No notices found</p>
                    </div>
                )}
            </div>

             {/* --- PREVIEW MODAL (Similar to Admin/Teacher) --- */}
            {viewingNotice && (
                <Modal 
                    isOpen={!!viewingNotice} 
                    onClose={() => setViewingNotice(null)} 
                    title="Notice Preview"
                >
                    <div className="flex flex-col h-full max-h-[80vh]">
                        {/* PINNED HEADER */}
                        <div className="shrink-0 pb-4 border-b border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${viewingNotice.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {viewingNotice.priority} Priority
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{viewingNotice.date}</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight capitalize">
                                {viewingNotice.title}
                            </h2>
                            {viewingNotice.author_role !== 'admin' && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <User size={12}/> By: {viewingNotice.author_name}
                                </p>
                            )}
                        </div>

                        {/* SCROLLABLE CONTENT */}
                        <div className="flex-1 overflow-y-auto py-6 my-2 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner">
                            <div className="px-6">
                                <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap break-words font-medium">
                                    {viewingNotice.content}
                                </p>
                            </div>
                        </div>

                        {/* PINNED BOTTOM */}
                        <div className="shrink-0 pt-4 space-y-4">
                            {viewingNotice.attachment_url && (
                                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Attachment</p>
                                            <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{viewingNotice.attachment_url}</p>
                                        </div>
                                    </div>
                                    <button className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                                        <Download size={18} />
                                    </button>
                                </div>
                            )}
                            <button 
                                onClick={() => setViewingNotice(null)}
                                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 text-xs uppercase tracking-[0.2em]"
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

export default StudentNotices;