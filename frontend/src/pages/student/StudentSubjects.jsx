import React, { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Users } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

const StudentSubjects = () => {
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
                    
                    const response = await api.get(`/student/${user.id}/subjects?semester=${selectedSemester}`);
                    setSubjectsData(response.data);
                } catch (err) {
                    console.error("Error fetching subjects:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchSubjects();
        }
    }, [user, selectedSemester]);

    const subjects = subjectsData?.subjects || [];
    const totalCredits = subjectsData?.total_credits || 0;
    const semesters = subjectsData?.available_semesters || [1, 2, 3, 4];

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold uppercase animate-pulse bg-slate-50 dark:bg-slate-950">Loading curriculum...</div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">My Subjects</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Academic breakdown for Semester {selectedSemester}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Semester:</label>
                        <select 
                            value={selectedSemester} 
                            onChange={(e) => setSelectedSemester(Number(e.target.value))}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-2.5 font-medium shadow-sm outline-none cursor-pointer"
                        >
                            {semesters.map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>
                </header>

                <div className="flex flex-wrap gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-lg border border-blue-100 dark:border-blue-900">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Subjects</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{subjects.length}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-lg border border-indigo-100 dark:border-indigo-900">
                            <GraduationCap size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Credits</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalCredits}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map((subject) => (
                        <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all flex flex-col overflow-hidden group">
                            
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-50 dark:bg-blue-950/30 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm">
                                            {subject.code}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {subject.name}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">
                                        {subject.credits} Credits
                                    </p>
                                </div>
                            </div>
                            
                            <div className="p-6 grow bg-white dark:bg-slate-900">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-black text-sm shrink-0 border border-slate-200 dark:border-slate-700">
                                        {subject.teacher_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Instructor</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{subject.teacher_name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {subjects.length === 0 && (
                    <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] bg-white dark:bg-slate-900">
                        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-xs tracking-widest">No subjects listed in the database for this semester.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentSubjects;