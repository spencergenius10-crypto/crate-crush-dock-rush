/* SCR_Boot — Ratio / Crate Crush mark (+ Mode chip), one beat, tap to skip → SCR_Hub */
window.CC = window.CC || {};

CC.BootScreen = class {
  constructor(g) { this.g = g; }
  enter() { this.t = 0; }
  update(dt) { this.t += dt; if (this.t > 1.4) this.g.go('SCR_Hub'); }
  onPointer(type) { if (type === 'up') this.g.go('SCR_Hub'); }
  draw(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, H = CC.CONFIG.H;
    ctx.fillStyle = C.BG_UI; ctx.fillRect(0, 0, W, H);
    const k = CC.U.easeOutBack(Math.min(1, this.t / 0.6));
    ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.scale(k, k);
    CC.drawAsset('CC_DockRush_Crate_Wood_Closed_v1', ctx, -60, -60, 120, 120);
    ctx.restore();
    if (this.t > 0.4) CC.UI.brandLockup(ctx, W / 2, H / 2 + 60, { size: 44 });
    CC.U.text(ctx, CC.BRAND.studio.toUpperCase() + ' · PROTOTYPE ' + CC.CONFIG.APP_VER, W / 2, H - 60, { size: 13, weight: 600, color: C.Text_Secondary });
    CC.U.text(ctx, 'tap to skip', W / 2, H - 36, { size: 12, weight: 600, color: '#5f6a7a' });
  }
};
