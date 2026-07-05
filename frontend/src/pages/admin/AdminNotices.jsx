import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, Paperclip, Bell } from 'lucide-react';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import AttachmentBadge from '../../components/attachment';
import useAuth from '../../hooks/useAuth'; 

const AdminNotices = () => {
    const { user } = useAuth(); // Get admin ID for the 'posted_by' foreign key
    const [notices, setNotices] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNoticeId, setEditingNoticeId] = useState(null);
    const [viewingNotice, setViewingNotice] = useState(null); 
    
    const [formData, setFormData] = useState({
        title: '', 
        content: '', 
        target_role: 'all', 
        priority: 'Normal', 
        attachment_url: null
    });

    // --- 1. FETCH DATA FROM BACKEND ---
    const fetchNotices = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/notices');
            const data = await response.json();
            setNotices(data); 
        } catch (error) {
            console.error("Error loading notices:", error);
        }
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    // --- 2. HANDLE PUBLISH & UPDATE ---
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        const adminId = user?.id; 
        if (!adminId) {
            alert("Session expired. Please log in again.");
            return;
        }

        const url = editingNoticeId 
            ? `http://localhost:5000/api/notices/${editingNoticeId}` 
            : 'http://localhost:5000/api/notices';
        
        const method = editingNoticeId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    posted_by: adminId 
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setIsModalOpen(false);
                setEditingNoticeId(null);
                setFormData({ title: '', content: '', target_role: 'all', priority: 'Normal', attachment_url: null });
                fetchNotices(); 
            } else {
                alert("Error: " + (result.error || "Failed to save notice"));
            }
        } catch (error) {
            console.error("Submission failed:", error);
        }
    };

    // --- 3. DELETE NOTICE ---
    const handleDelete = async (id) => {
        if (window.confirm("Delete this notice permanently?")) {
            try {
                const response = await fetch(`http://localhost:5000/api/notices/${id}`, { method: 'DELETE' });
                if (response.ok) fetchNotices();
            } catch (error) {
                console.error("Delete error:", error);
            }
        }
    };

    // --- 4. PREPARE EDIT MODAL ---
    const openEditModal = (notice) => {
        setEditingNoticeId(notice.id);
        setFormData({ 
            title: notice.title, 
            content: notice.content, 
            target_role: notice.target_role, 
            priority: notice.priority, 
            attachment_url: notice.attachment_url 
        });
        setIsModalOpen(true);
    };

    // --- 5. TABLE COLUMNS ---
    const columns = [
        { 
            header: "Notice Details", 
            accessor: "title",
            cell: (row) => (
                <div 
                    onClick={(e) => { e.stopPropagation(); setViewingNotice(row); }} 
                    className="max-w-md py-1 cursor-pointer group/title"
                >
                    <div className="font-bold text-slate-900 group-hover/title:text-emerald-600 transition-colors">
                        {row.title}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{row.content}</div>
                </div>
            )
        },
        { header: "Target", accessor: "target_role" },
        { 
            header: "Priority", 
            accessor: "priority",
            cell: (row) => (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    row.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                }`}>
                    {row.priority}
                </span>
            )
        }, 
        { header: "Date", accessor: "date" },
        {
            header: "Actions",
            accessor: "id",
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }} 
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Campus Notices</h2>
                    <p className="text-slate-500 mt-1">Broadcast official announcements to the university.</p>
                </div>
                <button 
                    onClick={() => { 
                        setEditingNoticeId(null); 
                        setFormData({title:'', content:'', target_role:'all', priority:'Normal', attachment_url: null}); 
                        setIsModalOpen(true); 
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={18} /> Post Notice
                </button>
            </header>

            <Table columns={columns} data={notices} pageSize={5} />

            {/* ADD/EDIT MODAL */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={editingNoticeId ? 'Edit Announcement' : 'New Announcement'}
            >
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <Input label="Notice Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g. End Sem Exam Schedule" required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="mb-2 block text-sm font-medium text-slate-700">Target Audience</span>
                            <select value={formData.target_role} onChange={(e) => setFormData({...formData, target_role: e.target.value})} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none">
                                <option value="all">Everyone</option>
                                <option value="student">Students</option>
                                <option value="teacher">Teachers</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="mb-2 block text-sm font-medium text-slate-700">Priority Level</span>
                            <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none">
                                <option value="Normal">Normal</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="mb-2 block text-sm font-medium text-slate-700">Notice Content</span>
                        <textarea required rows="4" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none resize-none" />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
                        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                            <Paperclip size={14} /> {formData.attachment_url ? 'File Ready' : 'Attach File'}
                            <input type="file" className="hidden" onChange={(e) => setFormData({...formData, attachment_url: e.target.files[0]?.name})} />
                        </label>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                        <Save size={18} /> {editingNoticeId ? 'Update Notice' : 'Publish Notice'}
                    </button>
                </form>
            </Modal>

            {/* FIXED PREVIEW MODAL - PINNED HEADER & SCROLLABLE CONTENT[cite: 2] */}
            {viewingNotice && (
                <Modal 
                    isOpen={!!viewingNotice} 
                    onClose={() => setViewingNotice(null)} 
                    title="Announcement Preview"
                >
                    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                        {/* PINNED TOP: Priority and Date */}
                        <div className="flex items-center gap-3 shrink-0">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${
                                viewingNotice.priority === 'High' 
                                ? 'bg-red-50 text-red-700 border-red-100' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                                {viewingNotice.priority} Priority
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Posted: {viewingNotice.date}
                            </span>
                        </div>

                        {/* PINNED TITLE */}
                        <h4 className="text-2xl font-black text-slate-900 leading-tight break-words shrink-0">
                            {viewingNotice.title}
                        </h4>

                        {/* SCROLLABLE MIDDLE: Notice Content only[cite: 2] */}
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                            <div className="p-6 max-h-[300px] overflow-y-auto">
                                <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap break-words">
                                    {viewingNotice.content}
                                </p>
                            </div>
                        </div>

                        {/* PINNED BOTTOM: Attachments and Close Button */}
                        <div className="shrink-0 space-y-4">
                            {viewingNotice.attachment_url && (
                                <div className="pt-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Attached Material:</p>
                                    <AttachmentBadge fileName={viewingNotice.attachment_url} color="emerald" />
                                </div>
                            )}
                            <button 
                                onClick={() => setViewingNotice(null)}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdminNotices;