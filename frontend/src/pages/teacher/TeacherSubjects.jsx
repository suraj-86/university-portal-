import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Search, CalendarPlus } from 'lucide-react';
import api from '../../services/api';
import StatsWidget from '../../components/StatsWidget';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

// --- AM/PM TIME HELPERS ---
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // 00,05,...55

// Converts 12-hour parts (hour, minute, AM/PM) into a 24-hour "HH:MM" string for the backend
const to24Hour = (hour12, minute, period) => {
    let h = parseInt(hour12, 10);
    if (period === 'AM') {
        if (h === 12) h = 0;
    } else {
        if (h !== 12) h += 12;
    }
    return `${String(h).padStart(2, '0')}:${minute}`;
};

// Converts a 24-hour "HH:MM" string into 12-hour parts (useful if pre-filling an edit form later)
const to12Hour = (time24) => {
    if (!time24) return { hour: '9', minute: '00', period: 'AM' };
    let [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour: String(hour12), minute: String(m).padStart(2, '0'), period };
};

const DEFAULT_SCHEDULE_FORM = {
    date: '',
    startHour: '9', startMinute: '00', startPeriod: 'AM',
    endHour: '10', endMinute: '00', endPeriod: 'AM',
    room: ''
};

const TeacherSubjects = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [assignedSubjects, setAssignedSubjects] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [scheduleForm, setScheduleForm] = useState(DEFAULT_SCHEDULE_FORM);

    useEffect(() => {
        const fetchSubjects = async () => {
            if (!user?.id) return;
            try {
                const response = await api.get(`/teacher/${user.id}/assigned-subjects`);
                
                const formattedData = response.data.map(sub => ({
                    id: sub.id,
                    code: sub.subject_code,
                    name: sub.subject_name,
                    course: sub.course_name,
                    semester: sub.semester,
                    type: sub.type || 'Theory',
                    credits: sub.credits || 4,
                    enrolled_students: sub.enrolled_count 
                }));
                
                setAssignedSubjects(formattedData);
            } catch (error) {
                console.error("Error fetching subjects:", error);
            }
        };
        fetchSubjects();
    }, [user]);

    const totalStudents = assignedSubjects.reduce((acc, curr) => acc + curr.enrolled_students, 0);

    const filteredSubjects = assignedSubjects.filter(subject => 
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.course.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenModal = (subject) => {
        setSelectedSubject(subject);
        const today = new Date().toLocaleDateString('en-CA');          
        setScheduleForm({ ...DEFAULT_SCHEDULE_FORM, date: today });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSubject(null);
        setScheduleForm(DEFAULT_SCHEDULE_FORM);
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();

        const startTime24 = to24Hour(scheduleForm.startHour, scheduleForm.startMinute, scheduleForm.startPeriod);
        const endTime24 = to24Hour(scheduleForm.endHour, scheduleForm.endMinute, scheduleForm.endPeriod);
        
        try {
            await api.post('/teacher/schedule-class', {
                userId: user.id, 
                subjectId: selectedSubject.id,
                date: scheduleForm.date,
                startTime: startTime24,
                endTime: endTime24,
                room: scheduleForm.room
            });
            toast.success(`Successfully scheduled ${selectedSubject.name}!`);
            handleCloseModal(); 
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Network error occurred.";
            toast.error(`Error: ${errorMsg}`);
            console.error("Scheduling error:", error);
        }
    };

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans relative">
            <header className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">My Subjects</h2>
                <p className="text-slate-500 mt-1">Manage your assigned curriculum and schedule daily classes.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsWidget title="ASSIGNED SUBJECTS" value={assignedSubjects.length} icon={<BookOpen size={24} />} />
                <StatsWidget title="TOTAL STUDENTS" value={totalStudents} icon={<Users size={24} />} />
            </div>

            <div className="mb-6 relative w-full md:w-96">
                <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search your subjects..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm bg-white font-medium text-slate-700"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubjects.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-500 font-bold">
                        No subjects found.
                    </div>
                ) : (
                    filteredSubjects.map(subject => (
                        <div key={subject.id} className="bg-white rounded-[24px] shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group">
                            
                            <div className="p-6 border-b border-slate-100 relative overflow-hidden bg-slate-50/50">
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                                        {subject.code}
                                    </span>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                        {subject.type}
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors relative z-10">
                                    {subject.name}
                                </h3>
                                <p className="text-slate-500 font-bold text-xs relative z-10">
                                    {subject.course} • Sem {subject.semester} • {subject.credits} Credits
                                </p>
                            </div>
                            
                            <div className="p-6 grow flex justify-center text-sm font-medium text-slate-600">
                                <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center flex flex-col items-center justify-center">
                                    <Users size={24} className="text-slate-400 mb-2" />
                                    <div className="font-black text-slate-900 text-2xl">
                                        {subject.enrolled_students} 
                                    </div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Students Enrolled</div>
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-slate-100 bg-white">
                                <button 
                                    onClick={() => handleOpenModal(subject)}
                                    className="w-full py-3 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <CalendarPlus size={18} /> Schedule Class
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Schedule Class" subtitle={selectedSubject?.name}>
                    <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-5">
                        <FormInput label="Date" type="date" required value={scheduleForm.date} onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})} />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Start Time</label>
                                <div className="flex gap-2">
                                    <select
                                        value={scheduleForm.startHour}
                                        onChange={(e) => setScheduleForm({...scheduleForm, startHour: e.target.value})}
                                        className="w-1/3 rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        {HOURS_12.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <select
                                        value={scheduleForm.startMinute}
                                        onChange={(e) => setScheduleForm({...scheduleForm, startMinute: e.target.value})}
                                        className="w-1/3 rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <select
                                        value={scheduleForm.startPeriod}
                                        onChange={(e) => setScheduleForm({...scheduleForm, startPeriod: e.target.value})}
                                        className="w-1/3 rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">End Time</label>
                                <div className="flex gap-2">
                                    <select
                                        value={scheduleForm.endHour}
                                        onChange={(e) => setScheduleForm({...scheduleForm, endHour: e.target.value})}
                                        className="w-1/3 rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        {HOURS_12.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <select
                                        value={scheduleForm.endMinute}
                                        onChange={(e) => setScheduleForm({...scheduleForm, endMinute: e.target.value})}
                                        className="w-1/3 rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <select
                                        value={scheduleForm.endPeriod}
                                        onChange={(e) => setScheduleForm({...scheduleForm, endPeriod: e.target.value})}
                                        className="w-1/3 rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <FormInput label="Room / Venue" type="text" required placeholder="e.g. Lab 4" value={scheduleForm.room} onChange={(e) => setScheduleForm({...scheduleForm, room: e.target.value})} />
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-2 active:scale-95 flex items-center justify-center gap-2">
                            <CalendarPlus size={18} /> Confirm Schedule
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default TeacherSubjects;