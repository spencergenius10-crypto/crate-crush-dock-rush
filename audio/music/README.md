# Dock Rush v2 — music / groove loops

Optional looped bed. No hype EDM (Ari kill-list). Quiet dock pulse only.

If missing, `audio.js` procedurally schedules hats/bass from `audio/sfx/` (or synth).

| Filename | API | Notes |
|----------|-----|-------|
| `groove_loop.ogg` | `grooveStart()` / `grooveStop()` | Seamless loop · ~96 BPM · low level · mid-forward |

**Specs:** OGG Vorbis preferred (size) · WAV OK · loop point clean · peak ≤ −6 dBFS so SFX stay on top · no vocals / no scream risers.

`setCombo(n)` does not replace this loop; when the loop is absent it thickens procedural hats (n≥1), bass (n≥3), sparkle (n≥6).
