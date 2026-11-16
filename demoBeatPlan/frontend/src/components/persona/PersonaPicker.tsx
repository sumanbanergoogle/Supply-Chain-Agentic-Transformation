import React from 'react';
import { UserCog } from 'lucide-react';
import { Persona, PERSONA_LIST, usePersona } from '../../state/persona';

export const PersonaPicker: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { persona, setPersona } = usePersona();
  const activeMeta = PERSONA_LIST.find((p) => p.id === persona) || PERSONA_LIST[0];

  return (
    <div
      className="h-7 inline-flex items-center gap-1.5 px-2 shrink-0 whitespace-nowrap bg-[#0d1117] border border-border rounded-lg text-xs font-mono text-white"
      title="Role-based view & action scoping across ITC TM&D hierarchy"
    >
      <UserCog className="w-3.5 h-3.5 text-textMuted shrink-0" />
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
      {!compact && (
        <span className="text-[10px] text-emerald-300/85 font-sans shrink-0 pl-1.5 border-l border-border">
          {activeMeta.scopeBadge}
        </span>
      )}
    </div>
  );
};
