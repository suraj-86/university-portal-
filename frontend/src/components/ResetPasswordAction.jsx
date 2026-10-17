import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from './Modal';
import PasswordResultModal from './PasswordResultModal';

const ResetPasswordAction = ({ kind, id, name }) => {
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const reset = async () => {
        setBusy(true);
        try {
            const res = await api.post('/admin/users/reset-password', { kind, id });
            setConfirming(false);
            setResult([{ username: res.data.username, password: res.data.password }]);
        } catch (err) {
            setConfirming(false);
            toast.error(err.response?.data?.error || 'Could not reset the password.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button type="button" onClick={() => setConfirming(true)} aria-label={`Reset password for ${name}`} title="Reset password"
                className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg">
                <KeyRound size={16} />
            </button>
            <Modal isOpen={confirming} onClose={() => setConfirming(false)} title="Reset password?">
                <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        This sets a temporary password for <b>{name}</b>. Their old password stops working right away, and they must choose a new one at their next login.
                        Please confirm who they are before handing it over.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setConfirming(false)} className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">Cancel</button>
                        <button type="button" onClick={reset} disabled={busy} className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-50">
                            {busy ? 'Resetting…' : 'Reset password'}
                        </button>
                    </div>
                </div>
            </Modal>
            <PasswordResultModal isOpen={!!result} onClose={() => setResult(null)} entries={result || []} />
        </>
    );
};

export default ResetPasswordAction;
