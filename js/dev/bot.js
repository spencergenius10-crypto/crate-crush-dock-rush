/* Autoplay bot — scripted acceptance session (?bot=1). Plays 2 docks through the real input path:
 *  dock 1: smash → 3 deliberate spills → Revive (rv) → clean sort → truck FULL → 2× haul (rv) → Upgrade (buy smash + iap stub)
 *  dock 2: smash → 3 spills → Revive declined → dock_fail → Results → Hub → session_end
 * Result: ≥1 of every Kade must-ship event in one session. Exposes window.CC_BOT_DONE for headless runners. */
window.CC = window.CC || {};

CC.Bot = class {
  constructor(g, opts) {
    this.g = g; this.opts = opts || {};
    this.tick = 0; this.docks = 0; this.lastScreen = null; this.done = false; this.upgradeStep = 0; this.wait = 0;
    this.log = [];
    window.CC_BOT_DONE = false;
    window.CC_BOT_LOG = this.log;
  }
  say(s) { this.log.push(s); if (!CC.QUIET_TELEMETRY) console.log('[CC_BOT] ' + s); }
  tapButton(screenOrOverlay, id) {
    const b = (screenOrOverlay.buttons || []).find((x) => x.id === id);
    if (!b || !b.enabled) return false;
    this.g.input.tap(b.x + b.w / 2, b.y + b.h / 2);
    this.say(`tap ${id}`);
    return true;
  }
  update(dt) {
    if (this.done) return;
    this.tick += dt;
    if (this.wait > 0) { this.wait -= dt; return; }
    const g = this.g, id = g.currentId, scr = g.current;
    if (id !== this.lastScreen) { this.lastScreen = id; this.say(`screen ${id}`); if (id === 'DockRun') { this.docks++; this.upgradeStep = 0; } }
    if (g.rvOverlay) return; // let the rewarded stub complete (never skip in the acceptance run)

    if (id === 'SCR_Boot') { g.input.tap(270, 480); this.wait = 0.2; return; }
    if (id === 'SCR_Hub') {
      if (this.docks >= 2) return this.finish();
      if (scr.tab !== 'docks') { this.tapButton(scr, 'tab_docks'); this.wait = 0.2; return; }
      this.tapButton(scr, 'play'); this.wait = 0.3; return;
    }
    if (id === 'SCR_DockBrief') { this.tapButton(scr, 'start'); this.wait = 0.3; return; }
    if (id === 'SCR_Upgrade') {
      this.wait = 0.35;
      if (this.upgradeStep === 0) { this.upgradeStep++; if (!this.tapButton(scr, 'confirm')) this.say('smash upgrade not affordable yet'); return; }
      if (this.upgradeStep === 1) { this.upgradeStep++; this.tapButton(scr, 'tab_shop'); return; }
      if (this.upgradeStep === 2) { this.upgradeStep++; this.tapButton(scr, 'sku_cc_starter_kit_099'); return; }
      this.tapButton(scr, 'back'); return;
    }
    if (id === 'DockRun') return this.playDock(scr, dt);
  }
  playDock(run) {
    const ov = run.overlay;
    if (ov instanceof CC.OverlayRevive) {
      this.wait = 0.4;
      if (this.docks === 1) this.tapButton(ov, 'revive_rv'); else this.tapButton(ov, 'revive_decline');
      return;
    }
    if (ov instanceof CC.OverlayResults) {
      this.wait = 0.5;
      if (ov.cleared) { if (!run.stats.doubled && this.docks === 1) this.tapButton(ov, 'res_double'); else this.tapButton(ov, 'res_continue'); }
      else this.tapButton(ov, 'res_continue');
      return;
    }
    if (run.phaseName === 'smash') {
      const alive = run.smash.crates.filter((c) => c.alive);
      if (alive.length) {
        const c = CC.U.pick(alive), cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        this.g.input.tap(cx, cy);
        if (c.frozen) this.g.input.tap(cx, cy); // frozen crate: the rule is a double tap
        this.wait = 0.09;
      }
      return;
    }
    if (run.phaseName === 'sort') {
      const s = run.sort, a = s.active;
      if (!a || a.state !== 'wait' || s.paused) return;
      const wantMiss = run.stats.revives === 0 && run.stats.spills < run.lv.spillsAllowed && run.stats.misses < 3;
      if (wantMiss) {
        const wrong = run.lanes.filter((l) => !run.laneAccepts(l, a.type));
        if (wrong.length) { s.flingToLane(CC.U.pick(wrong).idx); this.say(`deliberate miss (${a.type.id})`); this.wait = 0.5; return; }
      }
      const exp = run.expectedLaneFor(a.type);
      if (exp && run.laneAccepts(exp, a.type)) { s.flingToLane(exp.idx, true); this.wait = 0.25; }
      return;
    }
  }
  finish() {
    this.done = true;
    this.g.tlm.endSession('bot_done');
    this.say('done');
    if (CC.dev) CC.dev.refresh();
    window.CC_BOT_DONE = true;
    if (this.opts.autodownload) this.g.tlm.download(true);
  }
};
