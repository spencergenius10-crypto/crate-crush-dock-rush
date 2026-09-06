#!/usr/bin/env node
/* Remy acceptance: assert web/js/data/economy.js mirrors ECONOMY-COINS-UPGRADES-v1.csv exactly.
 *   node tools/check-economy.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csv = fs.readFileSync(path.join(root, 'ECONOMY-COINS-UPGRADES-v1.csv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));

// load economy.js in a tiny sandbox (it only touches window.CC / CC.U.roundTo)
const src = fs.readFileSync(path.join(root, 'web/js/data/economy.js'), 'utf8');
const window = { CC: { U: { roundTo: (v, s) => Math.round(v / s) * s, pad2: (n) => (n < 10 ? '0' + n : '' + n) } } };
new Function('window', 'CC', src)(window, window.CC);
const E = window.CC.ECON;

const fails = [];
const eq = (label, a, b) => { if (a !== b) fails.push(`${label}: js=${a} csv=${b}`); };

for (const row of csv) {
  const [table, key, lvl, cost, cum, expected] = row;
  if (table === 'coins_per_dock') {
    const from = parseInt(key.slice(1, 3), 10);
    const band = E.bandFor(from);
    eq(`band ${key} id`, band.id, lvl);
    // CSV quirk: coins_per_dock rows are one column short, so the expected value lands in `cumulative_coins`
    const exp = /^\d+$/.test(expected || '') ? expected : cum;
    eq(`band ${key} expected`, band.expected, parseInt(exp, 10));
  } else if (table === 'upg_smash' || table === 'upg_sort' || table === 'upg_lanes') {
    const from = parseInt(key.split('_to_')[0], 10);
    eq(`${table} ${key} cost`, E.upgradeCost(table, from), parseInt(cost, 10));
    const start = table === 'upg_lanes' ? 2 : 1;
    let c = 0; for (let l = start; l <= from; l++) c += E.upgradeCost(table, l);
    eq(`${table} ${key} cumulative`, c, parseInt(cum, 10));
  } else if (table === 'talent') {
    eq(`talent ${key} cost`, E.talents[key] && E.talents[key].cost, parseInt(cost, 10));
  } else if (table === 'revive') {
    eq('revive factor', E.REVIVE_COIN_FACTOR, 0.35);
    eq('revive D01 cost (0.35×132 → round 10)', E.reviveCoinCost(1), 50);
    eq('revive D21 cost (0.35×196 → round 10)', E.reviveCoinCost(21), 70);
  }
}
// spreadsheet §2 streak rule: +5%/step capped +25%
eq('streak cap', E.streakBonusPct(1000), 25);
eq('streak step pct', E.STREAK_STEP_PCT, 5);

if (fails.length) { console.log('ECONOMY MISMATCH:'); fails.forEach((f) => console.log('  - ' + f)); process.exit(1); }
console.log(`economy.js matches ECONOMY-COINS-UPGRADES-v1.csv (${csv.length} rows) — GREEN`);
