# Crate Crush: Dock Rush

Ratio Studios — hybrid-casual prototype (browser / WebGL-canvas). **Status: playable DockRun loop + Kade telemetry green.**

```
SCR_Boot → SCR_Hub → SCR_DockBrief → DockRun[ Phase_Smash → Phase_Sort → Phase_Truck | Overlay_Revive | Overlay_Results ] → SCR_Upgrade → SCR_Hub
```

## Run / play (exact path)

Zero dependencies, no build step. Plain HTML5 canvas + vanilla JS (`web/`).

**Option A — open the file**

```
open web/index.html          # macOS
xdg-open web/index.html      # Linux
start web\index.html         # Windows
```

**Option B — static server (recommended for mobile / LAN testing)**

```
cd web && python3 -m http.server 8080
# then open http://localhost:8080  (phone on same Wi-Fi: http://<your-ip>:8080)
```

The canvas is a 540×960 portrait (9:16) stage and letterboxes to any window. Works with mouse or touch.

**Controls**

| Phase | Input |
|---|---|
| Smash | **Tap** a crate (2 taps breaks a wood crate at Smash Lv1). **Hold** to auto-smash whatever is under your finger. |
| Sort | **Drag** the waiting cargo and release toward a lane (flick = physics toss), **drop** it onto a lane mouth, or **tap a lane** to send it there. Cargo left on the conveyor too long rolls off (spill). |
| Truck | Auto: lanes stream into the truck; tap to skip the FULL beat early. |
| Revive | Watch ad (stub) / coins / free daily / decline. |
| Results | CONTINUE → Upgrade Bay (or 2× HAUL ad stub). Failed: RETRY same dock. |

Useful URL flags: `?dev=1` (open dev panel), `?bot=1` (autoplay acceptance session), `?bot=1&autodownload=1` (also downloads the JSONL when done), `?sheet=1` (asset sheet), `?reset=1` (wipe profile + telemetry = fresh install).

## Kade telemetry acceptance (one session → all 11 must-ship events)

Events: `install, session_start, session_end, dock_clear, dock_fail, smash, sort_miss, revive, rv_watch, iap, tutorial_step` — every event carries `event_name, event_ts, schema_ver=1.0, app_ver, platform(editor), user_id, session_id, install_ts, days_since_install, cohort_day` (+ `platform_detail: web`).

Where the log goes:
- **JSONL download** — dev panel (bottom-left `DEV` button or `` ` `` key) → *Download JSONL*; also Hub → Settings → *Download telemetry JSONL*.
- **Console** — every event is echoed as `[CC_TELEMETRY] {json}`.
- **Persistent** — a localStorage ring buffer (~6000 lines) so the download survives reloads.

**Fastest green (≈50 s, no hands):** open `web/index.html?bot=1&dev=1`. The bot plays D01 (3 deliberate spills → revive via ad stub → clean sort → truck FULL → 2× haul ad → buys Smash Lv2 → Starter Kit iap stub) and D02 (3 spills → decline revive → `dock_fail`) then emits `session_end`. The dev panel checklist turns **ALL GREEN**. Download the JSONL and verify:

```
node tools/verify-telemetry.mjs ~/Downloads/cc_dockrush_telemetry_*.jsonl
```

**Manual green (≈2 min):** fresh install (`?reset=1`) → Play D01 → smash → deliberately sort one piece wrong (`sort_miss`) → spill 3× → Revive with *Watch ad* (`rv_watch` + `revive`) → finish → Results *2× HAUL* → CONTINUE → Upgrade Bay → SHOP → tap any SKU (`iap` stub, `validated=false`) → Hub → Play D02 → quit via `✕ quit` top-left or decline a revive (`dock_fail`) → dev panel *Emit session_end* → *Download JSONL*.

A committed sample from a bot session: [`telemetry/sample-session.jsonl`](telemetry/sample-session.jsonl) (`node tools/verify-telemetry.mjs telemetry/sample-session.jsonl`).

## Economy

`web/js/data/economy.js` mirrors `ECONOMY-COINS-UPGRADES-v1.csv` (bands, base/expected coins, upg_smash/lanes/sort ladders, talents, coin-revive = 0.35× expected rounded to 10, streak +5%/step capped +25%). Guard:

```
node tools/check-economy.mjs
```

Power is coins-only. Gems/shards/SKUs grant cosmetics, consumables or soft currency only. Filter Glove is granted free on first clear of D03.

## Capture guide (Ari 5s / Brooks T1–T5)

Hub → Settings → **CAPTURE PRESET: ON** (audio off, HUD chrome minimal, FX ×1.35). For unhurried takes, open the dev panel (`DEV` button / `` ` `` key) → **Freeze timer (capture)** (also pauses the conveyor clock), then hide the panel. Critical action sits inside the center ~70% vertical; timer ring top-safe, CTA bottom-safe.

| Beat | How to get it in the prototype |
|---|---|
| Ari 0–0.8s tap-smash CU | Smash phase, frame a crate; tap → hit-stop flash + radial burst + chips. |
| Ari 0.8–2.2s near-miss swipe-sort | Flick cargo so it lands on the rim between lanes → squash + rim bounce + `CLOSE!` save; or land in the wrong-colored lane for the spill puddle. |
| Ari 2.2–3.5s truck FULL slam | Truck phase end: fill bar goes green, bay scale-punches, `FULL!` / `DOCK CLEAR` sting + confetti. |
| Ari 3.5–5.0s cliffhanger | Results card pulses **ONE MORE DOCK?** (≤6 words) 1 s after showing. |
| T1 Smash ASMR | Hold-smash a row of same-type wood crates; cut on the last thud. |
| T2 Near-miss catch | Same as the Ari near-miss; Spill Magnet talent widens the catch window. |
| T3 Streak bait | Streak badge appears from 2 and pulses every step; a wrong lane shows `STREAK BROKEN`. |
| T4 Fail → retry | Spill 3× → decline revive → `DOCK FAILED` → RETRY reloads the same dock, same camera. |
| T5 Beat my X | Results hero number = HAUL SCORE (`NEW BEST` badge); also best streak/crates/time rows. |

Kill-list respected: opener is a crate close-up (no wide chaos), no explosion without a tap, sort can never happen before smash, no UI chrome in the stage mid-phase, CTA is a button not text-only.

## Asset placeholders (Vale)

Everything is a procedural silhouette-first placeholder keyed by canonical ID in `web/js/data/assets.js` (`CC_DockRush_Crate_*`, `CC_DockRush_Cargo_*`, `CC_DockRush_Lane_*`, `CC_DockRush_Forklift_*`, `CC_DockRush_Truck_*`, `CC_DockRush_UI_*`; FX are `CC.FX` methods named after `CC_FX_*`). Swap a draw fn for a sprite later without touching call sites. 5 cargo types, each unique hue **and** glyph (hex / cylinder / flat / capsule / bag). Settings → **ASSET SHEET** → **1-BIT** runs the desaturate + threshold + 120px thumbnail test.

## Project layout

```
web/
  index.html            canvas + DOM dev panel; classic <script> order = load order
  js/core/              config, util, input (tap/hold/drag/swipe), fx, audio (synth, default off), telemetry, save
  js/data/              economy (CSV mirror), cargo types, levels D01–D50, CC_DockRush_* asset registry
  js/ui/widgets.js      buttons / panels / HUD chips / stage backdrop
  js/screens/           boot, hub, dockbrief, dockrun (+ phase_smash/sort/truck, overlay_revive/results), upgrade
  js/dev/               dev panel, autoplay bot, asset sheet
tools/verify-telemetry.mjs   JSONL → must-ship checklist (exit 0 = green)
tools/check-economy.mjs      economy.js ⇔ CSV guard
telemetry/sample-session.jsonl
```

## Spec pack (canonical)
- `ENG-PROTOTYPE-CHECKLIST-v1.md` — acceptance for first playable
- `ECONOMY-SPREADSHEET-v1.md` + `ECONOMY-COINS-UPGRADES-v1.csv`
- `UI-UX-ASSET-DIRECTION-v1.md`
- `CRATE-CRUSH-DOCK-RUSH-TIKTOK-TEMPLATES.md`
- `docs-telemetry/` — Kade telemetry / retention

## Verification done
- Headless Chrome (Playwright) `?bot=1` run: 0 page errors; all 11 must-ship events in one session (`tools/verify-telemetry.mjs` green).
- Real mouse/X11 input: tap + hold smash, drag, flick, drop-on-lane and tap-a-lane all land; input recovers from a lost `pointerup`.
- GUI playthrough (recorded): D01 smash → sort (12/12, 0 misses) → truck FULL → results → Upgrade Bay → Hub shows D01 cleared.
- Later docks verified clearable at base stats: D13/2 lanes, D21/3 lanes, D36/4 lanes, D45/4 lanes, D50/5 lanes (~34–44 s).

## Known gaps / notes
- Rewarded video and IAP are stubs (2.5 s fake ad with skip; `iap.validated=false`). No live ads SDK, no store.
- `platform` is reported as `editor` (schema enum has no `web`); `platform_detail: "web"` is added.
- Idle income / Warehouse tiers / Battle Pass / contracts are out of scope (badge + text stubs only).
- Lane slots < cargo types: the last lane becomes a **swap lane** cycling its accepted type every 2.6 s (visible `↻` arc). Buying lane slots removes the swap.
- Deuteranopia: BoltBox (amber) vs Pallet (lime) rely on glyph shape (hex vs flat slats); palette is direction, not final lock.
