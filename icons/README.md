# web/icons — app icon drop slot

**Expected file:** `web/icons/app-icon-1024.png` — 1024×1024 PNG, square, no rounded corners/transparency (the OS masks it).

**Source:** Chief-locked asset on the Ratio Studios brand path, `LOCKED-dock-rush-app-icon-1024.png`. Copy it here under the name above (Kade deploy). The binary was not reachable from the branch that wired these links, so the file is intentionally absent; nothing else needs to change once it lands.

Already pointing at it:
- `web/index.html` → `<link rel="icon">` (favicon) and `<link rel="apple-touch-icon">` (iOS home screen / splash tint)
- `web/manifest.webmanifest` → PWA icon (`any` + `maskable`), standalone portrait, `#12151b` background/theme (Android splash is generated from these)
- `tools/build.mjs` copies `icons/` and the manifest into `dist/` and warns while the PNG is missing

Until the PNG is present, browsers log a 404 for the favicon and fall back to their default tab icon; gameplay is unaffected.
