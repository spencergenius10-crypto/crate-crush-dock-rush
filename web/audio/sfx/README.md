# Crate Crush (Dock Rush mode) — SFX samples

Drop mono/stereo WAV (preferred) or short OGG/MP3 here. Phone-speaker friendly: mid-forward, peak ≤ −1 dBFS, no sub-80 Hz rumble.

If a file is missing, `audio.js` uses a procedural WebAudio fallback. Every gameplay call site is marked `// Kade audio`.

## v3 depth slots (round events + behaviours)

| Filename | API | Fired when |
|----------|-----|------------|
| `fracture_metal.wav` | `fracture('metal', big)` | metal crate hit / break (also jackpot crate) |
| `fracture_steel.wav` | `fracture('steel', big)` | weighted steel heaved open (big) — heavy clang-drop |
| `fracture_glass.wav` | `fracture('glass', true)` | fragile glass cargo shattered by a hard flick / wall / landing |
| `pneumatic_snap.wav` | `pneumatic('snap' \| 'hiss' \| 'release')` | magnet cargo snaps onto a lane mouth · Rush Hour belt hiss · event end release |
| `steel_heave.wav` | `heave(k)` (k = lift 0..1, playbackRate rises) | each explicit tap on a weighted steel crate; `heave(-1)` = it settled back (thud) |
| `event_rush_hour.wav` | `roundEvent('rush_hour', 'start')` | Rush Hour lands (second belt opens) |
| `event_inspection.wav` | `roundEvent('inspection_shift', 'start')` | Inspection Shift lands (lanes swap, colours mute) |
| `event_jackpot.wav` | `roundEvent('jackpot', 'start')` | jackpot crate cracked |
| — (synth) | `roundEvent(id, 'warn')` | two-tick warning 1.4 s before an event |
| — (synth) | `streakPitch(streak)` | every clean sort: one semitone per streak step (cap 2 octaves) |
| — (bed gain) | `grooveIntensity(0..1)` | ~4 Hz from DockRun: fever value (+0.25 during Rush Hour) drives bed gain / layer ladder |

## v2 slots

| Filename | API | Feel |
|----------|-----|------|
| `crunch_wood.wav` | `crunch()` / alias `thud()` `crack()` | Soft wood crate smash ASMR |
| `clack_bin.wav` | `clack()` | Plastic/metal bin latch |
| `whoosh_pneumatic.wav` | `whoosh()` | Truck dock pneumatic air |
| `chime_combo.wav` | `chime(comboLevel)` | Base chime; playbackRate escalates |
| `error_thud.wav` | `errorThud()` / alias `fail()` | Crisp miss — non-abrasive |
| `ui_pop.wav` | `pop()` | UI tap |
| `coin.wav` | `coin()` | Reward ping |
| `sting_win.wav` | `sting()` | Short win arpeggio |
| `splat_miss.wav` | `splat()` | Soft miss / spill |
| `groove_hat.wav` | groove via `setCombo` | Closed hat one-shot |
| `groove_bass.wav` | groove via `setCombo` | Soft bass pulse one-shot |

**Specs:** 44.1 kHz or 48 kHz · ≤ 0.5 s for one-shots (except sting ≤ 1.2 s) · loudness matched to crunch as reference.
