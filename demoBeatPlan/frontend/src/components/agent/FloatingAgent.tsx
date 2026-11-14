import React, { useEffect, useState } from 'react';
import { Minus, PanelRightClose, PanelRightOpen, Radio } from 'lucide-react';
import { ChatAction, OutletSummary } from '../../types/tmd';
import { VoiceAgentPanel } from './VoiceAgentPanel';

export const AGENT_DOCK_WIDTH = 'max(22vw, 350px)';

interface FloatingAgentProps {
  outlet?: OutletSummary | null;
  city?: string | null;
  screen?: string | null;
  contextLabel?: string;
  onAgentAction?: (a: ChatAction) => void;
  onDockedChange?: (docked: boolean) => void;
  suspended?: boolean;
}

export const FloatingAgent: React.FC<FloatingAgentProps> = ({
  outlet,
  city,
  screen,
  contextLabel,
  onAgentAction,
  onDockedChange,
  suspended = false,
}) => {
  // Auto-open & docked on load so Gemini Live is immediately enabled and visible
  const [open, setOpen] = useState<boolean>(true);
  const [dockedMode, setDockedMode] = useState<boolean>(true);
  const [voice, setVoice] = useState({ live: false, listening: false, speaking: false, thinking: false });

  const isDocked = open && dockedMode && !suspended;
  useEffect(() => {
    onDockedChange?.(isDocked);
  }, [isDocked, onDockedChange]);

  const headerActions = (
    <>
      <button
        type="button"
        onClick={() => setDockedMode((v) => !v)}
        className="p-1.5 rounded text-textMuted hover:text-white hover:bg-border transition-colors"
        title={dockedMode ? 'Float panel' : 'Dock right'}
      >
        {dockedMode ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="p-1.5 rounded text-textMuted hover:text-white hover:bg-border transition-colors"
        title="Minimise"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
    </>
  );

  return (
    <>
      <div
        style={isDocked ? { top: 0, right: 0, bottom: 0, width: AGENT_DOCK_WIDTH } : undefined}
        className={`fixed z-[1001] flex flex-col overflow-hidden bg-surface ${
          isDocked
            ? 'border-l border-border shadow-xl shadow-black/40'
            : 'right-4 bottom-16 w-[min(420px,calc(100vw-2rem))] h-[min(620px,calc(100vh-6rem))] rounded-xl border border-border shadow-2xl'
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

      {(!open || !isDocked) && !suspended && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="fixed right-4 bottom-4 z-[1001] flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#12161c] border border-accent/60 text-white shadow-xl text-xs font-semibold"
        >
          <Radio className={`w-3.5 h-3.5 ${voice.live ? 'text-emerald-400 animate-pulse' : 'text-accent'}`} />
          <span>{open ? 'Minimise Sahayak AI' : 'Sahayak AI · Gemini Live'}</span>
        </button>
      )}
    </>
  );
};
