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

export class LiveClient {
  private ws: WebSocket | null = null;
  private status: LiveStatus = 'disconnected';
  private voiceState: VoiceState = 'idle';
  private handlers: LiveHandlers = {};
  private ctx: LiveContext = {};
  private explicitDisconnect = false;
  private openMic = false;

  constructor(handlers?: LiveHandlers) {
    if (handlers) this.handlers = handlers;
    subscribePersona((p) => this.setContext({ persona: p }));
  }

  public setHandlers(h: LiveHandlers): void {
    this.handlers = h;
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
    const qs = params.toString();
    return `${proto}//${host}/ws/live${qs ? `?${qs}` : ''}`;
  }

  public connect(ctx: LiveContext = {}): void {
    if (typeof window === 'undefined' || !('WebSocket' in window)) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.ctx = { ...this.ctx, ...ctx };
    if (!this.ctx.persona) this.ctx.persona = getPersona();
    this.explicitDisconnect = false;
    this.setStatus('connecting');

    const sock = new WebSocket(this.buildWsUrl(this.ctx));
    sock.binaryType = 'arraybuffer';
    this.ws = sock;

    sock.onopen = () => {
      if (this.ws !== sock) return;
      this.setContext({});
    };

    sock.onmessage = (ev: MessageEvent) => {
      if (this.ws !== sock) return;
      if (ev.data instanceof ArrayBuffer) {
        audioPlayer.playPcmChunk(ev.data);
        return;
      }
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'status') this.setStatus(msg.status, { model: msg.model, message: msg.message });
        else if (msg.type === 'voice_state') {
          this.voiceState = msg.state;
          this.handlers.onVoiceState?.(msg.state);
        } else if (msg.type === 'input_transcript') this.handlers.onInputTranscript?.(msg.text || '');
        else if (msg.type === 'caption_delta') this.handlers.onCaptionDelta?.(msg.text || '');
        else if (msg.type === 'turn_complete') this.handlers.onTurnComplete?.(msg.full_text || '');
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
        this.setStatus('disconnected');
      }
    };

    sock.onerror = () => {
      if (this.ws !== sock) return;
      this.handlers.onError?.('WebSocket error');
    };
  }

  public retry(): void {
    this.disconnect();
    this.connect(this.ctx);
  }

  public disconnect(): void {
    this.explicitDisconnect = true;
    micCapture.stop();
    audioPlayer.interrupt();
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  public setContext(patch: LiveContext): void {
    this.ctx = { ...this.ctx, ...patch };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'context', ui_state: this.ctx }));
    }
  }

  public sendText(text: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    audioPlayer.interrupt();
    this.handlers.onVoiceState?.('thinking');
    this.ws.send(JSON.stringify({ type: 'prompt', text, ui_state: this.ctx }));
    return true;
  }

  public async startTalking(): Promise<void> {
    if (this.voiceState === 'speaking' || audioPlayer.getIsPlaying()) this.interrupt();
    if (!micCapture.isCapturing()) {
      await micCapture.start((buf) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(buf);
      });
    } else {
      micCapture.enable(true);
    }
    this.handlers.onVoiceState?.('listening');
  }

  public stopTalking(): void {
    if (this.openMic) return;
    micCapture.enable(false);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'audio_end' }));
    }
    this.handlers.onVoiceState?.('thinking');
  }

  public async setOpenMic(on: boolean): Promise<void> {
    this.openMic = on;
    if (on) {
      if (this.voiceState === 'speaking' || audioPlayer.getIsPlaying()) this.interrupt();
      if (!micCapture.isCapturing()) {
        await micCapture.start((buf) => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(buf);
        });
      } else {
        micCapture.enable(true);
      }
      this.handlers.onVoiceState?.('listening');
    } else {
      micCapture.enable(false);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'audio_end' }));
      }
      this.handlers.onVoiceState?.('idle');
    }
  }

  public interrupt(): void {
    audioPlayer.interrupt();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
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
