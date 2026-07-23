import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, KeyRound, Search } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import toast from 'react-hot-toast';

const AdminTeachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacherId, setEditingTeacherId] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '', email: '', employee_id: '', department: '', 
        qualification: '', designation: 'Assistant Professor', password: ''
    });

    const fetchData = async () => {
        try {
            const [teacherRes, courseRes] = await Promise.all([
                api.get('/teachers'),
                api.get('/courses')
            ]);
            
            setTeachers(teacherRes.data);
            const uniqueDepts = [...new Set(courseRes.data.map(c => c.department))];
            setDepartments(uniqueDepts);
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filteredTeachers = teachers.filter(t => 
        t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openEditModal = (teacher) => {
        setEditingTeacherId(teacher.teacher_id);
        setFormData({ ...teacher, password: '' });
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTeacherId) {
                await api.put(`/teachers/${editingTeacherId}`, formData);
            } else {
                await api.post('/teachers', formData);
            }
            setIsModalOpen(false);
            fetchData();
            setEditingTeacherId(null);
            setFormData({ full_name: '', email: '', employee_id: '', department: '', qualification: '', designation: 'Assistant Professor', password: '' });
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Failed to submit form";
            toast.error("Error: " + errorMsg);
            console.error("Submit error:", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Remove this faculty member?")) {
            try {
                await api.delete(`/teachers/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete failed:", error);
            }
        }
    };

    const columns = [
        { header: "Emp ID", accessor: "employee_id" },
        { 
            header: "Faculty Profile", 
            accessor: "full_name",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{row.full_name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{row.email}</div>
                </div>
            )
        },
        { header: "Department", accessor: "department" },
        { header: "Designation", accessor: "designation" },
        {
            header: "Actions",
            accessor: "actions",
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => openEditModal(row)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(row.teacher_id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg">
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Faculty Management</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage teaching staff and department assignments.</p>
                </div>
                
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search Name or Employee ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none shadow-sm transition-all"
                    />
                </div>
                <button 
                    onClick={() => { setEditingTeacherId(null); setFormData({full_name:'', email:'', employee_id:'', department:'', qualification:'', designation:'Assistant Professor', password:''}); setIsModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                >
                    <Plus size={18} /> Add Faculty
                </button>
            </header>

            <Table columns={columns} data={filteredTeachers} pageSize={5} />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTeacherId ? 'Edit Faculty Record' : 'Register New Faculty'}>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Full Name" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
                        <Input label="Employee ID" value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} required />
                        <Input label="Email Address" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Department</label>
                            <select 
                                required
                                value={formData.department} 
                                onChange={(e) => setFormData({...formData, department: e.target.value})} 
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm outline-none"
                            >
                                <option value="">-- Select Dept --</option>
                                {departments.map((dept, idx) => <option key={idx} value={dept}>{dept}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Designation</label>
                            <select value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm">
                                <option value="Professor">Professor</option>
                                <option value="Assistant Professor">Assistant Professor</option>
                                <option value="Guest Lecturer">Guest Lecturer</option>
                            </select>
                        </div>
                        <Input label="Qualification" value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} required />
                    </div>
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/40 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/50">
                        <h4 className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2"><KeyRound size={14} /> Security</h4>
                        <Input label="Password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder={editingTeacherId ? "Leave blank to keep current" : "Set initial password"} required={!editingTeacherId} />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95">
                        {editingTeacherId ? 'Save Changes' : 'Register Faculty'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default AdminTeachers;