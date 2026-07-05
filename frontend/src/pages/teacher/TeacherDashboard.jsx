import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Bell, Megaphone, FileText, CheckSquare, Activity, Clock, MapPin } from 'lucide-react';
import StatsWidget from '../../components/StatsWidget';
import useAuth from '../../hooks/useAuth';

const TeacherDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        teacherName: '',
        stats: { totalSubjects: 0, totalStudents: 0, classesConducted: 0 },
        notices: [],
        scheduledClasses: [] // Array holding daily_classes
    });

    useEffect(() => {
        if (user?.id) {
            fetch(`http://localhost:5000/api/teacher/${user.id}/dashboard`)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch dashboard data");
                    return res.json();
                })
                .then(data => {
                    setDashboardData(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Dashboard Fetch Error:", err);
                    setLoading(false);
                });
        }
    }, [user]);

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    Welcome <span className="text-indigo-600">{dashboardData.teacherName || user?.username || 'Professor'}</span>
                </h2>
                <p className="text-slate-500 mt-1">Here is your daily teaching overview and scheduled classes.</p>
            </header>

            {loading ? (
                <div className="flex flex-col justify-center items-center h-64 opacity-50">
                    <Activity size={48} className="text-indigo-600 animate-pulse mb-4" />
                    <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Dashboard...</p>
                </div>
            ) : (
                <div className="animate-in fade-in duration-500">
                    
                    {/* --- TOP ROW: Stats & Quick Actions --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <StatsWidget 
                            title="ASSIGNED SUBJECTS" 
                            value={dashboardData.stats.totalSubjects} 
                            icon={<BookOpen size={24} />} 
                        />
                        <StatsWidget 
                            title="TOTAL STUDENTS" 
                            value={dashboardData.stats.totalStudents} 
                            icon={<Users size={24} />} 
                        />
                        
                        <div className="bg-white rounded-[24px] border border-slate-200 p-5 flex flex-col justify-center shadow-sm">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Quick Actions</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <Link to="/teacher/attendance" className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl p-2.5 flex flex-col items-center justify-center transition-colors text-center group" title="Mark Attendance">
                                    <CheckSquare size={18} className="group-hover:scale-110 transition-transform"/>
                                    <span className="text-[10px] font-bold mt-1.5">Attendance</span>
                                </Link>
                                <Link to="/teacher/marks" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-2xl p-2.5 flex flex-col items-center justify-center transition-colors text-center group" title="Enter Grades">
                                    <FileText size={18} className="group-hover:scale-110 transition-transform"/>
                                    <span className="text-[10px] font-bold mt-1.5">Mark Grades</span>
                                </Link>
                                <Link to="/teacher/notices" className="bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-2xl p-2.5 flex flex-col items-center justify-center transition-colors text-center group" title="Broadcast Notice">
                                    <Megaphone size={18} className="group-hover:scale-110 transition-transform"/>
                                    <span className="text-[10px] font-bold mt-1.5">Send Notice</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* --- LEFT COLUMN: Big Scheduled Classes Panel --- */}
                        <div className="lg:col-span-2">
                            <div className="flex justify-between items-end px-1 mb-4">
                                <div>
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Today's Timetable</h3>
                                    <p className="text-xs font-bold text-slate-800 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-indigo-100">
                                    {dashboardData.scheduledClasses.length} Sessions
                                </span>
                            </div>
                            
                            <div className="bg-white border border-slate-200 rounded-[28px] shadow-sm overflow-hidden">
                                {dashboardData.scheduledClasses.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {dashboardData.scheduledClasses.map((cls, idx) => (
                                            <div key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors group">
                                                <div className="flex items-center gap-5">
                                                    
                                                    {/* Upgraded Time Block */}
                                                    <div className="w-16 h-16 bg-white text-indigo-600 rounded-2xl flex flex-col items-center justify-center font-black border border-slate-200 group-hover:border-indigo-200 shadow-sm transition-colors shrink-0">
                                                        <span className="text-sm">{cls.start_time.split(' ')[0]}</span>
                                                        <span className="text-[10px] text-slate-400 group-hover:text-indigo-400">{cls.start_time.split(' ')[1]}</span>
                                                    </div>

                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-lg">
                                                            {cls.subject_name} <span className="text-sm text-slate-400 font-medium">({cls.subject_code})</span>
                                                        </h4>
                                                        
                                                        {/* Location and Course Details */}
                                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                            <div className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                                                <MapPin size={12} className="text-indigo-500"/> Room {cls.room_number}
                                                            </div>
                                                            <div className="text-xs font-medium text-slate-500">
                                                                {cls.course_name} • Sem {cls.semester} • Ends at {cls.end_time}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <Link 
                                                    to={`/teacher/attendance?subject=${cls.subject_id}`} 
                                                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all shadow-sm shrink-0 active:scale-95"
                                                >
                                                    <CheckSquare size={18} /> Mark Attendance
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 bg-white flex flex-col items-center justify-center">
                                        <Clock size={48} className="text-slate-200 mb-4" />
                                        <h3 className="text-slate-600 font-black text-lg mb-1">Schedule Clear</h3>
                                        <p className="text-slate-400 font-bold text-sm">You have no classes scheduled for today.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- RIGHT COLUMN: Announcements --- */}
                        <div className="lg:col-span-1">
                            <div className="flex justify-between items-end px-1 mb-4">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Recent Updates</h3>
                                <Link to="/teacher/notices" className="text-xs font-bold text-indigo-600 hover:underline">Inbox</Link>
                            </div>
                            
                            <div className="bg-white border border-slate-200 rounded-[28px] shadow-sm overflow-hidden p-2">
                                {dashboardData.notices.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {dashboardData.notices.map(notice => (
                                            <div key={notice.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-4 group hover:bg-indigo-50 transition-colors">
                                                <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                                                    notice.priority === 'High' 
                                                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' 
                                                    : 'bg-indigo-400'
                                                }`}></div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-indigo-900 transition-colors line-clamp-2">
                                                        {notice.title}
                                                    </h4>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <Bell size={10} className="text-slate-400" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{notice.date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400 font-bold text-sm">
                                        No recent updates.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;