// GERIMIS — procedural sound, 100% synthesized with WebAudio.
//
// There are no audio files in this game. Rain is looped filtered noise,
// the engine is a detuned sawtooth behind a lowpass, gunshots are short
// noise bursts, thunder is a slow lowpassed rumble, and every UI cue is
// a small oscillator blip. Audio is garnish: if the browser refuses an
// AudioContext the game simply runs silent (see the try/catch in init).

export class AudioSys {
  constructor() {
    this.ctx = null;      // AudioContext, created lazily on first init()
    this.master = null;   // master gain -> destination
    this.rainGain = null; // gain node of the rain loop (kept for ducking)
    this.engineOsc = null;
    this.engineGain = null;
    this.started = false; // true once the graph is live
  }

  // Build the graph once: rain loop + engine voice under a master gain.
  init() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this._rainLoop();
      this._engineVoice();
      this.started = true;
    } catch (err) { /* no audio hardware / blocked context: stay silent */ }
  }

  // Fresh white-noise buffer of the given length, in seconds.
  _noise(seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Rain: endless band-passed hiss, centre 2600 Hz, very low in the mix.
  _rainLoop() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noise(2);
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = 2600; band.Q.value = 0.4;
    const g = ctx.createGain(); g.gain.value = 0.055;
    src.connect(band); band.connect(g); g.connect(this.master);
    src.start();
    this.rainGain = g;
  }

  // Engine: a sawtooth idling at 40 Hz behind a 220 Hz lowpass; the
  // playback side only ever moves its frequency and gain (setEngine).
  _engineVoice() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth'; osc.frequency.value = 40;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = 220;
    const g = ctx.createGain(); g.gain.value = 0;
    osc.connect(low); low.connect(g); g.connect(this.master);
    osc.start();
    this.engineOsc = osc; this.engineGain = g;
  }

  // speedRatio is -1..1 of the car's top speed; driving=false mutes.
  setEngine(speedRatio, driving) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const mag = Math.abs(speedRatio);
    this.engineOsc.frequency.setTargetAtTime(42 + mag * 130, t, 0.08);
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + mag * 0.05 : 0, t, 0.1);
  }

  // One oscillator blip with an exponential decay; slideTo bends pitch.
  blip(freq, dur, gain, type = 'square', slideTo = null) {
    if (!this.started) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // Shared shape for the percussive sounds: one noise buffer pushed
  // through a lowpass with a peak-then-vanish gain envelope.
  _noiseHit(bufferSecs, cutoff, peak, decaySecs) {
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noise(bufferSecs);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decaySecs);
    src.connect(low); low.connect(g); g.connect(this.master);
    src.start(t);
    return t;
  }

  // Gunshot voice per weapon class; the 12G also gets a sub thump.
  shot(kind) {
    if (!this.started) return;
    const heavy = kind === 'laras';
    const peak = heavy ? 0.5 : kind === 'smg' ? 0.22 : 0.32;
    this._noiseHit(0.12, heavy ? 900 : 2400, peak, heavy ? 0.22 : 0.11);
    if (heavy) this.blip(90, 0.18, 0.3, 'sine', 40);
  }

  // Thunder: the envelope swells in over 90 ms instead of cracking.
  thunder() {
    if (!this.started) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noise(1.6);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = 160;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    src.connect(low); low.connect(g); g.connect(this.master);
    src.start(t);
  }

  // -- UI / event cues -------------------------------------------------
  pickup() { this.blip(880, 0.12, 0.16, 'sine'); setTimeout(() => this.blip(1320, 0.16, 0.16, 'sine'), 70); }
  sting() { this.blip(523, 0.14, 0.14, 'triangle'); setTimeout(() => this.blip(784, 0.2, 0.14, 'triangle'), 110); }
  click() { this.blip(660, 0.05, 0.1, 'square'); }
  sirenBlip() { this.blip(740, 0.16, 0.05, 'triangle', 980); }
}
