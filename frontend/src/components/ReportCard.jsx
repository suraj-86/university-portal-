import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';

const UNIVERSITY_NAME = 'Babasaheb Bhimrao Ambedkar University';

const STATUS_LABEL = {
    PASSED: 'Passed',
    BACKLOG: 'Not cleared',
    PROVISIONAL: 'Provisional',
    PENDING: 'Results awaited'
};

const STATUS_STYLE = {
    PASSED: 'border-emerald-600 text-emerald-700',
    BACKLOG: 'border-rose-600 text-rose-700',
    PROVISIONAL: 'border-amber-600 text-amber-700',
    PENDING: 'border-slate-400 text-slate-600'
};

const PRINT_CSS = `
.rc-print-root { display: none; }
@media print {
    @page { size: A4; margin: 12mm; }
    #root { display: none !important; }
    .rc-print-root { display: block !important; }
    .rc-print-root, .rc-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .rc-semester { break-inside: avoid; }
}
`;

const show = (value, digits = 2) =>
    value === null || value === undefined ? '—' : Number(value).toFixed(digits);

const Field = ({ label, value }) => (
    <div className="flex gap-2 text-sm py-1">
        <dt className="w-36 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500 pt-0.5">{label}</dt>
        <dd className="font-semibold text-slate-900">{value || '—'}</dd>
    </div>
);

const Summary = ({ label, value, sub }) => (
    <div className="border border-slate-300 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-lg font-black text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
);

