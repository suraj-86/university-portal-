import React, { useEffect, useState } from 'react';
import { Plus, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../../components/Modal';
import Input from '../../components/FormInput';
import ResetPasswordAction from '../../components/ResetPasswordAction';
import PasswordResultModal from '../../components/PasswordResultModal';
import { useConfirm } from '../../context/confirm';

const fmt = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};
const Badge = ({ tone, children }) => {
    const tones = {
        green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
        slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
        blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
    };
    return <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
};

const AdminAdmins = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState({ username: '', password: '' });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [created, setCreated] = useState(null);

    const reload = () => setReloadKey((k) => k + 1);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await api.get('/admin/admins');
                if (cancelled) return;
                setAdmins(res.data);
                setError('');
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.error || 'Could not load the admin accounts.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [reloadKey]);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError('');
        try {
            const res = await api.post('/admin/admins', { username: form.username, password: form.password });
            setAddOpen(false);
            setForm({ username: '', password: '' });
            if (res.data.password) setCreated([{ username: res.data.username, password: res.data.password }]);
            else toast.success('Admin added. They must choose their own password at first login.');
            reload();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Could not add the admin.');
        } finally {
            setSaving(false);
        }
    };

    const confirm = useConfirm();
    const setActive = async (a, active) => {
        if (!active && !(await confirm({ title: 'Deactivate this admin?', message: `${a.username} will not be able to log in until reactivated.`, confirmText: 'Deactivate', tone: 'warning' }))) return;
        try {
            await api.put(`/admin/admins/${a.id}/active`, { active });
            toast.success(active ? 'Account reactivated.' : 'Account deactivated.');
            reload();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not change the account.');
        }
    };

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Admins</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
                        Everyone who can sign in as an administrator. Reset a password if someone is locked out. Every change is written to the Audit Log.
                    </p>
                </div>
                <button onClick={() => { setForm({ username: '', password: '' }); setFormError(''); setAddOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 shadow-sm">
                    <Plus size={16} /> Add Admin
                </button>
            </header>

            {loading ? (
                <p className="text-slate-400 font-bold animate-pulse">Loading…</p>
            ) : error ? (
                <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-5 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
                    <button onClick={() => { setLoading(true); reload(); }} className="text-sm font-bold text-rose-700 dark:text-rose-300 underline">Try again</button>
                </div>
            ) : (
                <ul className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                    {admins.map((a) => (
                        <li key={a.id} className="px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0"><ShieldCheck size={18} /></div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-black text-slate-900 dark:text-slate-100">{a.username}</span>
                                    {a.isYou && <Badge tone="blue">You</Badge>}
                                    {a.active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Deactivated</Badge>}
                                    {a.mustChangePassword && <Badge tone="amber">Password change pending</Badge>}
                                </div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                    Last login: {fmt(a.lastLogin) || 'not recorded yet'}
                                    {fmt(a.createdAt) ? ` · Added ${fmt(a.createdAt)}` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                {!a.isYou && <ResetPasswordAction kind="admin" id={a.id} name={a.username} />}
                                {a.active ? (
                                    <button type="button" disabled={a.isYou} onClick={() => setActive(a, false)}
                                        title={a.isYou ? 'You cannot deactivate your own account' : 'Deactivate'} aria-label={`Deactivate ${a.username}`}
                                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"><UserX size={16} /></button>
                                ) : (
                                    <button type="button" onClick={() => setActive(a, true)} title="Reactivate" aria-label={`Reactivate ${a.username}`}
                                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg"><UserCheck size={16} /></button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Admin">
                <form onSubmit={submit} className="space-y-4">
                    {formError && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm font-bold text-rose-700 dark:text-rose-300">{formError}</p>}
                    <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. registrar.office" required />
                    <Input label="Password (optional)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to generate one" />
                    <p className="text-xs font-medium text-slate-400 ml-1">The new admin must choose their own password the first time they log in.</p>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setAddOpen(false)} className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Adding…' : 'Add admin'}</button>
                    </div>
                </form>
            </Modal>
            <PasswordResultModal isOpen={!!created} onClose={() => setCreated(null)} title="New admin created" entries={created || []} />
        </div>
    );
};

export default AdminAdmins;
