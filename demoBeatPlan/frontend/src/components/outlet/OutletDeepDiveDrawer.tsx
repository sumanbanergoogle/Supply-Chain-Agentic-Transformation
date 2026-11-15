import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Camera, CheckCircle2, FileText, Loader2, MapPin, Sparkles, Store } from 'lucide-react';
import { tmdApi } from '../../api/client';
import { CounterfactualResult, OutletDetailPayload, WeeklyPoint } from '../../types/tmd';

export type CanvasView = 'overview' | 'telemetry' | 'diagnosis' | 'vision' | 'recommendation' | 'compare' | 'nearby';

const TABS: { key: CanvasView; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'telemetry', label: 'Telemetry' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'vision', label: 'Storefront Vision' },
  { key: 'recommendation', label: 'Recommendation' },
  { key: 'compare', label: 'Compare' },
  { key: 'nearby', label: 'Nearby' },
];

export const OutletDeepDiveDrawer: React.FC<{
  outletId: string;
  view: CanvasView;
  onViewChange: (v: CanvasView) => void;
  onSelectOutlet: (id: string) => void;
  onOpenReport: (id: string) => void;
}> = ({ outletId, view, onViewChange, onSelectOutlet, onOpenReport }) => {
  const [detail, setDetail] = useState<OutletDetailPayload | null>(null);
  const [history, setHistory] = useState<WeeklyPoint[]>([]);
  const [counterfactual, setCounterfactual] = useState<CounterfactualResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([tmdApi.outletDetail(outletId), tmdApi.outletHistory(outletId), tmdApi.counterfactual(outletId)])
      .then(([d, h, c]) => {
        if (!active) return;
        setDetail(d);
        setHistory(h);
        setCounterfactual(c);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [outletId]);

  if (loading || !detail) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs font-mono text-textMuted gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-accent" /> Loading {outletId} telemetry &amp; ML models...
      </div>
    );
  }

  const { outlet, attribution, recommendations, nearby } = detail;
  const badgeStyle =
    outlet.health_status === 'critical'
      ? { bg: 'rgba(248,81,73,0.16)', color: '#f85149', border: 'rgba(248,81,73,0.4)', label: 'ZERO-BILLING' }
      : outlet.health_status === 'warning'
        ? { bg: 'rgba(210,153,34,0.16)', color: '#d29922', border: 'rgba(210,153,34,0.4)', label: 'NEEDS ATTENTION' }
        : { bg: 'rgba(46,160,67,0.16)', color: '#2ea043', border: 'rgba(46,160,67,0.4)', label: 'HEALTHY' };

  return (
    <aside className="h-full w-full bg-[#0d1117] overflow-y-auto flex flex-col">
      {/* Sticky Header matching WellDeepDiveDrawer.tsx */}
      <div className="sticky top-0 bg-[#0d1117]/95 backdrop-blur border-b border-border p-4 z-20 pr-20">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-bold font-mono text-white tracking-wide">{outlet.outlet_id}</h2>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider"
            style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.border}` }}
          >
            {badgeStyle.label}
          </span>
          <button
            type="button"
            onClick={() => onOpenReport(outlet.outlet_id)}
            className="ml-auto flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded border border-accent/40 text-accent hover:bg-accent/20 hover:text-white transition-colors"
          >
            <FileText className="w-3 h-3" /> Field report
          </button>
        </div>
        <div className="text-xs font-mono text-textMuted mt-1">
          {outlet.name} · {outlet.city} · Beat {outlet.beat_id} · WD {outlet.wd_name}
        </div>
        <nav className="flex gap-3 mt-2.5 -mb-4 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onViewChange(t.key)}
              className={`whitespace-nowrap pb-2 text-[11px] font-sans border-b-2 transition-colors ${
                view === t.key ? 'border-accent text-white font-semibold' : 'border-transparent text-textMuted hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4 flex-1">
        {view === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="text-[10px] font-mono text-textMuted uppercase">Monthly Leakage</div>
                <div className="text-lg font-mono font-bold text-rose-400">₹{outlet.revenue_leakage_monthly_inr.toLocaleString()}</div>
              </div>
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="text-[10px] font-mono text-textMuted uppercase">LSPC</div>
                <div className="text-lg font-mono font-bold text-sky-300">
                  {outlet.current_lspc} <span className="text-xs text-textMuted">/ {outlet.target_lspc}</span>
                </div>
              </div>
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="text-[10px] font-mono text-textMuted uppercase">Churn Risk</div>
                <div className="text-lg font-mono font-bold text-amber-300">{Math.round(outlet.churn_prob * 100)}%</div>
              </div>
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="text-[10px] font-mono text-textMuted uppercase">SFA GPS Check-in</div>
                <div className="text-xs font-mono font-bold text-white mt-1">{outlet.actual_gps_time}</div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4 space-y-2">
              <div className="text-xs font-mono text-accent uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Executive ML Synthesis
              </div>
              <p className="text-xs text-textMain leading-relaxed">
                Top SHAP driver: <strong className="text-white">{attribution.factors[0]?.label}</strong> ({attribution.factors[0]?.share_pct}%).{' '}
                Nearest Q-commerce dark store (<span className="font-mono">{outlet.nearest_qc_hub}</span>) is{' '}
                <strong className="text-purple-300">{outlet.qc_dark_store_dist_km} km</strong> away (GNN Spillover:{' '}
                {Math.round(outlet.gnn_spillover_risk * 100)}%).
              </p>
              <div className="pt-2 border-t border-border/60 text-[10px] font-mono text-textMuted">
                Data Sync: WD DMS Secondary Billing · SFA GPS Check-ins · eB2B Order Signals · 600m Q-Com Graph · Daily Refresh
              </div>
            </div>
          </>
        )}

        {view === 'vision' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-accent uppercase flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Multimodal Storefront &amp; Shelf Inspection
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/60">
                  Shelf Gap Score: {Math.round(outlet.vision_shelf_gap_score * 100)}%
                </span>
              </div>

              {/* Visual Shelf Audit Schematic */}
              <div className="bg-[#0d1117] border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div className="flex flex-col items-center justify-center p-3 rounded bg-slate-900 border border-border/80">
                  <Store className="w-10 h-10 text-sky-400 mb-1" />
                  <span className="text-xs font-bold text-white text-center">{outlet.name}</span>
                  <span className="text-[10px] font-mono text-amber-300 mt-0.5">{outlet.tier}</span>
                </div>
                <div className="md:col-span-2 space-y-2 text-xs">
                  <div className="font-semibold text-white">Gemini Multimodal Vision Reasoning:</div>
                  <p className="text-textMain leading-relaxed">{outlet.storefront_vision_note}</p>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-emerald-950/40 border border-emerald-700/50 rounded p-2 text-emerald-300">
                      ✔ Savlon Multipack<br /><span className="text-[10px] text-textMuted">High-Confidence</span>
                    </div>
                    <div className="bg-emerald-950/40 border border-emerald-700/50 rounded p-2 text-emerald-300">
                      ✔ Fiama Gel Bar<br /><span className="text-[10px] text-textMuted">Eye-level Reclaim</span>
                    </div>
                    <div className="bg-emerald-950/40 border border-emerald-700/50 rounded p-2 text-emerald-300">
                      ✔ Classmate Campus<br /><span className="text-[10px] text-textMuted">Student Footfall</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'telemetry' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-lg p-4 h-60">
              <div className="text-xs font-mono text-textMuted mb-2">Weekly NSV Trajectory (₹) vs Baseline</div>
              <ResponsiveContainer width="100%" height="88%">
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="week_date" stroke="#8b949e" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis stroke="#8b949e" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: 11 }} />
                  <Legend />
                  <Area type="monotone" dataKey="baseline_nsv_inr" name="Baseline NSV" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="nsv_inr" name="Actual NSV" stroke="#f85149" fill="#f85149" fillOpacity={0.22} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4 h-56">
              <div className="text-xs font-mono text-textMuted mb-2">Lines Sold Per Call (LSPC) vs Target</div>
              <ResponsiveContainer width="100%" height="88%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="week_date" stroke="#8b949e" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis stroke="#8b949e" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: 11 }} />
                  <Legend />
                  <Line type="monotone" dataKey="target_lspc" name="Target LSPC" stroke="#2ea043" strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="lspc" name="Actual LSPC" stroke="#d29922" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {view === 'diagnosis' && (
          <div className="bg-surface border border-border rounded-lg p-4 h-64">
            <div className="text-xs font-mono text-white mb-2">SHAP Leakage Attribution (₹{attribution.monthly_leakage_inr.toLocaleString()}/mo)</div>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={attribution.factors} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis type="number" stroke="#8b949e" tick={{ fontSize: 10 }} unit="%" />
                <YAxis type="category" dataKey="label" width={190} stroke="#8b949e" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: 11 }} />
                <Bar dataKey="share_pct" name="Share %" radius={[0, 4, 4, 0]}>
                  {attribution.factors.map((f) => (
                    <Cell key={f.factor_key} fill={f.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {view === 'recommendation' && (
          <div className="space-y-3">
            {recommendations.recommendations.map((rec, idx) => (
              <div key={rec.code} className="bg-surface border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">#{idx + 1} · {rec.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
                    {Math.round(rec.p_recovery * 100)}% P(recover) · +₹{rec.expected_monthly_uplift_inr.toLocaleString()}/mo
                  </span>
                </div>
                <p className="text-xs text-textMuted">{rec.rationale}</p>
                <ul className="list-disc pl-4 text-xs text-textMain space-y-0.5">
                  {rec.sop_steps.map((s, si) => <li key={si}>{s}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {view === 'compare' && counterfactual && (
          <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Counterfactual Comparison</span>
              <span className="text-xs font-mono text-emerald-300">+₹{counterfactual.net_advantage_inr.toLocaleString()}/mo advantage</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left font-mono text-textMuted">
                  <th className="py-2">Criterion</th>
                  <th className="py-2 text-emerald-300">Recommended</th>
                  <th className="py-2 text-amber-300">Alternative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {counterfactual.rows.map((r) => (
                  <tr key={r.metric}>
                    <td className="py-2 text-textMuted">{r.metric}</td>
                    <td className="py-2 text-white">{r.recommended.symbol} {r.recommended.summary}</td>
                    <td className="py-2 text-textMain">{r.alternative.symbol} {r.alternative.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'nearby' && (
          <div className="space-y-2">
            {nearby.neighbors.map((n) => (
              <button
                key={n.outlet_id}
                type="button"
                onClick={() => onSelectOutlet(n.outlet_id)}
                className="w-full text-left bg-surface border border-border hover:border-accent rounded-lg p-3 flex justify-between text-xs"
              >
                <span><strong className="font-mono text-white">{n.outlet_id}</strong> · {n.name} ({n.distance_km} km)</span>
                <span className="font-mono text-rose-300">₹{n.revenue_leakage_monthly_inr.toLocaleString()}/mo</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
