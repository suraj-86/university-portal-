import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Save,
    Calendar,
    Users,
    History,
    Eye,
    ArrowLeft,
    Filter,
    FileText,
    CheckCircle2,
    XCircle,
    Clock3,
} from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const TeacherAttendance = () => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState('mark');
    const [searchParams] = useSearchParams();

    const urlSubject = searchParams.get('subject');
    const urlDate = searchParams.get('date');

    const [mySubjects, setMySubjects] = useState([]);
    const [roster, setRoster] = useState([]);
    const [selectedSession, setSelectedSession] = useState(urlSubject || '');
    const [scheduleDate, setScheduleDate] = useState(
        urlDate || new Date().toISOString().split('T')[0]
    );
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const [historyFilters, setHistoryFilters] = useState({
        semester: 'All',
        subject: 'All',
        date: '',
    });
    const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [historyDetailRoster, setHistoryDetailRoster] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        const fetchSubjects = async () => {
            if (!user?.id) return;

            setLoadingSubjects(true);

            try {
                const response = await api.get(
                    `/teacher/${user.id}/assigned-subjects`
                );

                const subjects = Array.isArray(response.data)
                    ? response.data
                    : [];

                setMySubjects(subjects);

                if (
                    subjects.length > 0 &&
                    !subjects.some(
                        (subject) =>
                            String(subject.id) === String(selectedSession)
                    )
                ) {
                    setSelectedSession(subjects[0].id);
                }
            } catch (error) {
                console.error('Error fetching subjects:', error);
                toast.error('Failed to load assigned subjects.');
            } finally {
                setLoadingSubjects(false);
            }
        };

        fetchSubjects();
    }, [user?.id]);

    useEffect(() => {
        if (viewMode !== 'history' || !user?.id) return;

        const fetchHistory = async () => {
            setLoadingHistory(true);

            try {
                const response = await api.get(
                    `/teacher/${user.id}/attendance-history`
                );

                setAttendanceHistory(
                    Array.isArray(response.data) ? response.data : []
                );
            } catch (error) {
                console.error('Error loading history:', error);
                toast.error('Failed to load attendance history.');
                setAttendanceHistory([]);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [viewMode, user?.id]);

    const selectedSubject = useMemo(
        () =>
            mySubjects.find(
                (subject) =>
                    String(subject.id) === String(selectedSession)
            ),
        [mySubjects, selectedSession]
    );

    const sessionStats = useMemo(() => {
        const present = roster.filter(
            (student) => student.status === 'Present'
        ).length;

        const absent = roster.filter(
            (student) => student.status === 'Absent'
        ).length;

        const total = roster.length;

        return {
            total,
            present,
            absent,
            percentage:
                total > 0 ? Math.round((present / total) * 100) : 0,
        };
    }, [roster]);

    const historyStats = useMemo(() => {
        const records = attendanceHistory;

        const present = records.reduce(
            (sum, record) => sum + Number(record.present || 0),
            0
        );

        const absent = records.reduce(
            (sum, record) => sum + Number(record.absent || 0),
            0
        );

        return {
            records: records.length,
            present,
            absent,
            total: present + absent,
        };
    }, [attendanceHistory]);

    const handleOpenSheet = async () => {
        if (!selectedSession) {
            toast.error('Please select a session first.');
            return;
        }

        try {
            const response = await api.get(
                `/subjects/${selectedSession}/students`
            );

            if (!Array.isArray(response.data)) {
                toast.error(
                    'Data error: did not return a valid student list.'
                );
                return;
            }

            if (response.data.length === 0) {
                toast.error(
                    "No students found enrolled in this subject's course."
                );
                return;
            }

            setRoster(
                response.data.map((student) => ({
                    ...student,
                    status: student.status || 'Absent',
                }))
            );
            setIsSheetOpen(true);
        } catch (error) {
            toast.error(
                `Could not load students. ${
                    error.response?.data?.error || ''
                }`
            );
        }
    };

    const handleSave = async () => {
        if (!isSheetOpen || roster.length === 0) {
            toast.error(
                'Please open a sheet and mark attendance first!'
            );
            return;
        }

        try {
            await api.post('/attendance', {
                subject_id: selectedSession,
                date: scheduleDate,
                students: roster,
                marked_by: user.id,
            });

            toast.success(
                `Success! Attendance for ${scheduleDate} has been saved.`
            );

            setIsSheetOpen(false);
            setRoster([]);
        } catch (error) {
            console.error('Failed to save attendance:', error);
            toast.error('Failed to save attendance.');
        }
    };

    const toggleAttendance = (id) => {
        setRoster((currentRoster) =>
            currentRoster.map((student) =>
                student.student_id === id
                    ? {
                          ...student,
                          status:
                              student.status === 'Present'
                                  ? 'Absent'
                                  : 'Present',
                      }
                    : student
            )
        );
    };

    const markAllPresent = () => {
        setRoster((currentRoster) =>
            currentRoster.map((student) => ({
                ...student,
                status: 'Present',
            }))
        );
    };

    const markAllAbsent = () => {
        setRoster((currentRoster) =>
            currentRoster.map((student) => ({
                ...student,
                status: 'Absent',
            }))
        );
    };

    const handleViewSheet = async (record) => {
        try {
            const response = await api.get(
                `/attendance/class/${record.id}`
            );

            setHistoryDetailRoster(
                Array.isArray(response.data) ? response.data : []
            );
            setSelectedHistoryRecord(record);
            setViewMode('history_detail');
        } catch (error) {
            console.error(
                'Failed to load attendance sheet:',
                error
            );
            toast.error(
                'Failed to load the specific attendance sheet.'
            );
        }
    };

    const filteredHistory = attendanceHistory.filter((record) => {
        const matchSem =
            historyFilters.semester === 'All' ||
            record.semester === historyFilters.semester;

        const matchSub =
            historyFilters.subject === 'All' ||
            record.subject === historyFilters.subject;

        const matchDate =
            !historyFilters.date ||
            record.date === historyFilters.date;

        return matchSem && matchSub && matchDate;
    });

    const markingColumns = [
        {
            header: 'Enrollment No.',
            accessor: 'roll',
        },
        {
            header: 'Student Name',
            accessor: 'name',
            cell: (row) => (
                <span className="font-bold text-slate-900 dark:text-slate-100">
                    {row.name}
                </span>
            ),
        },
        {
            header: 'Attendance Status',
            accessor: 'attendance_action',
            cell: (row) => (
                <button
                    type="button"
                    onClick={() => toggleAttendance(row.student_id)}
                    className="group flex items-center gap-3 focus:outline-none"
                >
                    <div
                        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                            row.status === 'Present'
                                ? 'bg-emerald-500'
                                : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400'
                        }`}
                    >
                        <div
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                row.status === 'Present'
                                    ? 'translate-x-7'
                                    : 'translate-x-1'
                            }`}
                        />
                    </div>

                    <span
                        className={`w-16 text-left text-xs font-black uppercase tracking-wider ${
                            row.status === 'Present'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        {row.status}
                    </span>
                </button>
            ),
        },
    ];

    const historyColumns = [
        {
            header: 'Date',
            accessor: 'date',
            cell: (row) => (
                <span className="font-bold text-slate-800 dark:text-slate-200">
                    {row.date}
                </span>
            ),
        },
        {
            header: 'Class & Semester',
            accessor: 'class',
            cell: (row) => `${row.class} (${row.semester})`,
        },
        {
            header: 'Subject',
            accessor: 'subject',
            cell: (row) => (
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {row.subject}
                </span>
            ),
        },
        {
            header: 'Present',
            accessor: 'present',
            cell: (row) => (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {row.present}
                </span>
            ),
        },
        {
            header: 'Absent',
            accessor: 'absent',
            cell: (row) => (
                <span className="font-bold text-rose-600 dark:text-rose-400">
                    {row.absent}
                </span>
            ),
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (row) => (
                <button
                    type="button"
                    onClick={() => handleViewSheet(row)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/60"
                >
                    <Eye size={14} /> View Sheet
                </button>
            ),
        },
    ];

    const historyDetailColumns = [
        {
            header: 'Enrollment No.',
            accessor: 'roll',
        },
        {
            header: 'Student Name',
            accessor: 'name',
            cell: (row) => (
                <span className="font-bold text-slate-900 dark:text-slate-100">
                    {row.name}
                </span>
            ),
        },
        {
            header: 'Recorded Status',
            accessor: 'status',
            cell: (row) => (
                <span
                    className={`rounded-lg border px-3 py-1 text-[10px] font-black uppercase ${
                        row.status === 'Present'
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400'
                    }`}
                >
                    {row.status}
                </span>
            ),
        },
    ];

    const renderMarkingView = () => (
        <>
            <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Selected Session
                            </p>
                            <h2 className="mt-1 line-clamp-2 text-xl font-black text-slate-900 dark:text-slate-100">
                                {selectedSubject?.course_name ||
                                    'No session selected'}
                            </h2>
                            <p className="mt-1 text-xs font-medium text-slate-400">
                                {selectedSubject?.subject_code || '—'}
                            </p>
                        </div>
                        <FileText
                            size={34}
                            className="shrink-0 text-indigo-500"
                        />
                    </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Students
                            </p>
                            <h2 className="mt-1 text-4xl font-black text-slate-900 dark:text-slate-100">
                                {sessionStats.total}
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Students in roster
                            </p>
                        </div>
                        <Users
                            size={34}
                            className="text-indigo-500"
                        />
                    </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Present
                            </p>
                            <h2 className="mt-1 text-4xl font-black text-emerald-500">
                                {sessionStats.present}
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Marked present
                            </p>
                        </div>
                        <CheckCircle2
                            size={34}
                            className="text-emerald-500"
                        />
                    </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Absent
                            </p>
                            <h2 className="mt-1 text-4xl font-black text-rose-500">
                                {sessionStats.absent}
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Marked absent
                            </p>
                        </div>
                        <XCircle
                            size={34}
                            className="text-rose-500"
                        />
                    </div>
                </div>
            </div>

            <section className="mb-8 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Session Date
                        </label>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                            <Calendar
                                size={18}
                                className="text-indigo-500"
                            />
                            <input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => {
                                    setScheduleDate(e.target.value);
                                    setIsSheetOpen(false);
                                }}
                                className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Assigned Subject
                        </label>
                        <select
                            value={selectedSession}
                            onChange={(e) => {
                                setSelectedSession(e.target.value);
                                setIsSheetOpen(false);
                            }}
                            disabled={loadingSubjects}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            {mySubjects.map((sub) => (
                                <option
                                    key={sub.id}
                                    value={sub.id}
                                >
                                    {sub.subject_code} - {sub.course_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={handleOpenSheet}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-md transition-all hover:bg-indigo-700 active:scale-[0.99]"
                        >
                            <FileText size={17} />
                            Open Attendance Sheet
                        </button>
                    </div>
                </div>
            </section>

            {isSheetOpen ? (
                <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                                Student Roster
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                {selectedSubject?.course_name || 'Attendance'}
                                {' · '}
                                {scheduleDate}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={markAllPresent}
                                className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400"
                            >
                                Mark All Present
                            </button>

                            <button
                                type="button"
                                onClick={markAllAbsent}
                                className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400"
                            >
                                Mark All Absent
                            </button>

                            <button
                                type="button"
                                onClick={handleSave}
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-indigo-700"
                            >
                                <Save size={14} />
                                Save Attendance
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table
                            columns={markingColumns}
                            data={roster}
                            pageSize={100}
                        />
                    </div>
                </section>
            ) : (
                <section className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
                    <FileText
                        size={48}
                        className="mb-4 text-slate-200 dark:text-slate-700"
                    />
                    <p className="font-bold">
                        Select a date and subject, then open the sheet.
                    </p>
                </section>
            )}
        </>
    );

    const renderHistoryView = () => (
        <>
            <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Attendance Sheets
                    </p>
                    <h2 className="mt-1 text-4xl font-black text-slate-900 dark:text-slate-100">
                        {historyStats.records}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                        Records available
                    </p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Students Present
                    </p>
                    <h2 className="mt-1 text-4xl font-black text-emerald-500">
                        {historyStats.present}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                        Across displayed records
                    </p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Students Absent
                    </p>
                    <h2 className="mt-1 text-4xl font-black text-rose-500">
                        {historyStats.absent}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                        Across displayed records
                    </p>
                </div>
            </div>

            <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
                <div className="mb-4 flex items-center gap-2">
                    <Filter
                        size={16}
                        className="text-indigo-500"
                    />
                    <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
                        Filter Attendance History
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Semester
                        </label>
                        <select
                            value={historyFilters.semester}
                            onChange={(e) =>
                                setHistoryFilters({
                                    ...historyFilters,
                                    semester: e.target.value,
                                })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <option value="All">
                                All Semesters
                            </option>
                            <option value="Sem 1">
                                Semester 1
                            </option>
                            <option value="Sem 2">
                                Semester 2
                            </option>
                            <option value="Sem 3">
                                Semester 3
                            </option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Subject
                        </label>
                        <select
                            value={historyFilters.subject}
                            onChange={(e) =>
                                setHistoryFilters({
                                    ...historyFilters,
                                    subject: e.target.value,
                                })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <option value="All">
                                All Subjects
                            </option>
                            {mySubjects.map((sub) => (
                                <option
                                    key={sub.id}
                                    value={sub.subject_name}
                                >
                                    {sub.subject_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Specific Date
                        </label>
                        <input
                            type="date"
                            value={historyFilters.date}
                            onChange={(e) =>
                                setHistoryFilters({
                                    ...historyFilters,
                                    date: e.target.value,
                                })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                    </div>
                </div>
            </section>

            {loadingHistory ? (
                <div className="rounded-[24px] border border-slate-200 bg-white py-20 text-center font-bold uppercase tracking-widest text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    Loading Attendance History...
                </div>
            ) : (
                <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 md:px-6">
                        <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                            Attendance History
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">
                            Review previously recorded attendance sheets.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <Table
                            columns={historyColumns}
                            data={filteredHistory}
                            pageSize={10}
                        />
                    </div>
                </section>
            )}
        </>
    );

    const renderHistoryDetail = () => (
        <>
            {selectedHistoryRecord && (
                <section className="mb-6 rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Class / Subject
                                </p>
                                <p className="mt-1 text-lg font-black text-indigo-600 dark:text-indigo-400">
                                    {selectedHistoryRecord.class}{' '}
                                    {selectedHistoryRecord.semester} -{' '}
                                    {selectedHistoryRecord.subject}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Date Recorded
                                </p>
                                <p className="mt-1 text-lg font-black text-slate-800 dark:text-slate-200">
                                    {selectedHistoryRecord.date}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Attendance Rate
                                </p>
                                <p className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
                                    {Number(
                                        selectedHistoryRecord.present || 0
                                    ) +
                                        Number(
                                            selectedHistoryRecord.absent || 0
                                        ) >
                                    0
                                        ? Math.round(
                                              (Number(
                                                  selectedHistoryRecord.present ||
                                                      0
                                              ) /
                                                  (Number(
                                                      selectedHistoryRecord.present ||
                                                          0
                                                  ) +
                                                      Number(
                                                          selectedHistoryRecord.absent ||
                                                              0
                                                      ))) *
                                                  100
                                          )
                                        : 0}
                                    %
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <span className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                                Present:{' '}
                                {selectedHistoryRecord.present}
                            </span>
                            <span className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                                Absent:{' '}
                                {selectedHistoryRecord.absent}
                            </span>
                        </div>
                    </div>
                </section>
            )}

            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 md:px-6">
                    <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                        Attendance Sheet
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                        Recorded student-by-student attendance.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <Table
                        columns={historyDetailColumns}
                        data={historyDetailRoster}
                        pageSize={100}
                    />
                </div>
            </section>
        </>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans dark:bg-slate-950 md:p-10">
            <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {viewMode === 'mark'
                            ? 'Attendance'
                            : viewMode === 'history'
                              ? 'Attendance History'
                              : 'Attendance Record'}
                    </h1>

                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                        {viewMode === 'mark'
                            ? 'Mark and manage attendance for your assigned classes.'
                            : viewMode === 'history'
                              ? 'Review previously recorded attendance sheets.'
                              : `Viewing the recorded sheet for ${selectedHistoryRecord?.subject || 'this session'}.`}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {viewMode === 'mark' ? (
                        <button
                            type="button"
                            onClick={() => setViewMode('history')}
                            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <History size={18} />
                            View Previous Records
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                setViewMode(
                                    viewMode === 'history_detail'
                                        ? 'history'
                                        : 'mark'
                                )
                            }
                            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft size={18} />
                            {viewMode === 'history_detail'
                                ? 'Back to Records'
                                : 'Back to Marking'}
                        </button>
                    )}
                </div>
            </header>

            {viewMode === 'mark' && renderMarkingView()}
            {viewMode === 'history' && renderHistoryView()}
            {viewMode === 'history_detail' && renderHistoryDetail()}
        </div>
    );
};

export default TeacherAttendance;