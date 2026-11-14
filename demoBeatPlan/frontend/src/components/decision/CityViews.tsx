import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ArrowRight, CheckCircle2, Loader2, Play, Sparkles, TrendingUp } from 'lucide-react';
import { tmdApi } from '../../api/client';
import { BeatInfo, BeatSimulation, CityBenchmark, CityName, OutletSummary } from '../../types/tmd';

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
        <Loader2 className="w-4 h-4 animate-spin text-accent" /> Loading Bangalore · Hyderabad · Chennai benchmark...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white">Cross-City ITC TM&amp;D Executive Comparison</h2>
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
            className="text-left bg-[#0d1117] border border-border hover:border-accent rounded-xl p-4 transition-colors space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{c.city}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-700/50">
                {c.zero_billing_pct}% Zero-Billing
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

      <div className="bg-[#0d1117] border border-border rounded-xl p-4 h-64">
        <div className="text-xs font-mono text-textMuted mb-2">Monthly NSV Leakage (₹ Lakhs) vs Active LSPC Gap</div>
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
  const [queue, setQueue] = useState<OutletSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tmdApi
      .cityHealth(city)
      .then((res) => setQueue(res.priority_queue))
      .finally(() => setLoading(false));
  }, [city]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-white">Priority Revenue Leakage Queue</h2>
          <p className="text-xs text-textMuted">Ranked by Monthly NSV At-Risk (₹) × GradientBoosting Churn Probability</p>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {(['ALL', 'Bangalore', 'Hyderabad', 'Chennai'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onSelectCity(c)}
              className={`px-2.5 py-1 rounded border ${
                city === c ? 'border-accent bg-accent/20 text-white' : 'border-border text-textMuted hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center text-xs font-mono text-textMuted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Ranking outlets...
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-[#0d1117]">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface border-b border-border font-mono text-[11px] text-textMuted">
              <tr>
                <th className="p-2.5">Outlet</th>
                <th className="p-2.5">City / Beat</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">LSPC</th>
                <th className="p-2.5">Churn Prob</th>
                <th className="p-2.5">GNN Spillover</th>
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
                    <div className="font-semibold text-white">{o.outlet_id}</div>
                    <div className="text-[11px] text-textMuted">{o.name}</div>
                  </td>
                  <td className="p-2.5 font-mono text-[11px]">
                    <div className="text-white">{o.city}</div>
                    <div className="text-textMuted">{o.beat_id}</div>
                  </td>
                  <td className="p-2.5 font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        o.health_status === 'critical'
                          ? 'bg-rose-950/70 text-rose-300 border border-rose-700/50'
                          : 'bg-amber-950/70 text-amber-300 border border-amber-700/50'
                      }`}
                    >
                      {o.health_status === 'critical' ? 'ZERO-BILL' : 'AT-RISK'}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-white">
                    {o.current_lspc} / <span className="text-textMuted">{o.target_lspc}</span>
                  </td>
                  <td className="p-2.5 font-mono text-rose-300">{Math.round(o.churn_prob * 100)}%</td>
                  <td className="p-2.5 font-mono text-purple-300">{Math.round(o.gnn_spillover_risk * 100)}%</td>
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

export const BeatSimulatorView: React.FC<{ city: string; initialBeatId?: string | null }> = ({
  city,
  initialBeatId,
}) => {
  const [beats, setBeats] = useState<BeatInfo[]>([]);
  const [selectedBeat, setSelectedBeat] = useState<string>(initialBeatId || 'BLR-B02');
  const [sim, setSim] = useState<BeatSimulation | null>(null);
  const [loading, setLoading] = useState(false);

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
    tmdApi
      .simulateBeat(bid)
      .then(setSim)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedBeat) runSim(selectedBeat);
  }, [selectedBeat]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> Counterfactual Beat Rebalance Simulator
          </h2>
          <p className="text-xs text-textMuted">
            Reassign congested fringe outlets across adjacent salesman beats to expand visit duration and eliminate rush-fatigue.
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
                {b.beat_id} · {b.city} ({b.zone}) {b.beat_load_index > 1.1 ? '⚠ Overloaded' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => runSim(selectedBeat)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent text-[#0d1117] font-semibold text-xs hover:bg-blue-400"
          >
            <Play className="w-3.5 h-3.5" /> Re-run
          </button>
        </div>
      </div>

      {loading || !sim ? (
        <div className="py-10 flex justify-center text-xs font-mono text-textMuted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Optimizing salesman beat spatial graph...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#0d1117] border border-rose-800/50 rounded-xl p-4 space-y-2">
              <div className="text-xs font-mono uppercase text-rose-300">Current Strained Beat ({sim.beat_id})</div>
              <div className="text-xs text-textMuted">Salesman: {sim.salesman_name} · {sim.zone}</div>
              <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div>
                  <div className="text-textMuted text-[10px]">Route Distance</div>
                  <div className="text-white font-bold text-sm">{sim.before.distance_km} km</div>
                </div>
                <div>
                  <div className="text-textMuted text-[10px]">Avg Time in Outlet</div>
                  <div className="text-rose-400 font-bold text-sm">{sim.before.avg_visit_duration_min} min</div>
                </div>
                <div>
                  <div className="text-textMuted text-[10px]">Load Index</div>
                  <div className="text-amber-300 font-bold">{sim.before.beat_load_index}x</div>
                </div>
                <div>
                  <div className="text-textMuted text-[10px]">Beat Monthly Leakage</div>
                  <div className="text-rose-400 font-bold">₹{sim.before.monthly_leakage_inr.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1117] border border-emerald-700/60 rounded-xl p-4 space-y-2">
              <div className="text-xs font-mono uppercase text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Post-Rebalance Plan
              </div>
              <div className="text-xs text-textMuted">
                Shifts 2 fringe stores <ArrowRight className="w-3 h-3 inline" /> {sim.target_transfer_beat} ({sim.target_transfer_salesman})
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div>
                  <div className="text-textMuted text-[10px]">Optimized Distance</div>
                  <div className="text-emerald-300 font-bold text-sm">{sim.after.distance_km} km</div>
                </div>
                <div>
                  <div className="text-textMuted text-[10px]">Projected Call Time</div>
                  <div className="text-emerald-300 font-bold text-sm">{sim.after.avg_visit_duration_min} min</div>
                </div>
                <div>
                  <div className="text-textMuted text-[10px]">New Load Index</div>
                  <div className="text-white font-bold">{sim.after.beat_load_index}x</div>
                </div>
                <div>
                  <div className="text-textMuted text-[10px]">Recovered Revenue / Mo</div>
                  <div className="text-emerald-400 font-bold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> +₹{sim.after.projected_monthly_recovery_inr.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0d1117] border border-border rounded-xl p-4">
            <div className="text-xs font-mono text-textMuted mb-2">
              Recommended Outlets to Reassign to {sim.target_transfer_beat}
            </div>
            <div className="space-y-1.5">
              {sim.reassigned_outlets.map((ro) => (
                <div key={ro.outlet_id} className="flex items-center justify-between text-xs bg-surface px-3 py-2 rounded border border-border/60">
                  <span className="font-mono text-white">
                    {ro.outlet_id} · <span className="font-sans text-textMuted">{ro.name}</span>
                  </span>
                  <span className="font-mono text-amber-300">₹{ro.leakage_inr.toLocaleString()} / mo leakage</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
