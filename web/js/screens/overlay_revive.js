/* Overlay_Revive (SCR_Revive) — soft-fail near-miss prompt. Accept → continue Sort; decline → Results.
 * Also hosts the rewarded-video stub (CC.RVStub) used by revive / double_reward / skip_wait placements. */
window.CC = window.CC || {};

CC.RVStub = class {
  constructor(g, placement, levelId, cb) {
    this.g = g; this.placement = placement; this.levelId = levelId; this.cb = cb;
    this.t = 0; this.dur = 2.5; this.done = false;
    this.skip = new CC.Button({ id: 'rv_skip', x: CC.CONFIG.W - 150, y: 130, w: 120, h: 44, label: 'SKIP ✕', size: 14, kind: 'ghost' });
  }
  update(dt) {
    this.t += dt;
    if (!this.done && this.t >= this.dur) this.finish(true);
  }
  finish(completed) {
    if (this.done) return;
    this.done = true;
    this.g.tlm.rvWatch({ placement: this.placement, level_id: this.levelId, completed, ad_network: null, ecpm_est: null });
    if (completed) { this.g.p.stats.rv_watched++; this.g.save.save(); }
    this.g.rvOverlay = null;
    this.cb(completed);
  }
  onPointer(type, e) {
    if (type === 'up' && e.isTap && this.t > 0.8 && this.skip.hit(e.x, e.y)) this.finish(false);
  }
  draw(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, H = CC.CONFIG.H;
    ctx.fillStyle = '#0b0d11'; ctx.fillRect(0, 0, W, H);
    CC.U.text(ctx, 'REWARDED AD (STUB)', W / 2, 200, { size: 22, weight: 900, color: C.Text_Secondary });
    CC.U.text(ctx, `placement: ${this.placement}`, W / 2, 236, { size: 14, weight: 700, color: '#5f6a7a' });
    // fake creative: bouncing crate
    const by = 440 + Math.sin(this.t * 6) * 30;
    CC.drawAsset('CC_DockRush_Crate_Wood_Closed_v1', ctx, W / 2 - 60, by - 60, 120, 120);
    CC.U.text(ctx, 'no live ads SDK in prototype', W / 2, 600, { size: 13, weight: 600, color: '#5f6a7a' });
    const k = Math.min(1, this.t / this.dur);
    CC.U.fillRRect(ctx, 70, 700, 400, 14, 7, C.BG_UI2);
    CC.U.fillRRect(ctx, 70, 700, 400 * k, 14, 7, C.Warn);
    CC.U.text(ctx, `${Math.ceil(Math.max(0, this.dur - this.t))}s`, W / 2, 740, { size: 16, weight: 800 });
    if (this.t > 0.8) this.skip.draw(ctx);
  }
};

CC.OverlayRevive = class {
  constructor(run, reason) {
    this.run = run; this.g = run.g; this.reason = reason; this.t = 0; this.msg = null;
    const p = this.g.p, lv = run.lv;
    this.coinCost = CC.ECON.reviveCoinCost(lv.n);
    const freeDailyOk = p.freeDailyReviveDate !== CC.U.todayUTC();
    const W = CC.CONFIG.W;
    this.buttons = [
      new CC.Button({ id: 'revive_rv', x: 60, y: 520, w: 420, h: 72, label: '▶ WATCH AD · REVIVE', sub: 'continue sorting', size: 22, kind: 'good', onTap: () => this.watchAd() }),
      new CC.Button({ id: 'revive_coins', x: 60, y: 604, w: 204, h: 64, label: `${CC.U.fmtCoins(this.coinCost)} coins`, sub: 'revive', size: 18, kind: 'ghost', enabled: p.coins >= this.coinCost, onTap: () => this.accept('currency', () => this.g.save.spend(this.coinCost)) }),
      new CC.Button({ id: 'revive_free', x: 276, y: 604, w: 204, h: 64, label: 'FREE DAILY', sub: freeDailyOk ? '1× per day' : 'used today', size: 18, kind: 'ghost', enabled: freeDailyOk, onTap: () => this.accept('free_daily', () => { p.freeDailyReviveDate = CC.U.todayUTC(); this.g.save.save(); return true; }) }),
      new CC.Button({ id: 'revive_decline', x: 60, y: 690, w: 420, h: 56, label: 'NO THANKS', size: 16, kind: 'ghost', onTap: () => this.run.onReviveDecline() }),
    ];
  }
  watchAd() {
    this.g.rvStub('revive', this.run.levelId, (completed) => {
      if (completed) this.run.onReviveAccept('rv');
      else this.msg = 'AD SKIPPED — no revive';
    });
  }
  accept(source, payFn) { if (payFn()) this.run.onReviveAccept(source); }
  update(dt) { this.t += dt; }
  onPointer(type, e) {
    if (type === 'down') { for (const b of this.buttons) if (b.hit(e.x, e.y)) b.pressT = 0.1; }
    if (type !== 'up' || !e.isTap) return;
    for (const b of this.buttons) if (b.hit(e.x, e.y) && b.onTap) { this.g.audio.pop(); b.onTap(); return; }
  }
  draw(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, run = this.run;
    CC.UI.dim(ctx, 0.6);
    const k = CC.U.easeOutBack(Math.min(1, this.t / 0.35));
    ctx.save(); ctx.translate(W / 2, 560); ctx.scale(k, k); ctx.translate(-W / 2, -560);
    CC.UI.panel(ctx, 40, 360, 460, 410, { stroke: C.Fail });
    CC.U.text(ctx, this.reason === 'timer' ? 'TIME UP!' : 'SPILLED!', W / 2, 410, { size: 44, weight: 900, color: C.Fail, stroke: C.Outline, strokeWidth: 8 });
    CC.U.text(ctx, 'continue sorting?', W / 2, 452, { size: 18, weight: 700, color: C.Text_Secondary });
    CC.U.text(ctx, `${run.progressPct()}% loaded · ${run.sort.remaining()} cargo left`, W / 2, 486, { size: 15, weight: 800 });
    for (const b of this.buttons) b.draw(ctx);
    if (this.msg) CC.U.text(ctx, this.msg, W / 2, 758, { size: 13, weight: 800, color: C.Warn });
    ctx.restore();
  }
};
