# Crate Crush: Dock Rush

Ratio Studios — hybrid-casual prototype (browser / WebGL-canvas). **Status (v2 arcade feel): playable DockRun loop + Kade telemetry green + hazard crates + Flow/Fever + juice + Share Run / Challenge a Friend + mobile-web bundle (≈30 KB br).**

```
SCR_Boot → SCR_Hub → SCR_DockBrief → DockRun[ Phase_Smash → Phase_Sort → Phase_Truck | Overlay_Revive | Overlay_Results ] → SCR_Upgrade → SCR_Hub
```

## Run / play (exact path)

Source is plain HTML5 canvas + vanilla JS in `web/` — **no build step to develop**. The only dependency (`esbuild`) is an optional dev tool for the production bundle.

**Option A — open the file**

```
open web/index.html          # macOS
xdg-open web/index.html      # Linux
start web\index.html         # Windows
```

**Option B — dev server (source files, LAN testing)**

```
npm run dev                  # = node tools/serve.mjs web 8080 (zero deps; prints the phone URL)
# or: cd web && python3 -m http.server 8080
```

**Option C — production bundle (what ships to mobile web)**

```
npm install                  # once — pulls esbuild for minification
npm run build                # → dist/  (index.html + app.<hash>.js + dev.<hash>.js, each with .gz/.br siblings)
npm run serve                # serves dist/ with brotli/gzip negotiation + immutable caching, prints the phone URL
```

Deploy `dist/` to any static host. If the host can serve precompressed files (`gzip_static` / `brotli_static`, or a CDN that does it for you) the `.br`/`.gz` siblings are used as-is; otherwise ignore them and let the edge compress. `index.html` must be served `no-cache`; the hashed bundles are safe to cache forever.

The canvas is a 540×960 portrait (9:16) stage and letterboxes to any window. Works with mouse or touch.

**Controls**

| Phase | Input |
|---|---|
| Smash | **Tap** a crate (2 taps breaks a wood crate at Smash Lv1). **Hold** to auto-smash whatever is under your finger. **Frozen crate** (ice shell, `••` glyph): **double-tap** — two taps within 0.45 s shatter the ice, only then does damage land; holding never thaws. |
| Sort | **Drag** the waiting cargo and release toward a lane (flick = physics toss), **drop** it onto a lane mouth, or **tap a lane** to send it there. Cargo left on the conveyor too long rolls off (spill). **Golden** cargo (gold halo) scores ×3. **Unstable** cargo (hazard band, blinking fuse) has a **2.5 s fuse** from the moment it lands — it keeps burning in your hand — and detonates into a spill. Dead-center landing = **PERFECT** (+5, haptic). |
| Truck | Auto: lanes stream into the truck; tap to skip the FULL beat early. |
| Revive | Watch ad (stub) / coins / free daily / decline. |
| Results | **SHARE RUN** / **CHALLENGE A FRIEND** (see below) · CONTINUE → Upgrade Bay (or 2× HAUL ad stub). Failed: RETRY same dock. |

## v2 arcade feel — hazards, juice, Flow/Fever

**Hazards** (`web/js/data/levels.js` → `lv.hazards`; none on FTUE docks D01–D03, each ramps slowly):

| Hazard | From | Rule | Read |
|---|---|---|---|
| Frozen / Armor crate | D04 (15 % → 40 % of crates) | Ice shell absorbs hits. Two explicit taps inside `FROZEN_DOUBLE_TAP_S` = 0.45 s shatter it and the second tap lands as a real hit. Hold auto-repeat clinks but never thaws. | pale-blue shell + `••` glyph; cracks after tap 1; `THAWED` + ice shards; one-time `DOUBLE-TAP TO THAW` hint |
| Golden / Priority cargo | D04 (12 % of pieces) | Seated in the right lane → `GOLDEN_SCORE_MULT` = ×3 score and a big fever push. Spilling it is a normal spill. | gold halo + glint, gold accept burst, `GOLDEN +N` |
| Timed / Unstable cargo | D06 (12 % → 35 % of pieces) | `TIMED_FUSE_S` = 2.5 s from landing on the conveyor, keeps burning while grabbed, paused only in flight. Detonation = spill on the spot (`sort_miss.hazard = "unstable"`), streak breaks, fever halves; the piece returns to the pile stable. | hazard band + blinking fuse dot, countdown arc + seconds, red pulse in the last 40 % |
| Conveyor ramp / erratic feed | streak 3 → 15 (`CONFIG.RAMP`) | Spawn cadence → 55 %, roll-off wait → 70 %, landing spot jitter ±30 → ±110 px, and above ~35 % ramp pieces arrive with a sideways shove that slides along the conveyor until friction stops it. A spill resets the streak, so the ramp resets with it. | pieces land off-center / sliding; `STREAK N` badge |

