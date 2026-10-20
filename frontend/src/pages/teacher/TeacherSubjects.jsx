import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import useAuth from '../../hooks/useAuth';
import useLoad from '../../hooks/useLoad';
import toast from 'react-hot-toast';
import { plural } from '../../utils/dashboardUi';
import { ListHeader, FilterBar, LoadState, FormError, FieldLabel, ModalActions, modalSelectCls } from '../../components/admin/ListParts';

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const to24Hour = (hour12, minute, period) => {
    let h = parseInt(hour12, 10);
    if (period === 'AM') { if (h === 12) h = 0; } else if (h !== 12) h += 12;
    return `${String(h).padStart(2, '0')}:${minute}`;
};

const DEFAULT_FORM = { date: '', startHour: '9', startMinute: '00', startPeriod: 'AM', endHour: '10', endMinute: '00', endPeriod: 'AM', room: '' };

const TimePick = ({ label, prefix, form, setForm }) => (
    <div>
        <FieldLabel htmlFor={`${prefix}-h`}>{label}</FieldLabel>
        <div className="flex gap-2">
            <select id={`${prefix}-h`} aria-label={`${label} hour`} value={form[`${prefix}Hour`]} onChange={(e) => setForm({ ...form, [`${prefix}Hour`]: e.target.value })} className={modalSelectCls}>{HOURS_12.map((h) => <option key={h} value={h}>{h}</option>)}</select>
            <select aria-label={`${label} minute`} value={form[`${prefix}Minute`]} onChange={(e) => setForm({ ...form, [`${prefix}Minute`]: e.target.value })} className={modalSelectCls}>{MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}</select>
            <select aria-label={`${label} AM or PM`} value={form[`${prefix}Period`]} onChange={(e) => setForm({ ...form, [`${prefix}Period`]: e.target.value })} className={modalSelectCls}><option>AM</option><option>PM</option></select>
        </div>
    </div>
);

const Inner = ({ userId }) => {
    const { data, loading, error, reload } = useLoad([`/teacher/${userId}/assigned-subjects`, `/teacher/${userId}/insights`]);
    const [search, setSearch] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [semFilter, setSemFilter] = useState('');
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    const subjects = data ? data[0] : [];
    const insights = data ? data[1] : null;
    const att = new Map((insights?.analytics?.attendanceBySubject || []).map((a) => [a.subject_id, a.percent]));
    const marks = new Map((insights?.analytics?.marksBySubject || []).map((m) => [m.subject_id, m]));
    const courses = [...new Set(subjects.map((s) => s.course_name).filter(Boolean))].sort();
    const sems = [...new Set(subjects.map((s) => s.semester))].sort((a, b) => a - b);
    const term = search.trim().toLowerCase();
    const shown = subjects.filter((s) =>
        (!courseFilter || s.course_name === courseFilter) && (!semFilter || String(s.semester) === semFilter) &&
        (!term || [s.subject_name, s.subject_code, s.course_name].some((v) => (v || '').toLowerCase().includes(term))));
    const students = subjects.reduce((n, s) => n + (Number(s.enrolled_count) || 0), 0);

    const openSchedule = (s) => { setSelected(s); setForm({ ...DEFAULT_FORM, date: new Date().toLocaleDateString('en-CA') }); setFormError(''); };

    const submit = async (e) => {
        e.preventDefault();
        const start = to24Hour(form.startHour, form.startMinute, form.startPeriod);
        const end = to24Hour(form.endHour, form.endMinute, form.endPeriod);
        if (end <= start) return setFormError('The class must end after it starts.');
        setSaving(true); setFormError('');
        try {
            await api.post('/teacher/schedule-class', { userId, subjectId: selected.id, date: form.date, startTime: start, endTime: end, room: form.room });
            toast.success(`Scheduled ${selected.subject_name}.`);
            setSelected(null);
        } catch (err) {
            setFormError(err.response?.data?.error || 'Could not schedule the class.');
        } finally { setSaving(false); }
    };

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <ListHeader title="My subjects" line={data ? `${plural(subjects.length, 'subject')} · ${plural(students, 'student')} enrolled` : 'Your assigned curriculum.'} />
            <LoadState loading={loading} error={error} onRetry={reload}>
                <FilterBar search={search} onSearch={setSearch} placeholder="Search subject, code or course" noun="subjects"
                    shown={shown.length} total={subjects.length} onClear={() => { setSearch(''); setCourseFilter(''); setSemFilter(''); }}
                    filters={[
                        ...(courses.length > 1 ? [{ id: 'course', label: 'Course', value: courseFilter, onChange: setCourseFilter, options: courses.map((c) => ({ value: c, label: c })) }] : []),
                        ...(sems.length > 1 ? [{ id: 'sem', label: 'Semester', value: semFilter, onChange: setSemFilter, options: sems.map((n) => ({ value: String(n), label: `Semester ${n}` })) }] : [])
                    ]} />
                {shown.length === 0 ? (
                    <p className="py-16 text-center text-slate-500 dark:text-slate-400 font-semibold bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[28px]">
                        {subjects.length ? 'No subject matches these filters.' : 'No subjects are assigned to you yet.'}
                    </p>
                ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {shown.map((s) => {
                            const a = att.get(s.id); const m = marks.get(s.id);
                            return (
                                <li key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 shadow-sm flex flex-col gap-4">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.subject_code}</p>
                                        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-snug mt-1">{s.subject_name}</h2>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{s.course_name} · Semester {s.semester}</p>
                                    </div>
                                    <dl className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                                        <div className="flex justify-between py-2"><dt className="text-slate-600 dark:text-slate-300">Students enrolled</dt><dd className="font-bold text-slate-900 dark:text-slate-100">{s.enrolled_count}</dd></div>
                                        <div className="flex justify-between py-2"><dt className="text-slate-600 dark:text-slate-300">Average attendance</dt><dd className={`font-bold ${a !== undefined && a !== null && a < 75 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>{a !== undefined && a !== null ? `${a}%` : '-'}</dd></div>
                                        <div className="flex justify-between py-2"><dt className="text-slate-600 dark:text-slate-300">Average marks</dt><dd className="font-bold text-slate-900 dark:text-slate-100">{m ? `${m.average}%` : '-'}</dd></div>
                                    </dl>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-auto">
                                        <button type="button" onClick={() => openSchedule(s)} className="inline-flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4 py-2"><CalendarPlus size={16} aria-hidden="true" /> Schedule class</button>
                                        <Link to="/teacher/attendance" className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">Attendance →</Link>
                                        <Link to="/teacher/marks" className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">Marks →</Link>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </LoadState>

            <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Schedule class" subtitle={selected?.subject_name}>
                <form onSubmit={submit} className="space-y-4">
                    <FormError message={formError} />
                    <FormInput label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <TimePick label="Start time" prefix="start" form={form} setForm={setForm} />
                        <TimePick label="End time" prefix="end" form={form} setForm={setForm} />
                    </div>
                    <FormInput label="Room / Venue" required placeholder="e.g. Lab 4" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
                    <ModalActions onCancel={() => setSelected(null)} busy={saving} submitLabel="Confirm schedule" busyLabel="Scheduling…" />
                </form>
            </Modal>
        </div>
    );
};

const TeacherSubjects = () => {
    const { user } = useAuth();
    if (!user?.id) return null;
    return <Inner key={user.id} userId={user.id} />;
};

export default TeacherSubjects;
