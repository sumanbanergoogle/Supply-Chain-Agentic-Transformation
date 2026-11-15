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

interface VisionShelfPlan {
  bayTitle: string;
  eyeLevelLabel: string;
  eyeLevelAlert: boolean;
  waistLabel: string;
  counterLabel: string;
  skus: { name: string; tag: string }[];
}

function visionPlanForOutlet(cause: string): VisionShelfPlan {
  switch (cause) {
    case 'assortment_tier_mismatch':
      return {
        bayTitle: 'Self-Service Gondola Audit · Tier Upgrade',
        eyeLevelLabel: '91% conf · Competitor Personal Care Bay',
        eyeLevelAlert: true,
        waistLabel: '96% conf · ITC Foods & Matches (Active)',
        counterLabel: 'Campus Footfall · Stationery Rack Gap',
        skus: [
          { name: 'Savlon Multipack', tag: 'High-Confidence' },
          { name: 'Fiama Gel Bar', tag: 'Eye-Level Reclaim' },
          { name: 'Classmate Campus', tag: 'Student Footfall' },
        ],
      };
    case 'hero_sku_stockout':
      return {
        bayTitle: 'Hero SKU Facing Audit · WD Fill-Rate Gap',
        eyeLevelLabel: '89% conf · Empty Sunfeast & Bingo! Facings',
        eyeLevelAlert: true,
        waistLabel: '84% conf · Low Aashirvaad 5kg Stack',
        counterLabel: 'Priority WD Replenishment Buffer (48h)',
        skus: [
          { name: 'Sunfeast Dark Fantasy', tag: '48h Buffer Push' },
          { name: 'Bingo! Mad Angles', tag: 'OOS Facing Gap' },
          { name: 'Aashirvaad Atta 5kg', tag: 'Core Replenish' },
        ],
      };
    case 'qcommerce_spillover':
      return {
        bayTitle: 'Walk-In Impulse & Counter Audit · Q-Com Zone',
        eyeLevelLabel: '88% conf · Evening Pack Visibility Lost',
        eyeLevelAlert: true,
        waistLabel: '92% conf · Core Staples Retained',
        counterLabel: '600m Dark-Store Radius · Counter Hanger',
        skus: [
          { name: 'YiPPee! Family Pack', tag: '4% Counter Slab' },
          { name: 'Bingo! Impulse Strip', tag: 'Checkout Grab' },
          { name: "Sunfeast Mom's Magic", tag: 'Loyalty QR Pack' },
        ],
      };
    case 'beat_coverage_fatigue':
      return {
        bayTitle: 'Tail-Beat Stock Audit · Skipped Visit Recovery',
        eyeLevelLabel: '86% conf · Stale Planogram / Missing Replenish',
        eyeLevelAlert: true,
        waistLabel: '90% conf · Partial Carryover Stock',
        counterLabel: 'Post-4:15 PM Cutoff · Beat Split Priority',
        skus: [
          { name: 'Sunfeast Core Combo', tag: 'Pre-4 PM Visit' },
          { name: 'Bingo! Value Packs', tag: 'Guided Order Pad' },
          { name: 'Mangaldeep Agarbatti', tag: 'High-Turn Fill' },
        ],
      };
    case 'credit_margin_squeeze':
      return {
        bayTitle: 'Fast-Turn Replenishment Audit · Credit Unblock',
        eyeLevelLabel: '87% conf · Throttled Multi-Category Order',
        eyeLevelAlert: true,
        waistLabel: '93% conf · Cash-Pay Essentials Only',
        counterLabel: '7-Day Micro-Tranche + Fast-Pay Unlock',
        skus: [
          { name: 'Sunfeast Fast-Turn', tag: 'Weekly Tranche' },
          { name: 'YiPPee! Singles Box', tag: 'Quick Cash Turn' },
          { name: 'Aim & Homelites', tag: 'High-Margin Core' },
        ],
      };
    default:
      return {
        bayTitle: 'Compliant ITC Storefront · Benchmark Outlet',
        eyeLevelLabel: '95% conf · ITC Personal Care Eye-Level',
        eyeLevelAlert: false,
        waistLabel: '97% conf · Full Foods & Staples Facing',
        counterLabel: 'Compliant Front-Bay Visibility (8+ LSPC)',
        skus: [
          { name: 'Aashirvaad & Sunfeast', tag: 'Core Compliant' },
          { name: 'Savlon & Fiama', tag: 'Eye-Level Held' },
          { name: 'Classmate & Mangaldeep', tag: 'Active LSPC' },
        ],
      };
  }
}

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

        {view === 'vision' && (() => {
          const vp = visionPlanForOutlet(outlet.dominant_cause);
          return (
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-mono text-accent uppercase flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> Multimodal Storefront &amp; Shelf Inspection
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/60">
                    Shelf Gap Score: {Math.round(outlet.vision_shelf_gap_score * 100)}%
                  </span>
                </div>

                {/* Annotated Kirana Shelf Planogram & Vision Bounding Boxes */}
                <div className="bg-[#0d1117] border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="flex flex-col p-3 rounded-lg bg-slate-950 border border-border/80 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-textMuted">
                      <span className="flex items-center gap-1 text-sky-300 font-semibold">
                        <Store className="w-3.5 h-3.5" /> {outlet.channel_type}
                      </span>
                      <span>CV AUDIT</span>
                    </div>
                    <svg viewBox="0 0 220 132" className="w-full h-auto rounded border border-slate-800 bg-[#080c12]">
                      {/* Shelf frame */}
                      <rect x="8" y="8" width="204" height="116" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                      {/* Eye-Level Bay */}
                      <rect
                        x="14"
                        y="14"
                        width="192"
                        height="32"
                        rx="3"
                        fill={vp.eyeLevelAlert ? 'rgba(248,81,73,0.14)' : 'rgba(46,160,67,0.16)'}
                        stroke={vp.eyeLevelAlert ? '#f85149' : '#2ea043'}
                        strokeWidth="1.4"
                        strokeDasharray={vp.eyeLevelAlert ? '4 2' : undefined}
                      />
                      <text x="20" y="27" fill={vp.eyeLevelAlert ? '#fda4af' : '#86efac'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                        EYE-LEVEL BAY
                      </text>
                      <text x="20" y="39" fill="#e2e8f0" fontSize="7.5" fontFamily="sans-serif">
                        {vp.eyeLevelLabel.slice(0, 36)}
                      </text>
                      {/* Waist-Level Bay */}
                      <rect x="14" y="52" width="192" height="30" rx="3" fill="rgba(56,139,253,0.12)" stroke="#388bfd" strokeWidth="1.2" />
                      <text x="20" y="64" fill="#93c5fd" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        CORE SHELF
                      </text>
                      <text x="20" y="75" fill="#e2e8f0" fontSize="7.5" fontFamily="sans-serif">
                        {vp.waistLabel.slice(0, 36)}
                      </text>
                      {/* Counter / Front Bay */}
                      <rect x="14" y="88" width="192" height="28" rx="3" fill="rgba(210,153,34,0.12)" stroke="#d29922" strokeWidth="1.2" />
                      <text x="20" y="100" fill="#fcd34d" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        COUNTER / FRONT BAY
                      </text>
                      <text x="20" y="111" fill="#e2e8f0" fontSize="7.5" fontFamily="sans-serif">
                        {vp.counterLabel.slice(0, 36)}
                      </text>
                    </svg>
                    <div className="text-center">
                      <span className="text-xs font-bold text-white block truncate">{outlet.name}</span>
                      <span className="text-[10px] font-mono text-amber-300">{outlet.tier} · {outlet.city}</span>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-semibold text-white">Gemini Multimodal Vision Reasoning · {vp.bayTitle}</div>
                    </div>
                    <p className="text-textMain leading-relaxed">{outlet.storefront_vision_note}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                      {vp.skus.map((sku) => (
                        <div key={sku.name} className="bg-emerald-950/40 border border-emerald-700/50 rounded p-2 text-emerald-300">
                          ✔ {sku.name}
                          <br />
                          <span className="text-[10px] text-textMuted">{sku.tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
