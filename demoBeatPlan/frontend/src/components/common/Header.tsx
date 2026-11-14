import React from 'react';
import { AlertTriangle, CheckCircle, Layers, Search, XCircle } from 'lucide-react';
import { CityKPIs } from '../../types/tmd';
import { Persona, PERSONA_LIST, usePersona } from '../../state/persona';

interface HeaderProps {
  kpis: CityKPIs | null;
  selectedHealth: string;
  onSelectHealth: (h: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  compact?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  kpis,
  selectedHealth,
  onSelectHealth,
  searchQuery,
  onSearchChange,
  compact = false,
}) => {
  const { persona, setPersona } = usePersona();

  return (
    <header className="h-16 bg-surface border-b border-border px-4 gap-3 flex items-center justify-between shrink-0 min-w-0">
      {/* Brand Identity */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2f4fd8] to-[#0f766e] flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
          <svg viewBox="0 0 32 32" className="w-6 h-6">
            <path
              d="M6 16h5l2.5-6 3.5 12 3-8 2 2h4"
              fill="none"
              stroke="#5eead4"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white whitespace-nowrap">Sahayak AI</h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
              ITC TM&amp;D
            </span>
          </div>
          <span className="text-[10px] text-textMuted whitespace-nowrap">on BeatPulse · GT Distribution Intelligence</span>
        </div>
      </div>

      {/* Fleet Health & Leakage Ribbon */}
      {kpis && (
        <div className="flex items-center gap-1 bg-[#0d1117] border border-border px-2 py-1.5 rounded-lg text-xs font-mono shrink-0 whitespace-nowrap">
          <button
            type="button"
            onClick={() => onSelectHealth('all')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              selectedHealth === 'all' ? 'bg-surface text-white border border-border' : 'text-textMuted hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-textMuted" />
            <span>Outlets:</span>
            <strong className="text-white">{kpis.total_outlets}</strong>
          </button>

          <span className="text-border">|</span>

          <button
            type="button"
            onClick={() => onSelectHealth('healthy')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              selectedHealth === 'healthy'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60'
                : 'text-textMuted hover:text-emerald-400'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-healthy" />
            <span>Productive:</span>
            <strong className="text-emerald-400">{kpis.healthy_count}</strong>
          </button>

          <button
            type="button"
            onClick={() => onSelectHealth('attention')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              selectedHealth === 'attention'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-700/60'
                : 'text-textMuted hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <span>At-Risk:</span>
            <strong className="text-amber-400">{kpis.warning_count}</strong>
          </button>

          <button
            type="button"
            onClick={() => onSelectHealth('critical')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              selectedHealth === 'critical'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-700/60'
                : 'text-textMuted hover:text-rose-400'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-critical animate-pulse" />
            <span>Zero-Billing:</span>
            <strong className="text-critical">{kpis.critical_count}</strong>
          </button>

          {!compact && (
            <>
              <span className="text-border">|</span>
              <span className="px-2 text-rose-300">
                Leakage: <strong>₹{(kpis.monthly_leakage_inr / 100000).toFixed(2)}L/mo</strong>
              </span>
              <span className="px-2 text-sky-300">
                LSPC: <strong>{kpis.avg_lspc}</strong>
                <span className="text-textMuted">/{kpis.target_lspc}</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Persona + Search */}
      <div className="flex items-center gap-2 min-w-0">
        <select
          aria-label="Persona"
          value={persona}
          onChange={(e) => setPersona(e.target.value as Persona)}
          className="bg-[#0d1117] border border-border rounded-md px-2 py-1.5 text-xs font-mono text-textMain focus:outline-none focus:border-accent"
        >
          {PERSONA_LIST.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <div className={compact ? 'relative hidden 2xl:block' : 'relative'}>
          <Search className="w-3.5 h-3.5 text-textMuted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Outlet, Beat, WD..."
            className="bg-[#0d1117] border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-accent w-44"
          />
        </div>
      </div>
    </header>
  );
};
