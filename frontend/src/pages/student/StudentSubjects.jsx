import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuth from '../../hooks/useAuth';

const StudentSubject = () => {
    const { user } = useAuth();
    const [subjectsData, setSubjectsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedSemester, setSelectedSemester] = useState(1);

    useEffect(() => {
        if (user?.id) {
            const fetchSubjects = async () => {
                try {
                    setLoading(true);
                    setSubjectsData(null); 
                    
                    const response = await axios.get(`http://localhost:5000/api/student/${user.id}/subjects?semester=${selectedSemester}`);
                    setSubjectsData(response.data);
                    setLoading(false);
                } catch (err) {
                    console.error("Error fetching subjects:", err);
                    setLoading(false);
                }
            };
            fetchSubjects();
        }
    }, [user, selectedSemester]);

    const subjects = subjectsData?.subjects || [];
    const totalCredits = subjectsData?.total_credits || 0;
    const semesters = subjectsData?.available_semesters || [1, 2, 3, 4];

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold uppercase animate-pulse">Loading curriculum...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">My Subjects</h2>
                        <p className="text-slate-500 mt-1">Academic breakdown for Semester {selectedSemester}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Semester:</label>
                        <select 
                            value={selectedSemester} 
                            onChange={(e) => setSelectedSemester(Number(e.target.value))}
                            className="bg-white border border-slate-200 text-slate-900 text-sm rounded-xl p-2.5 font-medium shadow-sm outline-none cursor-pointer"
                        >
                            {semesters.map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>
                </header>

                <div className="flex flex-wrap gap-4 mb-8">
                    <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg">📚</div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Subjects</p>
                            <p className="text-xl font-bold text-slate-900">{subjects.length}</p>
                        </div>
                    </div>
                    <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-lg">⭐</div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Credits</p>
                            <p className="text-xl font-bold text-slate-900">{totalCredits}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map((subject) => (
                        <div key={subject.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col overflow-hidden group">
                            
                            <div className="p-6 border-b border-slate-100 relative overflow-hidden">
                                <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-wider">
                                            {subject.code}
                                        </span>
                                        {/* Removed the 'type' badge as it's not in your DB */}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                                        {subject.name}
                                    </h3>
                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                                        {subject.credits} Credits
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 grow bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm shrink-0">
                                        {subject.teacher_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Instructor</p>
                                        <p className="text-sm font-bold text-slate-800">{subject.teacher_name}</p>
                                    </div>
                                </div>
                            </div>

                            {/* <div className="p-4 border-t border-slate-100 bg-white">
                                <button className="w-full py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                                    View Syllabus
                                </button>
                            </div> */}
                        </div>
                    ))}
                </div>

                {subjects.length === 0 && (
                    <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[32px]">
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No subjects listed in the database for this semester.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentSubject;