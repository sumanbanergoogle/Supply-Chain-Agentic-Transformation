export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private sampleRate = 24000;
  private isPlaying = false;

  public initContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx({ sampleRate: this.sampleRate });
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
    return this.audioCtx;
  }

  public playPcmChunk(pcmData: ArrayBuffer): void {
    const ctx = this.initContext();
    const pcm16 = new Int16Array(pcmData);
    if (!pcm16.length) return;
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;

    const buf = ctx.createBuffer(1, float32.length, this.sampleRate);
    buf.copyToChannel(float32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    if (this.nextPlayTime < ctx.currentTime) this.nextPlayTime = ctx.currentTime + 0.05;
    src.start(this.nextPlayTime);
    this.nextPlayTime += buf.duration;
    this.activeSources.push(src);
    this.isPlaying = true;
    src.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== src);
      if (!this.activeSources.length) this.isPlaying = false;
    };
  }

  public interrupt(): void {
    for (const s of this.activeSources) {
      try {
        s.stop();
        s.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.activeSources = [];
    this.isPlaying = false;
    if (this.audioCtx) this.nextPlayTime = this.audioCtx.currentTime;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioPlayer = new AudioPlayer();
