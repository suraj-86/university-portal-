import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    XCircle,
    Clock3,
    AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

const StudentAttendance = () => {
    const { user } = useAuth();
    const [selectedSemester, setSelectedSemester] = useState(1);
    const [selectedSubject, setSelectedSubject] = useState('All');

    const [logs, setLogs] = useState([]);
    const [subjectsFromDb, setSubjectsFromDb] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;

        setLoading(true);

        const params = `?semester=${selectedSemester}`;

        Promise.all([
            api.get(`/student/${user.id}/attendance-logs${params}`),
            api.get(`/student/${user.id}/subjects-list${params}`),
        ])
            .then(([logsRes, subsRes]) => {
                setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
                setSubjectsFromDb(Array.isArray(subsRes.data) ? subsRes.data : []);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error loading attendance:', err);
                setLogs([]);
                setSubjectsFromDb([]);
                setLoading(false);
            });
    }, [user, selectedSemester]);

    const attendanceData = useMemo(() => {
        const subjects = subjectsFromDb.map((sub) => {
            const name = sub.subject_name;
            const subLogs = logs.filter((log) => log.subject_name === name);

            const present = subLogs.filter((log) => log.status === 'Present').length;
            const late = subLogs.filter((log) => log.status === 'Late').length;
            const absent = subLogs.filter((log) => log.status === 'Absent').length;
            const total = subLogs.length;
            const attended = present + late;

            return {
                name,
                present,
                late,
                absent,
                attended,
                total,
                percentage:
                    total > 0 ? Math.round((attended / total) * 100) : null,
            };
        });

        const present = logs.filter((log) => log.status === 'Present').length;
        const late = logs.filter((log) => log.status === 'Late').length;
        const absent = logs.filter((log) => log.status === 'Absent').length;
        const total = logs.length;
        const attended = present + late;

        return {
            overall: total > 0 ? Math.round((attended / total) * 100) : 0,
            attended,
            present,
            late,
            absent,
            total,
            requiredPercentage: 75,
            subjects,
            recentLogs: logs.map((log) => ({
                date: new Date(log.class_date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                }),
                subject: log.subject_name,
                status: log.status,
            })),
        };
    }, [logs, subjectsFromDb]);

    const displayedSubjects =
        selectedSubject === 'All'
            ? attendanceData.subjects
            : attendanceData.subjects.filter(
                  (subject) => subject.name === selectedSubject
              );

    const displayedLogs =
        selectedSubject === 'All'
            ? attendanceData.recentLogs
            : attendanceData.recentLogs.filter(
                  (log) => log.subject === selectedSubject
              );

    const selectedStats =
        selectedSubject === 'All'
            ? attendanceData
            : displayedSubjects[0] || {
                  attended: 0,
                  present: 0,
                  late: 0,
                  absent: 0,
                  total: 0,
                  percentage: null,
              };

    const percentage =
        selectedStats.percentage ??
        (selectedStats.total > 0
            ? Math.round((selectedStats.attended / selectedStats.total) * 100)
            : 0);

    const isSafe = percentage >= attendanceData.requiredPercentage;

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans dark:bg-slate-950 md:p-10">
            <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        Attendance
                    </h1>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                        Track your academic presence and subject-wise attendance.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <CalendarIcon
                            size={17}
                            className="text-indigo-500"
                        />
                        <select
                            value={selectedSemester}
                            onChange={(e) => {
                                setSelectedSemester(Number(e.target.value));
                                setSelectedSubject('All');
                            }}
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                                <option key={semester} value={semester}>
                                    Semester {semester}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="max-w-[220px] bg-transparent text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
                        >
                            <option value="All">All Subjects</option>
                            {attendanceData.subjects.map((subject) => (
                                <option key={subject.name} value={subject.name}>
                                    {subject.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="rounded-[28px] border border-slate-200 bg-white py-24 text-center font-bold uppercase tracking-widest text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
                    Syncing Attendance Records...
                </div>
            ) : (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Attendance
                                </p>
                                <h2
                                    className={`mt-1 text-4xl font-black ${
                                        isSafe
                                            ? 'text-emerald-500'
                                            : 'text-rose-500'
                                    }`}
                                >
                                    {percentage}%
                                </h2>
                                <p className="mt-1 text-xs font-medium text-slate-400">
                                    Required: {attendanceData.requiredPercentage}%
                                </p>
                            </div>

                            <div className="relative h-20 w-20 shrink-0">
                                <svg
                                    className="-rotate-90"
                                    viewBox="0 0 36 36"
                                >
                                    <path
                                        className="text-slate-100 dark:text-slate-800"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className={
                                            isSafe
                                                ? 'text-emerald-500'
                                                : 'text-rose-500'
                                        }
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        fill="none"
                                        strokeDasharray={`${percentage}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-800 dark:text-slate-100">
                                    {percentage}%
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Attended
                                    </p>
                                    <h2 className="mt-1 text-4xl font-black text-emerald-500">
                                        {selectedStats.attended}
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Classes attended
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
                                        {selectedStats.absent}
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Classes missed
                                    </p>
                                </div>
                                <XCircle
                                    size={34}
                                    className="text-rose-500"
                                />
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Classes Held
                                    </p>
                                    <h2 className="mt-1 text-4xl font-black text-slate-900 dark:text-slate-100">
                                        {selectedStats.total}
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Late: {selectedStats.late}
                                    </p>
                                </div>
                                <Clock3
                                    size={34}
                                    className="text-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    <section className="mb-8 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 md:px-6">
                            <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                                Subject-wise Attendance
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Semester {selectedSemester}
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:bg-slate-800/40">
                                        <th className="px-5 py-4 md:px-6">
                                            Subject
                                        </th>
                                        <th className="px-5 py-4">Attended</th>
                                        <th className="px-5 py-4">Held</th>
                                        <th className="px-5 py-4">Absent</th>
                                        <th className="px-5 py-4">Late</th>
                                        <th className="px-5 py-4">
                                            Attendance
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {displayedSubjects.map((subject) => {
                                        const subjectSafe =
                                            subject.percentage !== null &&
                                            subject.percentage >=
                                                attendanceData.requiredPercentage;

                                        return (
                                            <tr
                                                key={subject.name}
                                                className="border-t border-slate-100 dark:border-slate-800"
                                            >
                                                <td className="px-5 py-4 md:px-6">
                                                    <div className="font-black text-slate-900 dark:text-slate-100">
                                                        {subject.name}
                                                    </div>
                                                    {subject.total > 0 &&
                                                        !subjectSafe && (
                                                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                                                                <AlertCircle
                                                                    size={11}
                                                                />
                                                                Below required
                                                            </div>
                                                        )}
                                                </td>

                                                <td className="px-5 py-4 font-bold text-emerald-600">
                                                    {subject.attended}
                                                </td>

                                                <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">
                                                    {subject.total}
                                                </td>

                                                <td className="px-5 py-4 font-bold text-rose-500">
                                                    {subject.absent}
                                                </td>

                                                <td className="px-5 py-4 font-bold text-amber-500">
                                                    {subject.late}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex min-w-[48px] justify-center rounded-full px-3 py-1 text-xs font-black ${
                                                            subject.percentage ===
                                                            null
                                                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                                                : subjectSafe
                                                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                                                        }`}
                                                    >
                                                        {subject.percentage ===
                                                        null
                                                            ? '—'
                                                            : `${subject.percentage}%`}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {displayedSubjects.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                className="px-6 py-12 text-center font-bold text-slate-400"
                                            >
                                                No subjects added for this
                                                semester.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800 md:px-6">
                            <div>
                                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                                    Attendance History
                                </h2>
                                <p className="mt-1 text-xs text-slate-400">
                                    Detailed class-by-class attendance record
                                </p>
                            </div>
                            <span className="text-xs font-bold text-slate-400">
                                {displayedLogs.length} records
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {displayedLogs.map((log, index) => {
                                const present = log.status === 'Present';
                                const late = log.status === 'Late';

                                return (
                                    <div
                                        key={`${log.date}-${log.subject}-${index}`}
                                        className="flex items-center justify-between gap-4 px-5 py-4 md:px-6"
                                    >
                                        <div className="flex min-w-0 items-center gap-4">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400">
                                                <CalendarIcon size={18} />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-slate-800 dark:text-slate-200">
                                                    {log.subject}
                                                </p>
                                                <p className="mt-0.5 text-xs font-medium text-slate-400">
                                                    {log.date}
                                                </p>
                                            </div>
                                        </div>

                                        <span
                                            className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                                                present
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                    : late
                                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                                            }`}
                                        >
                                            {log.status}
                                        </span>
                                    </div>
                                );
                            })}

                            {displayedLogs.length === 0 && (
                                <div className="px-6 py-12 text-center font-bold text-slate-400">
                                    No attendance records found.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default StudentAttendance;