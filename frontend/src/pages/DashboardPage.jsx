import {
  Wallet, CheckCircle2, AlertCircle, RotateCcw,
  Users, Stethoscope, Receipt, CheckCheck, XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useIsProcessing } from '../hooks/useIsProcessing.js';
import { paiseToRupeesRounded } from '../utils/money.js';
import UploadZone from '../components/UploadZone.jsx';
import StatCard from '../components/StatCard.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function DashboardPage() {
  const { result, source } = useApp();
  const isProcessing = useIsProcessing();
  const r = result?.reconciliation;

  return (
    <div>
      <PageHeader
        title="End of Day Dashboard"
        description="Reconciliation summary and clinic operational stats"
        icon={<Wallet className="h-6 w-6" />}
      />

      <div className="mb-6">
        <UploadZone />
        {source && result && (
          <p className="mt-2 text-center text-xs text-slate-400">
            Processed {source === 'backend' ? 'via FastAPI backend' : 'via client-side engine'} ·{' '}
            {result.reconciliation.valid_records} valid ·{' '}
            {result.reconciliation.invalid_records} rejected
          </p>
        )}
      </div>

      {!result && !isProcessing && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 py-20 text-center">
          <Wallet className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-400">Upload a billing log to view the reconciliation dashboard.</p>
        </div>
      )}

      {result && r && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Billed" value={paiseToRupeesRounded(r.total_billed_paise)} icon={<Wallet className="h-5 w-5" />} accent="blue" />
            <StatCard label="Total Collected" value={paiseToRupeesRounded(r.total_collected_paise)} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" />
            <StatCard label="Outstanding" value={paiseToRupeesRounded(r.outstanding_paise)} icon={<AlertCircle className="h-5 w-5" />} accent="amber" />
            <StatCard label="Refunds" value={paiseToRupeesRounded(r.total_refunds_paise)} sublabel={`${r.refund_count} transaction(s)`} icon={<RotateCcw className="h-5 w-5" />} accent="rose" />
          </div>

          {/* Payment breakdown + additional stats */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card title="Payment Mode Breakdown" subtitle="Billed vs collected per mode" className="lg:col-span-2">
              <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Mode</th>
                      <th className="px-4 py-3 font-medium">Billed</th>
                      <th className="px-4 py-3 font-medium">Collected</th>
                      <th className="px-4 py-3 font-medium">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.payment_breakdown.map((row) => (
                      <tr key={row.mode} className="transition-colors hover:bg-sky-50/50">
                        <td className="px-4 py-3 font-medium capitalize text-slate-700">{row.mode}</td>
                        <td className="px-4 py-3 text-slate-600">{paiseToRupeesRounded(row.billed_paise)}</td>
                        <td className="px-4 py-3 text-slate-600">{paiseToRupeesRounded(row.collected_paise)}</td>
                        <td className="px-4 py-3 text-slate-600">{paiseToRupeesRounded(row.outstanding_paise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Additional Statistics" subtitle="Operational counts">
              <div className="grid grid-cols-2 gap-3">
                <MiniStat icon={<Users className="h-4 w-4" />} label="Patients" value={r.patient_count} />
                <MiniStat icon={<Stethoscope className="h-4 w-4" />} label="Doctors" value={r.doctor_count} />
                <MiniStat icon={<Receipt className="h-4 w-4" />} label="Transactions" value={r.total_transactions} />
                <MiniStat icon={<CheckCheck className="h-4 w-4" />} label="Valid Records" value={r.valid_records} tone="green" />
                <MiniStat icon={<XCircle className="h-4 w-4" />} label="Invalid Records" value={r.invalid_records} tone={r.invalid_records > 0 ? 'rose' : 'slate'} />
              </div>
            </Card>
          </div>

          {/* Validation errors */}
          {result.validation_errors.length > 0 && (
            <Card title="Validation Errors" subtitle="Rejected records and reasons">
              <div className="max-h-64 overflow-y-auto rounded-xl ring-1 ring-slate-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Row</th>
                      <th className="px-4 py-2 font-medium">Visit ID</th>
                      <th className="px-4 py-2 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.validation_errors.map((e, i) => (
                      <tr key={i} className="hover:bg-rose-50/40">
                        <td className="px-4 py-2 text-slate-500">{e.row_index}</td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-600">{e.visit_id ?? '—'}</td>
                        <td className="px-4 py-2 text-rose-600">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'text-sky-600 bg-sky-50',
    green: 'text-emerald-600 bg-emerald-50',
    rose: 'text-rose-600 bg-rose-50',
    slate: 'text-slate-500 bg-slate-100',
  };
  return (
    <div className="rounded-xl bg-slate-50/70 p-3 ring-1 ring-slate-100">
      <div className={`mb-2 inline-flex rounded-lg p-1.5 ${tones[tone]}`}>{icon}</div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-700">{value}</p>
    </div>
  );
}
