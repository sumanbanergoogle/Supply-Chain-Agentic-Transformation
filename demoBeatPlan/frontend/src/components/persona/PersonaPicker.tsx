import React from 'react';
import { UserCog } from 'lucide-react';
import { Persona, PERSONA_LIST, usePersona } from '../../state/persona';

export const PersonaPicker: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { persona, setPersona } = usePersona();

  return (
    <div
      className="h-7 inline-flex items-center gap-1.5 px-2 shrink-0 whitespace-nowrap bg-[#0d1117] border border-border rounded-lg text-xs font-mono text-white"
      title="Showcase mode: role selector demonstrates RBAC views across ITC TM&D personas"
    >
      <UserCog className="w-3.5 h-3.5 text-textMuted shrink-0" />
      {!compact && (
        <span className="text-[9px] font-mono uppercase bg-blue-900/60 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 rounded font-semibold shrink-0">
          DEMO
        </span>
      )}
      <select
        aria-label="Persona"
        value={persona}
        onChange={(e) => setPersona(e.target.value as Persona)}
        className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
      >
        {PERSONA_LIST.map((p) => (
          <option key={p.id} value={p.id} className="bg-[#0d1117] text-white">
            {p.label}
          </option>
        ))}
      </select>
      <span className="text-[10px] text-emerald-300/80 font-sans shrink-0 pl-1.5 border-l border-border">
        RBAC available
      </span>
    </div>
  );
};
