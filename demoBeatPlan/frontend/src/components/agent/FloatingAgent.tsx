import React, { useEffect, useState } from 'react';
import { Minus, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { UrviMark } from '../common/UrviMark';
import { VoiceAgentPanel } from './VoiceAgentPanel';
import { ChatAction, OutletSummary } from '../../types/tmd';

export const AGENT_DOCK_WIDTH = 'max(22vw, 350px)';

export const FloatingAgent: React.FC<{
  outlet?: OutletSummary | null;
  city?: string | null;
  screen?: string | null;
  contextLabel?: string;
  onAgentAction?: (a: ChatAction) => void;
  autoDock?: boolean;
  onDockedChange?: (docked: boolean) => void;
  suspended?: boolean;
}> = ({ outlet, city, screen, contextLabel, onAgentAction, autoDock = false, onDockedChange, suspended = false }) => {
  const [open, setOpen] = useState<boolean>(true);
  const [manualDock, setManualDock] = useState<boolean>(true);
  const [voice, setVoice] = useState({ live: false, listening: false, speaking: false, thinking: false });

  const docked = open && (autoDock || manualDock) && !suspended;
  useEffect(() => {
    onDockedChange?.(docked);
  }, [docked, onDockedChange]);

  const headerActions = (
    <>
      <button
        type="button"
        onClick={() => setManualDock((v) => !v)}
        disabled={autoDock}
        className={`p-1.5 rounded transition-colors ${docked ? 'text-accent' : 'text-textMuted hover:text-white hover:bg-border'}`}
        title={manualDock ? 'Undock (float)' : 'Dock to right'}
      >
        {docked ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="p-1.5 rounded text-textMuted hover:text-white hover:bg-border transition-colors"
        title="Minimise"
      >
        <Minus className="w-4 h-4" />
      </button>
    </>
  );

  const badge = voice.listening ? (
    <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 px-1.5 py-0.5 rounded animate-pulse">
      LISTENING
    </span>
  ) : voice.speaking ? (
    <span className="text-[9px] font-mono font-bold text-accent bg-blue-950/60 border border-blue-700/60 px-1.5 py-0.5 rounded">
      SPEAKING
    </span>
  ) : voice.live ? (
    <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 px-1.5 py-0.5 rounded">
      LIVE
    </span>
  ) : (
    <kbd className="text-[9px] font-mono text-textMuted bg-[#0d1117] border border-border px-1 py-0.5 rounded">Ctrl K</kbd>
  );

  return (
    <>
      <div
        style={docked ? { top: 0, right: 0, bottom: 0, width: AGENT_DOCK_WIDTH } : undefined}
        className={`fixed z-[1001] flex flex-col overflow-hidden bg-surface ${
          docked
            ? 'border-l border-border shadow-xl shadow-black/40'
            : 'right-4 bottom-20 w-[min(420px,calc(100vw-2rem))] h-[min(640px,calc(100vh-7rem))] rounded-xl border border-border shadow-2xl shadow-black/60'
        } ${open && !suspended ? '' : 'hidden'}`}
      >
        <VoiceAgentPanel
          outlet={outlet}
          city={city}
          screen={screen}
          contextLabel={contextLabel}
          onAgentAction={onAgentAction}
          onStatusChange={setVoice}
          headerActions={headerActions}
        />
      </div>

      {!docked && !suspended && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="fixed right-4 bottom-4 z-[1001] flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-full border bg-[#12161c] border-accent/60 text-white hover:border-accent shadow-xl shadow-black/50"
        >
          <UrviMark size={24} title="Sahayak" />
          <span className="text-xs font-semibold font-sans whitespace-nowrap">{open ? 'Minimise' : 'Sahayak AI Agent'}</span>
          {!open && badge}
        </button>
      )}
    </>
  );
};
