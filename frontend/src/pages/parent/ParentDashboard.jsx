import React, { useState, useEffect } from 'react';
import { Activity, DollarSign, Award, BookOpen, Clock, Bell, FileText, Calendar, CheckCircle2, Users, Download, X } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import StatsWidget from '../../components/StatsWidget';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Modal from '../../components/Modal';

const ParentDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [viewingNotice, setViewingNotice] = useState(null);
    
    const [selectedWardId, setSelectedWardId] = useState('');
    const [allWards, setAllWards] = useState([]);
    const [wardSummary, setWardSummary] = useState(null);
    const [wardDetails, setWardDetails] = useState({
        fees: [], payments: [], results: {}, classes: [], notices: []
    });

    useEffect(() => {
        const fetchAllData = async () => {
            if (!user?.id) return;
            setLoading(true);
            
            try {
                const url = selectedWardId 
                    ? `/parent/${user.id}/wards-overview?student_id=${selectedWardId}`
                    : `/parent/${user.id}/wards-overview`;
                
                const summaryRes = await api.get(url);
                const summaryData = summaryRes.data;
                
                if (summaryData.childProfile) {
                    setWardSummary(summaryData);
                    setAllWards(summaryData.allWards);
                    
                    if (!selectedWardId) setSelectedWardId(summaryData.childProfile.student_id);
                    
                    const childUserId = summaryData.childProfile.user_id;
                    const [feesRes, paymentsRes, resultsRes, dashboardRes] = await Promise.all([
                        api.get(`/student/${childUserId}/fees`),
                        api.get(`/student/${childUserId}/payments`),
                        api.get(`/student/${childUserId}/results`),
                        api.get(`/student/${childUserId}/custom-dashboard`)
                    ]);
                    
                    setWardDetails({
                        fees: feesRes.data || [],
                        payments: paymentsRes.data || [],
                        results: resultsRes.data || {},
                        classes: dashboardRes.data.upcoming_classes || [],
                        notices: dashboardRes.data.notices || []
                    });
                }
            } catch (error) {
                console.error("Error fetching ward data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [user, selectedWardId]);

    const handleDownload = (e, fileName) => {
        if (e) e.stopPropagation();
        if (!fileName) return;
        const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
        const fullUrl = fileName.startsWith('/') ? `${rawBaseUrl}${fileName}` : `${rawBaseUrl}/uploads/${fileName}`;
        window.open(fullUrl, '_blank');
    };

    if (loading && !wardSummary) {
        return <div className="p-10 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest animate-pulse bg-slate-50 dark:bg-slate-950 min-h-screen">Loading Ward Information...</div>;
    }

    if (!wardSummary?.childProfile) {
        return <div className="p-10 text-center text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 min-h-screen">No active students are currently linked to your parent account.</div>;
    }

    const { childProfile, summaryMetrics } = wardSummary;
    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const feeColumns = [
        { header: "Fee Type", accessor: "fee_type", cell: (row) => <span className="font-bold text-slate-900 dark:text-slate-100">{row.fee_type} <span className="text-xs text-slate-400 dark:text-slate-500 block">Sem {row.semester}</span></span> },
        { header: "Total / Paid", accessor: "amount", cell: (row) => <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(row.total_fee)} / <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(row.paid_amount)}</span></span> },
        { header: "Due Date", accessor: "due_date", cell: (row) => <span className="text-slate-500 dark:text-slate-400">{new Date(row.due_date).toLocaleDateString('en-IN')}</span> },
        { header: "Status", accessor: "status", cell: (row) => <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${row.status === 'Paid' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'}`}>{row.status}</span> }
    ];

    const paymentColumns = [
        { header: "Ref ID / Date", accessor: "ref", cell: (row) => <div><span className="font-bold text-slate-900 dark:text-slate-100">{row.transaction_reference}</span><span className="text-xs text-slate-500 dark:text-slate-400 block">{new Date(row.payment_date).toLocaleDateString('en-IN')}</span></div> },
        { header: "Method", accessor: "payment_method", cell: (row) => <span className="font-medium text-slate-600 dark:text-slate-300">{row.payment_method}</span> },
        { header: "Amount Paid", accessor: "amount_paid", cell: (row) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.amount_paid)}</span> }
    ];

    const flattenedResults = Object.keys(wardDetails.results).flatMap(sem => 
        wardDetails.results[sem].map(r => ({ ...r, semester: sem }))
    );

    const resultColumns = [
        { header: "Subject", accessor: "subject", cell: (row) => <span className="font-bold text-slate-900 dark:text-slate-100">{row.subject} <span className="text-xs text-slate-400 dark:text-slate-500 block">Sem {row.semester}</span></span> },
        { header: "Score", accessor: "score", cell: (row) => <span className="font-bold text-slate-700 dark:text-slate-300">{row.total} <span className="text-slate-400 dark:text-slate-500 text-xs">/ {row.totalMax}</span></span> },
        { header: "Grade", accessor: "grade", cell: (row) => <span className={`px-3 py-1 rounded text-[10px] font-black uppercase ${row.grade.includes('A') ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'}`}>{row.grade}</span> }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Parent Portal</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Academic & Financial overview for your ward.</p>
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

            <Card className="mb-8 p-6 flex flex-col md:flex-row items-center gap-6 border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/30 transition-all">
                <div className="w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-md shrink-0">
                    {childProfile.full_name.charAt(0)}
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{childProfile.full_name}</h3>
                    <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-xs mt-1">
                        {childProfile.course_name} • Semester {childProfile.semester}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
                        Enrollment Number: {childProfile.enrollment_number}
                    </p>
                </div>
            </Card>

            <div className="flex overflow-x-auto gap-2 mb-8 pb-2">
                {[
                    { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
                    { id: 'academics', label: 'Academics & Schedule', icon: <BookOpen size={16} /> },
                    { id: 'financials', label: 'Fees & Payments', icon: <DollarSign size={16} /> },
                    { id: 'notices', label: 'Campus Notices', icon: <Bell size={16} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    <StatsWidget title="ATTENDANCE RATE" value={`${summaryMetrics.attendanceRate || 0}%`} icon={<Calendar size={24} className="text-emerald-600 dark:text-emerald-400" />} />
                    <StatsWidget title="OUTSTANDING DUES" value={`₹${summaryMetrics.totalDues || 0}`} icon={<DollarSign size={24} className="text-rose-600 dark:text-rose-400" />} />
                    <StatsWidget title="CLASS AVERAGE" value={`${summaryMetrics.classAverage || 0} / 100`} icon={<Award size={24} className="text-blue-600 dark:text-blue-400" />} />
                </div>
            )}

            {activeTab === 'academics' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Clock size={18} className="text-indigo-600 dark:text-indigo-400"/> Today's Class Schedule</h3>
                        </div>
                        <div className="p-5 flex flex-col gap-3">
                            {wardDetails.classes.length > 0 ? wardDetails.classes.map((cls, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{cls.subject}</p>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{cls.time} | Room {cls.room}</p>
                                    </div>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{cls.faculty}</span>
                                </div>
                            )) : <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-4">No classes scheduled for today.</p>}
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Award size={18} className="text-indigo-600 dark:text-indigo-400"/> Subject Results</h3>
                        </div>
                        <Table columns={resultColumns} data={flattenedResults} pageSize={5} />
                    </div>
                </div>
            )}

            {activeTab === 'financials' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><FileText size={18} className="text-indigo-600 dark:text-indigo-400"/> Fee Ledger</h3>
                        </div>
                        <Table columns={feeColumns} data={wardDetails.fees} pageSize={5} />
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400"/> Payment History</h3>
                        </div>
                        <Table columns={paymentColumns} data={wardDetails.payments} pageSize={5} />
                    </div>
                </div>
            )}

            {activeTab === 'notices' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden p-6 animate-in fade-in duration-300">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-6"><Bell size={18} className="text-indigo-600 dark:text-indigo-400"/> Campus Notices</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {wardDetails.notices.length > 0 ? wardDetails.notices.map(notice => (
                            <div 
                                key={notice.id}
                                onClick={() => setViewingNotice(notice)}
                                className={`p-4 rounded-2xl border dark:bg-slate-800/50 dark:border-slate-700 transition-all cursor-pointer hover:scale-[1.02]`}
                            >
                                <h4 className={`font-bold text-sm mb-1 text-slate-900 dark:text-slate-100`}>{notice.title}</h4>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    <span>{notice.date}</span>
                                    <span>•</span>
                                    <span>{notice.type}</span>
                                </div>
                            </div>
                        )) : <p className="text-sm text-slate-400 dark:text-slate-500 italic">No recent notices available.</p>}
                    </div>
                </div>
            )}

            {viewingNotice && (
                <Modal isOpen={!!viewingNotice} onClose={() => setViewingNotice(null)} title="Notice Preview">
                    <div className="flex flex-col h-full max-h-[80vh]">
                        <div className="shrink-0 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${viewingNotice.type === 'Alert' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'}`}>
                                    {viewingNotice.type} Priority
                                </span>
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{viewingNotice.date}</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight capitalize">{viewingNotice.title}</h2>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto py-6 my-2 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner px-6">
                            <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed whitespace-pre-wrap break-words font-medium">{viewingNotice.content || viewingNotice.title}</p>
                        </div>
                        
                        <div className="shrink-0 pt-4 space-y-4">
                            {viewingNotice.attachment_url && (
                                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg"><FileText size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">Attachment</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{viewingNotice.attachment_url.replace('/uploads/', '')}</p>
                                        </div>
                                    </div>
                                    <button onClick={(e) => handleDownload(e, viewingNotice.attachment_url)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                                        <Download size={18} />
                                    </button>
                                </div>
                            )}
                            <button onClick={() => setViewingNotice(null)} className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-all text-xs uppercase tracking-[0.2em]">
                                Close Preview
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ParentDashboard;