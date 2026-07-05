const StatsWidget = ({ title, value, trend, icon, className = '' }) => {
  return (
    <div className={`rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        {icon && <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-700">{icon}</div>}
      </div>
      {trend && <p className="mt-4 text-sm text-emerald-600">{trend}</p>}
    </div>
  )
}

export default StatsWidget
