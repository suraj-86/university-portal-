import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Bell, Calendar, FileText, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

const StudentDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const userId = user ? user.id : 1; 

                const response = await api.get(`/student/${userId}/custom-dashboard`);
                setDashboardData(response.data);
            } catch (error) {
                console.error("Network error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading || !dashboardData) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest bg-slate-50">Loading Dashboard...</div>;
    }

    const { profile, upcoming_classes, notices, performanceData } = dashboardData;

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome, {profile.full_name.split(' ')[0]} 👋</h2>
                <p className="text-slate-500 mt-1 font-medium">Here is your academic overview for today.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 flex flex-col items-center text-center overflow-hidden">
                    <div className="w-full h-24 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
                    <div className="w-20 h-20 bg-white text-indigo-600 rounded-full flex items-center justify-center text-2xl font-black mb-4 border-4 border-white shadow-md -mt-10">
                        {profile.full_name.charAt(0)}
                    </div>
                    <div className="px-6 pb-6 w-full flex flex-col items-center">
                        <h3 className="text-xl font-black text-slate-900">{profile.full_name}</h3>
                        <p className="text-indigo-600 font-bold text-xs mt-1 uppercase tracking-widest">{profile.course_name} • Sem {profile.semester}</p>
                        <p className="text-slate-400 font-medium text-sm mt-1 mb-6">{profile.email}</p>
                        
                        <Link to="/student/profile" className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-2xl transition-colors mb-4 block text-center border border-slate-200 shadow-sm text-sm">
                            View Full Profile
                        </Link>
                        
                        <div className="w-full pt-4 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Student ID: {profile.student_id}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-8 lg:col-span-2 flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Upcoming Classes</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                Next scheduled sessions
                            </p>
                        </div>
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-indigo-100">
                            {upcoming_classes.length} Sessions
                        </span>
                    </div>
                    <div className="flex flex-col gap-4 flex-1 justify-center">
                        {upcoming_classes.length > 0 ? (
                            upcoming_classes.map((cls, index) => (
                                <div key={cls.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors gap-4 sm:gap-0 group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm border
                                            ${index === 0 ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-200 text-slate-400 group-hover:text-indigo-500 transition-colors'}`}>
                                            <Clock size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-black text-slate-900">{cls.subject}</h4>
                                                {index === 0 && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {cls.class_date_label ? `${cls.class_date_label} • ` : ''}{cls.time} • {cls.faculty}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                                        <MapPin size={14} className="text-indigo-500" />
                                        <span className="text-xs font-bold">{cls.room}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center p-6 text-slate-500 font-bold bg-slate-50 rounded-2xl border border-slate-200">
                                No upcoming classes scheduled.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 flex flex-col lg:col-span-2">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Academic Trajectory</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">CGPA progression</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full" style={{ minHeight: '280px' }}>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={performanceData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }} dy={10} />
                                <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} 
                                    itemStyle={{ color: '#4f46e5' }}
                                />
                                <Line type="monotone" dataKey="cgpa" stroke="#4f46e5" strokeWidth={4} dot={{ r: 5, strokeWidth: 3, fill: '#fff', stroke: '#4f46e5' }} activeDot={{ r: 8, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-900">Campus Board</h3>
                        <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                            <Bell size={18} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 flex-1">
                        {notices.length > 0 ? notices.map((notice) => (
                            <div key={notice.id} className={`flex items-start gap-4 p-4 rounded-2xl border ${notice.bg} ${notice.border} transition-all hover:scale-[1.02] cursor-pointer`}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${notice.iconBg} ${notice.text}`}>
                                    {notice.type === "General" && <Bell size={20} />}
                                    {notice.type === "Academic" && <Calendar size={20} />}
                                    {notice.type === "Alert" && <FileText size={20} />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1.5">{notice.title}</h4>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span className={notice.text}>{notice.type}</span>
                                        <span>•</span>
                                        <span>{notice.date}</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-400 text-sm italic">No recent notices available.</p>
                        )}
                    </div>
                    
                    <Link to="/student/notices" className="w-full mt-6 flex items-center justify-center gap-2 text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors py-3 border border-slate-200 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 uppercase tracking-widest">
                        View All <ChevronRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;