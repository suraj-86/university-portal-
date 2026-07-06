import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Save, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import Input from '../../components/FormInput';
import Card from '../../components/Card';

const StudentSettings = () => {
    const { user, login } = useAuth(); 
    
    const [username, setUsername] = useState(user?.username || '');
    const [userMessage, setUserMessage] = useState({ text: '', type: '' });
    const [userLoading, setUserLoading] = useState(false);

    const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passMessage, setPassMessage] = useState({ text: '', type: '' });
    const [passLoading, setPassLoading] = useState(false);

    useEffect(() => {
        if (user?.username) setUsername(user.username);
    }, [user]);

    const handleUsernameSubmit = async (e) => {
        e.preventDefault();
        setUserMessage({ text: '', type: '' });
        setUserLoading(true);

        try {
            const response = await api.put(`/users/${user.id}/change-username`, { newUsername: username });
            setUserMessage({ text: response.data.message, type: 'success' });
        } catch (error) {
            setUserMessage({ text: error.response?.data?.error || 'Failed to update username.', type: 'error' });
        } finally {
            setUserLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPassMessage({ text: '', type: '' });

        if (passData.newPassword !== passData.confirmPassword) {
            return setPassMessage({ text: 'New passwords do not match.', type: 'error' });
        }
        if (passData.newPassword.length < 6) {
            return setPassMessage({ text: 'New password must be at least 6 characters.', type: 'error' });
        }

        setPassLoading(true);

        try {
            const response = await api.put(`/users/${user.id}/change-password`, {
                currentPassword: passData.currentPassword,
                newPassword: passData.newPassword
            });
            setPassMessage({ text: response.data.message || 'Password successfully updated!', type: 'success' });
            setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            setPassMessage({ text: error.response?.data?.error || 'Failed to update password.', type: 'error' });
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Account Settings</h2>
                <p className="text-slate-500 mt-1 font-medium">Manage your security and profile preferences.</p>
            </header>

            <div className="max-w-2xl space-y-8">
                
                {/* --- CHANGE USERNAME CARD --- 
                <Card className="p-8 border-slate-200 shadow-sm transition-all">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <User size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Change Username</h3>
                            <p className="text-sm text-slate-500">Update the username you use to log into the portal.</p>
                        </div>
                    </div>

                    {userMessage.text && (
                        <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 font-bold text-sm ${userMessage.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                            <AlertCircle size={18} /> {userMessage.text}
                        </div>
                    )}

                    <form onSubmit={handleUsernameSubmit} className="space-y-4">
                        <Input 
                            label="Login Username" 
                            type="text" 
                            required 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <div className="pt-2 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={userLoading || username === user?.username}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={18} /> {userLoading ? 'Saving...' : 'Update Username'}
                            </button>
                        </div>
                    </form>
                </Card> 
                */}

                {/* --- CHANGE PASSWORD CARD --- */}
                <Card className="p-8 border-slate-200 shadow-sm transition-all">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Change Password</h3>
                            <p className="text-sm text-slate-500">Ensure your account is using a long, random password to stay secure.</p>
                        </div>
                    </div>

                    {passMessage.text && (
                        <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 font-bold text-sm ${passMessage.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                            <AlertCircle size={18} /> {passMessage.text}
                        </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
                        <Input 
                            label="Current Password" 
                            type="password" 
                            required 
                            value={passData.currentPassword}
                            onChange={(e) => setPassData({...passData, currentPassword: e.target.value})}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <Input 
                                label="New Password" 
                                type="password" 
                                required 
                                value={passData.newPassword}
                                onChange={(e) => setPassData({...passData, newPassword: e.target.value})}
                            />
                            <Input 
                                label="Confirm New Password" 
                                type="password" 
                                required 
                                value={passData.confirmPassword}
                                onChange={(e) => setPassData({...passData, confirmPassword: e.target.value})}
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={passLoading}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Save size={18} /> {passLoading ? 'Saving...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default StudentSettings;