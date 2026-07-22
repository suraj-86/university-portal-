import React from 'react';

const Button = ({ children, onClick, variant = 'primary', type = 'button', className = '', disabled = false }) => {
    const baseStyles = "font-bold py-3 px-6 rounded-2xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
        secondary: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800",
        danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20",
        success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

export default Button;