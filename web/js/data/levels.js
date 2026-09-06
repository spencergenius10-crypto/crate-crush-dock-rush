/* Level generator D01–D50 (data-driven; band params from economy). */
window.CC = window.CC || {};

CC.getLevel = function (n) {
  n = CC.U.clamp(n, 1, 50);
  const band = CC.ECON.bandFor(n);
  const id = 'D' + CC.U.pad2(n);

  // deterministic type pick per level for variety after FTUE
  let types;
  if (n <= 5) types = CC.CARGO.slice(0, 2);
  else {
    const rot = (n * 7) % CC.CARGO.length;
    const ordered = CC.CARGO.slice(rot).concat(CC.CARGO.slice(0, rot));
    types = ordered.slice(0, band.types);
  }

  // ~25–35s target clear: 6→12 crates × 2 cargo. Timer derives from content once pressure starts (D13+).
  const crates = CC.U.clamp(6 + Math.floor((n - 1) / 3), 6, 12);
  const cargoPerCrate = 2;
  const metalPct = n >= 13 ? CC.U.clamp(0.15 + (n - 13) * 0.02, 0.15, 0.6) : 0;
  const timer = n <= 5 ? 90 : n <= 12 ? 60 : Math.round((8 + crates * cargoPerCrate * 1.55) * (n >= 36 ? 0.92 : 1));

  // Hazards enter after FTUE, one at a time, and ramp slowly (share of crates / cargo pieces):
  //   frozen crate  D04+  double-tap to shatter the ice before smash damage lands
  //   golden cargo  D04+  ×3 score when sorted right, big fever push
  //   timed cargo   D06+  fuse: sort within TIMED_FUSE_S or it detonates (= spill)
  const hazards = {
    frozenPct: n >= 4 ? CC.U.clamp(0.15 + (n - 4) * 0.01, 0.15, 0.4) : 0,
    goldenPct: n >= 4 ? 0.12 : 0,
    timedPct: n >= 6 ? CC.U.clamp(0.12 + (n - 6) * 0.008, 0.12, 0.35) : 0,
  };

  return {
    n, id, band: band.id, bandLabel: band.label,
    name: `Dock ${CC.U.pad2(n)}`,
    types,
    crates,
    cargoPerCrate,
    metalPct,
    timer,
    spillsAllowed: CC.CONFIG.SPILLS_ALLOWED,
    // conveyor window before cargo rolls off: none on the first two docks (learn the lanes), forgiving through FTUE
    sortWait: n <= 2 ? Infinity : n <= 5 ? 5.0 : CC.CONFIG.SORT_WAIT_S,
    baseCoins: band.base,
    expectedCoins: band.expected,
    timerPressure: n >= 13,
    hazards,
    ftue: n === 1,
    difficulty_tier: band.id,
  };
};
