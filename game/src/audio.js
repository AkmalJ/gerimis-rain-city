// GERIMIS — procedural WebAudio: rain hiss, thunder, shots, engine, UI.
// One job: every sound the game makes, synthesized — no audio files.

export class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.rainGain = null;
    this.engineOsc = null; this.engineGain = null; this.started = false;
  }

  init() {
    if (this.started) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.5;
      this.master.connect(ctx.destination);
      this.startRain();
      this.startEngine();
      this.started = true;
    } catch (e) { /* audio is garnish; the game runs silent without it */ }
  }

  noiseBuffer(seconds) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  startRain() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(2); src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 2600; filt.Q.value = 0.4;
    const g = ctx.createGain(); g.gain.value = 0.055;
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start();
    this.rainGain = g;
  }

  startEngine() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 40;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 220;
    const g = ctx.createGain(); g.gain.value = 0;
    osc.connect(filt); filt.connect(g); g.connect(this.master);
    osc.start();
    this.engineOsc = osc; this.engineGain = g;
  }

  setEngine(speedRatio, driving) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const f = 42 + Math.abs(speedRatio) * 130;
    this.engineOsc.frequency.setTargetAtTime(f, t, 0.08);
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + Math.abs(speedRatio) * 0.05 : 0, t, 0.1);
  }

  blip(freq, dur, gain, type = 'square', slideTo = null) {
    if (!this.started) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  shot(kind) {
    if (!this.started) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer(0.12);
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass';
    filt.frequency.value = kind === 'laras' ? 900 : 2400;
    const g = ctx.createGain();
    const peak = kind === 'laras' ? 0.5 : kind === 'smg' ? 0.22 : 0.32;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'laras' ? 0.22 : 0.11));
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t);
    if (kind === 'laras') this.blip(90, 0.18, 0.3, 'sine', 40);
  }

  thunder() {
    if (!this.started) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer(1.6);
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 160;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t);
  }

  pickup() { this.blip(880, 0.12, 0.16, 'sine'); setTimeout(() => this.blip(1320, 0.16, 0.16, 'sine'), 70); }
  sting() { this.blip(523, 0.14, 0.14, 'triangle'); setTimeout(() => this.blip(784, 0.2, 0.14, 'triangle'), 110); }
  click() { this.blip(660, 0.05, 0.1, 'square'); }
  sirenBlip() { this.blip(740, 0.16, 0.05, 'triangle', 980); }
}
