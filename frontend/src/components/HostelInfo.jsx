import React from 'react';
import { Building2, Phone } from 'lucide-react';

const Detail = ({ label, children }) => (
    <div className="py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0 sm:border-b-0">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <div className="text-base font-bold text-slate-900 dark:text-slate-100">{children || '—'}</div>
    </div>
);

const Contact = ({ value }) =>
    value ? (
        <a href={`tel:${value.replace(/[^0-9+]/g, '')}`} className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline">
            <Phone size={14} />
            {value}
        </a>
    ) : null;

const HostelInfo = ({ data }) => {
    if (!data || !data.allotted) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-10 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
                    <Building2 size={26} />
                </div>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">No hostel has been allotted.</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    If you believe this is a mistake, please contact the hostel office.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Building2 size={22} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Allotted hostel</p>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{data.hostel}</h3>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 sm:gap-y-5">
                <Detail label="Block">{data.block}</Detail>
                <Detail label="Room number">{data.room}</Detail>
                <Detail label="Session">{data.session}</Detail>
                <Detail label="Semester">{data.semester}</Detail>
                <Detail label="Allotted on">{data.allottedOn}</Detail>
            </div>

            <div className="px-6 pb-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Detail label="Warden">{data.warden?.name}</Detail>
                    <Detail label="Warden contact"><Contact value={data.warden?.contact} /></Detail>
                    <Detail label="Hostel contact"><Contact value={data.hostelContact} /></Detail>
                </div>
            </div>
        </div>
    );
};

export default HostelInfo;
