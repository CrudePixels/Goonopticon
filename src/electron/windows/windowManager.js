const { BrowserWindow } = require('electron');
const path = require('path');
const storage = require('../storage/adapter');

function createWindow({ file, width = 1000, height = 700, minWidth, minHeight, boundsKey, options = {} }) {
  const saved = boundsKey ? storage.getWindowBounds(boundsKey) : null;
  const opts = {
    width: saved?.width || width,
    height: saved?.height || height,
    x: saved?.x,
    y: saved?.y,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js')
    },
    ...options
  };
  if (minWidth) opts.minWidth = minWidth;
  if (minHeight) opts.minHeight = minHeight;

  const win = new BrowserWindow(opts);

  win.loadFile(path.join(__dirname, '../../renderer', file));

  win.once('ready-to-show', () => win.show());

  if (boundsKey) {
    win.on('close', () => {
      storage.setWindowBounds(boundsKey, win.getBounds());
    });
  }

  return win;
}

module.exports = { createWindow };
