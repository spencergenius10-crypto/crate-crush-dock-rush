/* CC_FX_* — mute-readable juice: bursts, chips, trails, flashes, hit-stop, shake, haptic hook. */
window.CC = window.CC || {};

CC.FX = class {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.flash = 0;          // white/amber overlay alpha
    this.flashColor = '#fff';
    this.hitStop = 0;        // seconds world update is frozen
    this.shake = 0;          // px
    this.scale = 1;          // capture preset bumps FX scale
    this.hapticsEnabled = true;
  }

  // ---- hooks ----
  haptic(ms) {
    if (!this.hapticsEnabled) return;
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (_) {} }
  }
  doHitStop(s) { this.hitStop = Math.max(this.hitStop, s); }
  doFlash(a, color) { this.flash = Math.max(this.flash, a); this.flashColor = color || '#fff'; }
  doShake(px) { this.shake = Math.max(this.shake, px); }

  // ---- emitters (CC_FX ids) ----
  smashBurst(x, y, color, big) {
    // CC_FX_Smash_Burst — radial burst; CC_FX_Smash_HitStopFlash — 1–2 frame flash
    const n = (big ? 26 : 12) * this.scale;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = CC.U.rand(160, big ? 520 : 320);
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: CC.U.rand(0.25, 0.5), t: 0, r: CC.U.rand(3, big ? 7 : 5), color: color || CC.CONFIG.COLORS.Accent_Smash });
    }
    this.particles.push({ kind: 'ring', x, y, life: big ? 0.3 : 0.2, t: 0, r0: big ? 26 : 14, r1: big ? 105 : 56, color: color || CC.CONFIG.COLORS.Accent_Smash });
    if (big) { this.doFlash(0.35, '#ffd18a'); this.doHitStop(0.045); this.doShake(6); this.haptic(30); }
    else { this.doHitStop(0.02); this.haptic(10); }
  }
  debris(x, y, w, h, colors, n) {
    // CC_Crate_Wood_Debris — 4–6 chip sprites (pooled)
    n = n || 6;
    for (let i = 0; i < n; i++) {
      this.particles.push({ kind: 'chip', x: x + CC.U.rand(0, w), y: y + CC.U.rand(0, h), vx: CC.U.rand(-260, 260), vy: CC.U.rand(-520, -160), rot: Math.random() * 6, vr: CC.U.rand(-10, 10), life: CC.U.rand(0.7, 1.1), t: 0, w: CC.U.rand(8, 18), h: CC.U.rand(5, 9), color: CC.U.pick(colors) });
    }
  }
  splinters(x, y, w, h, colors, n, floorY) {
    // CC_FX_Smash_Splinters — long pointed shards that spin out, hit the floor line, skid and rest before fading
    n = (n || 10) * this.scale;
    for (let i = 0; i < n; i++) {
      const a = CC.U.rand(-Math.PI, 0) , sp = CC.U.rand(260, 640);
      this.particles.push({ kind: 'splinter', x: x + CC.U.rand(0, w), y: y + CC.U.rand(0, h), vx: Math.cos(a) * sp * CC.U.rand(0.4, 1), vy: Math.sin(a) * sp, rot: Math.random() * 6, vr: CC.U.rand(-18, 18), life: CC.U.rand(0.9, 1.4), t: 0, len: CC.U.rand(12, 30), thick: CC.U.rand(2.5, 5), color: CC.U.pick(colors), floor: floorY || (y + h + CC.U.rand(0, 18)), rest: false });
    }
  }
  ember(x, y, color) {
    // CC_FX_Fever_Trail — peak-fever trail: rising sparks that hang behind the cargo
    for (let i = 0; i < 2; i++) this.particles.push({ kind: 'spark', x: x + CC.U.rand(-8, 8), y: y + CC.U.rand(-8, 8), vx: CC.U.rand(-40, 40), vy: CC.U.rand(-120, -30), life: CC.U.rand(0.3, 0.55), t: 0, r: CC.U.rand(2, 4), color });
  }
  // haptic vocabulary (navigator.vibrate patterns, ms) — one place so feel stays consistent
  hapticPerfect() { this.haptic([12, 20, 24]); }
  hapticStreak(step) { this.haptic(step ? [18, 30, 18, 30, 36] : 8); }
  hapticNearMiss() { this.haptic([30, 40, 30]); }
  hapticFever(tier) { this.haptic(tier >= 3 ? [20, 30, 40, 30, 60] : [20, 30, 40]); }
  trail(x, y, color) {
    // CC_FX_Cargo_Bounce trail — directional swipe trail
    this.particles.push({ kind: 'trail', x, y, life: 0.28, t: 0, r: 10 * this.scale, color });
  }
  accept(x, y, color) {
    // CC_FX_Lane_Accept — positive confirm
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + CC.U.rand(-1.1, 1.1), sp = CC.U.rand(120, 300);
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, t: 0, r: 4, color });
    }
    this.particles.push({ kind: 'ring', x, y, life: 0.25, t: 0, r0: 10, r1: 60, color });
    this.haptic(8);
  }
  spill(x, y) {
    // CC_FX_Spill_Puddle — contrasting hue vs floor so the near-miss reads mid-frame
    this.particles.push({ kind: 'puddle', x, y, life: 1.6, t: 0, r0: 10, r1: 58, color: CC.CONFIG.COLORS.Spill });
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, sp = CC.U.rand(80, 220);
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.4 - 100, life: 0.5, t: 0, r: 4, color: CC.CONFIG.COLORS.Spill });
    }
    this.doShake(4); this.haptic(40);
  }
  suck(x0, y0, x1, y1, color) {
    // CC_FX_Truck_Suck — linear streak
    this.particles.push({ kind: 'streak', x0, y0, x1, y1, life: 0.3, t: 0, color });
  }
  sting(x, y) {
    // CC_FX_PerfectClear_Sting — end beat
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, sp = CC.U.rand(200, 620);
      this.particles.push({ kind: 'chip', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200, rot: Math.random() * 6, vr: CC.U.rand(-12, 12), life: CC.U.rand(0.9, 1.5), t: 0, w: 12, h: 8, color: CC.U.pick(['#ffd18a', '#f2b134', '#3d8bfd', '#b6e24b', '#a15df0', '#ff6fa3', '#fff']) });
    }
    this.doFlash(0.5, '#fff'); this.doShake(12); this.doHitStop(0.08); this.haptic([40, 40, 80]);
  }
  upgradeSpark(x, y) {
    // CC_FX_Upgrade_Spark — meta juice (Hub/Upgrade only)
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, sp = CC.U.rand(120, 380);
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6, t: 0, r: 4, color: '#ffe08a' });
    }
    this.doFlash(0.15, '#ffe08a'); this.haptic(20);
  }
  floatText(x, y, str, color, size, opts) {
    opts = opts || {};
    this.texts.push({ x, y, str, color: color || '#fff', size: size || 26, life: opts.life || 0.9, t: 0, vy: opts.vy == null ? -70 : opts.vy, punch: opts.punch || 0 });
  }

  update(dt) {
    this.flash = Math.max(0, this.flash - dt * 4);
    this.shake = Math.max(0, this.shake - dt * 40);
    const g = CC.CONFIG.GRAVITY;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      if (p.t >= p.life) { this.particles.splice(i, 1); continue; }
      if (p.kind === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
      else if (p.kind === 'chip') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += g * dt; p.rot += p.vr * dt; }
      else if (p.kind === 'splinter') {
        if (p.rest) continue;
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += g * dt; p.rot += p.vr * dt;
        if (p.y >= p.floor && p.vy > 0) {
          // one hard bounce, then skid to rest lying flat-ish
          p.y = p.floor;
          if (Math.abs(p.vy) > 220) { p.vy = -p.vy * 0.3; p.vx *= 0.6; p.vr *= 0.5; }
          else { p.rest = true; p.rot = Math.round(p.rot / Math.PI) * Math.PI + CC.U.rand(-0.15, 0.15); }
        }
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt; t.y += t.vy * dt;
      if (t.t >= t.life) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const k = p.t / p.life, a = 1 - k;
      ctx.globalAlpha = a;
      if (p.kind === 'spark') {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'ring') {
        const r = CC.U.lerp(p.r0, p.r1, CC.U.easeOutCubic(k));
        ctx.strokeStyle = p.color; ctx.lineWidth = 6 * (1 - k) + 1; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'chip') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.strokeStyle = CC.CONFIG.COLORS.Outline; ctx.lineWidth = 1.5; ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      } else if (p.kind === 'splinter') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.strokeStyle = CC.CONFIG.COLORS.Outline; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-p.len / 2, 0); ctx.lineTo(-p.len * 0.2, -p.thick); ctx.lineTo(p.len / 2, 0); ctx.lineTo(-p.len * 0.2, p.thick); ctx.closePath();
        ctx.fill(); ctx.stroke(); ctx.restore();
      } else if (p.kind === 'trail') {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - k), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'puddle') {
        const r = CC.U.lerp(p.r0, p.r1, CC.U.easeOutCubic(Math.min(1, k * 3)));
        ctx.globalAlpha = Math.min(1, a * 1.4) * 0.85;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = CC.CONFIG.COLORS.Outline; ctx.lineWidth = 2; ctx.stroke();
      } else if (p.kind === 'streak') {
        const x = CC.U.lerp(p.x0, p.x1, k), y = CC.U.lerp(p.y0, p.y1, k);
        ctx.strokeStyle = p.color; ctx.lineWidth = 8 * (1 - k) + 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(CC.U.lerp(p.x0, p.x1, Math.max(0, k - 0.25)), CC.U.lerp(p.y0, p.y1, Math.max(0, k - 0.25))); ctx.lineTo(x, y); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const k = t.t / t.life;
      const pop = t.punch ? 1 + Math.max(0, 0.6 - k * 3) : 1;
      ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      CC.U.text(ctx, t.str, t.x, t.y, { size: t.size * pop, weight: 900, color: t.color, stroke: CC.CONFIG.COLORS.Outline, strokeWidth: 7 });
    }
    ctx.globalAlpha = 1;
    if (this.flash > 0) { ctx.globalAlpha = this.flash; ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, CC.CONFIG.W, CC.CONFIG.H); ctx.globalAlpha = 1; }
  }
};
