# Crate Crush — Mode: Dock Rush

Ratio Studios — hybrid-casual prototype (browser / WebGL-canvas). **Status (v3 strategic depth): Crate Crush branding + round events (Rush Hour / Inspection Shift / Jackpot crates) + magnet / glass / weighted-steel behaviours on top of the v2 loop (hazards, Flow/Fever, juice, Share Run / Challenge a Friend, Kade telemetry green, mobile-web bundle ≈36 KB br).** Changelog: [`CHANGELOG.md`](CHANGELOG.md).

## Naming: Crate Crush is the game, Dock Rush is a Mode

- **Crate Crush** is the master game / brand. **Dock Rush** is one **Mode** of it (the smash → sort → truck dock loop in this repo). Never write "Crate Crush: Dock Rush" as a game title in product copy; the lockup is **"Crate Crush — Mode: Dock Rush"** (long form) or **"Crate Crush"** + a **`MODE · DOCK RUSH`** chip (short form).
- One source of truth: `CC.BRAND` in `web/js/core/config.js` (`game`, `mode`, `modeId`, `full`, `chip`, `studio`). `CC.UI.brandLockup()` / `CC.UI.modeChip()` in `widgets.js` draw it — Boot splash, Hub / Dock Brief / Upgrade Bay headers, the Results card, the shared PNG score card, share copy (`Crate Crush (Dock Rush mode) — …`), `<title>` / `og:` tags, the PWA manifest (`name: Crate Crush — Mode: Dock Rush`, `short_name: Crate Crush`), the dev panel.
- Telemetry carries `mode: "dock_rush"` on every event (additive) so a future second Mode can share the same pipeline.
- Internal IDs stay as they were: asset IDs `CC_DockRush_*`, localStorage keys `cc_dockrush_*`, screen IDs, level IDs `D01–D50`, and the repository URL. Those are Mode-scoped identifiers, not product copy.

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

**App icon / PWA**: `index.html` links favicon + `apple-touch-icon` and `manifest.webmanifest` (standalone portrait, `#12151b` splash) to `web/icons/app-icon-1024.png`. That PNG is the Chief-locked `LOCKED-dock-rush-app-icon-1024.png` and is **not in the repo yet** — drop it at that path (see `web/icons/README.md`); the build warns while it is missing.

Deploy `dist/` to any static host. If the host can serve precompressed files (`gzip_static` / `brotli_static`, or a CDN that does it for you) the `.br`/`.gz` siblings are used as-is; otherwise ignore them and let the edge compress. `index.html` must be served `no-cache`; the hashed bundles are safe to cache forever.

The canvas is a 540×960 portrait (9:16) stage and letterboxes to any window. Works with mouse or touch.

**Controls**

| Phase | Input |
|---|---|
| Smash | **Tap** a crate (2 taps breaks a wood crate at Smash Lv1). **Hold** to auto-smash whatever is under your finger. **Frozen crate** (ice shell, `••` glyph): **double-tap** — two taps within 0.45 s shatter the ice, only then does damage land; holding never thaws. **Weighted steel** (dark slab, weight plates, `•••` glyph): **rapid multi-tap** — every explicit tap lifts it, the lift meter holds 0.25 s then drains fast; slow taps and holding let it settle. **Magnet crate** (horseshoe plate): normal crate, but its cargo comes out magnetised. **Jackpot crate** (gold, star): 4 hits, all its cargo golden + 2 extra pieces, big score/fever beat. |
| Sort | **Drag** the waiting cargo and release toward a lane (flick = physics toss), **drop** it onto a lane mouth, or **tap a lane** to send it there. Cargo left on the conveyor too long rolls off (spill). **Golden** cargo (gold halo) scores ×3. **Unstable** cargo (hazard band, blinking fuse) has a **2.5 s fuse** from the moment it lands — it keeps burning in your hand — and detonates into a spill. **Magnet** cargo (field ticks, horseshoe tag) in a free flick snaps to the lane mouth nearest to where it would land. **Glass** cargo (sheen, `!` tag) shatters on a hard free flick / wall hit / hard landing — tap-a-lane and drop are safe. Dead-center landing = **PERFECT** (+5, haptic). During **Rush Hour** two pieces wait on two belts — pointer-down grabs the nearest one. |
| Truck | Auto: lanes stream into the truck; tap to skip the FULL beat early. |
| Revive | Watch ad (stub) / coins / free daily / decline. |
| Results | **SHARE RUN** / **CHALLENGE A FRIEND** (see below) · CONTINUE → Upgrade Bay (or 2× HAUL ad stub). Failed: RETRY same dock. |

## v3 strategic depth — round events + behaviours

Everything below sits on top of the v2 hazards (Timed / Golden / Frozen), keeps the Smash→Sort→Truck order locked and leaves coins untouched: every new reward is run **score** / **fever** (so it lands in the haul score the Share/Challenge loop competes on), never coins.

**Round events** (`web/js/screens/round_events.js`, tunables `CONFIG.EVENTS`; Sort phase only, none before D07; `?noevents=1` disables):

| Event | From | Rule | Read (mute) |
|---|---|---|---|
| **Rush Hour** | D07 | A second conveyor belt opens (`belts: 2`) for 8 s: two pieces wait at once, spawn cadence ×0.55, roll-off wait ×0.85, every piece arrives with an outward shove. Fever gain ×1.25 while it runs. Pointer-down grabs the nearest waiting piece; tap-a-lane / drop / flick work per piece. | 1.4 s blinking `⇶ RUSH HOUR IN n` pill + two-tick warn; amber chevrons run along both belt plates; `⇶ RUSH HOUR · 2 BELTS` pill with a draining time bar |
| **Inspection Shift** | D10 | Lanes rotate one slot (2 lanes = swap) with a 0.45 s ease-out slide, and every cargo/lane colour mutes to grey for 8 s — sort by **shape** only. Lane identity (`idx`, `id`, types, seated cargo, telemetry bins) never changes; only the position does. Lanes slide home when it ends. | `⇄ INSPECTION SHIFT · SHAPES ONLY` pill, `INSPECT` stamp on every lane plaque, desaturated cargo (glyphs are the v1 shape code, so this is the readable-mute test in play) |
| **Jackpot crate** (rare) | D08 | Per-dock roll (16 % → 30 %), at most one, never on steel: gold crate with 4 hp; its cargo is all golden **and** it carries +2 extra pieces; cracking it pays +40 score (× fever) and +0.35 fever. Rolled in Smash so the phase order stays locked. | gold body + star badge + glint sweep; `JACKPOT +N`, flash, shake, fever haptic |

Scheduler: first event no earlier than 5.5 s into Sort, then a random 9–14 s gap between events; the pool alternates (random first pick); no event starts with fewer than 5 pieces left, and an active event ends early when the dock is done. Telemetry (additive): `round_event { level_id, event_id: rush_hour | inspection_shift, action: start | end, duration_s, pieces_left }`; `dock_clear` / `dock_fail` gain `round_events`, `jackpots`.

**Behaviours** (`lv.hazards.magnetPct / fragilePct / steelPct`, tunables `CONFIG.MAGNET / GLASS / STEEL`):