**Juice** (`web/js/core/fx.js`): `splinters()` — long pointed shards that spin out, bounce once on the dock-floor line, skid and rest before fading (wood / metal / ice palettes); chips fill the middle. Micro-shake on heavy lane drops (scaled by impact speed), combo ≥ 3 breaks, fever tier-ups; the big beats (spill, truck FULL) keep their existing shake. Haptics via `navigator.vibrate` with one vocabulary: `hapticPerfect` `[12,20,24]`, `hapticStreak(step)` (tick `8`, step `[18,30,18,30,36]`), `hapticNearMiss` `[30,40,30]` on a rim-save, `hapticFever(tier)`. Settings → HAPTICS off disables all of it.

**Flow / Fever** (`DockRun.fever`, 0..1, `CONFIG.FEVER`):
- Builds: smash hit +0.03, break +0.05, correct sort +0.12, perfect +0.05, golden +0.20.
- Decays only while on the clock (Smash/Sort): `0.05 + 0.08·fever` per second, ×1.4 with the finger off the glass. A miss/detonation multiplies it by 0.45.
- Tiers at 0.3 / 0.6 / 0.9 → score multiplier **×2 / ×3 / ×5**. Entering a tier: `FEVER ×N` beat, lane flash, shake + flash scaled by tier, haptic pattern, `audio.fever(tier)`.
- Visuals by tier: lane glow (layered translucent strokes — no `shadowBlur`, it is too expensive on mobile GPUs) with a pulse that speeds up per tier; lane floors tint at ×3; cargo trails go fever-colored at ×3; **ember trail** follows the piece at ×5. HUD: fever arc wraps the timer ring (tick marks at the thresholds), live `×N FEVER` chip, live `SCORE`.
- Score: smash hit +2, break +5×min(combo,4), sort +10 (+5 perfect) (×3 golden) — all × the fever multiplier at that moment. **Haul score** on Results = coins + best streak×10 + crates×2 + time left + run score, so Fever/hazard play is what the Share/Challenge loop competes on. Coins are untouched (band table only).

**Telemetry (additive)**: `dock_clear` / `dock_fail` carry `run_score`, `fever_peak_tier`, `golden_sorted`, `unstable_detonated`; `sort_miss` carries `hazard` when a fuse ran out. Must-ship events and required props are unchanged.

## Sonic — procedural SFX + dynamic groove (`web/js/core/audio.js`, slots in `web/audio/`)

Zero binary assets ship; everything is synthesized in WebAudio at call time, so the sonic pack costs ~3 KB brotli and no requests. Real recordings drop in by **name** later without touching gameplay — see [`web/audio/README.md`](web/audio/README.md) for the slot list, formats and stem rules.

**Master chain**: SFX bus + music bus → limiter-style compressor → 70 Hz high-pass → out. Thumps, kick and bass go through a per-voice `tanh` soft clip so they keep harmonics a phone speaker can reproduce; nothing lives only in the sub band. The music bus is low-passed at 5.2 kHz (lo-fi tilt) so SFX sit in front.

**SFX hooks** (one call per beat; every method tries `CC.CONFIG.AUDIO_SAMPLES[name]` first, then synthesizes):

