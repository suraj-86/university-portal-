import React, { useState, useEffect } from 'react';
import { Award, BookOpen, Download, FileText, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

const StudentResults = () => {
    const { user } = useAuth();
    const userId = user?.id || 1;
    
    const [resultsData, setResultsData] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedSemester, setSelectedSemester] = useState('1');

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await api.get(`/student/${userId}/results`);
                setResultsData(response.data || {});
                const availableSemesters = Object.keys(response.data || {});
                if (availableSemesters.length > 0 && !availableSemesters.includes(selectedSemester)) {
                    setSelectedSemester(availableSemesters[0]);
                }
            } catch (error) {
                console.error("Error fetching results:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [userId]);

    const semesters = Object.keys(resultsData).sort((a, b) => Number(a) - Number(b));
    const currentSemSubjects = resultsData[selectedSemester] || [];

    const totalScoreEarned = currentSemSubjects.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const totalMaxPossible = currentSemSubjects.reduce((acc, curr) => acc + (Number(curr.totalMax) || 100), 0);
    const semPercentage = totalMaxPossible > 0 ? ((totalScoreEarned / totalMaxPossible) * 100).toFixed(1) : '0.0';

    const calculateCGPA = () => {
        if (semesters.length === 0) return '0.00';
        let totalPercentSum = 0;
        let count = 0;
        semesters.forEach(sem => {
            const subs = resultsData[sem];
            if (subs && subs.length > 0) {
                const earned = subs.reduce((a, c) => a + (Number(c.total) || 0), 0);
                const max = subs.reduce((a, c) => a + (Number(c.totalMax) || 100), 0);
                if (max > 0) {
                    totalPercentSum += (earned / max) * 100;
                    count++;
                }
            }
        });
        if (count === 0) return '0.00';
        const avgPercent = totalPercentSum / count;
        return (avgPercent / 9.5).toFixed(2);
    };

    if (loading) {
        return <div className="p-10 text-center font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 min-h-screen">Loading academic results...</div>;
    }

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Academic Results</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Review your semester marksheets, internal assessments, and CGPA.</p>
                </div>
                
                {semesters.length > 0 && (
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Semester:</span>
                        <select 
                            value={selectedSemester} 
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
                        >
                            {semesters.map(sem => (
                                <option key={sem} value={sem} className="dark:bg-slate-900">
                                    Semester {sem}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                        <Award size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Cumulative CGPA</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">{calculateCGPA()} <span className="text-xs font-bold text-slate-400">/ 10.0</span></h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                        <BookOpen size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Semester Percentage</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">{semPercentage}%</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Subjects Evaluated</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">{currentSemSubjects.length}</h3>
                    </div>
                    <div className="mt-4">
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            Status: Regular / Passed
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">Semester {selectedSemester} Scorecard</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Detailed breakdown of internal and end-semester scores</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 font-bold">Subject Name</th>
                                <th className="p-4 font-bold text-center">Assignment</th>
                                <th className="p-4 font-bold text-center">Sessional 1</th>
                                <th className="p-4 font-bold text-center">Sessional 2</th>
                                <th className="p-4 font-bold text-center">End Sem</th>
                                <th className="p-4 font-bold text-center">Total</th>
                                <th className="p-4 font-bold text-right">Grade</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                            {currentSemSubjects.map((sub, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                                        {sub.subject}
                                    </td>
                                    <td className="p-4 text-center font-medium text-slate-600 dark:text-slate-300">{sub.assignment ?? '-'}</td>
                                    <td className="p-4 text-center font-medium text-slate-600 dark:text-slate-300">{sub.sessional1 ?? '-'}</td>
                                    <td className="p-4 text-center font-medium text-slate-600 dark:text-slate-300">{sub.sessional2 ?? '-'}</td>
                                    <td className="p-4 text-center font-medium text-slate-600 dark:text-slate-300">{sub.endSem ?? '-'}</td>
                                    <td className="p-4 text-center font-bold text-slate-900 dark:text-slate-100">{sub.total} <span className="text-xs text-slate-400">/ {sub.totalMax}</span></td>
                                    <td className="p-4 text-right">
                                        <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider 
                                            ${sub.grade?.includes('A') ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' : 
                                              sub.grade === 'F' ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900'}`}>
                                            {sub.grade || 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {currentSemSubjects.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-400 dark:text-slate-500 italic">No scorecards found for Semester {selectedSemester}.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentResults;