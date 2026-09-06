/* Phase_Truck (SCR_Truck) — lane cargo sucks linearly into the truck bay; fill-bar slams FULL → clear sting. */
window.CC = window.CC || {};

CC.PhaseTruck = class {
  constructor(run) { this.run = run; this.g = run.g; this.flyers = []; this.filled = 0; this.total = 0; this.state = 'idle'; this.fullT = 0; }

  enter() {
    this.items = [];
    for (const l of this.run.lanes) {
      const cols = Math.max(2, Math.floor(l.w / 44));
      l.seated.forEach((s, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        this.items.push({ type: s.type, golden: s.golden, lane: l, x: l.x + 22 + col * ((l.w - 44) / (cols - 1 || 1)), y: l.y + l.h - 22 - row * 24 });
      });
    }
    // load top rows first so lanes visibly drain
    this.items.sort((a, b) => a.y - b.y);
    this.total = this.items.length;
    this.filled = 0; this.i = 0; this.t = 0.4; this.per = 0.09; this.flyers = []; this.state = 'loading'; this.fullT = 0;
    this.g.sessionHints.sort = true;
  }
  ratio() { return this.total ? this.filled / this.total : 1; }
  isFull() { return this.state === 'full' || this.state === 'done'; }

  update(dt) {
    const T = CC.CONFIG.TRUCK;
    this.t += dt;
    if (this.state === 'loading') {
      while (this.i < this.total && this.t >= this.per) {
        const it = this.items[this.i++];
        // remove from lane seats as it launches
        it.lane.seated.pop();
        this.flyers.push({ type: it.type, golden: it.golden, x0: it.x, y0: it.y, x1: T.x + T.w / 2 + CC.U.rand(-40, 40), y1: T.y + T.h / 2 - 6, k: 0 });
        this.g.fx.suck(it.x, it.y, T.x + T.w / 2, T.y + T.h / 2, it.golden ? '#ffd65a' : it.type.color);
        this.t -= this.per;
      }
      for (let j = this.flyers.length - 1; j >= 0; j--) {
        const f = this.flyers[j]; f.k += dt / 0.3;
        if (f.k >= 1) {
          this.flyers.splice(j, 1); this.filled++;
          this.g.fx.doShake(1.5); this.g.audio.thud(); // audio hook: truck load thud
          if (this.filled >= this.total) {
            this.state = 'full'; this.fullT = 0; this.run.ftueText = null;
            this.g.fx.sting(T.x + T.w / 2, T.y + T.h / 2);
            this.g.audio.sting(); // audio hook: truck clear sting + whoosh
            this.g.audio.whoosh();
          }
        }
      }
      if (this.total === 0) { this.state = 'full'; this.fullT = 0; }
    } else if (this.state === 'full') {
      this.fullT += dt;
      if (this.fullT >= 1.6) { this.state = 'done'; this.run.onTruckFull(); }
    }
  }

  onPointer(type, e) {
    if (type === 'up' && this.state === 'full' && this.fullT > 0.4) { this.state = 'done'; this.run.onTruckFull(); }
  }

  draw(ctx) {
    const C = CC.CONFIG.COLORS, T = CC.CONFIG.TRUCK, W = CC.CONFIG.W;
    for (const f of this.flyers) {
      const k = CC.U.easeInQuad(f.k);
      const x = CC.U.lerp(f.x0, f.x1, k), y = CC.U.lerp(f.y0, f.y1, k);
      CC.drawCargo(ctx, f.type, x, y, 34 * (1 - k * 0.5), 'airborne', { squash: { x: 0.8, y: 1.3 }, golden: f.golden });
    }
    if (this.state === 'loading') {
      CC.U.text(ctx, 'LOADING', W / 2, 470, { size: 30, weight: 900, color: C.Text_Secondary, stroke: C.Outline, strokeWidth: 7 });
    }
    if (this.isFull()) {
      // fill-bar slam + clear sting (Ari 2.2–3.5s)
      const k = Math.min(1, this.fullT / 0.25);
      const s = CC.U.easeOutBack(k);
      ctx.save(); ctx.translate(W / 2, 540); ctx.scale(s, s);
      CC.U.text(ctx, 'FULL!', 0, -44, { size: 40, weight: 900, color: C.Safe, stroke: C.Outline, strokeWidth: 9 });
      CC.U.text(ctx, 'DOCK CLEAR', 0, 16, { size: 56, weight: 900, color: C.Warn, stroke: C.Outline, strokeWidth: 10 });
      ctx.restore();
    }
  }
};
