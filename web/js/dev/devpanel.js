/* DOM dev panel (outside the canvas): Kade must-ship checklist, JSONL download, session controls, bot. */
window.CC = window.CC || {};

CC.DevPanel = class {
  constructor(g) {
    this.g = g;
    this.el = document.getElementById('devPanel');
    // the DEV button / ` key are wired in main.js (they lazy-load this chunk first)
    this.el.addEventListener('click', (e) => {
      const act = e.target && e.target.getAttribute('data-act');
      if (act) this.action(act);
    });
    g.tlm.onEvent(() => this.refresh());
    this.visible = !!CC.U.query('dev');
    this.el.classList.toggle('hidden', !this.visible);
    this.refresh();
  }
  toggle() { this.visible = !this.visible; this.el.classList.toggle('hidden', !this.visible); this.refresh(); }
  action(a) {
    const g = this.g;
    switch (a) {
      case 'download': g.tlm.download(true); break;
      case 'download_session': g.tlm.download(false); break;
      case 'end_session': g.tlm.endSession('manual'); break;
      case 'new_session': if (g.tlm.ended) g.tlm.startSession(false); break;
      case 'bot': if (!g.bot || g.bot.done) { g.bot = new CC.Bot(g, {}); } break;
      case 'reset': g.save.reset(); g.tlm.resetInstall(); location.href = location.pathname + '?dev=1'; break;
      case 'coins': g.save.addCoins(1000); break;
      case 'freeze': g.freezeTimer = !g.freezeTimer; break;
      case 'sheet': g.go('SCR_AssetSheet'); break;
      case 'hub': g.go('SCR_Hub'); break;
      case 'copy': navigator.clipboard && navigator.clipboard.writeText(g.tlm.toJSONL(true)); break;
      case 'challenge_link': location.href = location.pathname + location.search + '#challenge=' + CC.Share.encode({ n: 3, score: 250, streak: 5, time: 30, cleared: true }); location.reload(); break;
    }
    this.refresh();
  }
  refresh() {
    if (!this.visible) return;
    const g = this.g, tlm = g.tlm;
    const cs = tlm.counts(true), ca = tlm.counts(false);
    const allSession = CC.MUST_SHIP_EVENTS.every((n) => cs[n] > 0);
    const rows = CC.MUST_SHIP_EVENTS.map((n) => `<tr><td>${n}</td><td class="${cs[n] ? 'ok' : 'bad'}">${cs[n]}</td><td class="muted">${ca[n]}</td></tr>`).join('');
    const run = g.currentId === 'DockRun' ? g.current : null;
    const last = tlm.events.slice(-4).map((e) => JSON.stringify(e).slice(0, 160)).join('\n');
    this.el.innerHTML = `
      <h3>DOCK RUSH DEV · ${g.currentId || ''}${run ? ' / ' + run.phaseName + (run.overlay ? ' + overlay' : '') : ''}</h3>
      ${run ? `<div class="muted">score ${run.stats.score} · fever ${run.fever.toFixed(2)} tier ${run.feverTier} (×${run.feverMult()}) peak ${run.stats.feverPeak} · streak ${run.stats.streak} · golden ${run.stats.golden} · detonated ${run.stats.timedSpills} · frozen left ${run.smash.crates.filter((c) => c.alive && c.frozen).length}</div>` : ''}
      <div class="muted">app ${CC.CONFIG.APP_VER} · schema ${CC.CONFIG.SCHEMA_VER} · user ${tlm.identity.user_id.slice(0, 8)} · session ${tlm.session_id.slice(0, 8)}${tlm.ended ? ' (ended)' : ''}</div>
      <h4>Kade must-ship — ${allSession ? '<span style="color:#5fd38d">ALL GREEN (this session)</span>' : 'this session / all-time'}</h4>
      <table><tr><td class="muted">event</td><td class="muted">session</td><td class="muted">all</td></tr>${rows}</table>
      <div class="row">
        <button data-act="download" class="primary">Download JSONL (all)</button>
        <button data-act="download_session">Download (session)</button>
        <button data-act="copy">Copy JSONL</button>
      </div>
      <div class="row">
        <button data-act="end_session">Emit session_end</button>
        <button data-act="new_session">New session</button>
        <button data-act="bot">Run acceptance bot</button>
      </div>
      <h4>Cheats / nav</h4>
      <div class="row">
        <button data-act="coins">+1000 coins</button>
        <button data-act="freeze">${g.freezeTimer ? 'Timer: FROZEN (capture)' : 'Freeze timer (capture)'}</button>
        <button data-act="hub">→ Hub</button>
        <button data-act="sheet">Asset sheet</button>
        <button data-act="challenge_link">Open test challenge link (D03 · 250)</button>
        <button data-act="reset">Reset (fresh install)</button>
      </div>
      <div class="muted">coins ${g.p.coins} · smash Lv${g.p.upg_smash} · lanes ${g.p.upg_lanes} · sort Lv${g.p.upg_sort} · next D${CC.U.pad2(g.p.nextLevel)}</div>
      <div class="muted">input: ${g.input.down ? 'DOWN' : 'up'} · last ${g.input.lastEvent} · ${Math.round(g.input.x)},${Math.round(g.input.y)}${g.lastErr ? ' · <span style="color:#ff7b7b">frame error: ' + String(g.lastErr).replace(/</g, '&lt;').slice(0, 80) + '</span>' : ''}</div>
      <div class="muted">latency: event→handler ${g.input.lat.age.toFixed(1)}ms (worst ${g.input.lat.worstAge.toFixed(1)}) · handler ${g.input.lat.handler.toFixed(2)}ms (worst ${g.input.lat.worstHandler.toFixed(2)}) · ${'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove'}${g.p.challenge ? ' · challenge D' + CC.U.pad2(g.p.challenge.n) + ' beat ' + g.p.challenge.score : ''}</div>
      <h4>Last events</h4>
      <pre>${last.replace(/</g, '&lt;') || '—'}</pre>
    `;
  }
};
