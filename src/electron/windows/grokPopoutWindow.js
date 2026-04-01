const { BrowserWindow } = require('electron');
const path = require('path');
const storage = require('../storage/adapter');
const { getAppIconPath } = require('../utils/iconPath');

const BOUNDS_KEY = 'grokPopout';
let grokPopoutWindow = null;

function openGrokPopoutWindow() {
  if (grokPopoutWindow && !grokPopoutWindow.isDestroyed()) {
    grokPopoutWindow.focus();
    return grokPopoutWindow;
  }

  const saved = storage.getWindowBounds(BOUNDS_KEY);
  const iconPath = getAppIconPath();

  process.__GOON_GROK_POPOUT_NEXT = true;
  grokPopoutWindow = new BrowserWindow({
    width: saved?.width || 520,
    height: saved?.height || 640,
    x: saved?.x,
    y: saved?.y,
    minWidth: 380,
    minHeight: 480,
    show: false,
    frame: false,
    title: 'Erm, Grok — Goonopticon',
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const indexPath = path.join(__dirname, '../../renderer/index.html');
  grokPopoutWindow.loadFile(indexPath, { query: { popout: 'grok' } });
  try { delete process.__GOON_GROK_POPOUT_NEXT; } catch (_) {}

  grokPopoutWindow.once('ready-to-show', () => grokPopoutWindow.show());

  grokPopoutWindow.on('close', () => {
    if (grokPopoutWindow && !grokPopoutWindow.isDestroyed())
      storage.setWindowBounds(BOUNDS_KEY, grokPopoutWindow.getBounds());
  });

  grokPopoutWindow.on('closed', () => {
    grokPopoutWindow = null;
  });

  return grokPopoutWindow;
}

module.exports = { openGrokPopoutWindow };
