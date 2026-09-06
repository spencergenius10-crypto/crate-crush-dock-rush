/* Kade telemetry — schema_ver 1.0 (docs-telemetry/telemetry-retention-v1.md)
 * Every event carries the common identity/session fields. Events are:
 *  - kept in memory for this page load,
 *  - appended to a persistent JSONL ring buffer (localStorage) so the download survives reloads,
 *  - echoed to console as `[CC_TELEMETRY] {json}` for headless/SDK-debug capture.
 */
window.CC = window.CC || {};

CC.TELEMETRY_REQUIRED = {
  // per-event required props (beyond the common fields) — mirrors ENG-PROTOTYPE-CHECKLIST §B
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
CC.TELEMETRY_COMMON = ['event_name', 'event_ts', 'schema_ver', 'app_ver', 'platform', 'user_id', 'session_id', 'install_ts', 'days_since_install', 'cohort_day'];

CC.Telemetry = class {
  constructor() {
    this.LS_ID = 'cc_dockrush_identity_v1';
    this.LS_BUF = 'cc_dockrush_telemetry_jsonl_v1';
    this.BUF_CAP = 6000;
    this.events = [];
    this.listeners = [];
    this.buffer = [];
    this.freshInstall = false;
    this.ended = true;
    this.sessionStats = null;
    this._loadIdentity();
    this._loadBuffer();
  }

  _loadIdentity() {
    let id = null;
    try { id = JSON.parse(localStorage.getItem(this.LS_ID) || 'null'); } catch (_) { id = null; }
    if (!id || !id.user_id || !id.install_ts) {
      id = { user_id: CC.U.uuid(), install_ts: new Date().toISOString() };
      try { localStorage.setItem(this.LS_ID, JSON.stringify(id)); } catch (_) {}
      this.freshInstall = true;
    }
    this.identity = id;
  }
  _loadBuffer() {
    try { const raw = localStorage.getItem(this.LS_BUF); this.buffer = raw ? raw.split('\n').filter(Boolean) : []; } catch (_) { this.buffer = []; }
  }
  // localStorage write is synchronous and the ring buffer is ~1 MB when full, so persisting on every
  // `smash` would stall the main thread mid-tap. Mark dirty and flush once, off the input path.
  _persist() {
    if (this.buffer.length > this.BUF_CAP) this.buffer.splice(0, this.buffer.length - this.BUF_CAP);
    this.dirty = true;
    if (this.flushTimer) return;
    const run = () => { this.flushTimer = null; this.flush(); };
    this.flushTimer = window.requestIdleCallback ? requestIdleCallback(run, { timeout: 1500 }) : setTimeout(run, 400);
  }
  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    if (this.flushTimer) { (window.cancelIdleCallback || clearTimeout)(this.flushTimer); this.flushTimer = null; }
    try { localStorage.setItem(this.LS_BUF, this.buffer.join('\n')); } catch (_) {}
  }

  common() {
    const now = new Date();
    const inst = new Date(this.identity.install_ts);
    return {
      event_ts: now.toISOString(),
      schema_ver: CC.CONFIG.SCHEMA_VER,
      app_ver: CC.CONFIG.APP_VER,
      platform: CC.CONFIG.PLATFORM,
      platform_detail: CC.CONFIG.PLATFORM_DETAIL,
      mode: CC.BRAND.modeId, // Crate Crush Mode this event came from (additive; schema common fields unchanged)
      user_id: this.identity.user_id,
      session_id: this.session_id,
      install_ts: this.identity.install_ts,
      days_since_install: Math.max(0, Math.floor((now - inst) / 86400000)),
      cohort_day: this.identity.install_ts.slice(0, 10),
    };
  }

  emit(name, props) {
    const ev = Object.assign({ event_name: name }, this.common(), props || {});
    this.events.push(ev);
    const line = JSON.stringify(ev);
    this.buffer.push(line);
    this._persist();
    if (!CC.QUIET_TELEMETRY) console.log('[CC_TELEMETRY] ' + line);
    for (const l of this.listeners) { try { l(ev); } catch (_) {} }
    return ev;
  }
  onEvent(fn) { this.listeners.push(fn); }

  // ---- session lifecycle ----
  startSession(coldStart) {
    this.session_id = CC.U.uuid();
    this.sessionStartMs = Date.now();
    this.ended = false;
    this.sessionStats = { levels_attempted: 0, levels_cleared: 0, revives_used: 0, rv_watched: 0, iap_revenue_usd: 0 };
    // attribution stays null unless the first open came through a Challenge link (organic loop, no paid channel)
    if (this.freshInstall) { this.emit('install', { attribution: CC.inboundChallenge ? 'challenge_link' : null }); this.freshInstall = false; }
    this.emit('session_start', {
      cold_start: !!coldStart,
      push_enabled: null,
      att_status: null,
      network: navigator.onLine === false ? 'offline' : 'wifi',
    });
  }
  endSession(reason) {
    if (this.ended) return null;
    this.ended = true;
    const s = this.sessionStats;
    const ev = this.emit('session_end', Object.assign({
      session_duration_s: Math.round((Date.now() - this.sessionStartMs) / 1000),
      end_reason: reason || 'other',
    }, s));
    this.flush(); // page may be going away — do not leave the tail of the session in memory only
    return ev;
  }

  // ---- domain helpers (keep prop names canonical in one place) ----
  dockClear(p) { this.sessionStats.levels_cleared++; return this.emit('dock_clear', p); }
  dockFail(p) { return this.emit('dock_fail', p); }
  dockAttempt() { this.sessionStats.levels_attempted++; }
  smash(p) { return this.emit('smash', p); }
  sortMiss(p) { return this.emit('sort_miss', p); }
  revive(p) { this.sessionStats.revives_used++; return this.emit('revive', p); }
  rvWatch(p) { if (p.completed) this.sessionStats.rv_watched++; return this.emit('rv_watch', p); }
  iap(p) { if (p.validated) this.sessionStats.iap_revenue_usd += p.price_usd; return this.emit('iap', p); }
  tutorialStep(step_id, completed) { return this.emit('tutorial_step', { step_id, completed: !!completed }); }
  // ---- organic-loop events (additive; not in the Kade must-ship 11, ignored by verify-telemetry) ----
  // kind: score | challenge · method: web_share | clipboard | prompt | failed
  share(p) { return this.emit('share', p); }
  challengeOpen(p) { return this.emit('challenge_open', p); }
  // round events (additive): event_id rush_hour | inspection_shift · action start | end · plus level_id, duration_s, pieces_left
  roundEvent(p) { return this.emit('round_event', p); }

  // ---- acceptance helpers ----
  counts(sessionOnly) {
    const out = {};
    for (const n of CC.MUST_SHIP_EVENTS) out[n] = 0;
    const src = sessionOnly ? this.events : this.buffer.map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
    for (const e of src) if (e && e.event_name in out) out[e.event_name]++;
    return out;
  }
  toJSONL(all) { return (all ? this.buffer : this.events.map((e) => JSON.stringify(e))).join('\n') + '\n'; }
  download(all) {
    this.flush();
    const blob = new Blob([this.toJSONL(all)], { type: 'application/x-ndjson' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cc_dockrush_telemetry_${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  resetInstall() {
    this.dirty = false;
    if (this.flushTimer) { (window.cancelIdleCallback || clearTimeout)(this.flushTimer); this.flushTimer = null; }
    try { localStorage.removeItem(this.LS_ID); localStorage.removeItem(this.LS_BUF); } catch (_) {}
  }
};
