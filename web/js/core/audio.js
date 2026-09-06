/* Sonic — procedural WebAudio SFX + a lo-fi/industrial groove that layers hats/bass with fever.
 * Zero binary assets by default; real WAV/OGG drop-ins are picked up by name from CC.CONFIG.AUDIO_SAMPLES
 * (see web/audio/README.md). Mute-friendly: the game reads fully with audio off; the context unlocks on the
 * first tap only (Game.pointer → unlock()) and never gates gameplay.
 *
 * Phone-speaker friendly: master high-pass at 70 Hz, bass carries an octave-up partial, soft clip before a
 * compressor — nothing lives only in the sub band. */
window.CC = window.CC || {};

CC.Audio = class {
  constructor() {
    this.enabled = false; this.ctx = null; this.unlocked = false;
    this.samples = {}; this.samplesLoading = false;
    this.music = null; this.musicTimer = null;
    this.intensity = 0.1; // 0..1 → hat density / bass drive / ghost notes (set every frame by Game)
  }

  // ---------- lifecycle ----------
  setEnabled(on) {
    this.enabled = !!on;
    if (!this.enabled) { this.stopMusic(); if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); return; }
    this._ensure();
    if (this.unlocked) this.resume();
  }
  // Called from the first pointerdown: creating/resuming inside a user gesture is what satisfies autoplay policy.
  unlock() {
    if (this.unlocked && this.ctx && this.ctx.state === 'running') return;
    this.unlocked = true;
    if (!this.enabled) return;
    this._ensure();
    this.resume();
  }
  resume() {
    if (!this.enabled || !this.ctx) return;
    const go = () => { this._loadSamples(); this.startMusic(); };
    if (this.ctx.state !== 'running') this.ctx.resume().then(go).catch(() => {}); else go();
  }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }

  _ensure() {
    if (this.ctx) return true;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); } catch (_) { this.ctx = null; return false; }
    const c = this.ctx;
    // master: buses → soft comp → high-pass (kill sub mud on phone speakers) → out
    this.master = c.createGain(); this.master.gain.value = 0.85;
    // limiter-ish: stacked smash + groove hits must never crack a phone speaker
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -12; this.comp.knee.value = 8; this.comp.ratio.value = 12; this.comp.attack.value = 0.003; this.comp.release.value = 0.14;
    this.hp = c.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 70;
    this.master.connect(this.comp).connect(this.hp).connect(c.destination);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.34;
    // lo-fi tilt: roll the top off the groove so SFX sit in front of it
    this.musicLp = c.createBiquadFilter(); this.musicLp.type = 'lowpass'; this.musicLp.frequency.value = 5200; this.musicLp.Q.value = 0.5;
    this.musicBus.connect(this.musicLp).connect(this.master);
    // one shared 2 s noise buffer; every noise hit reads a random slice of it
    const n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // soft-clip curve shared by every per-voice clipper (bass / thumps / kick)
    this.clipCurve = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = (i / 255.5) - 1; this.clipCurve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
    return true;
  }
  _clip() { const w = this.ctx.createWaveShaper(); w.curve = this.clipCurve; return w; }
  _ok() { return this.enabled && this.ctx && this.ctx.state === 'running'; }
  get now() { return this.ctx.currentTime; }

  // ---------- drop-in samples (optional) ----------
  _loadSamples() {
    const list = CC.CONFIG.AUDIO_SAMPLES || {};
    if (this.samplesLoading || !Object.keys(list).length) return;
    this.samplesLoading = true;
    for (const [name, url] of Object.entries(list)) {
      fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((ab) => this.ctx.decodeAudioData(ab))
        .then((buf) => { this.samples[name] = buf; if (name.startsWith('music_')) this._restartMusicIfStems(); })
        .catch(() => { /* missing sample → procedural fallback stays */ });
    }
  }
  _sample(name, gain, rate, dest) {
    const buf = this.samples[name]; if (!buf) return false;
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; s.playbackRate.value = rate || 1; g.gain.value = gain == null ? 1 : gain;
    s.connect(g).connect(dest || this.sfxBus); s.start(); return true;
  }

  // ---------- primitives ----------
  _env(g, t, peak, a, d, dest) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    g.connect(dest || this.sfxBus);
  }
  _tone(freq, dur, type, gain, slide, t, dest) {
    if (!this._ok()) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); t = t == null ? this.now : t;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    this._env(g, t, gain || 0.2, 0.004, dur, dest);
    o.connect(g); o.start(t); o.stop(t + dur + 0.02);
  }
  _noise(dur, gain, filt, t, dest, q) {
    // filt: {type, f0, f1?} — bandpass/highpass/lowpass with optional sweep
    if (!this._ok()) return;
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); t = t == null ? this.now : t;
    s.buffer = this.noiseBuf; s.loop = true; s.loopStart = Math.random() * 1.5; s.loopEnd = s.loopStart + 0.5;
    f.type = (filt && filt.type) || 'lowpass'; f.frequency.setValueAtTime((filt && filt.f0) || 1200, t); f.Q.value = q || 0.9;
    if (filt && filt.f1) f.frequency.exponentialRampToValueAtTime(filt.f1, t + dur);
    this._env(g, t, gain || 0.25, 0.003, dur, dest);
    s.connect(f).connect(g); s.start(t, s.loopStart); s.stop(t + dur + 0.02);
  }
  _thump(f0, f1, dur, gain, t) {
    // body hit: sine drop through the soft clipper so it keeps harmonics on a phone speaker
    if (!this._ok()) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), pre = c.createGain(); t = t == null ? this.now : t;
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    pre.gain.value = 1.6; this._env(g, t, gain, 0.003, dur);
    o.connect(pre).connect(this._clip()).connect(g); o.start(t); o.stop(t + dur + 0.02);
  }

  // ---------- SFX (hook points; every one checks for a drop-in sample first) ----------
  smash(kind, big) {
    if (!this._ok()) return;
    if (this._sample(`smash_${kind}${big ? '_big' : ''}`)) return;
    const t = this.now;
    if (kind === 'ice') {
      // glassy: high bandpassed noise + descending chirps; shatter = burst of chirps
      this._noise(big ? 0.3 : 0.12, big ? 0.32 : 0.16, { type: 'bandpass', f0: 5200, f1: 2600 }, t, null, 3.5);
      const n = big ? 5 : 1;
      for (let i = 0; i < n; i++) this._tone(CC.U.rand(2200, 3400), 0.09, 'sine', 0.09, 900, t + i * 0.028);
      if (big) this._thump(220, 90, 0.14, 0.35, t);
      return;
    }
    if (kind === 'metal') {
      this._thump(170, 60, 0.13, big ? 0.7 : 0.45, t);
      this._noise(big ? 0.22 : 0.09, big ? 0.3 : 0.18, { type: 'bandpass', f0: 3600, f1: 2200 }, t, null, 1.4);
      // metallic ring: two inharmonic partials
      this._tone(623, big ? 0.32 : 0.16, 'square', 0.05, 590, t);
      this._tone(937, big ? 0.28 : 0.12, 'triangle', 0.06, 900, t + 0.005);
      return;
    }
    // wood: low thump + splintery crunch (a cluster of short bandpassed bursts) — bigger when the crate breaks
    this._thump(150, 55, big ? 0.16 : 0.11, big ? 0.75 : 0.5, t);
    const bursts = big ? 7 : 3;
    for (let i = 0; i < bursts; i++) {
      const tt = t + i * (big ? 0.022 : 0.018) + Math.random() * 0.006;
      this._noise(big ? 0.09 : 0.05, (big ? 0.26 : 0.18) * (1 - i / (bursts + 2)), { type: 'bandpass', f0: CC.U.rand(700, 1900), f1: CC.U.rand(400, 900) }, tt, null, 1.1);
    }
    if (big) this._noise(0.28, 0.14, { type: 'lowpass', f0: 1400, f1: 300 }, t + 0.03);
  }
  snap(perfect) {
    if (!this._ok()) return;
    if (this._sample(perfect ? 'snap_perfect' : 'snap')) return;
    const t = this.now;
    // bin clack: tight bandpassed knock + short click tone
    this._noise(0.05, 0.3, { type: 'bandpass', f0: 1900, f1: 1200 }, t, null, 4);
    this._tone(900, 0.06, 'square', 0.08, 480, t);
    this._thump(260, 120, 0.07, 0.3, t);
    if (perfect) { this._tone(1760, 0.16, 'sine', 0.11, null, t + 0.02); this._tone(3520, 0.12, 'sine', 0.05, null, t + 0.03); }
  }
  whoosh() {
    if (!this._ok()) return;
    if (this._sample('whoosh')) return;
    this._noise(0.24, 0.13, { type: 'bandpass', f0: 380, f1: 2600 }, this.now, null, 0.7);
  }
  chime(tier) {
    if (!this._ok()) return;
    if (this._sample(`chime_${Math.min(tier, 5)}`)) return;
    // escalating combo chimes: pentatonic run that gets longer + brighter with the streak step
    const scale = [523.25, 659.25, 783.99, 880, 1046.5, 1318.5, 1568, 1760];
    const t = this.now, n = Math.min(2 + tier, 6), base = Math.min(tier, 3);
    for (let i = 0; i < n; i++) {
      const f = scale[Math.min(scale.length - 1, base + i)];
      this._tone(f, 0.22, 'triangle', tier ? 0.13 : 0.08, null, t + i * 0.055);
      this._tone(f * 2, 0.14, 'sine', tier ? 0.04 : 0.02, null, t + i * 0.055);
    }
  }
  error(kind) {
    if (!this._ok()) return;
    if (this._sample(`error_${kind}`) || this._sample('error')) return;
    const t = this.now;
    if (kind === 'ice') { this._tone(3100, 0.07, 'sine', 0.07, 2600, t); this._noise(0.04, 0.08, { type: 'highpass', f0: 4000 }, t); return; } // clink: hit absorbed
    // crisp error thud: fast low drop + dry lowpassed knock; unstable adds a buzz burst
    this._thump(190, 62, 0.17, 0.8, t);
    this._noise(0.1, 0.28, { type: 'lowpass', f0: 900, f1: 300 }, t);
    if (kind === 'unstable') { this._tone(160, 0.22, 'sawtooth', 0.14, 70, t + 0.01); this._noise(0.3, 0.2, { type: 'bandpass', f0: 2400, f1: 500 }, t + 0.02, null, 1.2); }
    else this._tone(240, 0.12, 'square', 0.06, 120, t + 0.02);
  }
  fever(tier) {
    if (!this._ok()) return;
    if (this._sample(`fever_${tier}`)) return;
    const t = this.now;
    if (tier === 0) { this._tone(660, 0.18, 'triangle', 0.06, 330, t); return; } // dropped out: soft fall
    // riser + stacked chord that widens with the tier
    this._noise(0.35, 0.1, { type: 'bandpass', f0: 600, f1: 4000 }, t, null, 1.5);
    const root = [0, 329.6, 392, 493.9][tier];
    [1, 1.5, 2, 2.5, 3].slice(0, 2 + tier).forEach((r, i) => this._tone(root * r, 0.5, i % 2 ? 'sine' : 'triangle', 0.09, null, t + 0.12 + i * 0.04));
  }

  // legacy names still used by UI / truck / results — mapped onto the pack
  thud() { if (!this._ok()) return; if (this._sample('thud')) return; this._thump(200, 90, 0.08, 0.35); this._noise(0.04, 0.12, { type: 'bandpass', f0: 1400 }); }
  crack() { this.smash('wood', true); }
  pop() { if (!this._ok()) return; if (this._sample('ui_tap')) return; this._tone(620, 0.06, 'sine', 0.09, 980); }
  splat() { this.error('spill'); }
  sting() {
    if (!this._ok()) return;
    if (this._sample('truck_clear')) return;
    const t = this.now;
    [523, 659, 784, 1046].forEach((f, i) => { this._tone(f, 0.3, 'triangle', 0.15, null, t + i * 0.07); this._tone(f / 2, 0.3, 'sine', 0.07, null, t + i * 0.07); });
    this._thump(160, 50, 0.3, 0.8, t + 0.28);
    this._noise(0.5, 0.12, { type: 'bandpass', f0: 800, f1: 5000 }, t, null, 0.8);
  }
  coin() { if (!this._ok()) return; if (this._sample('coin')) return; this._tone(1200, 0.08, 'square', 0.05, 1800); this._tone(1800, 0.1, 'sine', 0.05, null, this.now + 0.05); }
  fail() { if (!this._ok()) return; if (this._sample('fail')) return; this._tone(220, 0.45, 'sawtooth', 0.11, 70); this._thump(140, 40, 0.4, 0.6); }

  // ---------- music: lo-fi / industrial groove, 16-step lookahead scheduler ----------
  setIntensity(v) { this.intensity = CC.U.clamp(v, 0, 1); }
  startMusic() {
    if (!this._ok() || this.music) return;
    const c = this.ctx;
    const m = this.music = { step: 0, bar: 0, nextT: c.currentTime + 0.05, bpm: 92, stems: null };
    m.hats = c.createGain(); m.hats.gain.value = 0.5; m.hats.connect(this.musicBus);
    m.bass = c.createGain(); m.bass.gain.value = 0.7; m.bass.connect(this.musicBus);
    m.bassLp = c.createBiquadFilter(); m.bassLp.type = 'lowpass'; m.bassLp.frequency.value = 500; m.bassLp.Q.value = 2.5;
    m.bassDrive = c.createGain(); m.bassDrive.gain.value = 0.9;
    m.bassLp.connect(this._clip()).connect(m.bassDrive).connect(m.bass);
    m.drums = c.createGain(); m.drums.gain.value = 0.9; m.drums.connect(this.musicBus);
    m.keys = c.createGain(); m.keys.gain.value = 0.55; m.keys.connect(this.musicBus);
    if (this.samples.music_base) { this._startStems(m); return; }
    this.musicTimer = setInterval(() => this._schedule(), 80);
  }
  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    const m = this.music; this.music = null;
    if (!m) return;
    if (m.stems) for (const s of m.stems) { try { s.stop(); } catch (_) {} }
    for (const k of ['hats', 'bass', 'drums', 'keys']) { try { m[k].disconnect(); } catch (_) {} }
  }
  // Real stems (web/audio/music/*): music_base loops always; music_hats / music_bass loop in sync and follow intensity.
  _startStems(m) {
    const c = this.ctx, t0 = c.currentTime + 0.05; m.stems = [];
    const loop = (name, dest) => { const b = this.samples[name]; if (!b) return; const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.connect(dest); s.start(t0); m.stems.push(s); };
    loop('music_base', m.drums); loop('music_hats', m.hats); loop('music_bass', m.bass);
    this.musicTimer = setInterval(() => { const v = this.intensity, t = c.currentTime; m.hats.gain.setTargetAtTime(0.15 + 0.85 * v, t, 0.25); m.bass.gain.setTargetAtTime(0.3 + 0.7 * v, t, 0.25); }, 120);
  }
  _restartMusicIfStems() { if (this.music && !this.music.stems && this.samples.music_base) { this.stopMusic(); this.startMusic(); } }

  _schedule() {
    const m = this.music, c = this.ctx; if (!m || !c) return;
    if (c.state !== 'running') return;
    const stepDur = 60 / m.bpm / 4;
    while (m.nextT < c.currentTime + 0.22) {
      // swing: odd 16ths land late
      this._step(m.step, m.bar, m.nextT + (m.step % 2 ? stepDur * 0.14 : 0), m);
      m.step = (m.step + 1) % 16; if (!m.step) m.bar++;
      m.nextT += stepDur;
    }
  }
  _step(s, bar, t, m) {
    const v = this.intensity, c = this.ctx;
    // layer levels follow intensity smoothly
    m.hats.gain.setTargetAtTime(0.35 + 0.65 * v, t, 0.25);
    m.bassLp.frequency.setTargetAtTime(380 + 1300 * v, t, 0.3);
    m.bass.gain.setTargetAtTime(0.5 + 0.5 * v, t, 0.3);
    // kick: 0, 8 always · ghost 10 as it heats · double 6 near peak
    if (s === 0 || s === 8 || (s === 10 && v > 0.35) || (s === 6 && v > 0.75)) this._kick(t, s === 10 || s === 6 ? 0.6 : 1, m.drums);
    // snare/clap: 4, 12 · ghosts 7/15 when hot
    if (s === 4 || s === 12) this._snare(t, 1, m.drums);
    else if ((s === 7 || s === 15) && v > 0.5) this._snare(t, 0.35, m.drums);
    // hats: 8ths always, 16ths once flowing, open hat on 14 at peak
    if (s % 2 === 0) this._hat(t, 0.03, 0.2, m.hats);
    else if (v > 0.3) this._hat(t, 0.025, 0.1 + 0.12 * v, m.hats);
    if (s === 14 && v > 0.6) this._hat(t, 0.14, 0.14, m.hats);
    // bass riff (E minor pentatonic, two-bar phrase)
    const E2 = 82.41, G2 = 98, A2 = 110, B2 = 123.47, D3 = 146.83;
    const riff = bar % 2 ? { 0: E2, 3: E2, 6: G2, 8: E2, 10: B2, 12: A2, 14: G2 } : { 0: E2, 3: E2, 6: G2, 8: E2, 10: A2, 12: E2, 14: D3 };
    if (riff[s] != null) this._bass(riff[s], s === 0 || s === 8 ? 0.34 : 0.22, t, m);
    // industrial clank every other bar
    if (s === 14 && bar % 2 === 1) { this._noise(0.2, 0.09, { type: 'bandpass', f0: 3200, f1: 2400 }, t, m.drums, 6); this._tone(1450, 0.3, 'triangle', 0.04, 1380, t, m.drums); }
    // lo-fi chord stab: Em on 0 (every 2 bars) and 10 (every 4)
    if ((s === 0 && bar % 2 === 0) || (s === 10 && bar % 4 === 2)) this._stab([164.81, 196, 246.94, 329.63], t, m.keys);
  }
  _kick(t, k, dest) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), pre = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    pre.gain.value = 1.4; this._env(g, t, 0.9 * k, 0.002, 0.24, dest);
    o.connect(pre).connect(this._clip()).connect(g); o.start(t); o.stop(t + 0.3);
    this._noise(0.012, 0.18 * k, { type: 'highpass', f0: 2500 }, t, dest);
  }
  _snare(t, k, dest) {
    this._noise(0.13, 0.28 * k, { type: 'bandpass', f0: 1700, f1: 1100 }, t, dest, 0.8);
    this._tone(190, 0.09, 'triangle', 0.18 * k, 150, t, dest);
  }
  _hat(t, dur, gain, dest) { this._noise(dur, gain, { type: 'highpass', f0: 7500 }, t, dest, 1); }
  _bass(freq, gain, t, m) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq; o2.type = 'triangle'; o2.frequency.value = freq * 2; // octave partial carries on phone speakers
    const g2 = c.createGain(); g2.gain.value = 0.45;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); o2.connect(g2).connect(g); g.connect(m.bassLp);
    o.start(t); o2.start(t); o.stop(t + 0.32); o2.stop(t + 0.32);
  }
  _stab(freqs, t, dest) {
    const c = this.ctx, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1600, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    const g = c.createGain(); this._env(g, t, 0.16, 0.01, 0.7, dest); lp.connect(g);
    freqs.forEach((f, i) => { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = i % 2 ? 5 : -5; o.connect(lp); o.start(t); o.stop(t + 0.75); });
  }
};
