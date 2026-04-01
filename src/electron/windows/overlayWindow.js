const { BrowserWindow } = require('electron');
const path = require('path');
const storage = require('../storage/adapter');

let overlayWindow = null;

function openOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus();
    return overlayWindow;
  }

  const saved = storage.getWindowBounds('overlay');
  overlayWindow = new BrowserWindow({
    width: saved?.width || 320,
    height: saved?.height || 280,
    x: saved?.x,
    y: saved?.y,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    minimizable: false,
    backgroundColor: '#0a0a0e',
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js')
    }
  });

  overlayWindow.loadFile(path.join(__dirname, '../../renderer/overlay.html'));

  overlayWindow.on('close', () => {
    storage.setWindowBounds('overlay', overlayWindow.getBounds());
    try {
      require('./grokWindow').notifyGrokAppEvent('overlayClosed');
    } catch (_) {}
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

function toggleOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
  } else {
    openOverlayWindow();
  }
}

function isOverlayOpen() {
  return overlayWindow && !overlayWindow.isDestroyed();
}

module.exports = { openOverlayWindow, toggleOverlayWindow, isOverlayOpen };
