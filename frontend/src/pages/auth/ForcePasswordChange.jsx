import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

const inputCls = 'w-full p-3.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60';
const labelCls = 'text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400';

const ForcePasswordChange = () => {
    const { user, updateUser, logout } = useAuth();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (next.length < 8) return setError('The new password must be at least 8 characters.');
        if (next !== confirm) return setError('The two new passwords do not match.');
        if (next === current) return setError('The new password must be different from the temporary one.');
        setBusy(true);
        try {
            await api.put(`/users/${user.id}/change-password`, { currentPassword: current, newPassword: next });
            toast.success('Password changed.');
            updateUser({ must_change_password: false });
        } catch (err) {
            setError(err.response?.data?.error || 'Could not change the password. Please try again.');
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-5 font-sans">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5"><ShieldCheck size={24} /></div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Choose a new password</h1>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    You are using a temporary password. Please set your own before continuing.
                </p>
                <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                    {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="fp-current" className={labelCls}>Temporary password</label>
                        <input id="fp-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" disabled={busy} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="fp-new" className={labelCls}>New password</label>
                        <input id="fp-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" disabled={busy} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="fp-confirm" className={labelCls}>Confirm new password</label>
                        <input id="fp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" disabled={busy} className={inputCls} />
                    </div>
                    <button type="submit" disabled={busy} className="mt-1 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl">
                        {busy ? 'Saving…' : 'Save and continue'}
                    </button>
                </form>
                <button type="button" onClick={logout} className="mt-5 w-full text-center text-sm font-bold text-slate-500 dark:text-slate-400 hover:underline">Log out</button>
            </div>
        </div>
    );
};

export default ForcePasswordChange;
