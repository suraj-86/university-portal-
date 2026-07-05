import React, { useState } from 'react';

const AdminMarks = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [courseFilter, setCourseFilter] = useState('All');
    const [semesterFilter, setSemesterFilter] = useState('All');

    // Dummy data simulating a massive JOIN across marks, subjects, students, and courses
    const marksRecords = [
        { id: 1, student_name: "Suraj Kumar", enrollment: "ENR202601", course: "BCA", semester: 3, subject: "Database Management (DBMS)", exam_type: "End Sem", score: 52, max_score: 60, status: "Graded" },
        { id: 2, student_name: "Suraj Kumar", enrollment: "ENR202601", course: "BCA", semester: 3, subject: "Data Structures", exam_type: "Sessional 1", score: 18, max_score: 20, status: "Graded" },
        { id: 3, student_name: "Priya Sharma", enrollment: "ENR202602", course: "BBA", semester: 1, subject: "Business Economics", exam_type: "End Sem", score: 45, max_score: 60, status: "Graded" },
        { id: 4, student_name: "Amit Patel", enrollment: "ENR202603", course: "MBA", semester: 1, subject: "Organizational Behavior", exam_type: "Assignment", score: null, max_score: 20, status: "Pending" },
        { id: 5, student_name: "Rahul Verma", enrollment: "ENR202604", course: "BCA", semester: 3, subject: "Data Structures", exam_type: "End Sem", score: 12, max_score: 60, status: "Graded" }
    ];

    // Filter Logic
    const filteredRecords = marksRecords.filter(record => {
        const matchesSearch = record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              record.enrollment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              record.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCourse = courseFilter === 'All' || record.course === courseFilter;
        const matchesSemester = semesterFilter === 'All' || record.semester.toString() === semesterFilter;
        
        return matchesSearch && matchesCourse && matchesSemester;
    });

    // Helper function to calculate a dynamic Grade letter
    const calculateGrade = (score, max) => {
        if (score === null) return '-';
        const percent = (score / max) * 100;
        if (percent >= 90) return 'A+';
        if (percent >= 80) return 'A';
        if (percent >= 70) return 'B';
        if (percent >= 60) return 'C';
        if (percent >= 40) return 'D';
        return 'F';
    };

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">University Gradebook</h2>
                    <p className="text-slate-500 mt-1">Manage assessment scores, monitor grading progress, and publish results.</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                        <span>📥</span> Import Grades (CSV)
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                        <span>📢</span> Publish Results
                    </button>
                </div>
            </header>

            {/* Top Macro Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Assessments</p>
                    <h3 className="text-2xl font-bold text-slate-900">4,250</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Grades Submitted</p>
                    <h3 className="text-2xl font-bold text-emerald-600">3,800</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Submissions</p>
                    <h3 className="text-2xl font-bold text-orange-500">450</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Overall Pass Rate</p>
                    <h3 className="text-2xl font-bold text-indigo-600">88.5%</h3>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                
                {/* Advanced Filter Bar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
                    <div className="relative w-full sm:w-1/3">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">🔍</span>
                        <input 
                            type="text" 
                            placeholder="Search Student or Subject..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course:</label>
                            <select 
                                value={courseFilter}
                                onChange={(e) => setCourseFilter(e.target.value)}
                                className="py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white font-medium cursor-pointer"
                            >
                                <option value="All">All</option>
                                <option value="BCA">BCA</option>
                                <option value="BBA">BBA</option>
                                <option value="MBA">MBA</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semester:</label>
                            <select 
                                value={semesterFilter}
                                onChange={(e) => setSemesterFilter(e.target.value)}
                                className="py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white font-medium cursor-pointer"
                            >
                                <option value="All">All</option>
                                <option value="1">Sem 1</option>
                                <option value="3">Sem 3</option>
                                <option value="5">Sem 5</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Body */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="p-4 font-bold">Student Identity</th>
                                <th className="p-4 font-bold">Subject & Assessment</th>
                                <th className="p-4 font-bold text-center">Score</th>
                                <th className="p-4 font-bold text-center">Grade</th>
                                <th className="p-4 font-bold text-center">Status</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">No records found matching your filters.</td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => {
                                    const grade = calculateGrade(record.score, record.max_score);
                                    
                                    return (
                                        <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{record.student_name}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{record.enrollment} • {record.course} (S{record.semester})</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{record.subject}</div>
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                                    ${record.exam_type === 'End Sem' ? 'bg-purple-100 text-purple-700' : 
                                                      record.exam_type === 'Assignment' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {record.exam_type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {record.score === null ? (
                                                    <span className="text-slate-400 font-medium italic">Pending</span>
                                                ) : (
                                                    <div>
                                                        <span className="font-bold text-slate-900 text-base">{record.score}</span>
                                                        <span className="text-slate-400 text-xs ml-1">/ {record.max_score}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {record.score !== null && (
                                                    <span className={`text-xl font-bold ${grade === 'F' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {grade}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                                                    ${record.status === 'Graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {record.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wider mr-3">Edit</button>
                                                <button className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-wider">History</button>
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

export default AdminMarks;
