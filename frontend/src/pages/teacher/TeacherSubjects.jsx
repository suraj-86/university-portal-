import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Search, CalendarPlus } from 'lucide-react';
import StatsWidget from '../../components/StatsWidget';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import useAuth from '../../hooks/useAuth';

const TeacherSubjects = () => {
    const { user } = useAuth();

    // --- 1. STATE LOGIC ---
    const [searchTerm, setSearchTerm] = useState('');
    const [assignedSubjects, setAssignedSubjects] = useState([]);
      
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [scheduleForm, setScheduleForm] = useState({ date: '', startTime: '', endTime: '', room: '' });

    // --- FETCH LIVE DATA ---
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!user?.id) return;
            try {
                const response = await fetch(`http://localhost:5000/api/teacher/${user.id}/assigned-subjects`);
                const data = await response.json();
                
                // Map the dynamic 'enrolled_count' from our new SQL query
                const formattedData = data.map(sub => ({
                    id: sub.id,
                    code: sub.subject_code,
                    name: sub.subject_name,
                    course: sub.course_name,
                    semester: sub.semester,
                    type: sub.type || 'Theory',
                    credits: sub.credits || 4,
                    enrolled_students: sub.enrolled_count // NOW DYNAMIC
                }));
                
                setAssignedSubjects(formattedData);
            } catch (error) {
                console.error("Error fetching subjects:", error);
            }
        };
        fetchSubjects();
    }, [user]);

    // Calculate Total Unique Students across all assigned subjects
    const totalStudents = assignedSubjects.reduce((acc, curr) => acc + curr.enrolled_students, 0);

    const filteredSubjects = assignedSubjects.filter(subject => 
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.course.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- 2. HANDLERS ---
    const handleOpenModal = (subject) => {
        setSelectedSubject(subject);
        
        // FIX: Gets local timezone date in YYYY-MM-DD format
        const today = new Date().toLocaleDateString('en-CA'); 
        
        setScheduleForm({ date: today, startTime: '', endTime: '', room: '' });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSubject(null);
        setScheduleForm({ date: '', startTime: '', endTime: '', room: '' });
    };

    // The fixed handler that saves the schedule to the database!
    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const response = await fetch('http://localhost:5000/api/teacher/schedule-class', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id, // Passes your login ID safely to the backend
                    subjectId: selectedSubject.id,
                    date: scheduleForm.date,
                    startTime: scheduleForm.startTime,
                    endTime: scheduleForm.endTime,
                    room: scheduleForm.room
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Successfully scheduled ${selectedSubject.name}!`);
                handleCloseModal(); // Closes modal and resets form
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Scheduling error:", error);
            alert("Network error occurred while trying to schedule the class.");
        }
    };

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans relative">
            <header className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">My Subjects</h2>
                <p className="text-slate-500 mt-1">Manage your assigned curriculum and schedule daily classes.</p>
            </header>

            {/* TOP MACRO METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsWidget 
                    title="ASSIGNED SUBJECTS" 
                    value={assignedSubjects.length} 
                    icon={<BookOpen size={24} />} 
                />
                <StatsWidget 
                    title="TOTAL STUDENTS" 
                    value={totalStudents}
                    icon={<Users size={24} />} 
                />
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
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={handleCloseModal} 
                    title="Schedule Class" 
                    subtitle={selectedSubject?.name}
                >
                    <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-5">
                        <FormInput 
                            label="Date" 
                            type="date" 
                            required 
                            value={scheduleForm.date} 
                            onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})} 
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Start Time" type="time" required value={scheduleForm.startTime} onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})} />
                            <FormInput label="End Time" type="time" required value={scheduleForm.endTime} onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})} />
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