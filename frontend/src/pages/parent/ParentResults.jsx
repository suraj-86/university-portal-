import React, { useState, useEffect } from 'react';
import { Award, Users } from 'lucide-react';
import api from '../../services/api'; // Added import
import useAuth from '../../hooks/useAuth';
import Table from '../../components/Table';

const ParentResults = () => {
    const { user } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWardId, setSelectedWardId] = useState('');
    const [allWards, setAllWards] = useState([]);

    useEffect(() => {
        const fetchResults = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                const url = selectedWardId 
                    ? `/parent/${user.id}/wards-overview?student_id=${selectedWardId}`
                    : `/parent/${user.id}/wards-overview`;
                
                const summaryRes = await api.get(url); // Changed to api.get
                const summaryData = summaryRes.data;
                
                if (summaryData.childProfile) {
                    setAllWards(summaryData.allWards || []);
                    if (!selectedWardId) setSelectedWardId(summaryData.childProfile.student_id);
                    
                    const childUserId = summaryData.childProfile.user_id;
                    const res = await api.get(`/student/${childUserId}/results`); // Changed to api.get
                    
                    const flattened = Object.keys(res.data).flatMap(sem => 
                        res.data[sem].map(r => ({ ...r, semester: sem }))
                    );
                    setResults(flattened);
                }
            } catch (error) {
                console.error("Error fetching results:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [user, selectedWardId]);

    const columns = [
        { header: "Subject", accessor: "subject", cell: (row) => <span className="font-bold text-slate-900">{row.subject} <span className="text-xs text-slate-400 block">Sem {row.semester}</span></span> },
        { header: "Mid-Term", accessor: "midTerm", cell: (row) => <span className="font-semibold text-slate-600">{row.midTerm}<span className="text-slate-400 text-xs">/{row.midTermMax}</span></span> },
        { header: "Final Exam", accessor: "final", cell: (row) => <span className="font-semibold text-slate-600">{row.final}<span className="text-slate-400 text-xs">/{row.finalMax}</span></span> },
        { header: "Total Score", accessor: "score", cell: (row) => <span className="font-bold text-slate-700">{row.total} <span className="text-slate-400 text-xs">/ {row.totalMax}</span></span> },
        { header: "Grade", accessor: "grade", cell: (row) => <span className={`px-3 py-1 rounded text-[10px] font-black uppercase ${row.grade.includes('A') ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{row.grade}</span> }
    ];

    if (loading && results.length === 0) return <div className="p-10 text-slate-500 font-bold animate-pulse uppercase tracking-widest text-sm">Loading Results...</div>;

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Academic Results</h2>
                    <p className="text-slate-500 mt-1 font-medium">Track your ward's academic performance.</p>
                </div>

                {allWards.length > 1 && (
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                        <Users size={18} className="text-indigo-600" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Ward</p>
                            <select 
                                value={selectedWardId} 
                                onChange={(e) => setSelectedWardId(e.target.value)}
                                className="text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                            >
                                {allWards.map(ward => (
                                    <option key={ward.student_id} value={ward.student_id}>
                                        {ward.full_name} ({ward.course_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><Award size={18} className="text-indigo-600"/> Subject Scorecard</h3>
                </div>
                <Table columns={columns} data={results} pageSize={10} />
            </div>
        </div>
    );
};

export default ParentResults;