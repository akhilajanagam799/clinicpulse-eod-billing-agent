import { Sparkles, ShieldCheck, Lightbulb, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import UploadZone from '../components/UploadZone.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function SummaryPage() {
  const { result } = useApp();
  const n = result?.narrative;

  return (
    <div>
      <PageHeader
        title="AI Summary"
        description="WhatsApp-style owner narrative with full traceability"
        icon={<Sparkles className="h-6 w-6" />}
      />

      {!result && <div className="mb-6"><UploadZone /></div>}

      {!result && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 py-20 text-center">
          <Sparkles className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-400">Upload a billing log to generate the AI narrative summary.</p>
        </div>
      )}

      {result && n && (
        <div className="space-y-6">
          {/* Status indicator */}
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700">
              {n.status === 'success'
                ? 'Analysis completed successfully.'
                : n.status === 'partial'
                ? `Analysis completed with ${result.reconciliation.invalid_records} rejected record(s).`
                : 'No valid records found in the uploaded log.'}
            </p>
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600">
              <Clock className="h-3.5 w-3.5" />
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* WhatsApp-style narrative */}
            <Card title="Owner Summary" subtitle="WhatsApp business message format">
              <div className="rounded-2xl bg-[#e5ddd5] p-4">
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-white">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">ClinicPulse Agent</p>
                      <p className="text-xs text-emerald-600">online</p>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{n.message}</pre>
                  <p className="mt-3 text-right text-xs text-slate-400">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {n.recommendations.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-semibold text-slate-700">Recommendations</p>
                  </div>
                  <ul className="space-y-2">
                    {n.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 rounded-lg bg-amber-50/60 px-3 py-2 text-sm text-slate-700 ring-1 ring-amber-100">
                        <span className="mt-0.5 text-amber-500">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {/* Traceability panel */}
            <Card title="Traceability" subtitle="Where every number in the narrative came from" action={<ShieldCheck className="h-5 w-5 text-sky-600" />}>
              {n.traced_figures.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                  No traced figures — no valid data was processed.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Value in Narrative</th>
                        <th className="px-4 py-3 font-medium">Source Report Field</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {n.traced_figures.map((fig, i) => (
                        <tr key={i} className="transition-colors hover:bg-sky-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-700">{fig.display_value}</td>
                          <td className="px-4 py-3 font-mono text-xs text-sky-700">{fig.report_field}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-400">
                Every figure above is pulled directly from the deterministic reconciliation or analytics report — no numbers are generated by the narrative layer.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
