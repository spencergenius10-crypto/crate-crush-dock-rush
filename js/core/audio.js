/* Crate Crush (Dock Rush mode) audio — procedural WebAudio (+ optional web/audio samples). Mute-first.
 * Kade owns this file + web/audio/{sfx,music}/. Gameplay only calls the CC.audio.* hooks below; every
 * hook has a procedural fallback so nothing here blocks on the sample pack landing. */
window.CC = window.CC || {};

CC.Audio = class {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this._combo = 0;
    this._groove = null;
    this._hats = null;
    this._bass = null;
    this._bus = null;
    this._samples = Object.create(null);
    this._base = (typeof document !== 'undefined' && document.baseURI)
      ? new URL('.', document.baseURI).href
      : './';
  }

  setEnabled(on) { this.enabled = !!on; if (on) this.unlock(); }
  unlock() {
    this.enabled = true;
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    // silent unlock blip
    this._tone(40, 0.01, 'sine', 0.0001);
  }

  _ensure() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { this.ctx = null; return; }
    const c = this.ctx;
    this._bus = c.createGain();
    this._bus.gain.value = 0.85;
    // mild highpass for phone speakers
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 90;
    this._bus.connect(hp).connect(c.destination);
    this._loadSamples();
  }

  _url(rel) { return new URL(rel, this._base).href; }

  async _loadSamples() {
    const map = {
      crunch: 'audio/sfx/crunch_wood.wav',
      clack: 'audio/sfx/clack_bin.wav',
      whoosh: 'audio/sfx/whoosh_pneumatic.wav',
      chime: 'audio/sfx/chime_combo.wav',
      error: 'audio/sfx/error_thud.wav',
      groove: 'audio/music/groove_loop.ogg',
      // Kade audio — v3 depth slots (all optional; procedural fallback below)
      fracture_metal: 'audio/sfx/fracture_metal.wav',
      fracture_glass: 'audio/sfx/fracture_glass.wav',
      fracture_steel: 'audio/sfx/fracture_steel.wav',
      pneumatic_snap: 'audio/sfx/pneumatic_snap.wav',
      heave: 'audio/sfx/steel_heave.wav',
      event_rush: 'audio/sfx/event_rush_hour.wav',
      event_inspection: 'audio/sfx/event_inspection.wav',
      event_jackpot: 'audio/sfx/event_jackpot.wav',
    };
    for (const [k, path] of Object.entries(map)) {
      try {
        const res = await fetch(this._url(path));
        if (!res.ok) continue;
        const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this._samples[k] = buf;
      } catch (_) { /* procedural fallback */ }
    }
  }

  _playBuf(name, opts) {
    if (!this.enabled) return false;
    this._ensure(); if (!this.ctx || !this._samples[name]) return false;
    const s = this.ctx.createBufferSource();
    s.buffer = this._samples[name];
    if (opts && opts.rate) s.playbackRate.value = opts.rate;
    const g = this.ctx.createGain();
    g.gain.value = (opts && opts.gain != null) ? opts.gain : 0.5;
    s.connect(g).connect(this._bus);
    s.start();
    return true;
  }

  _tone(freq, dur, type, gain, slide) {
    if (!this.enabled) return; this._ensure(); if (!this.ctx) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), c.currentTime + dur);
    g.gain.setValueAtTime(gain || 0.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(this._bus); o.start(); o.stop(c.currentTime + dur);
  }

  _noise(dur, gain, lp) {
    if (!this.enabled) return; this._ensure(); if (!this.ctx) return;
    const c = this.ctx, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp || 1800;
    const g = c.createGain(); g.gain.value = gain || 0.2;
    s.connect(f).connect(g).connect(this._bus); s.start();
  }

  // --- v1 ---
  thud() { this.smash('wood', false); }
  crack() { this.smash('wood', true); }
  whoosh() {
    if (this._playBuf('whoosh', { gain: 0.35 })) return;
    this._noise(0.18, 0.1, 3200);
    this._tone(180, 0.16, 'triangle', 0.06, 60);
  }
  pop() { this._tone(520, 0.09, 'sine', 0.1, 900); }
  splat() { this._tone(200, 0.22, 'sawtooth', 0.08, 70); this._noise(0.16, 0.1, 700); }
  sting() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'triangle', 0.12), i * 70)); }
  coin() { this._tone(1200, 0.08, 'square', 0.05, 1800); }
  fail() { this.error('wrong_lane'); }

  // --- Remy gameplay hooks ---
  smash(kind, big) {
    if (this._playBuf('crunch', { gain: big ? 0.55 : 0.35, rate: kind === 'ice' ? 1.25 : kind === 'metal' ? 0.85 : 1 })) {
      if (big) this._noise(0.08, 0.12, 2400);
      return;
    }
    // wood-crunch procedural
    const bright = kind === 'ice' ? 2800 : kind === 'metal' ? 1600 : 2200;
    this._noise(big ? 0.18 : 0.1, big ? 0.28 : 0.16, bright);
    this._tone(kind === 'metal' ? 140 : 95, big ? 0.22 : 0.12, 'triangle', big ? 0.16 : 0.1, 40);
  }

  snap(perfect) {
    if (this._playBuf('clack', { gain: perfect ? 0.45 : 0.3, rate: perfect ? 1.08 : 1 })) return;
    this._tone(perfect ? 880 : 640, 0.05, 'square', 0.08, perfect ? 1400 : 900);
    this._noise(0.03, 0.08, 3500);
  }

  clack() { this.snap(false); }
  crunch() { this.smash('wood', true); }

  chime(tier) {
    const t = Math.max(0, tier | 0);
    const base = 520 + Math.min(t, 12) * 55;
    if (this._playBuf('chime', { gain: 0.25, rate: 1 + Math.min(t, 8) * 0.04 })) return;
    this._tone(base, 0.12, 'sine', 0.1, base * 1.6);
    if (t >= 2) setTimeout(() => this._tone(base * 1.25, 0.1, 'triangle', 0.07), 40);
    if (t >= 5) setTimeout(() => this._tone(base * 1.5, 0.1, 'sine', 0.06), 80);
  }

  error(kind) {
    if (this._playBuf('error', { gain: 0.3 })) return;
    // crisp non-abrasive thud
    this._tone(160, 0.14, 'sine', 0.12, 70);
    this._noise(0.07, 0.12, kind === 'spill' ? 900 : 1400);
  }
  errorThud() { this.error('wrong_lane'); }

  fever(tier) {
    if (tier <= 0) { this.setCombo(0); return; }
    this.chime(tier + 2);
    this.setCombo(tier === 1 ? 2 : tier === 2 ? 4 : 7);
    if (!this._groove) this.grooveStart();
  }

  setCombo(n) {
    this._combo = Math.max(0, n | 0);
    this._syncGrooveLayers();
  }

  // --- v3 depth hooks (Kade audio) — every call site is marked `// Kade audio`; stubs OK until the pack lands ---

  // Material fracture. material: wood | metal | steel | glass | ice · big = the crate/piece actually broke.
  // Distinct from smash(): steel is a heavy clang-drop, glass is a bright shatter, jackpot rides on `metal` + sting.
  fracture(material, big) {
    if (material === 'glass') {
      if (this._playBuf('fracture_glass', { gain: 0.45 })) return;
      this._noise(0.22, 0.2, 5200);
      [2400, 3100, 4200].forEach((f, i) => setTimeout(() => this._tone(f, 0.08, 'sine', 0.05, f * 0.7), i * 25));
      return;
    }
    if (material === 'steel') {
      if (this._playBuf('fracture_steel', { gain: big ? 0.6 : 0.35 })) return;
      this._tone(70, big ? 0.36 : 0.16, 'triangle', big ? 0.22 : 0.1, 32);
      this._noise(big ? 0.2 : 0.06, big ? 0.24 : 0.1, 900);
      if (big) setTimeout(() => this._tone(420, 0.2, 'square', 0.05, 180), 30);
      return;
    }
    if (material === 'metal') {
      if (this._playBuf('fracture_metal', { gain: big ? 0.55 : 0.35 })) return;
    }
    this.smash(material, big);
  }

  // Pneumatic snap — magnet snapping cargo onto a lane mouth, belt hiss on Rush Hour start, lane latch.
  // kind: snap | hiss | release
  pneumatic(kind) {
    if (this._playBuf('pneumatic_snap', { gain: 0.4, rate: kind === 'hiss' ? 0.8 : 1 })) return;
    if (kind === 'hiss') { this._noise(0.35, 0.09, 2600); return; }
    if (kind === 'release') { this._noise(0.12, 0.08, 1800); this._tone(260, 0.1, 'triangle', 0.05, 120); return; }
    this._noise(0.05, 0.14, 4200);
    this._tone(980, 0.06, 'square', 0.07, 1500);
  }

  // Streak pitch — a short tick whose pitch climbs with the live streak (every clean sort; not the step chime).
  streakPitch(streak) {
    const s = Math.max(0, Math.min(24, streak | 0));
    const f = 440 * Math.pow(2, s / 12); // one semitone per sort, two octaves cap
    this._tone(f, 0.05, 'sine', 0.045, f * 1.2);
  }

  // Groove intensity 0..1 — continuous (fever value + round event), throttled by the caller (~4 Hz).
  // Sample loop: scales the bed gain. Procedural: maps to the combo layer ladder.
  grooveIntensity(k) {
    k = Math.max(0, Math.min(1, +k || 0));
    this._intensity = k;
    if (k > 0.05 && !this._groove) this.grooveStart();
    if (this._groove && this._groove.sample) { try { this._groove.master.gain.value = 0.08 + 0.2 * k; } catch (_) {} }
    if (this._groove && !this._groove.sample) this._combo = Math.round(k * 7);
  }

  // Round events. id: rush_hour | inspection_shift | jackpot · phase: warn | start | end
  roundEvent(id, phase) {
    const buf = { rush_hour: 'event_rush', inspection_shift: 'event_inspection', jackpot: 'event_jackpot' }[id];
    if (phase === 'warn') { this._tone(660, 0.09, 'square', 0.06, 700); setTimeout(() => this._tone(660, 0.09, 'square', 0.06, 700), 140); return; }
    if (phase === 'end') { this.pneumatic('release'); return; }
    if (buf && this._playBuf(buf, { gain: 0.5 })) return;
    if (id === 'rush_hour') { this.pneumatic('hiss'); [330, 440, 550].forEach((f, i) => setTimeout(() => this._tone(f, 0.12, 'triangle', 0.08), i * 60)); return; }
    if (id === 'inspection_shift') { [520, 390].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'sine', 0.09, f * 0.9), i * 160)); return; }
    if (id === 'jackpot') { this.sting(); setTimeout(() => this.coin(), 120); setTimeout(() => this.coin(), 240); return; }
  }

  // Weighted steel mash tick — k = lift meter 0..1 (pitch climbs as it rises); k < 0 = it settled back down (thud).
  heave(k) {
    if (k < 0) { this._tone(60, 0.14, 'sine', 0.1, 40); return; }
    if (this._playBuf('heave', { gain: 0.3, rate: 0.9 + k * 0.5 })) return;
    this._tone(110 + k * 160, 0.05, 'triangle', 0.08, 90);
    this._noise(0.03, 0.06, 1400);
  }

  grooveStart() {
    if (!this.enabled) return;
    this._ensure(); if (!this.ctx || this._groove) return;
    if (this._playBufLoop('groove', 0.18)) return;
    // procedural lo-fi industrial: soft kick pulse + noise bed
    const c = this.ctx;
    const master = c.createGain(); master.gain.value = 0.12; master.connect(this._bus);
    this._groove = { master, nodes: [], timer: null };
    const pulse = () => {
      if (!this._groove) return;
      this._tone(55, 0.08, 'sine', 0.09, 40);
      this._noise(0.04, 0.04, 600);
      this._syncGrooveLayers();
      this._groove.timer = setTimeout(pulse, 480);
    };
    pulse();
  }

  _playBufLoop(name, gain) {
    if (!this.ctx || !this._samples[name]) return false;
    const s = this.ctx.createBufferSource();
    s.buffer = this._samples[name]; s.loop = true;
    const g = this.ctx.createGain(); g.gain.value = gain;
    s.connect(g).connect(this._bus); s.start();
    this._groove = { master: g, nodes: [s], timer: null, sample: true };
    return true;
  }

  grooveStop() {
    if (!this._groove) return;
    if (this._groove.timer) clearTimeout(this._groove.timer);
    for (const n of this._groove.nodes || []) { try { n.stop(); } catch (_) {} }
    this._groove = null;
    this._hats = null; this._bass = null;
  }

  _syncGrooveLayers() {
    if (!this._groove || this._groove.sample) return;
    // hats when combo≥1, bass≥3 — fire one-shots on pulse via setCombo state
    if (this._combo >= 1) this._noise(0.02, 0.05, 6000);
    if (this._combo >= 3) this._tone(90, 0.06, 'triangle', 0.07, 50);
    if (this._combo >= 6) this._tone(1200, 0.03, 'sine', 0.04, 1800);
  }
};