| Hook | Sound | Fired from |
|---|---|---|
| `smash(kind, big)` | **wood-crunch**: low thump + a cluster of short bandpassed bursts (7 on a break, 3 on a hit) + lowpassed tail · **metal**: thump + two inharmonic partials · **ice**: glassy noise + descending chirps, ×5 on shatter | `phase_smash.js` hit / break / thaw |
| `snap(perfect)` | **bin clack**: tight 1.9 kHz knock + click + body; perfect adds a 1760 Hz ting + octave | `phase_sort.js` seat |
| `whoosh()` | bandpass noise sweep 380 → 2600 Hz | fling / tap-a-lane, Smash→Sort swap, truck FULL |
| `chime(tier)` | **escalating combo chimes**: pentatonic run, 2 + tier notes, base note rises with tier; `chime(0)` = soft 2-note for the Share/Challenge buttons | streak steps, Results buttons |
| `error(kind)` | **crisp error thud**: fast sine drop through the clipper + dry lowpassed knock; `unstable` adds a saw buzz + noise burst; `ice` is a quiet clink (hit absorbed) | spill / wrong lane / fuse detonation / frozen shell |
| `fever(tier)` | noise riser + stacked chord that widens with the tier; `fever(0)` = soft fall when it drops out | `dockrun.js` tier change |
| `thud` `crack` `pop` `splat` `sting` `coin` `fail` | legacy names mapped onto the pack (truck load, UI tap, FULL fanfare, coins, dock fail) | truck / UI / results |

**Groove**: 92 BPM, 16-step lookahead scheduler (80 ms tick, 220 ms lookahead), swung 16ths. Kick 0/8, snare 4/12, closed hats on 8ths, E-minor-pentatonic bass riff over a two-bar phrase (saw + octave partial → resonant lowpass → clip), an industrial clank every other bar, a lo-fi Em stab every two bars. `Game.musicIntensity()` feeds `audio.setIntensity(0..1)` every frame — Hub 0.12, DockRun `0.2 + 0.55·fever + streak bonus`, Truck 0.6, clear Results 0.45 — and the scheduler turns that into: hats gain 0.35 → 1.0 and 16ths above 0.3, open hat on step 14 above 0.6, bass cutoff 380 → 1680 Hz and drive, kick ghost on 10 above 0.35 / double on 6 above 0.75, snare ghosts on 7/15 above 0.5. Recorded stems (`music_base` / `music_hats` / `music_bass`) replace the scheduler in sync when present.

**Lifecycle / mute rules**: the `AudioContext` is created and resumed only inside the first `pointerdown` (autoplay policy) and never blocks input; the page hiding suspends it, returning resumes it. Audio defaults **on** for new installs; the **capture preset mutes**; Hub has a one-tap `♪ ON/OFF` chip and Settings the full toggle. The game reads fully with sound off (Vale mute rule). `CC.audio` is the same instance as `CC.game.audio`.

Useful URL flags: `?dev=1` (open dev panel), `?bot=1` (autoplay acceptance session), `?bot=1&autodownload=1` (also downloads the JSONL when done), `?sheet=1` (asset sheet), `?reset=1` (wipe profile + telemetry = fresh install), `?nodesync=1` (disable the low-latency `desynchronized` canvas hint if a device misbehaves). `#challenge=D03-412-7-31-c` in the hash is an inbound Challenge link (below).

## Share Run / Challenge a Friend (organic loop — $0 ads, no paywall, no monetization)

Both buttons sit on **Overlay_Results** (clear *and* fail) and go through `web/js/core/share.js`:

| Button | What is shared | Delivery |
|---|---|---|
| **SHARE RUN** | Brag copy (`… 412 haul on Dock 03, streak 7, 31s. Beat it?`) + a **PNG score card** (1080×1920 story-size, pre-rendered off-screen once the hero number finishes counting) + the Challenge link | Web Share API with `files` when `navigator.canShare({files})` → Web Share text/url → clipboard → `prompt()` |
| **CHALLENGE A FRIEND** | Challenge copy (`I challenge you: beat my 412 haul on Dock 03 …`) + the Challenge link | Web Share text/url → clipboard → `prompt()` |

The share call runs synchronously inside the tap's `pointerup` handler (input is not queued to the next frame), so the browser's transient user activation is still valid — that is why the PNG is prepared ahead of time rather than awaited at tap time. A toast in the bottom-safe caption slot confirms `SHARED` / `LINK COPIED`; cancelling the share sheet is silent.

**Link payload** (URL hash, so it never reaches server logs and never collides with `?flags`):

```
https://<host>/#challenge=D03-412-7-31-c
                           │   │   │ │  └ c = cleared · f = failed (friend spilled out)
                           │   │   │ └── time (s)
                           │   │   └──── best streak
                           │   └──────── haul score to beat
                           └──────────── dock
```

