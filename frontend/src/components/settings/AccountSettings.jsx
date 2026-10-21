import React, { useState } from 'react';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

const ROLE_LABEL = { admin: 'Administrator', teacher: 'Teacher', student: 'Student', parent: 'Parent' };
const MIN_PASSWORD = 8;

const field = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none';

const Notice = ({ msg }) => msg.text ? (
    <p role={msg.type === 'error' ? 'alert' : 'status'}
        className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold border ${msg.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'}`}>
        {msg.text}
    </p>
) : null;

const Section = ({ id, title, hint, children }) => (
    <section id={id} aria-labelledby={`${id}-t`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 md:p-8 shadow-sm">
        <h2 id={`${id}-t`} className="text-lg font-black text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 mb-5">{hint}</p>
        {children}
    </section>
);

const Label = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{children}</label>
);

const PasswordField = ({ id, label, value, onChange, autoComplete }) => {
    const [show, setShow] = useState(false);
    return (
        <div>
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} required autoComplete={autoComplete} className={`${field} pr-11`} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={show}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );
};

const Rule = ({ ok, children }) => (
    <li className={`flex items-center gap-2 text-sm ${ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {ok ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
        <span>{children}<span className="sr-only">{ok ? ' (met)' : ' (not met yet)'}</span></span>
    </li>
);

// One Settings page for every role: login username and password.
const AccountSettings = () => {
    const { user, updateUser } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [userMsg, setUserMsg] = useState({ text: '', type: '' });
    const [userBusy, setUserBusy] = useState(false);
    const [pass, setPass] = useState({ current: '', next: '', confirm: '' });
    const [passMsg, setPassMsg] = useState({ text: '', type: '' });
    const [passBusy, setPassBusy] = useState(false);

    const saveUsername = async (e) => {
        e.preventDefault();
        setUserMsg({ text: '', type: '' });
        setUserBusy(true);
        try {
            const r = await api.put(`/users/${user.id}/change-username`, { newUsername: username });
            updateUser({ username });
            setUserMsg({ text: r.data.message || 'Username updated.', type: 'success' });
        } catch (err) {
            setUserMsg({ text: err.response?.data?.error || 'Failed to update username.', type: 'error' });
        } finally { setUserBusy(false); }
    };

    const longEnough = pass.next.length >= MIN_PASSWORD;
    const matches = pass.next.length > 0 && pass.next === pass.confirm;
    const differs = pass.next.length > 0 && pass.next !== pass.current;

    const savePassword = async (e) => {
        e.preventDefault();
        setPassMsg({ text: '', type: '' });
        if (!longEnough) return setPassMsg({ text: `New password must be at least ${MIN_PASSWORD} characters.`, type: 'error' });
        if (!matches) return setPassMsg({ text: 'New passwords do not match.', type: 'error' });
        setPassBusy(true);
        try {
            const r = await api.put(`/users/${user.id}/change-password`, { currentPassword: pass.current, newPassword: pass.next });
            setPassMsg({ text: r.data.message || 'Password updated.', type: 'success' });
            setPass({ current: '', next: '', confirm: '' });
        } catch (err) {
            setPassMsg({ text: err.response?.data?.error || 'Failed to update password.', type: 'error' });
        } finally { setPassBusy(false); }
    };

    const { theme, setTheme } = useTheme();
    const initial = (user?.full_name || user?.username || '?').trim().charAt(0).toUpperCase();

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-6">
                <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Settings</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Your login details and password.</p>
            </header>

            <div className="mb-6 flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-sm">
                <span aria-hidden="true" className="w-12 h-12 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-black">{initial}</span>
                <div className="min-w-0">
                    <p className="font-black text-slate-900 dark:text-slate-100 truncate">{user?.full_name || user?.username}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{ROLE_LABEL[user?.role] || user?.role}{user?.username ? ` · Signed in as ${user.username}` : ''}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Section id="appearance" title="Appearance" hint="Choose how the portal looks on this device.">
                    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                        {[['light', 'Light', <Sun key="s" size={16} aria-hidden="true" />], ['dark', 'Dark', <Moon key="m" size={16} aria-hidden="true" />]].map(([key, label, icon]) => (
                            <button key={key} type="button" role="radio" aria-checked={theme === key} onClick={() => setTheme(key)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${theme === key ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>
                                {icon}{label}
                            </button>
                        ))}
                    </div>
                </Section>

                <Section id="username" title="Login username" hint="The name you type to sign in. Your name on the portal does not change.">
                    <Notice msg={userMsg} />
                    <form onSubmit={saveUsername} className="space-y-4">
                        <div>
                            <Label htmlFor="set-username">Username</Label>
                            <input id="set-username" type="text" required value={username} autoComplete="username" onChange={(e) => setUsername(e.target.value)} className={field} />
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={userBusy || !username.trim() || username === user?.username}
                                className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
                                {userBusy ? 'Saving…' : 'Save username'}
                            </button>
                        </div>
                    </form>
                </Section>

                <Section id="password" title="Password" hint="Use something long that you do not use anywhere else.">
                    <Notice msg={passMsg} />
                    <form onSubmit={savePassword} className="space-y-4">
                        <PasswordField id="set-current" label="Current password" value={pass.current} onChange={(v) => setPass({ ...pass, current: v })} autoComplete="current-password" />
                        <PasswordField id="set-new" label="New password" value={pass.next} onChange={(v) => setPass({ ...pass, next: v })} autoComplete="new-password" />
                        <PasswordField id="set-confirm" label="Confirm new password" value={pass.confirm} onChange={(v) => setPass({ ...pass, confirm: v })} autoComplete="new-password" />
                        <ul className="space-y-1.5" aria-label="Password requirements">
                            <Rule ok={longEnough}>At least {MIN_PASSWORD} characters</Rule>
                            <Rule ok={matches}>Both new passwords match</Rule>
                            <Rule ok={differs}>Different from your current password</Rule>
                        </ul>
                        <div className="flex justify-end">
                            <button type="submit" disabled={passBusy || !pass.current || !longEnough || !matches}
                                className="text-sm font-bold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 rounded-xl px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
                                {passBusy ? 'Saving…' : 'Update password'}
                            </button>
                        </div>
                    </form>
                </Section>
            </div>
        </div>
    );
};

export default AccountSettings;
