import React, { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, Bell, ArrowUpRight, UserPlus, ShieldPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatsWidget from '../../components/StatsWidget';
import Card from '../../components/Card';
import Table from '../../components/Table';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState({
        stats: { totalStudents: 0, totalTeachers: 0, totalCourses: 0, totalNotices: 0 },
        activities: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await api.get('/admin/dashboard-stats');
                setDashboardData(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Failed to load dashboard stats:", error);
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const activityColumns = [
        { 
            header: "User / Role", 
            accessor: "user",
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase">
                        {row.user?.charAt(0)}
                    </div>
                    <div>
                        <span className="font-bold text-slate-900 block leading-none">{row.user}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{row.target}</span>
                    </div>
                </div>
            )
        },
        { header: "Action", accessor: "action" },
        { header: "Date Joined", accessor: "time" },
        { header: "Status", accessor: "status" }
    ];

    if (loading) return <div className="p-10 text-slate-400 font-bold animate-pulse">Synchronizing Campus Data...</div>;

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Overview</h2>
                <p className="text-slate-500 mt-1 font-medium">Monitoring {dashboardData.stats.totalStudents} students across {dashboardData.stats.totalCourses} programs.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatsWidget title="TOTAL STUDENTS" value={dashboardData.stats.totalStudents} trend="Live enrollment count" icon={<Users size={24} />} />
                <StatsWidget title="FACULTY MEMBERS" value={dashboardData.stats.totalTeachers} trend="Verified teaching staff" icon={<GraduationCap size={24} />} />
                <StatsWidget title="ACTIVE COURSES" value={dashboardData.stats.totalCourses} trend="Approved degree programs" icon={<BookOpen size={24} />} />
                <StatsWidget title="CAMPUS NOTICES" value={dashboardData.stats.totalNotices} trend="Active announcements" icon={<Bell size={24} />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Recent User Registrations</h3>
                    <Table columns={activityColumns} data={dashboardData.activities} pageSize={5} />
                </div>

                <div className="space-y-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Quick Management</h3>
                    
                    <Card title="STUDENT DIRECTORY" subtitle="Manage enrollments and profiles." icon={<Users size={20} className="text-blue-600" />}>
                        <button onClick={() => navigate('/admin/students')} className="w-full flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-2xl group hover:bg-blue-600 transition-all">
                            <div className="flex items-center gap-3">
                                <UserPlus size={18} className="text-blue-600 group-hover:text-white" />
                                <span className="text-sm font-bold text-blue-900 group-hover:text-white">Manage Students</span>
                            </div>
                            <ArrowUpRight size={16} className="text-blue-400 group-hover:text-white" />
                        </button>
                    </Card>

                    <Card title="FACULTY RECORDS" subtitle="Update staff data and access." icon={<GraduationCap size={20} className="text-indigo-600" />}>
                        <button onClick={() => navigate('/admin/teachers')} className="w-full flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl group hover:bg-indigo-600 transition-all">
                            <div className="flex items-center gap-3">
                                <ShieldPlus size={18} className="text-indigo-600 group-hover:text-white" />
                                <span className="text-sm font-bold text-indigo-900 group-hover:text-white">Manage Faculty</span>
                            </div>
                            <ArrowUpRight size={16} className="text-indigo-400 group-hover:text-white" />
                        </button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;