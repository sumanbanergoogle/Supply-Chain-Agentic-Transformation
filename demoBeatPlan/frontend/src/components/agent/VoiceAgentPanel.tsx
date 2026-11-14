import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Radio, Send, Sparkles, Volume2, Wrench } from 'lucide-react';
import { ChatAction, OutletSummary } from '../../types/tmd';
import { isLiveSupported, LiveClient, LiveLanguage, LiveStatus, ToolCallEvent, VoiceState } from '../../live/liveClient';
import { dispatchUi, UiCommand } from '../../agent/uiCommands';
import { tmdApi } from '../../api/client';

interface LiveMsg {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  tools?: ToolCallEvent[];
  uiChips?: string[];
}

interface VoiceAgentPanelProps {
  outlet?: OutletSummary | null;
  city?: string | null;
  screen?: string | null;
  contextLabel?: string;
  onAgentAction?: (a: ChatAction) => void;
  onStatusChange?: (s: { live: boolean; listening: boolean; speaking: boolean; thinking: boolean }) => void;
  headerActions?: React.ReactNode;
}

const DEMO_PROMPTS = [
  'Compare Bangalore, Hyderabad & Chennai revenue leakage',
  'Diagnose highest zero-billing outlet in Bangalore',
  'Simulate rebalancing overloaded Beat BLR-B02',
  'Prepare Beat Action Pack for BLR-108',
];

