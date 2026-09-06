#!/usr/bin/env node
/* Kade acceptance: verify a Dock Rush telemetry JSONL contains ≥1 of each must-ship event
 * with the required common fields + per-event props (ENG-PROTOTYPE-CHECKLIST §B, telemetry-retention-v1).
 *
 *   node tools/verify-telemetry.mjs path/to/session.jsonl [--session <session_id>] [--any-session]
 *
 * Exit 0 = green. Default checks the most recent session in the file; --any-session pools all sessions. */
import fs from 'node:fs';

const COMMON = ['event_name', 'event_ts', 'schema_ver', 'app_ver', 'platform', 'user_id', 'session_id', 'install_ts', 'days_since_install', 'cohort_day'];
const REQUIRED = {
  install: [],
  session_start: ['cold_start'],
  session_end: ['session_duration_s', 'levels_attempted', 'levels_cleared', 'revives_used', 'rv_watched'],
  dock_clear: ['level_id', 'attempt_n', 'duration_s', 'crates_smashed', 'sort_misses', 'is_first_clear'],
  dock_fail: ['level_id', 'attempt_n', 'fail_reason', 'progress_pct'],
  smash: ['level_id', 'crate_type', 'combo'],
  sort_miss: ['level_id', 'expected_bin', 'chosen_bin', 'streak_broken'],
  revive: ['level_id', 'source', 'attempt_n'],
  rv_watch: ['placement', 'completed'],
  iap: ['sku', 'price_usd', 'validated'],
  tutorial_step: ['step_id', 'completed'],
};
const ENUMS = {
  platform: ['ios', 'android', 'editor'],
  fail_reason: ['timer', 'lives', 'quit', 'other'],
  source: ['rv', 'iap', 'currency', 'free_daily'],
  placement: ['revive', 'double_reward', 'skip_wait', 'other', 'upgrade_shop'],
};

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) { console.error('usage: node tools/verify-telemetry.mjs <file.jsonl> [--session id] [--any-session]'); process.exit(2); }
const sessionArg = args.includes('--session') ? args[args.indexOf('--session') + 1] : null;
const anySession = args.includes('--any-session');

const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
const events = []; const parseErrors = [];
lines.forEach((l, i) => { try { events.push(JSON.parse(l)); } catch (e) { parseErrors.push(i + 1); } });

const problems = [];
if (parseErrors.length) problems.push(`unparseable lines: ${parseErrors.join(', ')}`);

// common fields on every event
let missingCommon = 0;
for (const e of events) {
  for (const f of COMMON) if (e[f] === undefined || e[f] === null || e[f] === '') { missingCommon++; problems.push(`${e.event_name || '?'} missing common field ${f}`); break; }
  if (e.schema_ver !== '1.0') problems.push(`${e.event_name}: schema_ver ${e.schema_ver} != 1.0`);
  if (e.platform && !ENUMS.platform.includes(e.platform)) problems.push(`${e.event_name}: platform ${e.platform} not in enum`);
  if (e.event_ts && Number.isNaN(Date.parse(e.event_ts))) problems.push(`${e.event_name}: event_ts not ISO-8601`);
}

// pick session scope
const sessions = [...new Set(events.map((e) => e.session_id))];
let scope = events;
let scopeLabel = 'all sessions';
if (!anySession) {
  const sid = sessionArg || sessions[sessions.length - 1];
  scope = events.filter((e) => e.session_id === sid);
  scopeLabel = `session ${sid}`;
  // install is once-per-install: accept it from any session of the same user
  const users = new Set(scope.map((e) => e.user_id));
  const installs = events.filter((e) => e.event_name === 'install' && users.has(e.user_id));
  if (installs.length && !scope.some((e) => e.event_name === 'install')) scope = scope.concat(installs);
}

const counts = {};
for (const name of Object.keys(REQUIRED)) counts[name] = 0;
for (const e of scope) {
  if (!(e.event_name in REQUIRED)) continue;
  counts[e.event_name]++;
  for (const p of REQUIRED[e.event_name]) if (e[p] === undefined || e[p] === null) problems.push(`${e.event_name} missing prop ${p}`);
  for (const [k, allowed] of Object.entries(ENUMS)) if (k !== 'platform' && e[k] !== undefined && !allowed.includes(e[k])) problems.push(`${e.event_name}.${k}=${e[k]} not in enum`);
}
const missingEvents = Object.keys(REQUIRED).filter((n) => counts[n] === 0);

console.log(`Dock Rush telemetry check — ${file}`);
console.log(`events: ${events.length} · sessions: ${sessions.length} · scope: ${scopeLabel}`);
console.log('');
console.log('must-ship event      count');
for (const n of Object.keys(REQUIRED)) console.log(`${(counts[n] > 0 ? '  ✓ ' : '  ✗ ') + n.padEnd(17)} ${counts[n]}`);
console.log('');
if (missingEvents.length) problems.unshift(`missing must-ship events: ${missingEvents.join(', ')}`);
const uniq = [...new Set(problems)];
if (uniq.length) { console.log('PROBLEMS:'); for (const p of uniq.slice(0, 40)) console.log('  - ' + p); if (uniq.length > 40) console.log(`  … +${uniq.length - 40} more`); console.log('\nRESULT: RED'); process.exit(1); }
console.log('RESULT: GREEN — ≥1 of each must-ship event with required fields.');
