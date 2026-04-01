const { BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { getAppIconPath } = require('../utils/iconPath');
const storage = require('../storage/adapter');

let tweetPopup = null;

function getPreferredDisplay() {
  const id = storage.getPreferredDisplayId();
  if (id == null) return screen.getPrimaryDisplay();
  const displays = screen.getAllDisplays();
  return displays.find((d) => d.id === id) || screen.getPrimaryDisplay();
}

function openPodawfulTweetPopupWindow(payload) {
  const id = payload && payload.id ? String(payload.id) : '';
  if (!id) return null;

  if (tweetPopup && !tweetPopup.isDestroyed()) {
    tweetPopup.focus();
    tweetPopup.webContents.send('tweetPopup:show', payload);
    return tweetPopup;
  }

  const iconPath = getAppIconPath();
  const display = getPreferredDisplay();
  const w = 420;
  const h = 560;
  const { x: dx, y: dy, width: dw, height: dh } = display.workArea || display.bounds;
  const margin = 16;
  const x = dx + Math.max(margin, dw - w - margin);
  const y = dy + Math.max(margin, dh - h - margin);

  tweetPopup = new BrowserWindow({
    width: w,
    height: h,
    x,
    y,
    minWidth: 340,
    minHeight: 400,
    title: '@podawful',
    backgroundColor: '#0d1117',
    alwaysOnTop: true,
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, '../preloadPodawfulTweet.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  tweetPopup.loadFile(path.join(__dirname, '../../renderer/podawfulTweetPopup.html'));

  tweetPopup.webContents.once('did-finish-load', () => {
    tweetPopup?.webContents?.send('tweetPopup:show', payload);
  });

  tweetPopup.on('closed', () => {
    tweetPopup = null;
  });

  return tweetPopup;
}

function registerPodawfulTweetPopupIPC() {
  ipcMain.on('tweetPopup:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });
}

module.exports = {
  openPodawfulTweetPopupWindow,
  registerPodawfulTweetPopupIPC
};