**Receiving a link** (`main.js` → `CC.Share.parseInbound()` before telemetry starts):
1. The hash is consumed (`history.replaceState`) and pinned to the profile as `p.challenge` so it survives Boot → Hub and a reload.
2. **Hub**: header shows `CHALLENGE · beat 412 on DOCK 03`, the dock card gets a green `CHALLENGE` badge, and **PLAY** routes to that dock (playable even if it is past the player's ladder). `✕ CHALLENGE` top-left dismisses it. **DockBrief** repeats the target.
3. **Results** on that dock adds a verdict line: `CHALLENGE BEATEN · friend 412` (haul strictly greater → the challenge is retired) or `CHALLENGE · friend 412 · not yet` (stays active for RETRY). Then the player can fire back with the same two buttons.

**Economy / progression guard**: a Challenge run is a real run — same crates, lanes, timer, spills, coins from the same band table — but `nextLevel` only ever advances sequentially (`lv.n === nextLevel`), so a D30 link never unlocks D04–D30 for a fresh player. Coins/upgrades/talents/SKUs are untouched.

**Telemetry added for the loop** (additive; the Kade must-ship 11 are unchanged and `tools/verify-telemetry.mjs` ignores the new names):
- `install.attribution = "challenge_link"` when the first open came through a link (schema says attribution optional; still `null` otherwise).
- `challenge_open { level_id, target_score, fresh_install }` on every inbound link.
- `share { kind: score|challenge, method: web_share|clipboard|prompt|cancelled|failed, level_id, result, haul_score, with_image }`.
- `dock_clear` / `dock_fail` gain `challenge_target` when a friend's challenge was active on that dock.

Dev panel → **Open test challenge link (D03 · 250)** reloads with a sample link. Not done (by choice): a video clip of the last clear. A rolling `MediaRecorder` on `canvas.captureStream()` costs an encoder on the main thread for the whole run; the cheap version would be to record only the ~3 s truck phase (non-interactive) and attach it like the PNG — left as a follow-up once a real device budget is measured.

## Mobile web performance notes

Audit of `main` and what changed. Measured in the same headless Chrome before/after (relative numbers; a phone is 3–5× slower):

| Area | Before | After |
|---|---|---|
| Critical path | 24 blocking `<script>` + CSS + HTML = **144 KB over 26 requests**, dev tooling always loaded | `defer` scripts in dev; `npm run build` → **29.5 KB brotli / 34.3 KB gzip over 2 requests** incl. all v2 systems (`index.html` with inlined CSS + `app.<hash>.js`); dev tooling (`js/dev/*`, 3 KB br) is a separate chunk fetched only for `?dev` / `?bot` / `?sheet`, the DEV button or `` ` `` |
| Telemetry persist | `localStorage.setItem` of the whole ~1 MB JSONL ring buffer **synchronously on every event** — **7.8 ms per `smash` tap** with a full buffer (desktop), inside the pointer handler | Debounced to `requestIdleCallback` (400 ms `setTimeout` fallback), flushed on `session_end` / `pagehide` / download. **0.007 ms per emit.** Buffer semantics and JSONL output unchanged |
| Pointer → logical coords | `getBoundingClientRect()` on every pointer event (forces style/layout) | Rect cached; invalidated on resize / scroll / orientation / `Game.resize()` |
| Drag sampling | `pointermove` (coalesced to the frame on Chrome/Android) | `pointerrawupdate` when supported → the frame simulates from the freshest finger position; falls back to `pointermove` |
| Canvas presentation | default `2d` context | `{ alpha: false, desynchronized: true }` — opaque backing store, and Chrome/Android can present outside the compositor queue (lower touch→pixel latency). `?nodesync=1` disables |
| Static backdrop | ~25 fills + 2 cones every frame | painted once to an offscreen canvas, one `drawImage`/frame |
| Per-frame string work | `shade()/desat()` hex parse per button/lane per frame; `laneExpected()` rescans crates per lane per frame | both memoized (bounded cache / per run). DockRun idle frame 0.31 → 0.29 ms (marginal — draw was never the bottleneck) |
| CSS | 60 px blurred `box-shadow` under a canvas that fills the phone viewport | removed at ≤640 px |

**Touch latency (<16 ms target).** Input was already handled synchronously in the pointer event (no rAF queue) and stays so; the only work between `pointerup` and a state change is the handler itself. The dev panel now shows a live probe: `event→handler` age (browser dispatch delay), and `handler` cost with worst cases. In the headless runs above the handler cost is 0.0–0.4 ms steady state (4.1 ms worst on the very first, cold tap). The remaining latency is the browser's own event dispatch plus one display frame for the pixels — that is what `desynchronized` and `pointerrawupdate` shave on Android Chrome. Verify on device: open `?dev=1`, tap around, read the `latency:` line.

Not changed: game logic, phase order, economy tables, telemetry schema for the must-ship events.

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
  index.html            canvas + DOM dev panel; <script defer> order = load order (build bundles this list)
  js/core/              config (hazard/ramp/fever tunables), util, input (tap/hold/drag/swipe + latency probe),
                        fx (bursts, splinters, haptic vocabulary), audio (procedural SFX pack + dynamic groove),
                        telemetry (debounced persist), save, share (Share Run / Challenge link + PNG card)
  js/data/              economy (CSV mirror), cargo types (+golden/timed draw), levels D01–D50 (+hazards), CC_DockRush_* assets
  js/ui/widgets.js      buttons / panels / HUD chips / stage backdrop (offscreen-cached)
  js/screens/           boot, hub, dockbrief, dockrun (+ phase_smash/sort/truck, overlay_revive/results), upgrade
  js/dev/               dev panel, autoplay bot, asset sheet — lazy chunk, not on the player's critical path
tools/build.mjs              → dist/ (bundle, minify, inline CSS, .gz/.br)   npm run build
tools/serve.mjs              zero-dep static server w/ brotli/gzip negotiation  npm run dev | npm run serve
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
- Mobile-web pass (headless Chrome via CDP, both `web/` source and the minified `dist/`): `?bot=1` still GREEN with 0 page errors; inbound `#challenge` link → `install.attribution`, `challenge_open`, Hub routing, D03 playable from a fresh install with `nextLevel` staying 1; real dispatched touch taps through smash; Results SHARE RUN via stubbed Web Share carries the PNG + deep link, CHALLENGE A FRIEND falls back to clipboard; link round-trips through `CC.Share.decode`; DEV button lazy-loads the dev chunk. `check-economy` GREEN.
- v2 feel pass (headless, real touch taps, D08 with hazards forced on): single tap on a frozen crate cracks without damage, second tap ≤0.45 s shatters + hits, a 0.7 s second tap does not; an unstable piece left alone detonates at fuse ≈2.5 s exactly once and comes back stable; golden pieces seat ×3; fever reaches ×3 on a clean streak; conveyor cadence measured ramping 0.32 → 0.21 s; `dock_clear` carries the feel props; 0 page errors. Bot (D01/D02, no hazards) unchanged and GREEN.
- Real mouse/X11 input: tap + hold smash, drag, flick, drop-on-lane and tap-a-lane all land; input recovers from a lost `pointerup`.
- GUI playthrough (recorded): D01 smash → sort (12/12, 0 misses) → truck FULL → results → Upgrade Bay → Hub shows D01 cleared.
- Later docks verified clearable at base stats: D13/2 lanes, D21/3 lanes, D36/4 lanes, D45/4 lanes, D50/5 lanes (~34–44 s).

## Known gaps / notes
- Rewarded video and IAP are stubs (2.5 s fake ad with skip; `iap.validated=false`). No live ads SDK, no store.
- `platform` is reported as `editor` (schema enum has no `web`); `platform_detail: "web"` is added.
- Idle income / Warehouse tiers / Battle Pass / contracts are out of scope (badge + text stubs only).
- Lane slots < cargo types: the last lane becomes a **swap lane** cycling its accepted type every 2.6 s (visible `↻` arc). Buying lane slots removes the swap.
- Deuteranopia: BoltBox (amber) vs Pallet (lime) rely on glyph shape (hex vs flat slats); palette is direction, not final lock.
- Opening the OS share sheet can background the page on some devices, which (by existing design) emits `session_end(background)` and a new `session_start` on return — expect a session split around a share in the JSONL.
- Link previews: the challenge payload lives in the hash, so messengers only see the static `og:` title/description (no per-score preview image; that is what the shared PNG is for).
