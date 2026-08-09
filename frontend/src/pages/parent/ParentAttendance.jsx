import React, { useEffect, useMemo, useState } from 'react';
import {
    CalendarDays,
    Users,
    CheckCircle2,
    XCircle,
    Clock3,
    AlertTriangle,
    BookOpen
} from 'lucide-react';

import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

const REQUIRED_PERCENTAGE = 75;

const ParentAttendance = () => {
    const { user } = useAuth();

    const [selectedWardId, setSelectedWardId] = useState('');
    const [allWards, setAllWards] = useState([]);
    const [childProfile, setChildProfile] = useState(null);
    const [childUserId, setChildUserId] = useState(null);

    const [selectedSemester, setSelectedSemester] = useState(1);
    const [selectedSubject, setSelectedSubject] = useState('All');

    const [logs, setLogs] = useState([]);
    const [subjects, setSubjects] = useState([]);

    const [loadingWard, setLoadingWard] = useState(true);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchWard = async () => {
            if (!user?.id) return;

            setLoadingWard(true);
            setError('');

            try {
                const url = selectedWardId
                    ? `/parent/${user.id}/wards-overview?student_id=${selectedWardId}`
                    : `/parent/${user.id}/wards-overview`;

                const response = await api.get(url);
                const data = response.data;

                if (!data?.childProfile) {
                    setChildProfile(null);
                    setChildUserId(null);
                    setAllWards(data?.allWards || []);
                    return;
                }

                setChildProfile(data.childProfile);
                setAllWards(data.allWards || []);

                if (!selectedWardId) {
                    setSelectedWardId(String(data.childProfile.student_id));
                }

                const userId = data.childProfile.user_id;

                setChildUserId(userId);

                setSelectedSemester(
                    Number(data.childProfile.semester) || 1
                );

                setSelectedSubject('All');
            } catch (err) {
                console.error('Error loading parent ward:', err);

                setError(
                    err.response?.data?.error ||
                    'Unable to load ward information.'
                );
            } finally {
                setLoadingWard(false);
            }
        };

        fetchWard();
    }, [user, selectedWardId]);

    useEffect(() => {
        const fetchAttendance = async () => {
            if (!childUserId || !selectedSemester) return;

            setLoadingAttendance(true);
            setError('');

            try {
                const params = `?semester=${selectedSemester}`;

                const [logsResponse, subjectsResponse] =
                    await Promise.all([
                        api.get(
                            `/student/${childUserId}/attendance-logs${params}`
                        ),
                        api.get(
                            `/student/${childUserId}/subjects-list${params}`
                        )
                    ]);

                setLogs(
                    Array.isArray(logsResponse.data)
                        ? logsResponse.data
                        : []
                );

                setSubjects(
                    Array.isArray(subjectsResponse.data)
                        ? subjectsResponse.data
                        : []
                );

                setSelectedSubject('All');
            } catch (err) {
                console.error('Error loading attendance:', err);

                setLogs([]);
                setSubjects([]);

                setError(
                    err.response?.data?.error ||
                    'Unable to load attendance records.'
                );
            } finally {
                setLoadingAttendance(false);
            }
        };

        fetchAttendance();
    }, [childUserId, selectedSemester]);

    const attendanceData = useMemo(() => {
        const subjectNames = subjects.map(
            subject => subject.subject_name
        );

        const subjectStats = subjectNames.map(subjectName => {
            const subjectLogs = logs.filter(
                log => log.subject_name === subjectName
            );

            const attended = subjectLogs.filter(
                log =>
                    log.status === 'Present' ||
                    log.status === 'Late'
            ).length;

            const late = subjectLogs.filter(
                log => log.status === 'Late'
            ).length;

            const absent = subjectLogs.filter(
                log => log.status === 'Absent'
            ).length;

            const held = subjectLogs.length;

            const percentage =
                held > 0
                    ? Math.round((attended / held) * 100)
                    : 0;

            return {
                name: subjectName,
                attended,
                held,
                absent,
                late,
                percentage
            };
        });

        const attended = logs.filter(
            log =>
                log.status === 'Present' ||
                log.status === 'Late'
        ).length;

        const late = logs.filter(
            log => log.status === 'Late'
        ).length;

        const absent = logs.filter(
            log => log.status === 'Absent'
        ).length;

        const held = logs.length;

        const percentage =
            held > 0
                ? Math.round((attended / held) * 100)
                : 0;

        return {
            attended,
            late,
            absent,
            held,
            percentage,
            subjects: subjectStats
        };
    }, [logs, subjects]);

    const filteredLogs = useMemo(() => {
        if (selectedSubject === 'All') {
            return logs;
        }

        return logs.filter(
            log => log.subject_name === selectedSubject
        );
    }, [logs, selectedSubject]);

    const selectedSubjectStats = useMemo(() => {
        if (selectedSubject === 'All') {
            return attendanceData;
        }

        return (
            attendanceData.subjects.find(
                subject => subject.name === selectedSubject
            ) || {
                attended: 0,
                held: 0,
                absent: 0,
                late: 0,
                percentage: 0
            }
        );
    }, [
        selectedSubject,
        attendanceData
    ]);

    const currentPercentage =
        selectedSubjectStats.percentage || 0;

    const isShortage =
        selectedSubjectStats.held > 0 &&
        currentPercentage < REQUIRED_PERCENTAGE;

    const formatDate = date => {
        if (!date) return '-';

        return new Date(date).toLocaleDateString(
            'en-IN',
            {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }
        );
    };

    const getStatusStyle = status => {
        switch (status) {
            case 'Present':
                return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';

            case 'Late':
                return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';

            case 'Absent':
                return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400';

            default:
                return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
        }
    };

    if (loadingWard && !childProfile) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                    Loading Ward Attendance...
                </p>
            </div>
        );
    }

    if (!childProfile) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-10 flex items-center justify-center">
                <p className="text-slate-500 dark:text-slate-400 font-bold">
                    No active students are linked to your parent account.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">

            <header className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-5">

                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        Attendance
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Monitor your ward's attendance and subject-wise presence.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">

                    {/* WARD */}
                    {allWards.length > 1 && (
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <Users
                                size={18}
                                className="text-indigo-600 dark:text-indigo-400"
                            />

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    Select Ward
                                </p>

                                <select
                                    value={selectedWardId}
                                    onChange={e => {
                                        setSelectedWardId(e.target.value);
                                    }}
                                    className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
                                >
                                    {allWards.map(ward => (
                                        <option
                                            key={ward.student_id}
                                            value={ward.student_id}
                                            className="dark:bg-slate-900"
                                        >
                                            {ward.full_name} ({ward.course_name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* SEMESTER */}
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <CalendarDays
                            size={18}
                            className="text-indigo-600 dark:text-indigo-400"
                        />

                        <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                Semester
                            </p>

                            <select
                                value={selectedSemester}
                                onChange={e => {
                                    setSelectedSemester(
                                        Number(e.target.value)
                                    );
                                }}
                                className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(
                                    semester => (
                                        <option
                                            key={semester}
                                            value={semester}
                                            className="dark:bg-slate-900"
                                        >
                                            Semester {semester}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    {/* SUBJECT */}
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <BookOpen
                            size={18}
                            className="text-indigo-600 dark:text-indigo-400"
                        />

                        <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                Subject
                            </p>

                            <select
                                value={selectedSubject}
                                onChange={e =>
                                    setSelectedSubject(
                                        e.target.value
                                    )
                                }
                                className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer max-w-[180px]"
                            >
                                <option
                                    value="All"
                                    className="dark:bg-slate-900"
                                >
                                    All Subjects
                                </option>

                                {subjects.map(subject => (
                                    <option
                                        key={subject.subject_name}
                                        value={subject.subject_name}
                                        className="dark:bg-slate-900"
                                    >
                                        {subject.subject_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                </div>
            </header>

            {/* WARD INFO */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 mb-8 flex flex-col md:flex-row md:items-center gap-4">

                <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl font-black">
                    {childProfile.full_name?.charAt(0)?.toUpperCase()}
                </div>

                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                        {childProfile.full_name}
                    </h3>

                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        {childProfile.course_name} • Semester {selectedSemester}
                    </p>

                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Enrollment Number: {childProfile.enrollment_number}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm font-semibold text-rose-700 dark:text-rose-400">
                    {error}
                </div>
            )}

            {loadingAttendance ? (
                <div className="py-20 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                    Syncing Attendance Records...
                </div>
            ) : (
                <>
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

                        {/* OVERALL */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                            <div className="flex items-center justify-between">

                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Attendance
                                    </p>

                                    <h3 className={`text-4xl font-black mt-2 ${
                                        currentPercentage >= REQUIRED_PERCENTAGE
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {currentPercentage}%
                                    </h3>

                                    <p className="text-xs text-slate-400 mt-1">
                                        Required: {REQUIRED_PERCENTAGE}%
                                    </p>
                                </div>

                                <div className="w-16 h-16 relative">
                                    <svg
                                        className="-rotate-90 w-full h-full"
                                        viewBox="0 0 36 36"
                                    >
                                        <path
                                            stroke="currentColor"
                                            className="text-slate-100 dark:text-slate-800"
                                            strokeWidth="3"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />

                                        <path
                                            stroke="currentColor"
                                            className={
                                                currentPercentage >= REQUIRED_PERCENTAGE
                                                    ? 'text-emerald-500'
                                                    : 'text-rose-500'
                                            }
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            fill="none"
                                            strokeDasharray={`${Math.min(currentPercentage, 100)}, 100`}
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* ATTENDED */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Attended
                            </p>

                            <div className="flex items-center gap-3 mt-3">
                                <CheckCircle2
                                    size={30}
                                    className="text-emerald-500"
                                />

                                <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">
                                    {selectedSubjectStats.attended}
                                </h3>
                            </div>

                            <p className="text-xs text-slate-400 mt-2">
                                Classes attended
                            </p>
                        </div>

                        {/* ABSENT */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Absent
                            </p>

                            <div className="flex items-center gap-3 mt-3">
                                <XCircle
                                    size={30}
                                    className="text-rose-500"
                                />

                                <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">
                                    {selectedSubjectStats.absent}
                                </h3>
                            </div>

                            <p className="text-xs text-slate-400 mt-2">
                                Classes missed
                            </p>
                        </div>

                        {/* HELD / LATE */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Classes Held
                            </p>

                            <div className="flex items-center gap-3 mt-3">
                                <Clock3
                                    size={30}
                                    className="text-indigo-500"
                                />

                                <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">
                                    {selectedSubjectStats.held}
                                </h3>
                            </div>

                            <p className="text-xs text-slate-400 mt-2">
                                Late: {selectedSubjectStats.late}
                            </p>
                        </div>
                    </div>

                    {/* SHORTAGE WARNING */}
                    {isShortage && (
                        <div className="mb-8 flex items-start gap-4 p-5 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30">

                            <AlertTriangle
                                size={24}
                                className="text-rose-500 shrink-0 mt-0.5"
                            />

                            <div>
                                <h3 className="font-black text-rose-700 dark:text-rose-400">
                                    Attendance Shortage
                                </h3>

                                <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">
                                    {selectedSubject === 'All'
                                        ? 'Your ward is currently below the required attendance percentage.'
                                        : `Attendance in ${selectedSubject} is below the required ${REQUIRED_PERCENTAGE}%.`
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                    {/* SUBJECT BREAKDOWN */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">

                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-black text-slate-900 dark:text-slate-100">
                                Subject-wise Attendance
                            </h3>

                            <p className="text-xs text-slate-400 mt-1">
                                Semester {selectedSemester}
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">

                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase tracking-widest text-slate-400">
                                        <th className="text-left px-5 py-4">
                                            Subject
                                        </th>

                                        <th className="text-center px-5 py-4">
                                            Attended
                                        </th>

                                        <th className="text-center px-5 py-4">
                                            Held
                                        </th>

                                        <th className="text-center px-5 py-4">
                                            Absent
                                        </th>

                                        <th className="text-center px-5 py-4">
                                            Late
                                        </th>

                                        <th className="text-center px-5 py-4">
                                            Attendance
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {attendanceData.subjects.length > 0 ? (
                                        attendanceData.subjects.map(subject => (
                                            <tr
                                                key={subject.name}
                                                className="border-t border-slate-100 dark:border-slate-800"
                                            >
                                                <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">
                                                    {subject.name}
                                                </td>

                                                <td className="px-5 py-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {subject.attended}
                                                </td>

                                                <td className="px-5 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                                                    {subject.held}
                                                </td>

                                                <td className="px-5 py-4 text-center font-semibold text-rose-600 dark:text-rose-400">
                                                    {subject.absent}
                                                </td>

                                                <td className="px-5 py-4 text-center font-semibold text-amber-600 dark:text-amber-400">
                                                    {subject.late}
                                                </td>

                                                <td className="px-5 py-4 text-center">
                                                    <span
                                                        className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                                                            subject.percentage >= REQUIRED_PERCENTAGE
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                                        }`}
                                                    >
                                                        {subject.percentage}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                className="px-5 py-12 text-center text-slate-400"
                                            >
                                                No attendance records found for this semester.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>

                            </table>
                        </div>
                    </div>

                    {/* ATTENDANCE LOG */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">

                            <div>
                                <h3 className="font-black text-slate-900 dark:text-slate-100">
                                    Attendance History
                                </h3>

                                <p className="text-xs text-slate-400 mt-1">
                                    Detailed class-by-class attendance record
                                </p>
                            </div>

                            <span className="text-xs font-bold text-slate-400">
                                {filteredLogs.length} records
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">

                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log, index) => (
                                    <div
                                        key={`${log.class_date}-${log.subject_name}-${index}`}
                                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                    >

                                        <div className="flex items-center gap-4">

                                            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                                                <CalendarDays
                                                    size={20}
                                                    className="text-indigo-600 dark:text-indigo-400"
                                                />
                                            </div>

                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                                                    {log.subject_name}
                                                </h4>

                                                <p className="text-xs text-slate-400 mt-1">
                                                    {formatDate(log.class_date)}
                                                </p>
                                            </div>

                                        </div>

                                        <span
                                            className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${getStatusStyle(log.status)}`}
                                        >
                                            {log.status}
                                        </span>

                                    </div>
                                ))
                            ) : (
                                <div className="py-14 text-center text-slate-400">
                                    No attendance history available.
                                </div>
                            )}

                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ParentAttendance;