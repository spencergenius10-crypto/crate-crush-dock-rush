/* SCR_Hub — Warehouse Hub: dock select, Cargo Book (stub), Settings. Upgrade never blocks Hub. */
window.CC = window.CC || {};

CC.HubScreen = class {
  constructor(g) { this.g = g; this.tab = 'docks'; }
  enter(params) {
    this.t = 0;
    if (params && params.tab) this.tab = params.tab;
    this.buildButtons();
  }
  buildButtons() {
    const W = CC.CONFIG.W;
    const p = this.g.p;
    this.buttons = [];
    this.cards = [];
    // tabs
    const tabs = [['docks', 'DOCKS'], ['book', 'CARGO BOOK'], ['settings', 'SETTINGS']];
    tabs.forEach(([id, label], i) => {
      this.buttons.push(new CC.Button({ id: 'tab_' + id, x: 20 + i * 168, y: 872, w: 156, h: 56, label, size: 15, kind: this.tab === id ? 'primary' : 'ghost', onTap: () => { this.tab = id; this.buildButtons(); } }));
    });
    if (this.tab === 'docks') {
      // dock cards around the next level
      const next = p.nextLevel;
      const first = CC.U.clamp(next - 2, 1, 46);
      for (let i = 0; i < 5; i++) {
        const n = first + i;
        const lv = CC.getLevel(n);
        const state = n < next ? 'cleared' : n === next ? 'next' : 'locked';
        const card = { n, lv, state, x: 30, y: 128 + i * 104, w: 480, h: 92 };
        this.cards.push(card);
        if (state !== 'locked') this.buttons.push(new CC.Button({ id: 'dock_' + n, x: card.x, y: card.y, w: card.w, h: card.h, label: '', visible: false, onTap: () => this.g.go('SCR_DockBrief', { levelN: n }) }));
      }
      this.buttons.push(new CC.Button({ id: 'upgrade', x: 30, y: 664, w: 480, h: 64, label: 'UPGRADE BAY', icon: 'CC_DockRush_UI_Icon_Upgrade_v1', kind: 'ghost', onTap: () => this.g.go('SCR_Upgrade') }));
      this.buttons.push(new CC.Button({ id: 'play', x: 30, y: 744, w: 480, h: 84, label: `PLAY DOCK ${CC.U.pad2(next)}`, sub: 'smash → sort → truck', size: 26, onTap: () => this.g.go('SCR_DockBrief', { levelN: next }) }));
    } else if (this.tab === 'settings') {
      const s = p.settings;
      const row = (i, id, label, val, fn) => this.buttons.push(new CC.Button({ id, x: 30, y: 160 + i * 84, w: 480, h: 64, label: `${label}: ${val ? 'ON' : 'OFF'}`, size: 20, kind: val ? 'good' : 'ghost', onTap: fn }));
      row(0, 'audio', 'AUDIO (default off for capture)', s.audio, () => { s.audio = !s.audio; this.g.save.save(); this.g.applySettings(); this.buildButtons(); });
      row(1, 'haptics', 'HAPTICS', s.haptics, () => { s.haptics = !s.haptics; this.g.save.save(); this.g.applySettings(); this.buildButtons(); });
      row(2, 'capture', 'CAPTURE PRESET (min chrome, big FX)', s.capture, () => { s.capture = !s.capture; this.g.save.save(); this.g.applySettings(); this.buildButtons(); });
      this.buttons.push(new CC.Button({ id: 'sheet', x: 30, y: 500, w: 480, h: 56, label: 'ASSET SHEET (silhouette test)', size: 16, kind: 'ghost', onTap: () => this.g.go('SCR_AssetSheet') }));
      this.buttons.push(new CC.Button({ id: 'download', x: 30, y: 568, w: 480, h: 56, label: 'DOWNLOAD TELEMETRY JSONL', size: 16, kind: 'ghost', onTap: () => this.g.tlm.download(true) }));
      this.buttons.push(new CC.Button({ id: 'reset', x: 30, y: 660, w: 480, h: 56, label: 'RESET PROFILE (fresh install)', size: 16, kind: 'danger', onTap: () => { this.g.save.reset(); this.g.tlm.resetInstall(); location.href = location.pathname; } }));
    }
  }
  update(dt) { this.t += dt; }
  onPointer(type, e) {
    if (type === 'down') { for (const b of this.buttons) if (b.hit(e.x, e.y)) b.pressT = 0.1; }
    if (type !== 'up' || !e.isTap) return;
    for (const b of this.buttons) if (b.hit(e.x, e.y) && b.onTap) { this.g.audio.pop(); b.onTap(); return; }
  }
  draw(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, H = CC.CONFIG.H, p = this.g.p;
    ctx.fillStyle = C.BG_UI; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#20262f'; for (let i = 0; i < 6; i++) ctx.fillRect(i * 90 + 4, 0, 82, H);
    CC.UI.header(ctx, 'WAREHOUSE HUB', this.tab === 'docks' ? 'pick your next dock' : this.tab === 'book' ? 'Cargo Book — collection (cosmetic, no power)' : 'settings');
    CC.UI.coinChip(ctx, W - 20, 20, p.coins, 'right');

    if (this.tab === 'docks') {
      for (const c of this.cards) this.drawCard(ctx, c);
    } else if (this.tab === 'book') {
      CC.CARGO.forEach((t, i) => {
        const y = 150 + i * 96;
        CC.UI.panel(ctx, 30, y, 480, 84, { fill: C.BG_UI2 });
        CC.drawCargo(ctx, t, 80, y + 42, 44, 'idle');
        CC.U.text(ctx, t.name.toUpperCase(), 130, y + 30, { size: 20, weight: 900, align: 'left' });
        CC.U.text(ctx, `${t.asset} · type ${t.id}`, 130, y + 56, { size: 12, weight: 600, align: 'left', color: C.Text_Secondary });
        const seen = i < CC.getLevel(Math.max(1, p.nextLevel - 1)).types.length || p.nextLevel > 5;
        CC.U.text(ctx, seen ? 'LOGGED' : 'UNSEEN', 480, y + 42, { size: 13, weight: 800, align: 'right', color: seen ? C.Safe : C.Text_Secondary });
      });
      CC.U.text(ctx, `shards ${p.shards} · pages unlock with shards (not in prototype)`, W / 2, 660, { size: 13, weight: 600, color: C.Text_Secondary });
    } else {
      CC.U.text(ctx, 'Capture preset: audio off, HUD chrome minimal, FX ×1.35', W / 2, 460, { size: 13, weight: 600, color: C.Text_Secondary });
      CC.U.text(ctx, `user ${this.g.tlm.identity.user_id.slice(0, 8)}… · session ${this.g.tlm.session_id.slice(0, 8)}…`, W / 2, 640, { size: 12, weight: 600, color: '#5f6a7a' });
    }
    for (const b of this.buttons) b.draw(ctx);
  }
  drawCard(ctx, c) {
    const C = CC.CONFIG.COLORS, p = this.g.p;
    const isNext = c.state === 'next', locked = c.state === 'locked';
    const pulse = isNext ? 1 + Math.sin(this.t * 4) * 0.01 : 1;
    ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(pulse, pulse); ctx.translate(-(c.x + c.w / 2), -(c.y + c.h / 2));
    CC.UI.panel(ctx, c.x, c.y, c.w, c.h, { fill: locked ? '#20252d' : C.BG_UI2, stroke: isNext ? C.Warn : '#3a4250' });
    // dock silhouette: lane count + crates
    const lanes = Math.min(c.lv.types.length, p.upg_lanes);
    for (let i = 0; i < lanes; i++) { ctx.fillStyle = locked ? '#3a4250' : CC.U.desat(c.lv.types[i % c.lv.types.length].color, 0.4); ctx.fillRect(c.x + 18 + i * 16, c.y + 50, 12, 28); }
    for (let i = 0; i < Math.min(6, Math.ceil(c.lv.crates / 3)); i++) { ctx.fillStyle = locked ? '#3a4250' : C.Wood; ctx.fillRect(c.x + 18 + (i % 3) * 14, c.y + 14 + Math.floor(i / 3) * 14, 12, 12); }
    CC.U.text(ctx, c.lv.name.toUpperCase(), c.x + 120, c.y + 30, { size: 20, weight: 900, align: 'left', color: locked ? '#6d7684' : C.Text_Primary });
    CC.U.text(ctx, `${c.lv.bandLabel} · ${c.lv.types.length} cargo types${c.lv.timerPressure ? ' · timer' : ''}`, c.x + 120, c.y + 58, { size: 12, weight: 600, align: 'left', color: C.Text_Secondary });
    // cargo icons
    if (!locked) c.lv.types.forEach((t, i) => CC.drawCargo(ctx, t, c.x + c.w - 40 - i * 34, c.y + 62, 18, 'idle'));
    // status badge
    const badge = c.state === 'cleared' ? '✓ CLEARED' : isNext ? 'NEXT' : 'LOCKED';
    const bc = c.state === 'cleared' ? C.Safe : isNext ? C.Warn : '#4a5468';
    CC.U.fillRRect(ctx, c.x + c.w - 118, c.y + 12, 104, 24, 12, bc);
    CC.U.text(ctx, badge, c.x + c.w - 66, c.y + 24, { size: 12, weight: 900, color: C.Text_Ink });
    // contract badge (stub) on next card
    if (isNext) { CC.U.fillRRect(ctx, c.x + 250, c.y + 12, 96, 20, 10, '#3a4250'); CC.U.text(ctx, 'CONTRACT ·', c.x + 298, c.y + 22, { size: 10, weight: 800, color: C.Text_Secondary }); }
    ctx.restore();
  }
};
