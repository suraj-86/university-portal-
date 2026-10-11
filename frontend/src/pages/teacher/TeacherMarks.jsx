import React, { useState, useEffect } from 'react';
import { Book, Save, FileText, History, ArrowLeft, UploadCloud, Eye, Edit3 } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import CsvImportModal from '../../components/CsvImportModal';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const PASS_PERCENT = 40;
const DEFAULT_LABELS = { 'Assignment': 'Assignment', 'Sessional 1': 'Sessional 1', 'Sessional 2': 'Sessional 2', 'End Sem': 'End Semester Exam' };
const DEFAULT_MAX = { 'Assignment': 10, 'Sessional 1': 10, 'Sessional 2': 10, 'End Sem': 70 };

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
    const [originalScores, setOriginalScores] = useState({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [summary, setSummary] = useState({ entered: [], changes: [], created: [] });
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyRows, setHistoryRows] = useState([]);
    const [historyTitle, setHistoryTitle] = useState('');
    const [importOpen, setImportOpen] = useState(false);
    const [assessmentName, setAssessmentName] = useState('');
    const [customAssessments, setCustomAssessments] = useState([]);
    const [originalMax, setOriginalMax] = useState(null);
    const [newAssessmentOpen, setNewAssessmentOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newMax, setNewMax] = useState(10);
    const [settings, setSettings] = useState({});
    const [editOpen, setEditOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editMax, setEditMax] = useState(10);
    const [editReason, setEditReason] = useState('');
    const [editBusy, setEditBusy] = useState(false);

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

    const loadCustomAssessments = (classId) => {
        if (!classId) { setCustomAssessments([]); return; }
        api.get(`/assessments?subject_id=${classId}`)
            .then(res => setCustomAssessments((res.data || []).map(r => ({ name: r.name, max: Number(r.max_score) }))))
            .catch(() => setCustomAssessments([]));
    };

    const loadSettings = (classId) => {
        if (!classId) { setSettings({}); return; }
        api.get(`/assessment-settings?subject_id=${classId}`)
            .then(res => {
                const map = {};
                (res.data || []).forEach(r => { map[r.exam_type] = { display_name: r.display_name, max_score: r.max_score }; });
                setSettings(map);
                if (assessmentType !== 'Other') setMaxScore(map[assessmentType]?.max_score ?? DEFAULT_MAX[assessmentType]);
            })
            .catch(() => setSettings({}));
    };

    useEffect(() => { loadCustomAssessments(selectedClass); loadSettings(selectedClass); }, [selectedClass]);

    const standardLabel = (type) => settings[type]?.display_name || DEFAULT_LABELS[type] || type;
    const standardMax = (type) => settings[type]?.max_score ?? DEFAULT_MAX[type];

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
        const value = e.target.value;
        if (value === '__new__') {
            setNewName('');
            setNewMax(10);
            setNewAssessmentOpen(true);
            return;
        }
        if (value.startsWith('custom:')) {
            const name = value.slice(7);
            const found = customAssessments.find(c => c.name === name);
            setAssessmentType('Other');
            setAssessmentName(name);
            setMaxScore(found ? found.max : maxScore);
            setIsSheetOpen(false);
            return;
        }
        setAssessmentType(value);
        setAssessmentName('');
        setMaxScore(standardMax(value));
        setIsSheetOpen(false); 
    };

    const createAssessment = (e) => {
        e.preventDefault();
        const name = newName.trim().replace(/\s+/g, ' ');
        const max = Number(newMax);
        if (!name) return toast.error("Please enter a name, e.g. Viva 1.");
        if (name.length > 60) return toast.error("Name is too long (max 60 characters).");
        if (!Number.isInteger(max) || max < 1 || max > 999) return toast.error("Maximum marks must be a whole number from 1 to 999.");
        const existing = customAssessments.find(c => c.name.toLowerCase() === name.toLowerCase());
        setAssessmentType('Other');
        setAssessmentName(existing ? existing.name : name);
        setMaxScore(existing ? existing.max : max);
        setIsSheetOpen(false);
        setNewAssessmentOpen(false);
        toast.success(existing ? "That assessment already exists, so it was selected." : "Assessment ready. Open the grading sheet to enter marks.");
    };

    const isSavedCustom = assessmentType === 'Other' && customAssessments.some(c => c.name === assessmentName);

    const openEdit = () => {
        setEditName(assessmentType === 'Other' ? assessmentName : (settings[assessmentType]?.display_name || ''));
        setEditMax(maxScore);
        setEditReason('');
        setEditOpen(true);
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        const max = Number(editMax);
        if (!Number.isInteger(max) || max < 1 || max > 999) return toast.error("Full marks must be a whole number from 1 to 999.");
        const name = editName.trim().replace(/\s+/g, ' ');
        if (assessmentType === 'Other' && !name) return toast.error("Please enter a name.");

        if (assessmentType === 'Other' && !isSavedCustom) {
            setAssessmentName(name);
            setMaxScore(max);
            setIsSheetOpen(false);
            setEditOpen(false);
            return;
        }

        setEditBusy(true);
        try {
            const res = await api.put('/assessments/edit', {
                subject_id: selectedClass,
                exam_type: assessmentType,
                assessment_name: assessmentType === 'Other' ? assessmentName : '',
                new_name: name,
                max_score: max,
                reason: editReason.trim()
            });
            toast.success(res.data?.marks_updated ? `Updated. Full marks changed for ${res.data.marks_updated} saved mark(s) and recorded in the history.` : "Assessment updated.");
            if (assessmentType === 'Other') setAssessmentName(res.data.name);
            setMaxScore(res.data.max_score);
            setIsSheetOpen(false);
            setRoster([]);
            setEditOpen(false);
            loadCustomAssessments(selectedClass);
            loadSettings(selectedClass);
            fetchLedger();
        } catch (error) {
            toast.error(error.response?.data?.error || "Could not update the assessment.");
        } finally {
            setEditBusy(false);
        }
    };

    const openSheet = async (classId, type, name = '') => {
        if (!classId) return toast.error("Please select a Target Batch / Subject first!"); 
        try {
            const rosterRes = await api.get(`/subjects/${classId}/students`);
            const rosterData = rosterRes.data; 
            if(rosterData.length === 0) return toast.error("No students enrolled in this course yet!");
            const marksRes = await api.get(`/marks/details?subject_id=${classId}&exam_type=${encodeURIComponent(type)}&assessment_name=${encodeURIComponent(name)}`);
            const marksData = marksRes.data;
            const mergedRoster = rosterData.map(student => {
                const uniqueId = student.student_id || student.id;
                const rollNo = student.roll || '';
                const existingMark = marksData.find(m => (m.student_id || m.id) === uniqueId);
                return {
                    ...student,
                    id: uniqueId,
                    roll_number: rollNo, 
                    score: existingMark ? existingMark.score : ''
                };
            });
            const originals = {};
            marksData.forEach(m => { originals[m.student_id || m.id] = Number(m.score); });
            setOriginalScores(originals);
            setOriginalMax(marksData.length > 0 ? Number(marksData[0].max_score) : null);
            if (marksData.length > 0 && marksData[0].max_score) {
                setMaxScore(marksData[0].max_score); 
            }
            setRoster(mergedRoster);
            setIsSheetOpen(true);
        } catch (error) {
            toast.error("Network Error while opening sheet.");
        }
    };

    const handleOpenSheet = () => openSheet(selectedClass, assessmentType, assessmentName);

    const handleScoreChange = (studentId, value) => {
        const numValue = value === '' ? '' : Number(value);
        if (numValue !== '') {
            if (!Number.isFinite(numValue)) return;
            if (numValue < 0 || numValue > maxScore) return;
            if (Math.round(numValue * 100) / 100 !== numValue) return;
        }
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

    const computeStats = (entered, max) => {
        const nums = entered.map(r => Number(r.score));
        const count = nums.length;
        const avg = count ? nums.reduce((x, y) => x + y, 0) / count : 0;
        const passed = nums.filter(n => (n / max) * 100 >= PASS_PERCENT).length;
        const grades = {};
        entered.forEach(r => { const g = calculateGrade(Number(r.score), max); grades[g] = (grades[g] || 0) + 1; });
        return {
            count, avg, avgPct: max ? (avg / max) * 100 : 0,
            highest: count ? Math.max(...nums) : 0, lowest: count ? Math.min(...nums) : 0,
            passed, failed: count - passed, passRate: count ? (passed / count) * 100 : 0, grades
        };
    };

    const requestSave = () => {
        const entered = roster.filter(r => r.score !== '' && r.score !== null && r.score !== undefined);
        if (entered.length === 0) return toast.error("Enter at least one score before saving.");
        const maxChanged = originalMax !== null && originalMax !== Number(maxScore);
        const changes = entered.filter(r => originalScores[r.id] !== undefined && (maxChanged || Number(r.score) !== originalScores[r.id]));
        const created = entered.filter(r => originalScores[r.id] === undefined);
        setSummary({
            entered, changes, created, maxChanged,
            notEntered: roster.length - entered.length,
            stats: computeStats(entered, Number(maxScore))
        });
        setReason('');
        setConfirmOpen(true);
    };

    const handleSaveMarks = async () => {
        if (summary.changes.length > 0 && reason.trim().length < 3) {
            return toast.error("Please give a reason for changing saved marks.");
        }
        setSaving(true);
        try {
            const res = await api.post('/marks', {
                subject_id: selectedClass,
                exam_type: assessmentType,
                assessment_name: assessmentType === 'Other' ? assessmentName : '',
                max_score: maxScore,
                marks: summary.entered.map(r => ({ id: r.id, score: Number(r.score) })),
                reason: reason.trim()
            });
            toast.success(res.data?.message || "Marks saved. Changes are recorded in the history.");
            setConfirmOpen(false);
            setIsSheetOpen(false);
            setRoster([]);
            fetchLedger(); 
            loadCustomAssessments(selectedClass);
            setViewMode('ledger'); 
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to publish marks to database.");
        } finally {
            setSaving(false);
        }
    };

    const openHistory = async (classId, type, name, label) => {
        try {
            const res = await api.get(`/marks/history?subject_id=${classId}&exam_type=${encodeURIComponent(type)}&assessment_name=${encodeURIComponent(name || '')}`);
            setHistoryRows(res.data);
            setHistoryTitle(label);
            setHistoryOpen(true);
        } catch (error) {
            toast.error("Failed to load the change history.");
        }
    };

    const csvMapRow = (o) => {
        if (!o.roll_number) return { error: 'roll_number is required' };
        const student = roster.find(r => String(r.roll_number || '').trim().toLowerCase() === o.roll_number.toLowerCase());
        if (!student) return { error: 'Roll number not in this class' };
        if (o.score === '') return { error: 'Score is empty' };
        const score = Number(o.score);
        if (!Number.isFinite(score)) return { error: 'Score is not a number' };
        if (score < 0 || score > maxScore) return { error: `Score must be 0 to ${maxScore}` };
        if (Math.round(score * 100) / 100 !== score) return { error: 'At most 2 decimal places' };
        return { value: { roll_number: o.roll_number, name: student.name, score, id: student.id } };
    };

    const applyCsv = async (rows) => {
        const ids = rows.map(r => r.id);
        if (new Set(ids).size !== ids.length) throw new Error('Some roll numbers appear more than once in the file.');
        const byId = new Map(rows.map(r => [r.id, r.score]));
        setRoster(current => current.map(st => (byId.has(st.id) ? { ...st, score: byId.get(st.id) } : st)));
    };

    const historyColumns = [
        { header: "When", accessor: "changed_at", cell: (row) => <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{new Date(row.changed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> },
        { header: "Student", accessor: "name", cell: (row) => <div><div className="font-bold text-slate-900 dark:text-slate-100">{row.name}</div><div className="text-xs text-slate-500 dark:text-slate-400">{row.roll || 'No roll no.'}</div></div> },
        { header: "Change", accessor: "new_score", cell: (row) => row.old_score === null
            ? <span className="font-bold text-emerald-600 dark:text-emerald-400">Entered {Number(row.new_score)} / {row.new_max}</span>
            : <span className="font-bold text-slate-800 dark:text-slate-200">{Number(row.old_score)} <span className="text-slate-400">→</span> {Number(row.new_score)} <span className="text-xs text-slate-400">/ {row.new_max}</span></span> },
        { header: "By", accessor: "changed_by", cell: (row) => <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{row.changed_by || 'Unknown'}</span> },
        { header: "Reason", accessor: "reason", cell: (row) => <span className="text-xs text-slate-500 dark:text-slate-400">{row.reason || '—'}</span> }
    ];

    const handleViewRecord = async (record) => {
        try {
            const res = await api.get(`/marks/details?subject_id=${record.classId}&exam_type=${encodeURIComponent(record.type)}&assessment_name=${encodeURIComponent(record.name || '')}`);
            setViewOnlyRoster(res.data);
            setSelectedLedgerRecord(record);
            setIsViewModalOpen(true);
        } catch (error) {
            toast.error("Failed to load records.");
        }
    };

    const handleEditRecord = (record) => {
        setSelectedSemester(record.semester ? record.semester.toString() : 'All');
        setSelectedClass(record.classId);
        setAssessmentType(record.type);
        setAssessmentName(record.name || '');
        setMaxScore(record.max);
        setViewMode('entry');
        openSheet(record.classId, record.type, record.name || '');
    };

    const assessmentLabel = assessmentType === 'Other' ? assessmentName : standardLabel(assessmentType);
    const rowLabel = (row) => row.name || row.display_name || DEFAULT_LABELS[row.type] || row.type;
    const customOptions = [...customAssessments];
    if (assessmentType === 'Other' && assessmentName && !customOptions.some(c => c.name.toLowerCase() === assessmentName.toLowerCase())) {
        customOptions.push({ name: assessmentName, max: maxScore });
    }
    const statCard = (label, value, tone, sub) => (
        <div key={label} className={`rounded-2xl p-3 text-center ${tone}`}>
            <p className="text-xl font-black leading-tight">{value}</p>
            {sub && <p className="text-[10px] font-bold opacity-70">{sub}</p>}
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-0.5">{label}</p>
        </div>
    );

    const rosterColumns = [
        { header: "Roll No.", accessor: "roll_number", cell: (row) => <span className="font-bold text-slate-500 dark:text-slate-400">{row.roll_number || 'Not Assigned'}</span> },
        { 
            header: "Student Name", 
            accessor: "name",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{row.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{row.roll_number || 'Not Assigned'}</div>
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
                        min="0"
                        max={maxScore}
                        step="any"
                        value={row.score ?? ''}
                        onChange={(e) => handleScoreChange(row.id, e.target.value)}
                        placeholder="-"
                        className="w-24 p-2 text-center border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 shadow-sm transition-all"
                    />
                    <span className="text-slate-400 dark:text-slate-500 font-bold text-sm">/ {maxScore}</span>
                </div>
            )
        },
        { 
            header: "Grade", 
            accessor: "grade",
            cell: (row) => {
                const grade = calculateGrade(row.score, maxScore);
                return (
                    <span className={`text-xl font-bold ${grade === 'F' ? 'text-rose-500 dark:text-rose-400' : grade !== '-' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`}>
                        {grade}
                    </span>
                );
            }
        }
    ];

    const viewOnlyColumns = [
        { header: "Roll No.", accessor: "roll_number", cell: (row) => <span className="font-bold text-slate-500 dark:text-slate-400">{row.roll_number || 'Not Assigned'}</span> },
        { header: "Student Name", accessor: "name", cell: (row) => <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span> },
        { header: "Score", accessor: "score", cell: (row) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{row.score} / {selectedLedgerRecord?.max}</span> },
        { header: "Grade", accessor: "grade", cell: (row) => <span className="font-black text-slate-700 dark:text-slate-300">{calculateGrade(row.score, selectedLedgerRecord?.max)}</span> }
    ];

    const ledgerColumns = [
        { 
            header: "Date & Type", 
            accessor: "type",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{rowLabel(row)}</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{row.date}</div>
                </div>
            )
        },
        { 
            header: "Subject & Batch", 
            accessor: "subject",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{row.subject}</div>
                    <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">{row.course} • Sem {row.semester}</div>
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
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                            {row.avg} <span className="text-slate-400 dark:text-slate-500 text-xs">/ {row.max}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-1.5 overflow-hidden">
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
                    <button onClick={() => handleViewRecord(row)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-colors">
                        <Eye size={14}/> View
                    </button>
                    <button onClick={() => openHistory(row.classId, row.type, row.name, `${row.subject} • ${rowLabel(row)}`)} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-colors">
                        <History size={14}/> History
                    </button>
                    <button onClick={() => handleEditRecord(row)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-colors">
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
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {viewMode === 'entry' ? 'Marks Entry' : 'Gradebook Ledger'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {viewMode === 'entry' 
                            ? 'Evaluate students and enter marks for your assigned subjects.' 
                            : 'Review and export past assessment history.'}
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {viewMode === 'entry' ? (
                        <>
                            <button onClick={() => setViewMode('ledger')} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold py-2.5 px-5 rounded-2xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm flex items-center gap-2">
                                <History size={18} /> View Gradebook Ledger
                            </button>
                            <button 
                                onClick={requestSave}
                                disabled={!isSheetOpen}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-5 rounded-2xl shadow-sm transition-all text-sm flex items-center gap-2"
                            >
                                <UploadCloud size={18} /> Save Marks
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setViewMode('entry')} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold py-2.5 px-5 rounded-2xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm flex items-center gap-2">
                            <ArrowLeft size={18} /> Back to Marks Entry
                        </button>
                    )}
                </div>
            </header>

            {viewMode === 'entry' && (
                <div className="animate-in fade-in duration-300">
                    <Card className="mb-8">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-50 dark:border-slate-800 pb-4">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">1</div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Assessment Setup</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Semester</label>
                                <select 
                                    value={selectedSemester}
                                    onChange={handleSemesterChange}
                                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200"
                                >
                                    <option value="All">All Semesters</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                        <option key={sem} value={sem.toString()}>Semester {sem}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Target Batch / Subject</label>
                                <select 
                                    value={selectedClass}
                                    onChange={handleClassChange}
                                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200"
                                >
                                    <option value="" disabled>-- Choose a class --</option>
                                    {filteredClasses.map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.subject_name} (Sem {cls.semester})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Assessment</label>
                                    {selectedClass && (
                                        <button type="button" onClick={openEdit} className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline">Edit name / marks</button>
                                    )}
                                </div>
                                <select 
                                    value={assessmentType === 'Other' ? `custom:${assessmentName}` : assessmentType}
                                    onChange={handleAssessmentChange}
                                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200"
                                >
                                    {['Assignment', 'Sessional 1', 'Sessional 2', 'End Sem'].map(t => (
                                        <option key={t} value={t}>{standardLabel(t)}</option>
                                    ))}
                                    {customOptions.length > 0 && (
                                        <optgroup label="Custom assessments">
                                            {customOptions.map(c => <option key={c.name} value={`custom:${c.name}`}>{c.name}</option>)}
                                        </optgroup>
                                    )}
                                    <option value="__new__">+ New custom assessment (e.g. Viva 1)...</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Max Score</label>
                                <input 
                                    type="number"
                                    value={maxScore}
                                    disabled
                                    title="Use 'Edit name / marks' to change the full marks"
                                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <button 
                                onClick={handleOpenSheet}
                                className="w-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold py-3 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors text-sm flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-900"
                            >
                                <FileText size={16} /> Open Grading Sheet
                            </button>
                        </div>
                    </Card>

                    {isSheetOpen ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">2</div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Student Roster ({roster.length} Students)</h3>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 justify-end">
                                    <button onClick={() => openHistory(selectedClass, assessmentType, assessmentType === 'Other' ? assessmentName : '', `${assessmentLabel} • change history`)} className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-md border border-amber-100 dark:border-amber-900 flex items-center gap-1">
                                        <History size={12} /> History
                                    </button>
                                    <button onClick={() => setImportOpen(true)} className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                        <UploadCloud size={12} /> Import CSV
                                    </button>
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-md border border-indigo-100 dark:border-indigo-900">
                                        {assessmentLabel} (Max: {maxScore})
                                    </span>
                                </div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                <Table columns={rosterColumns} data={roster} pageSize={100} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-[28px] text-slate-400 dark:text-slate-500">
                            <FileText size={48} className="mb-4 text-slate-200 dark:text-slate-700" />
                            <p className="font-bold">Configure the assessment above and open the sheet to begin grading.</p>
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'ledger' && (
                <div className="animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-4 items-center justify-start">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Semester:</label>
                                <select 
                                    value={ledgerSemester}
                                    onChange={(e) => setLedgerSemester(e.target.value)}
                                    className="py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="All">All Semesters</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                        <option key={sem} value={sem.toString()}>Semester {sem}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject:</label>
                                <select 
                                    value={ledgerFilter}
                                    onChange={(e) => setLedgerFilter(e.target.value)}
                                    className="py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
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
                            <div className="text-center py-10 text-slate-400 dark:text-slate-500 font-bold">No marks published yet.</div>
                        )}
                    </div>
                </div>
            )}

            {isViewModalOpen && (
                <Modal 
                    isOpen={isViewModalOpen} 
                    onClose={() => setIsViewModalOpen(false)}
                    title={`${selectedLedgerRecord ? rowLabel(selectedLedgerRecord) : ''} Grades`}
                    subtitle={`${selectedLedgerRecord?.subject} • ${selectedLedgerRecord?.course}`}
                >
                    <div className="mt-2 max-h-[500px] overflow-y-auto">
                        <Table columns={viewOnlyColumns} data={viewOnlyRoster} pageSize={100} />
                    </div>
                </Modal>
            )}

            <Modal isOpen={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} title="Confirm Marks">
                <div className="space-y-5">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 text-sm">
                        <p className="font-black text-slate-900 dark:text-slate-100">{myClasses.find(c => String(c.id) === String(selectedClass))?.subject_name}</p>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">{assessmentLabel} · Max {maxScore} · Pass mark {PASS_PERCENT}% ({Math.ceil(maxScore * PASS_PERCENT / 100)})</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {statCard('Students', roster.length, 'bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100')}
                        {statCard('Entered', summary.entered.length, 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400')}
                        {statCard('Absent / not entered', summary.notEntered, summary.notEntered > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500')}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {statCard('Average', (summary.stats?.avg ?? 0).toFixed(2), 'bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100', `${(summary.stats?.avgPct ?? 0).toFixed(1)}%`)}
                        {statCard('Highest', summary.stats?.highest ?? 0, 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400', `of ${maxScore}`)}
                        {statCard('Lowest', summary.stats?.lowest ?? 0, 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400', `of ${maxScore}`)}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {statCard('Passed', summary.stats?.passed ?? 0, 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400')}
                        {statCard('Failed', summary.stats?.failed ?? 0, (summary.stats?.failed ?? 0) > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500')}
                        {statCard('Pass rate', `${(summary.stats?.passRate ?? 0).toFixed(0)}%`, 'bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100')}
                    </div>

                    {summary.stats && Object.keys(summary.stats.grades).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {['A+', 'A', 'B', 'C', 'D', 'F'].filter(g => summary.stats.grades[g]).map(g => (
                                <span key={g} className={`text-xs font-black px-3 py-1 rounded-lg ${g === 'F' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                                    {g}: {summary.stats.grades[g]}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {statCard('New entries', summary.created.length, 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400')}
                        {statCard('Changed', summary.changes.length, 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400')}
                    </div>

                    {summary.changes.length > 0 && (
                        <div>
                            {summary.maxChanged && <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">The maximum score changed from {originalMax} to {maxScore} for marks that were already saved.</p>}
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Changes to saved marks</p>
                            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                {summary.changes.map(r => (
                                    <div key={r.id} className="flex justify-between px-3 py-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{r.name} <span className="text-xs font-medium text-slate-400">{r.roll_number}</span></span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{originalScores[r.id]} → {Number(r.score)}</span>
                                    </div>
                                ))}
                            </div>
                            <label className="block mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Reason for change *</label>
                            <textarea rows="2" maxLength="255" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Answer sheet re-evaluated"
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-200 outline-none resize-none" />
                            <p className="text-xs text-slate-400 mt-1">This is saved in the change history together with your name and the time.</p>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button type="button" disabled={saving} onClick={() => setConfirmOpen(false)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">Go back</button>
                        <button type="button" disabled={saving || (summary.changes.length > 0 && reason.trim().length < 3)} onClick={handleSaveMarks} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Saving...' : 'Confirm & Save'}</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={newAssessmentOpen} onClose={() => setNewAssessmentOpen(false)} title="New Custom Assessment">
                <form onSubmit={createAssessment} className="space-y-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Create your own assessment, for example two vivas of 5 marks each instead of an assignment. It counts towards the student's total.</p>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Name</label>
                        <input autoFocus value={newName} maxLength="60" onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Viva 1"
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Maximum marks</label>
                        <input type="number" min="1" max="999" value={newMax} onChange={(e) => setNewMax(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl">Use this assessment</button>
                </form>
            </Modal>

            <Modal isOpen={editOpen} onClose={() => !editBusy && setEditOpen(false)} title="Edit Assessment">
                <form onSubmit={submitEdit} className="space-y-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Changes apply to this subject only.{assessmentType !== 'Other' && ' Leave the name empty to use the default name.'}
                    </p>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Name</label>
                        <input autoFocus value={editName} maxLength="60" onChange={(e) => setEditName(e.target.value)} placeholder={assessmentType === 'Other' ? 'e.g. Viva 1' : DEFAULT_LABELS[assessmentType]}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Full marks</label>
                        <input type="number" min="1" max="999" value={editMax} onFocus={(e) => e.target.select()} onChange={(e) => setEditMax(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    {(assessmentType !== 'Other' || isSavedCustom) && (
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Reason (needed if marks are already saved and full marks change)</label>
                            <textarea rows="2" maxLength="255" value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="e.g. Exam pattern revised"
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-200 outline-none resize-none" />
                            <p className="text-xs text-slate-400 mt-1">Changing full marks updates the saved marks of every student and is recorded in the change history.</p>
                        </div>
                    )}
                    <button type="submit" disabled={editBusy} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl disabled:opacity-50">{editBusy ? 'Saving...' : 'Save changes'}</button>
                </form>
            </Modal>

            <CsvImportModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                title="Import Scores (CSV)"
                headers={['roll_number', 'score']}
                sample={`roll_number,score\n${roster.map(r => `${r.roll_number || ''},`).join('\n')}\n`}
                templateName="marks_template.csv"
                mapRow={csvMapRow}
                previewKeys={['roll_number', 'name', 'score']}
                onSubmit={applyCsv}
                onDone={() => setImportOpen(false)}
            />
        </div>
    );
};

export default TeacherMarks;