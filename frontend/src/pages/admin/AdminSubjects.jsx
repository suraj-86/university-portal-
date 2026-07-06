import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserCheck, BookOpen } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import toast from 'react-hot-toast';

const AdminSubjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubId, setEditingSubId] = useState(null);
    
    const [formData, setFormData] = useState({
        subject_code: '', subject_name: '', course_id: '', semester: '', 
        subject_type: 'Core', credits: 3, teacher_id: '' 
    });

    const selectedCourse = courses.find(c => c.id === parseInt(formData.course_id));
    const maxSemesters = selectedCourse ? selectedCourse.total_semesters : 8;

    const fetchData = async () => {
        try {
            const [subRes, courseRes, teacherRes] = await Promise.all([
                api.get('/subjects'),
                api.get('/courses'),
                api.get('/teachers')
            ]);
            setSubjects(subRes.data);
            setCourses(courseRes.data);
            setTeachers(teacherRes.data);
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSubId) {
                await api.put(`/subjects/${editingSubId}`, formData);
            } else {
                await api.post('/subjects', formData);
            }
            
            setIsModalOpen(false);
            fetchData();
            setEditingSubId(null);
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Failed to update subject";
            toast.error("Update failed: " + errorMsg);
            console.error("Network error:", error);
        }
    };

    const openEditModal = (sub) => {
        setEditingSubId(sub.id);
        setFormData({ 
            subject_code: sub.subject_code,
            subject_name: sub.subject_name,
            course_id: sub.course_id,
            semester: sub.semester,
            subject_type: sub.subject_type,
            credits: sub.credits,
            teacher_id: sub.teacher_id || '' 
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete subject?")) {
            try {
                await api.delete(`/subjects/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete error:", error);
            }
        }
    };

    const columns = [
        { header: "Code", accessor: "subject_code" },
        { 
            header: "Subject Details", 
            accessor: "subject_name",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-900">{row.subject_name}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{row.course_name}   Sem {row.semester}</div>
                </div>
            )
        },
        { header: "Faculty", accessor: "teacher_name" },
        {
            header: "Actions",
            accessor: "id",
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => openEditModal(row)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
            <header className="mb-8 flex justify-between items-end">
                <h2 className="text-3xl font-bold text-slate-900">Subject Directory</h2>
                <button onClick={() => { setEditingSubId(null); setFormData({subject_code:'', subject_name:'', course_id:'', semester:'', subject_type:'Core', credits:3, teacher_id:''}); setIsModalOpen(true); }} className="bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-2xl flex items-center gap-2">
                    <Plus size={18} /> Add Subject
                </button>
            </header>

            <Table columns={columns} data={subjects} pageSize={5} />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSubId ? 'Edit Subject' : 'New Subject'}>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Subject Name" value={formData.subject_name} onChange={(e) => setFormData({...formData, subject_name: e.target.value})} required />
                        <Input label="Subject Code" value={formData.subject_code} onChange={(e) => setFormData({...formData, subject_code: e.target.value.toUpperCase()})} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Course</label>
                            <select required value={formData.course_id} onChange={(e) => setFormData({...formData, course_id: e.target.value, semester: ''})} className="w-full rounded-2xl border border-slate-300 p-3 text-sm">
                                <option value="">Select Course</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Semester</label>
                            <select required value={formData.semester} onChange={(e) => setFormData({...formData, semester: e.target.value})} className="w-full rounded-2xl border border-slate-300 p-3 text-sm">
                                <option value="">Select Sem</option>
                                {Array.from({ length: maxSemesters }, (_, i) => i + 1).map(num => (
                                    <option key={num} value={num}>Semester {num}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100">
                        <label className="mb-2 block text-sm font-medium text-slate-700">Appoint Teacher</label>
                        <select required value={formData.teacher_id} onChange={(e) => setFormData({...formData, teacher_id: e.target.value})} className="w-full rounded-2xl border border-slate-300 p-3 text-sm">
                            <option value="">Select Teacher</option>
                            {teachers.map(t => <option key={t.teacher_id} value={t.teacher_id}>{t.full_name}</option>)}
                        </select>
                    </div>

                    <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg">
                        {editingSubId ? 'Update Assignment' : 'Create Subject'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default AdminSubjects;