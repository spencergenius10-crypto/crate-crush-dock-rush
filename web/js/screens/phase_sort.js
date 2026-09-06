/* Phase_Sort (SCR_Sort) — cascading cargo; drag/swipe (or tap a lane) to fling into typed lanes.
 * Bounce on rims/walls, near-miss edge saves, spills → soft fail → Overlay_Revive. */
window.CC = window.CC || {};

CC.PhaseSort = class {
  constructor(run) { this.run = run; this.g = run.g; this.highlightLane = null; this.active = null; this.spilled = []; this.seatAnims = []; }

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

  spawn() {
    const type = this.queue.shift();
    this.active = { type, x: 270 + CC.U.rand(-30, 30), y: 430, vx: 0, vy: 0, state: 'drop', waitT: 0, rot: 0, sq: { x: 1, y: 1 }, bounced: false };
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
    this.g.audio.whoosh();
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
    this.g.audio.whoosh();
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
      if (lane) { this.fling(0, 380); return; } // dragged onto a lane mouth → drop straight in
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
    if (near) {
      // exaggerated squash + rim bounce, then settle into the lane
      a.x = lane.x + lane.w / 2; a.vy = -260; a.vx = 0; a.bounced = true; a.sq = { x: 1.4, y: 0.6 };
      this.g.fx.trail(a.x, a.y, '#fff');
      a.state = 'settle'; a.lane = lane; a.settleT = 0;
      this.g.fx.floatText(a.x, a.y - 30, run.laneAccepts(lane, a.type) ? 'CLOSE!' : '!', C.Warn, 22, { punch: 1 });
      return;
    }
    this.evaluate(a, lane);
  }
  evaluate(a, lane) {
    if (this.run.laneAccepts(lane, a.type)) this.seat(a, lane);
    else this.spill(a, lane, lane.id);
  }
  seat(a, lane) {
    const run = this.run, C = CC.CONFIG.COLORS;
    run.stats.streak++;
    run.stats.bestStreak = Math.max(run.stats.bestStreak, run.stats.streak);
    run.stats.sorted++;
    lane.flashT = 0.35;
    this.g.fx.accept(a.x, lane.y, a.type.color);
    this.g.audio.pop();
    this.g.sessionHints.sort = true;
    run.ftueDone('sort');
    const s = run.stats.streak;
    if (s >= 2 && s % CC.ECON.STREAK_STEP_SORTS === 0) {
      const pct = CC.ECON.streakBonusPct(s);
      this.g.fx.floatText(a.x, lane.y - 50, `STREAK ${s} · +${pct}%`, C.Warn, 24, { punch: 1 });
    }
    this.seatAnims.push({ type: a.type, x: a.x, y: lane.y, lane, t: 0 });
    this.active = null;
    this.spawnT = this.cadence;
  }
  spill(a, lane, chosenId) {
    const run = this.run, C = CC.CONFIG.COLORS;
    const expected = run.expectedLaneFor(a.type);
    const broken = run.stats.streak > 0;
    this.g.tlm.sortMiss({ level_id: run.levelId, expected_bin: expected ? expected.id : 'none', chosen_bin: chosenId, streak_broken: broken && !this.shieldAvailable() });
    run.stats.misses++;
    if (broken) {
      if (this.shieldAvailable()) { run.stats.shieldUsed = true; this.g.fx.floatText(a.x, a.y - 60, 'SHIELD!', C.Safe, 26, { punch: 1 }); }
      else { run.stats.streak = 0; this.g.fx.floatText(a.x, a.y - 60, 'STREAK BROKEN', C.Fail, 22, { punch: 1 }); }
    }
    run.stats.spills++;
    this.g.fx.spill(a.x, lane ? lane.y + 4 : a.y);
    this.g.audio.splat();
    if (lane) lane.flashT = 0.2;
    this.spilled.push({ type: a.type, x: a.x, y: lane ? lane.y + 6 : a.y, t: 0 });
    // spilled cargo goes back on the pile — spills cost lives/time, not completeness
    this.queue.push(a.type);
    this.active = null;
    this.spawnT = this.cadence + 0.25;
    if (run.stats.spills >= run.lv.spillsAllowed) { this.pendingFail = 0.55; this.paused = true; }
  }
  shieldAvailable() { return !!this.g.p.talents.streak_shield && !this.run.stats.shieldUsed; }

  timeoutSpill(a) {
    // sat too long on the conveyor → rolls off (floor spill)
    a.state = 'fly'; a.vx = CC.U.rand(-80, 80); a.vy = 200; a.timedOut = true;
  }

  update(dt) {
    const run = this.run, L = CC.CONFIG.LANES, g = CC.CONFIG.GRAVITY, W = CC.CONFIG;
    this.t += dt;
    // swap lanes (types > lane slots) cycle their accepted type on a visible timer
    for (const l of run.lanes) if (l.types.length > 1) {
      l.swapT += dt;
      if (l.swapT >= this.swapPeriod(l)) { l.swapT = 0; l.activeIdx = (l.activeIdx + 1) % l.types.length; l.flashT = 0.3; }
    }
    for (let i = this.spilled.length - 1; i >= 0; i--) { this.spilled[i].t += dt; if (this.spilled[i].t > 1.2) this.spilled.splice(i, 1); }
    for (let i = this.seatAnims.length - 1; i >= 0; i--) {
      const s = this.seatAnims[i]; s.t += dt;
      if (s.t >= 0.16) { s.lane.seated.push({ type: s.type }); s.lane.fill++; this.seatAnims.splice(i, 1); }
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
    switch (a.state) {
      case 'drop': {
        a.y += (a.vy + 0.5 * g * dt) * dt; a.vy += g * dt;
        if (a.y >= CC.CONFIG.CONVEYOR_Y) { a.y = CC.CONFIG.CONVEYOR_Y; a.vy = -a.vy * 0.3; a.sq = { x: 1.25, y: 0.75 }; if (Math.abs(a.vy) < 160) { a.vy = 0; a.state = 'wait'; } }
        break;
      }
      case 'wait': {
        // conveyor clock only runs while some lane can take this piece (swap lanes never make a dock unwinnable)
        if (run.lanes.some((l) => run.laneAccepts(l, a.type))) a.waitT += dt;
        a.y = CC.CONFIG.CONVEYOR_Y + Math.sin(this.t * 5) * 3;
        if (a.waitT > this.run.lv.sortWait) this.timeoutSpill(a);
        break;
      }
      case 'grab': {
        const inp = this.g.input;
        a.x += (inp.x - a.x) * Math.min(1, dt * 20);
        a.y += (inp.y - 30 - a.y) * Math.min(1, dt * 20);
        if (this.t % 0.06 < dt) this.g.fx.trail(a.x, a.y + 10, CC.U.desat(a.type.color, 0.3));
        // dragged straight into a lane mouth counts as a drop
        if (a.y >= L.y - 6) { this.fling(0, 300); }
        break;
      }
      case 'fly': {
        // exact constant-gravity step (frame-rate independent), then interpolate the lane-mouth crossing
        const px = a.x, py = a.y;
        a.x += a.vx * dt; a.y += (a.vy + 0.5 * g * dt) * dt; a.vy += g * dt; a.rot += (a.vx / 300) * dt * 4;
        if (this.t % 0.04 < dt) this.g.fx.trail(a.x, a.y, a.type.color);
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
        if (a.y >= L.y && a.vy > 0) { a.y = L.y; this.evaluate(a, a.lane); }
        break;
      }
    }
  }

  draw(ctx) {
    const C = CC.CONFIG.COLORS, run = this.run;
    // queue preview (next up) at the pile spot
    this.queue.slice(0, 6).forEach((type, i) => CC.drawCargo(ctx, type, 270 + (i - 2.5) * 30, 392, 18, 'idle'));
    if (this.queue.length) CC.U.text(ctx, `${this.remaining()} left`, 270, 424, { size: 12, weight: 800, color: C.Text_Secondary });
    // conveyor plate
    CC.U.fillRRect(ctx, 190, CC.CONFIG.CONVEYOR_Y + 26, 160, 14, 6, '#1f242c');
    CC.U.strokeRRect(ctx, 190, CC.CONFIG.CONVEYOR_Y + 26, 160, 14, 6, C.Outline, 2);
    // spilled (state: spill)
    for (const s of this.spilled) { ctx.globalAlpha = 1 - s.t / 1.2; CC.drawCargo(ctx, s.type, s.x, s.y, 40, 'spill'); ctx.globalAlpha = 1; }
    // seating animation
    for (const s of this.seatAnims) { const k = s.t / 0.16; CC.drawCargo(ctx, s.type, s.x, s.y + k * 60, 40 - k * 14, 'seat'); }
    // active cargo
    const a = this.active;
    if (a) {
      const wait = a.state === 'wait' ? CC.U.clamp(a.waitT / this.run.lv.sortWait, 0, 1) : 0;
      if (wait > 0.55) { // motion pulse before it rolls off
        ctx.strokeStyle = wait > 0.8 ? C.Fail : C.Warn; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(a.x, a.y, 36 + Math.sin(this.t * 14) * 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - wait)); ctx.stroke();
      }
      const state = a.state === 'fly' || a.state === 'settle' ? 'airborne' : 'idle';
      CC.drawCargo(ctx, a.type, a.x, a.y, 46, state, { rot: a.rot, squash: a.sq });
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
