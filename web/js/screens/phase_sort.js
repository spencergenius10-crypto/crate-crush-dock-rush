/* Phase_Sort (SCR_Sort) — cascading cargo; drag/swipe (or tap a lane) to fling into typed lanes.
 * Bounce on rims/walls, near-miss edge saves, spills → soft fail → Overlay_Revive.
 * Hazards: timed pieces carry a fuse (TIMED_FUSE_S) that detonates into a spill; golden pieces score ×3.
 * Behaviours: magnet cargo in free flight steers to the NEAREST lane mouth (assist when you aim right, trap when
 *   you don't); fragile glass shatters (= spill) on a hard free flick, a hard wall hit or a hard landing.
 * Belts: normally one conveyor spot; Rush Hour (round event) opens a second belt so two pieces wait at once.
 * Ramp: as the streak climbs the conveyor feeds faster, gives less wait, and lands pieces off-center / sliding. */
window.CC = window.CC || {};

CC.PhaseSort = class {
  constructor(run) { this.run = run; this.g = run.g; this.highlightLane = null; this.pieces = []; this.grab = null; this.queue = []; this.spilled = []; this.seatAnims = []; this.paused = false; this.pendingFail = null; this.rush = false; }

  enter() {
    const p = this.g.p;
    this.queue = CC.U.shuffle(this.run.cargoQueue.slice());
    this.run.cargoQueue = [];
    this.pieces = []; this.grab = null;
    this.rush = false;
    this.spawnT = 0.35;
    this.t = 0;
    this.pendingFail = null;
    this.paused = false;
    this.cadence = 0.32 / (1 + 0.12 * (p.upg_sort - 1));
    this.flingMul = 1 + 0.1 * (p.upg_sort - 1);
    this.flightT = 0.34 / this.flingMul; // assisted (tap-a-lane) flight time
    this.edgeTol = 16 + (p.talents.spill_magnet ? 22 : 0);
    this.bounceLoss = p.talents.bounce_dampen ? 0.25 : 0.5;
    for (const l of this.run.lanes) { l.swapT = 0; l.activeIdx = 0; }
    for (const l of this.run.lanes) l.flashT = 0.6;
  }
  resume() { this.paused = false; this.pendingFail = null; if (!this.pieces.length) this.spawnT = 0.4; }
  swapPeriod(lane) { return lane.types.length >= 3 ? 1.9 : CC.CONFIG.SWAP_LANE_PERIOD_S; }

  // compat: the "primary" piece (held, else first one waiting) — bot / dev panel read this
  get active() { return this.grab || this.pieces.find((a) => a.state === 'wait' || a.state === 'drop') || this.pieces[0] || null; }
  get belts() { return this.rush ? CC.CONFIG.EVENTS.rush.belts : 1; }
  beltX(i) { return this.belts > 1 ? (i === 0 ? 180 : 360) : 270; }
  onBelt(i) { return this.pieces.some((a) => a.belt === i && a.state !== 'fly' && a.state !== 'settle'); }
  remaining() { return this.queue.length + this.pieces.length; }
  mute() { return this.run.inspection ? CC.CONFIG.EVENTS.inspection.mute : 0; }

  // 0..1 how far the streak ramp has climbed (conveyor speed + erratic feed)
  ramp() { const R = CC.CONFIG.RAMP; return CC.U.clamp((this.run.stats.streak - R.streakStart) / (R.streakFull - R.streakStart), 0, 1); }
  cadenceNow() { return this.cadence * CC.U.lerp(1, CC.CONFIG.RAMP.cadenceMin, this.ramp()) * (this.rush ? CC.CONFIG.EVENTS.rush.cadenceMul : 1); }
  waitFor(a) {
    const base = this.run.lv.sortWait * CC.U.lerp(1, CC.CONFIG.RAMP.waitMin, this.ramp()) * (this.rush ? CC.CONFIG.EVENTS.rush.waitMul : 1);
    return a && a.timed ? Math.min(base, CC.CONFIG.TIMED_FUSE_S) : base;
  }

  spawn() {
    const piece = this.queue.shift();
    const k = this.ramp(), R = CC.CONFIG.RAMP, RH = CC.CONFIG.EVENTS.rush;
    let belt = 0; for (let i = 0; i < this.belts; i++) if (!this.onBelt(i)) { belt = i; break; }
    // erratic feed: landing spot wanders and, high on the ramp (or in Rush Hour), pieces arrive with a sideways shove
    const jitter = Math.min(this.belts > 1 ? 36 : 1e9, CC.U.lerp(30, R.jitterMax, k));
    let slide = k > 0.35 && Math.random() < k * 0.7 ? CC.U.rand(-R.slideVx, R.slideVx) * k : 0;
    if (this.rush) slide = (belt === 0 ? -1 : 1) * CC.U.rand(RH.slideVx * 0.5, RH.slideVx); // shoved outward, away from the other belt
    const a = { type: piece.type, golden: !!piece.golden, timed: !!piece.timed, fragile: !!piece.fragile, magnet: !!piece.magnet, belt, x: this.beltX(belt) + CC.U.rand(-jitter, jitter), y: 430, vx: slide, vy: 0, state: 'drop', waitT: 0, fuseT: 0, rot: 0, sq: { x: 1, y: 1 }, bounced: false, assisted: false, snapped: false, magnetTarget: null };
    this.pieces.push(a);
    const hints = this.g.sessionHints, C = CC.CONFIG.COLORS;
    if (a.timed && !hints.timed) { hints.timed = true; this.g.fx.floatText(a.x, 470, 'UNSTABLE — SORT IT FAST', C.Fail, 20, { life: 1.3, punch: 1 }); }
    else if (a.fragile && !hints.fragile) { hints.fragile = true; this.g.fx.floatText(a.x, 470, 'GLASS — FLICK IT SOFTLY', '#7be0ff', 20, { life: 1.3, punch: 1 }); }
  }

  // ---- input → fling ----
  fling(vx, vy, a) {
    a = a || this.grab; if (!a || a.state === 'fly') return;
    const sp = Math.hypot(vx, vy);
    // fragile glass: the skill is a gentle hand — a hard free flick shatters it in the hand
    if (a.fragile && sp > CC.CONFIG.GLASS.maxSpeed) { this.release(a); this.shatter(a, 'flick'); return; }
    const max = 1900 * this.flingMul;
    if (sp > max) { vx *= max / sp; vy *= max / sp; }
    a.vx = vx * this.flingMul; a.vy = vy * this.flingMul;
    if (a.vy < -900) a.vy = -900;
    a.state = 'fly'; a.assisted = false; this.release(a);
    this.g.audio.whoosh(); // Kade audio
  }
  dropAt(px, a) {
    // drop where the finger is, not where the lagging cargo sprite is
    a = a || this.grab; if (!a || a.state === 'fly') return;
    a.x = CC.U.clamp(px, CC.CONFIG.WALL_L + 4, CC.CONFIG.WALL_R - 4);
    if (a.y > CC.CONFIG.LANES.y - 40) a.y = CC.CONFIG.LANES.y - 40;
    a.vx = 0; a.vy = 380; a.state = 'fly'; a.assisted = true; this.release(a);
    this.g.audio.whoosh(); // Kade audio
  }
  flingToLane(idx, noisy, a) {
    a = a || this.active; if (!a || a.state === 'fly') return false;
    const l = this.run.lanes[idx]; if (!l) return false;
    const tx = l.x + l.w / 2 + (noisy ? CC.U.rand(-l.w * 0.35, l.w * 0.35) : 0);
    const ty = l.y + 6;
    const T = this.flightT;
    const g = CC.CONFIG.GRAVITY;
    const vx = (tx - a.x) / T, vy = (ty - a.y) / T - 0.5 * g * T;
    a.vx = vx; a.vy = vy; a.state = 'fly'; a.assisted = true; this.release(a);
    this.g.audio.whoosh(); // Kade audio
    return true;
  }
  release(a) { if (this.grab === a) { this.grab = null; this.highlightLane = null; } }

  onPointer(type, e) {
    if (this.paused) return;
    if (type === 'down') {
      // grab the nearest waiting piece (one belt = tap anywhere grabs it, as before)
      const cands = this.pieces.filter((a) => a.state === 'wait' || a.state === 'drop');
      if (!cands.length) return;
      let a = cands[0];
      if (cands.length > 1) { let bd = 1e9; for (const c of cands) { const d = Math.hypot(c.x - e.x, (c.y - e.y) * 0.5); if (d < bd) { bd = d; a = c; } } }
      a.state = 'grab'; a.waitT = 0; this.grab = a;
      if (this.g.p.talents.filter_glove) this.highlightLane = this.run.expectedLaneFor(a.type);
      return;
    }
    if (type === 'up') {
      const a = this.grab;
      if (!a || a.state !== 'grab') return;
      const inLaneZone = e.y > CC.CONFIG.LANES.y - 70;
      const lane = inLaneZone ? this.run.laneAt(e.x) : null;
      if (e.isTap) {
        if (lane) this.flingToLane(lane.idx, false, a); // tap a lane = send it there
        else { a.state = 'wait'; this.release(a); a.sq = { x: 1.2, y: 0.8 }; } // tap on cargo = little hop, stays put
        return;
      }
      if (lane) { this.dropAt(e.x, a); return; } // released over a lane → drop straight into the lane under the finger
      this.fling(e.vx, e.vy, a);
    }
  }

  // ---- resolve ----
  land(a) {
    const run = this.run, C = CC.CONFIG.COLORS, G = CC.CONFIG.GLASS;
    // glass that comes down too hard breaks on the rim whatever lane it was headed for
    if (a.fragile && !a.assisted && a.vy > G.landVy) { this.shatter(a, 'landing'); return; }
    // magnet: finish the snap onto the mouth it was pulled toward (no near-miss beat, no PERFECT — it was assisted)
    if (a.magnetTarget) {
      const l = a.magnetTarget, cx = l.x + l.w / 2;
      if (Math.abs(a.x - cx) <= CC.CONFIG.MAGNET.snapPx * 3) {
        a.x = cx; a.snapped = true; run.stats.magnetSnaps++;
        this.g.fx.trail(a.x, a.y, '#7be0ff'); this.g.fx.floatText(a.x, a.y - 30, 'SNAP', '#7be0ff', 18, { punch: 1 });
        this.g.audio.pneumatic('snap'); // Kade audio — magnet snap onto the lane mouth
        if (a.vy > 700) this.g.fx.doShake(1.5);
        this.evaluate(a, l, false);
        return;
      }
    }
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
  remove(a) { const i = this.pieces.indexOf(a); if (i >= 0) this.pieces.splice(i, 1); this.release(a); }
  seat(a, lane, perfect) {
    const run = this.run, C = CC.CONFIG.COLORS, F = CC.CONFIG.FEVER;
    run.stats.streak++;
    run.stats.bestStreak = Math.max(run.stats.bestStreak, run.stats.streak);
    run.stats.sorted++;
    lane.flashT = 0.35;
    this.g.fx.accept(a.x, lane.y, a.golden ? '#ffd65a' : a.type.color);
    this.g.audio.pop();
    this.g.audio.snap(perfect); // Kade audio
    this.g.audio.streakPitch(run.stats.streak); // Kade audio — pitch climbs with the live streak
    this.g.sessionHints.sort = true;
    run.ftueDone('sort');
    // score: base 10 × fever multiplier, ×3 for golden, +5 perfect; fever builds on every good sort (×1.25 in Rush Hour)
    let base = 10 + (perfect ? 5 : 0);
    if (a.golden) { base *= CC.CONFIG.GOLDEN_SCORE_MULT; run.stats.golden++; }
    const gained = run.addScore(base);
    run.addFever((F.gainSort + (perfect ? F.gainPerfect : 0) + (a.golden ? F.gainGolden : 0)) * (this.rush ? CC.CONFIG.EVENTS.rush.feverGainMul : 1));
    if (a.golden) this.g.fx.floatText(a.x, lane.y - 74, `GOLDEN +${gained}`, '#ffd65a', 26, { punch: 1 });
    else if (perfect) { this.g.fx.floatText(a.x, lane.y - 74, `PERFECT +${gained}`, C.Safe, 20, { punch: 1 }); }
    if (perfect) this.g.fx.hapticPerfect();
    const s = run.stats.streak;
    if (s >= 2 && s % CC.ECON.STREAK_STEP_SORTS === 0) {
      const pct = CC.ECON.streakBonusPct(s);
      this.g.fx.floatText(a.x, lane.y - 50, `STREAK ${s} · +${pct}%`, C.Warn, 24, { punch: 1 });
      this.g.fx.hapticStreak(s / CC.ECON.STREAK_STEP_SORTS);
      this.g.audio.chime(s / CC.ECON.STREAK_STEP_SORTS); // Kade audio — escalating combo chime
    } else if (s >= 2 && !perfect) this.g.fx.hapticStreak(0);
    this.seatAnims.push({ type: a.type, x: a.x, y: lane.y, lane, t: 0, golden: a.golden });
    this.remove(a);
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
    this.g.audio.splat();
    this.g.audio.error(hazard || (lane ? 'wrong_lane' : 'spill')); // Kade audio
    if (lane) lane.flashT = 0.2;
    this.spilled.push({ type: a.type, x: a.x, y: lane ? lane.y + 6 : a.y, t: 0 });
    // spilled cargo goes back on the pile — spills cost lives/time, not completeness
    // (a detonated piece comes back stable, shattered glass comes back bubble-wrapped; magnet stays magnet)
    this.queue.push({ type: a.type, golden: a.golden, timed: hazard === 'unstable' ? false : a.timed, fragile: hazard === 'shatter' ? false : a.fragile, magnet: a.magnet });
    this.remove(a);
    this.spawnT = this.cadenceNow() + 0.25;
    if (run.stats.spills >= run.lv.spillsAllowed) { this.pendingFail = 0.55; this.paused = true; }
  }
  shieldAvailable() { return !!this.g.p.talents.streak_shield && !this.run.stats.shieldUsed; }

  timeoutSpill(a) {
    // sat too long on the conveyor → rolls off (floor spill)
    a.state = 'fly'; a.vx = CC.U.rand(-80, 80); a.vy = 200; a.timedOut = true; a.assisted = true;
  }
  detonate(a) {
    // unstable piece ran out its fuse wherever it is (conveyor or in hand) → spill on the spot
    this.run.stats.timedSpills++;
    this.release(a);
    this.spill(a, null, 'floor', 'unstable');
  }
  shatter(a, how) {
    // fragile glass broke (hard flick / wall / landing) → glass shards + spill on the spot
    const hints = this.g.sessionHints;
    this.run.stats.glassShattered++;
    this.g.fx.splinters(a.x - 20, a.y - 20, 40, 40, ['#dff4ff', '#7be0ff', '#ffffff'], 10, Math.max(a.y + 30, CC.CONFIG.LANES.y + 20));
    this.g.fx.smashBurst(a.x, a.y, '#dff4ff', false);
    this.g.fx.floatText(a.x, a.y - 84, hints.shatter ? 'SHATTERED' : { flick: 'SHATTERED — TOO HARD', wall: 'SHATTERED — WALL', landing: 'SHATTERED — TOO HIGH' }[how], '#7be0ff', 20, { punch: 1, life: 1.2 });
    hints.shatter = true;
    this.g.audio.fracture('glass', true); // Kade audio
    this.spill(a, null, 'floor', 'shatter');
  }

  update(dt) {
    const run = this.run, L = CC.CONFIG.LANES, g = CC.CONFIG.GRAVITY, M = CC.CONFIG.MAGNET, G = CC.CONFIG.GLASS;
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

    // feed: one belt = one piece at a time; Rush Hour = a piece per belt plus one in the air
    if (!this.pieces.length && !this.queue.length) { if (!this.seatAnims.length) run.sortComplete(); return; }
    if (this.queue.length) {
      const onBelt = this.pieces.filter((a) => a.state !== 'fly' && a.state !== 'settle').length;
      const can = this.belts === 1 ? this.pieces.length === 0 : onBelt < this.belts && this.pieces.length < this.belts + 1;
      if (can) { this.spawnT -= dt; if (this.spawnT <= 0) this.spawn(); }
    }

    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const a = this.pieces[i];
      a.sq.x += (1 - a.sq.x) * Math.min(1, dt * 10); a.sq.y += (1 - a.sq.y) * Math.min(1, dt * 10);
      // the fuse keeps burning while waiting AND while held — holding an unstable piece is not a way out
      if (a.timed && (a.state === 'wait' || a.state === 'grab') && !this.g.freezeTimer) {
        a.fuseT += dt;
        if (a.fuseT >= CC.CONFIG.TIMED_FUSE_S) { this.detonate(a); continue; }
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
          a.y = CC.CONFIG.CONVEYOR_Y + Math.sin(this.t * 5 + a.belt) * 3;
          if (a.waitT > this.waitFor(a)) this.timeoutSpill(a);
          break;
        }
        case 'grab': {
          const inp = this.g.input;
          a.x += (inp.x - a.x) * Math.min(1, dt * 20);
          a.y += (inp.y - 30 - a.y) * Math.min(1, dt * 20);
          if (this.t % 0.06 < dt) this.g.fx.trail(a.x, a.y + 10, run.feverTier >= 2 ? run.feverColor() : CC.U.desat(a.type.color, 0.3));
          // finger deep inside a lane = drop into the lane under the finger (robust even if the release is never seen)
          if (inp.y >= L.y + 24 && run.laneAt(inp.x)) this.dropAt(inp.x, a);
          break;
        }
        case 'fly': {
          // exact constant-gravity step (frame-rate independent), then interpolate the lane-mouth crossing
          const px = a.x, py = a.y;
          // magnet: below fromY, steer toward the nearest lane mouth inside the radius (whatever type it takes)
          if (a.magnet && !a.assisted && a.y > M.fromY && a.vy > 0) {
            let best = null, bd = M.radius;
            for (const l of run.lanes) { const d = Math.abs(a.x - (l.x + l.w / 2)); if (d < bd) { bd = d; best = l; } }
            a.magnetTarget = best;
            if (best) {
              const T = Math.max(0.05, (-a.vy + Math.sqrt(a.vy * a.vy + 2 * g * Math.max(1, L.y - a.y))) / g);
              const want = (best.x + best.w / 2 - a.x) / T;
              a.vx += (want - a.vx) * Math.min(1, dt * M.strength);
            }
          }
          a.x += a.vx * dt; a.y += (a.vy + 0.5 * g * dt) * dt; a.vy += g * dt; a.rot += (a.vx / 300) * dt * 4;
          if (this.t % 0.04 < dt) this.g.fx.trail(a.x, a.y, run.feverTier >= 2 ? run.feverColor() : a.type.color);
          if (a.x < CC.CONFIG.WALL_L || a.x > CC.CONFIG.WALL_R) {
            if (a.fragile && !a.assisted && Math.abs(a.vx) > G.wallVx) { a.x = CC.U.clamp(a.x, CC.CONFIG.WALL_L, CC.CONFIG.WALL_R); this.shatter(a, 'wall'); continue; }
            if (a.x < CC.CONFIG.WALL_L) { a.x = CC.CONFIG.WALL_L; a.vx = Math.abs(a.vx) * (1 - this.bounceLoss); }
            else { a.x = CC.CONFIG.WALL_R; a.vx = -Math.abs(a.vx) * (1 - this.bounceLoss); }
            a.sq = { x: 0.7, y: 1.3 };
          }
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
  }

  draw(ctx) {
    const C = CC.CONFIG.COLORS, run = this.run, mute = this.mute();
    // queue preview (next up) at the pile spot
    this.queue.slice(0, 6).forEach((piece, i) => CC.drawCargo(ctx, piece.type, 270 + (i - 2.5) * 30, 392, 18, 'idle', { golden: piece.golden, mute }));
    if (this.queue.length) CC.U.text(ctx, `${this.remaining()} left`, 270, 424, { size: 12, weight: 800, color: C.Text_Secondary });
    // conveyor plate(s) — Rush Hour opens a second belt; amber chevrons run along live belts
    for (let i = 0; i < this.belts; i++) {
      const bx = this.beltX(i) - 80, by = CC.CONFIG.CONVEYOR_Y + 26;
      CC.U.fillRRect(ctx, bx, by, 160, 14, 6, '#1f242c');
      if (this.rush) { ctx.fillStyle = '#e0b640'; const off = (this.t * 160) % 24; for (let x = bx + 6 + off; x < bx + 150; x += 24) ctx.fillRect(x, by + 4, 10, 6); }
      CC.U.strokeRRect(ctx, bx, by, 160, 14, 6, this.rush ? C.Warn : C.Outline, 2);
    }
    // spilled (state: spill)
    for (const s of this.spilled) { ctx.globalAlpha = 1 - s.t / 1.2; CC.drawCargo(ctx, s.type, s.x, s.y, 40, 'spill', { mute }); ctx.globalAlpha = 1; }
    // seating animation
    for (const s of this.seatAnims) { const k = s.t / 0.16; CC.drawCargo(ctx, s.type, s.x, s.y + k * 60, 40 - k * 14, 'seat', { golden: s.golden, mute }); }
    // live pieces (held piece drawn last so it sits on top)
    const order = this.pieces.slice().sort((p, q) => (p === this.grab) - (q === this.grab));
    for (const a of order) {
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
      // magnet pull: dashed field line to the mouth it is being drawn toward
      if (a.state === 'fly' && a.magnetTarget) {
        const l = a.magnetTarget;
        ctx.strokeStyle = '#7be0ff'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -this.t * 60;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(l.x + l.w / 2, l.y); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      }
      const state = a.state === 'fly' || a.state === 'settle' ? 'airborne' : 'idle';
      CC.drawCargo(ctx, a.type, a.x, a.y, 46, state, { rot: a.rot, squash: a.sq, golden: a.golden, timed: a.timed, fragile: a.fragile, magnet: a.magnet, mute });
      if (a.state === 'grab') {
        // direction affordance: matching lane marker (only glyph, no arrow spam)
        const exp = run.expectedLaneFor(a.type);
        if (exp && this.g.p.talents.filter_glove) { ctx.strokeStyle = a.type.color; ctx.lineWidth = 4; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(a.x, a.y + 30); ctx.lineTo(exp.x + exp.w / 2, exp.y - 10); ctx.stroke(); ctx.setLineDash([]); }
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
