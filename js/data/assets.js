/* CC_DockRush_* placeholder asset registry.
 * Every visual is a silhouette-first procedural placeholder keyed by its canonical asset ID
 * (UI-UX-ASSET-DIRECTION-v1 §3). Swap the draw fn for a sprite later — same ID, same call site. */
window.CC = window.CC || {};

(function () {
  const C = CC.CONFIG.COLORS;
  const U = CC.U;
  const A = {};

  // ---------- A. Crates ----------
  function crateBody(ctx, x, y, w, h, base, dark, light) {
    ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = dark; ctx.fillRect(x, y + h * 0.3, w, 4); ctx.fillRect(x, y + h * 0.66, w, 4);
    ctx.fillStyle = light; ctx.fillRect(x + 4, y + 4, w - 8, 5);
    ctx.strokeStyle = dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 6, y + h - 6); ctx.lineTo(x + w - 6, y + 6); ctx.stroke();
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  }
  A['CC_DockRush_Crate_Wood_Closed_v1'] = { cat: 'Crate', draw(ctx, x, y, w, h) { crateBody(ctx, x, y, w, h, C.Wood, C.WoodDark, C.WoodLight); } };
  A['CC_DockRush_Crate_Wood_Cracked_v1'] = { cat: 'Crate', draw(ctx, x, y, w, h) {
    crateBody(ctx, x, y, w, h, U.shade(C.Wood, -0.1), C.WoodDark, C.WoodLight);
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + w * 0.5, y); ctx.lineTo(x + w * 0.42, y + h * 0.3); ctx.lineTo(x + w * 0.58, y + h * 0.5); ctx.lineTo(x + w * 0.45, y + h * 0.75); ctx.lineTo(x + w * 0.5, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.42, y + h * 0.3); ctx.lineTo(x + w * 0.2, y + h * 0.42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.58, y + h * 0.5); ctx.lineTo(x + w * 0.82, y + h * 0.62); ctx.stroke();
  } };
  A['CC_DockRush_Crate_Wood_Debris_v1'] = { cat: 'Crate', draw(ctx, x, y, w, h) {
    ctx.fillStyle = C.Wood; ctx.strokeStyle = C.Outline; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(x + w * (0.15 + i * 0.18), y + h * (0.3 + (i % 2) * 0.4)); ctx.rotate(i * 0.7); ctx.fillRect(-9, -4, 18, 8); ctx.strokeRect(-9, -4, 18, 8); ctx.restore(); }
  } };
  A['CC_DockRush_Crate_Metal_Closed_v1'] = { cat: 'Crate', draw(ctx, x, y, w, h) {
    ctx.fillStyle = C.Metal; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.MetalDark; ctx.fillRect(x, y, w, 6); ctx.fillRect(x, y + h - 6, w, 6); ctx.fillRect(x, y, 6, h); ctx.fillRect(x + w - 6, y, 6, h);
    ctx.fillStyle = U.shade(C.Metal, 0.3); ctx.fillRect(x + 10, y + 10, w - 20, 4);
    ctx.fillStyle = C.Outline;
    for (const [rx, ry] of [[0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]]) { ctx.beginPath(); ctx.arc(x + w * rx, y + h * ry, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  } };

  A['CC_DockRush_Crate_Steel_Weighted_v1'] = { cat: 'Crate', draw(ctx, x, y, w, h, o) {
    // weighted steel: dark slab, three weight plates, kettlebell glyph; o.lift 0..1 = lift meter (bar under the crate)
    const lift = (o && o.lift) || 0;
    ctx.fillStyle = '#4a5261'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#2f3540'; ctx.fillRect(x, y, w, 8); ctx.fillRect(x, y + h - 8, w, 8);
    ctx.fillStyle = U.shade('#4a5261', 0.25); ctx.fillRect(x + 8, y + 12, w - 16, 3);
    // weight plates
    ctx.fillStyle = '#20252d'; ctx.strokeStyle = C.Outline; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const px = x + w * (0.18 + i * 0.24), pw = w * 0.16; ctx.fillRect(px, y + h * 0.3, pw, h * 0.42); ctx.strokeRect(px, y + h * 0.3, pw, h * 0.42); }
    // handle
    ctx.strokeStyle = '#8d97a8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.3, w * 0.16, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
    // "tap tap tap" glyph — three dots so the rule reads without color
    ctx.fillStyle = C.Text_Primary; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + w * (0.66 + i * 0.12), y + h * 0.86, 3.5, 0, Math.PI * 2); ctx.fill(); }
    if (lift > 0) {
      U.fillRRect(ctx, x + 6, y + h + 6, w - 12, 7, 3, C.BG_UI);
      U.fillRRect(ctx, x + 7, y + h + 7, (w - 14) * lift, 5, 2, lift > 0.75 ? C.Safe : C.Warn);
      U.strokeRRect(ctx, x + 6, y + h + 6, w - 12, 7, 3, C.Outline, 1.5);
    }
  } };
  A['CC_DockRush_Crate_Jackpot_v1'] = { cat: 'Crate', draw(ctx, x, y, w, h, o) {
    // rare jackpot crate: gold-banded, star badge, slow glint; reads as "priority" in 1-bit via the star silhouette
    const t = (o && o.t) || 0;
    ctx.fillStyle = '#d9a13a'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#8a5f14'; ctx.fillRect(x, y + h * 0.3, w, 5); ctx.fillRect(x, y + h * 0.66, w, 5);
    ctx.fillStyle = '#ffe6a3'; ctx.fillRect(x + 4, y + 4, w - 8, 5);
    ctx.fillStyle = '#5a3d0a'; ctx.fillRect(x + w * 0.42, y, w * 0.16, h);
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
    // star badge
    const cx = x + w / 2, cy = y + h / 2, r = w * 0.2;
    ctx.fillStyle = '#fff6c8'; ctx.strokeStyle = C.Outline; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; i ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // glint sweep
    const gx = x + ((t * 60) % (w + 30)) - 15;
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.fillRect(gx, y, 6, h); ctx.globalAlpha = 1;
  } };
  A['CC_DockRush_Crate_Magnet_Plate_v1'] = { cat: 'Crate', draw(ctx, x, y, w, h) {
    // horseshoe magnet plate riveted on a crate corner: red/blue poles, silver tips
    const px = x + w * 0.6, py = y + h * 0.08, pw = w * 0.34, ph = h * 0.36;
    U.fillRRect(ctx, px, py, pw, ph, 4, '#20252d'); U.strokeRRect(ctx, px, py, pw, ph, 4, C.Outline, 2);
    const cx = px + pw / 2, cy = py + ph * 0.42, r = pw * 0.3;
    ctx.lineWidth = Math.max(4, pw * 0.22); ctx.lineCap = 'butt';
    ctx.strokeStyle = '#e04848'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = '#3d8bfd'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 1.5, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e04848'; ctx.fillRect(cx - r - ctx.lineWidth / 2, cy, ctx.lineWidth, ph * 0.3);
    ctx.fillStyle = '#3d8bfd'; ctx.fillRect(cx + r - ctx.lineWidth / 2, cy, ctx.lineWidth, ph * 0.3);
    ctx.fillStyle = '#e9edf3'; ctx.fillRect(cx - r - ctx.lineWidth / 2, cy + ph * 0.3, ctx.lineWidth, 4); ctx.fillRect(cx + r - ctx.lineWidth / 2, cy + ph * 0.3, ctx.lineWidth, 4);
  } };

  A['CC_DockRush_Crate_Frozen_Shell_v1'] = { cat: 'Crate', draw(ctx, x, y, w, h, o) {
    // ice shell over any crate: pale-blue translucent slab + cracks; o.cracked after the first tap
    ctx.fillStyle = 'rgba(160,220,255,0.55)'; U.rrect(ctx, x - 3, y - 3, w + 6, h + 6, 8); ctx.fill();
    ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x + w * 0.12, y + h * 0.1, w * 0.18, h * 0.42);
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w * 0.55, y - 3); ctx.lineTo(x + w * 0.62, y + h * 0.3); ctx.lineTo(x + w * 0.5, y + h * 0.55); ctx.stroke();
    if (o && o.cracked) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.6); ctx.lineTo(x + w * 0.45, y + h * 0.5); ctx.lineTo(x + w * 0.5, y + h * 0.9);
      ctx.moveTo(x + w * 0.45, y + h * 0.5); ctx.lineTo(x + w * 0.85, y + h * 0.35); ctx.stroke();
    }
    // "tap ×2" glyph so the rule reads without color
    ctx.fillStyle = C.Text_Ink; ctx.beginPath(); ctx.arc(x + w * 0.72, y + h * 0.78, 5, 0, Math.PI * 2); ctx.arc(x + w * 0.86, y + h * 0.78, 5, 0, Math.PI * 2); ctx.fill();
  } };

  // ---------- B. Cargo ----------
  for (const t of CC.CARGO) A[t.asset] = { cat: 'Cargo', draw(ctx, x, y, w, h) { CC.drawCargo(ctx, t, x + w / 2, y + h / 2, Math.min(w, h) * 0.75, 'idle'); } };

  // ---------- C. Lanes ----------
  A['CC_DockRush_Lane_Base_v1'] = { cat: 'Lane', draw(ctx, x, y, w, h, o) {
    o = o || {};
    // floor strip (slight perspective) + mouth
    ctx.fillStyle = o.floor || U.shade(C.BG_DockDark, -0.15);
    ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + w - 6, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 3; ctx.stroke();
    // mouth collider visual
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 6, y, w - 12, 10);
  } };
  A['CC_DockRush_Lane_Rim_v1'] = { cat: 'Lane', draw(ctx, x, y, w, h, o) {
    // recolorable rim + icon plaque (Lane_Rim_TypeA–E share this draw with a color/type)
    const col = o && o.color ? o.color : '#888';
    const rim = U.desat(col, 0.45);
    ctx.fillStyle = rim; ctx.fillRect(x, y - 6, w, 12);
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 3; ctx.strokeRect(x, y - 6, w, 12);
    // plaque
    const pw = Math.min(64, w - 16), ph = 54, px = x + w / 2 - pw / 2, py = y + h * 0.35;
    U.fillRRect(ctx, px, py, pw, ph, 8, C.BG_UI); U.strokeRRect(ctx, px, py, pw, ph, 8, rim, 3);
    if (o && o.type) CC.drawCargo(ctx, o.type, px + pw / 2, py + ph / 2, 30, 'idle', { mute: o.mute || 0 });
  } };
  A['CC_DockRush_Lane_FillMeter_v1'] = { cat: 'Lane', draw(ctx, x, y, w, h, o) {
    const ratio = o && o.ratio != null ? o.ratio : 0.5;
    U.fillRRect(ctx, x, y, w, h, 4, C.BG_UI); 
    const fh = Math.max(0, (h - 4) * ratio);
    U.fillRRect(ctx, x + 2, y + h - 2 - fh, w - 4, fh, 3, (o && o.color) || C.Safe);
    U.strokeRRect(ctx, x, y, w, h, 4, C.Outline, 2);
  } };

  // ---------- D. Forklift (timer antagonist) ----------
  A['CC_DockRush_Forklift_Hero_Default_v1'] = { cat: 'Forklift', draw(ctx, x, y, w, h, o) {
    const warn = o && o.warn;
    const body = warn ? '#d8a531' : '#c98f22';
    ctx.save(); ctx.translate(x, y);
    const s = w / 100;
    ctx.scale(s, s);
    ctx.lineWidth = 3 / s; ctx.strokeStyle = C.Outline;
    // wheels
    ctx.fillStyle = '#1a1d24';
    ctx.beginPath(); ctx.arc(22, 58, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(68, 58, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // body
    ctx.fillStyle = body; U.rrect(ctx, 6, 30, 76, 24, 4); ctx.fill(); ctx.stroke();
    // cab
    ctx.fillStyle = U.shade(body, -0.2); ctx.fillRect(30, 8, 34, 24); ctx.strokeRect(30, 8, 34, 24);
    ctx.fillStyle = '#9fd3ff'; ctx.fillRect(36, 12, 22, 14);
    // mast + fork
    ctx.fillStyle = C.MetalDark; ctx.fillRect(82, 4, 6, 56); ctx.strokeRect(82, 4, 6, 56);
    ctx.fillStyle = C.Metal; ctx.fillRect(88, 52, 12, 5); ctx.strokeRect(88, 52, 12, 5);
    // beacon
    ctx.fillStyle = warn ? C.Fail : C.Warn; ctx.beginPath(); ctx.arc(46, 4, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  } };

  // ---------- E. Stage / truck ----------
  A['CC_DockRush_Truck_Bay_v1'] = { cat: 'Stage', draw(ctx, x, y, w, h, o) {
    // states: Empty / Filling / Full via o.ratio and o.full
    const ratio = o && o.ratio != null ? o.ratio : 0;
    const full = o && o.full;
    // trailer box
    ctx.fillStyle = full ? '#e9edf3' : '#c9d0da'; U.rrect(ctx, x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 3; ctx.stroke();
    // open bay (dark interior)
    ctx.fillStyle = '#1a1e26'; ctx.fillRect(x + 8, y + 8, w - 16, h - 30);
    // cargo silhouettes inside
    const inner = w - 16, cnt = Math.round(ratio * 10);
    ctx.fillStyle = full ? C.Warn : '#6c7686';
    for (let i = 0; i < cnt; i++) ctx.fillRect(x + 10 + (i % 5) * (inner / 5), y + h - 30 - 12 - Math.floor(i / 5) * 14, inner / 5 - 4, 12);
    // fill bar
    const bx = x + 8, by = y + h - 18, bw = w - 16, bh = 10;
    U.fillRRect(ctx, bx, by, bw, bh, 4, C.BG_UI);
    U.fillRRect(ctx, bx + 1, by + 1, Math.max(0, (bw - 2) * ratio), bh - 2, 3, full ? C.Safe : C.Warn);
    U.strokeRRect(ctx, bx, by, bw, bh, 4, C.Outline, 2);
    // wheels
    ctx.fillStyle = '#1a1d24';
    for (const wx of [x + 24, x + w - 24]) { ctx.beginPath(); ctx.arc(wx, y + h + 4, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  } };
  A['CC_DockRush_Truck_Cab_Simple_v1'] = { cat: 'Stage', draw(ctx, x, y, w, h) {
    ctx.fillStyle = '#4f7fd6'; U.rrect(ctx, x, y + h * 0.3, w, h * 0.7, 6); ctx.fill(); ctx.strokeStyle = C.Outline; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#9fd3ff'; ctx.fillRect(x + w * 0.2, y + h * 0.4, w * 0.5, h * 0.25);
    ctx.fillStyle = '#1a1d24'; ctx.beginPath(); ctx.arc(x + w * 0.5, y + h + 4, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } };
  A['CC_DockRush_Env_Cone_v1'] = { cat: 'Stage', draw(ctx, x, y, w, h) {
    ctx.fillStyle = '#ff7b2e'; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(x + w * 0.3, y + h * 0.5, w * 0.4, 4);
  } };

  // ---------- G. UI kit ----------
  A['CC_DockRush_UI_Icon_Smash_v1'] = { cat: 'UI', draw(ctx, x, y, w, h, o) {
    // fist silhouette
    ctx.fillStyle = (o && o.color) || C.Text_Primary; ctx.strokeStyle = C.Outline; ctx.lineWidth = 3;
    U.rrect(ctx, x + w * 0.15, y + h * 0.3, w * 0.7, h * 0.5, w * 0.15); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) { U.rrect(ctx, x + w * (0.17 + i * 0.17), y + h * 0.18, w * 0.15, h * 0.26, 4); ctx.fill(); ctx.stroke(); }
    U.rrect(ctx, x + w * 0.05, y + h * 0.42, w * 0.18, h * 0.3, 5); ctx.fill(); ctx.stroke();
  } };
  A['CC_DockRush_UI_Icon_Swipe_v1'] = { cat: 'UI', draw(ctx, x, y, w, h, o) {
    ctx.strokeStyle = (o && o.color) || C.Text_Primary; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cy = y + h / 2;
    ctx.beginPath(); ctx.moveTo(x + w * 0.5, cy); ctx.lineTo(x + w * 0.08, cy); ctx.moveTo(x + w * 0.22, cy - h * 0.18); ctx.lineTo(x + w * 0.08, cy); ctx.lineTo(x + w * 0.22, cy + h * 0.18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.5, cy); ctx.lineTo(x + w * 0.92, cy); ctx.moveTo(x + w * 0.78, cy - h * 0.18); ctx.lineTo(x + w * 0.92, cy); ctx.lineTo(x + w * 0.78, cy + h * 0.18); ctx.stroke();
    ctx.fillStyle = (o && o.color) || C.Text_Primary; ctx.beginPath(); ctx.arc(x + w * 0.5, cy, 7, 0, Math.PI * 2); ctx.fill();
  } };
  A['CC_DockRush_UI_Icon_Truck_v1'] = { cat: 'UI', draw(ctx, x, y, w, h, o) {
    ctx.fillStyle = (o && o.color) || C.Text_Primary; ctx.strokeStyle = C.Outline; ctx.lineWidth = 2;
    ctx.fillRect(x + w * 0.05, y + h * 0.3, w * 0.6, h * 0.4); ctx.strokeRect(x + w * 0.05, y + h * 0.3, w * 0.6, h * 0.4);
    U.rrect(ctx, x + w * 0.65, y + h * 0.42, w * 0.3, h * 0.28, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.Outline; ctx.beginPath(); ctx.arc(x + w * 0.22, y + h * 0.74, w * 0.09, 0, Math.PI * 2); ctx.arc(x + w * 0.78, y + h * 0.74, w * 0.09, 0, Math.PI * 2); ctx.fill();
  } };
  A['CC_DockRush_UI_Icon_Upgrade_v1'] = { cat: 'UI', draw(ctx, x, y, w, h, o) {
    ctx.fillStyle = (o && o.color) || C.Text_Primary; ctx.strokeStyle = C.Outline; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.1); ctx.lineTo(x + w * 0.9, y + h * 0.5); ctx.lineTo(x + w * 0.68, y + h * 0.5); ctx.lineTo(x + w * 0.68, y + h * 0.9); ctx.lineTo(x + w * 0.32, y + h * 0.9); ctx.lineTo(x + w * 0.32, y + h * 0.5); ctx.lineTo(x + w * 0.1, y + h * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  } };
  A['CC_DockRush_UI_Timer_Ring_v1'] = { cat: 'UI', draw(ctx, x, y, w, h, o) {
    // ring + icon + motion pulse (not color-only)
    const ratio = o && o.ratio != null ? o.ratio : 1;
    const r = Math.min(w, h) / 2 - 4, cx = x + w / 2, cy = y + h / 2;
    const panic = ratio < 0.25;
    const pulse = panic ? 1 + Math.sin(performance.now() / 90) * 0.08 : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse);
    ctx.lineWidth = 7; ctx.strokeStyle = C.BG_UI2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = ratio > 0.5 ? C.Safe : ratio > 0.25 ? C.Warn : C.Fail;
    ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio); ctx.stroke();
    // hourglass icon
    ctx.fillStyle = C.Text_Primary;
    const s = r * 0.5;
    ctx.beginPath(); ctx.moveTo(-s * 0.6, -s); ctx.lineTo(s * 0.6, -s); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.6, s); ctx.lineTo(s * 0.6, s); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (o && o.label != null) U.text(ctx, o.label, cx, cy + r + 12, { size: 12, color: C.Text_Secondary });
  } };
  A['CC_DockRush_UI_Fever_Ring_v1'] = { cat: 'UI', draw(ctx, x, y, w, h, o) {
    // outer flow/fever arc around the timer ring: value 0..1, tier 0..3 colors the arc; tick marks at tier thresholds
    const v = o && o.value != null ? o.value : 0.5, tier = (o && o.tier) || 0;
    const r = Math.min(w, h) / 2 - 2, cx = x + w / 2, cy = y + h / 2;
    const col = ['#4a5468', C.Warn, C.Accent_SmashHot, '#ffffff'][tier];
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    if (v > 0) {
      ctx.strokeStyle = col; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, v)); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 2;
    for (const t of CC.CONFIG.FEVER.tiers) { const a = -Math.PI / 2 + Math.PI * 2 * t; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); ctx.lineTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4)); ctx.stroke(); }
  } };
  A['CC_DockRush_UI_Badge_Streak_v1'] = { cat: 'UI', draw(ctx, x, y, w, h, o) {
    U.fillRRect(ctx, x, y, w, h, h / 2, C.BG_UI); U.strokeRRect(ctx, x, y, w, h, h / 2, C.Warn, 3);
    U.text(ctx, (o && o.label) || 'STREAK 12', x + w / 2, y + h / 2, { size: h * 0.45, weight: 900, color: C.Warn });
  } };
  A['CC_DockRush_UI_Coin_v1'] = { cat: 'UI', draw(ctx, x, y, w, h) {
    const r = Math.min(w, h) / 2;
    ctx.fillStyle = '#f2b134'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.Outline; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#b8801a'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe08a'; ctx.fillRect(x + w / 2 - 2, y + h / 2 - r * 0.4, 4, r * 0.8);
  } };

  CC.ASSETS = A;
  CC.drawAsset = function (id, ctx, x, y, w, h, opts) {
    const a = A[id];
    if (!a) { ctx.fillStyle = '#f0f'; ctx.fillRect(x, y, w, h); return; }
    a.draw(ctx, x, y, w, h, opts);
  };
})();
