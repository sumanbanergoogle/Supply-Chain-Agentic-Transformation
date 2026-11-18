import { audioPlayer } from './audioPlayer';
import { micCapture } from './micCapture';
import { getPersona, subscribePersona } from '../state/persona';

export type LiveStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'resumed' | 'fallback';
export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type LiveLanguage = 'english' | 'hinglish' | 'hindi';

export interface LiveContext {
  city?: string;
  outlet_id?: string;
  persona?: string;
  language?: LiveLanguage;
  screen?: string;
}

export interface ToolCallEvent {
  name: string;
  status: 'running' | 'done';
  args?: Record<string, unknown>;
  result?: unknown;
  duration_ms?: number;
}

export interface LiveHandlers {
  onStatus?: (s: LiveStatus, info: { model?: string; message?: string }) => void;
  onVoiceState?: (s: VoiceState) => void;
  onInputTranscript?: (textDelta: string) => void;
  onCaptionDelta?: (textDelta: string) => void;
  onTurnComplete?: (fullText: string) => void;
  onToolCall?: (ev: ToolCallEvent) => void;
  onAction?: (kind: string, payload: unknown) => void;
  onInterrupted?: () => void;
  onFallbackReply?: (msg: { text: string; actions?: unknown[]; engine?: string }) => void;
  onError?: (message: string) => void;
}

const TOOL_ACTION_KIND: Record<string, string> = {
  compare_cities: 'city_comparison',
  get_priority_queue: 'priority_queue',
  get_outlet_profile: 'outlet_profile',
  diagnose_outlet_leakage: 'attribution_waterfall',
  diagnose_beat_leakage: 'beat_diagnosis',
  recommend_outlet_intervention: 'nba',
  compare_outlet_interventions: 'counterfactual',
  simulate_beat_rebalance: 'beat_simulation',
  dispatch_asm_action: 'asm_dispatch',
  ui_control: 'ui_control',
};

