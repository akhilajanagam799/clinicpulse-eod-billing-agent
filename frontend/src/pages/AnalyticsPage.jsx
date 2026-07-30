import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { BarChart3, Trophy, Pill, IndianRupee } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { paiseToRupeesRounded } from '../utils/money.js';
import UploadZone from '../components/UploadZone.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';

const BLUE = '#0284c7';
const PEAK = '#f59e0b';
const PALETTE = ['#0284c7', '#0ea5e9', '#14b8a6', '#22c8a6', '#84cc16', '#eab308', '#f97316', '#ef4444', '#ec4899', '#8b5cf6'];

export default function AnalyticsPage() {
  const { result } = useApp();
  const a = result?.analytics;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Revenue trends and medicine performance from today's billing"
        icon={<BarChart3 className="h-6 w-6" />}
      />

      {!result && <div className="mb-6"><UploadZone /></div>}

      {!result && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 py-20 text-center">
          <BarChart3 className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-400">Upload a billing log to view analytics charts.</p>
        </div>
      )}

      {result && a && (
        <div className="space-y-6">
          {/* Highlight cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <HighlightCard
              icon={<Trophy className="h-5 w-5" />}
              label="Peak Revenue Hour"
              value={a.peak_hour_label}
              sub={`${paiseToRupeesRounded(a.peak_hour_revenue_paise)} collected`}
              gradient="from-amber-400 to-amber-600"
            />
            <HighlightCard
              icon={<Pill className="h-5 w-5" />}
              label="Top Medicine (Qty)"
              value={a.top_medicines_by_qty[0]?.drug_name ?? 'N/A'}
              sub={`${a.top_medicines_by_qty[0]?.total_qty ?? 0} units sold`}
              gradient="from-sky-500 to-sky-700"
            />
            <HighlightCard
              icon={<IndianRupee className="h-5 w-5" />}
              label="Top Medicine (Revenue)"
              value={a.top_medicines_by_revenue[0]?.drug_name ?? 'N/A'}
              sub={a.top_medicines_by_revenue[0] ? paiseToRupeesRounded(a.top_medicines_by_revenue[0].total_revenue_paise) : 'N/A'}
              gradient="from-emerald-500 to-emerald-700"
            />
          </div>

          {/* Revenue by hour */}
          <Card title="Revenue By Hour" subtitle="Bar chart with peak hour highlighted">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.revenue_by_hour} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `₹${Math.round(v / 100)}`} />
                  <Tooltip formatter={(v) => [paiseToRupeesRounded(Number(v)), 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="revenue_paise" name="Revenue" radius={[6, 6, 0, 0]} animationDuration={800}>
                    {a.revenue_by_hour.map((entry) => (
                      <Cell key={entry.hour} fill={entry.is_peak ? PEAK : BLUE} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Medicine rankings */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Top Medicines By Quantity" subtitle="Units sold across all visits">
              <MedicineBarChart data={a.top_medicines_by_qty} valueKey="total_qty" valueLabel="Units Sold" formatter={(v) => `${v} units`} />
            </Card>
            <Card title="Top Medicines By Revenue" subtitle="Revenue contribution per medicine">
              <MedicineBarChart data={a.top_medicines_by_revenue} valueKey="total_revenue_paise" valueLabel="Revenue" formatter={(v) => paiseToRupeesRounded(Number(v))} />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightCard({ icon, label, value, sub, gradient }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-sm`}>
      <div className="flex items-center gap-2 text-white/90">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-white/90">{sub}</p>
    </div>
  );
}

function MedicineBarChart({ data, valueKey, valueLabel, formatter }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">No medicine data available.</div>;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => (valueKey === 'total_revenue_paise' ? `₹${Math.round(v / 100)}` : `${v}`)} />
          <YAxis type="category" dataKey="drug_name" width={110} tick={{ fontSize: 11, fill: '#475569' }} />
          <Tooltip formatter={(v) => [formatter(Number(v)), valueLabel]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Legend />
          <Bar dataKey={valueKey} name={valueLabel} radius={[0, 6, 6, 0]} animationDuration={800}>
            {data.map((_, i) => (<Cell key={i} fill={PALETTE[i % PALETTE.length]} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
