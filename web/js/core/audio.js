/* Synth SFX (WebAudio). Default OFF — capture preset is mute-first; FX carry the feel. */
window.CC = window.CC || {};

CC.Audio = class {
  constructor() { this.enabled = false; this.ctx = null; }
  setEnabled(on) { this.enabled = !!on; if (on) this._ensure(); }
  _ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { this.ctx = null; }
  }
  _tone(freq, dur, type, gain, slide) {
    if (!this.enabled) return; this._ensure(); if (!this.ctx) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), c.currentTime + dur);
    g.gain.setValueAtTime(gain || 0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  }
  _noise(dur, gain, lp) {
    if (!this.enabled) return; this._ensure(); if (!this.ctx) return;
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp || 1200;
    const g = c.createGain(); g.gain.value = gain || 0.25;
    s.connect(f).connect(g).connect(c.destination); s.start();
  }
  thud() { this._tone(120, 0.12, 'square', 0.15, 50); this._noise(0.08, 0.2, 900); }
  crack() { this._noise(0.16, 0.35, 2200); this._tone(90, 0.2, 'triangle', 0.2, 35); }
  whoosh() { this._noise(0.14, 0.08, 3000); }
  pop() { this._tone(520, 0.09, 'sine', 0.12, 900); }
  splat() { this._tone(200, 0.25, 'sawtooth', 0.12, 60); this._noise(0.2, 0.15, 600); }
  sting() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.25, 'triangle', 0.16), i * 70)); }
  coin() { this._tone(1200, 0.08, 'square', 0.06, 1800); }
  fail() { this._tone(220, 0.4, 'sawtooth', 0.12, 80); }
};
