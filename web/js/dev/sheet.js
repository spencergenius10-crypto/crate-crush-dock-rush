/* SCR_AssetSheet — renders every CC_DockRush_* placeholder; toggle a 1-bit (desaturate + threshold)
 * preview for Vale's silhouette test. Reach via Settings or ?sheet=1 */
window.CC = window.CC || {};

CC.AssetSheetScreen = class {
  constructor(g) { this.g = g; this.onebit = false; }
  enter() {
    this.buttons = [
      new CC.Button({ id: 'onebit', x: 30, y: 872, w: 300, h: 56, label: this.onebit ? '1-BIT: ON' : '1-BIT: OFF', size: 16, kind: this.onebit ? 'good' : 'ghost', onTap: () => { this.onebit = !this.onebit; this.enter(); } }),
      new CC.Button({ id: 'back', x: 350, y: 872, w: 160, h: 56, label: '← HUB', size: 16, kind: 'ghost', onTap: () => this.g.go('SCR_Hub') }),
    ];
    if (!this.off) { this.off = document.createElement('canvas'); this.off.width = CC.CONFIG.W; this.off.height = CC.CONFIG.H; }
  }
  update() {}
  onPointer(type, e) {
    if (type !== 'up' || !e.isTap) return;
    for (const b of this.buttons) if (b.hit(e.x, e.y) && b.onTap) { b.onTap(); return; }
  }
  draw(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, H = CC.CONFIG.H;
    const target = this.onebit ? this.off.getContext('2d') : ctx;
    target.fillStyle = C.BG_Dock; target.fillRect(0, 0, W, H);
    CC.U.text(target, 'CC_DockRush_* ASSET SHEET', W / 2, 40, { size: 22, weight: 900 });
    CC.U.text(target, 'silhouette-first placeholders · thumbnail test = 1-bit + shrink', W / 2, 66, { size: 12, weight: 600, color: C.Text_Secondary });
    const ids = Object.keys(CC.ASSETS);
    const cols = 4, cw = 120, ch = 118, x0 = 30, y0 = 90;
    ids.forEach((id, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = x0 + c * cw, y = y0 + r * ch;
      target.fillStyle = C.BG_DockDark; target.fillRect(x, y, cw - 8, ch - 8);
      const a = CC.ASSETS[id];
      const opts = { color: '#3d8bfd', type: CC.CARGO[1], ratio: 0.6, label: 'STREAK 12', full: false };
      if (a.cat === 'Lane') CC.drawAsset(id, target, x + 26, y + 18, 60, 62, opts);
      else CC.drawAsset(id, target, x + 26, y + 12, 60, 60, opts);
      CC.U.text(target, id.replace('CC_DockRush_', '').replace('_v1', ''), x + (cw - 8) / 2, y + ch - 22, { size: 9, weight: 700, color: C.Text_Secondary });
    });
    if (this.onebit) {
      const img = target.getImageData(0, 0, W, H), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
        const v = l > 92 ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(img, 0, 0);
      // shrunk thumbnail strip (120px wide) for the thumbnail test
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.off, 0, 0, W, H, W - 130, 100, 120, 213);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(W - 130, 100, 120, 213);
    }
    for (const b of this.buttons) b.draw(ctx);
  }
};
