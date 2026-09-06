/* App root: screen manager + fixed-step loop. Screen IDs are Vale-canonical (SCR_*). */
window.CC = window.CC || {};

CC.Game = class {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fx = new CC.FX();
    this.audio = new CC.Audio();
    this.tlm = new CC.Telemetry();
    this.save = new CC.Save();
    this.applySettings();
    this.input = new CC.Input(canvas, (type, e) => this.pointer(type, e));
    this.screens = {
      SCR_Boot: new CC.BootScreen(this),
      SCR_Hub: new CC.HubScreen(this),
      SCR_DockBrief: new CC.DockBriefScreen(this),
      DockRun: new CC.DockRunScreen(this),
      SCR_Upgrade: new CC.UpgradeScreen(this),
      SCR_AssetSheet: new CC.AssetSheetScreen(this),
    };
    this.current = null; this.currentId = null;
    this.last = performance.now();
    this.time = 0;
    this.bot = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // session lifecycle: new session_id on every cold/warm start
    this.tlm.startSession(true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.tlm.endSession('background');
      else if (this.tlm.ended) this.tlm.startSession(false);
    });
    window.addEventListener('pagehide', () => this.tlm.endSession('pagehide'));

    window.addEventListener('keydown', (e) => { if (e.key === '`' || e.key === '~') CC.dev && CC.dev.toggle(); });
  }

  get p() { return this.save.p; }
  applySettings() {
    const s = this.save.p.settings;
    this.audio.setEnabled(!!s.audio);
    this.fx.hapticsEnabled = !!s.haptics;
    this.fx.scale = s.capture ? 1.35 : 1;
  }

  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const s = Math.min(vw / CC.CONFIG.W, vh / CC.CONFIG.H);
    this.canvas.style.width = Math.floor(CC.CONFIG.W * s) + 'px';
    this.canvas.style.height = Math.floor(CC.CONFIG.H * s) + 'px';
  }

  go(id, params) {
    if (this.current && this.current.exit) this.current.exit();
    this.fx.texts.length = 0; this.fx.particles.length = 0;
    this.currentId = id;
    this.current = this.screens[id];
    this.current.enter(params || {});
    if (CC.dev) CC.dev.refresh();
  }

  // Rewarded-video stub (no live ads SDK): placement ∈ revive | double_reward | skip_wait | other
  rvStub(placement, levelId, cb) { this.rvOverlay = new CC.RVStub(this, placement, levelId, cb); }

  pointer(type, e) {
    if (this.rvOverlay) { this.rvOverlay.onPointer(type, e); return; }
    if (this.current && this.current.onPointer) this.current.onPointer(type, e);
  }

  start() {
    const sheet = CC.U.query('sheet');
    this.go(sheet ? 'SCR_AssetSheet' : 'SCR_Boot');
    if (CC.U.query('bot')) this.bot = new CC.Bot(this, { autodownload: !!CC.U.query('autodownload') });
    requestAnimationFrame((t) => this.frame(t));
  }

  frame(t) {
    let dt = (t - this.last) / 1000; this.last = t;
    if (dt > 0.1) dt = 0.1;
    this.time += dt;
    if (this.rvOverlay) this.rvOverlay.update(dt);
    else if (this.fx.hitStop > 0) { this.fx.hitStop -= dt; }
    else if (this.current && this.current.update) this.current.update(dt);
    this.fx.update(dt);
    if (this.bot) this.bot.update(dt);

    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.fx.shake > 0) ctx.translate(CC.U.rand(-this.fx.shake, this.fx.shake), CC.U.rand(-this.fx.shake, this.fx.shake));
    if (this.current && this.current.draw) this.current.draw(ctx);
    if (!(this.current && this.current.drawsFX)) this.fx.draw(ctx);
    if (this.rvOverlay) this.rvOverlay.draw(ctx);
    ctx.restore();
    requestAnimationFrame((tt) => this.frame(tt));
  }
};

window.addEventListener('DOMContentLoaded', () => {
  if (CC.U.query('reset')) { try { localStorage.clear(); } catch (_) {} }
  const canvas = document.getElementById('game');
  CC.game = new CC.Game(canvas);
  CC.dev = new CC.DevPanel(CC.game);
  CC.game.start();
});
