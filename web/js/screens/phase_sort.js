/* Phase_Sort (SCR_Sort) — cascading cargo; drag/swipe (or tap a lane) to fling into typed lanes.
 * Bounce on rims/walls, near-miss edge saves, spills → soft fail → Overlay_Revive.
 * Hazards: timed pieces carry a fuse (TIMED_FUSE_S) that detonates into a spill; golden pieces score ×3.
 * Ramp: as the streak climbs the conveyor feeds faster, gives less wait, and lands pieces off-center / sliding. */
window.CC = window.CC || {};

CC.PhaseSort = class {
  constructor(run) { this.run = run; this.g = run.g; this.highlightLane = null; this.active = null; this.queue = []; this.spilled = []; this.seatAnims = []; this.paused = false; this.pendingFail = null; }

  enter() {
    const p = this.g.p;
    this.queue = CC.U.shuffle(this.run.cargoQueue.slice());
    this.run.cargoQueue = [];
    this.active = null;
    this.spawnT = 0.35;
    this.t = 0;
    this.pendingFail = null;
    this.paused = false;
    this.cadence = 0.32 / (1 + 0.12 * (p.upg_sort - 1));
    this.flingMul = 1 + 0.1 * (p.upg_sort - 1);
    this.flightT = 0.34 / this.flingMul; // assisted (tap-a-lane) flight time
    this.edgeTol = 16 + (p.talents.spill_magnet ? 22 : 0);
    this.bounceLoss = p.talents.bounce_dampen ? 0.25 : 0.5;
    this.grabbed = false;
    for (const l of this.run.lanes) { l.swapT = 0; l.activeIdx = 0; }
    for (const l of this.run.lanes) l.flashT = 0.6;
  }
  resume() { this.paused = false; this.pendingFail = null; if (!this.active) this.spawnT = 0.4; }
  swapPeriod(lane) { return lane.types.length >= 3 ? 1.9 : CC.CONFIG.SWAP_LANE_PERIOD_S; }

  remaining() { return this.queue.length + (this.active ? 1 : 0); }

  // 0..1 how far the streak ramp has climbed (conveyor speed + erratic feed)
  ramp() { const R = CC.CONFIG.RAMP; return CC.U.clamp((this.run.stats.streak - R.streakStart) / (R.streakFull - R.streakStart), 0, 1); }
  cadenceNow() { return this.cadence * CC.U.lerp(1, CC.CONFIG.RAMP.cadenceMin, this.ramp()); }
  waitFor(a) {
    const base = this.run.lv.sortWait * CC.U.lerp(1, CC.CONFIG.RAMP.waitMin, this.ramp());
    return a && a.timed ? Math.min(base, CC.CONFIG.TIMED_FUSE_S) : base;
  }

  spawn() {
    const piece = this.queue.shift();
    const k = this.ramp(), R = CC.CONFIG.RAMP;
    // erratic feed: landing spot wanders and, high on the ramp, pieces arrive with a sideways shove
    const jitter = CC.U.lerp(30, R.jitterMax, k);
    const slide = k > 0.35 && Math.random() < k * 0.7 ? CC.U.rand(-R.slideVx, R.slideVx) * k : 0;
    this.active = { type: piece.type, golden: !!piece.golden, timed: !!piece.timed, x: 270 + CC.U.rand(-jitter, jitter), y: 430, vx: slide, vy: 0, state: 'drop', waitT: 0, fuseT: 0, rot: 0, sq: { x: 1, y: 1 }, bounced: false };
    if (piece.timed && !this.g.sessionHints.timed) { this.g.sessionHints.timed = true; this.g.fx.floatText(270, 470, 'UNSTABLE — SORT IT FAST', CC.CONFIG.COLORS.Fail, 20, { life: 1.3, punch: 1 }); }
  }

  // ---- input → fling ----
  fling(vx, vy) {
    const a = this.active; if (!a || a.state === 'fly') return;
    const sp = Math.hypot(vx, vy);
    const max = 1900 * this.flingMul;
    if (sp > max) { vx *= max / sp; vy *= max / sp; }
    a.vx = vx * this.flingMul; a.vy = vy * this.flingMul;
    if (a.vy < -900) a.vy = -900;
    a.state = 'fly'; this.grabbed = false; this.highlightLane = null;
    this.g.audio.whoosh(); // audio hook: fling whoosh
  }
  dropAt(px) {
    // drop where the finger is, not where the lagging cargo sprite is
    const a = this.active; if (!a || a.state === 'fly') return;
    a.x = CC.U.clamp(px, CC.CONFIG.WALL_L + 4, CC.CONFIG.WALL_R - 4);
    if (a.y > CC.CONFIG.LANES.y - 40) a.y = CC.CONFIG.LANES.y - 40;
    this.fling(0, 380);
  }
  flingToLane(idx, noisy) {
    const a = this.active; if (!a || a.state === 'fly') return false;
    const l = this.run.lanes[idx]; if (!l) return false;
    const tx = l.x + l.w / 2 + (noisy ? CC.U.rand(-l.w * 0.35, l.w * 0.35) : 0);
    const ty = l.y + 6;
    const T = this.flightT;
    const g = CC.CONFIG.GRAVITY;
    const vx = (tx - a.x) / T, vy = (ty - a.y) / T - 0.5 * g * T;
    a.vx = vx; a.vy = vy; a.state = 'fly'; this.grabbed = false; this.highlightLane = null;
    this.g.audio.whoosh(); // audio hook: fling whoosh
    return true;
  }

  onPointer(type, e) {
    const a = this.active;
    if (this.paused) return;
    if (type === 'down') {
      if (a && (a.state === 'wait' || a.state === 'drop')) { a.state = 'grab'; this.grabbed = true; a.waitT = 0; if (this.g.p.talents.filter_glove) this.highlightLane = this.run.expectedLaneFor(a.type); }
      return;
    }
    if (type === 'up') {
      if (!a || a.state !== 'grab') return;
      const inLaneZone = e.y > CC.CONFIG.LANES.y - 70;
      const lane = inLaneZone ? this.run.laneAt(e.x) : null;
      if (e.isTap) {
        if (lane) this.flingToLane(lane.idx); // tap a lane = send it there
        else { a.state = 'wait'; this.grabbed = false; this.highlightLane = null; a.sq = { x: 1.2, y: 0.8 }; } // tap on cargo = little hop, stays put
        return;
      }
      if (lane) { this.dropAt(e.x); return; } // released over a lane → drop straight into the lane under the finger
      this.fling(e.vx, e.vy);
    }
  }

  // ---- resolve ----
  land(a) {
    const run = this.run, L = CC.CONFIG.LANES, C = CC.CONFIG.COLORS;
    let lane = run.laneAt(a.x);
    let near = false;
    if (!lane) {
      // landed in a gap/rim between lanes → rim bounce toward the nearer lane (near-miss beat)
      let best = null, bd = 1e9;
      for (const l of run.lanes) { const d = Math.min(Math.abs(a.x - l.x), Math.abs(a.x - (l.x + l.w))); if (d < bd) { bd = d; best = l; } }
      if (best && bd <= this.edgeTol) { lane = best; near = true; }
    } else {
      const d = Math.min(a.x - lane.x, lane.x + lane.w - a.x);
      if (d < this.edgeTol * 0.6) near = true;
    }
    if (!lane) { this.spill(a, null, 'floor'); return; }
    // heavy drop → micro-shake scaled by impact speed
    if (a.vy > 700) this.g.fx.doShake(1.5 + Math.min(2.5, (a.vy - 700) / 400));
    if (near) {
      // exaggerated squash + rim bounce, then settle into the lane
      a.x = lane.x + lane.w / 2; a.vy = -260; a.vx = 0; a.bounced = true; a.sq = { x: 1.4, y: 0.6 };
      this.g.fx.trail(a.x, a.y, '#fff');
      a.state = 'settle'; a.lane = lane; a.settleT = 0;
      const saved = run.laneAccepts(lane, a.type);
      this.g.fx.floatText(a.x, a.y - 30, saved ? 'CLOSE!' : '!', C.Warn, 22, { punch: 1 });
      if (saved) this.g.fx.hapticNearMiss();
      return;
    }
    // perfect = dead-center landing in the right lane, no rim help
    this.evaluate(a, lane, Math.abs(a.x - (lane.x + lane.w / 2)) < lane.w * 0.15);
  }
  evaluate(a, lane, perfect) {
    if (this.run.laneAccepts(lane, a.type)) this.seat(a, lane, !!perfect);
    else this.spill(a, lane, lane.id);
  }
  seat(a, lane, perfect) {
    const run = this.run, C = CC.CONFIG.COLORS, F = CC.CONFIG.FEVER;
    run.stats.streak++;
    run.stats.bestStreak = Math.max(run.stats.bestStreak, run.stats.streak);
    run.stats.sorted++;
    lane.flashT = 0.35;
    this.g.fx.accept(a.x, lane.y, a.golden ? '#ffd65a' : a.type.color);
    this.g.audio.snap(perfect); // audio hook: bin clack / perfect ting
    this.g.sessionHints.sort = true;
    run.ftueDone('sort');
    // score: base 10 × fever multiplier, ×3 for golden, +5 perfect; fever builds on every good sort
    let base = 10 + (perfect ? 5 : 0);
    if (a.golden) { base *= CC.CONFIG.GOLDEN_SCORE_MULT; run.stats.golden++; }
    const gained = run.addScore(base);
    run.addFever(F.gainSort + (perfect ? F.gainPerfect : 0) + (a.golden ? F.gainGolden : 0));
    if (a.golden) this.g.fx.floatText(a.x, lane.y - 74, `GOLDEN +${gained}`, '#ffd65a', 26, { punch: 1 });
    else if (perfect) { this.g.fx.floatText(a.x, lane.y - 74, `PERFECT +${gained}`, C.Safe, 20, { punch: 1 }); }
    if (perfect) this.g.fx.hapticPerfect();
    const s = run.stats.streak;
    if (s >= 2 && s % CC.ECON.STREAK_STEP_SORTS === 0) {
      const pct = CC.ECON.streakBonusPct(s);
      this.g.fx.floatText(a.x, lane.y - 50, `STREAK ${s} · +${pct}%`, C.Warn, 24, { punch: 1 });
      this.g.fx.hapticStreak(s / CC.ECON.STREAK_STEP_SORTS);
      this.g.audio.chime(s / CC.ECON.STREAK_STEP_SORTS); // audio hook: escalating combo chime
    } else if (s >= 2 && !perfect) this.g.fx.hapticStreak(0);
    this.seatAnims.push({ type: a.type, x: a.x, y: lane.y, lane, t: 0, golden: a.golden });
    this.active = null;
    this.spawnT = this.cadenceNow();
  }
  spill(a, lane, chosenId, hazard) {
    const run = this.run, C = CC.CONFIG.COLORS;
    const expected = run.expectedLaneFor(a.type);
    const broken = run.stats.streak > 0;
    this.g.tlm.sortMiss(Object.assign({ level_id: run.levelId, expected_bin: expected ? expected.id : 'none', chosen_bin: chosenId, streak_broken: broken && !this.shieldAvailable() }, hazard ? { hazard } : {}));
    run.stats.misses++;
    if (broken) {
      if (this.shieldAvailable()) { run.stats.shieldUsed = true; this.g.fx.floatText(a.x, a.y - 60, 'SHIELD!', C.Safe, 26, { punch: 1 }); }
      else { run.stats.streak = 0; this.g.fx.floatText(a.x, a.y - 60, 'STREAK BROKEN', C.Fail, 22, { punch: 1 }); }
    }
    run.stats.spills++;
    run.feverMiss();
    this.g.fx.spill(a.x, lane ? lane.y + 4 : a.y);
    if (hazard === 'unstable') { this.g.fx.smashBurst(a.x, a.y, C.Fail, true); this.g.fx.splinters(a.x - 20, a.y - 20, 40, 40, [C.Fail, '#ffd65a', '#1a1d24'], 8, CC.CONFIG.LANES.y + 20); }
    this.g.audio.error(hazard || (lane ? 'wrong_lane' : 'spill')); // audio hook: crisp error thud (+buzz when unstable)
    if (lane) lane.flashT = 0.2;
    this.spilled.push({ type: a.type, x: a.x, y: lane ? lane.y + 6 : a.y, t: 0 });
    // spilled cargo goes back on the pile — spills cost lives/time, not completeness (a detonated piece comes back stable)
    this.queue.push({ type: a.type, golden: a.golden, timed: hazard === 'unstable' ? false : a.timed });
    this.active = null;
    this.spawnT = this.cadenceNow() + 0.25;
    if (run.stats.spills >= run.lv.spillsAllowed) { this.pendingFail = 0.55; this.paused = true; }
  }
  shieldAvailable() { return !!this.g.p.talents.streak_shield && !this.run.stats.shieldUsed; }

  timeoutSpill(a) {
    // sat too long on the conveyor → rolls off (floor spill)
    a.state = 'fly'; a.vx = CC.U.rand(-80, 80); a.vy = 200; a.timedOut = true;
  }
  detonate(a) {
    // unstable piece ran out its fuse wherever it is (conveyor or in hand) → spill on the spot
    this.run.stats.timedSpills++;
    this.grabbed = false; this.highlightLane = null;
    this.spill(a, null, 'floor', 'unstable');
  }

  update(dt) {
    const run = this.run, L = CC.CONFIG.LANES, g = CC.CONFIG.GRAVITY;
    this.t += dt;
    // swap lanes (types > lane slots) cycle their accepted type on a visible timer
    for (const l of run.lanes) if (l.types.length > 1) {
      l.swapT += dt;
      if (l.swapT >= this.swapPeriod(l)) { l.swapT = 0; l.activeIdx = (l.activeIdx + 1) % l.types.length; l.flashT = 0.3; }
    }
    for (let i = this.spilled.length - 1; i >= 0; i--) { this.spilled[i].t += dt; if (this.spilled[i].t > 1.2) this.spilled.splice(i, 1); }
    for (let i = this.seatAnims.length - 1; i >= 0; i--) {
      const s = this.seatAnims[i]; s.t += dt;
      if (s.t >= 0.16) { s.lane.seated.push({ type: s.type, golden: s.golden }); s.lane.fill++; this.seatAnims.splice(i, 1); }
    }
    if (this.pendingFail != null) {
      this.pendingFail -= dt;
      if (this.pendingFail <= 0) { this.pendingFail = null; run.softFail('lives'); }
      return;
    }
    if (this.paused) return;

    if (!this.active) {
      if (this.queue.length) { this.spawnT -= dt; if (this.spawnT <= 0) this.spawn(); }
      else if (!this.seatAnims.length) { run.sortComplete(); }
      return;
    }
    const a = this.active;
    a.sq.x += (1 - a.sq.x) * Math.min(1, dt * 10); a.sq.y += (1 - a.sq.y) * Math.min(1, dt * 10);
    // the fuse keeps burning while waiting AND while held — holding an unstable piece is not a way out
    if (a.timed && (a.state === 'wait' || a.state === 'grab') && !this.g.freezeTimer) {
      a.fuseT += dt;
      if (a.fuseT >= CC.CONFIG.TIMED_FUSE_S) { this.detonate(a); return; }
    }
    // peak fever: ember trail follows the piece wherever it is
    if (run.feverTier >= 3 && a.state !== 'drop' && this.t % 0.05 < dt) this.g.fx.ember(a.x, a.y, run.feverColor());
    switch (a.state) {
      case 'drop': {
        a.y += (a.vy + 0.5 * g * dt) * dt; a.vy += g * dt;
        if (a.vx) { a.x = CC.U.clamp(a.x + a.vx * dt, CC.CONFIG.WALL_L + 10, CC.CONFIG.WALL_R - 10); }
        if (a.y >= CC.CONFIG.CONVEYOR_Y) { a.y = CC.CONFIG.CONVEYOR_Y; a.vy = -a.vy * 0.3; a.sq = { x: 1.25, y: 0.75 }; if (Math.abs(a.vy) < 160) { a.vy = 0; a.state = 'wait'; } }
        break;
      }
      case 'wait': {
        // conveyor clock only runs while some lane can take this piece (swap lanes never make a dock unwinnable)
        if (!this.g.freezeTimer && run.lanes.some((l) => run.laneAccepts(l, a.type))) a.waitT += dt;
        // erratic feed: a shoved piece keeps sliding on the conveyor until friction wins
        if (a.vx) { a.x = CC.U.clamp(a.x + a.vx * dt, CC.CONFIG.WALL_L + 10, CC.CONFIG.WALL_R - 10); a.vx *= Math.max(0, 1 - dt * 3); if (Math.abs(a.vx) < 8) a.vx = 0; }
        a.y = CC.CONFIG.CONVEYOR_Y + Math.sin(this.t * 5) * 3;
        if (a.waitT > this.waitFor(a)) this.timeoutSpill(a);
        break;
      }
      case 'grab': {
        const inp = this.g.input;
        a.x += (inp.x - a.x) * Math.min(1, dt * 20);
        a.y += (inp.y - 30 - a.y) * Math.min(1, dt * 20);
        if (this.t % 0.06 < dt) this.g.fx.trail(a.x, a.y + 10, run.feverTier >= 2 ? run.feverColor() : CC.U.desat(a.type.color, 0.3));
        // finger deep inside a lane = drop into the lane under the finger (robust even if the release is never seen)
        if (inp.y >= L.y + 24 && run.laneAt(inp.x)) this.dropAt(inp.x);
        break;
      }
      case 'fly': {
        // exact constant-gravity step (frame-rate independent), then interpolate the lane-mouth crossing
        const px = a.x, py = a.y;
        a.x += a.vx * dt; a.y += (a.vy + 0.5 * g * dt) * dt; a.vy += g * dt; a.rot += (a.vx / 300) * dt * 4;
        if (this.t % 0.04 < dt) this.g.fx.trail(a.x, a.y, run.feverTier >= 2 ? run.feverColor() : a.type.color);
        if (a.x < CC.CONFIG.WALL_L) { a.x = CC.CONFIG.WALL_L; a.vx = Math.abs(a.vx) * (1 - this.bounceLoss); a.sq = { x: 0.7, y: 1.3 }; }
        if (a.x > CC.CONFIG.WALL_R) { a.x = CC.CONFIG.WALL_R; a.vx = -Math.abs(a.vx) * (1 - this.bounceLoss); a.sq = { x: 0.7, y: 1.3 }; }
        if (a.y < CC.CONFIG.STAGE.top + 40) { a.y = CC.CONFIG.STAGE.top + 40; a.vy = Math.abs(a.vy) * 0.4; }
        if (a.y >= L.y && a.vy > 0) {
          const f = CC.U.clamp((L.y - py) / Math.max(1e-6, a.y - py), 0, 1);
          a.x = CC.U.clamp(px + (a.x - px) * f, CC.CONFIG.WALL_L, CC.CONFIG.WALL_R);
          a.y = L.y;
          if (a.timedOut) { this.spill(a, this.run.laneAt(a.x), 'floor'); }
          else this.land(a);
        }
        break;
      }
      case 'settle': {
        a.settleT += dt;
        a.y += (a.vy + 0.5 * g * dt) * dt; a.vy += g * dt;
        if (a.y >= L.y && a.vy > 0) { a.y = L.y; this.evaluate(a, a.lane, false); }
        break;
      }
    }
  }

  draw(ctx) {
    const C = CC.CONFIG.COLORS, run = this.run;
    // queue preview (next up) at the pile spot
    this.queue.slice(0, 6).forEach((piece, i) => CC.drawCargo(ctx, piece.type, 270 + (i - 2.5) * 30, 392, 18, 'idle', { golden: piece.golden }));
    if (this.queue.length) CC.U.text(ctx, `${this.remaining()} left`, 270, 424, { size: 12, weight: 800, color: C.Text_Secondary });
    // conveyor plate
    CC.U.fillRRect(ctx, 190, CC.CONFIG.CONVEYOR_Y + 26, 160, 14, 6, '#1f242c');
    CC.U.strokeRRect(ctx, 190, CC.CONFIG.CONVEYOR_Y + 26, 160, 14, 6, C.Outline, 2);
    // spilled (state: spill)
    for (const s of this.spilled) { ctx.globalAlpha = 1 - s.t / 1.2; CC.drawCargo(ctx, s.type, s.x, s.y, 40, 'spill'); ctx.globalAlpha = 1; }
    // seating animation
    for (const s of this.seatAnims) { const k = s.t / 0.16; CC.drawCargo(ctx, s.type, s.x, s.y + k * 60, 40 - k * 14, 'seat', { golden: s.golden }); }
    // active cargo
    const a = this.active;
    if (a) {
      if (a.timed && a.state !== 'fly' && a.state !== 'settle') {
        // fuse arc counts down from the moment it lands; red pulse in the last 40%
        const k = CC.U.clamp(a.fuseT / CC.CONFIG.TIMED_FUSE_S, 0, 1);
        ctx.strokeStyle = k > 0.6 ? C.Fail : '#ffd65a'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(a.x, a.y, 38 + (k > 0.6 ? Math.sin(this.t * 22) * 3 : 0), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k)); ctx.stroke();
        CC.U.text(ctx, `${Math.max(0, CC.CONFIG.TIMED_FUSE_S - a.fuseT).toFixed(1)}`, a.x, a.y - 52, { size: 14, weight: 900, color: k > 0.6 ? C.Fail : '#ffd65a', stroke: C.Outline, strokeWidth: 5 });
      } else {
        const wait = a.state === 'wait' ? CC.U.clamp(a.waitT / this.waitFor(a), 0, 1) : 0;
        if (wait > 0.55) { // motion pulse before it rolls off
          ctx.strokeStyle = wait > 0.8 ? C.Fail : C.Warn; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(a.x, a.y, 36 + Math.sin(this.t * 14) * 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - wait)); ctx.stroke();
        }
      }
      const state = a.state === 'fly' || a.state === 'settle' ? 'airborne' : 'idle';
      CC.drawCargo(ctx, a.type, a.x, a.y, 46, state, { rot: a.rot, squash: a.sq, golden: a.golden, timed: a.timed });
      if (a.state === 'grab' || a.state === 'wait') {
        // direction affordance: matching lane marker (only glyph, no arrow spam)
        const exp = run.expectedLaneFor(a.type);
        if (exp && this.g.p.talents.filter_glove && a.state === 'grab') { ctx.strokeStyle = a.type.color; ctx.lineWidth = 4; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(a.x, a.y + 30); ctx.lineTo(exp.x + exp.w / 2, exp.y - 10); ctx.stroke(); ctx.setLineDash([]); }
      }
    }
    // streak badge (T3 streak bait — readable number on-screen)
    if (run.stats.streak >= 2) {
      const pulse = 1 + Math.max(0, 0.3 - (this.t % 1)) * 0.3;
      const w = 150 * pulse, h = 40 * pulse;
      CC.drawAsset('CC_DockRush_UI_Badge_Streak_v1', ctx, 270 - w / 2, 588 - h / 2, w, h, { label: `STREAK ${run.stats.streak}` });
    }
  }
};
