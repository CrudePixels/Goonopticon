# Goonopticon Desktop

Electron desktop app for timestamping videos. **App repo:** [CrudePixels/Goonopticon](https://github.com/CrudePixels/Goonopticon). The browser extension lives in a separate repo: [CrudePixels/Goonopticon-Extension](https://github.com/CrudePixels/Goonopticon-Extension).

## Features

- **Timestamp Videos** — Add notes at timecodes, edit inline, organize with groups and tags, search, recent videos list
- **Jump to time** — Uses Goonopticon Bridge extension for in-browser seek, or opens URL with timestamp
- **Overlay** — Always-on-top compact window; syncs with Timestamp's current video
- **Import/Export** — JSON, CSV, Markdown; paste from extension clipboard
- **Themes** — Default, Light, Dark (CSS variables)
- **Settings** — Theme, configurable bridge port
- **Report Bug** — Copy report with log path, open GitHub issue
- **Tracker** — Add people (name, YouTube, Twitter, avatar), persist list, fetch recent YouTube uploads via channel RSS
- **Music** — Pick folder, scan for audio (mp3, wav, ogg, m4a, flac), play/pause/next/prev, progress bar
- **Tray icon** — Quick access when minimized
- **Shortcuts** — Ctrl+Shift+O toggles overlay
- **Window positions** — Remembered across sessions

## Setup

```bash
npm install
npm start
```

## Build

```bash
npm run build         # Current platform
npm run build:win     # Windows (NSIS installer + portable)
npm run build:portable # Windows portable .exe only (output in dist/)
npm run build:exe     # Windows unpacked build, then copy .exe to project root
```

- **Installer:** `dist/` after `build:win` (e.g. `Goonopticon Desktop Setup x.x.x.exe`).
- **Portable:** single .exe in `dist/` after `build:portable`.
- **Run from root:** `build:exe` puts a copy of the unpacked app’s .exe in the project root for quick runs.

## Goonopticon Bridge Extension

The extension is developed in its own repo: **[Goonopticon-Extension](https://github.com/CrudePixels/Goonopticon-Extension)**. To run or build this app with the bridge:

1. Clone the extension repo next to this app (e.g. `../Goonopticon-Extension`) or place it in `Goonopticon-Extension/` inside this project.
2. Run `npm run prepare-extension` (builds run this automatically). This copies the extension into `src/goonopticon-bridge`.
3. Start the desktop app (WebSocket server on port 9245 by default).
4. In Chrome: `chrome://extensions` → Developer mode → Load unpacked → select **`src/goonopticon-bridge`**.
5. Right-click extension → Options to change port if needed.

**Jump** in Timestamp or Overlay seeks the video in the active tab when the extension is connected (green dot in header).

## Project Structure

```
Goonopticon App/
├── package.json, README.md
├── scripts/           copy-exe-to-root.js (used by build:exe)
├── dist/              build output (installers, portable exe)
└── src/
    ├── electron/     main process (main.js, preload, services, storage, windows)
    ├── renderer/     UI (index, timestamp, overlay, music, styles)
    ├── goonopticon-bridge/   Filled by prepare-extension from Goonopticon-Extension repo (load unpacked from here)
    ├── grokBuddy/     Grok window UI
    ├── themes/        theme JSON files
    ├── splash/        quotes.txt, loading.txt
    ├── icons/         app icon, tray icon
    ├── sprites/       sprite assets
    └── animations/    animation assets
```

## Compatibility

- Data format matches the original extension (notes/groups per URL)
- Import extension JSON or paste from clipboard

## Known issues / Platform notes

- **Jump to time in browser:** Requires the Goonopticon extension to be loaded and connected. Footer shows "OFFLINE" when the extension is not connected, "LINK" when connected.
- **YouTube embeds:** Some videos (e.g. certain live streams) show "Playback on other websites has been disabled by the video owner" (Error 153) in the in-app Timecode Arsenal embed. Open the video in your browser and use the extension to jump to timestamps.
- **Updates:** In-app updater only runs when using an installed build (not `npm start`). It checks GitHub Releases for the repo configured in `package.json` build.publish.
- **Windows / Mac / Linux:** Primary testing is on Windows. Tray, shortcuts, and file dialogs should work on all platforms; report issues per platform if you find them.