const SemesterBlock = ({ sem }) => {
    const att = sem.attendance;
    return (
        <section className="rc-semester mt-6">
            <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-2">
                <h3 className="text-sm font-bold uppercase tracking-wider">Semester {sem.semester}</h3>
                <span className={`bg-white border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[sem.status]}`}>
                    {STATUS_LABEL[sem.status]}
                </span>
            </div>

            <table className="w-full border-collapse text-xs">
                <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider">
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Code</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Subject</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">Credits</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left">Assessment marks</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">Total</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">%</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">Grade</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center">GP</th>
                    </tr>
                </thead>
                <tbody className="text-slate-900">
                    {sem.subjects.map((sub) => (
                        <tr key={sub.id} className="align-top">
                            <td className="border border-slate-300 px-2 py-1.5 font-semibold whitespace-nowrap">{sub.code}</td>
                            <td className="border border-slate-300 px-2 py-1.5 font-semibold">{sub.name}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center">{sub.credits}</td>
                            <td className="border border-slate-300 px-2 py-1.5">
                                {sub.evaluated ? (
                                    sub.components.map((c, i) => (
                                        <div key={i} className="flex justify-between gap-3">
                                            <span className="text-slate-600">{c.label}</span>
                                            <span className="font-semibold whitespace-nowrap">{c.score} / {c.max}</span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="italic text-slate-500">Not yet evaluated</span>
                                )}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold whitespace-nowrap">
                                {sub.evaluated ? `${sub.total} / ${sub.totalMax}` : '—'}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center">
                                {sub.evaluated ? sub.percentage.toFixed(1) : '—'}
                            </td>
                            <td className={`border border-slate-300 px-2 py-1.5 text-center font-black ${sub.evaluated && !sub.passed ? 'text-rose-700' : ''}`}>
                                {sub.evaluated ? `${sub.grade}${sub.provisional ? '*' : ''}` : '—'}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center">{show(sub.gradePoint)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 mt-2">
                <Summary label="Credits earned" value={`${sem.earnedCredits} / ${sem.totalCredits}`} />
                <Summary label="Marks" value={sem.maximum > 0 ? `${sem.obtained} / ${sem.maximum}` : '—'} />
                <Summary label="Percentage" value={sem.percentage === null ? '—' : `${sem.percentage.toFixed(1)}%`} />
                <Summary label="SGPA" value={show(sem.sgpa)} />
            </div>

            <p className="mt-2 text-xs text-slate-600">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Attendance: </span>
                {att.total > 0
                    ? `${att.present} present out of ${att.total} classes (${att.percentage.toFixed(1)}%)`
                    : 'No attendance recorded'}
            </p>
        </section>
    );
};

const ReportCardDocument = ({ data, semester }) => {
    const { student, semesters, overall, grading } = data;
    const shown = semester === 'all' ? semesters : semesters.filter((s) => String(s.semester) === semester);
    const hasProvisionalSubject = shown.some((s) => s.subjects.some((sub) => sub.provisional));

    return (
        <article className="rc-paper bg-white text-slate-900 border border-slate-300 shadow-sm p-6 md:p-10 max-w-4xl mx-auto print:border-0 print:shadow-none print:p-0 print:max-w-none">
            <header className="text-center border-b-2 border-slate-900 pb-4">
                <p className="text-lg md:text-xl font-black uppercase tracking-wide">{UNIVERSITY_NAME}</p>
                <p className="mt-1 text-sm font-bold uppercase tracking-[0.25em] text-slate-600">Report Card</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                    {semester === 'all' ? 'Consolidated statement: all semesters' : `Semester ${semester}`}
                </p>
            </header>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 mt-4 pb-4 border-b border-slate-300">
                <Field label="Student name" value={student.name} />
                <Field label="Enrollment no." value={student.enrollmentNumber} />
                <Field label="Roll no." value={student.rollNumber} />
                <Field label="Programme" value={student.courseName ? `${student.courseName} (${student.courseCode})` : ''} />
                <Field label="Department" value={student.department} />
                <Field label="Date of birth" value={student.dateOfBirth} />
                <Field label="Date of admission" value={student.admissionDate} />
                <Field label="Current semester" value={student.currentSemester} />
                <Field label="Enrolment status" value={student.status} />
            </dl>

            {shown.length === 0 ? (
                <p className="mt-8 mb-4 text-center text-sm italic text-slate-500">No marks have been published yet.</p>
            ) : (
                shown.map((sem) => <SemesterBlock key={sem.semester} sem={sem} />)
            )}

            {semesters.length > 0 && (
                <section className="rc-semester mt-6">
                    <h3 className="bg-slate-100 border border-slate-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                        Cumulative performance (all semesters)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 mt-2">
                        <Summary label="CGPA" value={show(overall.cgpa)} />
                        <Summary label="Overall percentage" value={overall.percentage === null ? '—' : `${overall.percentage.toFixed(1)}%`} />
                        <Summary label="Credits earned" value={overall.earnedCredits} />
                        <Summary label="Backlogs" value={overall.backlogs} />
                    </div>
                </section>
            )}

            <footer className="rc-semester mt-6 pt-3 border-t border-slate-300 text-[11px] text-slate-600 space-y-1">
                <p>
                    <span className="font-bold text-slate-700">Grading scheme: </span>
                    {grading.legend.map((l) => `${l.grade} = ${l.range}`).join('; ')}. Pass mark: {grading.passPercent}% per subject.
                </p>
                <p>{grading.gradePointRule}</p>
                {!grading.official && (
                    <p className="font-semibold text-amber-700">
                        Grade points, SGPA and CGPA are provisional: the university's official grading scheme has not been applied yet.
                    </p>
                )}
                {hasProvisionalSubject && (
                    <p className="font-semibold text-amber-700">
                        * End-semester or practical marks are not yet entered for this subject, so the grade is provisional.
                    </p>
                )}
                <p>Computer-generated from University Portal records on {data.generatedOn}.</p>
            </footer>
        </article>
    );
};

const ReportCard = ({ data }) => {
    const [semester, setSemester] = useState(() => {
        const withMarks = data.semesters.filter((s) => s.subjects.some((sub) => sub.evaluated));
        const pick = withMarks.length ? withMarks[withMarks.length - 1] : data.semesters[data.semesters.length - 1];
        return pick ? String(pick.semester) : 'all';
    });

    const handlePrint = () => {
        const previousTitle = document.title;
        const suffix = semester === 'all' ? 'All Semesters' : `Semester ${semester}`;
        document.title = `Report Card - ${data.student.name} - ${suffix}`;
        window.addEventListener('afterprint', () => { document.title = previousTitle; }, { once: true });
        window.print();
    };

    return (
        <div>
            <style>{PRINT_CSS}</style>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">View</span>
                    <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
                    >
                        {data.semesters.map((s) => (
                            <option key={s.semester} value={String(s.semester)} className="dark:bg-slate-900">
                                Semester {s.semester}
                            </option>
                        ))}
                        <option value="all" className="dark:bg-slate-900">All semesters</option>
                    </select>
                </div>

                <button
                    type="button"
                    onClick={handlePrint}
                    disabled={data.semesters.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-colors"
                >
                    <Download size={16} />
                    Print / Save as PDF
                </button>
            </div>

            <ReportCardDocument data={data} semester={semester} />

            {createPortal(
                <div className="rc-print-root">
                    <ReportCardDocument data={data} semester={semester} />
                </div>,
                document.body
            )}
        </div>
    );
};

export default ReportCard;
