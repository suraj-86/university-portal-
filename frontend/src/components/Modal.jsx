import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden animate-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
                        <X size={24} />
                    </button>
                </div>
                {/* Body */}
                <div className="p-6 text-slate-900 dark:text-slate-100">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;