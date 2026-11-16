import React, { useEffect, useState } from 'react';
import { Loader2, Printer, X } from 'lucide-react';
import { tmdApi } from '../../api/client';

export const FieldReportOverlay: React.FC<{
  outletId: string;
  onClose: () => void;
}> = ({ outletId, onClose }) => {
  const [data, setData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    tmdApi.report(outletId).then(setData);
  }, [outletId]);

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="font-mono text-sm font-bold">ITC TM&amp;D · Executive Beat Action Pack ({outletId})</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700"
              aria-label="Close report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!data ? (
          <div className="p-12 flex items-center justify-center text-sm font-mono text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating field dispatch briefing...
          </div>
        ) : (
          <div className="p-8 space-y-6 text-sm">
            <div className="border-b pb-4 flex justify-between items-start">
              <div>
                <div className="text-xs font-mono uppercase text-blue-700 font-bold">ITC Limited · Trade Marketing &amp; Distribution</div>
                <h1 className="text-2xl font-bold text-slate-900 mt-1">
                  {data.outlet.outlet_id} · {data.outlet.name}
                </h1>
                <p className="text-slate-600 text-xs mt-1">
                  {data.outlet.city} · {data.outlet.zone} · Beat {data.outlet.beat_id} · WD: {data.outlet.wd_name}
                </p>
              </div>
              <div className="text-right font-mono text-xs">
                <div>As-of: {data.as_of}</div>
                <div className="text-rose-600 font-bold text-base mt-1">
                  ₹{Number(data.outlet.revenue_leakage_monthly_inr).toLocaleString()} / mo at risk
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border font-mono text-xs">
              <div><span className="text-slate-500 block">Current LSPC</span><strong>{data.outlet.current_lspc} / {data.outlet.target_lspc}</strong></div>
              <div><span className="text-slate-500 block">Churn Probability</span><strong>{Math.round(data.outlet.churn_prob * 100)}%</strong></div>
              <div><span className="text-slate-500 block">WD Fill Rate</span><strong>{(data.outlet.wd_fill_rate * 100).toFixed(0)}%</strong></div>
              <div><span className="text-slate-500 block">Avg Visit Time</span><strong>{data.outlet.avg_visit_duration_min} min</strong></div>
            </div>

            <div>
              <h2 className="font-bold text-base mb-2">ML Root-Cause Decomposition (SHAP)</h2>
              <div className="space-y-1.5">
                {data.attribution.factors.map((f: any) => (
                  <div key={f.factor_key} className="flex justify-between text-xs border-b py-1">
                    <span>{f.label} ({f.responsible_function})</span>
                    <span className="font-mono font-bold">{f.share_pct}% (₹{Number(f.leakage_inr).toLocaleString()})</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-bold text-base mb-2">Recommended Sales Officer Action Plan</h2>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                <div className="font-bold text-emerald-900">{data.recommendations[0]?.title}</div>
                <div className="text-xs text-emerald-800">{data.recommendations[0]?.rationale}</div>
                <ul className="list-disc pl-5 text-xs space-y-1 text-slate-800">
                  {data.dispatch_checklist.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t pt-3 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Sources: WD DMS Secondary Billing · SFA GPS Telemetry · eB2B App · 600m Q-Com Proximity Graph</span>
              <span>Cadence: Daily Sync</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
