# Sprites

Place sprite sheets and image assets for the UI here.

- **Sprite sheets** — PNG strips or grids for buttons, status indicators, HUD elements. Reference from renderer CSS or JS via a path that resolves from the app (e.g. packaged in `src/` and loaded from renderer).
- **Individual sprites** — Icons, decorations, or small graphics used across the app (e.g. bridge status, menu icons).

Suggested naming: `spritesheet-hud.png`, `icon-bridge-on.png`, etc. The renderer can load these if the app serves or exposes the `src` folder; otherwise use a relative path from the renderer (e.g. `../src/sprites/...`) if your build copies them, or bundle via electron/asset handling.

- **clickhead.png** — Used by the fake virus popup “close” trick (clickheads all over the screen). Optional; place here or in `src/renderer/`. If missing, that trick falls back to a shake.
