import React, { useState, useEffect } from 'react';
import { Plus, ShieldCheck, Search, Users, Edit2, Trash2 } from 'lucide-react';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';

const AdminParents = () => {
    const [parents, setParents] = useState([]);
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingParentId, setEditingParentId] = useState(null);
    
    // Updated to use student_ids as an array[cite: 3]
    const [formData, setFormData] = useState({
        full_name: '', phone: '', email: '', username: '', password: '', student_ids: []
    });

    const fetchData = async () => {
        try {
            const parentRes = await fetch('http://localhost:5000/api/parents');
            setParents(await parentRes.json());
            const studentRes = await fetch('http://localhost:5000/api/students');
            setStudents(await studentRes.json());
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filteredParents = parents.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const url = editingParentId 
            ? `http://localhost:5000/api/parents/${editingParentId}`
            : 'http://localhost:5000/api/parents';
        const method = editingParentId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                setIsModalOpen(false);
                setEditingParentId(null);
                fetchData();
            } else {
                const result = await response.json();
                alert("Error: " + result.error);
            }
        } catch (error) {
            console.error("Submit failed:", error);
        }
    };

    const openEditModal = (parent) => {
        setEditingParentId(parent.id);
        setFormData({
            full_name: parent.name,
            phone: parent.phone || '', 
            email: parent.email || '', 
            username: parent.username,
            password: '', 
            // In a production app, you'd fetch linked IDs here[cite: 3]
            student_ids: parent.student_id ? [parent.student_id] : [] 
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this parent account?")) {
            const response = await fetch(`http://localhost:5000/api/parents/${id}`, { method: 'DELETE' });
            if (response.ok) fetchData();
        }
    };

    const columns = [
        { header: "Parent Name", accessor: "name", cell: (row) => <span className="font-bold text-slate-900">{row.name}</span> },
        { 
            header: "Contact Info", 
            accessor: "contact", 
            cell: (row) => (
                <div>
                    <div className="text-xs text-slate-900 font-medium">{row.phone || 'No phone'}</div>
                    <div className="text-[10px] text-slate-500">{row.email || 'No email'}</div>
                </div>
            ) 
        },
        { header: "Username", accessor: "username", cell: (row) => <span className="text-slate-600 font-medium">{row.username}</span> },
        { 
            header: "Linked Wards", 
            accessor: "student_name",
            cell: (row) => <span className="font-bold text-indigo-600">{row.student_name || 'None'}</span>
        },
        {
            header: "Actions",
            accessor: "actions",
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => openEditModal(row)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(row.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Parent Accounts</h2>
                    <p className="text-slate-500 mt-1">Manage parent access and link them to multiple students.</p>
                </div>
                <button 
                    onClick={() => { 
                        setEditingParentId(null); 
                        setFormData({full_name: '', phone: '', email: '', username: '', password: '', student_ids: []}); 
                        setIsModalOpen(true); 
                    }}
                    className="bg-blue-600 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2"
                >
                    <Plus size={18} /> Add Parent
                </button>
            </header>

            <Table columns={columns} data={filteredParents} pageSize={10} />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingParentId ? "Edit Parent" : "Register Parent"}>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <Input label="Full Name" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                        <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>

                    {/* Multi-Select Ward Checkbox List[cite: 3] */}
                    <div className="space-y-2">
                        <span className="block text-sm font-medium text-slate-700">Link Wards (Select Multiple)</span>
                        <div className="max-h-40 overflow-y-auto border border-slate-300 rounded-2xl p-2 bg-white">
                            {students.map(s => (
                                <label key={s.student_id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={formData.student_ids.includes(s.student_id)}
                                        onChange={(e) => {
                                            const sId = s.student_id;
                                            setFormData(prev => ({
                                                ...prev,
                                                student_ids: e.target.checked 
                                                    ? [...prev.student_ids, sId] 
                                                    : prev.student_ids.filter(id => id !== sId)
                                            }));
                                        }}
                                    />
                                    <span className="text-sm text-slate-700">{s.full_name} ({s.enrollment_number})</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required disabled={!!editingParentId} />
                            {!editingParentId && <Input label="Password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />}
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg">
                        {editingParentId ? 'Save Changes' : 'Create Account'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default AdminParents;