| Behaviour | From | Rule | Skill read |
|---|---|---|---|
| **Weighted steel** crate | D11 (10 % → 35 % of crates) | Only explicit taps count: each adds `tapGain` × smash damage (0.22 at Lv1 → 5 taps) to a lift meter that holds for `grace` 0.25 s and then drains at 1.2/s. Hold auto-repeat never lifts it (one-time `TAP FAST — DON'T HOLD`). Meter full → `HEAVED!`, the crate opens. Never frozen, never magnet, never jackpot (one mash rule per crate). | Distinct from Frozen's *two taps in 0.45 s*: this is *keep tapping ≥ ~4/s*. Crate visibly lifts off its shadow with the meter; settles with a thud when the meter empties. |
| **Magnet** crate → magnet cargo | D08 (10 % → 25 % of wood/metal crates) | Cargo released from a magnet crate is magnetised. In **free flight** (flick), once it is below y = 470 and falling, it locks onto the lane mouth nearest to its **predicted ballistic landing point** if that is within 78 px, and steers in; on arrival it snaps to the centre. Assisted throws (tap-a-lane, drop) are unaffected. A snap counts as assisted: no PERFECT, no rim near-miss beat. | Sticky assist when you aim roughly right; a trap when your throw would have landed nearer the wrong lane — it snaps into that bin and spills (`sort_miss.chosen_bin` = that lane). Dashed field line while pulling, `SNAP`, pneumatic snap. |
| **Fragile glass** cargo | D09 (10 % → 30 % of pieces; never on unstable pieces) | Shatters (= spill on the spot, `sort_miss.hazard = "shatter"`) when: a free flick's finger speed > 1150 px/s, a wall hit with \|vx\| > 520 px/s, or a landing with vy > 1250 px/s (≈ anything lobbed above the truck line). Tap-a-lane and drop-on-lane are gentle by definition and never shatter. A shattered piece comes back **bubble-wrapped** (`fragile: false`), like a detonated piece comes back stable. | Skill punish for a careless flick, not a timer. Glass sheen + `!` tag; ice-white shards; `SHATTERED — TOO HARD / WALL / TOO HIGH` the first time. |

Results adds a **SHIFT REPORT** row (`3 events · 1 jackpot · 3 steel · 2 snap · 1 shattered`). `dock_clear` / `dock_fail` gain `steel_heaved`, `magnet_snaps`, `glass_shattered`. Dock Brief lists the tags a dock can throw (`SHIFT REPORT · RUSH HOUR · INSPECTION · JACKPOT? · MAGNET · GLASS · STEEL`).

**Sort internals**: `PhaseSort.active` (single piece) became `PhaseSort.pieces[]` + `grab` (the held piece); `sort.active` remains as a compat getter (held piece, else first waiting). `fling / dropAt / flingToLane` take an optional piece; `flingToLane(idx, noisy, piece)` is what the bot uses. `belts` is 1 unless `sort.rush` is set by the event.

**Dev panel**: live event line (active / warn / next-in, belts, pieces, inspection, jackpot, steel, snaps, shattered) and **Force Rush Hour / Force Inspection Shift / End event** buttons (Sort phase).

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

**Audio hook sites (Kade owns `web/js/core/audio.js` + `web/audio/{sfx,music}/`).** Gameplay fires `CC.audio.*` at every beat; `audio.js` only gained no-op stubs for the names that did not exist, so nothing here depends on the pack landing. Every call site is marked `// Kade audio`:

| Hook | Fired from |
|---|---|
| `smash(kind, big)` | crate hit / break (`wood` `metal`), ice shatter (`ice`, big) — `phase_smash.js` |
| `snap(perfect)` | cargo seated in the right lane — `phase_sort.js` |
| `whoosh()` | fling / tap-a-lane, Smash→Sort swap, truck FULL — `phase_sort.js`, `dockrun.js`, `phase_truck.js` |
| `chime(tier)` | streak step reached (tier = step index); `chime(0)` on the Share/Challenge buttons — `phase_sort.js`, `overlay_results.js` |
| `error(kind)` | `spill` `wrong_lane` `unstable` (fuse) `ice` (hit absorbed by a frozen shell) — `phase_sort.js`, `phase_smash.js` |
| `fever(tier)` | fever tier entered, 1–3; `0` when it drops out — `dockrun.js` |
| existing `thud` `crack` `pop` `splat` `sting` `coin` `fail` | unchanged synth calls remain beside the new hooks |

**v3 hooks (Kade)** — added in `audio.js` with procedural fallbacks and drop-in sample slots (`web/audio/sfx/README.md` lists filenames). Stubs are fine until the pack lands; nothing blocks on it.

