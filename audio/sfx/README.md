# Dock Rush v2 — SFX samples

Drop mono/stereo WAV (preferred) or short OGG/MP3 here. Phone-speaker friendly: mid-forward, peak ≤ −1 dBFS, no sub-80 Hz rumble.

If a file is missing, `audio.js` uses a procedural WebAudio fallback.

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
