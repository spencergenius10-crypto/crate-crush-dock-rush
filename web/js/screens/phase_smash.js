/* Phase_Smash (SCR_Smash) — tap/hold to smash stacked crates; each break releases cargo.
 * Hazard: frozen crates carry an ice shell — two taps inside FROZEN_DOUBLE_TAP_S shatter it, only then does damage land. */
window.CC = window.CC || {};

CC.PhaseSmash = class {
  constructor(run) { this.run = run; this.g = run.g; this.crates = []; this.buildCrates(); }

  buildCrates() {
    const lv = this.run.lv, R = CC.CONFIG.CRATES, hz = lv.hazards || {};
    const n = lv.crates, cols = 4, rows = Math.ceil(n / cols);
    const gap = 10;
    const size = Math.min(100, (R.w - gap * (cols - 1)) / cols, (R.h - gap * (rows - 1)) / rows);
    const totalW = cols * size + (cols - 1) * gap, x0 = R.x + (R.w - totalW) / 2;
    const y0 = R.y + R.h - rows * (size + gap) + gap; // stack from the floor line up
    // balanced cargo distribution across the level's types; each piece carries its own hazard flags
    const bag = [];
    for (let i = 0; i < n * lv.cargoPerCrate; i++) bag.push({ type: lv.types[i % lv.types.length], golden: Math.random() < (hz.goldenPct || 0), timed: Math.random() < (hz.timedPct || 0) });
    CC.U.shuffle(bag);
    this.crates = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const metal = Math.random() < lv.metalPct;
      this.crates.push({
        x: x0 + c * (size + gap), y: y0 + (rows - 1 - r) * (size + gap), w: size, h: size,
        type: metal ? 'metal' : 'wood', hp: metal ? 3 : 2, maxHp: metal ? 3 : 2,
        frozen: Math.random() < (hz.frozenPct || 0), iceTapT: -10, iceCracked: false,
        alive: true, wob: 0, cargo: bag.splice(0, lv.cargoPerCrate),
      });
    }
    this.floorY = R.y + R.h + 6;
  }

  enter() {
    this.holdT = 0; this.combo = 0; this.lastBreakT = -10; this.t = 0; this.doneT = null;
    this.pops = []; // released cargo flying to the pile
  }

  get dmg() { return 1 + 0.35 * (this.g.p.upg_smash - 1); }
  get holdRate() { return Math.max(0.12, 0.3 - 0.02 * (this.g.p.upg_smash - 1)); }

  crateAt(x, y) { return this.crates.find((c) => c.alive && CC.U.inRect(x, y, c)) || null; }

  // fromTap = an explicit pointerdown (hold auto-repeat cannot shatter ice — the rule is a deliberate double tap)
  hitAt(x, y, fromTap) {
    const c = this.crateAt(x, y);
    if (!c) return false;
    if (c.frozen) { this.tapIce(c, x, y, fromTap); return true; }
    this.hit(c, x, y);
    return true;
  }

  tapIce(c, x, y, fromTap) {
    const C = CC.CONFIG.COLORS, hints = this.g.sessionHints;
    c.wob = 0.6;
    if (!fromTap) return;
    const dtTap = this.t - c.iceTapT;
    c.iceTapT = this.t;
    if (c.iceCracked && dtTap <= CC.CONFIG.FROZEN_DOUBLE_TAP_S) {
      // ---- shatter ----
      c.frozen = false; c.iceCracked = false;
      this.g.fx.splinters(c.x, c.y, c.w, c.h, ['#dff4ff', '#a0dcff', '#ffffff'], 12, this.floorY);
      this.g.fx.smashBurst(x, y, '#dff4ff', false);
      this.g.fx.doShake(2.5); this.g.fx.haptic([10, 20, 18]);
      this.g.fx.floatText(c.x + c.w / 2, c.y - 10, 'THAWED', '#dff4ff', 22, { punch: 1 });
      this.g.audio.smash('ice', true); // audio hook: ice shatter
      // the shatter tap also lands as a real hit so the double tap feels like it paid off
      this.hit(c, x, y);
      return;
    }
    c.iceCracked = true;
    this.g.fx.trail(x, y, '#dff4ff');
    this.g.audio.error('ice'); // audio hook: clink — ice absorbed the hit
    if (!hints.frozen) { hints.frozen = true; this.g.fx.floatText(c.x + c.w / 2, c.y - 16, 'DOUBLE-TAP TO THAW', C.Spill, 20, { life: 1.3, punch: 1 }); }
  }

  hit(c, x, y) {
    const C = CC.CONFIG.COLORS, run = this.run;
    c.hp -= this.dmg;
    c.wob = 1;
    const woodCols = [C.Wood, C.WoodDark, C.WoodLight], metalCols = [C.Metal, C.MetalDark, '#c9d0da'];
    if (c.hp > 0) {
      this.g.fx.smashBurst(x, y, C.Accent_Smash, false);
      this.g.fx.splinters(c.x, c.y, c.w, c.h, c.type === 'metal' ? metalCols : woodCols, 4, this.floorY);
      this.g.audio.smash(c.type, false); // audio hook: crate hit
      run.addScore(2); run.addFever(CC.CONFIG.FEVER.gainSmash);
      return;
    }
    // ---- break ----
    c.alive = false;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    this.combo = this.t - this.lastBreakT < 1.0 ? this.combo + 1 : 1;
    this.lastBreakT = this.t;
    run.stats.smashed++;
    this.g.p.stats.crates_smashed++;
    this.g.audio.smash(c.type, true); // audio hook: crate break (wood crunch / metal)
    this.g.fx.smashBurst(cx, cy, this.g.p.cosmetics.smash_fx_spark ? '#ffe08a' : C.Accent_Smash, true);
    // splinters are the read: long shards that spin out and skid on the dock floor (chips fill the middle)
    this.g.fx.splinters(c.x, c.y, c.w, c.h, c.type === 'metal' ? metalCols : woodCols, c.type === 'metal' ? 8 : 12, this.floorY);
    this.g.fx.debris(c.x, c.y, c.w, c.h, c.type === 'metal' ? metalCols : woodCols, 4);
    if (this.combo >= 2) { this.g.fx.floatText(cx, cy - 40, `×${this.combo}`, C.Accent_Smash, 30, { punch: 1 }); if (this.combo >= 3) this.g.fx.doShake(2 + Math.min(3, this.combo * 0.5)); }
    this.g.tlm.smash({ level_id: run.levelId, crate_type: c.type, combo: this.combo, score_delta: 10 * this.combo, x_lane: null });
    run.addScore(5 * Math.min(this.combo, 4)); run.addFever(CC.CONFIG.FEVER.gainBreak);
    this.g.sessionHints.smash = true;
    run.ftueDone('smash');
    // release cargo → pile (queue)
    c.cargo.forEach((piece, i) => {
      this.g.p.cargoSeen[piece.type.id] = true;
      this.pops.push({ piece, x: cx + (i - 0.5) * 20, y: cy, vx: CC.U.rand(-60, 60) + (i - 0.5) * 120, vy: CC.U.rand(-620, -480), t: 0, life: 0.55, tx: 270 + CC.U.rand(-40, 40), ty: 400 });
      if (piece.golden && !this.g.sessionHints.golden) { this.g.sessionHints.golden = true; this.g.fx.floatText(cx, cy - 70, 'GOLDEN CARGO ×3', '#ffd65a', 22, { life: 1.3, punch: 1 }); }
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
      if (this.holdT >= this.holdRate) { this.holdT = 0; this.hitAt(inp.x, inp.y, false); }
    } else this.holdT = this.holdRate; // first tap hits instantly
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { this.run.cargoQueue.push(p.piece); this.pops.splice(i, 1); continue; }
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
      if (!this.hitAt(e.x, e.y, true)) {
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
      if (c.frozen) CC.drawAsset('CC_DockRush_Crate_Frozen_Shell_v1', ctx, c.x, c.y, c.w, c.h, { cracked: c.iceCracked && this.t - c.iceTapT <= CC.CONFIG.FROZEN_DOUBLE_TAP_S });
      ctx.restore();
    }
    // released cargo airborne → pile
    for (const p of this.pops) CC.drawCargo(ctx, p.piece.type, p.x, p.y, 34, 'airborne', { rot: p.t * 6, golden: p.piece.golden, timed: p.piece.timed });
    // pile / queue preview (cargo waiting to be sorted)
    const q = this.run.cargoQueue;
    q.forEach((piece, i) => { if (i < 24) CC.drawCargo(ctx, piece.type, 270 + ((i % 8) - 3.5) * 30, 400 - Math.floor(i / 8) * 22, 20, 'idle', { golden: piece.golden }); });
    if (q.length) CC.U.text(ctx, `${q.length} cargo`, 270, 440, { size: 12, weight: 800, color: C.Text_Secondary });
  }
};
