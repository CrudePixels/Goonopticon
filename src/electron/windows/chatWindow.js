const { BrowserWindow } = require('electron');
const path = require('path');
const storage = require('../storage/adapter');
const { getAppIconPath } = require('../utils/iconPath');
const freezeTrace = require('../services/freezeTrace');

const BOUNDS_KEY = 'chatPopout';
let chatWindow = null;

function openChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus();
    return chatWindow;
  }

  const saved = storage.getWindowBounds(BOUNDS_KEY);
  const iconPath = getAppIconPath();

  process.__GOON_CHAT_POPOUT_NEXT = true;
  chatWindow = new BrowserWindow({
    width: saved?.width || 700,
    height: saved?.height || 500,
    x: saved?.x,
    y: saved?.y,
    minWidth: 400,
    minHeight: 300,
    show: false,
    frame: false,
    title: 'Chat — Goonopticon',
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const indexPath = path.join(__dirname, '../../renderer/index.html');
  chatWindow.loadFile(indexPath, { query: { popout: 'chat' } });
  freezeTrace.attachWebContentsDiagnostics(chatWindow.webContents, 'chat_popout');
  try { delete process.__GOON_CHAT_POPOUT_NEXT; } catch (_) {}

  chatWindow.once('ready-to-show', () => chatWindow.show());

  chatWindow.on('close', () => {
    if (chatWindow && !chatWindow.isDestroyed())
      storage.setWindowBounds(BOUNDS_KEY, chatWindow.getBounds());
  });

  chatWindow.on('closed', () => {
    chatWindow = null;
  });

  return chatWindow;
}

module.exports = { openChatWindow };
