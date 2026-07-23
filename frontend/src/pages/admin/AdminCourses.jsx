import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GraduationCap } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import toast from 'react-hot-toast';

const AdminCourses = () => {
    const [courses, setCourses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState(null);
    const [formData, setFormData] = useState({
        course_code: '', course_name: '', department: 'Computer Science', duration_years: 3, total_semesters: 6
    });

    const fetchCourses = async () => {
        try {
            const response = await api.get('/courses');
            setCourses(response.data);
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this course?")) {
            try {
                await api.delete(`/courses/${id}`);
                fetchCourses();
            } catch (error) {
                console.error("Delete error:", error);
            }
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCourseId) {
                await api.put(`/courses/${editingCourseId}`, formData);
            } else {
                await api.post('/courses', formData);
            }
            
            setIsModalOpen(false);
            fetchCourses();
            setEditingCourseId(null);
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Failed to save course";
            toast.error("Error saving course: " + errorMsg);
            console.error("Submit error:", error);
        }
    };

    const columns = [
        { header: "Code", accessor: "course_code" },
        { 
            header: "Course Name", 
            accessor: "course_name",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{row.course_name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">{row.department}</div>
                </div>
            )
        },
        { 
            header: "Duration", 
            accessor: "duration_years",
            cell: (row) => <span className="text-slate-600 dark:text-slate-300 font-medium">{row.duration_years} Years ({row.total_semesters} Sem)</span>
        },
        {
            header: "Actions",
            accessor: "actions",
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => openEditModal(row)} className="p-2 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    const openEditModal = (course) => {
        setEditingCourseId(course.id);
        setFormData({ ...course });
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Course Catalog</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage degree programs and academic structures.</p>
                </div>
                <button 
                    onClick={() => { 
                        setEditingCourseId(null); 
                        setFormData({course_code: '', course_name: '', department: 'Computer Science', duration_years: 3, total_semesters: 6}); 
                        setIsModalOpen(true); 
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={18} /> New Course
                </button>
            </header>

            <Table columns={columns} data={courses} pageSize={5} />

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                title={editingCourseId ? 'Edit Course Program' : 'Create New Program'}
            >
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Course Code" value={formData.course_code} onChange={(e) => setFormData({...formData, course_code: e.target.value.toUpperCase()})} placeholder="e.g. BCA" required />
                        <Input label="Department" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} placeholder="Computer Science" required />
                    </div>
                    
                    <Input label="Full Course Name" value={formData.course_name} onChange={(e) => setFormData({...formData, course_name: e.target.value})} placeholder="Bachelor of Computer Applications" required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Duration (Years)" type="number" value={formData.duration_years} onChange={(e) => setFormData({...formData, duration_years: e.target.value})} required />
                        <Input label="Total Semesters" type="number" value={formData.total_semesters} onChange={(e) => setFormData({...formData, total_semesters: e.target.value})} required />
                    </div>
                    <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-4 rounded-2xl hover:bg-cyan-700 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                        <GraduationCap size={18} /> {editingCourseId ? 'Save Changes' : 'Create Course'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default AdminCourses;