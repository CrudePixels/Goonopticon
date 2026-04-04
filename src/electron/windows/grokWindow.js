const { BrowserWindow, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const storage = require('../storage/adapter');

const GROK_TXT = path.join(__dirname, '../../grokBuddy/grok.txt');
const GROK_BOUNDS_KEY = 'grok';

let grokTxtCache = { mtimeMs: NaN, data: null };

function parseGrokTxt() {
  try {
    const st = fs.statSync(GROK_TXT);
    const mtimeMs = st.mtimeMs;
    if (grokTxtCache.data && grokTxtCache.mtimeMs === mtimeMs) return grokTxtCache.data;
    const raw = fs.readFileSync(GROK_TXT, 'utf8');
    const out = {};
    let section = null;
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\[(\w+)\]$/);
      if (m) {
        section = m[1];
        out[section] = [];
        continue;
      }
      const trimmed = line.trim();
      if (section && trimmed && !trimmed.startsWith('#')) out[section].push(trimmed);
    }
    grokTxtCache = { mtimeMs, data: out };
    return out;
  } catch (_) {
    return grokTxtCache.data || {};
  }
}

let grokWindow = null;
const DOCK_THRESHOLD = 24;
const BOUNCE_CHECK_MS = 500;
let bounceInterval = null;

function clampAndSnapGrokWindow() {
  if (!grokWindow || grokWindow.isDestroyed()) return;
  const bounds = grokWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const work = display.workArea;
  const { width, height } = bounds;
  let { x, y } = bounds;
  x = Math.max(work.x, Math.min(work.x + work.width - width, x));
  y = Math.max(work.y, Math.min(work.y + work.height - height, y));
  if (x <= work.x + DOCK_THRESHOLD) x = work.x;
  else if (x >= work.x + work.width - width - DOCK_THRESHOLD) x = work.x + work.width - width;
  if (y <= work.y + DOCK_THRESHOLD) y = work.y;
  else if (y >= work.y + work.height - height - DOCK_THRESHOLD) y = work.y + work.height - height;
  grokWindow.setPosition(Math.round(x), Math.round(y));
}

function startBounceChecker() {
  if (bounceInterval) return;
  bounceInterval = setInterval(() => {
    if (!grokWindow || grokWindow.isDestroyed()) {
      clearInterval(bounceInterval);
      bounceInterval = null;
      return;
    }
    clampAndSnapGrokWindow();
  }, BOUNCE_CHECK_MS);
}

function stopBounceChecker() {
  if (bounceInterval) {
    clearInterval(bounceInterval);
    bounceInterval = null;
  }
}

function openGrokWindow() {
  if (grokWindow && !grokWindow.isDestroyed()) {
    grokWindow.focus();
    return grokWindow;
  }

  const saved = storage.getWindowBounds(GROK_BOUNDS_KEY);
  const alwaysOnTop = storage.getGrokAlwaysOnTop();

  grokWindow = new BrowserWindow({
    width: 200,
    height: 280,
    x: saved?.x,
    y: saved?.y,
    frame: false,
    transparent: true,
    alwaysOnTop: !!alwaysOnTop,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../../grokBuddy/grokBuddyPreload.js')
    }
  });

  grokWindow.loadFile(path.join(__dirname, '../../grokBuddy/grokBuddy.html'));

  grokWindow.on('close', () => {
    if (grokWindow && !grokWindow.isDestroyed())
      storage.setWindowBounds(GROK_BOUNDS_KEY, grokWindow.getBounds());
  });

  grokWindow.on('closed', () => {
    stopBounceChecker();
    grokWindow = null;
  });

  grokWindow.webContents.once('did-finish-load', () => {
    startBounceChecker();
  });

  return grokWindow;
}

function broadcastToAllWindows(channel, ...args) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args);
  }
}

function notifyGrokAppEvent(eventType, detail = {}) {
  const payload = { type: eventType, ...detail };
  broadcastToAllWindows('grok:appEvent', payload);
}

function registerGrokIPC() {
  ipcMain.handle('grok:getLines', () => parseGrokTxt());

  ipcMain.handle('grok:getBounds', () => {
    if (grokWindow && !grokWindow.isDestroyed()) {
      const b = grokWindow.getBounds();
      return { x: b.x, y: b.y };
    }
    return { x: 0, y: 0 };
  });

  ipcMain.on('grok:setPosition', (event, x, y) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setPosition(Math.round(x), Math.round(y));
  });

  ipcMain.on('grok:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.on('grok:dragEnded', () => {
    clampAndSnapGrokWindow();
    if (grokWindow && !grokWindow.isDestroyed())
      storage.setWindowBounds(GROK_BOUNDS_KEY, grokWindow.getBounds());
  });

  ipcMain.handle('grok:getAlwaysOnTop', () => storage.getGrokAlwaysOnTop());
  ipcMain.on('grok:setAlwaysOnTop', (event, on) => {
    storage.setGrokAlwaysOnTop(!!on);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.setAlwaysOnTop(!!on);
  });

  ipcMain.on('grok:setSize', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.setSize(Math.round(width), Math.round(height));
  });
}

function notifyGrokOverlayShown() {
  broadcastToAllWindows('grok:randomComment');
}

module.exports = { openGrokWindow, registerGrokIPC, notifyGrokOverlayShown, notifyGrokAppEvent };
