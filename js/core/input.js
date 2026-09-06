/* Unified pointer input: tap / hold / drag / swipe in logical canvas coordinates. */
window.CC = window.CC || {};

CC.Input = class {
  constructor(canvas, onEvent) {
    this.canvas = canvas;
    this.onEvent = onEvent;
    this.down = false;
    this.x = 0; this.y = 0;
    this.startX = 0; this.startY = 0;
    this.downAt = 0;
    this.samples = []; // {t,x,y} for velocity
    this.pointerId = null;

    const opts = { passive: false };
    canvas.addEventListener('pointerdown', (e) => this._down(e), opts);
    canvas.addEventListener('pointermove', (e) => this._move(e), opts);
    canvas.addEventListener('pointerup', (e) => this._up(e), opts);
    canvas.addEventListener('pointercancel', (e) => this._up(e), opts);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Robustness: a release that lands off-canvas (or a lost capture) must never leave `down` stuck,
    // otherwise every later press would be swallowed. Window-level up/cancel + blur end the press.
    window.addEventListener('pointerup', (e) => { if (this.down) this._up(e, true); }, opts);
    window.addEventListener('pointercancel', (e) => { if (this.down) this._up(e, true); }, opts);
    window.addEventListener('blur', () => { if (this.down) this._end(this.x, this.y); });
    this.lastEvent = 'none';
  }

  toLogical(e) {
    const r = this.canvas.getBoundingClientRect();
    const sx = CC.CONFIG.W / r.width, sy = CC.CONFIG.H / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  // Programmatic injection (bot / tests) uses logical coordinates directly.
  inject(type, x, y) {
    if (type === 'down') this._begin(x, y);
    else if (type === 'move') this._track(x, y);
    else if (type === 'up') this._end(x, y);
  }
  tap(x, y) { this.inject('down', x, y); this.inject('up', x, y); }
  swipe(x0, y0, x1, y1, ms) {
    ms = ms || 120;
    this.inject('down', x0, y0);
    const t0 = performance.now();
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.samples.push({ t: t0 + ms * t, x: CC.U.lerp(x0, x1, t), y: CC.U.lerp(y0, y1, t) });
      this.x = CC.U.lerp(x0, x1, t); this.y = CC.U.lerp(y0, y1, t);
      this.onEvent('move', { x: this.x, y: this.y, dx: this.x - this.startX, dy: this.y - this.startY });
    }
    // fake timing for velocity
    this.downAt = t0 - ms;
    this.samples = this.samples.map((s, i) => ({ t: t0 - ms + (ms * (i + 1)) / steps, x: s.x, y: s.y }));
    this._end(x1, y1, true);
  }

  _down(e) {
    e.preventDefault();
    this.lastEvent = 'down';
    // a new press while we still think we're down = we missed the release; end the old press first
    if (this.down) this._end(this.x, this.y);
    this.pointerId = e.pointerId;
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
    const p = this.toLogical(e);
    this._begin(p.x, p.y);
  }
  _move(e) {
    if (!this.down || (this.pointerId !== null && e.pointerId !== this.pointerId)) return;
    e.preventDefault();
    const p = this.toLogical(e);
    // button already released (release event never reached us) → treat as up
    if (e.pointerType === 'mouse' && e.buttons === 0) { this.pointerId = null; this._end(p.x, p.y); return; }
    this._track(p.x, p.y);
  }
  _up(e, fromWindow) {
    if (!this.down || (this.pointerId !== null && e.pointerId !== this.pointerId)) return;
    if (!fromWindow) e.preventDefault();
    this.lastEvent = fromWindow ? 'up(window)' : 'up';
    const p = this.toLogical(e);
    this.pointerId = null;
    this._end(p.x, p.y);
  }

  _begin(x, y) {
    this.down = true;
    this.x = this.startX = x; this.y = this.startY = y;
    this.downAt = performance.now();
    this.samples = [{ t: this.downAt, x, y }];
    this.onEvent('down', { x, y });
  }
  _track(x, y) {
    this.x = x; this.y = y;
    const now = performance.now();
    this.samples.push({ t: now, x, y });
    while (this.samples.length > 12) this.samples.shift();
    this.onEvent('move', { x, y, dx: x - this.startX, dy: y - this.startY });
  }
  _end(x, y, synthetic) {
    this.down = false;
    const now = performance.now();
    const dur = (now - this.downAt) / 1000;
    const dx = x - this.startX, dy = y - this.startY;
    const dist = Math.hypot(dx, dy);
    // velocity from recent samples (last ~80ms)
    let vx = 0, vy = 0;
    const recent = this.samples.filter((s) => now - s.t <= 90);
    const first = recent.length ? recent[0] : this.samples[0];
    const dt = Math.max((now - first.t) / 1000, 0.016);
    vx = (x - first.x) / dt; vy = (y - first.y) / dt;
    if (synthetic) { vx = dx / Math.max(dur, 0.05); vy = dy / Math.max(dur, 0.05); }
    const isTap = dist < 14 && dur < 0.35;
    this.onEvent('up', { x, y, dx, dy, dist, dur, vx, vy, isTap, isSwipe: dist >= 30 });
  }
};
