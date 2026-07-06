import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, Calendar, Users, History, Eye, ArrowLeft, Filter, FileText } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Input from '../../components/FormInput';
import Card from '../../components/Card';
import useAuth from '../../hooks/useAuth';

const TeacherAttendance = () => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState('mark');
    const [searchParams] = useSearchParams();
    const urlSubject = searchParams.get('subject');
    const urlDate = searchParams.get('date');

    const [mySubjects, setMySubjects] = useState([]);
    const [roster, setRoster] = useState([]);
    const [selectedSession, setSelectedSession] = useState(urlSubject || '');
    const [scheduleDate, setScheduleDate] = useState(urlDate || new Date().toISOString().split('T')[0]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const [historyFilters, setHistoryFilters] = useState({ semester: 'All', subject: 'All', date: '' });
    const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [historyDetailRoster, setHistoryDetailRoster] = useState([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            if (!user?.id) return;
            try {
                const response = await api.get(`/teacher/${user.id}/assigned-subjects`);
                setMySubjects(response.data);
                if (response.data.length > 0 && !selectedSession) {
                    setSelectedSession(response.data[0].id);
                }
            } catch (error) {
                console.error("Error fetching subjects:", error);
            }
        };
        fetchSubjects();
    }, [user, selectedSession]);

    useEffect(() => {
        if (viewMode === 'history' && user?.id) {
            api.get(`/teacher/${user.id}/attendance-history`)
                .then(res => setAttendanceHistory(res.data))
                .catch(err => console.error("Error loading history:", err));
        }
    }, [viewMode, user]);

    const handleOpenSheet = async () => {
        if (!selectedSession) return alert("Please select a session first.");
        try {
            const response = await api.get(`/subjects/${selectedSession}/students`);
            if (!Array.isArray(response.data)) {
                alert("Data error: Backend did not return a valid student list.");
                return;
            }
            if(response.data.length === 0) {
                alert("No students found enrolled in this subject's course.");
                return;
            }
            setRoster(response.data);
            setIsSheetOpen(true);
        } catch (error) {
            alert(`Backend Error: Could not load students. ${error.response?.data?.error || ""}`);
        }
    };

    const handleSave = async () => {
        if (!isSheetOpen || roster.length === 0) {
            alert("Please open a sheet and mark attendance first!");
            return;
        }
        try {
            await api.post('/attendance', {
                subject_id: selectedSession,
                date: scheduleDate,
                students: roster,
                marked_by: user.id
            });
            alert(`Success! Attendance for ${scheduleDate} has been saved.`);
            setIsSheetOpen(false);
            setRoster([]);
        } catch (error) {
            alert("Failed to save attendance.");
        }
    };

    const toggleAttendance = (id) => {
        setRoster(roster.map(student => 
            student.student_id === id ? { ...student, status: student.status === "Present" ? "Absent" : "Present" } : student
        ));
    };

    const markAllPresent = () => setRoster(roster.map(s => ({ ...s, status: "Present" })));

    const handleViewSheet = async (record) => {
        try {
            const response = await api.get(`/attendance/class/${record.id}`);
            setHistoryDetailRoster(response.data);
            setSelectedHistoryRecord(record);
            setViewMode('history_detail');
        } catch (err) {
            alert("Failed to load the specific attendance sheet.");
        }
    };

    const filteredHistory = attendanceHistory.filter(record => {
        const matchSem = historyFilters.semester === 'All' || record.semester === historyFilters.semester;
        const matchSub = historyFilters.subject === 'All' || record.subject === historyFilters.subject;
        const matchDate = !historyFilters.date || record.date === historyFilters.date;
        return matchSem && matchSub && matchDate;
    });

    const markingColumns = [
        { header: "Enrollment No.", accessor: "roll" },
        { header: "Student Name", accessor: "name", cell: (row) => <span className="font-bold text-slate-900">{row.name}</span> },
        { 
            header: "Attendance Status", 
            accessor: "attendance_action",
            cell: (row) => (
                <button 
                    type="button"
                    onClick={() => toggleAttendance(row.student_id)}
                    className="flex items-center gap-3 focus:outline-none group"
                >
                    <div className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 ease-in-out ${
                        row.status === "Present" ? "bg-emerald-500" : "bg-slate-300 group-hover:bg-slate-400"
                    }`}>
                        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ease-in-out ${
                            row.status === "Present" ? "translate-x-7" : "translate-x-1"
                        }`} />
                    </div>
                    <span className={`text-xs font-black uppercase tracking-wider w-16 text-left ${
                        row.status === "Present" ? "text-emerald-600" : "text-slate-500"
                    }`}>
                        {row.status}
                    </span>
                </button>
            )
        }
    ];

    const historyColumns = [
        { header: "Date", accessor: "date", cell: (row) => <span className="font-bold text-slate-800">{row.date}</span> },
        { header: "Class & Semester", accessor: "class", cell: (row) => `${row.class} (${row.semester})` },
        { header: "Subject", accessor: "subject", cell: (row) => <span className="font-bold text-indigo-600">{row.subject}</span> },
        { header: "Present", accessor: "present", cell: (row) => <span className="text-emerald-600 font-bold">{row.present}</span> },
        { header: "Absent", accessor: "absent", cell: (row) => <span className="text-rose-600 font-bold">{row.absent}</span> },
        {
            header: "Actions",
            accessor: "id",
            cell: (row) => (
                <button onClick={() => handleViewSheet(row)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors">
                    <Eye size={14} /> View Sheet
                </button>
            )
        }
    ];

    const historyDetailColumns = [
        { header: "Enrollment No.", accessor: "roll" },
        { header: "Student Name", accessor: "name", cell: (row) => <span className="font-bold text-slate-900">{row.name}</span> },
        { 
            header: "Recorded Status", 
            accessor: "status",
            cell: (row) => (
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${
                    row.status === "Present" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                }`}>
                    {row.status}
                </span>
            )
        }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        {viewMode === 'mark' ? 'Daily Attendance' : viewMode === 'history' ? 'Attendance History' : 'Past Record Details'}
                    </h2>
                    <p className="text-slate-500 mt-1">
                        {viewMode === 'mark' ? 'Select a scheduled session to mark presence.' : viewMode === 'history' ? 'Filter and review past sheets.' : `Viewing locked record for ${selectedHistoryRecord?.subject}.`}
                    </p>
                </div>
                
                <div className="flex gap-3">
                    {viewMode === 'mark' ? (
                        <>
                            <button onClick={() => setViewMode('history')} className="bg-white border border-slate-200 text-slate-600 font-bold py-2.5 px-5 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-sm flex items-center gap-2">
                                <History size={18} /> View Previous Records
                            </button>
                            {isSheetOpen && (
                                <button 
                                    onClick={handleSave} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95 text-sm"
                                >
                                    <Save size={18} /> Save Attendance
                                </button>
                            )}
                        </>
                    ) : (
                        <button onClick={() => setViewMode(viewMode === 'history_detail' ? 'history' : 'mark')} className="bg-white border border-slate-200 text-slate-600 font-bold py-2.5 px-5 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-sm flex items-center gap-2">
                            <ArrowLeft size={18} /> {viewMode === 'history_detail' ? 'Back to Records' : 'Back to Marking'}
                        </button>
                    )}
                </div>
            </header>

            {viewMode === 'mark' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="lg:col-span-1 p-6 bg-white border-indigo-100 h-fit">
                        <div className="space-y-6">
                            <Input label="Session Date" type="date" value={scheduleDate} onChange={(e) => {setScheduleDate(e.target.value); setIsSheetOpen(false);}} icon={<Calendar size={18} />} />
                            
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Scheduled Session</label>
                                <select 
                                    value={selectedSession} 
                                    onChange={(e) => {setSelectedSession(e.target.value); setIsSheetOpen(false);}}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                >
                                    {mySubjects.map(sub => (
                                        <option key={sub.id} value={sub.id}>
                                            {sub.subject_code} - {sub.course_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <hr className="border-slate-100" />
                            <button onClick={handleOpenSheet} className="w-full bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-100 transition-colors text-sm flex items-center justify-center gap-2 border border-indigo-200">
                                <FileText size={16} /> Open Attendance Sheet
                            </button>
                        </div>
                    </Card>

                    <div className="lg:col-span-3">
                        {isSheetOpen ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">Student Roster</h3>
                                    <button onClick={markAllPresent} className="bg-slate-100 text-slate-600 font-bold py-2 px-4 rounded-xl hover:bg-slate-200 transition-colors text-xs flex items-center gap-2">
                                        <Users size={14} /> Mark All Present
                                    </button>
                                </div>
                                <div className="max-h-[600px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm custom-scrollbar">
                                    <Table columns={markingColumns} data={roster} pageSize={100} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white border border-dashed border-slate-300 rounded-[28px] text-slate-400">
                                <FileText size={48} className="mb-4 text-slate-200" />
                                <p className="font-bold">Select a date and session, then open the sheet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'history' && (
                <div className="space-y-6">
                    <Card className="p-4 bg-white border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Filter size={12}/> Semester</label>
                                <select value={historyFilters.semester} onChange={(e) => setHistoryFilters({...historyFilters, semester: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none">
                                    <option value="All">All Semesters</option>
                                    <option value="Sem 1">Semester 1</option>
                                    <option value="Sem 2">Semester 2</option>
                                    <option value="Sem 3">Semester 3</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                                <select value={historyFilters.subject} onChange={(e) => setHistoryFilters({...historyFilters, subject: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none">
                                    <option value="All">All Subjects</option>
                                    {mySubjects.map(sub => (
                                        <option key={sub.id} value={sub.subject_name}>{sub.subject_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specific Date</label>
                                <input type="date" value={historyFilters.date} onChange={(e) => setHistoryFilters({...historyFilters, date: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 outline-none" />
                            </div>
                        </div>
                    </Card>
                    <Table columns={historyColumns} data={filteredHistory} pageSize={10} />
                </div>
            )}

            {viewMode === 'history_detail' && selectedHistoryRecord && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-[28px] shadow-sm">
                        <div className="flex gap-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class / Subject</p>
                                <p className="text-lg font-bold text-indigo-600">{selectedHistoryRecord.class} {selectedHistoryRecord.semester} - {selectedHistoryRecord.subject}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Recorded</p>
                                <p className="text-lg font-bold text-slate-800">{selectedHistoryRecord.date}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold">Present: {selectedHistoryRecord.present}</span>
                            <span className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold">Absent: {selectedHistoryRecord.absent}</span>
                        </div>
                    </div>
                    <Table columns={historyDetailColumns} data={historyDetailRoster} pageSize={100} />
                </div>
            )}
        </div>
    );
};

export default TeacherAttendance;