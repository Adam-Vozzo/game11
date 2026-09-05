export class Audio {
  constructor() {
    this.volume = 0.5;
    this.ctx = null;
  }
  unlock() {
    this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
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
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration);
  }
  shot(local = true) {
    if (!this.ctx) return;
    const c = this.ctx,
      length = 0.3,
      buffer = c.createBuffer(1, c.sampleRate * length, c.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    const s = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = local ? 2200 : 900;
    g.gain.value = this.volume * (local ? 0.65 : 0.25);
    s.connect(filter).connect(g).connect(c.destination);
    s.start();
    this.tone(local ? 110 : 75, 0.25, 'triangle', local ? 0.6 : 0.2);
  }
  hit() {
    this.tone(880, 0.09, 'sine', 0.23);
    setTimeout(() => this.tone(1320, 0.13, 'sine', 0.15), 65);
  }
  reload() {
    this.tone(250, 0.06, 'square', 0.035);
    setTimeout(() => this.tone(380, 0.06, 'square', 0.035), 480);
  }
}
