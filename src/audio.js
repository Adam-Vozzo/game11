export class Audio {
  constructor() {
    this.volume = 0.5;
    this.ctx = null;
  }
  unlock() {
    this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (!this.output) {
      this.output = this.ctx.createDynamicsCompressor();
      this.output.threshold.value = -8;
      this.output.knee.value = 8;
      this.output.ratio.value = 8;
      this.output.attack.value = 0.002;
      this.output.release.value = 0.12;
      this.output.connect(this.ctx.destination);
    }
    this.ctx.resume();
  }
  tone(freq, duration, type = 'sine', gain = 0.1) {
    if (!this.ctx) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.4), c.currentTime + duration);
    g.gain.setValueAtTime(gain * this.volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.connect(g).connect(this.output);
    o.start();
    o.stop(c.currentTime + duration);
  }
  shot(local = true) {
    if (!this.ctx) return;
    const c = this.ctx,
      length = 0.48,
      buffer = c.createBuffer(1, c.sampleRate * length, c.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4);
    const s = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(local ? 9000 : 3600, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(450, c.currentTime + length);
    g.gain.value = this.volume * (local ? 0.85 : 0.3);
    s.connect(filter).connect(g).connect(this.output);
    s.start();
    // Sub-bass impact, electrical snap, and a short metallic tail.
    this.tone(local ? 145 : 100, 0.38, 'sine', local ? 0.7 : 0.23);
    this.tone(2100, 0.095, 'sawtooth', local ? 0.15 : 0.045);
    this.tone(580, 0.24, 'triangle', local ? 0.13 : 0.04);
  }
  hit() {
    this.tone(880, 0.09, 'sine', 0.23);
    setTimeout(() => this.tone(1320, 0.13, 'sine', 0.15), 65);
  }
  reload(duration = 1.1) {
    if (!this.ctx) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    const start = c.currentTime + 0.14,
      end = c.currentTime + duration;
    o.type = 'sine';
    o.frequency.setValueAtTime(180, start);
    o.frequency.exponentialRampToValueAtTime(1250, end);
    g.gain.setValueAtTime(0.001, start);
    g.gain.linearRampToValueAtTime(this.volume * 0.07, end - 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, end);
    o.connect(g).connect(this.output);
    o.start(start);
    o.stop(end);
  }
}
