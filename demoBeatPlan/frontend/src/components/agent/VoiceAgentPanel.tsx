import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  KeyRound,
  Mic,
  MicOff,
  Play,
  Radio,
  Send,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { UrviMark } from '../common/UrviMark';
import { ChatAction, OutletSummary } from '../../types/tmd';
import {
  isLiveSupported,
  isMicSupported,
  LiveClient,
  LiveLanguage,
  LiveStatus,
  ToolCallEvent,
  VoiceState,
} from '../../live/liveClient';
import { dispatchUi, labelOf, UiCommand, useUiCommands } from '../../agent/uiCommands';
import { tmdApi } from '../../api/client';

interface LiveMsg {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  tools?: ToolCallEvent[];
  uiChips?: string[];
  live?: boolean;
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

const STORYBOARD_CHIPS: Record<LiveLanguage, string[]> = {
  english: [
    'Pull up Q3 General Trade health for Bangalore Metro',
    'Zoom into Beat 4 and Beat 7 and compare salesman visits',
    'Run ML/DL root-cause diagnostic models on Beat 7',
    'Why is Lakshmi Super Mart only buying 2 categories?',
    'Simulate fixing Beat 4 route and Beat 7 SKU push',
  ],
  hinglish: [
    'Bangalore Metro ka Q3 General Trade health dikhao',
    'Koramangala Beat 4 aur HSR Beat 7 zoom karo',
    'Beat 7 par ML/DL root-cause model run karo',
    'Lakshmi Super Mart sirf 2 category kyu le raha hai?',
    'Beat 4 route split aur Beat 7 recovery simulate karo',
  ],
  hindi: [
    'बेंगलुरु मेट्रो का Q3 जनरल ट्रेड हेल्थ दिखाएं',
    'बीट 4 और बीट 7 ज़ूम करें और सेल्समैन विज़िट देखें',
    'बीट 7 पर एमएल रूट-कॉज़ मॉडल चलाएं',
    'लक्ष्मी सुपर मार्ट केवल 2 कैटेगरी क्यों खरीद रहा है?',
    'बीट 4 रूट सुधार और रिकवरी सिमुलेट करें',
  ],
};

function getSpeechRecognitionCtor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export const VoiceAgentPanel: React.FC<VoiceAgentPanelProps> = ({
  outlet,
  city,
  screen,
  contextLabel,
  onAgentAction,
  onStatusChange,
  headerActions,
}) => {
  const [messages, setMessages] = useState<LiveMsg[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [language, setLanguage] = useState<LiveLanguage>('english');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(() => isLiveSupported());
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('disconnected');
  const [statusInfo, setStatusInfo] = useState<{ model?: string; message?: string }>({});
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isOpenMic, setIsOpenMic] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [speechListening, setSpeechListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [legacySpeaking, setLegacySpeaking] = useState(false);
  const [showKeyBox, setShowKeyBox] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [activeApiKey, setActiveApiKey] = useState('');

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const currentAgentIdRef = useRef<string | null>(null);
  const mutedRef = useRef(isMuted);
  mutedRef.current = isMuted;
  const isOpenMicRef = useRef(isOpenMic);
  isOpenMicRef.current = isOpenMic;
  const recognitionRef = useRef<any>(null);
  const submitFnRef = useRef<(p?: string) => Promise<void>>(async () => {});

  const clientRef = useRef<LiveClient | null>(null);
  if (!clientRef.current) clientRef.current = new LiveClient();
  const client = clientRef.current;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setSpeechListening(false);
    setInterimTranscript('');
  };

  const speakFallback = (text: string) => {
    if (mutedRef.current || typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    if (language === 'hindi') {
      u.lang = 'hi-IN';
      const v = voices.find((x) => x.lang === 'hi-IN' || x.lang === 'hi_IN');
      if (v) u.voice = v;
    } else {
      u.lang = 'en-IN';
      const v =
        voices.find((x) => x.lang === 'en-IN' || x.lang === 'en_IN') ||
        voices.find((x) => x.lang.startsWith('en'));
      if (v) u.voice = v;
    }
    u.onstart = () => setLegacySpeaking(true);
    u.onend = () => setLegacySpeaking(false);
    u.onerror = () => setLegacySpeaking(false);
    window.speechSynthesis.speak(u);
  };

  useUiCommands((cmd) => {
    if (cmd.action === 'language' && cmd.value) setLanguage(cmd.value as LiveLanguage);
  });

  useEffect(() => {
    client.setHandlers({
      onStatus: (s, info) => {
        setLiveStatus(s);
        setStatusInfo(info || {});
        if (s === 'fallback') {
          setMessages((prev) => {
            if (prev.some((m) => m.id.startsWith('sys-fb'))) return prev;
            return [
              ...prev,
              {
                id: `sys-fb-${Date.now()}`,
                sender: 'agent',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                text: info?.message || 'Vertex Live audio unavailable — browser voice & tool-grounded copilot active.',
                live: true,
              },
            ];
          });
        }
      },
      onVoiceState: setVoiceState,
      onInputTranscript: (delta) => {
        if (!delta) return;
        const id = currentUserIdRef.current;
        if (!id) {
          const nid = `u-live-${Date.now()}`;
          currentUserIdRef.current = nid;
          setMessages((prev) => [
            ...prev,
            {
              id: nid,
              sender: 'user',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `🎙️ ${delta}`,
              live: true,
            },
          ]);
        } else {
          setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)));
        }
      },
      onCaptionDelta: (delta) => {
        if (!delta) return;
        const id = currentAgentIdRef.current;
        if (!id) {
          const nid = `a-live-${Date.now()}`;
          currentAgentIdRef.current = nid;
          setMessages((prev) => [
            ...prev,
            {
              id: nid,
              sender: 'agent',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: delta,
              live: true,
            },
          ]);
        } else {
          setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)));
        }
      },
      onTurnComplete: (fullText) => {
        if (!currentAgentIdRef.current && fullText.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: `a-live-${Date.now()}`,
              sender: 'agent',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: fullText,
              live: true,
            },
          ]);
        }
        currentUserIdRef.current = null;
        currentAgentIdRef.current = null;
      },
      onToolCall: (ev) => {
        let aid = currentAgentIdRef.current;
        if (!aid) {
          aid = `a-live-${Date.now()}`;
          currentAgentIdRef.current = aid;
          setMessages((prev) => [
            ...prev,
            {
              id: aid!,
              sender: 'agent',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: '',
              tools: [ev],
              live: true,
            },
          ]);
          return;
        }
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== aid) return m;
            const tools = m.tools || [];
            const idx = tools.findIndex((t) => t.name === ev.name);
            return { ...m, tools: idx >= 0 ? tools.map((t, i) => (i === idx ? ev : t)) : [...tools, ev] };
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
        const bid = payload?.beat_id ?? payload?.data?.beat_id ?? null;
        let targetScreen: string | undefined;
        let view: string | undefined;
        if (kind === 'city_comparison') targetScreen = 'city_compare';
        else if (kind === 'priority_queue') targetScreen = 'city_health';
        else if (kind === 'beat_diagnosis') targetScreen = 'beat_diagnosis';
        else if (kind === 'beat_simulation') targetScreen = 'beat_simulator';
        else if (['outlet_profile', 'attribution_waterfall', 'nba', 'counterfactual'].includes(kind)) {
          targetScreen = 'outlet';
          view = kind === 'nba' ? 'recommendation' : kind === 'counterfactual' ? 'compare' : kind === 'attribution_waterfall' ? 'diagnosis' : 'overview';
        }
        if (targetScreen) {
          onAgentAction({ kind: 'navigate', screen: targetScreen, view, city: targetCity, outlet_id: oid, beat_id: bid, source_tool: kind });
        }
      },
      onFallbackReply: (msg) => {
        const uiChips: string[] = [];
        for (const a of (msg.actions || []) as ChatAction[]) {
          if (a.kind === 'ui' && a.command) {
            const cmd = a.command as UiCommand;
            dispatchUi(cmd);
            uiChips.push(labelOf(cmd));
          } else {
            onAgentAction?.(a);
          }
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `fb-${Date.now()}`,
            sender: 'agent',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: msg.text,
            uiChips: uiChips.length ? uiChips : undefined,
          },
        ]);
        speakFallback(msg.text);
      },
      onError: (message) => {
        if (!message) return;
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'agent',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `⚠️ ${message}`,
          },
        ]);
      },
    });
  }, [client, onAgentAction, city]);

  useEffect(() => {
    const onRunPrompt = (e: Event) => {
      const promptText = (e as CustomEvent<string>).detail;
      if (promptText) void submitFnRef.current(promptText);
    };
    window.addEventListener('beatpulse:run_prompt', onRunPrompt);
    return () => window.removeEventListener('beatpulse:run_prompt', onRunPrompt);
  }, []);

  useEffect(() => {
    if (isLiveMode) {
      client.connect({ city: city ?? undefined, outlet_id: outlet?.outlet_id, screen: screen ?? undefined, language });
    } else {
      client.disconnect();
    }
    return () => {
      stopSpeechRecognition();
      client.disconnect();
    };
  }, [isLiveMode, client]);

  useEffect(() => {
    if (isLiveMode) {
      client.setContext({ city: city ?? undefined, outlet_id: outlet?.outlet_id, screen: screen ?? undefined, language });
    }
  }, [city, outlet?.outlet_id, screen, language, isLiveMode, client]);

  const isLiveReady = isLiveMode && (liveStatus === 'connected' || liveStatus === 'resumed');
  const activeListening = speechListening || (isLiveMode && voiceState === 'listening');
  const activeSpeaking = isLiveMode ? voiceState === 'speaking' || legacySpeaking : legacySpeaking;
  const activeThinking = isLiveMode ? voiceState === 'thinking' : isProcessing;

  useEffect(() => {
    onStatusChange?.({
      live: isLiveReady,
      listening: activeListening || isTalking,
      speaking: activeSpeaking,
      thinking: activeThinking,
    });
  }, [isLiveReady, activeListening, isTalking, activeSpeaking, activeThinking, onStatusChange]);

  const submitMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? inputPrompt).trim();
    if (!textToSend) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: textToSend,
        live: isLiveReady,
      },
    ]);
    if (!customPrompt) setInputPrompt('');
    currentAgentIdRef.current = null;

    if (isLiveMode && (liveStatus === 'connected' || liveStatus === 'resumed' || liveStatus === 'fallback')) {
      if (client.sendText(textToSend)) return;
    }

    setIsProcessing(true);
    try {
      const res = await tmdApi.chat(
        {
          message: textToSend,
          language,
          city: city ?? null,
          outlet_id: outlet?.outlet_id ?? null,
          screen: screen ?? null,
        },
        activeApiKey || undefined,
      );
      const uiChips: string[] = [];
      for (const a of (res.actions || []) as ChatAction[]) {
        if (a.kind === 'ui' && a.command) {
          const cmd = a.command as UiCommand;
          dispatchUi(cmd);
          uiChips.push(labelOf(cmd));
        } else {
          onAgentAction?.(a);
        }
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `rest-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: res.response,
          tools: res.tool_calls,
          uiChips: uiChips.length ? uiChips : undefined,
        },
      ]);
      speakFallback(res.response);
    } finally {
      setIsProcessing(false);
    }
  };
  submitFnRef.current = submitMessage;

  // Browser SpeechRecognition fallback so Open Mic works even when Vertex ADC isn't logged in!
  const startSpeechRecognition = (continuous: boolean) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setMessages((prev) => [
        ...prev,
        {
          id: `mic-err-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: '⚠️ Browser Speech Recognition is unavailable on non-localhost HTTP. Open via ssh -L 8095:localhost:8095 sumcl.c.googlers.com for mic, or type / click any Storyboard step.',
        },
      ]);
      setIsOpenMic(false);
      setIsTalking(false);
      return;
    }

    stopSpeechRecognition();
    const rec = new Ctor();
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.lang = language === 'hindi' ? 'hi-IN' : 'en-IN';
    recognitionRef.current = rec;
    setSpeechListening(true);

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = (res[0]?.transcript || '').trim();
        if (res.isFinal && transcript) {
          setInterimTranscript('');
          void submitFnRef.current(transcript);
        } else {
          interim += transcript + ' ';
        }
      }
      if (interim.trim()) setInterimTranscript(interim.trim());
    };

    rec.onerror = (event: any) => {
      const code = event?.error || 'unknown';
      if (code === 'no-speech') return;
      stopSpeechRecognition();
      setIsOpenMic(false);
      setIsTalking(false);
      const hint =
        code === 'not-allowed' || code === 'service-not-allowed'
          ? 'Microphone permission denied by browser.'
          : code === 'network'
            ? 'Chrome Speech Recognition network error (or blocked on HTTP origin). Use localhost via ssh -L, or click any Storyboard step / type below.'
            : `Microphone error: ${code}`;
      setMessages((prev) => [
        ...prev,
        {
          id: `sr-err-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ ${hint}`,
        },
      ]);
    };

    rec.onend = () => {
      if (continuous && isOpenMicRef.current) {
        try {
          rec.start();
        } catch {
          stopSpeechRecognition();
          setIsOpenMic(false);
        }
      } else {
        setSpeechListening(false);
        setInterimTranscript('');
      }
    };

    try {
      rec.start();
    } catch {
      stopSpeechRecognition();
      setIsOpenMic(false);
      setIsTalking(false);
    }
  };

  const toggleOpenMic = async () => {
    const next = !isOpenMic;
    setIsOpenMic(next);
    isOpenMicRef.current = next;

    if (isLiveReady) {
      if (!isMicSupported()) {
        setIsOpenMic(false);
        alert('Live PCM mic requires HTTPS or http://localhost.');
        return;
      }
      try {
        await client.setOpenMic(next);
      } catch {
        setIsOpenMic(false);
      }
      return;
    }

    // Fallback / Tool Mode -> Browser SpeechRecognition
    if (next) startSpeechRecognition(true);
    else stopSpeechRecognition();
  };

  const startHoldTalk = async () => {
    if (isLiveReady) {
      if (!isMicSupported()) return;
      try {
        await client.startTalking();
        setIsTalking(true);
      } catch {
        setIsTalking(false);
      }
      return;
    }
    setIsTalking(true);
    startSpeechRecognition(false);
  };

  const stopHoldTalk = () => {
    if (isLiveReady) {
      client.stopTalking();
      setIsTalking(false);
      return;
    }
    setIsTalking(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
  };

  const st = !isLiveMode
    ? { label: 'Live off', cls: 'bg-[#0d1117] text-textMuted border-border hover:text-white', pulse: false }
    : liveStatus === 'connected' || liveStatus === 'resumed'
      ? { label: 'Live', cls: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 font-semibold', pulse: true }
      : liveStatus === 'connecting' || liveStatus === 'reconnecting'
        ? { label: 'Connecting…', cls: 'bg-amber-950/60 text-amber-300 border-amber-700/60 animate-pulse', pulse: false }
        : { label: 'Text only', cls: 'bg-rose-950/60 text-rose-300 border-rose-700/60', pulse: false };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header matching workover-operations-ai-agent-cloudrun/VoiceAgentPanel.tsx */}
      <div className="border-b border-border px-3 pt-2 pb-1.5 shrink-0 bg-[#12161c]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <UrviMark size={28} title="Sahayak" />
            <h3 className="text-xs font-bold text-white font-sans truncate">Sahayak AI Agent</h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsLiveMode((v) => !v)}
              title={`Gemini Live status: ${liveStatus}${statusInfo.model ? ` (${statusInfo.model})` : ''}`}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-sans transition-colors ${st.cls}`}
            >
              <Radio className={`w-3.5 h-3.5 ${st.pulse ? 'animate-pulse' : ''}`} />
              <span>{st.label}</span>
            </button>
            {isLiveMode && (liveStatus === 'fallback' || liveStatus === 'disconnected') && (
              <>
                <button
                  type="button"
                  onClick={() => client.retry()}
                  className="text-[10px] font-mono text-accent hover:text-white px-1"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setShowKeyBox((v) => !v)}
                  title="Connect real-time Gemini Live API key (when Vertex ADC is expired)"
                  className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    activeApiKey
                      ? 'border-emerald-600/60 text-emerald-300 bg-emerald-950/40'
                      : 'border-amber-600/60 text-amber-300 bg-amber-950/40 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3 h-3" />
                  <span>{activeApiKey ? 'Key Set' : 'Live Key'}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                if (!isMuted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                setIsMuted((m) => !m);
              }}
              title={isMuted ? 'Unmute audio' : 'Mute audio'}
              className="p-1.5 rounded text-textMuted hover:text-white hover:bg-border transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {headerActions}
          </div>
        </div>

        {showKeyBox && (
          <div className="mt-2 p-2 rounded-lg bg-[#0d1117] border border-border space-y-1.5 text-[11px] font-sans">
            <div className="text-textMuted">
              Vertex ADC is expired on this Cloudtop. Paste a session-only Gemini API key (memory only) or run{' '}
              <code className="text-amber-300">gcloud auth application-default login</code> and click Retry:
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="password"
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                placeholder="AIza..."
                className="flex-1 bg-surface border border-border rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => {
                  const k = apiKeyDraft.trim();
                  setActiveApiKey(k);
                  client.setSessionApiKey(k);
                  setShowKeyBox(false);
                  if (k) client.retry();
                }}
                className="px-2.5 py-1 rounded bg-emerald-500 text-[#0d1117] font-bold text-xs hover:bg-emerald-400"
              >
                Connect
              </button>
            </div>
          </div>
        )}

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-1 min-w-0 text-textMuted">
            <span>Context:</span>
            <span className="text-white truncate">{contextLabel || 'South Metro'}</span>
          </div>
          <select
            value={language}
            onChange={(e) => {
              const nextLang = e.target.value as LiveLanguage;
              setLanguage(nextLang);
              if (isLiveMode) {
                client.setContext({ language: nextLang });
                client.retry();
              }
            }}
            aria-label="Agent language"
            className="bg-[#0d1117] border border-border rounded px-1 py-0.5 text-[10px] text-textMain focus:outline-none focus:border-accent"
          >
            <option value="english">English</option>
            <option value="hinglish">Hinglish</option>
            <option value="hindi">हिंदी</option>
          </select>
        </div>
      </div>

      {/* Sound Wave Visualizer */}
      {(activeListening || isTalking || activeSpeaking) && (
        <div
          className={`min-h-10 py-1.5 border-b px-4 flex items-center justify-between text-xs font-mono ${
            activeListening || isTalking ? 'bg-emerald-950/60 border-emerald-800/60' : 'bg-blue-950/40 border-blue-800/40'
          }`}
        >
          <span className={`truncate mr-2 ${activeListening || isTalking ? 'text-emerald-300' : 'text-blue-300'}`}>
            {activeListening || isTalking
              ? interimTranscript
                ? `🎙️ "${interimTranscript}"`
                : 'Listening · speak any time'
              : 'Agent speaking...'}
          </span>
          <div className="flex items-center gap-1 h-5 shrink-0">
            {[0, 150, 300, 450, 200].map((d, i) => (
              <div
                key={i}
                className={`w-1 rounded-full animate-wave ${activeListening || isTalking ? 'bg-emerald-400' : 'bg-accent'}`}
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1.5">
            {msg.uiChips && (
              <div className="flex flex-wrap gap-1.5 pl-9">
                {msg.uiChips.map((c, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-full px-2.5 py-0.5"
                  >
                    ↗ {c}
                  </span>
                ))}
              </div>
            )}
            <div className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'agent' && <UrviMark size={24} className="mt-0.5" title="Sahayak" />}
              <div className="max-w-[85%] space-y-1.5">
                <div
                  className={`p-3 rounded-xl leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-medium rounded-tr-none'
                      : 'bg-[#0d1117] text-textMain border border-border rounded-tl-none shadow-md'
                  }`}
                >
                  {msg.tools && msg.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {msg.tools.map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/60 border border-sky-700/50 text-sky-300"
                        >
                          <Wrench className="w-2.5 h-2.5" /> {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-textMuted px-1">
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'agent' && msg.text && (
                    <button
                      type="button"
                      onClick={() => speakFallback(msg.text)}
                      className="flex items-center gap-1 hover:text-accent transition-colors"
                    >
                      <Play className="w-2.5 h-2.5" /> Replay Voice
                    </button>
                  )}
                </div>
              </div>
              {msg.sender === 'user' && (
                <div className="w-6 h-6 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-blue-200" />
                </div>
              )}
            </div>
          </div>
        ))}
        {activeThinking && (
          <div className="flex gap-3 items-center text-textMuted text-xs font-mono">
            <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-accent animate-spin" />
            </div>
            <span>Running ITC TM&amp;D analytics in {language.toUpperCase()}...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Storyboard Suggested Prompt Chips */}
      <div className="px-4 py-2 border-t border-border/60 bg-[#0d1117] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {STORYBOARD_CHIPS[language].map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => submitMessage(prompt)}
            className="whitespace-nowrap bg-surface hover:bg-border/80 border border-border text-[11px] font-sans text-textMuted hover:text-white px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5 text-accent" /> {prompt}
          </button>
        ))}
      </div>

      {/* Textarea + Open Mic / Hold to Talk controls */}
      <div className="p-3 border-t border-border bg-surface shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitMessage();
          }}
          className="flex flex-col gap-2"
        >
          <div className="relative">
            <textarea
              ref={composerRef}
              rows={2}
              value={interimTranscript || inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submitMessage();
                }
              }}
              placeholder={
                activeListening || isTalking
                  ? 'Listening to your question...'
                  : 'Ask about Bangalore Q3 health, Beat 4 vs 7, Lakshmi Super Mart, or Beat split...'
              }
              className="w-full min-h-[56px] max-h-36 resize-none bg-[#0d1117] border border-border text-[13px] leading-snug pl-3 pr-12 py-2.5 rounded-lg text-white placeholder-textMuted focus:outline-none focus:border-accent font-sans"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim()}
              aria-label="Send"
              className="absolute right-2 bottom-2 p-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isMicSupported() && !getSpeechRecognitionCtor() ? (
              <button
                type="button"
                onClick={toggleOpenMic}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0d1117] text-textMuted border border-border/50 font-mono text-xs hover:text-white"
              >
                <MicOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Mic needs localhost/HTTPS</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleOpenMic}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                    isOpenMic
                      ? 'bg-emerald-600/25 text-emerald-200 border border-emerald-500'
                      : 'bg-[#0d1117] text-emerald-400 hover:text-white border border-emerald-500/50'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isOpenMic ? 'Listening · tap to stop' : 'Open mic'}</span>
                </button>
                {!isOpenMic && (
                  <button
                    type="button"
                    onPointerDown={startHoldTalk}
                    onPointerUp={stopHoldTalk}
                    onPointerLeave={stopHoldTalk}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold select-none transition-colors ${
                      isTalking
                        ? 'bg-emerald-600 text-white border border-emerald-300 animate-pulse'
                        : 'bg-[#0d1117] text-emerald-400 hover:text-white border border-emerald-500/50'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{isTalking ? 'Listening...' : 'Hold to talk'}</span>
                  </button>
                )}
              </>
            )}
            <span className="ml-auto text-[10px] font-mono text-textMuted">Enter to send</span>
          </div>
        </form>
      </div>
    </div>
  );
};
