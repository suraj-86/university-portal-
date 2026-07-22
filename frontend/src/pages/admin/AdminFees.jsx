import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, User } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import toast from 'react-hot-toast';

const AdminFees = () => {
    const [feeRecords, setFeeRecords] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [courseFilter, setCourseFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFeeId, setEditingFeeId] = useState(null);
    const [assignMode, setAssignMode] = useState('single');
    const [formData, setFormData] = useState({
        student_id: '', course_id: '', semester: '', fee_type: 'Tuition', total_fee: '', due_date: ''
    });

    const fetchAdminFees = async () => {
        try {
            const res = await api.get('/admin/fees');
            setFeeRecords(res.data);
        } catch (error) {
            console.error("Error fetching admin metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [courseRes, studentRes] = await Promise.all([
                api.get('/courses'),
                api.get('/students')
            ]);
            setCourses(courseRes.data);
            setStudents(studentRes.data);
        } catch (error) {
            console.error("Error fetching dropdown data:", error);
        }
    };

    useEffect(() => {
        fetchAdminFees();
        fetchDropdownData();
    }, []);

    const totalExpected = feeRecords.reduce((sum, r) => sum + Number(r.total_fee), 0);
    const totalCollected = feeRecords.reduce((sum, r) => sum + Number(r.paid_amount), 0);
    const outstandingDues = totalExpected - totalCollected;
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    const filteredRecords = feeRecords.filter(record => {
        const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               record.enrollment.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCourse = courseFilter === 'All' || record.course === courseFilter;
        const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
        return matchesSearch && matchesCourse && matchesStatus;
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    const openAssignModal = () => {
        setEditingFeeId(null);
        setAssignMode('single');
        setFormData({ student_id: '', course_id: '', semester: '', fee_type: 'Tuition', total_fee: '', due_date: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (record) => {
        setEditingFeeId(record.id);
        setFormData({
            student_id: record.student_id,
            course_id: '',
            semester: record.semester,
            fee_type: record.fee_type,
            total_fee: record.total_fee,
            due_date: record.due_date ? record.due_date.split('T')[0] : ''
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingFeeId) {
                await api.put(`/fees/${editingFeeId}`, {
                    total_fee: formData.total_fee,
                    due_date: formData.due_date,
                    fee_type: formData.fee_type
                });
            } else if (assignMode === 'single') {
                await api.post('/fees', {
                    student_id: formData.student_id,
                    semester: formData.semester,
                    fee_type: formData.fee_type,
                    total_fee: formData.total_fee,
                    due_date: formData.due_date
                });
            } else {
                const res = await api.post('/fees/bulk-assign', {
                    course_id: formData.course_id,
                    semester: formData.semester,
                    fee_type: formData.fee_type,
                    total_fee: formData.total_fee,
                    due_date: formData.due_date
                });
                alert(`Fee assigned to ${res.data.assigned} students.`);
            }
            setIsModalOpen(false);
            fetchAdminFees();
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Network error while saving the fee.";
            toast.error("Error: " + errorMsg);
            console.error("Submit error:", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this fee record? This cannot be undone.")) return;
        try {
            await api.delete(`/fees/${id}`);
            fetchAdminFees();
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-400 dark:text-slate-500">Loading master fees ledger...</div>;

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Fee Management</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Track student dues, record payments, and manage invoices live.</p>
                </div>
                <button onClick={openAssignModal} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap">
                    <Plus size={18} /> Assign Fee
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Total Expected</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalExpected)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Total Collected</p>
                    <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCollected)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Outstanding Dues</p>
                    <h3 className="text-2xl font-bold text-orange-500 dark:text-orange-400">{formatCurrency(outstandingDues)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Collection Rate ({collectionRate}%)</p>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${collectionRate}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <input type="text" placeholder="Search Name or Enrollment..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-4 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 text-sm" />
                    <div className="flex gap-4">
                        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="py-2 px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-sm">
                            <option value="All">All Courses</option>
                            {courses.map(c => <option key={c.id} value={c.course_name}>{c.course_name}</option>)}
                        </select>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="py-2 px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-sm">
                            <option value="All">All Statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Partial">Partial</option>
                            <option value="Pending">Pending</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 font-bold">Student Info</th>
                                <th className="p-4 font-bold">Course / Sem</th>
                                <th className="p-4 font-bold">Fee Type</th>
                                <th className="p-4 font-bold">Total / Paid</th>
                                <th className="p-4 font-bold">Due Date</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                            {filteredRecords.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-slate-100">{record.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{record.enrollment}</div>
                                    </td>
                                    <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{record.course} <span className="text-slate-400">S{record.semester}</span></td>
                                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{record.fee_type}</td>
                                    <td className="p-4 font-bold">
                                        {formatCurrency(record.total_fee)} / <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(record.paid_amount)}</span>
                                    </td>
                                    <td className="p-4 text-slate-500 dark:text-slate-400">{record.due_date ? new Date(record.due_date).toLocaleDateString('en-IN') : ' '}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase 
                                            ${record.status === 'Paid' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' :
                                              record.status === 'Partial' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' : 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400'}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openEditModal(record)} className="p-2 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 rounded-lg transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(record.id)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-400 dark:text-slate-500 italic">No fee records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingFeeId ? 'Edit Fee Record' : 'Assign New Fee'}>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    {!editingFeeId && (
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setAssignMode('single')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition-all ${assignMode === 'single' ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                <User size={16} /> Single Student
                            </button>
                            <button type="button" onClick={() => setAssignMode('bulk')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition-all ${assignMode === 'bulk' ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                <Users size={16} /> Bulk by Course + Semester
                            </button>
                        </div>
                    )}
                    
                    {!editingFeeId && assignMode === 'single' && (
                        <div className="space-y-1">
                            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Student</span>
                            <select required value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none">
                                <option value="">-- Select Student --</option>
                                {students.map(s => (
                                    <option key={s.student_id} value={s.student_id}>
                                        {s.full_name} ({s.enrollment_number})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {!editingFeeId && assignMode === 'bulk' && (
                        <div className="space-y-1">
                            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Course</span>
                            <select required value={formData.course_id} onChange={(e) => setFormData({ ...formData, course_id: e.target.value })} className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none">
                                <option value="">-- Select Course --</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                            </select>
                            <p className="text-[11px] text-slate-400 mt-1">This fee will be assigned to every Active student in this course & semester.</p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!editingFeeId && (
                            <div className="space-y-1">
                                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Semester</span>
                                <select required value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none">
                                    <option value="">Select Sem</option>
                                    {Array.from({ length: 8 }, (_, i) => i + 1).map(n => (
                                        <option key={n} value={n}>Semester {n}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="space-y-1">
                            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Fee Type</span>
                            <select required value={formData.fee_type} onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })} className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none">
                                <option value="Tuition">Tuition</option>
                                <option value="Hostel">Hostel</option>
                                <option value="Library Fine">Library Fine</option>
                                <option value="Exam">Exam</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Total Fee Amount (₹)" type="number" required value={formData.total_fee} onChange={(e) => setFormData({ ...formData, total_fee: e.target.value })} placeholder="e.g. 45000" />
                        <Input label="Due Date" type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                    </div>
                    <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-4 rounded-2xl hover:bg-cyan-700 shadow-lg transition-all active:scale-95">
                        {editingFeeId ? 'Save Changes' : assignMode === 'bulk' ? 'Assign to Course' : 'Assign Fee'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default AdminFees;