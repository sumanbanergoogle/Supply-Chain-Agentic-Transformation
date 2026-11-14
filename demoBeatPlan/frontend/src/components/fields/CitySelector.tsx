import React from 'react';
import { CityFilter, CityName, OutletSummary } from '../../types/tmd';

const CITY_COLORS: Record<CityName, string> = {
  Bangalore: '#388bfd',
  Hyderabad: '#a371f7',
  Chennai: '#d29922',
};

export const CitySelector: React.FC<{
  value: CityFilter;
  onChange: (c: CityFilter) => void;
  outlets: OutletSummary[];
  variant?: 'default' | 'overlay';
}> = ({ value, onChange, outlets, variant = 'overlay' }) => {
  const cities: CityName[] = ['Bangalore', 'Hyderabad', 'Chennai'];

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-lg text-xs font-sans flex-wrap ${
        variant === 'overlay' ? 'text-white' : 'bg-[#0d1117] border border-border'
      }`}
    >
      <button
        type="button"
        onClick={() => onChange('ALL')}
        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 focus:outline-none ${
          value === 'ALL'
            ? 'bg-surface text-white font-semibold border border-border'
            : 'text-textMuted hover:text-textMain hover:bg-surface/50 border border-transparent'
        }`}
      >
        <span>All cities</span>
        <span className="text-textMuted font-mono text-[10px]">({outlets.length})</span>
      </button>

      {cities.map((c) => {
        const count = outlets.filter((o) => o.city === c).length;
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 focus:outline-none ${
              selected
                ? 'bg-surface text-white font-semibold border border-border'
                : 'text-textMuted hover:text-textMain hover:bg-surface/50 border border-transparent'
            }`}
          >
            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: CITY_COLORS[c] }} />
            <span>{c}</span>
            <span className="text-textMuted font-mono text-[10px]">({count})</span>
          </button>
        );
      })}
    </div>
  );
};
