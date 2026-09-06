/* CC_UI_* — Panel_Plate / Btn_Primary / Btn_Ghost, industrial matte (no neon chrome). */
window.CC = window.CC || {};

CC.Button = class {
  constructor(o) {
    Object.assign(this, { x: 0, y: 0, w: 200, h: 64, label: '', kind: 'primary', size: 22, enabled: true, visible: true, sub: null, icon: null, id: null }, o);
    this.pressT = 0;
  }
  hit(px, py) { return this.visible && this.enabled && CC.U.inRect(px, py, this); }
  draw(ctx) {
    if (!this.visible) return;
    const C = CC.CONFIG.COLORS;
    const k = this.pressT > 0 ? 0.96 : 1;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
    let fill, stroke, text;
    if (this.kind === 'primary') { fill = C.Warn; stroke = CC.U.shade(C.Warn, -0.4); text = C.Text_Ink; }
    else if (this.kind === 'danger') { fill = C.Fail; stroke = CC.U.shade(C.Fail, -0.4); text = C.Text_Primary; }
    else if (this.kind === 'good') { fill = C.Safe; stroke = CC.U.shade(C.Safe, -0.4); text = C.Text_Ink; }
    else { fill = C.BG_UI2; stroke = '#4a5468'; text = C.Text_Primary; }
    if (!this.enabled) { fill = '#2a2f38'; stroke = '#3a4250'; text = '#6d7684'; }
    CC.U.fillRRect(ctx, this.x, this.y + 4, this.w, this.h, 12, CC.U.shade(stroke, -0.3));
    CC.U.fillRRect(ctx, this.x, this.y, this.w, this.h, 12, fill);
    CC.U.strokeRRect(ctx, this.x, this.y, this.w, this.h, 12, stroke, 3);
    let tx = cx;
    if (this.icon) { CC.drawAsset(this.icon, ctx, this.x + 14, cy - 16, 32, 32, { color: text }); tx += 14; }
    if (this.sub) {
      CC.U.text(ctx, this.label, tx, cy - 9, { size: this.size, weight: 900, color: text });
      CC.U.text(ctx, this.sub, tx, cy + 14, { size: 13, weight: 700, color: CC.U.shade(text, this.kind === 'primary' || this.kind === 'good' ? 0.2 : -0.2) });
    } else {
      CC.U.text(ctx, this.label, tx, cy, { size: this.size, weight: 900, color: text });
    }
    ctx.restore();
    if (this.pressT > 0) this.pressT -= 1 / 60;
  }
};

CC.UI = {
  panel(ctx, x, y, w, h, opts) {
    opts = opts || {};
    const C = CC.CONFIG.COLORS;
    CC.U.fillRRect(ctx, x, y, w, h, opts.r || 16, opts.fill || C.BG_UI);
    CC.U.strokeRRect(ctx, x, y, w, h, opts.r || 16, opts.stroke || '#3a4250', 3);
  },
  dim(ctx, a) { ctx.fillStyle = `rgba(8,10,14,${a == null ? 0.7 : a})`; ctx.fillRect(0, 0, CC.CONFIG.W, CC.CONFIG.H); },
  coinChip(ctx, x, y, coins, align) {
    const C = CC.CONFIG.COLORS;
    const label = CC.U.fmtCoins(coins);
    ctx.font = '800 16px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 46;
    const bx = align === 'right' ? x - w : x;
    CC.U.fillRRect(ctx, bx, y, w, 30, 15, C.BG_UI);
    CC.U.strokeRRect(ctx, bx, y, w, 30, 15, '#3a4250', 2);
    CC.drawAsset('CC_DockRush_UI_Coin_v1', ctx, bx + 6, y + 5, 20, 20);
    CC.U.text(ctx, label, bx + 32, y + 15, { size: 16, weight: 800, align: 'left' });
  },
  header(ctx, title, subtitle) {
    const C = CC.CONFIG.COLORS;
    CC.U.text(ctx, title, CC.CONFIG.W / 2, 60, { size: 30, weight: 900 });
    if (subtitle) CC.U.text(ctx, subtitle, CC.CONFIG.W / 2, 92, { size: 14, weight: 600, color: C.Text_Secondary });
  },
  stageBackdrop(ctx) {
    // Static every frame → paint once into an offscreen canvas, then a single drawImage per frame.
    let bd = CC.UI._backdrop;
    if (!bd) {
      bd = CC.UI._backdrop = document.createElement('canvas');
      bd.width = CC.CONFIG.W; bd.height = CC.CONFIG.H;
      CC.UI._paintBackdrop(bd.getContext('2d'));
    }
    ctx.drawImage(bd, 0, 0);
  },
  _paintBackdrop(ctx) {
    // Stage_Dock: cool concrete floor + wall, low chroma so cargo pops
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, H = CC.CONFIG.H;
    ctx.fillStyle = C.BG_Wall; ctx.fillRect(0, 0, W, H);
    // sky strip
    ctx.fillStyle = '#1b2028'; ctx.fillRect(0, 0, W, 104);
    // wall panels
    ctx.fillStyle = '#2a313c';
    for (let i = 0; i < 6; i++) ctx.fillRect(i * 90 + 4, 108, 82, 140);
    // floor
    ctx.fillStyle = C.BG_Dock; ctx.fillRect(0, 250, W, H - 250);
    ctx.fillStyle = C.BG_DockDark;
    for (let yy = 250; yy < H; yy += 60) ctx.fillRect(0, yy, W, 2);
    // hazard stripe at dock edge
    for (let x = 0; x < W; x += 30) { ctx.fillStyle = (x / 30) % 2 ? '#e0b640' : '#1f242c'; ctx.fillRect(x, 250, 30, 8); }
    // set dressing: cones (low noise)
    CC.drawAsset('CC_DockRush_Env_Cone_v1', ctx, 12, 590, 22, 30);
    CC.drawAsset('CC_DockRush_Env_Cone_v1', ctx, 506, 590, 22, 30);
  },
};
