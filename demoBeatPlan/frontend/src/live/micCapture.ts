import workletUrl from './pcm-worklet.js?url';

export type PcmChunkCallback = (buf: ArrayBuffer) => void;

export class MicCapture {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private muteGain: GainNode | null = null;
  private active = false;
  private enabled = false;
  private onChunkCallback: PcmChunkCallback | null = null;

  public async start(onChunk: PcmChunkCallback): Promise<void> {
    this.onChunkCallback = onChunk;
    if (this.active) {
      this.enable(true);
      return;
    }
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioCtx();
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
    await this.audioCtx.audioWorklet.addModule(workletUrl);

    this.source = this.audioCtx.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioCtx, 'pcm-worklet');
    this.workletNode.port.onmessage = (e: MessageEvent) => {
      if (this.enabled && this.onChunkCallback && e.data instanceof ArrayBuffer) {
        this.onChunkCallback(e.data);
      }
    };
    this.muteGain = this.audioCtx.createGain();
    this.muteGain.gain.value = 0;
    this.source.connect(this.workletNode);
    this.workletNode.connect(this.muteGain);
    this.muteGain.connect(this.audioCtx.destination);
    this.active = true;
    this.enable(true);
  }

  public enable(on: boolean): void {
    this.enabled = !!on;
    this.workletNode?.port.postMessage({ enabled: this.enabled });
    if (this.audioCtx && this.enabled && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public isCapturing(): boolean {
    return this.active;
  }

  public stop(): void {
    this.active = false;
    this.enabled = false;
    this.onChunkCallback = null;
    try {
      this.workletNode?.disconnect();
      this.muteGain?.disconnect();
      this.source?.disconnect();
      this.mediaStream?.getTracks().forEach((t) => t.stop());
      this.audioCtx?.close();
    } catch {
      /* ignore */
    }
    this.workletNode = null;
    this.muteGain = null;
    this.source = null;
    this.mediaStream = null;
    this.audioCtx = null;
  }
}

export const micCapture = new MicCapture();
