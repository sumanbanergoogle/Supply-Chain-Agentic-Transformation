import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';
import { ArrowRight, CheckCircle2, Loader2, Play, Send, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { tmdApi } from '../../api/client';
import { BeatDiagnosisPayload, BeatInfo, BeatSimulation, CityBenchmark, CityName, OutletSummary } from '../../types/tmd';
import { PERSONA_LIST, usePersona } from '../../state/persona';

export const CityComparisonView: React.FC<{ onSelectCity: (c: CityName) => void }> = ({ onSelectCity }) => {
  const [rows, setRows] = useState<CityBenchmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tmdApi
      .compareCities()
      .then((res) => setRows(res.cities))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center gap-2 text-xs font-mono text-textMuted">
        <Loader2 className="w-4 h-4 animate-spin text-accent" /> Comparing Bangalore · Hyderabad · Chennai...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white">Compare Cities — ITC TM&amp;D Metro Benchmark</h2>
        <p className="text-xs text-textMuted mt-0.5">
          General Trade monthly leakage, zero-billing incidence, and ML-attributed primary failure mode across Metro Branches.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {rows.map((c) => (
          <button
            key={c.city}
            type="button"
            onClick={() => onSelectCity(c.city as CityName)}
            className="text-left bg-[#0d1117] border border-border hover:border-accent rounded-lg p-4 transition-colors space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{c.city}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-700/50">
                {c.zero_billing_pct}% Zero-Bill
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <div>
                <div className="text-[10px] text-textMuted">Monthly Leakage</div>
                <div className="text-rose-400 font-bold">₹{(c.monthly_leakage_inr / 100000).toFixed(2)} L</div>
              </div>
              <div>
                <div className="text-[10px] text-textMuted">Avg LSPC / Target</div>
                <div className="text-sky-300 font-bold">
                  {c.avg_lspc} / {c.target_lspc}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-textMuted">ECO / Strike Rate</div>
                <div className="text-emerald-300 font-bold">
                  {c.eco_pct ?? '--'}% · {c.strike_rate_pct ?? '--'}% PC
                </div>
              </div>
              <div>
                <div className="text-[10px] text-textMuted">Drop Size (Wk Call)</div>
                <div className="text-white">₹{Number(c.avg_drop_size_inr || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-textMuted">WD Fill Rate</div>
                <div className="text-white">{(c.avg_wd_fill_rate * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-textMuted">GNN Spillover</div>
                <div className="text-amber-300">{(c.avg_gnn_spillover * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div className="text-[11px] text-textMuted pt-1 border-t border-border/50 truncate">
              Top Cause: <span className="text-white font-mono">{c.top_root_cause}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-[#0d1117] border border-border rounded-lg p-4 h-64">
        <div className="text-xs font-mono text-textMuted mb-2">Monthly NSV Leakage (₹ Lakhs) vs Zero-Billing Outlets</div>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={rows.map((r) => ({ ...r, leakage_lakhs: Number((r.monthly_leakage_inr / 100000).toFixed(2)) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="city" stroke="#8b949e" tick={{ fontSize: 11 }} />
            <YAxis stroke="#8b949e" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: 12 }} />
            <Legend />
            <Bar dataKey="leakage_lakhs" name="Leakage (₹L/mo)" fill="#f85149" radius={[4, 4, 0, 0]} />
            <Bar dataKey="critical_count" name="Zero-Billing Outlets" fill="#d29922" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const CityHealthPriorityView: React.FC<{
  city: string;
  onSelectCity: (c: 'ALL' | CityName) => void;
  onOpenOutlet: (id: string) => void;
}> = ({ city, onSelectCity, onOpenOutlet }) => {
  const [summary, setSummary] = useState<any>(null);
  const [queue, setQueue] = useState<OutletSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tmdApi
      .cityHealth(city)
      .then((res) => {
        setSummary(res.summary);
        setQueue(res.priority_queue);
      })
      .finally(() => setLoading(false));
  }, [city]);

  const total = summary?.total_outlets || 1;
  const pctH = summary ? (summary.healthy_count / total) * 100 : 0;
  const pctW = summary ? (summary.warning_count / total) * 100 : 0;
  const pctC = summary ? (summary.critical_count / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
          <span className="text-textMuted">City:</span>
          {(['ALL', 'Bangalore', 'Hyderabad', 'Chennai'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onSelectCity(c)}
              className={`px-2.5 py-1 rounded border ${
                city === c ? 'border-accent text-white bg-[#0d1117]' : 'border-border text-textMuted hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-textMuted">Click an outlet to inspect SHAP + Vision</span>
      </div>

      {/* HealthBucketsCard matching reference repo */}
      {summary && (
        <div className="bg-[#0d1117] border border-border rounded-lg p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h2 className="font-mono font-bold uppercase text-white">
              Outlet Health — {city === 'ALL' ? 'All Metro Cities' : city}
            </h2>
            <span className="font-mono text-textMuted">{summary.total_outlets} outlets · as of {summary.as_of}</span>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-border/40">
            <div style={{ width: `${pctH}%`, backgroundColor: '#2ea043' }} />
            <div style={{ width: `${pctW}%`, backgroundColor: '#d29922' }} />
            <div style={{ width: `${pctC}%`, backgroundColor: '#f85149' }} />
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            <div className="bg-surface border border-border/60 rounded p-2">
              <span className="text-emerald-400 font-bold">● Healthy: {summary.healthy_count}</span>
              <span className="block text-[10px] text-textMuted">Active core range billing</span>
            </div>
            <div className="bg-surface border border-border/60 rounded p-2">
              <span className="text-amber-400 font-bold">● Attention: {summary.warning_count}</span>
              <span className="block text-[10px] text-textMuted">LSPC erosion / single-category</span>
            </div>
            <div className="bg-surface border border-border/60 rounded p-2">
              <span className="text-rose-400 font-bold">● Zero-Billing: {summary.critical_count}</span>
              <span className="block text-[10px] text-textMuted">
                {summary.coverage_miss_count ?? 0} Coverage Miss · {summary.zero_order_visit_count ?? 0} Zero-Order Visit
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1 border-t border-border/50 text-textMuted">
            <div>
              ECO (Effective Coverage): <strong className="text-emerald-300">{summary.eco_pct ?? '--'}%</strong>
            </div>
            <div>
              PC Strike Rate: <strong className="text-sky-300">{summary.strike_rate_pct ?? '--'}%</strong>
            </div>
            <div>
              Avg Drop Size: <strong className="text-white">₹{Number(summary.avg_drop_size_inr || 0).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}

      {/* PriorityQueueTable matching reference repo */}
      {loading ? (
        <div className="py-10 flex justify-center text-xs font-mono text-textMuted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading priority queue...
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg bg-[#0d1117]">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface border-b border-border font-mono text-[11px] text-textMuted">
              <tr>
                <th className="p-2.5">Outlet</th>
                <th className="p-2.5">Beat / Zone</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">LSPC</th>
                <th className="p-2.5">Churn Prob</th>
                <th className="p-2.5">Leakage / Mo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {queue.map((o) => (
                <tr
                  key={o.outlet_id}
                  onClick={() => onOpenOutlet(o.outlet_id)}
                  className="hover:bg-surface/80 cursor-pointer transition-colors"
                >
                  <td className="p-2.5">
                    <div className="font-mono font-semibold text-white">{o.outlet_id}</div>
                    <div className="text-[11px] text-textMuted">{o.name}</div>
                  </td>
                  <td className="p-2.5 font-mono text-[11px]">
                    <div className="text-white">{o.beat_id}</div>
                    <div className="text-textMuted">{o.zone}</div>
                  </td>
                  <td className="p-2.5 font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        o.health_status === 'critical'
                          ? 'bg-rose-950/70 text-rose-300 border border-rose-700/50'
                          : 'bg-amber-950/70 text-amber-300 border border-amber-700/50'
                      }`}
                    >
                      {o.health_status === 'critical' ? 'ZERO-BILLING' : 'ATTENTION'}
                    </span>
                    {o.zero_billing_type && (
                      <div className="text-[10px] font-sans text-textMuted mt-0.5">{o.zero_billing_type}</div>
                    )}
                  </td>
                  <td className="p-2.5 font-mono text-white">
                    {o.current_lspc} / <span className="text-textMuted">{o.target_lspc}</span>
                  </td>
                  <td className="p-2.5 font-mono text-rose-300">{Math.round(o.churn_prob * 100)}%</td>
                  <td className="p-2.5 font-mono font-bold text-rose-400">
                    ₹{o.revenue_leakage_monthly_inr.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const BeatDiagnosisView: React.FC<{
  city?: string;
  beatId: string;
  onSelectBeat: (b: string) => void;
  onOpenOutlet: (id: string) => void;
}> = ({ city = 'ALL', beatId, onSelectBeat, onOpenOutlet }) => {
  const [diag, setDiag] = useState<BeatDiagnosisPayload | null>(null);
  const [cityBeats, setCityBeats] = useState<BeatInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tmdApi.beats(city).then((list) => {
      setCityBeats(list);
      if (city !== 'ALL' && list.length > 0 && !list.some((b) => b.beat_id === beatId)) {
        const prioritized =
          list.find((b) => b.beat_mode === 'traffic_cutoff' || b.beat_mode === 'stockout_qcom') || list[0];
        onSelectBeat(prioritized.beat_id);
      }
    });
  }, [city]);

  useEffect(() => {
    setLoading(true);
    tmdApi
      .diagnoseBeat(beatId)
      .then(setDiag)
      .finally(() => setLoading(false));
  }, [beatId]);

  if (loading || !diag) {
    return (
      <div className="py-12 flex justify-center text-xs font-mono text-textMuted">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Running XGBoost+SHAP &amp; GNN on {beatId}...
      </div>
    );
  }

  const beatTabs =
    city !== 'ALL' && cityBeats.length > 0
      ? cityBeats.map((b) => b.beat_id)
      : ['BLR-B04', 'BLR-B07', 'HYD-B01', 'CHN-B03'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-white">Beat Reality Check &amp; ML Diagnosis · {diag.beat.beat_id}</h2>
            {diag.beat.sbu_line && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/60 text-blue-300 border border-blue-700/50">
                {diag.beat.sbu_line}
              </span>
            )}
          </div>
          <p className="text-xs text-textMuted mt-0.5">
            {diag.beat.zone} · WD Pilot (DS): {diag.beat.salesman_name} · Visit Compliance:{' '}
            <strong className="text-white">{diag.beat.visit_compliance_pct}%</strong> · ECO:{' '}
            <strong className="text-emerald-300">{diag.eco_pct ?? '--'}%</strong> · Strike Rate:{' '}
            <strong className="text-sky-300">{diag.strike_rate_pct ?? '--'}%</strong>
          </p>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs flex-wrap">
          {beatTabs.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => onSelectBeat(b)}
              className={`px-2 py-1 rounded border ${
                beatId === b ? 'border-accent bg-accent/20 text-white' : 'border-border text-textMuted hover:text-white'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* ML Attribution Waterfall for the Beat */}
      <div className="bg-[#0d1117] border border-border rounded-lg p-4 h-60">
        <div className="text-xs font-mono text-white mb-2">
          XGBoost + SHAP &amp; Spatio-Temporal GNN Attribution ({diag.beat.beat_id})
        </div>
        <ResponsiveContainer width="100%" height="86%">
          <BarChart data={diag.factors} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis type="number" stroke="#8b949e" tick={{ fontSize: 10 }} unit="%" />
            <YAxis type="category" dataKey="label" width={230} stroke="#8b949e" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: 11 }} />
            <Bar dataKey="share_pct" name="SHAP Share %" radius={[0, 4, 4, 0]}>
              {diag.factors.map((f) => (
                <Cell key={f.factor_key} fill={f.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Planned vs Actual SFA GPS Check-ins Table */}
      <div className="bg-[#0d1117] border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-surface text-xs font-mono text-textMuted flex justify-between">
          <span>Planned Sequence vs Actual SFA GPS Check-in</span>
          {diag.skipped_count > 0 && (
            <span className="text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {diag.skipped_count} tail outlets skipped 3w in a row
            </span>
          )}
        </div>
        <div className="divide-y divide-border/50">
          {diag.outlets.map((o) => (
            <button
              key={o.outlet_id}
              type="button"
              onClick={() => onOpenOutlet(o.outlet_id)}
              className="w-full text-left px-3 py-2 hover:bg-surface/80 flex items-center justify-between text-xs transition-colors"
            >
              <div>
                <span className="font-mono text-textMuted mr-2">#{o.beat_seq}</span>
                <span className="font-mono font-bold text-white">{o.outlet_id}</span>
                <span className="ml-2 text-textMain">{o.name}</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className={o.visited_on_time ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                  {o.actual_gps_time}
                </span>
                <span className="text-amber-300">LSPC {o.current_lspc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const BeatSimulatorView: React.FC<{
  city: string;
  initialBeatId?: string | null;
  onSimulationChange?: (sim: BeatSimulation | null) => void;
}> = ({ city, initialBeatId, onSimulationChange }) => {
  const [beats, setBeats] = useState<BeatInfo[]>([]);
  const [selectedBeat, setSelectedBeat] = useState<string>(initialBeatId || 'BLR-B04');
  const [sim, setSim] = useState<BeatSimulation | null>(null);
  const [ticket, setTicket] = useState<{ ticket_id: string; summary: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { persona } = usePersona();
  const canDispatch = (PERSONA_LIST.find((p) => p.id === persona) || PERSONA_LIST[0]).canDispatchAsm;

  useEffect(() => {
    tmdApi.beats(city).then((b) => {
      setBeats(b);
      if (b.length && !b.some((x) => x.beat_id === selectedBeat)) {
        const overloaded = b.find((x) => x.beat_load_index > 1.1) || b[0];
        setSelectedBeat(overloaded.beat_id);
      }
    });
  }, [city]);

  useEffect(() => {
    if (initialBeatId) setSelectedBeat(initialBeatId);
  }, [initialBeatId]);

  const runSim = (bid: string) => {
    setLoading(true);
    setTicket(null);
    tmdApi
      .simulateBeat(bid)
      .then((res) => {
        setSim(res);
        onSimulationChange?.(res);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedBeat) runSim(selectedBeat);
  }, [selectedBeat]);

  const handleDispatch = () => {
    if (!sim) return;
    tmdApi
      .dispatchBeat(sim.beat_id, `Approved ${sim.beat_id} (${sim.city}) rebalance + priority SKU replenishment push`)
      .then(setTicket);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> Route Optimization &amp; Uplift Simulator
          </h2>
          <p className="text-xs text-textMuted">
            Re-split overloaded beats to eliminate 4:15 PM traffic skips and trigger priority WD stock replenishment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBeat}
            onChange={(e) => setSelectedBeat(e.target.value)}
            className="bg-[#0d1117] border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-white"
          >
            {beats.map((b) => (
              <option key={b.beat_id} value={b.beat_id}>
                {b.beat_id} · {b.city} ({b.zone})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => runSim(selectedBeat)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent text-[#0d1117] font-semibold text-xs hover:bg-blue-400"
          >
            <Play className="w-3.5 h-3.5" /> Simulate
          </button>
        </div>
      </div>

      {loading || !sim ? (
        <div className="py-10 flex justify-center text-xs font-mono text-textMuted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Optimizing route polygons &amp; counterfactual uplift...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#0d1117] border border-rose-800/50 rounded-lg p-4 space-y-2">
              <div className="text-xs font-mono uppercase text-rose-300">Before: Strained Beat ({sim.beat_id})</div>
              <div className="text-xs text-textMuted">Completion: {sim.before.finish_time}</div>
              <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div>
                  <div className="text-textMuted text-[10px]">Route Distance</div>
                  <div className="text-white font-bold text-sm">{sim.before.distance_km} km</div>
                </div>
                <div>
                  <div className="text-textMuted text-[10px]">Avg Visit Duration</div>
                  <div className="text-rose-400 font-bold text-sm">{sim.before.avg_visit_duration_min} min</div>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1117] border border-emerald-700/60 rounded-lg p-4 space-y-2">
              <div className="text-xs font-mono uppercase text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> After: Balanced Polygons ({sim.target_transfer_beat})
              </div>
              <div className="text-xs text-emerald-300 font-mono">
                Travel time -{sim.after.travel_time_reduction_pct}% · {sim.after.finish_time}
              </div>
              {sim.capacity_source && (
                <div className="text-[11px] font-sans text-emerald-200/85 bg-emerald-950/35 border border-emerald-800/40 rounded px-2 py-1">
                  {sim.capacity_source}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 pt-2 font-mono text-xs">
                <div>
                  <div className="text-textMuted text-[10px]">Reactivated</div>
                  <div className="text-emerald-300 font-bold text-sm">+{sim.after.reactivated_zero_billing_outlets} stores</div>
                </div>
                <div>
                  <div className="text-textMuted text-[10px]">LSPC Uplift</div>
                  <div className="text-sky-300 font-bold text-sm">+{sim.after.projected_lspc_uplift} LSPC</div>
                </div>
                <div>
                  <div className="text-textMuted text-[10px]">Monthly Recovery</div>
                  <div className="text-emerald-400 font-bold text-sm flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />{' '}
                    {sim.after.projected_monthly_recovery_inr >= 100000
                      ? `₹${(sim.after.projected_monthly_recovery_inr / 100000).toFixed(2)}L`
                      : `₹${Math.round(sim.after.projected_monthly_recovery_inr).toLocaleString()}`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0d1117] border border-border rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-textMuted">
              {sim.beat_id === 'BLR-B04' || sim.beat_id === 'BLR-B07'
                ? `Ready to push ${sim.beat_id} rebalance + HSR Beat 7 priority SKU replenishment to the Bangalore Area Sales Manager & WD DMS.`
                : `Ready to push ${sim.beat_id} (${sim.city}) rebalance + priority SKU replenishment alert to the ${sim.city} Area Sales Manager & WD DMS.`}
            </div>
            <button
              type="button"
              disabled={!canDispatch}
              onClick={handleDispatch}
              title={!canDispatch ? 'Beat split dispatch requires Branch / Area Manager (AM) approval' : undefined}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs ${
                canDispatch
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-[#0d1117]'
                  : 'bg-slate-800 text-textMuted border border-border cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />{' '}
              {canDispatch ? 'Send Beat Update & Stock Alert to ASM' : 'AM Approval Required to Dispatch'}
            </button>
          </div>

          {ticket && (
            <div className="bg-emerald-950/40 border border-emerald-600/60 rounded-lg p-3 text-xs font-mono text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Dispatched <strong>{ticket.ticket_id}</strong> — {ticket.summary}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
