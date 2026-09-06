/* Player profile (localStorage). Power is soft-currency only — gems/shards are cosmetic/convenience. */
window.CC = window.CC || {};

CC.Save = class {
  constructor() {
    this.LS = 'cc_dockrush_profile_v1';
    this.p = this.load();
  }
  defaults() {
    return {
      coins: 0, gems: 0, shards: 0,
      upg_smash: 1, upg_lanes: 2, upg_sort: 1,
      talents: {},                 // filter_glove, bounce_dampen, spill_magnet, streak_shield, idle_cap_plus1h
      cosmetics: {},               // starter_kit etc. (no power)
      cargoSeen: {},               // Cargo Book: type id -> true once released from a crate
      haulTokens: 0,
      nextLevel: 1,
      cleared: {},                 // level_id -> clear count
      attempts: {},                // level_id -> attempt count
      ftue: { smash: false, sort: false, truck: false },
      settings: { audio: true, haptics: true, capture: false }, // capture preset mutes regardless of `audio`
      bestStreak: 0,
      bestHaul: 0,
      challenge: null,             // inbound friend's challenge {n, level_id, score, streak, time, cleared} until beaten/dismissed
      freeDailyReviveDate: null,
      stats: { docks_cleared: 0, docks_failed: 0, crates_smashed: 0, revives: 0, rv_watched: 0 },
    };
  }
  load() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(this.LS) || 'null'); } catch (_) { p = null; }
    const d = this.defaults();
    if (!p) return d;
    // shallow merge with nested defaults for forward-compat
    for (const k of Object.keys(d)) {
      if (p[k] === undefined) p[k] = d[k];
      else if (typeof d[k] === 'object' && d[k] && !Array.isArray(d[k])) p[k] = Object.assign({}, d[k], p[k]);
    }
    return p;
  }
  save() { try { localStorage.setItem(this.LS, JSON.stringify(this.p)); } catch (_) {} }
  reset() { this.p = this.defaults(); this.save(); }
  levelId(n) { return 'D' + CC.U.pad2(n); }
  addCoins(n) { this.p.coins = Math.max(0, this.p.coins + Math.round(n)); this.save(); }
  spend(n) { if (this.p.coins < n) return false; this.p.coins -= n; this.save(); return true; }
};
