import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, Paperclip, FileText, Download } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const AdminNotices = () => {
    const { user } = useAuth();
    const [notices, setNotices] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNoticeId, setEditingNoticeId] = useState(null);
    const [viewingNotice, setViewingNotice] = useState(null);
    const [attachmentFile, setAttachmentFile] = useState(null);
    
    const [formData, setFormData] = useState({
        title: '', content: '', target_role: 'all', priority: 'Normal', attachment_url: null
    });

    const fetchNotices = async () => {
        try {
            const response = await api.get('/notices');
            setNotices(response.data);
        } catch (error) {
            console.error("Error loading notices:", error);
        }
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        const adminId = user?.id; 
        if (!adminId) {
            toast.error("Session expired. Please log in again.");
            return;
        }

        const submitData = new FormData();
        submitData.append('title', formData.title);
        submitData.append('content', formData.content);
        submitData.append('target_role', formData.target_role);
        submitData.append('priority', formData.priority);
        submitData.append('posted_by', adminId);

        if (attachmentFile) {
            submitData.append('attachment', attachmentFile);
        } else if (formData.attachment_url) {
            submitData.append('attachment_url', formData.attachment_url);
        }

        try {
            if (editingNoticeId) {
                await api.put(`/notices/${editingNoticeId}`, submitData);
            } else {
                await api.post('/notices', submitData);
            }
            
            setIsModalOpen(false);
            setEditingNoticeId(null);
            setAttachmentFile(null);
            setFormData({ title: '', content: '', target_role: 'all', priority: 'Normal', attachment_url: null });
            fetchNotices(); 
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Failed to save notice";
            toast.error("Error: " + errorMsg);
            console.error("Submission failed:", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this notice permanently?")) {
            try {
                await api.delete(`/notices/${id}`);
                fetchNotices();
            } catch (error) {
                console.error("Delete error:", error);
            }
        }
    };

    const openEditModal = (notice) => {
        setEditingNoticeId(notice.id);
        setAttachmentFile(null);
        setFormData({ 
            title: notice.title, content: notice.content, target_role: notice.target_role, 
            priority: notice.priority, attachment_url: notice.attachment_url 
        });
        setIsModalOpen(true);
    };

    const handleDownload = (fileName) => {
        if (!fileName) return;
        const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
        const fullUrl = fileName.startsWith('/') ? `${rawBaseUrl}${fileName}` : `${rawBaseUrl}/uploads/${fileName}`;
        window.open(fullUrl, '_blank');
    };

    const columns = [
        { 
            header: "Notice Details", 
            accessor: "title",
            cell: (row) => (
                <div onClick={(e) => { e.stopPropagation(); setViewingNotice(row); }} className="max-w-md py-1 cursor-pointer group/title flex items-start gap-2">
                    <div className="flex-1">
                        <div className="font-bold text-slate-900 group-hover/title:text-emerald-600 transition-colors">
                            {row.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{row.content}</div>
                    </div>
                    {row.attachment_url && <Paperclip size={14} className="text-emerald-500 shrink-0 mt-1" />}
                </div>
            )
        },
        { header: "Target", accessor: "target_role" },
        { 
            header: "Priority", 
            accessor: "priority",
            cell: (row) => (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
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
                    <button onClick={(e) => { e.stopPropagation(); openEditModal(row); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
                <button onClick={() => { setEditingNoticeId(null); setAttachmentFile(null); setFormData({title:'', content:'', target_role:'all', priority:'Normal', attachment_url: null}); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95">
                    <Plus size={18} /> Post Notice
                </button>
            </header>

            <Table columns={columns} data={notices} pageSize={5} />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingNoticeId ? 'Edit Announcement' : 'New Announcement'}>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <Input label="Notice Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                    
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
                            <Paperclip size={14} /> {attachmentFile ? attachmentFile.name : (formData.attachment_url ? 'Keep Existing File' : 'Attach File')}
                            <input type="file" className="hidden" onChange={(e) => setAttachmentFile(e.target.files[0])} />
                        </label>
                    </div>

                    <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                        <Save size={18} /> {editingNoticeId ? 'Update Notice' : 'Publish Notice'}
                    </button>
                </form>
            </Modal>

            {viewingNotice && (
                <Modal isOpen={!!viewingNotice} onClose={() => setViewingNotice(null)} title="Announcement Preview">
                    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                        <div className="flex items-center gap-3 shrink-0">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${viewingNotice.priority === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                {viewingNotice.priority} Priority
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posted: {viewingNotice.date}</span>
                        </div>
                        
                        <h4 className="text-2xl font-black text-slate-900 leading-tight break-words shrink-0">{viewingNotice.title}</h4>
                        
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                            <div className="p-6 max-h-[300px] overflow-y-auto">
                                <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap break-words">{viewingNotice.content}</p>
                            </div>
                        </div>

                        <div className="shrink-0 space-y-4">
                            {viewingNotice.attachment_url && (
                                <div className="pt-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Attached Material:</p>
                                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FileText size={16} /></div>
                                            <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{viewingNotice.attachment_url.replace('/uploads/', '')}</p>
                                        </div>
                                        <button onClick={() => handleDownload(viewingNotice.attachment_url)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                            <Download size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                            <button onClick={() => setViewingNotice(null)} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95">
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