const Card = ({ title, subtitle, value, icon, children, className = '' }) => {
  return (
    <div className={`rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:shadow-none transition-all ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          {title && <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{title}</p>}
          {value && <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-100">{value}</p>}
          {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {icon && <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">{icon}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
};

export default Card;