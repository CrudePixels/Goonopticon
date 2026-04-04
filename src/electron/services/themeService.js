const fs = require('fs');
const path = require('path');

const THEMES_DIR = path.join(__dirname, '../../themes');

/** Avoid sync disk + JSON.parse on every theme IPC (startup + Grok + settings). */
const themeFileCache = new Map();

const DEFAULT_UI = {
  fontSize: 21,
  fontSizeSmall: 18,
  buttonPadding: '12px 18px',
  borderRadius: '0px',
  fontMono: '"VT323", "Courier New", Consolas, monospace'
};

function loadTheme(themeName) {
  const file = path.join(THEMES_DIR, `${themeName}.json`);
  try {
    const st = fs.statSync(file);
    const mt = st.mtimeMs;
    const hit = themeFileCache.get(themeName);
    if (hit && hit.mtimeMs === mt) return hit.data;
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    themeFileCache.set(themeName, { mtimeMs: mt, data: parsed });
    return parsed;
  } catch {
    return null;
  }
}

function getThemeColors(themeName) {
  const theme = loadTheme(themeName);
  return theme?.colors || loadTheme('default')?.colors || {};
}

function getFullTheme(themeName) {
  const theme = loadTheme(themeName) || loadTheme('default');
  const colors = theme?.colors || {};
  const ui = { ...DEFAULT_UI, ...theme?.ui };
  const crt = !!theme?.crt;
  return { colors, ui, crt };
}

module.exports = { loadTheme, getThemeColors, getFullTheme };
