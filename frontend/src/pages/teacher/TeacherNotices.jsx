import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Save, Paperclip, Bell, FileText, Send, Inbox, Megaphone, Download } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const TeacherNotices = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('broadcast');
    const [myClasses, setMyClasses] = useState([]);
    const [sentNotices, setSentNotices] = useState([]);
    const [adminNotices, setAdminNotices] = useState([]);
    
    const [targetClass, setTargetClass] = useState('');
    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeContent, setNoticeContent] = useState('');
    const [attachment, setAttachment] = useState(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState(null);
    const [viewingNotice, setViewingNotice] = useState(null);

    const fetchData = async () => {
        try {
            const classRes = await api.get(`/teacher/${user.id}/assigned-subjects`);
            setMyClasses(classRes.data);

            const noticeRes = await api.get(`/teacher/${user.id}/notices`);
            const noticeData = noticeRes.data;
            
            setAdminNotices(noticeData.filter(n => n.target_role === 'teacher' || n.target_role === 'all'));
            setSentNotices(noticeData.filter(n => n.posted_by === user.id && n.target_role === 'student'));
        } catch (error) {
            console.error("Connection error:", error);
        }
    };

    useEffect(() => {
        if (user?.id) fetchData();
    }, [user]);

    const handleSendNotice = async (e) => {
        e.preventDefault();
        if (!targetClass) return toast.error("Please select a target class/batch!");
        
        const submitData = new FormData();
        submitData.append('title', noticeTitle);
        submitData.append('content', noticeContent);
        submitData.append('target_role', 'student');
        submitData.append('subject_id', targetClass);
        submitData.append('posted_by', user.id);
        
        if (attachment) {
            submitData.append('attachment', attachment);
        }

        try {
            await api.post('/notices', submitData);
            setNoticeTitle(''); setNoticeContent(''); setTargetClass(''); setAttachment(null);
            toast.success("Notification sent successfully!");
            fetchData();
        } catch (error) {
            toast.error("Broadcast failed.");
            console.error(error);
        }
    };

    const openEditModal = (notice) => {
        setEditingNotice({ ...notice, new_attachment: null });
        setIsModalOpen(true);
    };

    const handleUpdateNotice = async (e) => {
        e.preventDefault();
        
        const submitData = new FormData();
        submitData.append('title', editingNotice.title);
        submitData.append('content', editingNotice.content);
        submitData.append('target_role', 'student');
        submitData.append('subject_id', editingNotice.subject_id);
        submitData.append('priority', editingNotice.priority || 'Normal');
        
        if (editingNotice.new_attachment) {
            submitData.append('attachment', editingNotice.new_attachment);
        } else if (editingNotice.attachment_url) {
            submitData.append('attachment_url', editingNotice.attachment_url);
        }

        try {
            await api.put(`/notices/${editingNotice.id}`, submitData);
            setIsModalOpen(false);
            toast.success("Notice updated!");
            fetchData();
        } catch (error) {
            console.error("Update error:", error);
        }
    };

    const deleteNotice = async (id) => {
        if (window.confirm("Delete this notice permanently?")) {
            try {
                await api.delete(`/notices/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete failed:", error);
            }
        }
    };

    const handleDownloadFile = (fileName) => {
        if (!fileName) return;
        const fullUrl = fileName.startsWith('/') 
            ? `http://localhost:5000${fileName}` 
            : `http://localhost:5000/uploads/${fileName}`;
        window.open(fullUrl, '_blank');
    };

    const AttachmentCard = ({ fileName }) => (
        <div className="flex items-center justify-between bg-white w-full sm:w-80 px-4 py-3 rounded-xl border border-slate-200 mt-2 shadow-sm gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                    <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{fileName.replace('/uploads/', '')}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Document Attached</p>
                </div>
            </div>
            <button onClick={() => handleDownloadFile(fileName)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0" title="Download Document">
                <Download size={16} />
            </button>
        </div>
    );

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Communication Hub</h2>
                    <p className="text-slate-500 mt-1">Read university announcements and broadcast messages with attachments.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={() => setActiveTab('broadcast')} 
                        className={`font-bold py-2.5 px-5 rounded-2xl shadow-sm transition-all text-sm flex items-center gap-2 ${
                            activeTab === 'broadcast' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Megaphone size={18} /> Broadcast to Class
                    </button>
                    <button 
                        onClick={() => setActiveTab('inbox')} 
                        className={`font-bold py-2.5 px-5 rounded-2xl shadow-sm transition-all text-sm flex items-center gap-2 ${
                            activeTab === 'inbox' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Inbox size={18} /> University Inbox ({adminNotices.length})
                    </button>
                </div>
            </header>

            {activeTab === 'broadcast' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <Card className="sticky top-6">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold"><Send size={14}/></div>
                                <h3 className="font-bold text-slate-800">Draft Message</h3>
                            </div>
                            <form onSubmit={handleSendNotice} className="flex flex-col gap-5">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Target Class</label>
                                    <select required value={targetClass} onChange={(e) => setTargetClass(e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                        <option value="" disabled>-- Select a Class --</option>
                                        {myClasses.map(cls => <option key={cls.id} value={cls.id}>{cls.course_name} - {cls.subject_name}</option>)}
                                    </select>
                                </div>
                                <FormInput label="Subject Line" type="text" required value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} />
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Message Content</label>
                                    <textarea required rows="4" value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Attachment (Optional)</label>
                                    <div className="bg-white p-2 rounded-xl border border-dashed border-slate-300 flex flex-col items-center hover:bg-slate-50 transition-colors">
                                        <label className="flex flex-col items-center gap-2 cursor-pointer w-full py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center overflow-hidden px-4">
                                            <Paperclip size={20} className="text-indigo-400 shrink-0" />
                                            {attachment ? <span className="text-indigo-600 truncate max-w-full">{attachment.name}</span> : 'Click to Upload PDF'}
                                            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setAttachment(e.target.files[0])} />
                                        </label>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-2 active:scale-95 flex items-center justify-center gap-2">
                                    <Megaphone size={16} /> Broadcast Now
                                </button>
                            </form>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Sent History</h3>
                        {sentNotices.map(notice => (
                            <Card key={notice.id} className="p-0 overflow-hidden group">
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md mb-2 border border-indigo-100">
                                                To: {notice.subject_name || 'Assigned Class'}
                                            </span>
                                            <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">{notice.title}</h4>
                                        </div>
                                        <div className="flex flex-col items-end min-w-[120px]">
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                                                <button onClick={() => openEditModal(notice)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                                <button onClick={() => deleteNotice(notice.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                            <div className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">{notice.date}</div>
                                        </div>
                                    </div>
                                    <div className="mb-2">
                                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap line-clamp-3">{notice.content}</p>
                                        <button onClick={() => setViewingNotice(notice)} className="text-indigo-600 hover:text-indigo-700 text-xs font-bold mt-1.5 hover:underline cursor-pointer">
                                            Read More
                                        </button>
                                    </div>
                                    {notice.attachment_url && <AttachmentCard fileName={notice.attachment_url} />}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'inbox' && (
                <div className="flex flex-col gap-5 max-w-4xl mx-auto">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Official Announcements</h3>
                    {adminNotices.map(notice => (
                        <Card key={notice.id} className="p-0 overflow-hidden relative group">
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${notice.priority === 'High' ? 'bg-rose-500' : 'bg-indigo-400'}`}></div>
                            <div className="p-6 pl-8">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-slate-900 text-lg">{notice.title}</h4>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{notice.date}</span>
                                </div>
                                <div className="mb-4">
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap line-clamp-3">{notice.content}</p>
                                    <button onClick={() => setViewingNotice(notice)} className="text-indigo-600 hover:text-indigo-700 text-xs font-bold mt-1.5 hover:underline cursor-pointer">
                                        Read More
                                    </button>
                                </div>
                                {notice.attachment_url && <AttachmentCard fileName={notice.attachment_url} />}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Announcement">
                    <form onSubmit={handleUpdateNotice} className="space-y-5">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Target Class</label>
                            <select required value={editingNotice.subject_id || ''} onChange={(e) => setEditingNotice({...editingNotice, subject_id: e.target.value})} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                <option value="" disabled>-- Select a Class --</option>
                                {myClasses.map(cls => <option key={cls.id} value={cls.id}>{cls.course_name} - {cls.subject_name}</option>)}
                            </select>
                        </div>
                        <FormInput label="Subject Line" type="text" required value={editingNotice.title} onChange={(e) => setEditingNotice({...editingNotice, title: e.target.value})} />
                        
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Message Content</label>
                            <textarea required rows="4" value={editingNotice.content} onChange={(e) => setEditingNotice({...editingNotice, content: e.target.value})} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none" />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Attachment (Optional)</label>
                            <div className="bg-white p-2 rounded-xl border border-dashed border-slate-300 flex flex-col items-center hover:bg-slate-50 transition-colors">
                                <label className="flex flex-col items-center gap-2 cursor-pointer w-full py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center overflow-hidden px-4">
                                    <Paperclip size={20} className="text-indigo-400 shrink-0" />
                                    {editingNotice.new_attachment ? (
                                        <span className="text-indigo-600 truncate max-w-full">New File: {editingNotice.new_attachment.name}</span>
                                    ) : editingNotice.attachment_url ? (
                                        <span className="text-indigo-600 truncate max-w-full">Keep Existing File</span>
                                    ) : (
                                        'Click to Upload PDF'
                                    )}
                                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setEditingNotice({...editingNotice, new_attachment: e.target.files[0]})} />
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-2 active:scale-95 flex items-center justify-center gap-2">
                            <Save size={16} /> Update Notice
                        </button>
                    </form>
                </Modal>
            )}

            {viewingNotice && (
                <Modal isOpen={!!viewingNotice} onClose={() => setViewingNotice(null)} title="Announcement Preview">
                    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                        <div className="flex items-center gap-3 shrink-0">
                            {viewingNotice.priority && (
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${
                                    viewingNotice.priority === 'High' 
                                    ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                }`}>
                                    {viewingNotice.priority} Priority
                                </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Posted: {viewingNotice.date}
                            </span>
                            {viewingNotice.author && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      By: {viewingNotice.author}
                                </span>
                            )}
                        </div>

                        <h4 className="text-2xl font-black text-slate-900 leading-tight break-words shrink-0">
                            {viewingNotice.title}
                        </h4>
                        
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden shadow-inner">
                            <div className="p-6 max-h-[300px] overflow-y-auto">
                                <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap break-words">
                                    {viewingNotice.content}
                                </p>
                            </div>
                        </div>

                        <div className="shrink-0 space-y-4">
                            {viewingNotice.attachment_url && (
                                <div className="pt-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Attached Material:</p>
                                    <AttachmentCard fileName={viewingNotice.attachment_url} />
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

export default TeacherNotices;