import React from 'react';
import { AlertTriangle, CheckCircle, Layers, XCircle } from 'lucide-react';
import { CityKPIs } from '../../types/tmd';
import { PersonaPicker } from '../persona/PersonaPicker';
import { UrviMark } from './UrviMark';

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
  return (
    <header className="h-16 bg-surface border-b border-border px-4 gap-3 flex items-center justify-between shrink-0 min-w-0">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3 shrink-0">
        <UrviMark size={40} className="rounded-lg shadow-lg shadow-blue-500/20" title="Sahayak AI Agent" />
        <div className="flex flex-col leading-tight">
          <h1 className="text-base font-bold tracking-tight text-white font-sans whitespace-nowrap">Sahayak AI Agent</h1>
          <span className="text-[10px] font-sans text-textMuted whitespace-nowrap">on BeatPulse · ITC TM&amp;D</span>
        </div>
      </div>

      {/* Fleet Status Metrics Ribbon */}
      {kpis && (
        <div className="flex items-center gap-1 bg-[#0d1117] border border-border px-2 py-1.5 rounded-lg text-xs font-mono shrink-0 whitespace-nowrap">
          <button
            type="button"
            onClick={() => onSelectHealth('all')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              selectedHealth === 'all'
                ? 'bg-surface text-white border border-border shadow-sm'
                : 'text-textMuted hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-textMuted" />
            <span>Total:</span>
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
            <span>Healthy:</span>
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
            <span>Attention:</span>
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
            <span className="whitespace-nowrap">Zero-billing:</span>
            <strong className="text-critical">{kpis.critical_count}</strong>
          </button>

          {!compact && (
            <>
              <span className="text-border">|</span>
              <span className="px-2 text-rose-300">
                Leakage: <strong>₹{(kpis.monthly_leakage_inr / 100000).toFixed(1)}L</strong>
              </span>
              <span className="px-1.5 text-sky-300">
                LSPC: <strong>{kpis.avg_lspc}</strong>
              </span>
            </>
          )}
        </div>
      )}

      {/* Search, Persona & Live Online Badge */}
      <div className="flex items-center gap-2 min-w-0">
        <PersonaPicker compact={compact} />
        <div className={compact ? 'relative hidden 2xl:block' : 'relative'}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search outlet, beat or WD..."
            className="w-40 xl:w-48 bg-[#0d1117] border border-border text-xs px-3 py-1.5 rounded-lg text-white placeholder-textMuted focus:outline-none focus:border-accent font-sans"
          />
        </div>

        <div
          className={`${
            compact ? 'hidden 2xl:flex' : 'flex'
          } items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded-full shrink-0 whitespace-nowrap`}
          title="System online"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          {!compact && <span>ONLINE</span>}
        </div>
      </div>
    </header>
  );
};
