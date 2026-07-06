import React, { useState, useEffect } from 'react';
import { User, Users } from 'lucide-react';
import api from '../../services/api'; // Added import
import useAuth from '../../hooks/useAuth';

const ParentProfile = () => {
    const { user } = useAuth();
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedWardId, setSelectedWardId] = useState('');
    const [allWards, setAllWards] = useState([]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                const url = selectedWardId 
                    ? `/parent/${user.id}/wards-overview?student_id=${selectedWardId}`
                    : `/parent/${user.id}/wards-overview`;
                
                const summaryRes = await api.get(url); // Changed to api.get
                const summaryData = summaryRes.data;
                
                if (summaryData.childProfile) {
                    setAllWards(summaryData.allWards || []);
                    if (!selectedWardId) setSelectedWardId(summaryData.childProfile.student_id);
                    
                    const childUserId = summaryData.childProfile.user_id;
                    const profileRes = await api.get(`/student/${childUserId}/profile`); // Changed to api.get
                    setStudentData(profileRes.data);
                }
            } catch (error) {
                console.error("Error fetching ward profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user, selectedWardId]);

    if (loading && !studentData) {
        return <div className="flex items-center justify-center min-h-screen bg-slate-50"><p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-sm">Loading Ward Profile...</p></div>;
    }

    if (!studentData) {
        return <div className="p-10 text-center text-slate-500 font-bold">No profile data found for your ward.</div>;
    }

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Ward Profile</h2>
                    <p className="text-slate-500 mt-1">View personal and academic records for your child.</p>
                </div>
                
                {allWards.length > 1 && (
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                        <Users size={18} className="text-indigo-600" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Ward</p>
                            <select 
                                value={selectedWardId} 
                                onChange={(e) => setSelectedWardId(e.target.value)}
                                className="text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                            >
                                {allWards.map(ward => (
                                    <option key={ward.student_id} value={ward.student_id}>
                                        {ward.full_name} ({ward.course_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </header>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* --- ID CARD --- */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative transition-all">
                        <div className="h-24 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
                        <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
                            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                                {studentData.personal.profile_picture ? (
                                    <img src={studentData.personal.profile_picture} alt="Profile" className="w-full h-full rounded-full object-cover border border-slate-100" />
                                ) : (
                                    <div className="w-full h-full bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-4xl font-bold border border-indigo-100">
                                        {studentData.personal.name ? studentData.personal.name.charAt(0) : '?'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="pt-14 pb-8 px-6 text-center">
                            <h3 className="text-xl font-bold text-slate-900">{studentData.personal.name}</h3>
                            <p className="text-sm font-bold text-indigo-600 mt-1">{studentData.academic.course}</p>
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

                {/* --- DETAILED INFO --- */}
                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 transition-all">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <User size={20} className="text-indigo-600" /> Personal Information
                            </h3>
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

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 transition-all">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-50 pb-4 flex items-center gap-2">
                            <Users size={20} className="text-indigo-600" /> Guardian Details
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
        </div>
    );
};

export default ParentProfile;