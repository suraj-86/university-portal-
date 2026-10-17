import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { ConfirmContext } from '../context/confirm';

const TONES = {
    danger: { icon: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400', button: 'bg-red-600 hover:bg-red-700', Icon: AlertTriangle },
    warning: { icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400', button: 'bg-amber-600 hover:bg-amber-700', Icon: AlertTriangle },
    primary: { icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400', button: 'bg-blue-600 hover:bg-blue-700', Icon: HelpCircle }
};

const ConfirmProvider = ({ children }) => {
    const [dialog, setDialog] = useState(null);
    const resolver = useRef(null);
    const cancelRef = useRef(null);

    const close = useCallback((answer) => {
        if (resolver.current) resolver.current(answer);
        resolver.current = null;
        setDialog(null);
    }, []);

    const confirm = useCallback((options) => new Promise((resolve) => {
        if (resolver.current) resolver.current(false);
        resolver.current = resolve;
        setDialog(typeof options === 'string' ? { message: options } : options || {});
    }), []);

    useEffect(() => {
        if (!dialog) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') close(false); };
        document.addEventListener('keydown', onKey);
        if (cancelRef.current) cancelRef.current.focus();
        return () => document.removeEventListener('keydown', onKey);
    }, [dialog, close]);

    const tone = TONES[(dialog && dialog.tone) || 'danger'] || TONES.danger;
    const Icon = tone.Icon;

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {dialog && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
                    <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message"
                        className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="flex items-start gap-4">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
                                <Icon size={22} />
                            </div>
                            <div className="min-w-0">
                                <h3 id="confirm-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">{dialog.title || 'Are you sure?'}</h3>
                                {dialog.message && (
                                    <p id="confirm-message" className="mt-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 break-words">{dialog.message}</p>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" ref={cancelRef} onClick={() => close(false)}
                                className="rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                                {dialog.cancelText || 'Cancel'}
                            </button>
                            <button type="button" onClick={() => close(true)}
                                className={`rounded-2xl px-5 py-2.5 text-sm font-bold text-white ${tone.button}`}>
                                {dialog.confirmText || 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

export default ConfirmProvider;
