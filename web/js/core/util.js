window.CC = window.CC || {};

CC.U = {
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  rand(a, b) { return a + Math.random() * (b - a); },
  randInt(a, b) { return Math.floor(CC.U.rand(a, b + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  sign(v) { return v < 0 ? -1 : 1; },
  easeOutCubic(t) { t = CC.U.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); },
  easeOutBack(t) { t = CC.U.clamp(t, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  easeInQuad(t) { t = CC.U.clamp(t, 0, 1); return t * t; },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  },
  inRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; },
  roundTo(v, step) { return Math.round(v / step) * step; },
  pad2(n) { return n < 10 ? '0' + n : '' + n; },
  fmtCoins(n) { return n.toLocaleString('en-US'); },

  // ---- canvas helpers ----
  rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
  fillRRect(ctx, x, y, w, h, r, color) {
    CC.U.rrect(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  },
  strokeRRect(ctx, x, y, w, h, r, color, lw) {
    CC.U.rrect(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 2;
    ctx.stroke();
  },
  text(ctx, str, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = `${opts.weight || 700} ${opts.size || 18}px ${opts.font || 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'}`;
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    if (opts.stroke) {
      ctx.lineWidth = opts.strokeWidth || 6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = opts.stroke;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = opts.color || CC.CONFIG.COLORS.Text_Primary;
    ctx.fillText(str, x, y);
    ctx.restore();
  },
  // shade/desat are called per button/lane per frame with a handful of constant inputs → memoize
  // (bounded: palette × a few amounts) instead of re-parsing hex strings every frame.
  _colorCache: new Map(),
  shade(hex, amt) {
    // amt in [-1,1]: negative darkens, positive lightens
    const key = 's' + hex + amt, hit = CC.U._colorCache.get(key);
    if (hit) return hit;
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => CC.U.clamp(Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt), 0, 255);
    r = f(r); g = f(g); b = f(b);
    const out = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    if (CC.U._colorCache.size < 512) CC.U._colorCache.set(key, out);
    return out;
  },
  desat(hex, amt) {
    const key = 'd' + hex + amt, hit = CC.U._colorCache.get(key);
    if (hit) return hit;
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    const f = (c) => Math.round(c + (l - c) * amt);
    const out = '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
    if (CC.U._colorCache.size < 512) CC.U._colorCache.set(key, out);
    return out;
  },
  query(name) {
    const m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  },
  // `#a=1&b=2` — payloads ride in the hash so they never hit server logs and never collide with ?flags
  hashParam(name) {
    const m = new RegExp('[#&]' + name + '=([^&]*)').exec(location.hash);
    return m ? decodeURIComponent(m[1]) : null;
  },
  todayUTC() { return new Date().toISOString().slice(0, 10); },
};
