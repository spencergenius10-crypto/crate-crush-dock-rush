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
  const timer = n <= 12 ? 60 : Math.round((8 + crates * cargoPerCrate * 1.55) * (n >= 36 ? 0.92 : 1));

  return {
    n, id, band: band.id, bandLabel: band.label,
    name: `Dock ${CC.U.pad2(n)}`,
    types,
    crates,
    cargoPerCrate,
    metalPct,
    timer,
    spillsAllowed: CC.CONFIG.SPILLS_ALLOWED,
    sortWait: n <= 5 ? 5.0 : CC.CONFIG.SORT_WAIT_S, // conveyor window before cargo rolls off (FTUE is forgiving)
    baseCoins: band.base,
    expectedCoins: band.expected,
    timerPressure: n >= 13,
    ftue: n === 1,
    difficulty_tier: band.id,
  };
};
