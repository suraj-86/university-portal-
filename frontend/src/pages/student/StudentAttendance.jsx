import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, AlertCircle, Clock } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const StudentAttendance = () => {
    const { user } = useAuth();
    const [selectedSemester, setSelectedSemester] = useState(1);
    const [selectedSubject, setSelectedSubject] = useState('All');
    
    // --- BACKEND DATA STATES ---
    const [logs, setLogs] = useState([]);
    const [subjectsFromDb, setSubjectsFromDb] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            setLoading(true);
            const params = `?semester=${selectedSemester}`;
            
            Promise.all([
                fetch(`http://localhost:5000/api/student/${user.id}/attendance-logs${params}`).then(res => res.json()),
                fetch(`http://localhost:5000/api/student/${user.id}/subjects-list${params}`).then(res => res.json())
            ])
            .then(([logsData, subsData]) => {
                setLogs(Array.isArray(logsData) ? logsData : []);
                setSubjectsFromDb(Array.isArray(subsData) ? subsData : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
        }
    }, [user, selectedSemester]);

    // --- DYNAMIC DATA PROCESSING (Replacing your hardcoded database) ---
    const attendanceData = useMemo(() => {
        const subjects = subjectsFromDb.map(sub => {
            const name = sub.subject_name;
            const subLogs = logs.filter(l => l.subject_name === name);
            const attended = subLogs.filter(l => l.status === 'Present' || l.status === 'Late').length;
            const total = subLogs.length;
            return {
                name,
                attended,
                total,
                percentage: total > 0 ? Math.round((attended / total) * 100) : 0
            };
        });

        const totalAttended = logs.filter(l => l.status === 'Present' || l.status === 'Late').length;
        const totalClasses = logs.length;

        return {
            overall: totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0,
            attended: totalAttended,
            total: totalClasses,
            required_percentage: 75,
            subjects,
            recent_logs: logs.map(l => ({
                date: new Date(l.class_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                subject: l.subject_name,
                time: "Class", 
                status: l.status
            }))
        };
    }, [logs, subjectsFromDb]);

    // --- YOUR ORIGINAL FILTER LOGIC ---
    const displayedSubjects = selectedSubject === 'All' 
        ? attendanceData.subjects 
        : attendanceData.subjects.filter(sub => sub.name === selectedSubject);
        
    const displayedLogs = selectedSubject === 'All'
        ? attendanceData.recent_logs
        : attendanceData.recent_logs.filter(log => log.subject === selectedSubject);

    const calcAttended = selectedSubject === 'All' ? attendanceData.attended : displayedSubjects[0]?.attended || 0;
    const calcTotal = selectedSubject === 'All' ? attendanceData.total : displayedSubjects[0]?.total || 0;
    const calcOverall = selectedSubject === 'All' ? attendanceData.overall : displayedSubjects[0]?.percentage || 0;

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Attendance Details</h2>
                    <p className="text-slate-500 mt-1">Track your academic presence and subject-wise breakdown.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 xl:border-none pb-6 xl:pb-0">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Semester:</label>
                        <select 
                            value={selectedSemester} 
                            onChange={(e) => { setSelectedSemester(Number(e.target.value)); setSelectedSubject('All'); }}
                            className="bg-white border border-slate-200 text-slate-900 text-sm rounded-xl p-2.5 font-medium outline-none cursor-pointer"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Subject:</label>
                        <select 
                            value={selectedSubject} 
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-900 text-sm rounded-xl p-2.5 font-medium outline-none cursor-pointer max-w-[200px] truncate"
                        >
                            <option value="All">All Subjects</option>
                            {attendanceData.subjects.map(sub => (
                                <option key={sub.name} value={sub.name}>{sub.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="py-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Syncing Records...</div>
            ) : (
                <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800">{selectedSubject === 'All' ? 'Overall Attendance' : 'Subject Attendance'}</h3>
                                <p className="text-xs text-slate-500 mt-1">Semester {selectedSemester} Standing</p>
                            </div>
                            <div className="relative w-20 h-20 shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path 
                                        className={`${calcOverall >= attendanceData.required_percentage ? 'text-blue-600' : 'text-red-500'} transition-all duration-1000 ease-out`} 
                                        strokeDasharray={`${calcOverall}, 100`} 
                                        strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-800">{calcOverall}%</div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attended</p>
                            <h3 className="text-4xl font-black text-emerald-500">{calcAttended}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Held</p>
                            <h3 className="text-4xl font-black text-blue-600">{calcTotal}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-50 pb-4">Subject Breakdown</h3>
                            <div className="flex flex-col gap-6">
                                {displayedSubjects.map((sub, idx) => {
                                    const isSafe = sub.percentage >= attendanceData.required_percentage;
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <span className="text-sm font-bold text-slate-800">{sub.name}</span>
                                                    {(!isSafe && sub.total > 0) && <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md"><AlertCircle size={10}/> Short</span>}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-bold text-slate-500">{sub.attended} / {sub.total}</span>
                                                    <span className={`ml-2 text-sm font-black ${isSafe ? 'text-slate-900' : 'text-red-600'}`}>{sub.percentage}%</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isSafe ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${sub.percentage}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {displayedSubjects.length === 0 && <p className="text-slate-400 text-center py-4 font-bold">No subjects added for this semester.</p>}
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 opacity-10"><CalendarIcon size={100} /></div>
                                <h3 className="text-sm font-bold mb-2 uppercase tracking-wider text-blue-800">Scheduled</h3>
                                <div className="text-4xl font-black text-blue-600 mb-2">{calcTotal}</div>
                                <div className="mt-4 space-y-2 pt-4 border-t border-blue-100/50">
                                    <div className="flex justify-between text-sm font-medium text-blue-800"><span>Present:</span><span className="font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-md">{calcAttended}</span></div>
                                    <div className="flex justify-between text-sm font-medium text-blue-800"><span>Missed:</span><span className="font-bold text-red-500 bg-white px-2 py-0.5 rounded-md">{calcTotal - calcAttended}</span></div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Recent Logs</h3>
                                <div className="flex flex-col gap-3">
                                    {displayedLogs.map((log, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{log.subject}</p>
                                                <p className="text-xs text-slate-400 font-medium mt-0.5">{log.date}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${log.status === 'Present' ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>{log.status}</span>
                                        </div>
                                    ))}
                                    {displayedLogs.length === 0 && <p className="text-slate-400 font-bold text-xs text-center py-4">No recent activity.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentAttendance;