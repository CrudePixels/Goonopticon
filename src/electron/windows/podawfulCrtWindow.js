const { BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { getAppIconPath } = require('../utils/iconPath');
const storage = require('../storage/adapter');

let crtWindow = null;

function getPreferredDisplay() {
  const id = storage.getPreferredDisplayId();
  if (id == null) return screen.getPrimaryDisplay();
  const displays = screen.getAllDisplays();
  return displays.find((d) => d.id === id) || screen.getPrimaryDisplay();
}

function openPodawfulCrtWindow(payload) {
  const videoId = payload && payload.videoId ? String(payload.videoId) : '';
  if (!videoId) return null;

  if (crtWindow && !crtWindow.isDestroyed()) {
    crtWindow.focus();
    crtWindow.webContents.send('podawfulCrt:play', payload);
    return crtWindow;
  }

  const iconPath = getAppIconPath();
  const display = getPreferredDisplay();
  const w = 760;
  const h = 620;
  const { x: dx, y: dy, width: dw, height: dh } = display.workArea || display.bounds;
  const x = dx + Math.max(0, Math.round((dw - w) / 2));
  const y = dy + Math.max(0, Math.round((dh - h) / 2));

  crtWindow = new BrowserWindow({
    width: w,
    height: h,
    x,
    y,
    minWidth: 480,
    minHeight: 400,
    title: 'BROADCAST INTERRUPT',
    backgroundColor: '#0a0a0c',
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, '../preloadPodawfulCrt.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  crtWindow.loadFile(path.join(__dirname, '../../renderer/podawfulCrt.html'));

  crtWindow.webContents.once('did-finish-load', () => {
    crtWindow?.webContents?.send('podawfulCrt:play', payload);
  });

  crtWindow.on('closed', () => {
    crtWindow = null;
  });

  return crtWindow;
}

function closePodawfulCrtWindow() {
  if (crtWindow && !crtWindow.isDestroyed()) crtWindow.close();
  crtWindow = null;
}

function registerPodawfulCrtIPC() {
  ipcMain.on('podawfulCrt:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });
}

module.exports = {
  openPodawfulCrtWindow,
  closePodawfulCrtWindow,
  registerPodawfulCrtIPC
};
