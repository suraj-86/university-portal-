import React, { useState, useEffect } from 'react';
import { Book, Save, FileText, History, ArrowLeft, UploadCloud, Eye, Edit3 } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import useAuth from '../../hooks/useAuth';

const TeacherMarks = () => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState('entry'); 

    const [myClasses, setMyClasses] = useState([]);
    const [selectedSemester, setSelectedSemester] = useState('All');
    const [selectedClass, setSelectedClass] = useState('');
    const [assessmentType, setAssessmentType] = useState('Assignment');
    const [maxScore, setMaxScore] = useState(10); 
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [roster, setRoster] = useState([]);

    const [ledgerSemester, setLedgerSemester] = useState('All'); 
    const [ledgerFilter, setLedgerFilter] = useState('All');
    const [pastAssessments, setPastAssessments] = useState([]);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedLedgerRecord, setSelectedLedgerRecord] = useState(null);
    const [viewOnlyRoster, setViewOnlyRoster] = useState([]);

    useEffect(() => {
        if (user?.id) {
            api.get(`/teacher/${user.id}/assigned-subjects`)
                .then(res => setMyClasses(res.data))
                .catch(err => console.error(err));
            fetchLedger();
        }
    }, [user]);

    const fetchLedger = () => {
        if (user?.id) {
            api.get(`/teacher/${user.id}/marks-ledger`)
                .then(res => setPastAssessments(res.data))
                .catch(err => console.error(err));
        }
    };

    const handleSemesterChange = (e) => {
        setSelectedSemester(e.target.value);
        setSelectedClass(''); 
        setIsSheetOpen(false);
    };

    const handleClassChange = (e) => {
        setSelectedClass(e.target.value);
        setIsSheetOpen(false); 
    };

    const handleAssessmentChange = (e) => {
        const type = e.target.value;
        setAssessmentType(type);
        if (type === 'Assignment' || type === 'Sessional 1' || type === 'Sessional 2') {
            setMaxScore(10);
        } else if (type === 'End Sem') {
            setMaxScore(70);
        }
        setIsSheetOpen(false); 
    };

    const handleOpenSheet = async () => {
        if (!selectedClass) return alert("Please select a Target Batch / Subject first!");
        
        try {
            const rosterRes = await api.get(`/subjects/${selectedClass}/students`);
            const rosterData = rosterRes.data;
            
            if(rosterData.length === 0) return alert("No students enrolled in this course yet!");

            const marksRes = await api.get(`/marks/details?subject_id=${selectedClass}&exam_type=${assessmentType}`);
            const marksData = marksRes.data;

            const mergedRoster = rosterData.map(student => {
                const uniqueId = student.student_id || student.id;
                const rollNo = student.roll || student.enrollment;
                const existingMark = marksData.find(m => (m.student_id || m.id) === uniqueId);
                
                return {
                    ...student,
                    id: uniqueId,
                    enrollment: rollNo,  
                    score: existingMark ? existingMark.score : ''
                };
            });

            if (marksData.length > 0 && marksData[0].max_score) {
                setMaxScore(marksData[0].max_score); 
            }

            setRoster(mergedRoster);
            setIsSheetOpen(true);
        } catch (error) {
            alert("Network Error while opening sheet.");
        }
    };

    const handleScoreChange = (studentId, value) => {
        const numValue = value === '' ? '' : Number(value);
        if (numValue > maxScore) return; 
        setRoster(roster.map(student => 
            student.id === studentId ? { ...student, score: numValue } : student
        ));
    };

    const calculateGrade = (score, max) => {
        if (score === '' || score === null || score === undefined) return '-';
        const percent = (score / max) * 100;
        if (percent >= 90) return 'A+';
        if (percent >= 80) return 'A';
        if (percent >= 70) return 'B';
        if (percent >= 60) return 'C';
        if (percent >= 40) return 'D';
        return 'F';
    };

    const handleSaveMarks = async () => {
        try {
            await api.post('/marks', {
                subject_id: selectedClass,
                exam_type: assessmentType,
                max_score: maxScore,
                marks: roster,
                uploaded_by_user_id: user.id
            });
            alert("Success! Marks have been securely saved to the database.");
            setIsSheetOpen(false);
            setRoster([]);
            fetchLedger(); 
            setViewMode('ledger'); 
        } catch (error) {
            alert("Failed to publish marks to database.");
        }
    };

    const handleViewRecord = async (record) => {
        try {
            const res = await api.get(`/marks/details?subject_id=${record.classId}&exam_type=${record.type}`);
            setViewOnlyRoster(res.data);
            setSelectedLedgerRecord(record);
            setIsViewModalOpen(true);
        } catch (error) {
            alert("Failed to load records.");
        }
    };

    const handleEditRecord = (record) => {
        setSelectedSemester(record.semester ? record.semester.toString() : 'All');
        setSelectedClass(record.classId);
        setAssessmentType(record.type);
        setMaxScore(record.max);
        setViewMode('entry');
        setTimeout(() => handleOpenSheet(), 100);
    };

    const rosterColumns = [
        { header: "Roll", accessor: "enrollment", cell: (row) => <span className="font-bold text-slate-500">{row.enrollment}</span> },
        { 
            header: "Student Name", 
            accessor: "name",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-900">{row.name}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">{row.enrollment}</div>
                </div>
            )
        },
        { 
            header: "Score Entry", 
            accessor: "score_action", 
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <input 
                        type="number"
                        value={row.score ?? ''}
                        onChange={(e) => handleScoreChange(row.id, e.target.value)}
                        placeholder="-"
                        className="w-24 p-2 text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 bg-white shadow-sm transition-all"
                    />
                    <span className="text-slate-400 font-bold text-sm">/ {maxScore}</span>
                </div>
            )
        },
        { 
            header: "Grade", 
            accessor: "grade",
            cell: (row) => {
                const grade = calculateGrade(row.score, maxScore);
                return (
                    <span className={`text-xl font-bold ${grade === 'F' ? 'text-rose-500' : grade !== '-' ? 'text-emerald-500' : 'text-slate-300'}`}>
                        {grade}
                    </span>
                );
            }
        }
    ];

    const viewOnlyColumns = [
        { header: "Roll", accessor: "enrollment", cell: (row) => <span className="font-bold text-slate-500">{row.enrollment}</span> },
        { header: "Student Name", accessor: "name", cell: (row) => <span className="font-bold text-slate-900">{row.name}</span> },
        { header: "Score", accessor: "score", cell: (row) => <span className="font-bold text-indigo-600">{row.score} / {selectedLedgerRecord?.max}</span> },
        { header: "Grade", accessor: "grade", cell: (row) => <span className="font-black text-slate-700">{calculateGrade(row.score, selectedLedgerRecord?.max)}</span> }
    ];

    const ledgerColumns = [
        { 
            header: "Date & Type", 
            accessor: "type",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-900">{row.type}</div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">{row.date}</div>
                </div>
            )
        },
        { 
            header: "Subject & Batch", 
            accessor: "subject",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-800">{row.subject}</div>
                    <div className="text-xs font-medium text-indigo-600 mt-0.5">{row.course} • Sem {row.semester}</div>
                </div>
            )
        },
        { 
            header: "Class Average", 
            accessor: "avg",
            cell: (row) => {
                const avgPercent = Math.round((row.avg / row.max) * 100);
                return (
                    <div className="flex flex-col items-start w-32">
                        <div className="font-bold text-slate-900">
                            {row.avg} <span className="text-slate-400 text-xs">/ {row.max}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div className={`h-full rounded-full ${avgPercent >= 75 ? 'bg-emerald-500' : avgPercent >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${avgPercent}%` }}></div>
                        </div>
                    </div>
                );
            }
        },
        { header: "Status", accessor: "status" },
        { 
            header: "Actions", 
            accessor: "id",
            cell: (row) => (
                <div className="flex justify-end gap-3">
                    <button onClick={() => handleViewRecord(row)} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-colors">
                        <Eye size={14}/> View
                    </button>
                    <button onClick={() => handleEditRecord(row)} className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-colors">
                        <Edit3 size={14}/> Edit
                    </button>
                </div>
            )
        }
    ];

    const filteredClasses = selectedSemester === 'All' 
        ? myClasses 
        : myClasses.filter(cls => cls.semester.toString() === selectedSemester);

    const filteredLedger = pastAssessments.filter(item => {
        const matchesSemester = ledgerSemester === 'All' || item.semester?.toString() === ledgerSemester;
        const matchesSubject = ledgerFilter === 'All' || item.subject.includes(ledgerFilter);
        return matchesSemester && matchesSubject;
    });

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        {viewMode === 'entry' ? 'Marks Entry' : 'Gradebook Ledger'}
                    </h2>
                    <p className="text-slate-500 mt-1">
                        {viewMode === 'entry' 
                            ? 'Evaluate students and enter marks for your assigned subjects.' 
                            : 'Review and export past assessment history.'}
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {viewMode === 'entry' ? (
                        <>
                            <button onClick={() => setViewMode('ledger')} className="bg-white border border-slate-200 text-slate-600 font-bold py-2.5 px-5 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-sm flex items-center gap-2">
                                <History size={18} /> View Gradebook Ledger
                            </button>
                            <button 
                                onClick={handleSaveMarks} 
                                disabled={!isSheetOpen}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-5 rounded-2xl shadow-sm transition-all text-sm flex items-center gap-2"
                            >
                                <UploadCloud size={18} /> Save Marks
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setViewMode('entry')} className="bg-white border border-slate-200 text-slate-600 font-bold py-2.5 px-5 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-sm flex items-center gap-2">
                            <ArrowLeft size={18} /> Back to Marks Entry
                        </button>
                    )}
                </div>
            </header>

            {viewMode === 'entry' && (
                <div className="animate-in fade-in duration-300">
                    <Card className="mb-8">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">1</div>
                            <h3 className="font-bold text-slate-800">Assessment Setup</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Semester</label>
                                <select 
                                    value={selectedSemester} 
                                    onChange={handleSemesterChange}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 font-medium text-slate-700"
                                >
                                    <option value="All">All Semesters</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                        <option key={sem} value={sem.toString()}>Semester {sem}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Target Batch / Subject</label>
                                <select 
                                    value={selectedClass} 
                                    onChange={handleClassChange}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 font-medium text-slate-700"
                                >
                                    <option value="" disabled>-- Choose a class --</option>
                                    {filteredClasses.map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.subject_name} (Sem {cls.semester})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Assessment Type</label>
                                <select 
                                    value={assessmentType} 
                                    onChange={handleAssessmentChange}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 font-medium text-slate-700"
                                >
                                    <option value="Assignment">Assignment</option>
                                    <option value="Sessional 1">Sessional 1</option>
                                    <option value="Sessional 2">Sessional 2</option>
                                    <option value="End Sem">End Semester Exam</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Max Score</label>
                                <input 
                                    type="number"
                                    value={maxScore}
                                    disabled
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-100 font-bold text-slate-500 cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <button 
                                onClick={handleOpenSheet} 
                                className="w-full bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-100 transition-colors text-sm flex items-center justify-center gap-2 border border-indigo-200"
                            >
                                <FileText size={16} /> Open Grading Sheet
                            </button>
                        </div>
                    </Card>

                    {isSheetOpen ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">2</div>
                                    <h3 className="font-bold text-slate-800">Student Roster ({roster.length} Students)</h3>
                                </div>
                                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100">
                                    {assessmentType} (Max: {maxScore})
                                </span>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                <Table columns={rosterColumns} data={roster} pageSize={100} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white border border-dashed border-slate-300 rounded-[28px] text-slate-400">
                            <FileText size={48} className="mb-4 text-slate-200" />
                            <p className="font-bold">Configure the assessment above and open the sheet to begin grading.</p>
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'ledger' && (
                <div className="animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-start">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semester:</label>
                                <select 
                                    value={ledgerSemester} 
                                    onChange={(e) => setLedgerSemester(e.target.value)}
                                    className="py-2 px-3 border border-slate-200 rounded-lg text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="All">All Semesters</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                        <option key={sem} value={sem.toString()}>Semester {sem}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject:</label>
                                <select 
                                    value={ledgerFilter} 
                                    onChange={(e) => setLedgerFilter(e.target.value)}
                                    className="py-2 px-3 border border-slate-200 rounded-lg text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="All">All Subjects</option>
                                    {myClasses.map(cls => (
                                        <option key={cls.id} value={cls.subject_name}>{cls.subject_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {filteredLedger.length > 0 ? (
                            <Table columns={ledgerColumns} data={filteredLedger} pageSize={10} />
                        ) : (
                            <div className="text-center py-10 text-slate-400 font-bold">No marks published yet.</div>
                        )}
                    </div>
                </div>
            )}

            {isViewModalOpen && (
                <Modal 
                    isOpen={isViewModalOpen} 
                    onClose={() => setIsViewModalOpen(false)} 
                    title={`${selectedLedgerRecord?.type} Grades`}
                    subtitle={`${selectedLedgerRecord?.subject} • ${selectedLedgerRecord?.course}`}
                >
                    <div className="mt-2 max-h-[500px] overflow-y-auto">
                        <Table columns={viewOnlyColumns} data={viewOnlyRoster} pageSize={100} />
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TeacherMarks;