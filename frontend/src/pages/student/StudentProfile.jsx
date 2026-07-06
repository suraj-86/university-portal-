import React, { useState, useEffect } from 'react';
import { Save, User, Users, Camera } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal'; 

const StudentProfile = () => {
    const [studentData, setStudentData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempData, setTempData] = useState({});

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const userId = user ? user.id : 1; 

                const response = await api.get(`/student/${userId}/profile`);
                setStudentData(response.data);
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
        };
        fetchProfile();
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setTempData({ ...tempData, profile_picture: imageUrl });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        const user = JSON.parse(localStorage.getItem('user'));
        const userId = user ? user.id : 1;

        try {
            await api.put(`/student/${userId}/profile`, tempData);
            
            setStudentData({
                ...studentData,
                personal: { ...studentData.personal, ...tempData },
                guardians: { 
                    ...studentData.guardians, 
                    father_name: tempData.father_name,
                    emergency_contact: tempData.emergency_contact,
                    guardian_relation: tempData.guardian_relation 
                }
            });
            setIsModalOpen(false);
            alert("Database records updated successfully!");
        } catch (error) {
            alert("Failed to update: " + (error.response?.data?.error || "Unknown error"));
        }
    };

    if (!studentData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <p className="text-slate-500 font-bold animate-pulse">Loading student profile...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900">Student Profile</h2>
                <p className="text-slate-500 mt-1">View your academic standing and personal details.</p>
            </header>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
                        <div className="h-24 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                        <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
                            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                                {studentData.personal.profile_picture ? (
                                    <img 
                                        src={studentData.personal.profile_picture} 
                                        alt="Profile" 
                                        className="w-full h-full rounded-full object-cover border border-slate-100"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl font-bold border border-blue-100">
                                        {studentData.personal.name ? studentData.personal.name.charAt(0) : '?'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="pt-14 pb-8 px-6 text-center">
                            <h3 className="text-xl font-bold text-slate-900">{studentData.personal.name}</h3>
                            <p className="text-sm font-bold text-blue-600 mt-1">{studentData.academic.course}</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{studentData.academic.semester}</p>
                            <div className="mt-6 flex justify-center gap-3">
                                <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-left">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enrollment No.</p>
                                    <p className="text-sm font-bold text-slate-800 tracking-wide">{studentData.academic.enrollment_no}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-left">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch</p>
                                    <p className="text-sm font-bold text-slate-800 tracking-wide">{studentData.academic.batch}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <User size={20} className="text-blue-600" /> Personal Information
                            </h3>
                            <button 
                                onClick={() => {
                                    setTempData({...studentData.personal, ...studentData.guardians});
                                    setIsModalOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 px-4 py-2 rounded-lg transition-all active:scale-95"
                            >
                                Edit Profile
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</p>
                                <p className="text-slate-800 font-medium text-sm">{studentData.personal.email}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</p>
                                <p className="text-slate-800 font-medium text-sm">{studentData.personal.contact}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</p>
                                <p className="text-slate-800 font-medium text-sm">{studentData.personal.dob}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Blood Group</p>
                                <p className="text-slate-800 font-medium text-sm">{studentData.personal.blood_group}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Permanent Address</p>
                                <p className="text-slate-800 font-medium text-sm">{studentData.personal.address}, {studentData.personal.city}, {studentData.personal.state} - {studentData.personal.pin_code}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-50 pb-4 flex items-center gap-2">
                            <Users size={20} className="text-blue-600" /> Guardian Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Guardian's Name</p>
                                <p className="text-slate-800 font-medium text-sm">{studentData.guardians.father_name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Relation</p>
                                <p className="text-slate-800 font-medium text-sm">{studentData.guardians.guardian_relation}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Emergency Contact</p>
                                <p className="text-slate-800 font-medium text-sm text-rose-600">{studentData.guardians.emergency_contact}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    title="Update Profile Details"
                >
                    <form onSubmit={handleSave} className="space-y-6 pt-4">
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="w-16 h-16 rounded-full bg-slate-200 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center">
                                {tempData.profile_picture ? (
                                    <img src={tempData.profile_picture} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera size={24} className="text-slate-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Profile Picture</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Contact Number</label>
                                <input type="text" value={tempData.contact || ''} onChange={(e) => setTempData({...tempData, contact: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</label>
                                <input type="text" value={tempData.blood_group || ''} onChange={(e) => setTempData({...tempData, blood_group: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Address</label>
                                <input type="text" value={tempData.address || ''} onChange={(e) => setTempData({...tempData, address: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">City</label>
                                <input type="text" value={tempData.city || ''} onChange={(e) => setTempData({...tempData, city: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">State</label>
                                <input type="text" value={tempData.state || ''} onChange={(e) => setTempData({...tempData, state: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">PIN Code</label>
                                <input type="text" value={tempData.pin_code || ''} onChange={(e) => setTempData({...tempData, pin_code: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Guardian's Name</label>
                                <input type="text" value={tempData.father_name || ''} onChange={(e) => setTempData({...tempData, father_name: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Guardian Relation</label>
                                <input type="text" value={tempData.guardian_relation || ''} onChange={(e) => setTempData({...tempData, guardian_relation: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-rose-600">Emergency Contact</label>
                                <input type="text" value={tempData.emergency_contact || ''} onChange={(e) => setTempData({...tempData, emergency_contact: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none font-bold" />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-2">
                            <Save size={20} /> Save Updated Records
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default StudentProfile;