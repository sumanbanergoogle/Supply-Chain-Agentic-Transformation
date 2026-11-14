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
import { AlertTriangle, FileText, Loader2, MapPin, ShieldAlert, Sparkles, TrendingUp, Truck } from 'lucide-react';
import { tmdApi } from '../../api/client';
import { CounterfactualResult, OutletDetailPayload, WeeklyPoint } from '../../types/tmd';

export type CanvasView = 'overview' | 'telemetry' | 'diagnosis' | 'recommendation' | 'compare' | 'nearby';

const TABS: { key: CanvasView; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'telemetry', label: 'Telemetry & SKUs' },
  { key: 'diagnosis', label: 'SHAP + GNN Root Cause' },
  { key: 'recommendation', label: 'Next Best Action' },
  { key: 'compare', label: 'Counterfactuals' },
  { key: 'nearby', label: 'Nearby Spillover' },
];

interface OutletDeepDiveDrawerProps {
  outletId: string;
  view: CanvasView;
  onViewChange: (v: CanvasView) => void;
  onSelectOutlet: (id: string) => void;
  onOpenReport: (id: string) => void;
}

export const OutletDeepDiveDrawer: React.FC<OutletDeepDiveDrawerProps> = ({
  outletId,
  view,
  onViewChange,
  onSelectOutlet,
  onOpenReport,
}) => {
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
        <Loader2 className="w-4 h-4 animate-spin text-accent" /> Running ML Attribution &amp; GNN Scoring for {outletId}...
      </div>
    );
  }

  const { outlet, attribution, recommendations, nearby } = detail;
  const badgeColor =
    outlet.health_status === 'critical'
      ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
      : outlet.health_status === 'warning'
        ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
        : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Outlet Header */}
      <div className="p-4 pt-3 border-b border-border bg-surface/60 shrink-0 pr-24">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-bold text-white">{outlet.outlet_id}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeColor}`}>
            {outlet.health_status === 'critical' ? 'ZERO-BILLING RISK' : outlet.health_status === 'warning' ? 'AT-RISK' : 'PRODUCTIVE'}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0d1117] border border-border text-sky-300">
            {outlet.city} · {outlet.beat_id}
          </span>
          <button
            type="button"
            onClick={() => onOpenReport(outlet.outlet_id)}
            className="ml-auto flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded bg-accent/15 hover:bg-accent/25 text-accent border border-accent/40 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Beat Action Pack
          </button>
        </div>
        <h2 className="text-base font-bold text-white mt-1">{outlet.name}</h2>
        <div className="text-xs text-textMuted flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
          <span>{outlet.zone}</span>
          <span>Tier: <strong className="text-white">{outlet.tier}</strong></span>
          <span>WD: <strong className="text-white">{outlet.wd_name}</strong></span>
          <span>Salesman: <strong className="text-white">{outlet.salesman_name}</strong></span>
        </div>

        {/* Question-Driven Tab Strip */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onViewChange(tab.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono whitespace-nowrap transition-colors ${
                view === tab.key
                  ? 'bg-accent text-[#0d1117] font-semibold'
                  : 'bg-[#0d1117] text-textMuted hover:text-white border border-border/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {view === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="bg-[#0d1117] border border-border rounded-lg p-3">
                <div className="text-[10px] font-mono text-textMuted uppercase">Monthly Leakage</div>
                <div className="text-lg font-mono font-bold text-rose-400 mt-0.5">
                  ₹{outlet.revenue_leakage_monthly_inr.toLocaleString()}
                </div>
                <div className="text-[11px] text-textMuted">Baseline ₹{outlet.baseline_weekly_nsv_inr.toLocaleString()}/wk</div>
              </div>
              <div className="bg-[#0d1117] border border-border rounded-lg p-3">
                <div className="text-[10px] font-mono text-textMuted uppercase">Active LSPC</div>
                <div className="text-lg font-mono font-bold text-sky-300 mt-0.5">
                  {outlet.current_lspc} <span className="text-xs text-textMuted">/ {outlet.target_lspc}</span>
                </div>
                <div className="text-[11px] text-textMuted">{outlet.zero_bill_weeks} zero-bill weeks</div>
              </div>
              <div className="bg-[#0d1117] border border-border rounded-lg p-3">
                <div className="text-[10px] font-mono text-textMuted uppercase">ML Churn Risk</div>
                <div className="text-lg font-mono font-bold text-amber-300 mt-0.5">{Math.round(outlet.churn_prob * 100)}%</div>
                <div className="text-[11px] text-textMuted">GNN Spillover: {Math.round(outlet.gnn_spillover_risk * 100)}%</div>
              </div>
              <div className="bg-[#0d1117] border border-border rounded-lg p-3">
                <div className="text-[10px] font-mono text-textMuted uppercase">WD Fill &amp; Visit</div>
                <div className="text-lg font-mono font-bold text-white mt-0.5">{(outlet.wd_fill_rate * 100).toFixed(0)}%</div>
                <div className="text-[11px] text-textMuted">Avg visit: {outlet.avg_visit_duration_min} min</div>
              </div>
            </div>

            <div className="bg-[#0d1117] border border-border rounded-xl p-4 space-y-2">
              <div className="text-xs font-mono text-accent uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Executive ML Synthesis &amp; Storefront Audit
              </div>
              <p className="text-xs text-textMain leading-relaxed">
                Primary SHAP leakage factor is <strong className="text-white">{attribution.factors[0]?.label}</strong>{' '}
                accounting for <strong className="text-amber-300">{attribution.factors[0]?.share_pct}%</strong> of lost
                billing. Closest Q-commerce pod (<span className="font-mono">{outlet.nearest_qc_hub}</span>) sits{' '}
                <strong className="text-purple-300">{outlet.qc_dark_store_dist_km} km</strong> away, contributing a
                Spatio-Temporal GNN spillover score of <strong>{Math.round(outlet.gnn_spillover_risk * 100)}%</strong>.
              </p>
              <div className="text-[11px] font-mono bg-surface border border-border/70 rounded p-2.5 text-textMuted">
                Vision Facade Signal: {outlet.storefront_vision_note}
              </div>
            </div>

            {recommendations.recommendations[0] && (
              <div className="bg-emerald-950/20 border border-emerald-700/50 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[10px] font-mono uppercase text-emerald-300">Top Next Best Action</div>
                  <div className="text-sm font-bold text-white">{recommendations.recommendations[0].title}</div>
                  <div className="text-xs text-textMuted mt-0.5">{recommendations.recommendations[0].rationale}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onViewChange('recommendation')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-[#0d1117] font-semibold text-xs hover:bg-emerald-400"
                >
                  Inspect Plan (+₹{recommendations.recommendations[0].expected_monthly_uplift_inr.toLocaleString()}/mo)
                </button>
              </div>
            )}
          </>
        )}

        {view === 'telemetry' && (
          <div className="space-y-4">
            <div className="bg-[#0d1117] border border-border rounded-xl p-4 h-64">
              <div className="text-xs font-mono text-textMuted mb-2">24-Week Weekly NSV Trajectory (₹) vs Baseline</div>
              <ResponsiveContainer width="100%" height="88%">
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="week_date" stroke="#8b949e" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis stroke="#8b949e" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: 11 }} />
                  <Legend />
                  <Area type="monotone" dataKey="baseline_nsv_inr" name="Baseline NSV" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="nsv_inr" name="Actual Weekly NSV" stroke="#f85149" fill="#f85149" fillOpacity={0.22} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#0d1117] border border-border rounded-xl p-4 h-60">
              <div className="text-xs font-mono text-textMuted mb-2">LSPC &amp; Category Mix Erosion (Foods / Personal Care / Stationery)</div>
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
          <div className="space-y-4">
            <div className="bg-[#0d1117] border border-border rounded-xl p-4 h-64">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-white">SHAP Feature Attribution of Monthly Leakage (₹{attribution.monthly_leakage_inr.toLocaleString()})</span>
                <span className="text-[10px] font-mono text-purple-300">{attribution.model_info.churn_model}</span>
              </div>
              <ResponsiveContainer width="100%" height="86%">
                <BarChart data={attribution.factors} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis type="number" stroke="#8b949e" tick={{ fontSize: 10 }} unit="%" />
                  <YAxis type="category" dataKey="label" width={190} stroke="#8b949e" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: 11 }} />
                  <Bar dataKey="share_pct" name="Attribution %" radius={[0, 4, 4, 0]}>
                    {attribution.factors.map((f) => (
                      <Cell key={f.factor_key} fill={f.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {attribution.factors.map((f) => (
                <div key={f.factor_key} className="bg-[#0d1117] border border-border rounded-lg p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                      {f.label}
                    </div>
                    <div className="text-[11px] text-textMuted mt-0.5">
                      Owner: {f.responsible_function} · Controllable: {f.controllable ? 'Yes' : 'External Market Pressure'}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-white font-bold">{f.share_pct}%</div>
                    <div className="text-rose-300 text-[11px]">₹{f.leakage_inr.toLocaleString()}/mo</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'recommendation' && (
          <div className="space-y-4">
            {recommendations.recommendations.map((rec, idx) => (
              <div key={rec.code} className="bg-[#0d1117] border border-border rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/20 text-accent">#{idx + 1}</span>
                    <span className="text-sm font-bold text-white">{rec.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
                    {rec.fit_label} · {Math.round(rec.p_recovery * 100)}% P(recover)
                  </span>
                </div>
                <p className="text-xs text-textMuted">{rec.rationale}</p>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs bg-surface p-2.5 rounded-lg border border-border/50">
                  <div>
                    <span className="text-[10px] text-textMuted block">Expected Uplift</span>
                    <strong className="text-emerald-400">+₹{rec.expected_monthly_uplift_inr.toLocaleString()}/mo</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-textMuted block">LSPC Gain</span>
                    <strong className="text-sky-300">+{rec.expected_lspc_gain} lines</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-textMuted block">SLA / Payback</span>
                    <strong className="text-white">{rec.sla_days}d · {rec.payback_days}d payback</strong>
                  </div>
                </div>
                <ul className="space-y-1 text-xs text-textMain list-disc pl-4">
                  {rec.sop_steps.map((s, si) => (
                    <li key={si}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="bg-[#0d1117] border border-border rounded-xl p-4">
              <div className="text-xs font-mono text-textMuted mb-2">k-NN Similar Historical Recoveries (Cross-City Analogs)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recommendations.similar_analogs.map((a) => (
                  <div key={a.intervention_id} className="bg-surface border border-border/60 rounded p-2.5 text-xs font-mono">
                    <div className="flex justify-between text-white font-semibold">
                      <span>{a.outlet_id} ({a.city})</span>
                      <span className={a.recovered ? 'text-emerald-400' : 'text-amber-300'}>
                        {a.recovered ? 'RECOVERED' : 'PARTIAL'}
                      </span>
                    </div>
                    <div className="text-[11px] text-textMuted mt-0.5">
                      {a.action_code} · +{a.lspc_uplift} LSPC · +{a.nsv_uplift_pct}% NSV ({a.payback_days}d)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'compare' && counterfactual && (
          <div className="bg-[#0d1117] border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs font-mono text-textMuted">Counterfactual Decision Matrix</div>
                <div className="text-sm font-bold text-white">
                  {counterfactual.recommended.title} vs {counterfactual.alternative.title}
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
                Net Advantage: +₹{counterfactual.net_advantage_inr.toLocaleString()}/mo
              </span>
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left font-mono text-textMuted">
                  <th className="py-2 pr-2">Criterion</th>
                  <th className="py-2 px-2 text-emerald-300">Recommended</th>
                  <th className="py-2 pl-2 text-amber-300">Alternative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {counterfactual.rows.map((r) => (
                  <tr key={r.metric}>
                    <td className="py-2.5 pr-2 text-textMuted">{r.metric}</td>
                    <td className="py-2.5 px-2 text-white">
                      <span className="text-emerald-400 font-bold mr-1">{r.recommended.symbol}</span>
                      {r.recommended.summary}
                    </td>
                    <td className="py-2.5 pl-2 text-textMain">
                      <span className="text-amber-300 font-bold mr-1">{r.alternative.symbol}</span>
                      {r.alternative.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'nearby' && (
          <div className="space-y-2.5">
            <div className="text-xs font-mono text-textMuted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-300" /> Adjacent GT Outlets Within 2.5 km (GNN Contagion Cluster)
            </div>
            {nearby.neighbors.map((n) => (
              <button
                key={n.outlet_id}
                type="button"
                onClick={() => onSelectOutlet(n.outlet_id)}
                className="w-full text-left bg-[#0d1117] border border-border hover:border-accent rounded-lg p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono font-semibold text-white">
                    {n.outlet_id} · <span className="font-sans">{n.name}</span>
                  </div>
                  <div className="text-[11px] text-textMuted mt-0.5">
                    {n.distance_km} km away · Beat {n.beat_id} · LSPC {n.current_lspc}/{n.target_lspc}
                  </div>
                </div>
                <div className="font-mono text-right">
                  <div className="text-rose-300">₹{n.revenue_leakage_monthly_inr.toLocaleString()}/mo</div>
                  <div className="text-[10px] text-textMuted">GNN {Math.round(n.gnn_spillover_risk * 100)}%</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