function bytesToBase64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export class LiveClient {
  private ws: WebSocket | null = null;
  private status: LiveStatus = 'disconnected';
  private voiceState: VoiceState = 'idle';
  private handlers: LiveHandlers = {};
  private ctx: LiveContext = {};
  private explicitDisconnect = false;
  private openMic = false;
  private sessionApiKey = '';
  private directMode = false;
  private suppressOutput = false;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;

  constructor(handlers?: LiveHandlers) {
    if (handlers) this.handlers = handlers;
    subscribePersona((p) => this.setContext({ persona: p }));
  }

  public setHandlers(h: LiveHandlers): void {
    this.handlers = h;
  }

  public setSessionApiKey(key: string): void {
    this.sessionApiKey = key.trim();
  }

  public getSessionApiKey(): string {
    return this.sessionApiKey;
  }

  private setStatus(s: LiveStatus, info: { model?: string; message?: string } = {}): void {
    this.status = s;
    this.handlers.onStatus?.(s, info);
  }

  private buildWsUrl(ctx: LiveContext): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const params = new URLSearchParams();
    if (ctx.language) params.set('language', ctx.language);
    if (ctx.city) params.set('city', ctx.city);
    if (ctx.outlet_id) params.set('outlet_id', ctx.outlet_id);
    if (ctx.persona) params.set('persona', ctx.persona);
    if (this.sessionApiKey) params.set('api_key', this.sessionApiKey);
    const qs = params.toString();
    return `${proto}//${host}/ws/live${qs ? `?${qs}` : ''}`;
  }

  public connect(ctx: LiveContext = {}): void {
    if (typeof window === 'undefined' || !('WebSocket' in window)) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.ctx = { ...this.ctx, ...ctx };
    if (!this.ctx.persona) this.ctx.persona = getPersona();
    this.explicitDisconnect = false;
    this.directMode = false;
    this.setStatus('connecting');

    const sock = new WebSocket(this.buildWsUrl(this.ctx));
    sock.binaryType = 'arraybuffer';
    this.ws = sock;

    sock.onopen = () => {
      if (this.ws !== sock) return;
      this.reconnectAttempts = 0;
      if (this.reconnectTimer !== null) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.setContext({});
    };

    sock.onmessage = (ev: MessageEvent) => {
      if (this.ws !== sock) return;
      if (ev.data instanceof ArrayBuffer) {
        if (!this.suppressOutput) audioPlayer.playPcmChunk(ev.data);
        return;
      }
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'status') {
          if (msg.status === 'fallback' && this.sessionApiKey) {
            // Try direct Google AI Studio BidiGenerateContent if backend proxy couldn't reach Live
            this.connectDirectAiStudio(this.sessionApiKey);
            return;
          }
          this.setStatus(msg.status, { model: msg.model, message: msg.message });
        } else if (msg.type === 'voice_state') {
          if (this.suppressOutput && msg.state === 'speaking') return;
          this.voiceState = msg.state;
          this.handlers.onVoiceState?.(msg.state);
        } else if (msg.type === 'input_transcript') this.handlers.onInputTranscript?.(msg.text || '');
        else if (msg.type === 'caption_delta') {
          if (!this.suppressOutput) this.handlers.onCaptionDelta?.(msg.text || '');
        } else if (msg.type === 'turn_complete') {
          this.suppressOutput = false;
          this.handlers.onTurnComplete?.(msg.full_text || '');
        }
        else if (msg.type === 'tool_call') this.handlers.onToolCall?.(msg);
        else if (msg.type === 'action') this.handlers.onAction?.(msg.kind, msg.payload);
        else if (msg.type === 'fallback_reply') this.handlers.onFallbackReply?.(msg);
        else if (msg.type === 'interrupted') {
          audioPlayer.interrupt();
          this.handlers.onInterrupted?.();
        } else if (msg.type === 'error') this.handlers.onError?.(msg.message);
      } catch {
        /* ignore */
      }
    };

    sock.onclose = () => {
      if (this.ws !== sock) return;
      this.ws = null;
      if (!this.explicitDisconnect && this.status !== 'fallback') {
        if (this.sessionApiKey) {
          this.connectDirectAiStudio(this.sessionApiKey);
        } else if (this.reconnectAttempts < 3) {
          this.reconnectAttempts += 1;
          const delayMs = this.reconnectAttempts * 1500;
          this.setStatus('reconnecting', { message: `Reconnecting (${this.reconnectAttempts}/3)...` });
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.explicitDisconnect) this.connect(this.ctx);
          }, delayMs);
        } else {
          this.setStatus('disconnected');
        }
      }
    };

    sock.onerror = () => {
      if (this.ws !== sock) return;
      if (!this.sessionApiKey) {
        this.handlers.onError?.('');
      }
    };
  }

  /**
   * Direct browser -> Google AI Studio Gemini Live BidiGenerateContent fallback when a session
   * API key is supplied and the host HTTP proxy does not forward /ws/live WebSockets.
   */
  private async connectDirectAiStudio(apiKey: string): Promise<void> {
    this.explicitDisconnect = false;
    this.directMode = true;
    this.setStatus('connecting', { model: 'gemini-3.8-live' });

    let decls: any[] = [];
    try {
      const r = await fetch('/api/tools/declarations');
      const d = await r.json();
      decls = d.declarations || [];
    } catch {
      decls = [];
    }

    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(
      apiKey,
    )}`;
    const sock = new WebSocket(url);
    this.ws = sock;
    let outputCap = '';
    let turnOutput = false;
    let toolSinceOutput = false;

    sock.onopen = () => {
      if (this.ws !== sock) return;
      sock.send(
        JSON.stringify({
          setup: {
            model: 'models/gemini-3.8-live',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [
                {
                  text: `You are Sahayak AI, the real-time executive voice copilot for ITC Limited TM&D across Bangalore, Hyderabad, and Chennai. STRICT ALLOWED-LANGUAGES RULE: You ONLY speak and support English, Hindi, and Hinglish. NEVER speak, translate into, or switch to Spanish or ANY other language under any circumstances (even if noisy mic audio sounds like another language or if asked). If asked in an unsupported language, reply in ${
                    this.ctx.language || 'english'
                  } stating that only English, Hindi, and Hinglish are supported. Always invoke tools first for exact numbers and drive the map/UI with ui_control. Reply concisely in 2-3 sentences strictly in ${
                    this.ctx.language || 'english'
                  }.`,
                },
              ],
            },
            tools: decls.length ? [{ functionDeclarations: decls }] : [],
          },
        }),
      );
    };

    sock.onmessage = async (ev: MessageEvent) => {
      if (this.ws !== sock) return;
      let raw = '';
      if (ev.data instanceof Blob) raw = await ev.data.text();
      else if (typeof ev.data === 'string') raw = ev.data;
      else return;

      let msg: any;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      if (msg.setupComplete) {
        this.reconnectAttempts = 0;
        this.setStatus('connected', { model: 'gemini-3.8-live' });
        this.handlers.onVoiceState?.('idle');
        return;
      }

      if (msg.toolCall?.functionCalls) {
        toolSinceOutput = true;
        this.handlers.onVoiceState?.('thinking');
        const responses: any[] = [];
        for (const fc of msg.toolCall.functionCalls) {
          this.handlers.onToolCall?.({ name: fc.name, status: 'running', args: fc.args });
          let result: any = { status: 'ERROR' };
          try {
            const resp = await fetch('/api/tools/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: fc.name, args: fc.args || {} }),
            });
            result = await resp.json();
          } catch (e) {
            result = { status: 'ERROR', message: String(e) };
          }
          this.handlers.onToolCall?.({ name: fc.name, status: 'done', args: fc.args, result });
          const kind = TOOL_ACTION_KIND[fc.name];
          if (kind && result.status === 'OK') this.handlers.onAction?.(kind, result);
          responses.push({ id: fc.id, name: fc.name, response: { output: result } });
        }
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
        }
        return;
      }

      const sc = msg.serverContent;
      if (!sc) return;
      if (sc.interrupted) {
        audioPlayer.interrupt();
        this.handlers.onInterrupted?.();
      }
      if (sc.inputTranscription?.text) {
        this.handlers.onInputTranscript?.(sc.inputTranscription.text);
      }
      if (sc.outputTranscription?.text) {
        turnOutput = true;
        if (!this.suppressOutput) {
          outputCap += sc.outputTranscription.text;
          this.handlers.onCaptionDelta?.(sc.outputTranscription.text);
        }
      }
      const parts = sc.modelTurn?.parts || [];
      for (const p of parts) {
        if (p.inlineData?.data && p.inlineData?.mimeType?.startsWith('audio/')) {
          turnOutput = true;
          if (!this.suppressOutput) {
            this.handlers.onVoiceState?.('speaking');
            audioPlayer.playPcmChunk(base64ToArrayBuffer(p.inlineData.data));
          }
        }
      }
      if (sc.turnComplete) {
        if (!turnOutput && toolSinceOutput) return;
        this.suppressOutput = false;
        turnOutput = false;
        toolSinceOutput = false;
        this.handlers.onTurnComplete?.(outputCap.trim());
        outputCap = '';
        this.handlers.onVoiceState?.('idle');
      }
    };

    sock.onclose = () => {
      if (this.ws !== sock) return;
      this.ws = null;
      if (!this.explicitDisconnect) {
        if (this.sessionApiKey && this.reconnectAttempts < 3) {
          this.reconnectAttempts += 1;
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.explicitDisconnect && this.sessionApiKey) {
              this.connectDirectAiStudio(this.sessionApiKey);
            }
          }, 1000);
        } else {
          this.setStatus('disconnected');
        }
      }
    };

    sock.onerror = () => {
      this.handlers.onError?.('Direct Gemini Live connection failed. Check API key permissions.');
    };
  }

  public retry(): void {
    this.disconnect();
    this.connect(this.ctx);
  }

  public disconnect(): void {
    this.explicitDisconnect = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    micCapture.stop();
    audioPlayer.interrupt();
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  public setContext(patch: LiveContext): void {
    this.ctx = { ...this.ctx, ...patch };
    if (!this.directMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'context', ui_state: this.ctx }));
    }
  }

  public sendText(text: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.suppressOutput = false;
    audioPlayer.interrupt();
    this.handlers.onVoiceState?.('thinking');
    if (this.directMode) {
      this.ws.send(
        JSON.stringify({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [
                  {
                    text: `[UI context: city=${this.ctx.city || 'ALL'}, outlet=${this.ctx.outlet_id || 'none'}, language=${this.ctx.language || 'english'}; ONLY English, Hindi, or Hinglish allowed — NEVER Spanish or any other language] ${text}`,
                  },
                ],
              },
            ],
            turnComplete: true,
          },
        }),
      );
      return true;
    }
    this.ws.send(JSON.stringify({ type: 'prompt', text, ui_state: this.ctx }));
    return true;
  }

  private sendAudioChunk(buf: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (this.directMode) {
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: bytesToBase64(buf) }],
          },
        }),
      );
    } else {
      this.ws.send(buf);
    }
  }

  public async startTalking(): Promise<void> {
    this.suppressOutput = false;
    if (this.voiceState === 'speaking' || audioPlayer.getIsPlaying()) this.interrupt();
    this.suppressOutput = false;
    if (!this.directMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'resume_audio' }));
    }
    if (!micCapture.isCapturing()) {
      await micCapture.start((buf) => this.sendAudioChunk(buf));
    } else {
      micCapture.enable(true);
    }
    this.handlers.onVoiceState?.('listening');
  }

  public stopTalking(): void {
    if (this.openMic) return;
    micCapture.enable(false);
    this.interrupt();
  }

  public async setOpenMic(on: boolean): Promise<void> {
    this.openMic = on;
    if (on) {
      if (this.voiceState === 'speaking' || audioPlayer.getIsPlaying()) this.interrupt();
      this.suppressOutput = false;
      if (!this.directMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'resume_audio' }));
      }
      if (!micCapture.isCapturing()) {
        await micCapture.start((buf) => this.sendAudioChunk(buf));
      } else {
        micCapture.enable(true);
      }
      this.handlers.onVoiceState?.('listening');
    } else {
      micCapture.enable(false);
      this.interrupt();
    }
  }

  public interrupt(): void {
    this.suppressOutput = true;
    audioPlayer.interrupt();
    if (!this.directMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
    this.voiceState = 'idle';
    this.handlers.onVoiceState?.('idle');
    this.handlers.onInterrupted?.();
  }
}

export function isLiveSupported(): boolean {
  return typeof window !== 'undefined' && 'WebSocket' in window;
}

export function isMicSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return !!(
    AudioCtx &&
    'audioWorklet' in AudioCtx.prototype &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}
