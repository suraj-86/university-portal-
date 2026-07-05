import React, { useState, useEffect, useMemo } from 'react';
import { Award, FileText, Download, TrendingUp, CheckCircle, GraduationCap } from 'lucide-react';
import StatsWidget from '../../components/StatsWidget';
import Table from '../../components/Table';

const StudentResults = () => {
    // --- STATE LOGIC ---
    const [allResults, setAllResults] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState(1);
    const [loading, setLoading] = useState(true);

    // --- FETCH DATA FROM BACKEND ---
    useEffect(() => {
        const fetchResults = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const userId = user ? user.id : 1; // Fallback to 1 for testing

                const response = await fetch(`http://localhost:5000/api/student/${userId}/results`);
                const data = await response.json();

                if (response.ok) {
                    setAllResults(data);
                    // Automatically select the highest semester they have marks for
                    const availableSemesters = Object.keys(data).map(Number);
                    if (availableSemesters.length > 0) {
                        setSelectedSemester(Math.max(...availableSemesters));
                    }
                } else {
                    console.error("Error fetching results:", data.error);
                }
            } catch (error) {
                console.error("Network error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, []);

    // Get the results for the currently clicked tab
    const currentResults = allResults && allResults[selectedSemester] ? allResults[selectedSemester] : [];

    // --- AUTO-CALCULATIONS ---
    const stats = useMemo(() => {
        if (!currentResults.length) return { avgPercent: "0.0", gpa: "0.0", totalCredits: 0 };
        
        let totalAchieved = 0;
        let totalPossible = 0;

        currentResults.forEach(curr => {
            totalAchieved += curr.total;
            totalPossible += curr.totalMax;
        });

        const avgPercent = totalPossible > 0 ? ((totalAchieved / totalPossible) * 100).toFixed(1) : "0.0";
        const gpa = (avgPercent / 10).toFixed(1);
        
        return { avgPercent, gpa, totalCredits: currentResults.reduce((acc, curr) => acc + curr.credits, 0) };
    }, [currentResults]);

    // --- TABLE COLUMNS ---
    const columns = [
        { 
            header: "Subject Detail", 
            accessor: "subject", 
            cell: (row) => (
                <div className="flex items-center gap-3 py-1">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                        {row.subject.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900">{row.subject}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{row.credits} Credits</p>
                    </div>
                </div>
            )
        },
        { 
            header: "Mid-Term", 
            accessor: "midTerm", 
            cell: (row) => (
                <span className="font-semibold text-slate-600">
                    {row.midTerm}<span className="text-slate-400 text-xs">/{row.midTermMax || 0}</span>
                </span>
            ) 
        },
        { 
            header: "Final Exam", 
            accessor: "final", 
            cell: (row) => (
                <span className="font-semibold text-slate-600">
                    {row.final}<span className="text-slate-400 text-xs">/{row.finalMax || 0}</span>
                </span>
            ) 
        },
        { 
            header: "Total Score", 
            accessor: "total", 
            cell: (row) => {
                const percentage = row.totalMax > 0 ? (row.total / row.totalMax) * 100 : 0;
                return (
                    <div className="flex flex-col gap-1.5">
                        <span className="font-black text-slate-900">
                            {row.total}<span className="text-slate-400 text-xs">/{row.totalMax || 0}</span>
                        </span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                )
            }
        },
        { 
            header: "Grade", 
            accessor: "grade",
            cell: (row) => (
                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border tracking-wider uppercase ${
                    row.grade.includes('A') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                    row.grade.includes('B') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                    {row.grade}
                </span>
            )
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-sm">Loading Results...</p>
            </div>
        );
    }

    // Get array of available semesters from our fetched data
    const availableSemesters = allResults ? Object.keys(allResults).map(Number).sort() : [];

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            {/* Header Area */}
            <header className="mb-10 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                <div className="space-y-4">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Academic Results</h2>
                        <p className="text-slate-500 font-medium mt-1">Detailed performance tracking across semesters.</p>
                    </div>
                    
                    {/* Dynamic Semester Selection Tabs */}
                    {availableSemesters.length > 0 ? (
                        <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm w-fit overflow-x-auto">
                            {availableSemesters.map((sem) => (
                                <button 
                                    key={sem}
                                    onClick={() => setSelectedSemester(sem)}
                                    className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                                        selectedSemester === sem ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    Semester {sem}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <button 
                    onClick={() => alert(`Downloading Marksheet for Sem ${selectedSemester}...`)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 text-sm w-full xl:w-auto"
                >
                    <Download size={18} /> Download Semester {selectedSemester} PDF
                </button>
            </header>

            {availableSemesters.length === 0 ? (
                <div className="bg-white p-10 rounded-[32px] border border-slate-200 text-center shadow-sm">
                    <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-black text-slate-700">No Results Found</h3>
                    <p className="text-sm text-slate-500 mt-1">There are no academic marks uploaded for your account yet.</p>
                </div>
            ) : (
                <>
                    {/* Performance Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <StatsWidget title="SEMESTER GPA" value={stats.gpa} trend="Current Standings" icon={<GraduationCap size={24} />} />
                        <StatsWidget title="PERCENTAGE" value={`${stats.avgPercent}%`} trend="Overall weighted" icon={<TrendingUp size={24} />} />
                        <StatsWidget title="TOTAL CREDITS" value={stats.totalCredits} trend="For this semester" icon={<CheckCircle size={24} />} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Scorecard Table */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Scorecard Ledger</h3>
                                <div className="h-px bg-slate-200 flex-grow mx-6 hidden md:block"></div>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">Sem {selectedSemester} Active</span>
                            </div>
                            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm p-2">
                                <Table columns={columns} data={currentResults} pageSize={10} />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default StudentResults;