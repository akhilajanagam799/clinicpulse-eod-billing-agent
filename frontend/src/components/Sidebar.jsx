import { NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard, BarChart3, Sparkles } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/summary', label: 'AI Summary', icon: Sparkles },
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-gradient-to-b from-sky-700 via-sky-800 to-slate-900 text-white shadow-xl">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide">ClinicPulse</p>
          <p className="text-xs text-sky-200/80">EOD Billing Agent</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white/15 text-white shadow-inner ring-1 ring-white/20'
                  : 'text-sky-100/80 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-5">
        <p className="text-xs text-sky-200/70">Internship Submission</p>
        <p className="mt-1 text-xs text-sky-200/50">Deterministic Analytics Layer</p>
      </div>
    </aside>
  );
}
