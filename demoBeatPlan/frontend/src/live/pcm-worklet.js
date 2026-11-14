class PcmWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.chunkSize = 480;
    this.outputBuffer = new Int16Array(this.chunkSize);
    this.outputIndex = 0;
    this.inputBuffer = [];
    this.ratio = sampleRate / this.targetSampleRate;
    this.phase = 0;
    this.enabled = false;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (typeof data.enabled === 'boolean') {
        this.enabled = data.enabled;
        if (!this.enabled) {
          this.inputBuffer = [];
          this.phase = 0;
          this.outputIndex = 0;
        }
      }
    };
  }

  process(inputs) {
    if (!this.enabled) return true;
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;
    const channelData = input[0];

    if (sampleRate === this.targetSampleRate) {
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        this.outputBuffer[this.outputIndex++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        if (this.outputIndex === this.chunkSize) {
          this.port.postMessage(this.outputBuffer.buffer, [this.outputBuffer.buffer]);
          this.outputBuffer = new Int16Array(this.chunkSize);
          this.outputIndex = 0;
        }
      }
      return true;
    }

    for (let i = 0; i < channelData.length; i++) this.inputBuffer.push(channelData[i]);
    while (this.phase < this.inputBuffer.length - 1) {
      const idx = Math.floor(this.phase);
      const frac = this.phase - idx;
      const s = Math.max(
        -1,
        Math.min(1, this.inputBuffer[idx] + frac * (this.inputBuffer[idx + 1] - this.inputBuffer[idx])),
      );
      this.outputBuffer[this.outputIndex++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.outputIndex === this.chunkSize) {
        this.port.postMessage(this.outputBuffer.buffer, [this.outputBuffer.buffer]);
        this.outputBuffer = new Int16Array(this.chunkSize);
        this.outputIndex = 0;
      }
      this.phase += this.ratio;
    }
    const consumed = Math.floor(this.phase);
    if (consumed > 0) {
      this.inputBuffer.splice(0, consumed);
      this.phase -= consumed;
    }
    return true;
  }
}

registerProcessor('pcm-worklet', PcmWorkletProcessor);
