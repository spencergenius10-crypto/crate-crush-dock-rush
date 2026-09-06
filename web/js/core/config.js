/* Crate Crush: Dock Rush — global config (portrait 9:16 logical canvas) */
window.CC = window.CC || {};

CC.CONFIG = {
  W: 540,
  H: 960,
  APP_VER: '0.1.0-proto',
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
