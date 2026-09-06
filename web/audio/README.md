# web/audio — sonic drop-in slots

Everything the game plays today is **procedural WebAudio** in `web/js/core/audio.js` (zero binary assets, zero extra requests). This folder is where real recordings land later. Nothing needs to change in gameplay code: `audio.js` checks for a sample by **name** before it synthesizes, so shipping a file is a two-line change.

## How to drop in a file

1. Put the file here: `web/audio/sfx/<name>.wav` (or `.ogg`/`.m4a`) or `web/audio/music/<stem>.ogg`.
2. List it in `CC.CONFIG.AUDIO_SAMPLES` (`web/js/core/config.js`):

```js
AUDIO_SAMPLES: {
  smash_wood_big: 'audio/sfx/smash_wood_big.wav',
  snap: 'audio/sfx/snap.wav',
  music_base: 'audio/music/groove_base.ogg',
},
```

Files are fetched + decoded once, lazily, after the first tap (never on the load path). A missing or failed file silently keeps the procedural version. Any name **not** listed stays procedural, so you can replace one sound at a time.

## SFX names (what each hook plays)

| name | fired from | brief |
|---|---|---|
| `smash_wood`, `smash_wood_big` | crate hit / crate break | wood-crunch: low thump + splintery cluster |
| `smash_metal`, `smash_metal_big` | metal crate hit / break | thump + inharmonic ring |
| `smash_ice`, `smash_ice_big` | frozen shell hit (absorbed) / shatter | glassy chirps |
| `snap`, `snap_perfect` | cargo seated in the right lane | bin clack; perfect adds a bright ting |
| `whoosh` | fling, Smash→Sort swap, truck FULL | filtered noise sweep |
| `chime_1` … `chime_5` | streak step *n* (escalating); `chime_0` = share button | pentatonic run, longer/brighter per step |
| `error`, or specific `error_spill` `error_wrong_lane` `error_unstable` `error_ice` | spill / wrong lane / fuse detonation / ice clink | crisp low thud (+buzz when unstable; clink for ice) |
| `fever_1` `fever_2` `fever_3` `fever_0` | fever tier entered ×2/×3/×5; `_0` = dropped out | riser + widening chord |
| `thud` `truck_clear` `coin` `fail` `ui_tap` | truck load / FULL sting / coin / dock fail / button | legacy names |

Deliver mono or stereo, 44.1/48 kHz, short (≤ 0.6 s SFX), peak −3 dBFS; the master bus already has a soft compressor and a 70 Hz high-pass for phone speakers, so keep sub content light.

## Music stems

The groove is a 92 BPM lo-fi/industrial 16-step pattern (E minor pentatonic bass, swung 16ths, hats + bass drive that follow `intensity` = fever/streak). To replace it with recorded stems, all loops **must be the same length** (bars × 60/92 × 4 s) and start on the downbeat:

| stem | role | follows intensity? |
|---|---|---|
| `music_base` | drums + keys + texture (always on) | no |
| `music_hats` | hats layer | gain 0.15 → 1.0 |
| `music_bass` | bass layer | gain 0.3 → 1.0 |

When `music_base` decodes, the procedural scheduler stops and the stems take over in sync. Keep the bass with an audible octave partial — phone speakers drop everything below ~150 Hz.

## Mute rules

Audio defaults **on** for new installs, the **capture preset mutes**, Settings has the full toggle and the Hub has a one-tap `♪` chip. The `AudioContext` is created/resumed only on the first tap (autoplay policy) and never gates input. The game is designed to read fully with sound off.
