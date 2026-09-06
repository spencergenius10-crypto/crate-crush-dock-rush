/* SCR_DockBrief — lane layout silhouette + cargo type icons (no numbers). Tap START → DockRun. */
window.CC = window.CC || {};

CC.DockBriefScreen = class {
  constructor(g) { this.g = g; }
  enter(params) {
    this.lv = CC.getLevel(params.levelN || this.g.p.nextLevel);
    this.t = 0;
    this.buttons = [
      new CC.Button({ id: 'start', x: 70, y: 740, w: 400, h: 84, label: 'START', sub: 'tap crates · drag cargo · fill the truck', size: 30, onTap: () => this.g.go('DockRun', { levelN: this.lv.n }) }),
      new CC.Button({ id: 'back', x: 30, y: 872, w: 160, h: 56, label: '← HUB', size: 16, kind: 'ghost', onTap: () => this.g.go('SCR_Hub') }),
    ];
  }
  update(dt) { this.t += dt; }
  onPointer(type, e) {
    if (type === 'down') { for (const b of this.buttons) if (b.hit(e.x, e.y)) b.pressT = 0.1; }
    if (type !== 'up' || !e.isTap) return;
    for (const b of this.buttons) if (b.hit(e.x, e.y) && b.onTap) { this.g.audio.pop(); b.onTap(); return; }
  }
  draw(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, p = this.g.p;
    CC.UI.stageBackdrop(ctx);
    CC.UI.dim(ctx, 0.35);
    const ch = p.challenge && p.challenge.n === this.lv.n ? p.challenge : null;
    CC.UI.modeChip(ctx, W / 2, 22);
    CC.UI.header(ctx, this.lv.name.toUpperCase(), `${this.lv.bandLabel} · attempt ${(p.attempts[this.lv.id] || 0) + 1}${ch ? ` · CHALLENGE: beat ${ch.score}` : ''}`);
    // lane layout silhouette
    const lanes = Math.min(this.lv.types.length, p.upg_lanes);
    const laneW = 440 / lanes;
    for (let i = 0; i < lanes; i++) {
      const t = this.lv.types[i];
      const extra = i === lanes - 1 ? this.lv.types.slice(lanes - 1) : [t];
      CC.drawAsset('CC_DockRush_Lane_Base_v1', ctx, 50 + i * laneW + 6, 400, laneW - 12, 170);
      CC.drawAsset('CC_DockRush_Lane_Rim_v1', ctx, 50 + i * laneW + 6, 400, laneW - 12, 170, { color: t.color, type: t });
      if (extra.length > 1) CC.U.text(ctx, '↻ ' + extra.map((x) => x.id).join('/'), 50 + i * laneW + laneW / 2, 548, { size: 12, weight: 800, color: C.Warn });
    }
    // crates silhouette (no numbers) — stacked left of the truck bay
    for (let i = 0; i < this.lv.crates; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      CC.drawAsset('CC_DockRush_Crate_Wood_Closed_v1', ctx, 60 + col * 48, 250 - row * 46, 42, 42);
    }
    // truck
    CC.drawAsset('CC_DockRush_Truck_Bay_v1', ctx, CC.CONFIG.TRUCK.x, CC.CONFIG.TRUCK.y, CC.CONFIG.TRUCK.w, CC.CONFIG.TRUCK.h, { ratio: 0 });
    // cargo icons
    CC.U.text(ctx, 'CARGO ON THIS DOCK', W / 2, 615, { size: 14, weight: 800, color: C.Text_Secondary });
    this.lv.types.forEach((t, i) => { const x = W / 2 + (i - (this.lv.types.length - 1) / 2) * 70; CC.drawCargo(ctx, t, x, 660, 40, 'idle'); });
    if (this.lv.types.length > lanes) CC.U.text(ctx, `${this.lv.types.length} types · ${lanes} lanes — last lane swaps type (buy lanes in Upgrade Bay)`, W / 2, 700, { size: 12, weight: 700, color: C.Warn });
    else if (this.lv.timerPressure) CC.U.text(ctx, 'forklift is on the clock — timer pressure', W / 2, 700, { size: 12, weight: 700, color: C.Warn });
    // shift report: which events / behaviours this dock can throw (tags only, no numbers)
    const hz = this.lv.hazards, ev = this.lv.events, tags = [];
    if (ev.rush) tags.push('RUSH HOUR'); if (ev.inspection) tags.push('INSPECTION'); if (ev.jackpotChance) tags.push('JACKPOT?');
    if (hz.magnetPct) tags.push('MAGNET'); if (hz.fragilePct) tags.push('GLASS'); if (hz.steelPct) tags.push('STEEL');
    if (tags.length) CC.U.text(ctx, 'SHIFT REPORT · ' + tags.join(' · '), W / 2, 722, { size: 11, weight: 800, color: C.Text_Secondary });
    for (const b of this.buttons) b.draw(ctx);
  }
};
