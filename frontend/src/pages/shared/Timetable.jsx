import React, { useState, useEffect } from 'react';
import { Clock3 } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import TimetableView from '../../components/TimetableView';
import WardSwitcher from '../../components/parent/WardSwitcher';

const Timetable = () => {
    const { user } = useAuth();
    const role = user?.role;
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [allWards, setAllWards] = useState([]);
    const [selectedWardId, setSelectedWardId] = useState('');
    const [ward, setWard] = useState(null);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                if (role === 'teacher') {
                    const res = await api.get(`/teacher/${user.id}/timetable`);
                    if (!cancelled) setSlots(res.data || []);
                } else if (role === 'student') {
                    const res = await api.get(`/student/${user.id}/timetable`);
                    if (!cancelled) setSlots(res.data || []);
                } else if (role === 'parent') {
                    const url = selectedWardId
                        ? `/parent/${user.id}/wards-overview?student_id=${selectedWardId}`
                        : `/parent/${user.id}/wards-overview`;
                    const overview = (await api.get(url)).data;
                    if (!overview.childProfile) { if (!cancelled) { setSlots([]); setWard(null); } return; }
                    if (cancelled) return;
                    setAllWards(overview.allWards || []);
                    setWard(overview.childProfile);
                    if (!selectedWardId) setSelectedWardId(String(overview.childProfile.student_id));
                    const res = await api.get(`/student/${overview.childProfile.user_id}/timetable`);
                    if (!cancelled) setSlots(res.data || []);
                }
            } catch (e) {
                if (!cancelled) setError(e.response?.data?.error || 'Could not load the timetable.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [user, role, selectedWardId]);

    const first = slots[0];
    const subtitle = role === 'teacher'
        ? 'Your classes across all assigned courses and semesters.'
        : first
            ? `${first.course_name} - Semester ${first.semester}${ward ? ` · ${ward.full_name}` : ''}`
            : 'Your semester timetable.';

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            {role === 'parent' && <WardSwitcher wards={allWards} currentId={selectedWardId} onChange={setSelectedWardId} />}
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Timetable</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
                </div>
                
            </header>

            {loading ? (
                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading timetable...</div>
            ) : error ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-bold text-sm">{error}</div>
            ) : slots.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[28px] bg-white dark:bg-slate-900">
                    <Clock3 size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                        {role === 'teacher' ? 'No timetable entries for your subjects yet.' : 'The timetable has not been published for this semester yet.'}
                    </p>
                </div>
            ) : (
                <TimetableView slots={slots} showCourse={role === 'teacher'} showFaculty={role !== 'teacher'} />
            )}
        </div>
    );
};

export default Timetable;
