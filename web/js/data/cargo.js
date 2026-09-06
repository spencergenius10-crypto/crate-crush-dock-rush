/* CC_Cargo_* — shape AND color coded (≤5 types early). Never red-vs-green as the only cue. */
window.CC = window.CC || {};

CC.CARGO = [
  { id: 'A', key: 'boltbox',  asset: 'CC_DockRush_Cargo_BoltBox_v1',  name: 'Bolt Box', color: '#f2b134', glyph: 'hex' },
  { id: 'B', key: 'barrel',   asset: 'CC_DockRush_Cargo_Barrel_v1',   name: 'Barrel',   color: '#3d8bfd', glyph: 'cyl' },
  { id: 'C', key: 'pallet',   asset: 'CC_DockRush_Cargo_Pallet_v1',   name: 'Pallet',   color: '#b6e24b', glyph: 'flat' },
  { id: 'D', key: 'canister', asset: 'CC_DockRush_Cargo_Canister_v1', name: 'Canister', color: '#a15df0', glyph: 'capsule' },
  { id: 'E', key: 'parcel',   asset: 'CC_DockRush_Cargo_Parcel_v1',   name: 'Parcel',   color: '#ff6fa3', glyph: 'bag' },
];
CC.cargoById = function (id) { return CC.CARGO.find((c) => c.id === id); };

/* Draw a cargo glyph centered at (x,y) with nominal size s.
 * state: 'idle' | 'airborne' | 'seat' | 'spill' — same silhouette, squash/stretch varies. */
CC.drawCargo = function (ctx, type, x, y, s, state, opts) {
  opts = opts || {};
  const C = CC.CONFIG.COLORS;
  let sx = 1, sy = 1;
  if (state === 'airborne') { sx = 0.92; sy = 1.1; }
  else if (state === 'spill') { sx = 1.35; sy = 0.45; }
  else if (state === 'seat') { sx = 0.95; sy = 0.95; }
  if (opts.squash) { sx *= opts.squash.x; sy *= opts.squash.y; }
  ctx.save();
  ctx.translate(x, y);
  if (opts.rot) ctx.rotate(opts.rot);
  ctx.scale(sx, sy);
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.Outline;
  const fill = opts.fill || type.color;
  const dark = CC.U.shade(fill, -0.35);
  const lite = CC.U.shade(fill, 0.35);
  const h = s / 2;
  ctx.fillStyle = fill;
  switch (type.glyph) {
    case 'hex': {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; const px = Math.cos(a) * h, py = Math.sin(a) * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, 0, h * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lite; ctx.beginPath(); ctx.arc(0, 0, h * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-h * 0.18, 0); ctx.lineTo(h * 0.18, 0); ctx.stroke();
      break;
    }
    case 'cyl': {
      const w = s * 0.78, hh = s * 1.0;
      CC.U.rrect(ctx, -w / 2, -hh / 2, w, hh, w * 0.28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark; ctx.fillRect(-w / 2 + 3, -hh * 0.22, w - 6, 6); ctx.fillRect(-w / 2 + 3, hh * 0.14, w - 6, 6);
      ctx.fillStyle = lite; ctx.fillRect(-w * 0.32, -hh * 0.42, 6, hh * 0.84);
      break;
    }
    case 'flat': {
      const w = s * 1.15, hh = s * 0.5;
      ctx.beginPath(); ctx.rect(-w / 2, -hh / 2, w, hh); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark; for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + 6 + i * (w / 3), -hh / 2 + 5, w / 3 - 10, hh - 10);
      break;
    }
    case 'capsule': {
      const w = s * 0.58, hh = s * 1.15;
      CC.U.rrect(ctx, -w / 2, -hh / 2, w, hh, w / 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark; ctx.fillRect(-w * 0.22, -hh / 2 - 4, w * 0.44, 8);
      ctx.fillStyle = lite; ctx.beginPath(); ctx.ellipse(-w * 0.15, -hh * 0.05, w * 0.12, hh * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bag': {
      const w = s * 0.95, hh = s * 0.95;
      ctx.beginPath();
      ctx.moveTo(-w * 0.15, -hh / 2);
      ctx.lineTo(w * 0.15, -hh / 2);
      ctx.quadraticCurveTo(w * 0.55, -hh * 0.1, w / 2, hh * 0.3);
      ctx.quadraticCurveTo(w * 0.45, hh / 2, 0, hh / 2);
      ctx.quadraticCurveTo(-w * 0.45, hh / 2, -w / 2, hh * 0.3);
      ctx.quadraticCurveTo(-w * 0.55, -hh * 0.1, -w * 0.15, -hh / 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark; ctx.fillRect(-w * 0.2, -hh / 2 - 2, w * 0.4, 7);
      ctx.fillStyle = lite; ctx.beginPath(); ctx.ellipse(-w * 0.12, hh * 0.05, w * 0.1, hh * 0.18, 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
  ctx.restore();
};