export const VoiceAgentPanel: React.FC<VoiceAgentPanelProps> = ({
  outlet,
  city,
  screen,
  contextLabel,
  onAgentAction,
  onStatusChange,
  headerActions,
}) => {
  const [messages, setMessages] = useState<LiveMsg[]>([
    {
      id: 'welcome',
      sender: 'agent',
      timestamp: 'Now',
      text: 'Sahayak AI Live connected. Speak or click a briefing prompt to diagnose ITC TM&D leakage across Bangalore, Hyderabad, and Chennai.',
    },
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<LiveLanguage>('english');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(() => isLiveSupported());
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isOpenMic, setIsOpenMic] = useState(false);

  const client = useMemo(() => new LiveClient(), []);
  const endRef = useRef<HTMLDivElement>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const currentAgentIdRef = useRef<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    onStatusChange?.({
      live: liveStatus === 'connected' || liveStatus === 'resumed',
      listening: voiceState === 'listening',
      speaking: voiceState === 'speaking',
      thinking: voiceState === 'thinking',
    });
  }, [liveStatus, voiceState, onStatusChange]);

  useEffect(() => {
    client.setHandlers({
      onStatus: (s, info) => {
        setLiveStatus(s);
        if (info.message) setStatusMessage(info.message);
      },
      onVoiceState: setVoiceState,
      onInputTranscript: (delta) => {
        if (!delta) return;
        const id = currentUserIdRef.current;
        if (!id) {
          const nid = `u-${Date.now()}`;
          currentUserIdRef.current = nid;
          setMessages((prev) => [
            ...prev,
            { id: nid, sender: 'user', text: delta, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          ]);
        } else {
          setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)));
        }
      },
      onCaptionDelta: (delta) => {
        if (!delta) return;
        const id = currentAgentIdRef.current;
        if (!id) {
          const nid = `a-${Date.now()}`;
          currentAgentIdRef.current = nid;
          setMessages((prev) => [
            ...prev,
            { id: nid, sender: 'agent', text: delta, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          ]);
        } else {
          setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)));
        }
      },
      onTurnComplete: (full) => {
        if (!currentAgentIdRef.current && full.trim()) {
          setMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, sender: 'agent', text: full, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          ]);
        }
        currentUserIdRef.current = null;
        currentAgentIdRef.current = null;
      },
      onToolCall: (ev) => {
        let aid = currentAgentIdRef.current;
        if (!aid) {
          aid = `a-${Date.now()}`;
          currentAgentIdRef.current = aid;
          setMessages((prev) => [
            ...prev,
            { id: aid!, sender: 'agent', text: '', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), tools: [ev] },
          ]);
          return;
        }
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== aid) return m;
            const tools = m.tools || [];
            const idx = tools.findIndex((t) => t.name === ev.name);
            const next = idx >= 0 ? tools.map((t, i) => (i === idx ? ev : t)) : [...tools, ev];
            return { ...m, tools: next };
          }),
        );
      },
      onAction: (kind, payload: any) => {
        if (kind === 'ui_control') {
          const cmd = payload?.data?.command as UiCommand | undefined;
          if (cmd) dispatchUi(cmd);
          return;
        }
        if (!onAgentAction) return;
        const oid = payload?.outlet_id ?? payload?.data?.outlet_id ?? null;
        const targetCity = payload?.city ?? payload?.data?.city ?? city ?? null;
        let targetScreen: string | undefined;
        let view: string | undefined;
        if (kind === 'city_comparison') targetScreen = 'city_compare';
        else if (kind === 'priority_queue') targetScreen = 'city_health';
        else if (kind === 'beat_simulation') targetScreen = 'beat_simulator';
        else if (['outlet_profile', 'attribution_waterfall', 'nba', 'counterfactual'].includes(kind)) {
          targetScreen = 'outlet';
          view = kind === 'nba' ? 'recommendation' : kind === 'counterfactual' ? 'compare' : kind === 'attribution_waterfall' ? 'diagnosis' : 'overview';
        }
        if (targetScreen) {
          onAgentAction({ kind: 'navigate', screen: targetScreen, view, city: targetCity, outlet_id: oid, beat_id: payload?.beat_id, source_tool: kind });
        }
      },
      onFallbackReply: (msg) => {
        setMessages((prev) => [
          ...prev,
          { id: `fb-${Date.now()}`, sender: 'agent', text: msg.text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
        for (const a of (msg.actions || []) as ChatAction[]) {
          if (a.kind === 'ui' && a.command) dispatchUi(a.command as UiCommand);
          else onAgentAction?.(a);
        }
      },
      onError: (message) => {
        setStatusMessage(message);
      },
    });
  }, [client, onAgentAction, city]);

  // Auto-enable and connect Gemini Live immediately on load
  useEffect(() => {
    if (isLiveMode) {
      client.connect({
        city: city ?? undefined,
        outlet_id: outlet?.outlet_id,
        screen: screen ?? undefined,
        language,
      });
    } else {
      client.disconnect();
    }
    return () => client.disconnect();
  }, [isLiveMode, client]);

  // Sync UI context updates without reconnecting
  useEffect(() => {
    if (isLiveMode) {
      client.setContext({
        city: city ?? undefined,
        outlet_id: outlet?.outlet_id,
        screen: screen ?? undefined,
        language,
      });
    }
  }, [city, outlet?.outlet_id, screen, language, isLiveMode, client]);

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, sender: 'user', text: trimmed, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setInput('');
    currentAgentIdRef.current = null;

    if (isLiveMode && client.sendText(trimmed)) {
      return;
    }
    // Direct REST fallback if WebSocket isn't open
    const res = await tmdApi.chat({
      message: trimmed,
      language,
      city: city ?? null,
      outlet_id: outlet?.outlet_id ?? null,
      screen: screen ?? null,
    });
    setMessages((prev) => [
      ...prev,
      {
        id: `rest-${Date.now()}`,
        sender: 'agent',
        text: res.response,
        tools: res.tool_calls,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    for (const a of (res.actions || []) as ChatAction[]) {
      if (a.kind === 'ui' && a.command) dispatchUi(a.command as UiCommand);
      else onAgentAction?.(a);
    }
  };

  const toggleMic = async () => {
    try {
      const next = !isOpenMic;
      await client.setOpenMic(next);
      setIsOpenMic(next);
    } catch {
      setStatusMessage('Microphone permission denied or unavailable.');
    }
  };

  const isConnected = liveStatus === 'connected' || liveStatus === 'resumed';

  return (
    <div className="flex flex-col h-full bg-surface text-textMain">
      {/* Header */}
      <div className="p-3 border-b border-border bg-[#12161c] flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="text-xs font-bold text-white truncate">Gemini Live Copilot</span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                isConnected
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-700/60 text-amber-300'
              }`}
            >
              {isConnected ? 'LIVE · 3.8' : liveStatus === 'fallback' ? 'TOOL MODE' : liveStatus.toUpperCase()}
            </span>
          </div>
          {contextLabel && <div className="text-[10px] font-mono text-textMuted truncate mt-0.5">{contextLabel}</div>}
        </div>
        <div className="flex items-center gap-1">{headerActions}</div>
      </div>

      {/* Language + Mic Status Strip */}
      <div className="px-3 py-2 border-b border-border/70 bg-[#0d1117] flex items-center justify-between gap-2 shrink-0 text-[11px] font-mono">
        <div className="flex items-center gap-1">
          {(['english', 'hinglish', 'hindi'] as LiveLanguage[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              className={`px-2 py-0.5 rounded capitalize ${
                language === l ? 'bg-accent text-[#0d1117] font-bold' : 'text-textMuted hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIsLiveMode((v) => !v)}
          className={`px-2 py-0.5 rounded border text-[10px] ${
            isLiveMode ? 'border-emerald-700/60 text-emerald-300' : 'border-border text-textMuted'
          }`}
        >
          {isLiveMode ? 'Auto-Live ON' : 'Live OFF'}
        </button>
      </div>

      {/* Speaking / Listening Animated Bar */}
      {(voiceState === 'listening' || voiceState === 'speaking') && (
        <div className="px-3 py-2 bg-emerald-950/20 border-b border-emerald-700/40 flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-mono text-emerald-300">
            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            {voiceState === 'listening' ? 'Listening (16kHz PCM)...' : 'Gemini Live speaking...'}
          </span>
          <div className="flex items-center gap-1 h-5">
            {[0, 120, 240, 360, 180].map((d, i) => (
              <div key={i} className="w-1 bg-emerald-400 rounded-full animate-wave" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="px-3 py-1.5 bg-amber-950/30 border-b border-amber-700/40 text-[10px] font-mono text-amber-200">
          {statusMessage}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}>
            {m.tools && m.tools.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.tools.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950/60 border border-sky-700/50 text-sky-300"
                  >
                    <Wrench className="w-2.5 h-2.5" /> {t.name}
                  </span>
                ))}
              </div>
            )}
            {m.text && (
              <div
                className={`max-w-[90%] px-3 py-2 rounded-xl leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-[#0d1117] border border-border text-textMain rounded-tl-none'
                }`}
              >
                {m.text}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Executive Quick Storyboard Chips */}
      <div className="px-3 py-2 border-t border-border/60 bg-[#0d1117]/60 flex gap-1.5 overflow-x-auto shrink-0">
        {DEMO_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => sendPrompt(p)}
            className="text-[10px] font-mono whitespace-nowrap px-2.5 py-1 rounded-full border border-border hover:border-accent bg-surface text-textMuted hover:text-white transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5 text-accent" />
            {p}
          </button>
        ))}
      </div>

      {/* Composer + Live Voice Mic */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendPrompt(input);
        }}
        className="p-3 border-t border-border bg-[#12161c] flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={toggleMic}
          title={isOpenMic ? 'Mute Live Microphone' : 'Start Gemini Live Voice'}
          className={`p-2 rounded-lg border transition-colors shrink-0 ${
            isOpenMic
              ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
              : 'bg-surface border-border text-emerald-300 hover:border-emerald-500'
          }`}
        >
          {isOpenMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about BLR-104, Bangalore LSPC, beat split..."
          className="flex-1 bg-[#0d1117] border border-border rounded-lg px-3 py-2 text-xs text-white placeholder-textMuted focus:outline-none focus:border-accent"
        />

        <button
          type="submit"
          className="p-2 rounded-lg bg-accent text-[#0d1117] hover:bg-blue-400 transition-colors shrink-0"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
