const StatsWidget = ({ title, value, trend, icon, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 shadow-sm flex items-center justify-between ${className}`}>
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">{value}</h3>
        {trend && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{trend}</p>}
      </div>
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
    </div>
  );
};

export default StatsWidget;