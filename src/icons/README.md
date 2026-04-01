# Icons

Place app and tray assets here. All paths are relative to this folder.

## App icon (taskbar, window title bar, installer)

- **Windows:** `icon.ico` (multi-size recommended, e.g. 16, 32, 48, 256) or `icon.png` (256×256; electron-builder will convert).
- **macOS:** `icon.icns` or `icon.png` (1024×1024).
- **Linux:** `icon.png` (512×512 or 256×256).

If only `icon.png` is present, electron-builder uses it to generate platform icons when you run `npm run build`.

The main and splash windows use the app icon for the title bar when available.

## Tray icon

- **`tray.png`** — System tray (notification area) icon. Use 16×16 or 32×32 PNG. On high-DPI Windows, 32×32 is safer.

## First-run pill choice

- **`choose.jpg`** (or `choose.png`) — Image shown on first launch: blue pill (left) and red pill (right). User clicks left = “Immerse Yourself” (virus popup on) or right = “Avoid the Noid” (virus popup off). Use a horizontal layout with blue pill on the left, red on the right.

## Chat platform logos (unified chat)

Used in the in-app chat list, stream chips, and the website embed (`/platform-icons/…`). Put **one file per platform** in this folder:

| Filename | Platform |
|----------|----------|
| `twitch.png` (or `.svg` / `.webp`) | Twitch |
| `kick.png` | Kick |
| `youtube.png` | YouTube |
| `rumble.png` | Rumble |
| `odysee.png` | Odysee |
| `dlive.png` | DLive |
| `podawful.png` | Pod Awful |
| `embed.png` | Website / embed messages |
| `other.png` | “Other” custom streams |

Extensions are tried in order: **`.png`**, **`.svg`**, **`.webp`**.

If a platform file is missing, the app shows a **colored letter badge** (T, K, Y, …) per site — not official logos. Put your own `twitch.png`, etc. to replace them.

For **Other** streams only, missing art uses **`platform-default.svg`** if present, then the **?** badge.

## File checklist

| File        | Purpose                    |
|------------|----------------------------|
| `icon.ico` | Windows app + installer    |
| `icon.png` | Fallback / builder source  |
| `icon.icns`| macOS app (optional)       |
| `tray.png` | Tray icon                  |
| `choose.jpg` | First-run pill choice   |
| `platform-default.svg` | Chat fallback when a platform logo is missing |
