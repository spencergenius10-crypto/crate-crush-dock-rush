/* Overlay_Results (SCR_Results) — haul summary (values from systems), streak, "beat my X" end card,
 * cliffhanger caption "ONE MORE DOCK?". Coins are batched here (no popups mid Smash/Sort).
 * Organic loop: SHARE SCORE (score card + link) and CHALLENGE A FRIEND (deep link with target haul). */
window.CC = window.CC || {};

CC.OverlayResults = class {
  constructor(run, cleared) {
    this.run = run; this.g = run.g; this.cleared = cleared; this.t = 0;
    const p = this.g.p, lv = run.lv, s = run.stats;
    run.result = cleared ? 'clear' : 'fail';
    this.unlock = null;
    this.toast = null;
    this.shareFile = null; this.cardRequested = false; this.sharing = false;
    this.bonusPct = CC.ECON.streakBonusPct(s.bestStreak);
    this.coins = cleared ? Math.round(lv.baseCoins * (1 + this.bonusPct / 100)) : 0;
    // haul = coins + streak + crates + time-left + the fever-multiplied run score (golden ×3, perfect +5 ride in there)
    this.haulScore = cleared ? this.coins + s.bestStreak * 10 + s.smashed * 2 + Math.max(0, Math.round(run.timer)) + s.score : s.smashed * 2 + s.sorted * 3 + Math.round(s.score / 2);
    if (cleared) {
      this.g.save.addCoins(this.coins);
      p.cleared[lv.id] = (p.cleared[lv.id] || 0) + 1;
      // progression is strictly sequential — a Challenge link can open any dock but never skips the ladder
      if (lv.n === p.nextLevel) p.nextLevel = Math.min(50, lv.n + 1);
      p.stats.docks_cleared++;
      p.bestStreak = Math.max(p.bestStreak, s.bestStreak);
      p.bestHaul = Math.max(p.bestHaul, this.haulScore);
      if (lv.n === 3 && !p.talents.filter_glove) { p.talents.filter_glove = true; this.unlock = 'FILTER GLOVE UNLOCKED — FREE'; }
      if (s.misses === 0 && lv.n >= 21 && Math.random() < 0.15) { p.shards++; this.unlock = (this.unlock ? this.unlock + ' · ' : '') + '+1 SHARD'; }
      this.g.save.save();
      this.g.audio.coin();
    }
    // friend's challenge on this dock: compare, and retire it once beaten
    this.challenge = p.challenge && p.challenge.n === lv.n ? p.challenge : null;
    this.beaten = !!(this.challenge && cleared && this.haulScore > this.challenge.score);
    if (this.beaten) { p.challenge = null; this.g.save.save(); }
    this.build();
  }
  payload() {
    return { n: this.run.lv.n, score: this.haulScore, streak: this.run.stats.bestStreak, time: Math.round(this.run.elapsed), cleared: this.cleared };
  }
  build() {
    const s = this.run.stats;
    this.buttons = [];
    this.buttons.push(new CC.Button({ id: 'res_share', x: 60, y: 620, w: 204, h: 52, label: 'SHARE RUN', size: 15, kind: 'ghost', onTap: () => this.share('score') }));
    this.buttons.push(new CC.Button({ id: 'res_challenge', x: 276, y: 620, w: 204, h: 52, label: 'CHALLENGE A FRIEND', size: 14, kind: 'ghost', onTap: () => this.share('challenge') }));
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
  // Pre-render the PNG score card once the hero number has finished counting so the file is ready at tap time
  // (navigator.share must run inside the user gesture; an await before it would burn the activation on some browsers).
  prepareCard() {
    if (this.cardRequested) return;
    this.cardRequested = true;
    CC.Share.cardFile(this.payload(), { crates: this.run.stats.smashed }).then((f) => { this.shareFile = f; });
  }
  share(kind) {
    if (this.sharing) return;
    this.sharing = true;
    this.g.audio.chime(0); // Kade audio — share button
    const ch = this.payload();
    const url = CC.Share.challengeURL(ch);
    const payload = { title: 'Crate Crush: Dock Rush', text: CC.Share.text(kind, ch), url };
    const file = kind === 'score' ? this.shareFile : null;
    CC.Share.deliver(payload, file).then((method) => {
      this.sharing = false;
      this.g.tlm.share({ kind, method, level_id: this.run.levelId, result: this.run.result, haul_score: this.haulScore, with_image: !!file && method === 'web_share' });
      const msg = { web_share: 'SHARED', clipboard: 'LINK COPIED', prompt: 'LINK READY', cancelled: null, failed: 'SHARE UNAVAILABLE' }[method];
      if (msg) this.showToast(msg);
    });
  }
  showToast(str) { this.toast = { str, t: 0 }; }
  update(dt) {
    this.t += dt;
    if (this.t > 0.9) this.prepareCard();
    if (this.toast) { this.toast.t += dt; if (this.toast.t > 1.8) this.toast = null; }
  }
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
    CC.UI.panel(ctx, 40, 230, 460, 550, { stroke: this.cleared ? C.Safe : C.Fail });
    CC.U.text(ctx, this.cleared ? 'DOCK CLEAR' : 'DOCK FAILED', W / 2, 280, { size: 44, weight: 900, color: this.cleared ? C.Warn : C.Fail, stroke: C.Outline, strokeWidth: 8 });
    CC.U.text(ctx, `${run.lv.name} · attempt ${run.attempt_n}${this.cleared ? '' : ' · ' + (run.failReason || 'fail')}`, W / 2, 316, { size: 14, weight: 700, color: C.Text_Secondary });

    // hero metric (T5 "beat my X") — big, readable end card
    CC.UI.panel(ctx, 70, 340, 400, 100, { fill: C.BG_UI2, stroke: '#3a4250' });
    CC.U.text(ctx, this.cleared ? 'HAUL SCORE' : 'PROGRESS', W / 2, 364, { size: 13, weight: 800, color: C.Text_Secondary });
    const shown = Math.round(Math.min(1, this.t / 0.8) * (this.cleared ? this.haulScore : run.progressPct()));
    CC.U.text(ctx, this.cleared ? `${shown}` : `${shown}%`, W / 2, 404, { size: 54, weight: 900, color: C.Text_Primary });
    if (this.cleared && this.haulScore >= p.bestHaul && this.t > 0.9) CC.U.text(ctx, 'NEW BEST', 430, 364, { size: 12, weight: 900, color: C.Safe });

    // haul breakdown
    const fever = s.feverPeak ? `×${CC.CONFIG.FEVER.mults[s.feverPeak]} peak` : '—';
    const golden = s.golden ? ` · ${s.golden} golden` : '';
    const rows = this.cleared
      ? [['COINS', `+${CC.U.fmtCoins(this.coins)}${s.doubled ? ' ×2' : ''}`], ['BASE + STREAK', `${run.lv.baseCoins} +${this.bonusPct}%`], ['RUN SCORE · FEVER', `${s.score}${golden} · ${fever}`], ['BEST STREAK', `${s.bestStreak}`], ['CRATES', `${s.smashed}`], ['MISSES', `${s.misses}`], ['TIME', `${Math.round(run.elapsed)}s`]]
      : [['COINS', '0 (progress discarded)'], ['RUN SCORE · FEVER', `${s.score}${golden} · ${fever}`], ['CRATES', `${s.smashed}/${run.lv.crates}`], ['SORTED', `${s.sorted}/${run.cargoTotal}`], ['MISSES', `${s.misses}`], ['BEST STREAK', `${s.bestStreak}`], ['TIME', `${Math.round(run.elapsed)}s`]];
    rows.forEach(([a, b], i) => {
      const y = 458 + i * 21;
      CC.U.text(ctx, a, 80, y, { size: 13, weight: 800, align: 'left', color: C.Text_Secondary });
      CC.U.text(ctx, b, 460, y, { size: 15, weight: 900, align: 'right', color: i === 0 ? C.Warn : a.startsWith('RUN SCORE') ? '#ffd65a' : C.Text_Primary });
    });
    // one status line: unlock and/or friend's challenge verdict
    const status = [];
    if (this.unlock) status.push(this.unlock);
    if (this.challenge) status.push(this.beaten ? `CHALLENGE BEATEN · friend ${this.challenge.score}` : `CHALLENGE · friend ${this.challenge.score} · not yet`);
    if (status.length) CC.U.text(ctx, status.join(' · '), W / 2, 604, { size: 13, weight: 900, color: this.challenge && !this.beaten ? C.Warn : C.Safe });
    for (const b of this.buttons) b.draw(ctx);
    ctx.restore();

    // bottom-safe caption slot: share toast wins over the cliffhanger while it is up
    if (this.toast) {
      const kk = Math.min(1, this.toast.t / 0.15) * (this.toast.t > 1.4 ? 1 - (this.toast.t - 1.4) / 0.4 : 1);
      ctx.globalAlpha = Math.max(0, kk);
      CC.U.text(ctx, this.toast.str, W / 2, 810, { size: 30, weight: 900, color: C.Safe, stroke: C.Outline, strokeWidth: 9 });
      ctx.globalAlpha = 1;
    } else if (this.t > 1.0) {
      // cliffhanger caption (Ari 3.5–5.0s) — ≤6 words, high contrast, bottom-safe
      const kk = Math.min(1, (this.t - 1.0) / 0.3);
      const pulse = 1 + Math.sin(this.t * 4) * 0.03;
      ctx.globalAlpha = kk;
      CC.U.text(ctx, this.cleared ? 'ONE MORE DOCK?' : 'RUN IT BACK?', W / 2, 810, { size: 34 * pulse, weight: 900, color: C.Text_Primary, stroke: C.Outline, strokeWidth: 9 });
      ctx.globalAlpha = 1;
    }
  }
};
