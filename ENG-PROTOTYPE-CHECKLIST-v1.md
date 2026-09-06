# Crate Crush: Dock Rush — Eng Prototype Checklist v1
**Owner:** Remy (acceptance) · **Aligns to:** Systems v1.4 + Vale UI + Kade telemetry + Ari/Brooks hooks  
**Date:** 2026-09-06 · **Engine:** Unity / Godot / WebGL modular  
**Done when:** One play session clears DockRun loop and emits Kade must-ship events.

---

## A. Playable DockRun loop (must ship)

### Scene / phase IDs (Vale — canonical)
- [ ] `SCR_Boot` → `SCR_Hub` → `SCR_DockBrief` → DockRun
- [ ] DockRun single stage root with:
  - [ ] `Phase_Smash` (`SCR_Smash`)
  - [ ] `Phase_Sort` (`SCR_Sort`)
  - [ ] `Phase_Truck` (`SCR_Truck`)
  - [ ] `Overlay_Revive` (`SCR_Revive`)
  - [ ] `Overlay_Results` (`SCR_Results`)
- [ ] `SCR_Upgrade` → return `SCR_Hub` (never hard-block Hub)
- [ ] Smash→Sort = **phase swap same camera** (no hard load mid-dock)

### Core loop acceptance (≈30s)
- [ ] **Clear:** smash crates on dock (tap/hold)
- [ ] **Collect:** sort cargo into typed lanes (swipe/drag + bounce)
- [ ] **Truck:** cargo sucks into bay → clear sting
- [ ] **Upgrade:** spend coins on smash / lanes / sort (stub UI OK)
- [ ] **Next:** Hub dock card → next `level_id`
- [ ] Soft fail on spill → Revive accept continues Sort; decline → Results

### Micro-loop (≤3s)
- [ ] Every smash/sort input has tactile FX (burst / trail / haptic-ready hook)
- [ ] Order locked: **smash before sort** (never sort-before-smash in FTUE)

### FTUE (first dock)
- [ ] `tutorial_step` covers first-dock only (smash → sort → truck)
- [ ] Filter Glove unlock free after D03 clear (systems)

---

## B. Kade must-ship telemetry (emit before polish)

Common fields on every event: `event_name`, `event_ts`, `schema_ver=1.0`, `app_ver`, `platform`, `user_id`, `session_id`, `install_ts`, `days_since_install`, `cohort_day`

| # | Event | Required props | ☐ |
|---|---|---|---|
| 1 | `install` | once per install | ☐ |
| 2 | `session_start` | `cold_start`, optional network/ATT | ☐ |
| 3 | `session_end` | `session_duration_s`, levels attempted/cleared, revives, rv_watched | ☐ |
| 4 | `dock_clear` | `level_id`, `attempt_n`, `duration_s`, `crates_smashed`, `sort_misses`, `is_first_clear` | ☐ |
| 5 | `dock_fail` | `level_id`, `attempt_n`, `fail_reason` (`timer`\|`lives`\|`quit`\|`other`), `progress_pct` | ☐ |
| 6 | `smash` | `level_id`, `crate_type`, `combo` (sample 1/N OK) | ☐ |
| 7 | `sort_miss` | `level_id`, `expected_bin`, `chosen_bin`, `streak_broken` | ☐ |
| 8 | `revive` | `level_id`, `source` (`rv`\|`iap`\|`currency`\|`free_daily`), `attempt_n` | ☐ |
| 9 | `rv_watch` | `placement` (`revive`\|`double_reward`\|`skip_wait`\|`other`), `completed` | ☐ |
| 10 | `iap` stub | `sku`, `price_usd`, `validated=false` in editor OK | ☐ |
| 11 | `tutorial_step` | `step_id`, `completed` (first-dock FTUE) | ☐ |

**Acceptance:** one play session → JSONL/SDK debug log contains **≥1 of each** must-ship event with required fields.  
Schema: `/workspace/ratio-studios/crate-crush-dock-rush/telemetry-retention-v1.md`

---

## C. Vale mute / asset acceptance (prototype bar)

- [ ] Asset IDs follow `CC_DockRush_*` / `CC_Crate_*` / `CC_Cargo_*` / `CC_Lane_*` / `CC_FX_*` naming
- [ ] Cargo: shape **and** color coded (≤5–6 types early)
- [ ] HUD: timer ring + icon (not color-only); no junk popups mid Smash/Sort
- [ ] Critical action inside center ~70% vertical (TikTok safe)
- [ ] Default capture preset: audio off OK; FX reads mute
- [ ] No Harrington / Grandison marks in-game

Direction: `/workspace/ratio-studios/crate-crush/UI-UX-ASSET-DIRECTION-v1.md`

---

## D. Ari / Brooks hook beats (acceptance criteria)

### Ari UA 5s (must be filmable from prototype)
- [ ] **0–0.8s** Extreme close-up **TAP-SMASH** (finger/crate readable)
- [ ] **0.8–2.2s** One **near-miss swipe-sort** (wrong-color panic → save)
- [ ] **2.2–3.5s** Truck fill **FULL** (fill-bar slam)
- [ ] **3.5–5.0s** Cliffhanger → caption **“ONE MORE DOCK?”**
- [ ] Kill-list absent: chaotic wide opener, uncaused explosion, sort-before-smash, early UI chrome, text-only CTA

### Brooks organic T1–T5 (prototype must support capture)
- [ ] **T1** Smash ASMR — CU rhythmic smashes, cut on last thud
- [ ] **T2** Near-miss catch — mid-air almost-drop → last-frame save
- [ ] **T3** Streak bait — streak number on-screen + near-break
- [ ] **T4** Fail→retry — hard fail then same-angle clean clear
- [ ] **T5** Beat my X — score/metric readable on end card
- [ ] No Ratio posting until Spencer assigns account

Templates: `/workspace/ratio-studios/CRATE-CRUSH-DOCK-RUSH-TIKTOK-TEMPLATES.md`

---

## E. Explicit non-goals (prototype)

- [ ] ~~Full BI warehouse / A/B framework / attribution~~
- [ ] ~~Live-ops calendar / full BP implementation~~
- [ ] ~~All cosmetic skins~~
- [ ] ~~Balance polish pass~~ (instrument first — Kade rule)
- [ ] ~~Fan-out / social posting~~

---

## F. Sign-off

| Role | Checks | ☐ |
|---|---|---|
| Eng | A + B green on device/editor | ☐ |
| Remy | Loop order + economy stubs match spreadsheet | ☐ |
| Vale | C mute/silhouette | ☐ |
| Kade | B log acceptance | ☐ |
| Ari/Brooks | D filmable beats | ☐ |
| Chief | Prototype gate | ☐ |

