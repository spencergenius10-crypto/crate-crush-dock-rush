/* Crate Crush — Mode: Dock Rush — global config (portrait 9:16 logical canvas) */
window.CC = window.CC || {};

// Master game is Crate Crush; Dock Rush is one Mode of it. All in-product copy reads from here.
CC.BRAND = {
  game: 'Crate Crush',
  mode: 'Dock Rush',
  modeId: 'dock_rush',
  full: 'Crate Crush — Mode: Dock Rush',
  chip: 'MODE · DOCK RUSH',
  studio: 'Ratio Studios',
};

CC.CONFIG = {
  W: 540,
  H: 960,
  APP_VER: '0.2.0-proto',
  SCHEMA_VER: '1.0',
  // Web prototype maps to the `editor` platform enum in telemetry-retention-v1.md
  PLATFORM: 'editor',
  PLATFORM_DETAIL: 'web',

  // TikTok safe band: critical action lives inside the center ~70% vertical.
  SAFE_TOP: 144,
  SAFE_BOTTOM: 816,

  // Stage regions (logical px). Same camera for Smash -> Sort -> Truck.
  STAGE: { top: 104, bottom: 856 },
  TRUCK: { x: 296, y: 150, w: 214, h: 92 },
  CRATES: { x: 40, y: 262, w: 460, h: 210 },
  CONVEYOR_Y: 520,
  LANES: { x: 30, y: 650, w: 480, h: 160 },
  WALL_L: 30,
  WALL_R: 510,

  // Sort feel
  GRAVITY: 1900,
  SORT_WAIT_S: 3.2,
  SPILLS_ALLOWED: 3,
  REVIVE_TIME_BONUS_S: 20,
  SWAP_LANE_PERIOD_S: 2.6,

  // Hazards
  TIMED_FUSE_S: 2.5,          // unstable cargo must be seated within this window
  FROZEN_DOUBLE_TAP_S: 0.45,  // second tap must land inside this window to shatter the ice
  GOLDEN_SCORE_MULT: 3,

  // Conveyor ramp / erratic feed as streak climbs (Sort)
  RAMP: { streakStart: 3, streakFull: 15, cadenceMin: 0.55, waitMin: 0.7, jitterMax: 110, slideVx: 260 },

  // Round events (Sort phase). A warning banner runs WARN_S before the event lands so it reads mute.
  EVENTS: {
    firstAt: 5.5,               // seconds into Sort before the first event can fire
    period: [9, 14],            // seconds between the end of one event and the next warning
    warn: 1.4,
    minRemaining: 5,            // no event when fewer pieces than this are left to sort
    rush: { dur: 8, belts: 2, cadenceMul: 0.55, waitMul: 0.85, slideVx: 320, feverGainMul: 1.25 },
    inspection: { dur: 8, mute: 0.88, swapAnimS: 0.45 },
    jackpot: { hp: 4, extraCargo: 2, score: 40, fever: 0.35 },
  },

  // Behaviours
  // Weighted steel: only explicit taps lift it; the lift meter holds for `grace` s after a tap then drains fast.
  STEEL: { tapGain: 0.22, grace: 0.25, decay: 1.2, liftPx: 16 },
  // Magnet cargo: in free flight below `fromY` it steers toward the nearest lane mouth within `radius` px.
  MAGNET: { radius: 78, fromY: 470, strength: 9, snapPx: 8 },
  // Fragile glass: a free flick faster than `maxSpeed`, a wall hit harder than `wallVx`, or a landing faster than
  // `landVy` shatters it (= spill). Tap-a-lane and drop-on-lane are gentle by definition.
  GLASS: { maxSpeed: 1150, wallVx: 520, landVy: 1250 },

  // Flow / Fever (0..1, decaying). Tiers → score multiplier 2× / 3× / 5×
  FEVER: {
    tiers: [0.3, 0.6, 0.9], mults: [1, 2, 3, 5],
    gainSort: 0.12, gainPerfect: 0.05, gainGolden: 0.2, gainSmash: 0.03, gainBreak: 0.05,
    decayBase: 0.05, decayHigh: 0.08, idleMult: 1.4, missMult: 0.45,
  },

  COLORS: {
    BG_Dock: '#3a4250',
    BG_DockDark: '#2c3340',
    BG_Wall: '#262c36',
    BG_UI: '#1e232c',
    BG_UI2: '#262d38',
    Accent_Smash: '#ffb347',
    Accent_SmashHot: '#ff7b2e',
    Safe: '#5fd38d',
    Warn: '#f2b134',
    Fail: '#ff5c5c',
    Text_Primary: '#f2f4f7',
    Text_Secondary: '#a7afbd',
    Text_Ink: '#14171c',
    Outline: '#0e1014',
    Wood: '#b7793f',
    WoodDark: '#7e4f24',
    WoodLight: '#d9a066',
    Metal: '#8d97a8',
    MetalDark: '#5b6473',
    Spill: '#7be0ff',
  },
};

CC.MUST_SHIP_EVENTS = [
  'install', 'session_start', 'session_end', 'dock_clear', 'dock_fail',
  'smash', 'sort_miss', 'revive', 'rv_watch', 'iap', 'tutorial_step',
];
