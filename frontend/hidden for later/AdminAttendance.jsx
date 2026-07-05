import React, { useState } from 'react';

const AdminAttendance = () => {
    // Default to today's date (YYYY-MM-DD format for input compatibility)
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [courseFilter, setCourseFilter] = useState('All');

    // Dummy data simulating aggregated attendance per daily_class
    const classRecords = [
        { id: 1, time: "09:00 AM - 10:00 AM", subject: "Database Management", course: "BCA (Sem 3)", teacher: "Dr. Arvind Sharma", total_students: 60, present: 52, absent: 5, late: 3 },
        { id: 2, time: "10:30 AM - 11:30 AM", subject: "Data Structures", course: "BCA (Sem 3)", teacher: "Prof. Meera Reddy", total_students: 60, present: 45, absent: 15, late: 0 },
        { id: 3, time: "09:00 AM - 11:00 AM", subject: "Business Ethics", course: "MBA (Sem 1)", teacher: "Dr. Rakesh Singh", total_students: 45, present: 42, absent: 3, late: 0 },
        { id: 4, time: "12:00 PM - 02:00 PM", subject: "DBMS Lab", course: "BCA (Sem 3)", teacher: "Dr. Arvind Sharma", total_students: 60, present: 58, absent: 2, late: 0 }
    ];

    // Filter logic
    const filteredRecords = classRecords.filter(record => {
        if (courseFilter === 'All') return true;
        return record.course.includes(courseFilter);
    });

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Campus Attendance</h2>
                    <p className="text-slate-500 mt-1">Monitor daily class logs and faculty reporting.</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                        Generate Defaulter List
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                        Export Report
                    </button>
                </div>
            </header>

            {/* Top Macro Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Attendance Today</p>
                        <h3 className="text-3xl font-bold text-emerald-600">84.5%</h3>
                    </div>
                    <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-2xl">📈</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Classes Held Today</p>
                        <h3 className="text-3xl font-bold text-blue-600">24</h3>
                    </div>
                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-2xl">🏫</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Critical Defaulters (&lt;75%)</p>
                        <h3 className="text-3xl font-bold text-red-600">142</h3>
                    </div>
                    <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-2xl">⚠️</div>
                </div>
            </div>

            {/* Main Data Table Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                
                {/* Filters */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50 items-center">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Date:</label>
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="py-2 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700 bg-white shadow-sm"
                        />
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Course:</label>
                        <select 
                            value={courseFilter}
                            onChange={(e) => setCourseFilter(e.target.value)}
                            className="py-2 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700 bg-white shadow-sm cursor-pointer min-w-37.5"
                        >
                            <option value="All">All Courses</option>
                            <option value="BCA">BCA</option>
                            <option value="BBA">BBA</option>
                            <option value="MBA">MBA</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="p-4 font-bold">Time & Subject</th>
                                <th className="p-4 font-bold">Course / Batch</th>
                                <th className="p-4 font-bold">Faculty</th>
                                <th className="p-4 font-bold text-center">Present</th>
                                <th className="p-4 font-bold text-center">Absent</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">No classes found for this date and filter.</td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => {
                                    // Calculate percentage for a mini visual indicator
                                    const percent = Math.round((record.present / record.total_students) * 100);
                                    
                                    return (
                                        <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{record.subject}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{record.time}</div>
                                            </td>
                                            <td className="p-4 font-medium text-slate-700">{record.course}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                                                        {record.teacher.charAt(0)}
                                                    </div>
                                                    <span className="text-slate-600">{record.teacher}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-emerald-600">{record.present}</span>
                                                    <div className="w-16 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div className={`h-full rounded-full ${percent < 50 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${percent}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center font-bold text-red-500">{record.absent + record.late}</td>
                                            <td className="p-4 text-right">
                                                <button className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wider">View Roster</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminAttendance;
