import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit2, Trash2, Clock3, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import CsvImportModal from '../../components/CsvImportModal';

const TT_HEADERS = ['course_code', 'semester', 'subject_code', 'day', 'start_time', 'end_time', 'room'];
const TT_SAMPLE = 'course_code,semester,subject_code,day,start_time,end_time,room\nBCA,1,CS101,Monday,09:00,10:00,Room 12\n';
const timeOk = (t) => /^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i.test(t);
const ttMapRow = (o) => {
    if (!o.subject_code) return { error: 'Subject code is required.' };
    if (!o.day) return { error: 'Day is required.' };
    if (!timeOk(o.start_time) || !timeOk(o.end_time)) return { error: 'Times must look like 09:00 or 9:00 AM.' };
    if (!o.room) return { error: 'Room is required.' };
    return { value: { ...o } };
};
import TimetableView, { DAYS } from '../../components/TimetableView';

const EMPTY = { subject_id: '', day: 'Monday', start_time: '09:00', end_time: '10:00', room: '' };
const selectCls = 'w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none';
const topSelectCls = 'py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none';

const AdminTimetable = () => {
    const [courses, setCourses] = useState([]);
    const [importOpen, setImportOpen] = useState(false);
    const [allSubjects, setAllSubjects] = useState([]);
    const [courseId, setCourseId] = useState('');
    const [semester, setSemester] = useState('');
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const [c, s] = await Promise.all([api.get('/courses'), api.get('/subjects')]);
                setCourses(c.data || []);
                setAllSubjects(s.data || []);
            } catch (e) {
                toast.error('Could not load courses and subjects.');
            }
        })();
    }, []);

    const course = courses.find((c) => String(c.id) === String(courseId));
    const semesterOptions = course ? Array.from({ length: course.total_semesters }, (_, i) => i + 1) : [];

    const subjects = useMemo(() => {
        const seen = new Map();
        allSubjects
            .filter((s) => String(s.course_id) === String(courseId) && String(s.semester) === String(semester))
            .forEach((s) => { if (!seen.has(s.id)) seen.set(s.id, s); });
        return [...seen.values()];
    }, [allSubjects, courseId, semester]);

    const load = useCallback(async () => {
        if (!courseId || !semester) { setSlots([]); return; }
        setLoading(true);
        try {
            const res = await api.get(`/timetable?course_id=${courseId}&semester=${semester}`);
            setSlots(res.data || []);
        } catch (e) {
            toast.error('Could not load the timetable.');
        } finally {
            setLoading(false);
        }
    }, [courseId, semester]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setEditingId(null); setForm({ ...EMPTY, day: 'Every day', subject_id: subjects[0]?.id || '' }); setFormError(''); setModalOpen(true); };
    const openEdit = (s) => {
        setEditingId(s.id);
        setForm({ subject_id: s.subject_id, day: s.day, start_time: s.start_time, end_time: s.end_time, room: s.room });
        setFormError('');
        setModalOpen(true);
    };

    const submit = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            let res;
            if (editingId) await api.put(`/timetable/${editingId}`, form);
            else res = await api.post('/timetable', form);
            toast.success(editingId ? 'Entry updated.' : res?.data?.created ? `Added for all ${res.data.created} days.` : 'Entry added.');
            setModalOpen(false);
            load();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Could not save the entry.');
        }
    };

    const remove = async (s) => {
        if (!window.confirm(`Remove ${s.subject_code} on ${s.day} ${s.start_time}-${s.end_time}?`)) return;
        try { await api.delete(`/timetable/${s.id}`); toast.success('Entry removed.'); load(); }
        catch (err) { toast.error(err.response?.data?.error || 'Could not remove the entry.'); }
    };

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Timetable Management</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Build the fixed timetable for a course and semester. Students, parents and teachers see it automatically.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setSemester(''); }} className={topSelectCls}>
                        <option value="">Select course</option>
                        {courses.map((c) => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                    </select>
                    <select value={semester} onChange={(e) => setSemester(e.target.value)} disabled={!courseId} className={`${topSelectCls} disabled:opacity-50`}>
                        <option value="">Select semester</option>
                        {semesterOptions.map((n) => <option key={n} value={n}>Semester {n}</option>)}
                    </select>
                    <button onClick={() => setImportOpen(true)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-5 rounded-2xl shadow-sm flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap">
                        <UploadCloud size={18} /> Import Excel/CSV
                    </button>
                    <button onClick={openAdd} disabled={!courseId || !semester || subjects.length === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2">
                        <Plus size={18} /> Add Class
                    </button>
                </div>
            </header>

            {!courseId || !semester ? (
                <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[28px] bg-white dark:bg-slate-900">
                    <Clock3 size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Select a course and semester to manage its timetable.</p>
                </div>
            ) : loading ? (
                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading timetable...</div>
            ) : (
                <>
                    {subjects.length === 0 && (
                        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 text-sm font-bold">
                            No subjects exist for this course and semester. Add subjects (and assign faculty) under Subjects first.
                        </div>
                    )}
                    <TimetableView
                        slots={slots}
                        renderActions={(s) => (
                            <>
                                <button onClick={() => openEdit(s)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"><Edit2 size={16} /></button>
                                <button onClick={() => remove(s)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"><Trash2 size={16} /></button>
                            </>
                        )}
                    />
                </>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Class' : 'Add Class'}>
                <form onSubmit={submit} className="space-y-5">
                    {formError && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-sm font-bold">{formError}</div>}
                    <div className="space-y-1">
                        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Subject</span>
                        <select required value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className={selectCls}>
                            <option value="" disabled>Select subject</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}{s.teacher_name ? ` (${s.teacher_name})` : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Day</span>
                        <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} className={selectCls}>
                            {!editingId && <option value="Every day">Every day (Monday to Friday)</option>}
                            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        {!editingId && form.day === 'Every day' && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Adds this class at the same time and room on all five days. If any day clashes, nothing is added.</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Start Time" type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                        <Input label="End Time" type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                    </div>
                    <Input label="Room" required value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 204 / Lab 4" />
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg">
                        {editingId ? 'Save Changes' : 'Add to Timetable'}
                    </button>
                </form>
            </Modal>

            <CsvImportModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                title="Import Timetable"
                headers={TT_HEADERS}
                required={['subject_code', 'day', 'start_time', 'end_time', 'room']}
                aliases={{ subject_code: ['subject', 'code'], day: ['weekday'], start_time: ['start', 'from'], end_time: ['end', 'to'], room: ['room_no', 'venue'], semester: ['sem'], course_code: ['course'] }}
                sample={TT_SAMPLE}
                templateName="timetable_template.csv"
                mapRow={ttMapRow}
                previewKeys={['subject_code', 'day', 'start_time', 'end_time', 'room']}
                maxRows={300}
                note="Day is Monday to Friday (or Every day). course_code and semester are optional and only used to double-check the subject. Every slot goes through the same clash checks as adding one by hand; existing slots are not changed."
                onPreview={(rows) => api.post('/timetable/import', { rows, dry_run: true })}
                onSubmit={(rows) => api.post('/timetable/import', { rows })}
                onDone={() => { setImportOpen(false); load(); }}
            />
        </div>
    );
};

export default AdminTimetable;
