/* SCR_Upgrade — Upgrade Bay: smash / lanes / sort / talents / shop(stub). Coins only for power. → SCR_Hub */
window.CC = window.CC || {};

CC.UpgradeScreen = class {
  constructor(g) { this.g = g; this.tab = 'upg_smash'; }
  enter(params) { this.t = 0; this.msg = null; if (params && params.tab) this.tab = params.tab; this.build(); }
  build() {
    const g = this.g, p = g.p, W = CC.CONFIG.W;
    this.buttons = [];
    const tabs = [['upg_smash', 'SMASH'], ['upg_lanes', 'LANES'], ['upg_sort', 'SORT'], ['talents', 'TALENTS'], ['shop', 'SHOP']];
    tabs.forEach(([id, label], i) => this.buttons.push(new CC.Button({ id: 'tab_' + id, x: 20 + i * 100, y: 118, w: 92, h: 48, label, size: 13, kind: this.tab === id ? 'primary' : 'ghost', onTap: () => { this.tab = id; this.msg = null; this.build(); } })));

    if (this.tab.startsWith('upg_')) {
      const key = this.tab, lvl = p[key], cost = CC.ECON.upgradeCost(key, lvl), max = CC.ECON.upgradeMax(key);
      this.buttons.push(new CC.Button({
        id: 'confirm', x: 70, y: 560, w: 400, h: 80, size: 24,
        label: cost == null ? 'MAXED' : `CONFIRM · ${CC.U.fmtCoins(cost)}`,
        sub: cost == null ? `level ${lvl}/${max}` : p.coins >= cost ? `level ${lvl} → ${lvl + 1}` : `need ${CC.U.fmtCoins(cost - p.coins)} more coins`,
        enabled: cost != null && p.coins >= cost,
        onTap: () => this.buy(key),
      }));
    } else if (this.tab === 'talents') {
      Object.keys(CC.ECON.talents).forEach((id, i) => {
        const t = CC.ECON.talents[id];
        const owned = !!p.talents[id], open = CC.ECON.talentGateOpen(id, p);
        this.buttons.push(new CC.Button({
          id: 'talent_' + id, x: 360, y: 190 + i * 92, w: 150, h: 56, size: 14,
          label: owned ? 'OWNED' : t.cost === 0 ? 'FREE' : CC.U.fmtCoins(t.cost),
          kind: owned ? 'good' : 'primary', enabled: !owned && open && p.coins >= t.cost,
          onTap: () => this.buyTalent(id),
        }));
      });
    } else if (this.tab === 'shop') {
      CC.SKUS.forEach((s, i) => this.buttons.push(new CC.Button({ id: 'sku_' + s.sku, x: 360, y: 190 + i * 110, w: 150, h: 56, size: 15, label: `$${s.price_usd.toFixed(2)}`, sub: 'STUB', kind: 'ghost', onTap: () => this.buySku(s) })));
      this.buttons.push(new CC.Button({ id: 'rv_skip', x: 30, y: 560, w: 480, h: 64, size: 16, label: 'WATCH AD → +50 COINS (rv stub · skip_wait)', kind: 'ghost', onTap: () => this.rvSkipWait() }));
    }
    this.buttons.push(new CC.Button({ id: 'back', x: 30, y: 872, w: 480, h: 56, label: '← BACK TO HUB', size: 18, kind: 'ghost', onTap: () => g.go('SCR_Hub') }));
  }
  buy(key) {
    const p = this.g.p, cost = CC.ECON.upgradeCost(key, p[key]);
    if (cost == null || !this.g.save.spend(cost)) return;
    p[key]++; this.g.save.save();
    this.g.fx.upgradeSpark(CC.CONFIG.W / 2, 400); this.g.audio.coin();
    this.msg = `${key.replace('upg_', '').toUpperCase()} → LV ${p[key]}`;
    this.build();
  }
  buyTalent(id) {
    const p = this.g.p, t = CC.ECON.talents[id];
    if (p.talents[id] || !CC.ECON.talentGateOpen(id, p) || !this.g.save.spend(t.cost)) return;
    p.talents[id] = true; this.g.save.save();
    this.g.fx.upgradeSpark(CC.CONFIG.W / 2, 400); this.g.audio.coin();
    this.msg = `${t.label.toUpperCase()} UNLOCKED`; this.build();
  }
  buySku(s) {
    // iap stub — no store; validated=false in editor/web. Grants cosmetics/consumables only (no power).
    const p = this.g.p;
    this.g.tlm.iap({ sku: s.sku, price_usd: s.price_usd, currency_local: 'USD', price_local: s.price_usd, store: 'none', level_id: null, placement: 'upgrade_shop', validated: false });
    if (s.sku === 'cc_starter_kit_099') { p.cosmetics.smash_fx_spark = true; p.haulTokens += 1; }
    else if (s.sku === 'cc_cargo_pass_299') { p.coins += 300; p.shards += 5; }
    else if (s.sku === 'cc_premium_pass_499') { p.cosmetics.forklift_skin = true; p.gems += 20; }
    this.g.save.save();
    this.g.fx.upgradeSpark(CC.CONFIG.W / 2, 400);
    this.msg = `${s.label.toUpperCase()} — stub purchase logged (validated=false)`; this.build();
  }
  rvSkipWait() {
    this.g.rvStub('skip_wait', null, (completed) => {
      if (completed) { this.g.save.addCoins(50); this.msg = '+50 COINS'; }
      else this.msg = 'AD SKIPPED — no reward';
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
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, H = CC.CONFIG.H, p = this.g.p;
    ctx.fillStyle = C.BG_UI; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#20262f'; for (let i = 0; i < 6; i++) ctx.fillRect(i * 90 + 4, 0, 82, H);
    CC.UI.modeChip(ctx, W / 2, 22);
    CC.UI.header(ctx, 'UPGRADE BAY', 'coins buy power · gems/shards never do');
    CC.UI.coinChip(ctx, W - 20, 20, p.coins, 'right');

    if (this.tab.startsWith('upg_')) this.drawUpgradeCard(ctx);
    else if (this.tab === 'talents') this.drawTalents(ctx);
    else this.drawShop(ctx);

    if (this.msg) CC.U.text(ctx, this.msg, W / 2, 700, { size: 16, weight: 900, color: C.Safe });
    for (const b of this.buttons) b.draw(ctx);
  }
  drawUpgradeCard(ctx) {
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, p = this.g.p, key = this.tab, lvl = p[key], max = CC.ECON.upgradeMax(key);
    const meta = {
      upg_smash: { title: 'SMASH POWER', desc: 'Faster smash resolve — more damage per tap, faster hold cadence.', asset: 'CC_DockRush_Crate_Wood_Cracked_v1' },
      upg_lanes: { title: 'LANE SLOTS', desc: 'More typed lanes open on the dock — fewer swap lanes, cleaner sorts.', asset: 'CC_DockRush_Lane_Rim_v1' },
      upg_sort: { title: 'SORT SPEED', desc: 'Cargo flies faster and the next piece queues sooner.', asset: 'CC_DockRush_Cargo_Barrel_v1' },
    }[key];
    CC.UI.panel(ctx, 30, 190, 480, 350, { fill: C.BG_UI2 });
    CC.drawAsset(meta.asset, ctx, 70, 230, 110, 110, { color: '#3d8bfd', type: CC.CARGO[1] });
    CC.U.text(ctx, meta.title, 210, 250, { size: 26, weight: 900, align: 'left' });
    CC.U.text(ctx, `LEVEL ${lvl} / ${max}`, 210, 284, { size: 16, weight: 800, align: 'left', color: C.Warn });
    // level pips
    for (let i = 0; i < max; i++) CC.U.fillRRect(ctx, 210 + i * 27, 306, 22, 12, 4, i < lvl ? C.Safe : '#3a4250');
    this.wrapText(ctx, meta.desc, 60, 380, 420, 22, 16);
    // cost ladder (from spreadsheet)
    const table = CC.ECON[key];
    const start = key === 'upg_lanes' ? 2 : 1;
    CC.U.text(ctx, 'COST LADDER', 60, 440, { size: 12, weight: 800, align: 'left', color: C.Text_Secondary });
    table.forEach((c, i) => {
      const x = 60 + (i % 5) * 88, y = 468 + Math.floor(i / 5) * 28;
      const done = start + i < lvl;
      CC.U.text(ctx, `${start + i}→${start + i + 1}: ${c}`, x, y, { size: 12, weight: 700, align: 'left', color: done ? C.Safe : start + i === lvl ? C.Warn : C.Text_Secondary });
    });
  }
  drawTalents(ctx) {
    const C = CC.CONFIG.COLORS, p = this.g.p;
    Object.keys(CC.ECON.talents).forEach((id, i) => {
      const t = CC.ECON.talents[id], y = 178 + i * 92, owned = !!p.talents[id], open = CC.ECON.talentGateOpen(id, p);
      CC.UI.panel(ctx, 30, y, 480, 80, { fill: C.BG_UI2, stroke: owned ? C.Safe : '#3a4250' });
      CC.U.text(ctx, t.label.toUpperCase(), 48, y + 22, { size: 17, weight: 900, align: 'left' });
      CC.U.text(ctx, t.desc, 48, y + 44, { size: 11, weight: 600, align: 'left', color: C.Text_Secondary });
      CC.U.text(ctx, owned ? 'owned' : open ? 'gate open' : `gate: ${t.gate}`, 48, y + 64, { size: 11, weight: 700, align: 'left', color: owned ? C.Safe : open ? C.Warn : '#6d7684' });
    });
    CC.U.text(ctx, 'No talent requires gems.', CC.CONFIG.W / 2, 660, { size: 13, weight: 700, color: C.Text_Secondary });
  }
  drawShop(ctx) {
    const C = CC.CONFIG.COLORS, p = this.g.p;
    CC.SKUS.forEach((s, i) => {
      const y = 178 + i * 110;
      CC.UI.panel(ctx, 30, y, 480, 96, { fill: C.BG_UI2 });
      CC.U.text(ctx, s.label.toUpperCase(), 48, y + 26, { size: 18, weight: 900, align: 'left' });
      this.wrapText(ctx, s.desc, 48, y + 52, 290, 16, 12);
      CC.U.text(ctx, 'cosmetics / consumables only — no power', 48, y + 84, { size: 10, weight: 700, align: 'left', color: '#6d7684' });
    });
    CC.U.text(ctx, `gems ${p.gems} · haul tokens ${p.haulTokens} · stub store: iap logged with validated=false`, CC.CONFIG.W / 2, 530, { size: 12, weight: 700, color: C.Text_Secondary });
  }
  wrapText(ctx, str, x, y, maxW, lh, size) {
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    const words = str.split(' '); let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { CC.U.text(ctx, line, x, yy, { size, weight: 600, align: 'left', color: CC.CONFIG.COLORS.Text_Secondary }); line = w; yy += lh; }
      else line = test;
    }
    if (line) CC.U.text(ctx, line, x, yy, { size, weight: 600, align: 'left', color: CC.CONFIG.COLORS.Text_Secondary });
  }
};
