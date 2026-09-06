/* Economy — mirrors ECONOMY-COINS-UPGRADES-v1.csv / ECONOMY-SPREADSHEET-v1.md (Remy owns numbers).
 * tools/check-economy.mjs asserts this table matches the CSV. Do not hand-tune here. */
window.CC = window.CC || {};

CC.ECON = {
  bands: [
    { id: 'early_ftue',   from: 1,  to: 5,  base: 120, expected: 132, types: 2, label: 'Early FTUE' },
    { id: 'early_climb',  from: 6,  to: 12, base: 140, expected: 157, types: 3, label: 'Early climb' },
    { id: 'early_mid',    from: 13, to: 20, base: 155, expected: 174, types: 3, label: 'Early-mid' },
    { id: 'mid',          from: 21, to: 35, base: 170, expected: 196, types: 4, label: 'Mid' },
    { id: 'mid_deep',     from: 36, to: 50, base: 185, expected: 213, types: 5, label: 'Mid-deep' },
  ],
  // cost to go from level (index+1) -> (index+2)
  upg_smash: [200, 350, 550, 800, 1200, 1700, 2400, 3200, 4200],
  // lanes start at 2: 2->3, 3->4, 4->5
  upg_lanes: [500, 1500, 4000],
  upg_sort: [180, 300, 480, 750, 1100, 1600, 2300],
  talents: {
    filter_glove:     { cost: 0,    label: 'Filter Glove',   gate: 'Free after first clear D03', desc: 'Matching lane glows while you hold cargo.' },
    bounce_dampen:    { cost: 900,  label: 'Bounce Dampen',  gate: 'Smash Lv3',                 desc: 'Wall & rim bounces lose more energy.' },
    spill_magnet:     { cost: 1800, label: 'Spill Magnet',   gate: 'Lanes ≥3',                  desc: 'Wider near-miss catch window.' },
    streak_shield:    { cost: 2500, label: 'Streak Shield',  gate: 'Sort Lv4',                  desc: 'First miss per dock does not break the streak.' },
    idle_cap_plus1h:  { cost: 1200, label: 'Idle Cap +1h',   gate: 'Warehouse Tier 1',          desc: 'Idle claim cap +1h (idle not in prototype).' },
  },
  STREAK_STEP_SORTS: 4,     // one "streak step" = 4 clean sorts in a row
  STREAK_STEP_PCT: 5,       // +5% per step
  STREAK_CAP_PCT: 25,       // capped +25%
  REVIVE_COIN_FACTOR: 0.35, // coin revive = 0.35 × expected coins for level, round to 10

  bandFor(n) { return this.bands.find((b) => n >= b.from && n <= b.to) || this.bands[this.bands.length - 1]; },
  baseCoins(n) { return this.bandFor(n).base; },
  expectedCoins(n) { return this.bandFor(n).expected; },
  reviveCoinCost(n) { return CC.U.roundTo(this.REVIVE_COIN_FACTOR * this.expectedCoins(n), 10); },
  streakBonusPct(bestStreak) {
    return Math.min(this.STREAK_CAP_PCT, Math.floor(bestStreak / this.STREAK_STEP_SORTS) * this.STREAK_STEP_PCT);
  },
  upgradeCost(key, currentLevel) {
    const table = this[key];
    const idx = key === 'upg_lanes' ? currentLevel - 2 : currentLevel - 1;
    if (!table || idx < 0 || idx >= table.length) return null;
    return table[idx];
  },
  upgradeMax(key) { return key === 'upg_lanes' ? 5 : this[key].length + 1; },
  talentGateOpen(id, p) {
    switch (id) {
      case 'filter_glove': return !!(p.cleared && p.cleared.D03);
      case 'bounce_dampen': return p.upg_smash >= 3;
      case 'spill_magnet': return p.upg_lanes >= 3;
      case 'streak_shield': return p.upg_sort >= 4;
      case 'idle_cap_plus1h': return false; // Warehouse tiers not in prototype
      default: return false;
    }
  },
};

// Stub store SKUs (telemetry `iap` stub only; validated=false in editor/web). No power in any SKU.
CC.SKUS = [
  { sku: 'cc_starter_kit_099',  label: 'Starter Kit',  price_usd: 0.99, desc: 'Cosmetic smash FX + 1× 2× haul token' },
  { sku: 'cc_cargo_pass_299',   label: 'Cargo Pass',   price_usd: 2.99, desc: 'Cosmetic track + soft currency (stub)' },
  { sku: 'cc_premium_pass_499', label: 'Premium Pass', price_usd: 4.99, desc: 'Cargo Pass + forklift skin + 3 revive tokens (stub)' },
];