| Hook | Fired from |
|---|---|
| `fracture(material, big)` — `wood` `metal` `steel` `glass` `ice` | every crate hit/break now routes here (`phase_smash.js`; jackpot = `metal` + `roundEvent('jackpot')`), glass shatter (`phase_sort.js`). Metal/steel/glass have their own sample slots; wood/ice fall through to `smash()` |
| `pneumatic(kind)` — `snap` `hiss` `release` | magnet snap onto a lane mouth (`phase_sort.js`); Rush Hour belt hiss and event-end release (`round_events.js`) |
| `streakPitch(streak)` | every clean sort, one semitone per streak step, 2-octave cap (`phase_sort.js`) — the per-sort pitch ladder under the step `chime()` |
| `grooveIntensity(0..1)` | `dockrun.js`, ~4 Hz: fever value + 0.25 during Rush Hour; `0` on leaving the dock. Sample loop → bed gain 0.08–0.28; procedural → hats/bass/sparkle ladder |
| `roundEvent(id, phase)` — `rush_hour` `inspection_shift` `jackpot` × `warn` `start` `end` | `round_events.js` (warn two-tick, start stinger, end release), `phase_smash.js` (jackpot crack) |
| `heave(k)` | weighted steel: each explicit tap with the lift meter `k` (pitch climbs); `heave(-1)` when the meter empties and the crate settles (`phase_smash.js`) |

`CC.audio` is the same instance as `CC.game.audio`. Audio stays default-off and the game reads fully muted (Vale mute rule).

Useful URL flags: `?dev=1` (open dev panel), `?bot=1` (autoplay acceptance session), `?bot=1&autodownload=1` (also downloads the JSONL when done), `?sheet=1` (asset sheet), `?reset=1` (wipe profile + telemetry = fresh install), `?nodesync=1` (disable the low-latency `desynchronized` canvas hint if a device misbehaves), `?noevents=1` (no round events — clean capture takes). `#challenge=D03-412-7-31-c` in the hash is an inbound Challenge link (below).

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
| Critical path | 24 blocking `<script>` + CSS + HTML = **144 KB over 26 requests**, dev tooling always loaded | `defer` scripts in dev; `npm run build` → **29.5 KB brotli / 34.3 KB gzip over 2 requests** incl. all v2 systems (v3 events + behaviours: **35.6 KB br / 41.5 KB gz**) (`index.html` with inlined CSS + `app.<hash>.js`); dev tooling (`js/dev/*`, 3.5 KB br) is a separate chunk fetched only for `?dev` / `?bot` / `?sheet`, the DEV button or `` ` `` |
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
                        fx (bursts, splinters, haptic vocabulary), audio (Kade-owned; synth + hook stubs),
                        telemetry (debounced persist), save, share (Share Run / Challenge link + PNG card)
  js/data/              economy (CSV mirror), cargo types (+golden/timed/magnet/fragile/mute draw), levels D01–D50 (+hazards, events), CC_DockRush_* assets
  js/ui/widgets.js      buttons / panels / HUD chips / brand lockup + Mode chip / stage backdrop (offscreen-cached)
  js/screens/           boot, hub, dockbrief, dockrun (+ phase_smash/sort/truck, round_events, overlay_revive/results), upgrade
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
- v3 depth pass (headless Chrome via puppeteer-core, both `web/` source and the minified `dist/`): `?bot=1` still GREEN with 0 page errors and `mode: "dock_rush"` on every event; D14 with hazards forced on — weighted steel ignores 3 slow taps (0.6 s apart) and a 1 s hold, opens on 7 taps at 60 ms; jackpot cracks on 4 taps with `stats.jackpots=1`, +40 score, fever ≥0.3, `smash.crate_type="jackpot"`, `cargoTotal` includes its extra pieces; glass shatters on a 2200 px/s free flick (`sort_miss.hazard="shatter"`, comes back `fragile:false`) and seats safely via tap-a-lane; magnet lob 45 px off the right lane snaps + seats, the same lob at a wrong lane snaps + spills in that bin; forced Rush Hour → 2 belts, two waiting pieces on distinct belts, pointer-down grabs the nearest; forced Inspection → lanes rotate one slot exactly (30/193/357 → 193/357/30), mute on, home again after end; `round_event` start/end emitted; `dock_clear` carries `round_events / jackpots / steel_heaved / magnet_snaps / glass_shattered`; share copy reads `Crate Crush (Dock Rush mode)`. Natural D14 / D30 / D45 at base stats clear inside the timer (18–20 s) with a frame cost of p50 1.1 ms / p95 2.2 ms including Rush Hour. `check-economy` GREEN, `verify-telemetry` GREEN on the new bot JSONL.
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
