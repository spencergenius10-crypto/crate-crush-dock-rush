/* Overlay_Results (SCR_Results) — haul summary (values from systems), streak, "beat my X" end card,
 * cliffhanger caption "ONE MORE DOCK?". Coins are batched here (no popups mid Smash/Sort). */
window.CC = window.CC || {};

CC.OverlayResults = class {
  constructor(run, cleared) {
    this.run = run; this.g = run.g; this.cleared = cleared; this.t = 0;
    const p = this.g.p, lv = run.lv, s = run.stats;
    run.result = cleared ? 'clear' : 'fail';
    this.unlock = null;
    this.bonusPct = CC.ECON.streakBonusPct(s.bestStreak);
    this.coins = cleared ? Math.round(lv.baseCoins * (1 + this.bonusPct / 100)) : 0;
    this.haulScore = cleared ? this.coins + s.bestStreak * 10 + s.smashed * 2 + Math.max(0, Math.round(run.timer)) : s.smashed * 2 + s.sorted * 3;
    if (cleared) {
      this.g.save.addCoins(this.coins);
      p.cleared[lv.id] = (p.cleared[lv.id] || 0) + 1;
      p.nextLevel = Math.max(p.nextLevel, Math.min(50, lv.n + 1));
      p.stats.docks_cleared++;
      p.bestStreak = Math.max(p.bestStreak, s.bestStreak);
      p.bestHaul = Math.max(p.bestHaul, this.haulScore);
      if (lv.n === 3 && !p.talents.filter_glove) { p.talents.filter_glove = true; this.unlock = 'FILTER GLOVE UNLOCKED — FREE'; }
      if (s.misses === 0 && lv.n >= 21 && Math.random() < 0.15) { p.shards++; this.unlock = (this.unlock ? this.unlock + ' · ' : '') + '+1 SHARD'; }
      this.g.save.save();
      this.g.audio.coin();
    }
    this.build();
  }
  build() {
    const s = this.run.stats;
    this.buttons = [];
    if (this.cleared) {
      this.buttons.push(new CC.Button({ id: 'res_double', x: 60, y: 690, w: 204, h: 68, label: '2× HAUL', sub: s.doubled ? 'claimed' : 'watch an ad', size: 20, kind: 'ghost', enabled: !s.doubled, onTap: () => this.doubleHaul() }));
      this.buttons.push(new CC.Button({ id: 'res_continue', x: 276, y: 690, w: 204, h: 68, label: 'CONTINUE', sub: 'upgrade bay', size: 20, onTap: () => this.g.go('SCR_Upgrade') }));
    } else {
      this.buttons.push(new CC.Button({ id: 'res_retry', x: 60, y: 690, w: 260, h: 68, label: 'RETRY', sub: 'same dock', size: 22, onTap: () => this.g.go('DockRun', { levelN: this.run.lv.n }) }));
      this.buttons.push(new CC.Button({ id: 'res_continue', x: 332, y: 690, w: 148, h: 68, label: 'CONTINUE', sub: 'upgrade bay', size: 16, kind: 'ghost', onTap: () => this.g.go('SCR_Upgrade') }));
    }
  }
  doubleHaul() {
    this.g.rvStub('double_reward', this.run.levelId, (completed) => {
      if (completed) {
        this.run.stats.doubled = true;
        this.g.save.addCoins(this.coins);
        this.g.fx.floatText(CC.CONFIG.W / 2, 600, `+${CC.U.fmtCoins(this.coins)}`, CC.CONFIG.COLORS.Warn, 34, { punch: 1 });
        this.g.audio.coin();
      }
      this.build();
    });
  }
  update(dt) { this.t += dt; }
  onPointer(type, e) {
    if (type === 'down') { for (const b of this.buttons) if (b.hit(e.x, e.y)) b.pressT = 0.1; }
    if (type !== 'up' || !e.isTap) return;
    for (const b of this.buttons) if (b.hit(e.x, e.y) && b.onTap) { this.g.audio.pop(); b.onTap(); return; }
  }
  draw(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, run = this.run, s = run.stats, p = this.g.p;
    CC.UI.dim(ctx, 0.62);
    const k = CC.U.easeOutBack(Math.min(1, this.t / 0.4));
    ctx.save(); ctx.translate(W / 2, 520); ctx.scale(k, k); ctx.translate(-W / 2, -520);
    CC.UI.panel(ctx, 40, 250, 460, 530, { stroke: this.cleared ? C.Safe : C.Fail });
    CC.U.text(ctx, this.cleared ? 'DOCK CLEAR' : 'DOCK FAILED', W / 2, 300, { size: 44, weight: 900, color: this.cleared ? C.Warn : C.Fail, stroke: C.Outline, strokeWidth: 8 });
    CC.U.text(ctx, `${run.lv.name} · attempt ${run.attempt_n}${this.cleared ? '' : ' · ' + (run.failReason || 'fail')}`, W / 2, 338, { size: 14, weight: 700, color: C.Text_Secondary });

    // hero metric (T5 "beat my X") — big, readable end card
    CC.UI.panel(ctx, 70, 366, 400, 110, { fill: C.BG_UI2, stroke: '#3a4250' });
    CC.U.text(ctx, this.cleared ? 'HAUL SCORE' : 'PROGRESS', W / 2, 392, { size: 13, weight: 800, color: C.Text_Secondary });
    const shown = Math.round(Math.min(1, this.t / 0.8) * (this.cleared ? this.haulScore : run.progressPct()));
    CC.U.text(ctx, this.cleared ? `${shown}` : `${shown}%`, W / 2, 440, { size: 54, weight: 900, color: C.Text_Primary });
    if (this.cleared && this.haulScore >= p.bestHaul && this.t > 0.9) CC.U.text(ctx, 'NEW BEST', 430, 392, { size: 12, weight: 900, color: C.Safe });

    // haul breakdown
    const rows = this.cleared
      ? [['COINS', `+${CC.U.fmtCoins(this.coins)}${s.doubled ? ' ×2' : ''}`], ['BASE + STREAK', `${run.lv.baseCoins} +${this.bonusPct}%`], ['BEST STREAK', `${s.bestStreak}`], ['CRATES', `${s.smashed}`], ['MISSES', `${s.misses}`], ['TIME', `${Math.round(run.elapsed)}s`]]
      : [['COINS', '0 (progress discarded)'], ['CRATES', `${s.smashed}/${run.lv.crates}`], ['SORTED', `${s.sorted}/${run.cargoTotal}`], ['MISSES', `${s.misses}`], ['BEST STREAK', `${s.bestStreak}`], ['TIME', `${Math.round(run.elapsed)}s`]];
    rows.forEach(([a, b], i) => {
      const y = 500 + i * 28;
      CC.U.text(ctx, a, 80, y, { size: 14, weight: 800, align: 'left', color: C.Text_Secondary });
      CC.U.text(ctx, b, 460, y, { size: 16, weight: 900, align: 'right', color: i === 0 ? C.Warn : C.Text_Primary });
    });
    if (this.unlock) CC.U.text(ctx, this.unlock, W / 2, 672, { size: 14, weight: 900, color: C.Safe });
    for (const b of this.buttons) b.draw(ctx);
    ctx.restore();

    // cliffhanger caption (Ari 3.5–5.0s) — ≤6 words, high contrast, bottom-safe
    if (this.t > 1.0) {
      const kk = Math.min(1, (this.t - 1.0) / 0.3);
      const pulse = 1 + Math.sin(this.t * 4) * 0.03;
      ctx.globalAlpha = kk;
      CC.U.text(ctx, this.cleared ? 'ONE MORE DOCK?' : 'RUN IT BACK?', W / 2, 810, { size: 34 * pulse, weight: 900, color: C.Text_Primary, stroke: C.Outline, strokeWidth: 9 });
      ctx.globalAlpha = 1;
    }
  }
};
