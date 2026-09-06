/* DockRun — single stage root. State machine over Phase_Smash → Phase_Sort → Phase_Truck,
 * with Overlay_Revive / Overlay_Results. Smash→Sort is a phase swap on the same camera. */
window.CC = window.CC || {};

CC.DockRunScreen = class {
  constructor(g) { this.g = g; this.drawsFX = true; }

  enter(params) {
    const g = this.g, p = g.p;
    this.lv = CC.getLevel(params.levelN || p.nextLevel);
    this.levelId = this.lv.id;
    p.attempts[this.levelId] = (p.attempts[this.levelId] || 0) + 1;
    g.save.save();
    this.attempt_n = p.attempts[this.levelId];
    g.tlm.dockAttempt();

    this.stats = { smashed: 0, misses: 0, streak: 0, bestStreak: 0, spills: 0, sorted: 0, revives: 0, shieldUsed: false, doubled: false, score: 0, golden: 0, timedSpills: 0, feverPeak: 0 };
    // Flow / Fever: 0..1, builds on good play, decays on idle / halves on a miss. Tier → score multiplier.
    this.fever = 0; this.feverTier = 0; this.feverFlashT = 0;
    this.cargoTotal = this.lv.crates * this.lv.cargoPerCrate;
    this.cargoQueue = [];
    this.timerMax = this.lv.timer;
    this.timer = this.lv.timer;
    this.elapsed = 0;
    this.t = 0;
    this.phaseSwapT = 0;
    this.overlay = null;
    this.result = null;
    this.ftue = !!this.lv.ftue && !(p.ftue.smash && p.ftue.sort && p.ftue.truck);
    this.ftueText = null;
    g.sessionHints = g.sessionHints || { smash: false, sort: false };

    this.buildLanes();
    this.smash = new CC.PhaseSmash(this);
    this.sort = new CC.PhaseSort(this);
    this.truck = new CC.PhaseTruck(this);
    this.setPhase('smash');
  }
  exit() { this.overlay = null; }

  // ---------- lanes (CC_Lane_*) ----------
  buildLanes() {
    const L = CC.CONFIG.LANES, p = this.g.p;
    const types = this.lv.types;
    const n = Math.min(types.length, p.upg_lanes);
    const gap = 10, w = (L.w - gap * (n - 1)) / n;
    this.lanes = [];
    for (let i = 0; i < n; i++) {
      const laneTypes = i === n - 1 ? types.slice(i) : [types[i]];
      this.lanes.push({ idx: i, id: 'lane_' + (i + 1), x: L.x + i * (w + gap), y: L.y, w, h: L.h, types: laneTypes, activeIdx: 0, fill: 0, seated: [], flashT: 0, swapT: 0 });
    }
  }
  laneCurrent(lane) { return lane.types[lane.activeIdx]; }
  laneAccepts(lane, type) { return this.laneCurrent(lane).id === type.id; }
  expectedLaneFor(type) { return this.lanes.find((l) => l.types.some((t) => t.id === type.id)); }
  laneAt(x) { return this.lanes.find((l) => x >= l.x && x <= l.x + l.w) || null; }

  // ---------- phases ----------
  setPhase(name) {
    this.phaseName = name;
    this.phase = this[name];
    this.phaseSwapT = 0;
    this.phase.enter();
    if (this.ftue) {
      const step = { smash: 'ftue_smash', sort: 'ftue_sort', truck: 'ftue_truck' }[name];
      this.g.tlm.tutorialStep(step, false);
      this.ftueText = { smash: 'TAP THE CRATES', sort: 'DRAG CARGO TO ITS LANE', truck: 'LOADING TRUCK…' }[name];
    }
    if (CC.dev) CC.dev.refresh();
  }
  ftueDone(step) {
    if (!this.ftue) return;
    if (this.g.p.ftue[step]) return;
    this.g.p.ftue[step] = true; this.g.save.save();
    this.g.tlm.tutorialStep('ftue_' + step, true);
    this.ftueText = null;
  }

  smashComplete() { this.setPhase('sort'); this.g.audio.whoosh(); this.g.fx.doFlash(0.12, '#fff'); } // Kade audio (whoosh)
  sortComplete() { this.setPhase('truck'); }

  // ---------- score + fever ----------
  feverMult() { return CC.CONFIG.FEVER.mults[this.feverTier]; }
  feverColor() { return ['#a7afbd', CC.CONFIG.COLORS.Warn, CC.CONFIG.COLORS.Accent_SmashHot, '#ffffff'][this.feverTier]; }
  addScore(base) { const v = Math.round(base * this.feverMult()); this.stats.score += v; return v; }
  addFever(amt) {
    this.fever = CC.U.clamp(this.fever + amt, 0, 1);
    this.retier();
  }
  feverMiss() { this.fever *= CC.CONFIG.FEVER.missMult; this.retier(); }
  retier() {
    const T = CC.CONFIG.FEVER.tiers;
    const tier = this.fever >= T[2] ? 3 : this.fever >= T[1] ? 2 : this.fever >= T[0] ? 1 : 0;
    if (tier === this.feverTier) return;
    const up = tier > this.feverTier;
    this.feverTier = tier;
    this.stats.feverPeak = Math.max(this.stats.feverPeak, tier);
    if (up) {
      // big clear beat: label, lane flash, micro-shake scaled by tier, haptic pattern
      this.feverFlashT = 0.5;
      this.g.fx.floatText(CC.CONFIG.W / 2, 470, `FEVER ×${this.feverMult()}`, this.feverColor(), 30 + tier * 4, { punch: 1, life: 1.0 });
      this.g.fx.doShake(2 + tier * 1.5); this.g.fx.doFlash(0.08 + tier * 0.04, this.feverColor());
      this.g.fx.hapticFever(tier);
      for (const l of this.lanes) l.flashT = 0.4;
    }
    this.g.audio.fever(tier); // Kade audio — tier entered (0 = dropped out)
  }
  feverUpdate(dt) {
    if (this.fever <= 0) return;
    const F = CC.CONFIG.FEVER;
    // faster bleed the higher you are, and faster still when the finger is off the glass
    let rate = F.decayBase + F.decayHigh * this.fever;
    if (!this.g.input.down) rate *= F.idleMult;
    this.fever = Math.max(0, this.fever - rate * dt);
    this.retier();
  }

  progressPct() {
    const smashPart = this.lv.crates ? this.stats.smashed / this.lv.crates : 1;
    const sortPart = this.cargoTotal ? this.stats.sorted / this.cargoTotal : 1;
    return Math.round(100 * (smashPart * 0.4 + sortPart * 0.6));
  }

  softFail(reason) {
    if (this.overlay) return;
    this.failReason = reason;
    this.g.audio.fail();
    this.overlay = new CC.OverlayRevive(this, reason);
    if (CC.dev) CC.dev.refresh();
  }
  onReviveAccept(source) {
    this.g.tlm.revive({ level_id: this.levelId, source, attempt_n: this.attempt_n, progress_pct_at_revive: this.progressPct() });
    this.stats.revives++; this.g.p.stats.revives++; this.g.save.save();
    this.stats.spills = 0;
    this.timer = Math.max(this.timer, 0) + CC.CONFIG.REVIVE_TIME_BONUS_S;
    this.overlay = null;
    if (this.phaseName === 'sort') this.sort.resume(); // timer fail during Smash just resumes smashing
    this.g.fx.floatText(CC.CONFIG.W / 2, 560, 'REVIVED!', CC.CONFIG.COLORS.Safe, 34, { punch: 1 });
    if (CC.dev) CC.dev.refresh();
  }
  onReviveDecline() {
    this.g.tlm.dockFail(Object.assign({
      level_id: this.levelId, attempt_n: this.attempt_n, duration_s: Math.round(this.elapsed),
      fail_reason: this.failReason || 'other', crates_smashed: this.stats.smashed, sort_misses: this.stats.misses,
      progress_pct: this.progressPct(),
    }, this.feelProps(), this.challengeProps()));
    this.g.p.stats.docks_failed++; this.g.save.save();
    this.showResults(false);
  }
  onTruckFull() {
    const p = this.g.p;
    const isFirst = !p.cleared[this.levelId];
    this.g.tlm.dockClear(Object.assign({
      level_id: this.levelId, attempt_n: this.attempt_n, duration_s: Math.round(this.elapsed),
      crates_smashed: this.stats.smashed, sort_misses: this.stats.misses,
      stars: this.stats.misses === 0 ? 3 : this.stats.misses <= 2 ? 2 : 1,
      difficulty_tier: this.lv.difficulty_tier, is_first_clear: isFirst,
    }, this.feelProps(), this.challengeProps()));
    this.ftueDone('truck');
    this.showResults(true);
  }
  showResults(cleared) {
    this.overlay = new CC.OverlayResults(this, cleared);
    if (CC.dev) CC.dev.refresh();
  }
  quit() {
    // leaving mid-dock = dock_fail(quit); Hub is never hard-blocked
    if (!this.result) {
      this.g.tlm.dockFail({ level_id: this.levelId, attempt_n: this.attempt_n, duration_s: Math.round(this.elapsed), fail_reason: 'quit', crates_smashed: this.stats.smashed, sort_misses: this.stats.misses, progress_pct: this.progressPct() });
    }
    this.g.go('SCR_Hub');
  }

  // ---------- loop ----------
  update(dt) {
    this.t += dt;
    this.phaseSwapT += dt;
    for (const l of this.lanes) l.flashT = Math.max(0, l.flashT - dt);
    if (this.overlay) { this.overlay.update(dt); return; }
    this.elapsed += dt;
    this.feverFlashT = Math.max(0, this.feverFlashT - dt);
    if ((this.phaseName === 'smash' || this.phaseName === 'sort') && !this.g.freezeTimer) {
      this.timer -= dt;
      if (this.timer <= 0) { this.timer = 0; this.softFail('timer'); return; }
      this.feverUpdate(dt); // fever only bleeds while the player is on the clock
    }
    this.phase.update(dt);
  }

  onPointer(type, e) {
    if (this.overlay) { this.overlay.onPointer(type, e); return; }
    // quit hit-zone: dock name at top-left (small, not mid-stage)
    if (type === 'up' && e.isTap && e.x < 120 && e.y < 40) { this.quit(); return; }
    this.phase.onPointer(type, e);
  }

  // ---------- draw ----------
  draw(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, T = CC.CONFIG.TRUCK;
    CC.UI.stageBackdrop(ctx);

    // Truck bay (Stage_Dock) — Empty / Filling / Full
    const ratio = this.phaseName === 'truck' ? this.truck.ratio() : 0;
    const full = this.phaseName === 'truck' && this.truck.isFull();
    const slam = full ? 1 + Math.max(0, 0.25 - this.truck.fullT) * 1.6 : 1;
    ctx.save(); ctx.translate(T.x + T.w / 2, T.y + T.h / 2); ctx.scale(slam, slam); ctx.translate(-(T.x + T.w / 2), -(T.y + T.h / 2));
    CC.drawAsset('CC_DockRush_Truck_Cab_Simple_v1', ctx, T.x + T.w + 6, T.y + 10, 40, T.h - 10);
    CC.drawAsset('CC_DockRush_Truck_Bay_v1', ctx, T.x, T.y, T.w, T.h, { ratio, full });
    ctx.restore();

    // Forklift antagonist creeps toward the truck as the timer drains
    const tr = this.timerMax ? this.timer / this.timerMax : 1;
    const fx = CC.U.lerp(-60, 150, 1 - tr);
    CC.drawAsset('CC_DockRush_Forklift_Hero_Default_v1', ctx, fx, 176, 100, 70, { warn: tr < 0.25 });

    // lanes are always on stage (dimmed in Smash) — same camera
    this.drawLanes(ctx);
    this.phase.draw(ctx);
    this.drawHUD(ctx);
    this.g.fx.draw(ctx); // world FX sit under overlays (drawsFX = true)
    if (this.overlay) this.overlay.draw(ctx);
  }

  drawLanes(ctx) {
    const C = CC.CONFIG.COLORS;
    const active = this.phaseName !== 'smash';
    ctx.save();
    if (!active) ctx.globalAlpha = 0.55;
    // fever glow: layered translucent strokes (no shadowBlur — too costly on mobile GPUs), pulse rises with tier
    const tier = this.feverTier;
    if (tier > 0 && active) {
      const col = this.feverColor(), pulse = 0.5 + 0.5 * Math.sin(this.t * (4 + tier * 3));
      const base = [0, 0.18, 0.28, 0.4][tier] + pulse * 0.12 + (this.feverFlashT > 0 ? this.feverFlashT * 0.6 : 0);
      ctx.strokeStyle = col;
      for (let i = 0; i < tier; i++) {
        ctx.globalAlpha = Math.min(1, base * (1 - i * 0.3)); ctx.lineWidth = 6 + i * 8;
        for (const l of this.lanes) { CC.U.rrect(ctx, l.x - 4 - i * 4, l.y - 10 - i * 4, l.w + 8 + i * 8, l.h + 14 + i * 8, 10); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    }
    for (const l of this.lanes) {
      const type = this.laneCurrent(l);
      const hl = this.sort.highlightLane === l;
      CC.drawAsset('CC_DockRush_Lane_Base_v1', ctx, l.x, l.y, l.w, l.h, { floor: hl ? CC.U.desat(type.color, 0.7) : tier >= 2 ? CC.U.desat(this.feverColor(), 0.85) : null });
      CC.drawAsset('CC_DockRush_Lane_Rim_v1', ctx, l.x, l.y, l.w, l.h, { color: type.color, type });
      if (l.flashT > 0) { ctx.globalAlpha = l.flashT * 2; ctx.fillStyle = type.color; ctx.fillRect(l.x, l.y - 8, l.w, l.h + 8); ctx.globalAlpha = active ? 1 : 0.55; }
      // seated cargo (Lane seat state)
      const cols = Math.max(2, Math.floor(l.w / 44));
      l.seated.forEach((s, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const sx = l.x + 22 + col * ((l.w - 44) / (cols - 1 || 1)), sy = l.y + l.h - 22 - row * 24;
        if (sy > l.y + 18) CC.drawCargo(ctx, s.type, sx, sy, 22, 'seat', { golden: s.golden });
      });
      // fill meter (ratio from systems: seated / expected of this lane)
      const exp = this.laneExpected(l);
      CC.drawAsset('CC_DockRush_Lane_FillMeter_v1', ctx, l.x + l.w - 14, l.y + 14, 8, l.h - 28, { ratio: exp ? l.seated.length / exp : 0, color: type.color });
      // swap-lane indicator
      if (l.types.length > 1) {
        const k = 1 - (l.swapT / this.sort.swapPeriod(l));
        ctx.strokeStyle = C.Warn; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(l.x + 18, l.y + 22, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
        CC.U.text(ctx, '↻', l.x + 18, l.y + 22, { size: 12, weight: 900, color: C.Warn });
      }
    }
    ctx.restore();
  }
  laneExpected(l) {
    // total cargo of this lane's types on the dock — fixed once crates are built, so compute once per run
    if (l.expected == null) {
      let n = 0;
      for (const c of this.smash.crates) for (const piece of c.cargo) if (l.types.some((x) => x.id === piece.type.id)) n++;
      l.expected = n;
    }
    return l.expected;
  }

  // Feel-system telemetry (additive props on dock_clear / dock_fail; not part of the must-ship contract)
  feelProps() {
    const s = this.stats;
    return { run_score: s.score, fever_peak_tier: s.feverPeak, golden_sorted: s.golden, unstable_detonated: s.timedSpills };
  }

  // Challenge link context for this dock (friend's target), or null. Extra telemetry props only.
  challengeProps() {
    const ch = this.g.p.challenge;
    if (!ch || ch.n !== this.lv.n) return {};
    return { challenge_target: ch.score };
  }

  drawHUD(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, capture = this.g.p.settings.capture;
    // top: dock name · timer ring · coin chip (small, optional)
    if (!capture) {
      CC.U.text(ctx, this.lv.name.toUpperCase(), 16, 22, { size: 16, weight: 900, align: 'left' });
      CC.U.text(ctx, '✕ quit', 16, 44, { size: 11, weight: 700, align: 'left', color: '#6d7684' });
      CC.U.text(ctx, `SCORE ${this.stats.score}`, 16, 66, { size: 12, weight: 800, align: 'left', color: C.Text_Secondary });
      CC.UI.coinChip(ctx, W - 16, 12, this.g.p.coins, 'right');
    }
    const ratio = this.timerMax ? CC.U.clamp(this.timer / this.timerMax, 0, 1) : 1;
    // fever arc wraps the timer ring; stays up in Truck so the peak reads on the FULL beat
    CC.drawAsset('CC_DockRush_UI_Fever_Ring_v1', ctx, W / 2 - 44, 4, 88, 88, { value: this.fever, tier: this.feverTier });
    if (this.phaseName !== 'truck') CC.drawAsset('CC_DockRush_UI_Timer_Ring_v1', ctx, W / 2 - 36, 12, 72, 72, { ratio, label: capture ? null : Math.ceil(this.timer) + 's' });
    // phase literacy chip + live multiplier (beside the ring, small)
    if (!capture) {
      const label = { smash: 'SMASH', sort: 'SORT', truck: 'TRUCK' }[this.phaseName];
      CC.U.text(ctx, label, W / 2 + 60, 48, { size: 12, weight: 900, align: 'left', color: C.Text_Secondary });
    }
    if (this.feverTier > 0) {
      const pulse = 1 + Math.sin(this.t * 8) * 0.06 * this.feverTier;
      CC.U.text(ctx, `×${this.feverMult()}`, W / 2 + 60, 26, { size: 20 * pulse, weight: 900, align: 'left', color: this.feverColor(), stroke: C.Outline, strokeWidth: 5 });
      CC.U.text(ctx, 'FEVER', W / 2 + 104, 27, { size: 11, weight: 900, align: 'left', color: this.feverColor() });
    }
    // spills (lives) as icons — not color-only
    if (this.phaseName === 'sort') {
      for (let i = 0; i < this.lv.spillsAllowed; i++) {
        const used = i < this.stats.spills;
        const x = W - 30 - i * 26, y = 60;
        ctx.fillStyle = used ? '#3a4250' : C.Spill; ctx.beginPath(); ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.Outline; ctx.lineWidth = 2; ctx.stroke();
        if (used) { ctx.strokeStyle = C.Fail; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x - 7, y + 7); ctx.stroke(); }
      }
    }
    // FTUE text (≤6 words) inside safe band
    if (this.ftueText) {
      const pulse = 1 + Math.sin(this.t * 6) * 0.03;
      CC.U.text(ctx, this.ftueText, W / 2, 600, { size: 24 * pulse, weight: 900, color: C.Warn, stroke: C.Outline, strokeWidth: 7 });
    }
    // bottom: phase hint icon only — disappears after first successful action of the session
    const hints = this.g.sessionHints;
    const showHint = (this.phaseName === 'smash' && !hints.smash) || (this.phaseName === 'sort' && !hints.sort);
    if (showHint) {
      const icon = this.phaseName === 'smash' ? 'CC_DockRush_UI_Icon_Smash_v1' : 'CC_DockRush_UI_Icon_Swipe_v1';
      const bob = Math.sin(this.t * 5) * 4;
      CC.drawAsset(icon, ctx, W / 2 - 28, 876 + bob, 56, 56);
    }
    if (this.phaseName === 'truck') CC.drawAsset('CC_DockRush_UI_Icon_Truck_v1', ctx, W / 2 - 24, 884, 48, 48, { color: C.Text_Secondary });
    // Phase swap flash chrome (Smash→Sort): brief label
    if (this.phaseName === 'sort' && this.phaseSwapT < 0.9) {
      const k = this.phaseSwapT / 0.9;
      ctx.globalAlpha = 1 - k;
      CC.U.text(ctx, 'SORT!', W / 2, 560 - k * 40, { size: 44 + k * 10, weight: 900, color: C.Warn, stroke: C.Outline, strokeWidth: 9 });
      ctx.globalAlpha = 1;
    }
  }
};
