import React from 'react';

const FormInput = ({ label, type = "text", value, onChange, placeholder, required = false, dbColumn }) => {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <input 
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
            {dbColumn && <p className="text-[8px] text-slate-300 dark:text-slate-600 italic mt-0.5 ml-1">Maps to: {dbColumn}</p>}
        </div>
    );
};

export default FormInput;