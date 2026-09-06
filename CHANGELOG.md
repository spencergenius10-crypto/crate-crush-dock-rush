# Changelog — Crate Crush (Mode: Dock Rush) web prototype

## 0.2.0-proto — strategic depth sprint (rebrand + round events + behaviours)

### Rebrand: Crate Crush is the game, Dock Rush is a Mode
- `CC.BRAND` (`web/js/core/config.js`) is the single source for product copy: `game: Crate Crush`, `mode: Dock Rush`, `full: Crate Crush — Mode: Dock Rush`, `chip: MODE · DOCK RUSH`.
- New `CC.UI.brandLockup()` / `CC.UI.modeChip()` widgets. Boot splash shows the lockup; Hub, Dock Brief and Upgrade Bay carry the Mode chip in the header; Results card gets a `CRATE CRUSH · MODE · DOCK RUSH` tab; Settings shows the full name + version.
- `index.html`: `<title>`, `og:title/description`, `description`, `application-name`, `apple-mobile-web-app-title`, canvas `aria-label` → Crate Crush — Mode: Dock Rush.
- `manifest.webmanifest`: `name: Crate Crush — Mode: Dock Rush`, `short_name: Crate Crush`.
- Share: `navigator.share` title = full lockup; copy reads `Crate Crush (Dock Rush mode) — …`; PNG score card uses the lockup; file name `crate-crush-dockrush-Dnn-score.png`.
- Telemetry: every event now carries `mode: "dock_rush"` (additive; must-ship 11 + required props unchanged). Dev panel header reads `CRATE CRUSH DEV · mode Dock Rush`.
- `package.json` description + version `0.2.0-proto`; audio README titles. Repo URL, `CC_DockRush_*` asset IDs, `cc_dockrush_*` storage keys and `D01–D50` level IDs are unchanged (Mode-scoped identifiers). README has a **Naming** section.

### Round events (Sort phase) — `web/js/screens/round_events.js`, `CONFIG.EVENTS`
- **Rush Hour** (D07+): second conveyor belt for 8 s — two pieces wait at once, cadence ×0.55, roll-off wait ×0.85, outward shove on arrival, fever gain ×1.25. Belt plates run amber chevrons.
- **Inspection Shift** (D10+): lanes rotate one slot (timed 0.45 s ease-out; 2 lanes = swap) and all cargo/lane colours mute for 8 s — sort by shape. Lane identity / telemetry bins unchanged. `INSPECT` stamp on plaques.
- **Rare Jackpot Crate** (D08+, per-dock roll 16–30 %, max one, never on steel): gold crate, 4 hp, all cargo golden + 2 extra pieces, +40 score × fever, +0.35 fever, `JACKPOT +N` beat. Rolled in Smash so Smash→Sort→Truck stays locked.
- Scheduler: first event ≥ 5.5 s into Sort, 9–14 s between events, random first pick then alternate, none with < 5 pieces left, active event ends early when the dock finishes. 1.4 s mute-readable warning pill + two-tick audio before each event. `?noevents=1` disables.
- Telemetry (additive): `round_event { level_id, event_id, action: start|end, duration_s, pieces_left }`; `dock_clear`/`dock_fail` gain `round_events`, `jackpots`.
- Dev panel: live event/belt/inspection line + **Force Rush Hour / Force Inspection Shift / End event**.

### Behaviours — `lv.hazards.{magnetPct, fragilePct, steelPct}`, `CONFIG.{STEEL, MAGNET, GLASS}`
- **Weighted steel** crate (D11+): explicit taps fill a lift meter (0.22 × smash dmg per tap), 0.25 s grace then 1.2/s drain; hold never lifts. Full meter → `HEAVED!` and the crate opens. Lifts off its shadow with a meter bar; `•••` glyph. Distinct feel from Frozen's double-tap. New asset `CC_DockRush_Crate_Steel_Weighted_v1`.
- **Magnet** crate (D08+): magnet plate on wood/metal crates (`CC_DockRush_Crate_Magnet_Plate_v1`); its cargo is magnetised — in free flight below y 470 it locks onto the lane mouth nearest its predicted landing point (≤ 78 px) and snaps in. Assist when aimed right, trap when not (spill in that bin). Snaps count as assisted (no PERFECT / near-miss). Dashed field line, `SNAP`.
- **Fragile glass** cargo (D09+, never on unstable pieces): shatters = spill (`sort_miss.hazard = "shatter"`) on a free flick > 1150 px/s, wall hit > 520 px/s or landing > 1250 px/s. Tap-a-lane / drop are safe. Comes back bubble-wrapped. Glass sheen + `!` tag; ice-white shards; first-time cause hint.
- Results: **SHIFT REPORT** row (`events · jackpot · steel · snap · shattered`). `dock_clear`/`dock_fail` gain `steel_heaved`, `magnet_snaps`, `glass_shattered`. Dock Brief lists a dock's possible tags.
- `cargoTotal` is now derived from the crates actually built (jackpot extras).

### Sort refactor (needed for multi-belt)
- `PhaseSort.active` → `pieces[]` + `grab`; `active` kept as a compat getter. Pointer-down grabs the nearest waiting piece (one belt = anywhere, as before). `fling / dropAt / flingToLane` accept an optional piece; `belts` derives from `sort.rush`. Bot updated (multi-piece sort, commits to a steel crate with 50 ms taps).

### Audio (Kade) — `web/js/core/audio.js`, slots in `web/audio/sfx/README.md`
- New hooks with procedural fallbacks, all call sites marked `// Kade audio`: `fracture(material, big)` (wood/metal/steel/glass/ice — every crate hit/break routes here), `pneumatic(snap|hiss|release)`, `streakPitch(streak)`, `grooveIntensity(0..1)` (~4 Hz from DockRun: fever + Rush Hour), `roundEvent(id, warn|start|end)`, `heave(k)`.
- Sample slots: `fracture_metal/steel/glass.wav`, `pneumatic_snap.wav`, `steel_heave.wav`, `event_rush_hour/inspection/jackpot.wav`; `grooveIntensity` scales the loop bed gain when `groove_loop.ogg` is present.

### Kept / constraints
- v2: Fever meter, splinters/shake/haptics, Share Run / Challenge a Friend, Frozen / Golden / Timed hazards.
- Smash→Sort→Truck order locked; Kade must-ship 11 unchanged (`verify-telemetry` GREEN); economy tables untouched (`check-economy` GREEN) — all new rewards are score/fever, never coins; no paywall, $0 ads; bundle 35.6 KB br, frame cost p95 ≈ 2.2 ms incl. Rush Hour (headless desktop).
