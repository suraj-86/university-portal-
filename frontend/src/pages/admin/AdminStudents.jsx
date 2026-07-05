import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck, Search } from 'lucide-react'; // Added Search icon
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';

const AdminStudents = () => {
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]); // State for dynamic course list
    const [searchTerm, setSearchTerm] = useState(''); // Added search state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudentId, setEditingStudentId] = useState(null);
    
    // Updated formData to include course_id
    const [formData, setFormData] = useState({
        name: '', email: '', roll: '', course_id: '', semester: 1, password: ''
    });

    // --- 1. THE DATA BRIDGE (Fetch Students and Courses) ---
    // --- 1. THE DATA BRIDGE (Fetch Students and Courses) ---
const fetchData = async () => {
    try {
        const studentRes = await fetch('http://localhost:5000/api/students');
        const studentData = await studentRes.json();
        
        const courseRes = await fetch('http://localhost:5000/api/courses');
        const courseData = await courseRes.json();

        setStudents(studentData.map(s => ({
            id: s.student_id,
            user_id: s.user_id,         // FIX: Added for deletion
            course_id: s.course_id,     // FIX: Added for edit form validation
            roll: s.enrollment_number,
            name: s.full_name,
            email: s.email,
            course: s.course_name || "N/A", 
            semester: s.semester,
            status: s.status || "Active"
        })));
        
        setCourses(courseData);
    } catch (error) {
        console.error("Connection failed:", error);
    }
};

    useEffect(() => {
        fetchData();
    }, []);

    // --- NEW SEARCH FILTER LOGIC ---
    // Filters students based on name or enrollment number (roll)
    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.roll.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- 2. ACTIONS (Submit & Delete) ---
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const url = editingStudentId 
            ? `http://localhost:5000/api/students/${editingStudentId}` 
            : 'http://localhost:5000/api/students';
        
        const method = editingStudentId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchData(); // Refresh data
                setEditingStudentId(null);
            } else {
                const result = await response.json();
                alert("Error: " + result.error);
            }
        } catch (error) {
            console.error("Submit failed:", error);
        }
    };

    const handleDelete = async (userId) => {
    if (window.confirm("Delete this student record?")) {
        try {
            // We pass the user_id directly to the backend
            const response = await fetch(`http://localhost:5000/api/students/${userId}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                fetchData(); // Refresh the table
            } else {
                console.error("Failed to delete from server.");
            }
        } catch (error) {
            console.error("Delete failed:", error);
        }
    }
};

    const openEditModal = (student) => {
        setEditingStudentId(student.id);
        setFormData({ ...student, password: '' });
        setIsModalOpen(true);
    };

    const columns = [
        { header: "Enrollment No", accessor: "roll" },
        { 
            header: "Student Name", 
            accessor: "name",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-900">{row.name}</div>
                    <div className="text-[10px] text-slate-500">{row.email}</div>
                </div>
            )
        },
        { header: "Course", accessor: "course" },
        { header: "Semester", accessor: "semester" },
        {
            header: "Actions",
            accessor: "actions",
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => openEditModal(row)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 size={16} />
                    </button>
                    <button 
    onClick={() => handleDelete(row.user_id)} 
    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
>
    <Trash2 size={16} />
</button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Student Directory</h2>
                    <p className="text-slate-500 mt-1 font-medium">Manage enrollments and academic records.</p>
                </div>

                {/* --- SEARCH BAR UI --- */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search Name or Enrollment..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-200 outline-none shadow-sm transition-all"
                    />
                </div>

                <button 
                    onClick={() => { 
                        setEditingStudentId(null); 
                        setFormData({name:'', email:'', roll:'', course_id:'', semester:1, password:''}); 
                        setIsModalOpen(true); 
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                >
                    <Plus size={18} /> Add Student
                </button>
            </header>

            {/* Use filteredStudents instead of students */}
            <Table columns={columns} data={filteredStudents} pageSize={5} />

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={editingStudentId ? 'Edit Student Record' : 'Register New Student'}
            >
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Full Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Suraj Kumar" required />
                        <Input label="Enrollment No." value={formData.roll} onChange={(e) => setFormData({...formData, roll: e.target.value})} placeholder="ENR2026" required />
                        <Input label="Email Address" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="suraj@email.com" required />
                        
                        {/* DYNAMIC SELECT BOX */}
                        <div className="space-y-1">
                            <span className="mb-2 block text-sm font-medium text-slate-700">Assign Course</span>
                            <select 
                                required
                                value={formData.course_id} 
                                onChange={(e) => setFormData({...formData, course_id: e.target.value})} 
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-sky-200 outline-none"
                            >
                                <option value="">-- Select Course --</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.course_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
                        <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <ShieldCheck size={14} /> Account Security
                        </h4>
                        <Input 
                            label="Login Password" 
                            type="password" 
                            value={formData.password} 
                            onChange={(e) => setFormData({...formData, password: e.target.value})} 
                            placeholder={editingStudentId ? "Leave blank to keep current" : "Set initial password"}
                            required={!editingStudentId}
                        />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-lg transition-all active:scale-95">
                        {editingStudentId ? 'Save Changes' : 'Create Account'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default AdminStudents;