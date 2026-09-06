/* Share Score / Challenge a Friend — organic loop, $0 ads, no paywall.
 * Payload rides in the URL hash: `#challenge=D03-412-7-31-c` = dock 03, haul 412, streak 7, 31 s, cleared.
 * Web Share API first (with a PNG score card when the target accepts files), clipboard fallback, prompt last. */
window.CC = window.CC || {};

CC.Share = {
  // ---- payload ----
  encode(ch) { return `D${CC.U.pad2(ch.n)}-${ch.score | 0}-${ch.streak | 0}-${ch.time | 0}-${ch.cleared ? 'c' : 'f'}`; },
  decode(str) {
    const m = /^D(\d{1,2})-(\d+)-(\d+)-(\d+)-([cf])$/.exec(str || '');
    if (!m) return null;
    const n = CC.U.clamp(parseInt(m[1], 10), 1, 50);
    return { n, level_id: 'D' + CC.U.pad2(n), score: parseInt(m[2], 10), streak: parseInt(m[3], 10), time: parseInt(m[4], 10), cleared: m[5] === 'c' };
  },
  baseURL() {
    if (location.origin && location.origin !== 'null') return location.origin + location.pathname;
    return location.href.split(/[?#]/)[0]; // file:// while developing
  },
  challengeURL(ch) { return this.baseURL() + '#challenge=' + this.encode(ch); },

  // Read + consume an inbound challenge from the hash (called before telemetry starts so `install` can attribute it).
  parseInbound() {
    const ch = this.decode(CC.U.hashParam('challenge'));
    if (!ch) return null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    return ch;
  },

  // ---- copy ----
  text(kind, ch) {
    const dock = `Dock ${CC.U.pad2(ch.n)}`, brand = `${CC.BRAND.game} (${CC.BRAND.mode} mode)`;
    if (kind === 'challenge') {
      return ch.cleared
        ? `I challenge you: beat my ${ch.score} haul on ${dock} in ${brand}.`
        : `I challenge you: clear ${dock} in ${brand} — I got ${ch.score} and spilled out.`;
    }
    return ch.cleared
      ? `${brand} — ${ch.score} haul on ${dock}, streak ${ch.streak}, ${ch.time}s. Beat it?`
      : `${brand} — ${dock} beat me at ${ch.score}. Your turn.`;
  },

  // ---- delivery: web share → clipboard → prompt. Resolves with the method that worked. ----
  // Must be called synchronously from the pointer handler so transient user activation is still valid.
  async deliver(payload, file) {
    const full = payload.text + '\n' + payload.url;
    if (navigator.share) {
      try {
        // with files some targets drop `url`, so the link also lives in `text`
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ title: payload.title, text: full, files: [file] }); return 'web_share'; }
        await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
        return 'web_share';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'cancelled';
        // fall through to clipboard
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(full); return 'clipboard'; } catch (_) {}
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = full; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      if (ok) return 'clipboard';
    } catch (_) {}
    try { window.prompt('Copy your link:', full); return 'prompt'; } catch (_) {}
    return 'failed';
  },

  // ---- score card (PNG, 1080×1920 = 2× the logical stage; cheap: one offscreen paint at Results) ----
  renderCard(ch, opts) {
    opts = opts || {};
    const C = CC.CONFIG.COLORS, W = CC.CONFIG.W, H = CC.CONFIG.H, S = 2;
    const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
    const ctx = cv.getContext('2d'); ctx.scale(S, S);
    ctx.fillStyle = C.BG_UI; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#20262f'; for (let i = 0; i < 6; i++) ctx.fillRect(i * 90 + 4, 0, 82, H);
    CC.drawAsset('CC_DockRush_Crate_Wood_Closed_v1', ctx, W / 2 - 50, 120, 100, 100);
    CC.UI.brandLockup(ctx, W / 2, 270, { size: 40 });
    CC.UI.panel(ctx, 50, 370, 440, 400, { stroke: ch.cleared ? C.Safe : C.Fail });
    CC.U.text(ctx, ch.cleared ? 'DOCK CLEAR' : 'DOCK FAILED', W / 2, 420, { size: 38, weight: 900, color: ch.cleared ? C.Warn : C.Fail, stroke: C.Outline, strokeWidth: 7 });
    CC.U.text(ctx, `DOCK ${CC.U.pad2(ch.n)}`, W / 2, 458, { size: 16, weight: 800, color: C.Text_Secondary });
    CC.UI.panel(ctx, 80, 484, 380, 130, { fill: C.BG_UI2, stroke: '#3a4250' });
    CC.U.text(ctx, ch.cleared ? 'HAUL SCORE' : 'PROGRESS SCORE', W / 2, 512, { size: 14, weight: 800, color: C.Text_Secondary });
    CC.U.text(ctx, `${ch.score}`, W / 2, 566, { size: 68, weight: 900 });
    const rows = [['BEST STREAK', `${ch.streak}`], ['TIME', `${ch.time}s`]];
    if (opts.crates != null) rows.push(['CRATES', `${opts.crates}`]);
    rows.forEach(([a, b], i) => {
      const y = 650 + i * 32;
      CC.U.text(ctx, a, 100, y, { size: 15, weight: 800, align: 'left', color: C.Text_Secondary });
      CC.U.text(ctx, b, 440, y, { size: 18, weight: 900, align: 'right' });
    });
    CC.U.text(ctx, ch.cleared ? `BEAT MY ${ch.score}?` : 'CAN YOU CLEAR IT?', W / 2, 830, { size: 40, weight: 900, stroke: C.Outline, strokeWidth: 9 });
    let host = ''; try { host = new URL(this.baseURL()).host; } catch (_) {}
    CC.U.text(ctx, host ? `play free · ${host}` : 'play free in your browser', W / 2, 880, { size: 14, weight: 700, color: C.Text_Secondary });
    return cv;
  },
  cardFile(ch, opts) {
    return new Promise((resolve) => {
      try {
        this.renderCard(ch, opts).toBlob((blob) => {
          if (!blob || typeof File === 'undefined') return resolve(null);
          resolve(new File([blob], `crate-crush-dockrush-D${CC.U.pad2(ch.n)}-${ch.score}.png`, { type: 'image/png' }));
        }, 'image/png');
      } catch (_) { resolve(null); }
    });
  },
};
