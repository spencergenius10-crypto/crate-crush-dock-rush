/* Round events — periodic Sort-phase shifts that change the read of the dock for a few seconds.
 *   rush_hour        a second conveyor belt opens and both feed fast with an outward shove (multi-belt high velocity)
 *   inspection_shift lanes swap positions (rotate one slot) and every cargo/lane colour mutes — shapes only
 * Rare jackpot crates are rolled per dock in Phase_Smash (Smash→Sort→Truck order stays locked); this module only
 * owns the Sort-phase scheduler, the mute-readable warn/active banners and the additive `round_event` telemetry. */
window.CC = window.CC || {};

CC.RoundEvents = class {
  constructor(run) { this.run = run; this.g = run.g; this.reset(); }
  reset() {
    const lv = this.run.lv, ev = lv.events || {};
    this.pool = [];
    if (ev.rush) this.pool.push('rush_hour');
    if (ev.inspection) this.pool.push('inspection_shift');
    this.poolIdx = Math.floor(Math.random() * Math.max(1, this.pool.length)); // random first event, then alternate
    this.active = null;   // { id, t, dur }
    this.warn = null;     // { id, t }
    this.nextT = CC.CONFIG.EVENTS.firstAt;
    this.fired = 0;
    this.enabled = !CC.U.query('noevents');
  }
  get sort() { return this.run.sort; }
  label(id) { return { rush_hour: 'RUSH HOUR', inspection_shift: 'INSPECTION SHIFT' }[id] || id; }
  glyph(id) { return id === 'rush_hour' ? '⇶' : '⇄'; }
  color(id) { return id === 'rush_hour' ? CC.CONFIG.COLORS.Warn : '#a7c4ff'; }

  update(dt) {
    if (!this.enabled || this.run.phaseName !== 'sort' || this.run.overlay || this.sort.paused) return;
    const E = CC.CONFIG.EVENTS;
    if (this.active) {
      this.active.t += dt;
      // ends on its timer, or as soon as the dock is nearly done so the last pieces read clean
      if (this.active.t >= this.active.dur || this.sort.remaining() === 0) this.end();
      return;
    }
    if (this.warn) {
      this.warn.t += dt;
      if (this.warn.t >= E.warn) this.start(this.warn.id);
      return;
    }
    if (!this.pool.length) return;
    this.nextT -= dt;
    if (this.nextT <= 0 && this.sort.remaining() >= E.minRemaining) this.beginWarn(this.pool[this.poolIdx % this.pool.length]);
  }

  beginWarn(id) {
    this.warn = { id, t: 0 };
    this.g.fx.floatText(CC.CONFIG.W / 2, 560, `${this.glyph(id)} ${this.label(id)} INCOMING`, this.color(id), 22, { life: CC.CONFIG.EVENTS.warn, punch: 1, vy: -20 });
    this.g.fx.haptic([12, 40, 12]);
    this.g.audio.roundEvent(id, 'warn'); // Kade audio — two-tick warning
  }
  // dev: skip the timer and warn now
  force(id) { if (this.active) this.end(); this.warn = null; this.nextT = 0; this.beginWarn(id); }

  start(id) {
    const E = CC.CONFIG.EVENTS, run = this.run;
    this.warn = null;
    const dur = id === 'rush_hour' ? E.rush.dur : E.inspection.dur;
    this.active = { id, t: 0, dur };
    this.fired++; run.stats.events++;
    if (id === 'rush_hour') { this.sort.rush = true; this.sort.spawnT = Math.min(this.sort.spawnT, 0.15); }
    else run.setInspection(true);
    this.g.fx.floatText(CC.CONFIG.W / 2, 560, `${this.glyph(id)} ${this.label(id)}!`, this.color(id), 34, { life: 1.0, punch: 1 });
    this.g.fx.doFlash(0.12, this.color(id)); this.g.fx.doShake(3); this.g.fx.haptic([20, 30, 40]);
    for (const l of run.lanes) l.flashT = 0.4;
    this.g.audio.roundEvent(id, 'start'); // Kade audio — event stinger (+ belt hiss on Rush Hour)
    this.g.tlm.roundEvent({ level_id: run.levelId, event_id: id, action: 'start', duration_s: dur, pieces_left: this.sort.remaining() });
    if (CC.dev) CC.dev.refresh();
  }
  end() {
    const a = this.active; if (!a) return;
    this.active = null;
    if (a.id === 'rush_hour') this.sort.rush = false;
    else this.run.setInspection(false);
    this.g.fx.floatText(CC.CONFIG.W / 2, 560, 'SHIFT OVER', CC.CONFIG.COLORS.Text_Secondary, 18, { life: 0.8, vy: -30 });
    this.g.audio.roundEvent(a.id, 'end'); // Kade audio — release
    this.g.tlm.roundEvent({ level_id: this.run.levelId, event_id: a.id, action: 'end', duration_s: Math.round(a.t * 10) / 10, pieces_left: this.sort.remaining() });
    this.poolIdx++;
    this.nextT = CC.U.rand(CC.CONFIG.EVENTS.period[0], CC.CONFIG.EVENTS.period[1]);
    if (CC.dev) CC.dev.refresh();
  }

  // banner: pill with glyph + label + a draining time bar, at the pile/conveyor seam (inside the safe band)
  draw(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W;
    if (this.warn) {
      const k = this.warn.t / CC.CONFIG.EVENTS.warn, on = Math.floor(this.warn.t * 6) % 2 === 0;
      if (on) { ctx.globalAlpha = 0.9; this.pill(ctx, W / 2, 464, `${this.glyph(this.warn.id)} ${this.label(this.warn.id)} IN ${Math.ceil((1 - k) * CC.CONFIG.EVENTS.warn)}`, this.color(this.warn.id)); ctx.globalAlpha = 1; }
      return;
    }
    const a = this.active; if (!a) return;
    const col = this.color(a.id), k = 1 - a.t / a.dur;
    const w = this.pill(ctx, W / 2, 464, `${this.glyph(a.id)} ${this.label(a.id)}${a.id === 'rush_hour' ? ' · 2 BELTS' : ' · SHAPES ONLY'}`, col);
    CC.U.fillRRect(ctx, W / 2 - w / 2, 478, w, 5, 2, C.BG_UI);
    CC.U.fillRRect(ctx, W / 2 - w / 2, 478, w * k, 5, 2, col);
    if (a.id === 'inspection_shift') {
      // stamp on each lane plaque so the swap reads without colour
      for (const l of this.run.lanes) { ctx.save(); ctx.translate(l.x + l.w / 2, l.y + l.h * 0.35 - 14); ctx.rotate(-0.18); CC.U.fillRRect(ctx, -34, -9, 68, 18, 4, 'rgba(14,16,20,0.85)'); CC.U.text(ctx, 'INSPECT', 0, 0, { size: 11, weight: 900, color: col }); ctx.restore(); }
    }
  }
  pill(ctx, cx, cy, label, col) {
    ctx.font = '900 14px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 28, h = 26;
    CC.U.fillRRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2, CC.CONFIG.COLORS.BG_UI);
    CC.U.strokeRRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2, col, 2.5);
    CC.U.text(ctx, label, cx, cy + 0.5, { size: 14, weight: 900, color: col });
    return w;
  }
};
