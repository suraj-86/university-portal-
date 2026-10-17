import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck, Search, UploadCloud, Download } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import toast from 'react-hot-toast';
import CsvImportModal from '../../components/CsvImportModal';
import { downloadTextFile } from '../../utils/csv';
import { toCSV } from '../../utils/spreadsheet';

const IMPORT_HEADERS = ['enrollment_number', 'name', 'course_code', 'semester', 'roll_number', 'email', 'phone', 'password'];
const IMPORT_ALIASES = {
    enrollment_number: ['enrollment_no', 'enrollment', 'enrolment_number', 'enrolment_no'],
    name: ['full_name', 'student_name'],
    course_code: ['course', 'program', 'programme'],
    semester: ['sem'],
    roll_number: ['roll_no', 'roll'],
    phone: ['phone_number', 'mobile', 'mobile_number']
};
const IMPORT_SAMPLE = 'enrollment_number,name,course_code,semester,roll_number,email,phone,password\nAC-001/24,Asha Verma,BCA,1,2401,asha@example.com,9876543210,\n';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const importMapRow = (o) => {
    if (!o.enrollment_number) return { error: 'Enrollment number is required.' };
    if (!o.name) return { error: 'Name is required.' };
    if (!o.course_code) return { error: 'Course code is required.' };
    if (o.semester && !/^\d{1,2}$/.test(o.semester)) return { error: 'Semester must be a whole number.' };
    if (o.email && !EMAIL_RE.test(o.email)) return { error: 'Email address is not valid.' };
    return { value: { ...o } };
};

const AdminStudents = () => {
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudentId, setEditingStudentId] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [credentials, setCredentials] = useState([]);
    
    const [formData, setFormData] = useState({
        name: '', email: '', enrollment_number: '', roll_number: '', course_id: '', semester: 1, password: ''
    });

    const fetchData = async () => {
        try {
            const [studentRes, courseRes] = await Promise.all([
                api.get('/students'),
                api.get('/courses')
            ]);
            
            setStudents(studentRes.data.map(s => ({
                id: s.student_id,
                user_id: s.user_id,
                course_id: s.course_id,
                enrollment_number: s.enrollment_number,
                roll_number: s.roll_number || '',
                name: s.full_name,
                email: s.email,
                course: s.course_name || "N/A", 
                semester: s.semester,
                status: s.status || "Active"
            })));
            
            setCourses(courseRes.data);
        } catch (error) {
            console.error("Connection failed:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingStudentId) {
                await api.put(`/students/${editingStudentId}`, formData);
            } else {
                await api.post('/students', formData);
            }
            
            setIsModalOpen(false);
            fetchData();
            setEditingStudentId(null);
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Failed to submit form";
            toast.error("Error: " + errorMsg);
            console.error("Submit failed:", error);
        }
    };

    const handleDelete = async (userId) => {
        if (window.confirm("Delete this student record?")) {
            try {
                await api.delete(`/students/${userId}`);
                fetchData();
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
        { header: "Roll No.", accessor: "roll_number" },
        { header: "Enrollment No.", accessor: "enrollment_number" },
        { 
            header: "Student Name", 
            accessor: "name",
            cell: (row) => (
                <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{row.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{row.email}</div>
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
                    <button onClick={() => openEditModal(row)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(row.user_id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg">
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
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Student Directory</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage enrollments and academic records.</p>
                </div>
                
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search Name or Enrollment..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none shadow-sm transition-all"
                    />
                </div>
                <button
                    onClick={() => setImportOpen(true)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-5 rounded-2xl shadow-sm flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                >
                    <UploadCloud size={18} /> Import Excel/CSV
                </button>
                <button 
                    onClick={() => { 
                        setEditingStudentId(null); 
                        setFormData({name:'', email:'', enrollment_number:'', roll_number:'', course_id:'', semester:1, password:''}); 
                        setIsModalOpen(true); 
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                >
                    <Plus size={18} /> Add Student
                </button>
            </header>

            <Table columns={columns} data={filteredStudents} pageSize={5} />

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                title={editingStudentId ? 'Edit Student Record' : 'Register New Student'}
            >
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Full Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full Name" required />
                        <Input label="Enrollment No." value={formData.enrollment_number} onChange={(e) => setFormData({...formData, enrollment_number: e.target.value})} placeholder="AC-000/00" required />
                        <Input label="Roll No." value={formData.roll_number} onChange={(e) => setFormData({...formData, roll_number: e.target.value})} placeholder="e.g. 0000000" required />
                        <Input label="Email Address" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email.com" />
                        
                        <div className="space-y-1">
                            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Assign Course</span>
                            <select 
                                required
                                value={formData.course_id} 
                                onChange={(e) => setFormData({...formData, course_id: e.target.value})} 
                                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm focus:ring-2 focus:ring-sky-200 outline-none"
                            >
                                <option value="">-- Select Course --</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.course_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Semester
                            </span>

                            <select
                                required
                                value={formData.semester}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        semester: Number(e.target.value)
                                    })
                                }
                                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm focus:ring-2 focus:ring-sky-200 outline-none"
                            >
                                {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
                                    <option key={semester} value={semester}>
                                        Semester {semester}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 dark:bg-blue-950/40 p-5 rounded-3xl border border-blue-100 dark:border-blue-900/50">
                        <h4 className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
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

            <CsvImportModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                title="Import Students"
                headers={IMPORT_HEADERS}
                required={['enrollment_number', 'name', 'course_code']}
                aliases={IMPORT_ALIASES}
                sample={IMPORT_SAMPLE}
                templateName="students_template.csv"
                mapRow={importMapRow}
                previewKeys={['enrollment_number', 'name', 'course_code', 'semester']}
                maxRows={300}
                note="course_code is the code on the Courses page (e.g. BCA). A new student without a password gets a random one, shown once after the import. A student whose enrollment number already exists is updated; blank cells keep the current value. Tip: format enrollment, roll and phone columns as Text so leading zeros are kept."
                onPreview={(rows) => api.post('/students/bulk', { rows, dry_run: true })}
                onSubmit={(rows) => api.post('/students/bulk', { rows })}
                onDone={(res) => {
                    setImportOpen(false);
                    fetchData();
                    setCredentials(res?.data?.credentials || []);
                }}
            />

            <Modal isOpen={credentials.length > 0} onClose={() => setCredentials([])} title="New student passwords">
                <div className="space-y-4">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        These passwords are shown only once. Download the list and hand it to the students securely.
                    </p>
                    <div className="max-h-64 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase tracking-wider sticky top-0">
                                <tr><th className="p-2">Enrollment</th><th className="p-2">Name</th><th className="p-2">Password</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                                {credentials.map((c) => (
                                    <tr key={c.enrollment_number}>
                                        <td className="p-2 font-bold">{c.enrollment_number}</td>
                                        <td className="p-2">{c.name}</td>
                                        <td className="p-2 font-mono">{c.password}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        type="button"
                        onClick={() => downloadTextFile('new_student_passwords.csv', toCSV([['enrollment_number', 'name', 'password'], ...credentials.map((c) => [c.enrollment_number, c.name, c.password])]))}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
                    >
                        <Download size={16} /> Download passwords (CSV)
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default AdminStudents;