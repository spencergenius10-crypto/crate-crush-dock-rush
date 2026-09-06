/* Phase_Smash (SCR_Smash) — tap/hold to smash stacked crates; each break releases cargo. */
window.CC = window.CC || {};

CC.PhaseSmash = class {
  constructor(run) { this.run = run; this.g = run.g; this.crates = []; this.buildCrates(); }

  buildCrates() {
    const lv = this.run.lv, R = CC.CONFIG.CRATES;
    const n = lv.crates, cols = 4, rows = Math.ceil(n / cols);
    const gap = 10;
    const size = Math.min(100, (R.w - gap * (cols - 1)) / cols, (R.h - gap * (rows - 1)) / rows);
    const totalW = cols * size + (cols - 1) * gap, x0 = R.x + (R.w - totalW) / 2;
    const y0 = R.y + R.h - rows * (size + gap) + gap; // stack from the floor line up
    // balanced cargo distribution across the level's types
    const bag = [];
    for (let i = 0; i < n * lv.cargoPerCrate; i++) bag.push(lv.types[i % lv.types.length]);
    CC.U.shuffle(bag);
    this.crates = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const metal = Math.random() < lv.metalPct;
      this.crates.push({
        x: x0 + c * (size + gap), y: y0 + (rows - 1 - r) * (size + gap), w: size, h: size,
        type: metal ? 'metal' : 'wood', hp: metal ? 3 : 2, maxHp: metal ? 3 : 2,
        alive: true, wob: 0, cargo: bag.splice(0, lv.cargoPerCrate),
      });
    }
  }

  enter() {
    this.holdT = 0; this.combo = 0; this.lastBreakT = -10; this.t = 0; this.doneT = null;
    this.pops = []; // released cargo flying to the pile
  }

  get dmg() { return 1 + 0.35 * (this.g.p.upg_smash - 1); }
  get holdRate() { return Math.max(0.12, 0.3 - 0.02 * (this.g.p.upg_smash - 1)); }

  crateAt(x, y) { return this.crates.find((c) => c.alive && CC.U.inRect(x, y, c)) || null; }

  hitAt(x, y) {
    const c = this.crateAt(x, y);
    if (!c) return false;
    this.hit(c, x, y);
    return true;
  }

  hit(c, x, y) {
    const C = CC.CONFIG.COLORS;
    c.hp -= this.dmg;
    c.wob = 1;
    this.g.audio.thud();
    if (c.hp > 0) {
      this.g.fx.smashBurst(x, y, C.Accent_Smash, false);
      this.g.fx.debris(c.x, c.y, c.w, c.h, c.type === 'metal' ? [C.Metal, C.MetalDark] : [C.Wood, C.WoodDark, C.WoodLight], 3);
      return;
    }
    // ---- break ----
    c.alive = false;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    this.combo = this.t - this.lastBreakT < 1.0 ? this.combo + 1 : 1;
    this.lastBreakT = this.t;
    this.run.stats.smashed++;
    this.g.p.stats.crates_smashed++;
    this.g.audio.crack();
    this.g.fx.smashBurst(cx, cy, this.g.p.cosmetics.smash_fx_spark ? '#ffe08a' : C.Accent_Smash, true);
    this.g.fx.debris(c.x, c.y, c.w, c.h, c.type === 'metal' ? [C.Metal, C.MetalDark, '#c9d0da'] : [C.Wood, C.WoodDark, C.WoodLight], 6);
    if (this.combo >= 2) this.g.fx.floatText(cx, cy - 40, `×${this.combo}`, C.Accent_Smash, 30, { punch: 1 });
    this.g.tlm.smash({ level_id: this.run.levelId, crate_type: c.type, combo: this.combo, score_delta: 10 * this.combo, x_lane: null });
    this.g.sessionHints.smash = true;
    this.run.ftueDone('smash');
    // release cargo → pile (queue)
    c.cargo.forEach((type, i) => {
      this.g.p.cargoSeen[type.id] = true;
      this.pops.push({ type, x: cx + (i - 0.5) * 20, y: cy, vx: CC.U.rand(-60, 60) + (i - 0.5) * 120, vy: CC.U.rand(-620, -480), t: 0, life: 0.55, tx: 270 + CC.U.rand(-40, 40), ty: 400 });
    });
    if (this.crates.every((k) => !k.alive)) this.doneT = 0.5;
  }

  update(dt) {
    this.t += dt;
    for (const c of this.crates) c.wob = Math.max(0, c.wob - dt * 6);
    // hold = auto-repeat smash on whatever crate is under the finger
    const inp = this.g.input;
    if (inp.down) {
      this.holdT += dt;
      if (this.holdT >= this.holdRate) { this.holdT = 0; this.hitAt(inp.x, inp.y); }
    } else this.holdT = this.holdRate; // first tap hits instantly
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { this.run.cargoQueue.push(p.type); this.pops.splice(i, 1); continue; }
      // arc: physics for first half, ease toward pile after
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += CC.CONFIG.GRAVITY * 0.6 * dt;
      if (k > 0.5) { p.x = CC.U.lerp(p.x, p.tx, (k - 0.5) * 2 * 0.4); p.y = CC.U.lerp(p.y, p.ty, (k - 0.5) * 2 * 0.4); }
    }
    if (this.doneT != null) {
      this.doneT -= dt;
      if (this.doneT <= 0 && this.pops.length === 0) { this.doneT = null; this.run.smashComplete(); }
    }
  }

  onPointer(type, e) {
    if (type === 'down') {
      this.holdT = 0;
      if (!this.hitAt(e.x, e.y)) {
        // tap on empty floor — tiny dust puff only (no uncaused explosion)
        if (e.y > CC.CONFIG.STAGE.top && e.y < CC.CONFIG.LANES.y) this.g.fx.trail(e.x, e.y, 'rgba(255,255,255,0.25)');
      }
    }
  }

  draw(ctx) {
    const C = CC.CONFIG.COLORS;
    for (const c of this.crates) {
      if (!c.alive) continue;
      const wob = c.wob > 0 ? Math.sin(this.t * 60) * 4 * c.wob : 0;
      const sq = c.wob > 0 ? 1 - 0.08 * c.wob : 1;
      ctx.save();
      ctx.translate(c.x + c.w / 2 + wob, c.y + c.h);
      ctx.scale(1 + (1 - sq) * 0.6, sq);
      ctx.translate(-(c.x + c.w / 2), -(c.y + c.h));
      const id = c.type === 'metal' ? 'CC_DockRush_Crate_Metal_Closed_v1' : c.hp < c.maxHp ? 'CC_DockRush_Crate_Wood_Cracked_v1' : 'CC_DockRush_Crate_Wood_Closed_v1';
      CC.drawAsset(id, ctx, c.x, c.y, c.w, c.h);
      if (c.type === 'metal' && c.hp < c.maxHp) {
        ctx.strokeStyle = C.Outline; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(c.x + c.w * 0.3, c.y + c.h * 0.2); ctx.lineTo(c.x + c.w * 0.55, c.y + c.h * 0.5); ctx.lineTo(c.x + c.w * 0.4, c.y + c.h * 0.85); ctx.stroke();
      }
      ctx.restore();
    }
    // released cargo airborne → pile
    for (const p of this.pops) CC.drawCargo(ctx, p.type, p.x, p.y, 34, 'airborne', { rot: p.t * 6 });
    // pile / queue preview (cargo waiting to be sorted)
    const q = this.run.cargoQueue;
    q.forEach((type, i) => { if (i < 24) CC.drawCargo(ctx, type, 270 + ((i % 8) - 3.5) * 30, 400 - Math.floor(i / 8) * 22, 20, 'idle'); });
    if (q.length) CC.U.text(ctx, `${q.length} cargo`, 270, 440, { size: 12, weight: 800, color: C.Text_Secondary });
  }
};
