const ACCENTS = {
  blue: { bar: 'from-sky-500 to-sky-600', icon: 'from-sky-500 to-sky-600' },
  green: { bar: 'from-emerald-500 to-emerald-600', icon: 'from-emerald-500 to-emerald-600' },
  amber: { bar: 'from-amber-500 to-amber-600', icon: 'from-amber-500 to-amber-600' },
  rose: { bar: 'from-rose-500 to-rose-600', icon: 'from-rose-500 to-rose-600' },
  slate: { bar: 'from-slate-500 to-slate-600', icon: 'from-slate-500 to-slate-600' },
};

export default function StatCard({ label, value, sublabel, icon, accent = 'blue' }) {
  const a = ACCENTS[accent] || ACCENTS.blue;
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${a.bar}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
          {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${a.icon} text-white shadow-sm transition-transform duration-300 group-hover:scale-110`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
