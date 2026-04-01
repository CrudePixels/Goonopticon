const { app, BrowserWindow, ipcMain, shell, Tray, Menu, globalShortcut, dialog, screen, protocol, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { Readable } = require('stream');

protocol.registerSchemesAsPrivileged([
  { scheme: 'goonopticon-music', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, bypassCSP: true } },
  { scheme: 'goonopticon-emotes', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  {
    scheme: 'goonopticon-platform-icons',
    privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true, corsEnabled: true }
  }
]);
const { getRandomSplash, getLoadingLines } = require('./services/splashTextService');
const { openTimestampWindow } = require('./windows/timestampWindow');
const { openMusicWindow } = require('./windows/musicWindow');
const { openChatWindow } = require('./windows/chatWindow');
const { openOverlayWindow, toggleOverlayWindow } = require('./windows/overlayWindow');
const { registerGrokIPC, notifyGrokOverlayShown } = require('./windows/grokWindow');
const { openGrokPopoutWindow } = require('./windows/grokPopoutWindow');
const { openVirusPopupWindow, registerVirusIPC, getVideoFiles } = require('./windows/virusPopupWindow');
const { openPodawfulCrtWindow, registerPodawfulCrtIPC } = require('./windows/podawfulCrtWindow');
const { openPodawfulTweetPopupWindow, registerPodawfulTweetPopupIPC } = require('./windows/podawfulTweetPopupWindow');
const podawfulFeedAlert = require('./services/podawfulFeedAlertService');
const podawfulTweetAlert = require('./services/podawfulTweetAlertService');
const extensionBridge = require('./services/extensionBridge');
const themeService = require('./services/themeService');
const logger = require('./services/logger');
const embedServer = require('./services/embedServer');

const storage = require('./storage/adapter');
const youtubeFeed = require('./services/youtubeFeedService');
const podawfulTweets = require('./services/podawfulTweetsService');
const xTweets = require('./services/xTweetsService');
const podawfulMerch = require('./services/podawfulMerchService');
const { getAppIconPath } = require('./utils/iconPath');
const platformIconAssets = require('./utils/platformIconAssets');
const goonipediaFolder = require('./services/goonipediaFolderService');

// Default folders relative to repo (src/electron -> src/music, src/video)
const DEFAULT_MUSIC_FOLDER = path.join(__dirname, '..', 'music');
const DEFAULT_VIDEO_FOLDER = path.join(__dirname, '..', 'video');

function getEffectiveMusicFolder() {
  return storage.getMusicFolder() || DEFAULT_MUSIC_FOLDER;
}

function isPathUnderFolder(filePath, folderPath) {
  const resolved = path.normalize(path.resolve(filePath));
  const allowed = path.normalize(path.resolve(folderPath));
  const allowedWithSep = allowed.endsWith(path.sep) ? allowed : allowed + path.sep;
  if (process.platform === 'win32') {
    const r = resolved.toLowerCase();
    const a = allowedWithSep.toLowerCase();
    return r === allowed.toLowerCase() || r.startsWith(a);
  }
  return resolved === allowed || resolved.startsWith(allowedWithSep);
}

function getEffectiveVirusVideoFolder() {
  return storage.getVirusVideoFolder() || DEFAULT_VIDEO_FOLDER;
}

function getPreferredDisplay() {
  const id = storage.getPreferredDisplayId();
  if (id == null) return screen.getPrimaryDisplay();
  const displays = screen.getAllDisplays();
  return displays.find((d) => d.id === id) || screen.getPrimaryDisplay();
}

function getWindowPositionOnDisplay(display, width, height) {
  const { x, y, width: dw, height: dh } = display.workArea || display.bounds;
  const left = x + Math.max(0, (dw - width) / 2);
  const top = y + Math.max(0, (dh - height) / 2);
  return { x: Math.round(left), y: Math.round(top) };
}

let splashWindow = null;
let mainWindow = null;
let tray = null;
let splashShownAt = 0;

function createSplashWindow() {
  splashShownAt = Date.now();
  const iconPath = getAppIconPath();
  const display = getPreferredDisplay();
  const pos = getWindowPositionOnDisplay(display, 500, 300);
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  splashWindow.loadFile(path.join(__dirname, '../renderer/splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  const saved = storage.getWindowBounds('main');
  const width = saved?.width || 1100;
  const height = saved?.height || 700;
  const display = getPreferredDisplay();
  const pos = getWindowPositionOnDisplay(display, width, height);
  const iconPath = getAppIconPath();
  mainWindow = new BrowserWindow({
    width,
    height,
    x: saved?.x != null ? saved.x : pos.x,
    y: saved?.y != null ? saved.y : pos.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    sendBridgeStatus();
    const splashMinMs = storage.getSplashDurationMs();
    const elapsed = Date.now() - splashShownAt;
    const wait = Math.max(0, splashMinMs - elapsed);
    setTimeout(() => {
      mainWindow.show();
      if (splashWindow) splashWindow.close();
    }, wait);
  });

  mainWindow.on('close', (e) => {
    if (mainWindow._exitSoundPlayed) {
      const b = mainWindow.getBounds();
      storage.setWindowBounds('main', b);
      return;
    }
    e.preventDefault();
    BrowserWindow.getAllWindows().forEach((win) => {
      if (win !== mainWindow && win !== splashWindow && !win.isDestroyed()) win.close();
    });
    const b = mainWindow.getBounds();
    storage.setWindowBounds('main', b);
    const playExitSound = storage.getSoundExitEnabled();
    const exitPromise = playExitSound
      ? mainWindow.webContents.executeJavaScript(`
          new Promise(function(resolve) {
            var a = new Audio('sounds/exit.wav');
            a.volume = 0.5;
            a.onended = resolve;
            a.onerror = resolve;
            a.play().catch(resolve);
            setTimeout(resolve, 1800);
          });
        `)
      : Promise.resolve();
    exitPromise.then(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow._exitSoundPlayed = true;
        mainWindow.destroy();
      }
    }).catch(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow._exitSoundPlayed = true;
        mainWindow.destroy();
      }
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupAutoUpdater(mainWindow);
}

function refreshTrayMenu() {
  if (!tray) return;
  const trayMenu = [
    { label: 'Show', click: () => mainWindow?.show() },
    { label: 'Timecode Arsenal', click: () => openTimestampWindow() },
    { label: 'Threat detected…', click: () => {
      const folder = getEffectiveVirusVideoFolder();
      if (folder && fs.existsSync(folder) && getVideoFiles(folder).length > 0)
        openVirusPopupWindow(folder, () => {});
      else if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('app:toast', 'Virus popup: set a video folder in Settings first.');
    } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ];
  if (storage.getGrokEnabled()) {
    trayMenu.splice(2, 0, { label: 'Erm, Grok…', click: () => openGrokPopoutWindow() });
  }
  tray.setContextMenu(Menu.buildFromTemplate(trayMenu));
}

function setupTray() {
  const iconPath = getAppIconPath();
  if (!iconPath || !fs.existsSync(iconPath)) return;
  try {
    tray = new Tray(iconPath);
  } catch {
    return;
  }
  tray.setToolTip('Goonopticon Desktop');
  refreshTrayMenu();
}

let virusPopupTimer = null;

function scheduleVirusPopup() {
  if (virusPopupTimer) clearTimeout(virusPopupTimer);
  virusPopupTimer = null;
  if (!storage.getVirusPopupEnabled()) return;
  const folder = getEffectiveVirusVideoFolder();
  if (!folder || !fs.existsSync(folder)) {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('app:toast', 'Virus popup: folder missing. Pick a folder in Settings.');
    return;
  }
  const videoFiles = getVideoFiles(folder);
  if (!videoFiles.length) {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('app:toast', 'Virus popup: folder empty. Add video files or pick another folder.');
    return;
  }
  const minMs = 2 * 60 * 1000;
  const maxMs = 15 * 60 * 1000;
  const delay = minMs + Math.random() * (maxMs - minMs);
  virusPopupTimer = setTimeout(() => {
    virusPopupTimer = null;
    if (!storage.getVirusPopupEnabled()) return;
    openVirusPopupWindow(getEffectiveVirusVideoFolder(), () => {
      scheduleVirusPopup();
    });
  }, delay);
}

function sendBridgeStatus(wasConnection = false) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bridge:status', {
      connected: extensionBridge.isBridgeConnected(),
      ...extensionBridge.getListenResult()
    });
  }
  if (wasConnection && extensionBridge.isBridgeConnected()) {
    try {
      const n = new Notification({
        title: 'Goonopticon',
        body: 'Bridge connected — timecodes at the ready'
      });
      n.show();
    } catch (_) {}
  }
}

app.whenReady().then(async () => {
  registerGrokIPC();
  registerVirusIPC();
  registerPodawfulCrtIPC();
  registerPodawfulTweetPopupIPC();
  const port = storage.getBridgePort();
  const bridgeResult = await extensionBridge.startBridge(port);
  if (bridgeResult.ok && bridgeResult.port != null && bridgeResult.port !== port) {
    storage.setBridgePort(bridgeResult.port);
  }
  extensionBridge.on('connection', () => sendBridgeStatus(true));
  extensionBridge.on('disconnect', sendBridgeStatus);
  extensionBridge.on('listening', sendBridgeStatus);
  extensionBridge.on('listenError', sendBridgeStatus);
  extensionBridge.on('timeUpdate', (time) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('bridge:timeUpdate', { time });
  });
  [DEFAULT_MUSIC_FOLDER, DEFAULT_VIDEO_FOLDER].forEach((dir) => {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      logger.warn('Could not ensure default folder', { dir, message: e.message });
    }
  });
  logger.info('App started', { bridgePort: bridgeResult.port ?? port, bridgeOk: bridgeResult.ok });

  try {
    const tracked = storage.getTrackedPeople();
    let needSave = false;
    for (const p of tracked) {
      const before = p.avatarPath;
      goonipediaFolder.syncTrackedPersonToFolder(p);
      if (p.avatarPath !== before) needSave = true;
    }
    if (needSave) storage.setTrackedPeople(tracked);
  } catch (e) {
    logger.warn('Goonipedia folder sync on startup failed', { message: e.message });
  }

  // Custom protocol for music playback (secure: only under stored music folder)
  // Stream file directly so <audio> works reliably (paths with spaces, Windows)
  const MIME_BY_EXT = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac', '.webm': 'audio/webm' };
  protocol.handle('goonopticon-music', async (request) => {
    const musicFolder = getEffectiveMusicFolder();
    if (!musicFolder || !fs.existsSync(musicFolder)) {
      return new Response(null, { status: 404 });
    }
    let raw = request.url.slice('goonopticon-music://'.length);
    try {
      raw = decodeURIComponent(raw);
    } catch {
      return new Response(null, { status: 400 });
    }
    const resolved = path.normalize(path.resolve(raw));
    if (!isPathUnderFolder(resolved, musicFolder)) {
      return new Response(null, { status: 403 });
    }
    try {
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
        return new Response(null, { status: 404 });
      }
      const ext = path.extname(resolved).toLowerCase();
      const mime = MIME_BY_EXT[ext] || 'audio/mpeg';
      const nodeStream = fs.createReadStream(resolved);
      const webStream = Readable.toWeb(nodeStream);
      return new Response(webStream, { headers: { 'Content-Type': mime } });
    } catch (e) {
      logger.warn('Music protocol failed', { resolved, message: e?.message });
      return new Response(null, { status: 500 });
    }
  });

  const EMOTES_DIR = path.join(__dirname, '..', 'emotes');
  protocol.handle('goonopticon-emotes', async (request) => {
    let raw = request.url.replace(/^goonopticon-emotes:\/\/\/?/, '').replace(/\?.*$/, '');
    try { raw = decodeURIComponent(raw); } catch { return new Response(null, { status: 400 }); }
    const base = path.basename(raw);
    if (base !== raw || !base.toLowerCase().endsWith('.png')) {
      return new Response(null, { status: 400 });
    }
    const resolved = path.join(EMOTES_DIR, base);
    if (!resolved.startsWith(path.resolve(EMOTES_DIR)) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return new Response(null, { status: 404 });
    }
    try {
      const nodeStream = fs.createReadStream(resolved);
      const webStream = Readable.toWeb(nodeStream);
      return new Response(webStream, { headers: { 'Content-Type': 'image/png' } });
    } catch (e) {
      return new Response(null, { status: 500 });
    }
  });

  protocol.handle('goonopticon-platform-icons', async (request) => {
    let id = '';
    try {
      const u = new URL(request.url);
      id = (u.hostname || u.pathname.replace(/^\/+/, '').split('/')[0] || '').trim();
      try {
        id = decodeURIComponent(id);
      } catch {
        return new Response(null, { status: 400 });
      }
      id = path.basename(id).replace(/\.(png|svg|webp)$/i, '');
    } catch {
      return new Response(null, { status: 400 });
    }
    const resolved = platformIconAssets.resolvePlatformIcon(id);
    try {
      if (resolved.kind === 'file') {
        const nodeStream = fs.createReadStream(resolved.filePath);
        const webStream = Readable.toWeb(nodeStream);
        return new Response(webStream, { headers: { 'Content-Type': resolved.mime, 'Cache-Control': 'public, max-age=3600' } });
      }
      return new Response(resolved.body, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    } catch (e) {
      return new Response(null, { status: 500 });
    }
  });

  createSplashWindow();

  setTimeout(() => {
    createMainWindow();
    try {
      chatService = require('./services/chatService');
      chatService.init((payload) => {
        applyIncomingChatMessage(payload);
      });
    } catch (e) {
      logger.warn('Chat service failed', e.message);
    }
    try {
      if (storage.getChatEmbedEnabled()) {
        const emotesPath = path.join(__dirname, '..', 'emotes');
        embedServer.start(
          storage.getChatEmbedPort(),
          () => storage.getChatLog(),
          (text, username) => injectEmbedChatMessage(text, username),
          emotesPath
        );
      }
    } catch (e) {
      logger.warn('Chat embed server failed', e.message);
    }
    try {
      setupTray();
    } catch (e) {
      logger.warn('Tray setup failed', e.message);
    }
    globalShortcut.register('CommandOrControl+Shift+T', () => openTimestampWindow());
    globalShortcut.register('CommandOrControl+Shift+M', () => openMusicWindow());
    globalShortcut.register('CommandOrControl+Shift+G', () => openGrokPopoutWindow());
    globalShortcut.register('CommandOrControl+Shift+V', () => {
      const folder = getEffectiveVirusVideoFolder();
      if (folder && fs.existsSync(folder) && getVideoFiles(folder).length > 0)
        openVirusPopupWindow(folder, () => {});
      else if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('app:toast', 'Virus popup: set a video folder in Settings first.');
    });
    scheduleVirusPopup();

    function onPodawfulFeedAlert(payload) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('podawfulFeed:screenEffects');
      }
      try {
        const n = new Notification({
          title: 'Pod Awful channel',
          body:
            payload.kind === 'live'
              ? `Live now — ${payload.title || ''}`.trim()
              : `New video — ${payload.title || ''}`.trim()
        });
        n.show();
      } catch (_) {}
      openPodawfulCrtWindow(payload);
    }
    podawfulFeedAlert.setPodawfulFeedAlertHandler(onPodawfulFeedAlert);
    podawfulFeedAlert.startPodawfulFeedAlertPolling();

    function onPodawfulTweetAlert(payload) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('podawfulTweet:screenEffects');
      }
      try {
        const body = (payload.text || '').trim() || 'New post from @podawful';
        const n = new Notification({
          title: '@podawful',
          body: body.slice(0, 180)
        });
        n.show();
      } catch (_) {}
      openPodawfulTweetPopupWindow(payload);
    }
    podawfulTweetAlert.setPodawfulTweetAlertHandler(onPodawfulTweetAlert);
    podawfulTweetAlert.startPodawfulTweetAlertPolling();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (virusPopupTimer) clearTimeout(virusPopupTimer);
  virusPopupTimer = null;
  globalShortcut.unregisterAll();
  extensionBridge.stopBridge();
  try { podawfulFeedAlert.stopPodawfulFeedAlertPolling(); } catch (_) {}
  try { podawfulTweetAlert.stopPodawfulTweetAlertPolling(); } catch (_) {}
  try { require('./services/chatScraper').stopAll(); } catch (_) {}
  try { embedServer.stop(); } catch (_) {}
  tray?.destroy();
  if (process.platform !== 'darwin') app.quit();
});

// IPC
ipcMain.handle('splash:getRandom', async () => getRandomSplash());
ipcMain.handle('splash:getLoadingLines', async () => getLoadingLines());

ipcMain.handle('window:openTimestamp', () => {
  openTimestampWindow();
  return undefined;
});
ipcMain.handle('window:openMusic', () => {
  openMusicWindow();
  return undefined;
});
ipcMain.handle('window:openChatPopout', () => {
  openChatWindow();
  return undefined;
});
ipcMain.handle('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.close();
});
ipcMain.handle('window:openOverlay', () => {
  openOverlayWindow();
  notifyGrokOverlayShown();
  return undefined;
});
ipcMain.handle('window:openGrokPopout', () => {
  openGrokPopoutWindow();
});
ipcMain.handle('window:openGrok', () => {
  openGrokPopoutWindow();
});
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize(); });
ipcMain.on('window:close', () => mainWindow?.close());

ipcMain.handle('overlay:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('shell:openExternal', async (_, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('bridge:sendSeek', (_, time) => extensionBridge.sendSeek(time));
ipcMain.handle('bridge:isConnected', () => extensionBridge.isBridgeConnected());
ipcMain.handle('bridge:getStatus', () => ({
  connected: extensionBridge.isBridgeConnected(),
  ...extensionBridge.getListenResult()
}));
ipcMain.handle('app:showToast', (event, message) => {
  event.sender.send('app:toast', message);
});

ipcMain.handle('theme:getColors', (_, themeName) => themeService.getThemeColors(themeName || storage.getTheme()));
ipcMain.handle('theme:getFullTheme', (_, themeName) => themeService.getFullTheme(themeName || storage.getTheme()));
ipcMain.handle('storage:getUICustomization', () => storage.getUICustomization());
ipcMain.handle('storage:setUICustomization', (_, obj) => storage.setUICustomization(obj));
ipcMain.handle('storage:getPreferredDisplayId', () => storage.getPreferredDisplayId());
ipcMain.handle('storage:setPreferredDisplayId', (_, id) => storage.setPreferredDisplayId(id));
ipcMain.handle('storage:getSplashDurationMs', () => storage.getSplashDurationMs());
ipcMain.handle('storage:setSplashDurationMs', (_, ms) => storage.setSplashDurationMs(ms));
ipcMain.handle('storage:getSoundBootEnabled', () => storage.getSoundBootEnabled());
ipcMain.handle('storage:setSoundBootEnabled', (_, on) => storage.setSoundBootEnabled(on));
ipcMain.handle('storage:getSoundExitEnabled', () => storage.getSoundExitEnabled());
ipcMain.handle('storage:setSoundExitEnabled', (_, on) => storage.setSoundExitEnabled(on));

ipcMain.handle('app:reboot', () => {
  app.relaunch();
  app.quit();
});
ipcMain.handle('app:getLogPath', () => logger.getLogPath());
ipcMain.handle('app:getVersion', () => app.getVersion());
function getChangelogSync() {
  try {
    const p = path.join(__dirname, '..', 'changelog.json');
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : data.entries || null;
  } catch {
    return null;
  }
}
ipcMain.handle('app:getChangelog', () => getChangelogSync());
ipcMain.handle('grok:getChangelog', () => getChangelogSync());
ipcMain.handle('grok:openOverlay', () => {
  openOverlayWindow();
  return undefined;
});
ipcMain.handle('app:getExtensionPath', () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'goonopticon-bridge');
  }
  return path.join(app.getAppPath(), 'src/goonopticon-bridge');
});

function setupAutoUpdater(win) {
  if (!app.isPackaged || !win) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (info) => {
      if (win && !win.isDestroyed()) win.webContents.send('app:updateAvailable', { version: info?.version || 'new' });
    });
    autoUpdater.on('update-not-available', () => {
      if (win && !win.isDestroyed()) win.webContents.send('app:updateNotAvailable');
    });
    autoUpdater.on('update-downloaded', () => {
      if (win && !win.isDestroyed()) win.webContents.send('app:updateDownloaded');
    });
    autoUpdater.on('error', (err) => {
      if (win && !win.isDestroyed()) win.webContents.send('app:updateError', { message: err?.message || 'Update check failed' });
    });
  } catch (_) {}
}
ipcMain.handle('app:checkForUpdates', async () => {
  if (!app.isPackaged) return { ok: false, error: 'Not running from installer' };
  try {
    const { autoUpdater } = require('electron-updater');
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || 'Check failed' };
  }
});
ipcMain.handle('app:downloadUpdate', () => {
  if (!app.isPackaged) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.downloadUpdate();
  } catch (_) {}
});
ipcMain.handle('app:quitAndInstall', () => {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.quitAndInstall(false, true);
  } catch (_) {
    app.relaunch();
    app.quit();
  }
});
ipcMain.handle('app:openChromeExtensions', () => {
  shell.openExternal('chrome://extensions');
});
ipcMain.handle('app:getDisplays', () => {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label: d.id === primary.id ? `Display ${i + 1} (primary)` : `Display ${i + 1}`,
    primary: d.id === primary.id
  }));
});
ipcMain.handle('dialog:open', async (_, opts) => {
  const result = await dialog.showOpenDialog(mainWindow || BrowserWindow.getFocusedWindow(), opts);
  return result;
});

ipcMain.handle('storage:getNotes', (_, url) => storage.getNotes(url));
ipcMain.handle('storage:setNotes', (_, url, notes) => storage.setNotes(url, notes));
ipcMain.handle('storage:addNote', (_, url, note) => storage.addNote(url, note));
ipcMain.handle('storage:updateNote', (_, url, noteId, updated) => storage.updateNote(url, noteId, updated));
ipcMain.handle('storage:deleteNote', (_, url, noteId) => storage.deleteNote(url, noteId));
ipcMain.handle('storage:getGroups', (_, url) => storage.getGroups(url));
ipcMain.handle('storage:setGroups', (_, url, groups) => storage.setGroups(url, groups));
ipcMain.handle('storage:addGroup', (_, url, name) => storage.addGroup(url, name));
ipcMain.handle('storage:deleteGroup', (_, url, name) => storage.deleteGroup(url, name));
ipcMain.handle('storage:renameGroup', (_, url, oldName, newName) => storage.renameGroup(url, oldName, newName));
ipcMain.handle('storage:getTheme', () => storage.getTheme());
ipcMain.handle('storage:setTheme', (_, theme) => {
  storage.setTheme(theme);
  try { require('./windows/grokWindow').notifyGrokAppEvent('profileSwitched', { theme }); } catch (_) {}
});
ipcMain.handle('storage:getTagFilter', () => storage.getTagFilter());
ipcMain.handle('storage:setTagFilter', (_, tags) => storage.setTagFilter(tags));
ipcMain.handle('storage:getNoteSearch', () => storage.getNoteSearch());
ipcMain.handle('storage:setNoteSearch', (_, search) => storage.setNoteSearch(search));
ipcMain.handle('storage:getPinnedGroups', () => storage.getPinnedGroups());
ipcMain.handle('storage:setPinnedGroups', (_, groups) => storage.setPinnedGroups(groups));
ipcMain.handle('storage:getNotesLocked', () => storage.getNotesLocked());
ipcMain.handle('storage:setNotesLocked', (_, locked) => storage.setNotesLocked(locked));
ipcMain.handle('storage:getCustomThemePresets', () => storage.getCustomThemePresets());
ipcMain.handle('storage:setCustomThemePresets', (_, presets) => storage.setCustomThemePresets(presets));
ipcMain.handle('storage:getAllNotes', () => storage.getAllNotes());
ipcMain.handle('storage:setAllNotes', (_, allNotes) => storage.setAllNotes(allNotes));
ipcMain.handle('storage:getAllGroups', () => storage.getAllGroups());
ipcMain.handle('storage:setAllGroups', (_, allGroups) => storage.setAllGroups(allGroups));
ipcMain.handle('storage:getRecentUrls', () => storage.getRecentUrls());
ipcMain.handle('storage:addRecentUrl', (_, url) => storage.addRecentUrl(url));
ipcMain.handle('storage:getBridgePort', () => storage.getBridgePort());
ipcMain.handle('storage:setBridgePort', async (_, port) => {
  storage.setBridgePort(port);
  extensionBridge.stopBridge();
  const result = await extensionBridge.startBridge(port);
  if (!result.ok) {
    sendBridgeStatus();
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('app:toast', result.error || 'Bridge failed to start');
    return { ok: false, error: result.error };
  }
  sendBridgeStatus();
  return { ok: true, port: result.port };
});
ipcMain.handle('storage:getCurrentVideoUrl', () => storage.getCurrentVideoUrl());
ipcMain.handle('storage:setCurrentVideoUrl', (_, url) => storage.setCurrentVideoUrl(url));

ipcMain.handle('storage:getVideoNicknames', () => storage.getVideoNicknames());
ipcMain.handle('storage:setVideoNickname', (_, url, nickname) => storage.setVideoNickname(url, nickname));

ipcMain.handle('timecode:getVideoTags', (_, url) => storage.getVideoTags(url));
ipcMain.handle('timecode:setVideoTags', (_, url, tags) => storage.setVideoTags(url, tags));
ipcMain.handle('timecode:getVideoPins', (_, url) => storage.getVideoPins(url));
ipcMain.handle('timecode:setVideoPins', (_, url, pins) => storage.setVideoPins(url, pins));

const videoTitleCache = new Map(); // raw url -> title
function isYouTubeUrl(u) {
  try {
    const urlObj = new URL(u);
    const h = (urlObj.hostname || '').toLowerCase();
    return h.includes('youtube.com') || h.includes('youtu.be');
  } catch {
    return false;
  }
}
function httpsGetJson(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(buf || '{}'));
          } catch {
            resolve({});
          }
        });
      })
      .on('error', () => resolve({}));
  });
}

ipcMain.handle('timecode:getVideoTitle', async (_, url) => {
  const raw = String(url || '');
  if (!raw) return { ok: false, title: '' };
  const cached = videoTitleCache.get(raw);
  if (cached) return { ok: true, title: cached };

  if (!isYouTubeUrl(raw)) {
    try {
      const u = new URL(raw);
      const p = (u.pathname || '').replace(/\/+$/, '');
      const last = p.split('/').filter(Boolean).pop();
      const title = last ? decodeURIComponent(last) : u.hostname;
      videoTitleCache.set(raw, title);
      return { ok: true, title };
    } catch {
      return { ok: false, title: '' };
    }
  }

  const oembedUrl = 'https://www.youtube.com/oembed?url=' + encodeURIComponent(raw) + '&format=json&maxwidth=320';
  const j = await httpsGetJson(oembedUrl);
  const title = typeof j?.title === 'string' ? j.title : '';
  if (title) videoTitleCache.set(raw, title);
  return { ok: !!title, title: title || '' };
});
ipcMain.handle('storage:getSeenExtensionSetup', () => storage.getSeenExtensionSetup());
  ipcMain.handle('storage:setSeenExtensionSetup', (_, seen) => storage.setSeenExtensionSetup(seen));
  ipcMain.handle('storage:getSeenPillChoice', () => storage.getSeenPillChoice());
  ipcMain.handle('storage:setSeenPillChoice', (_, seen) => storage.setSeenPillChoice(seen));
ipcMain.handle('storage:getVirusPopupEnabled', () => storage.getVirusPopupEnabled());
ipcMain.handle('storage:setVirusPopupEnabled', (_, on) => {
  storage.setVirusPopupEnabled(on);
  if (!on && virusPopupTimer) {
    clearTimeout(virusPopupTimer);
    virusPopupTimer = null;
  } else {
    scheduleVirusPopup();
  }
});
ipcMain.handle('storage:getVirusVideoFolder', () => getEffectiveVirusVideoFolder());
ipcMain.handle('storage:setVirusVideoFolder', (_, path) => {
  storage.setVirusVideoFolder(path);
  scheduleVirusPopup();
});
ipcMain.handle('storage:getGrokEnabled', () => storage.getGrokEnabled());
ipcMain.handle('storage:setGrokEnabled', (_, on) => {
  storage.setGrokEnabled(on);
  refreshTrayMenu();
});
ipcMain.handle('storage:getGrokRoastMode', () => storage.getGrokRoastMode());
ipcMain.handle('storage:setGrokRoastMode', (_, on) => storage.setGrokRoastMode(on));
ipcMain.handle('storage:getGrokTrollMode', () => storage.getGrokTrollMode());
ipcMain.handle('storage:setGrokTrollMode', (_, on) => storage.setGrokTrollMode(on));
ipcMain.handle('storage:getGrokAlwaysOnTop', () => storage.getGrokAlwaysOnTop());
ipcMain.handle('storage:setGrokAlwaysOnTop', (_, on) => storage.setGrokAlwaysOnTop(on));
ipcMain.handle('storage:getGrokVolume', () => storage.getGrokVolume());
ipcMain.handle('storage:setGrokVolume', (_, v) => storage.setGrokVolume(v));
ipcMain.handle('storage:getGrokRandomIntervalMin', () => storage.getGrokRandomIntervalMin());
ipcMain.handle('storage:setGrokRandomIntervalMin', (_, ms) => storage.setGrokRandomIntervalMin(ms));
ipcMain.handle('storage:getGrokRandomIntervalMax', () => storage.getGrokRandomIntervalMax());
ipcMain.handle('storage:setGrokRandomIntervalMax', (_, ms) => storage.setGrokRandomIntervalMax(ms));
ipcMain.handle('storage:getGrokCategoryToggles', () => storage.getGrokCategoryToggles());
ipcMain.handle('storage:setGrokCategoryToggles', (_, obj) => storage.setGrokCategoryToggles(obj));
ipcMain.handle('storage:getGrokClickCount', () => storage.getGrokClickCount());
ipcMain.handle('storage:setGrokClickCount', (_, n) => storage.setGrokClickCount(n));
ipcMain.handle('storage:getGrokFirstOpenDone', () => storage.getGrokFirstOpenDone());
ipcMain.handle('storage:setGrokFirstOpenDone', (_, done) => storage.setGrokFirstOpenDone(done));
ipcMain.handle('storage:getGrokTheme', () => storage.getGrokTheme());
  ipcMain.handle('storage:setGrokTheme', (_, theme) => storage.setGrokTheme(theme));
  ipcMain.handle('storage:getDevLogVisible', () => storage.getDevLogVisible());
  ipcMain.handle('storage:setDevLogVisible', (_, on) => storage.setDevLogVisible(on));
  ipcMain.handle('storage:getYouTubeChatApiKey', () => storage.getYouTubeChatApiKey());
  ipcMain.handle('storage:setYouTubeChatApiKey', (_, key) => {
    storage.setYouTubeChatApiKey(key);
    try {
      podawfulFeedAlert.restartPodawfulFeedAlertPolling();
    } catch (_) {}
  });
ipcMain.handle('storage:getDiscordBotToken', () => storage.getDiscordBotToken());
ipcMain.handle('storage:setDiscordBotToken', (_, token) => {
  storage.setDiscordBotToken(token);
  try {
    if (chatService && typeof chatService.setAddedStreams === 'function') chatService.setAddedStreams(storage.getChatAddedStreams());
  } catch (_) {}
  return { ok: true };
});
ipcMain.handle('storage:getCommandCenterYouTubeChannel', () => storage.getCommandCenterYouTubeChannel());
ipcMain.handle('storage:setCommandCenterYouTubeChannel', (_, url) => {
  storage.setCommandCenterYouTubeChannel(url);
  podawfulFeedAlert.restartPodawfulFeedAlertPolling();
});
ipcMain.handle('storage:getPodawfulFeedAlertEnabled', () => storage.getPodawfulFeedAlertEnabled());
ipcMain.handle('storage:setPodawfulFeedAlertEnabled', (_, on) => {
  storage.setPodawfulFeedAlertEnabled(on);
  podawfulFeedAlert.restartPodawfulFeedAlertPolling();
});
ipcMain.handle('storage:getPodawfulFeedAlertPollMs', () => storage.getPodawfulFeedAlertPollMs());
ipcMain.handle('storage:setPodawfulFeedAlertPollMs', (_, ms) => {
  storage.setPodawfulFeedAlertPollMs(ms);
  podawfulFeedAlert.restartPodawfulFeedAlertPolling();
  podawfulTweetAlert.restartPodawfulTweetAlertPolling();
});
ipcMain.handle('podawfulFeed:testCrt', () => {
  openPodawfulCrtWindow({
    kind: 'video',
    videoId: 'dQw4w9WgXcQ',
    title: 'CRT test pattern'
  });
  return undefined;
});
ipcMain.handle('podawfulFeed:runCheckNow', async () => {
  await podawfulFeedAlert.runPoll();
  return { ok: true };
});
ipcMain.handle('storage:getPodawfulTweetAlertEnabled', () => storage.getPodawfulTweetAlertEnabled());
ipcMain.handle('storage:setPodawfulTweetAlertEnabled', (_, on) => {
  storage.setPodawfulTweetAlertEnabled(on);
  podawfulTweetAlert.restartPodawfulTweetAlertPolling();
});
ipcMain.handle('podawfulTweet:testPopup', async () => {
  const list = await podawfulTweets.fetchLatestTweets({ limit: 1, oembedFirst: true });
  const t = list[0];
  if (!t?.id) return { ok: false, error: 'No tweet id from scraper' };
  openPodawfulTweetPopupWindow({
    id: t.id,
    link: t.link,
    xUrl: `https://x.com/podawful/status/${t.id}`,
    text: (t.text || '').trim() || 'Preview — oEmbed text unavailable'
  });
  return { ok: true };
});
ipcMain.handle('podawfulTweet:runCheckNow', async () => {
  await podawfulTweetAlert.runTweetPoll();
  return { ok: true };
});
ipcMain.handle('podawfulFeed:demoFullAlert', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('podawfulFeed:screenEffects');
  }
  try {
    const n = new Notification({
      title: '[DEMO] Pod Awful feed',
      body: 'Full video alert — shake, notification, CRT + alarm'
    });
    n.show();
  } catch (_) {}
  openPodawfulCrtWindow({
    kind: 'video',
    videoId: 'dQw4w9WgXcQ',
    title: '[DEMO] New video'
  });
  return undefined;
});
ipcMain.handle('podawfulTweet:demoFullAlert', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('podawfulTweet:screenEffects');
  }
  try {
    const n = new Notification({
      title: '[DEMO] @podawful',
      body: 'Full tweet alert — pulse, notification, popup + chime'
    });
    n.show();
  } catch (_) {}
  const list = await podawfulTweets.fetchLatestTweets({ limit: 1, oembedFirst: true });
  const t = list[0];
  const sampleId = '2038439282436640840';
  const id = t?.id || sampleId;
  openPodawfulTweetPopupWindow({
    id,
    link: t?.link || `https://x.com/podawful/status/${id}`,
    xUrl: `https://x.com/podawful/status/${id}`,
    text: (t?.text || '').trim() || '[DEMO] No fresh scrape text — showing sample / latest id'
  });
  return { ok: true };
});

// Chat (unified livestream)
let chatService = null;

function checkNukeMessage(payload) {
  const list = storage.getChatNukePhrases();
  if (!list.length) return null;
  const msg = String(payload.message || '');
  for (const item of list) {
    const phrase = item && item.phrase;
    if (phrase == null) continue;
    let match = false;
    try {
      if (item.isRegex) {
        const re = new RegExp(phrase, 'i');
        match = re.test(msg);
      } else {
        match = msg.toLowerCase().includes(String(phrase).toLowerCase());
      }
    } catch (_) { continue; }
    if (match) return { action: item.action || 'hide', timeoutSeconds: item.timeoutSeconds || 600 };
  }
  return null;
}

const recentChatDedupe = new Map(); // sig -> timestamp
const CHAT_DEDUPE_MS = 4000;
const CHAT_DEDUPE_PRUNE = 500;

function applyIncomingChatMessage(payload) {
  if (!storage.isIncomingChatPlatformAllowed(payload.platformId)) return;
  const nuke = checkNukeMessage(payload);
  if (nuke) {
    if (nuke.action === 'timeout' && nuke.timeoutSeconds) {
      const platformActions = require('./services/platformActions');
      platformActions.timeoutUser(payload.platformId, payload.username, nuke.timeoutSeconds, payload.channelId ? { channelId: payload.channelId } : {}).catch(() => {});
    }
    return;
  }
  const sig = (payload.platformId || '') + '|' + (payload.username || '') + '|' + (payload.message ?? '');
  const now = Date.now();
  const seen = recentChatDedupe.get(sig);
  if (seen != null && now - seen < CHAT_DEDUPE_MS) return;
  recentChatDedupe.set(sig, now);
  if (recentChatDedupe.size > CHAT_DEDUPE_PRUNE) {
    const cutoff = now - CHAT_DEDUPE_MS;
    for (const [k, t] of recentChatDedupe.entries()) {
      if (t < cutoff) recentChatDedupe.delete(k);
    }
  }
  storage.appendChatLogMessage(payload);
  storage.appendChatUserMessage(payload.platformId, payload.username, payload.message);
  if (payload.donationAmount != null && payload.donationAmount !== '') {
    storage.appendDonation(payload.platformId, payload.username, payload.donationAmount, payload.donationCurrency || 'USD', payload.message);
  }
  const wins = BrowserWindow.getAllWindows();
  for (const win of wins) {
    if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      try { win.webContents.send('chat:message', payload); } catch (_) {}
    }
  }
  try { embedServer.broadcast(payload); } catch (_) {}
}

function injectEmbedChatMessage(text, username) {
  const commands = storage.getChatCustomCommands();
  const trimmed = String(text || '').trim();
  const resolved = (commands[trimmed] != null ? String(commands[trimmed]) : trimmed).trim();
  const payload = {
    platformId: 'embed',
    platformName: 'Website',
    username: (typeof username === 'string' && username.trim()) ? username.trim().slice(0, 64) : 'Viewer',
    message: resolved,
    timestamp: Date.now()
  };
  if (!payload.message) return;
  applyIncomingChatMessage(payload);
}
ipcMain.handle('chat:sendTestMessage', () => {
    const tests = [
      { platformId: 'twitch', platformName: 'Twitch', username: 'Test', message: '[Test] Twitch pipeline OK.' },
      { platformId: 'kick', platformName: 'Kick', username: 'Test', message: '[Test] Kick pipeline OK.' },
      { platformId: 'youtube', platformName: 'YouTube', username: 'Test', message: '[Test] YouTube pipeline OK.' },
      { platformId: 'odysee', platformName: 'Odysee', username: 'Test', message: '[Test] Odysee pipeline OK.' },
      { platformId: 'rumble', platformName: 'Rumble', username: 'Test', message: '[Test] Rumble pipeline OK.' },
      { platformId: 'embed', platformName: 'Test', username: 'Goonopticon', message: 'If you see all platforms above, the pipeline works. Real messages appear when streams are live and connected (30–60 sec after opening Chat).' }
    ];
    tests.forEach((p) => applyIncomingChatMessage(p));
    return Promise.resolve({ ok: true });
  });
ipcMain.handle('chat:getAddedStreams', () => storage.getChatAddedStreams());
ipcMain.handle('chat:setAddedStreams', (_, ids) => {
  storage.setChatAddedStreams(Array.isArray(ids) ? ids : []);
  if (chatService && typeof chatService.setAddedStreams === 'function') chatService.setAddedStreams(storage.getChatAddedStreams());
  for (const win of BrowserWindow.getAllWindows()) {
    if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      try { win.webContents.send('chat:streamsChanged'); } catch (_) {}
    }
  }
});
ipcMain.handle('chat:getChatLog', () => storage.getChatLog());
ipcMain.handle('chat:appendMessage', (_, entry) => {
  if (entry && entry.message != null) {
    storage.appendChatLogMessage(entry);
    storage.appendChatUserMessage(entry.platformId, entry.username, entry.message);
    if (entry.donationAmount != null && entry.donationAmount !== '') {
      storage.appendDonation(entry.platformId, entry.username, entry.donationAmount, entry.donationCurrency || 'USD', entry.message);
    }
  }
});
ipcMain.handle('chat:getUserHistory', (_, platformId, username) => storage.getChatUserHistory(platformId, username));
ipcMain.handle('chat:getDonationsForUser', (_, platformId, username) => storage.getDonationsForUserOrIdentity(platformId, username));
ipcMain.handle('chat:ensureIdentity', (_, platformId, username) => storage.ensureIdentityForUser(platformId, username));
ipcMain.handle('chat:getIdentity', (_, identityId) => storage.getIdentity(identityId));
ipcMain.handle('chat:setIdentity', (_, identityId, data) => storage.setIdentity(identityId, data));
ipcMain.handle('chat:linkUserToIdentity', (_, platformId, username, identityId) => storage.linkUserToIdentity(platformId, username, identityId));
ipcMain.handle('chat:unlinkUser', (_, platformId, username) => storage.unlinkUser(platformId, username));
ipcMain.handle('chat:getIdentityIdForUser', (_, platformId, username) => storage.getIdentityIdForUser(platformId, username));
ipcMain.handle('chat:getLinkedAccounts', (_, identityId) => storage.getLinkedAccounts(identityId));
ipcMain.handle('chat:getIdentityLinks', () => storage.getIdentityLinks());
ipcMain.handle('chat:getIdentities', () => storage.getIdentities());
ipcMain.handle('chat:getChatUnifiedEnabled', () => storage.getChatUnifiedEnabled());
ipcMain.handle('chat:setChatUnifiedEnabled', (_, enabled) => {
  storage.setChatUnifiedEnabled(!!enabled);
  if (chatService && typeof chatService.setAddedStreams === 'function') chatService.setAddedStreams(storage.getChatAddedStreams());
});
ipcMain.handle('chat:getEmbedEnabled', () => storage.getChatEmbedEnabled());
ipcMain.handle('chat:setEmbedEnabled', (_, enabled) => {
  storage.setChatEmbedEnabled(enabled);
  if (enabled) {
    try { embedServer.stop(); } catch (_) {}
    const emotesPath = path.join(__dirname, '..', 'emotes');
    embedServer.start(
      storage.getChatEmbedPort(),
      () => storage.getChatLog(),
      (text, username) => injectEmbedChatMessage(text, username),
      emotesPath
    );
  } else {
    embedServer.stop();
  }
});
ipcMain.handle('chat:getEmbedPort', () => storage.getChatEmbedPort());
ipcMain.handle('chat:setEmbedPort', (_, port) => {
  storage.setChatEmbedPort(port);
  if (embedServer.isRunning() && storage.getChatEmbedEnabled()) {
    embedServer.stop();
    const emotesPath = path.join(__dirname, '..', 'emotes');
    embedServer.start(
      storage.getChatEmbedPort(),
      () => storage.getChatLog(),
      (text, username) => injectEmbedChatMessage(text, username),
      emotesPath
    );
  }
});
ipcMain.handle('chat:getEmbedUrl', () => {
  const port = storage.getChatEmbedPort();
  return `http://localhost:${port}`;
});
ipcMain.handle('chat:getFilterPlatformEmotes', () => storage.getChatFilterPlatformEmotes());
ipcMain.handle('chat:setFilterPlatformEmotes', (_, enabled) => storage.setChatFilterPlatformEmotes(enabled));
ipcMain.handle('chat:getPlatformEmoteBlocklist', () => storage.getChatPlatformEmoteBlocklist());
ipcMain.handle('chat:setPlatformEmoteBlocklist', (_, list) => storage.setChatPlatformEmoteBlocklist(Array.isArray(list) ? list : []));
ipcMain.handle('chat:getFontScale', () => storage.getChatFontScale());
ipcMain.handle('chat:setFontScale', (_, scale) => storage.setChatFontScale(scale));
ipcMain.handle('chat:getPlatformLabelMode', () => storage.getChatPlatformLabelMode());
ipcMain.handle('chat:setPlatformLabelMode', (_, mode) => {
  storage.setChatPlatformLabelMode(mode);
});
ipcMain.handle('chat:getPlatformFilter', () => storage.getChatPlatformFilter());
ipcMain.handle('chat:setPlatformFilter', (_, id) => storage.setChatPlatformFilter(id));
ipcMain.handle('chat:getNukePhrases', () => storage.getChatNukePhrases());
ipcMain.handle('chat:setNukePhrases', (_, list) => storage.setChatNukePhrases(Array.isArray(list) ? list : []));
ipcMain.handle('chat:getCustomCommands', () => storage.getChatCustomCommands());
ipcMain.handle('chat:setCustomCommands', (_, obj) => storage.setChatCustomCommands(obj && typeof obj === 'object' ? obj : {}));
ipcMain.handle('chat:getCinemaPlatform', () => storage.getChatCinemaPlatform());
ipcMain.handle('chat:setCinemaPlatform', (_, id) => storage.setChatCinemaPlatform(id));
ipcMain.handle('chat:getCinemaYouTubeVideoId', () => storage.getChatCinemaYouTubeVideoId());
  ipcMain.handle('chat:setCinemaYouTubeVideoId', (_, id) => storage.setChatCinemaYouTubeVideoId(id));
  ipcMain.handle('chat:getHighlightKeywords', () => storage.getChatHighlightKeywords());
  ipcMain.handle('chat:setHighlightKeywords', (_, list) => storage.setChatHighlightKeywords(Array.isArray(list) ? list : []));
  ipcMain.handle('chat:getPinnedMessage', () => storage.getChatPinnedMessage());
  ipcMain.handle('chat:setPinnedMessage', (_, pinned) => storage.setChatPinnedMessage(pinned));
  ipcMain.handle('chat:getWhisperConversation', (_, peerKey) => storage.getWhisperConversation(peerKey));
  ipcMain.handle('chat:appendWhisper', (_, peerKey, fromMe, text) => storage.appendWhisper(peerKey, fromMe, text));
  ipcMain.handle('chat:getWhisperPeerKeys', () => storage.getWhisperPeerKeys());
  ipcMain.handle('chat:getEmoteList', () => {
  const emotesDir = path.join(__dirname, '..', 'emotes');
  try {
    if (!fs.existsSync(emotesDir) || !fs.statSync(emotesDir).isDirectory()) return [];
    return fs.readdirSync(emotesDir)
      .filter((f) => f.toLowerCase().endsWith('.png'))
      .map((f) => path.basename(f, '.png'));
  } catch (_) {
    return [];
  }
});
ipcMain.handle('chat:sendMessage', (_, text) => {
  if (chatService && typeof chatService.sendMessage === 'function') return chatService.sendMessage(text);
  return Promise.resolve({ ok: false, error: 'Sending requires signing in to a platform; support coming soon.' });
});
ipcMain.handle('storage:getPlatformAuth', (_, platformId) => storage.getPlatformAuth(platformId));
ipcMain.handle('storage:setPlatformAuth', (_, platformId, data) => storage.setPlatformAuth(platformId, data));
const platformActions = require('./services/platformActions');
function logModeration(platformId, username, action, extra) {
  try {
    storage.appendChatModerationEvent({
      platformId,
      username,
      action,
      durationSeconds: extra && extra.durationSeconds,
      reason: extra && extra.reason != null ? String(extra.reason).slice(0, 500) : '',
      success: extra ? extra.success !== false : true,
      error: extra && extra.error != null ? String(extra.error).slice(0, 500) : ''
    });
  } catch (_) {}
}
ipcMain.handle('chat:timeoutUser', async (_, platformId, username, durationSeconds, opts) => {
    const scraperOnly = ['rumble', 'podawful'].includes(platformId);
    const reason = (opts && opts.reason != null) ? String(opts.reason) : '';
    let r;
    if (scraperOnly) {
      const chatScraper = require('./services/chatScraper');
      r = await chatScraper.runPlatformAction(platformId, 'timeout', { username, durationSeconds, ...(opts || {}) });
    } else {
      r = await platformActions.timeoutUser(platformId, username, durationSeconds, opts);
    }
    logModeration(platformId, username, 'timeout', { durationSeconds, reason, success: !!r.ok, error: r.ok ? '' : (r.error || '') });
    return r;
  });
ipcMain.handle('chat:banUser', async (_, platformId, username, opts) => {
    const scraperOnly = ['rumble', 'podawful'].includes(platformId);
    const reason = (opts && opts.reason != null) ? String(opts.reason) : '';
    let r;
    if (scraperOnly) {
      const chatScraper = require('./services/chatScraper');
      r = await chatScraper.runPlatformAction(platformId, 'ban', { username, ...(opts || {}) });
    } else {
      r = await platformActions.banUser(platformId, username, opts);
    }
    logModeration(platformId, username, 'ban', { reason, success: !!r.ok, error: r.ok ? '' : (r.error || '') });
    return r;
  });
ipcMain.handle('chat:unbanUser', async (_, platformId, username, opts) => {
    const reason = (opts && opts.reason != null) ? String(opts.reason) : '';
    let r;
    if (platformId === 'embed') {
      r = embedServer.unbanByUsername(username);
    } else {
      const scraperOnly = ['rumble', 'podawful'].includes(platformId);
      if (scraperOnly) {
        const chatScraper = require('./services/chatScraper');
        r = await chatScraper.runPlatformAction(platformId, 'unban', { username, ...(opts || {}) });
      } else {
        r = await platformActions.unbanUser(platformId, username, opts);
      }
    }
    logModeration(platformId, username, 'unban', { reason, success: !!r.ok, error: r.ok ? '' : (r.error || '') });
    return r;
  });
ipcMain.handle('chat:getModerationHistory', (_, platformId, username) => storage.getChatModerationHistory(platformId, username));
ipcMain.handle('chat:addMod', (_, platformId, username) => platformActions.addMod(platformId, username));
ipcMain.handle('chat:createPoll', async (_, platformId, title, choices, durationSeconds) => {
    const scraperOnly = ['rumble', 'podawful'].includes(platformId);
    if (scraperOnly) {
      const chatScraper = require('./services/chatScraper');
      return chatScraper.runPlatformAction(platformId, 'createPoll', { title, options: choices, durationSeconds });
    }
    return platformActions.createPoll(platformId, title, choices, durationSeconds);
  });
  ipcMain.handle('chat:createEmbedPoll', (_, question, options, durationSeconds) => {
    const ok = embedServer.setEmbedPoll(question, options, durationSeconds);
    return Promise.resolve({ ok });
  });
  ipcMain.handle('chat:getEmbedPoll', () => {
    const state = storage.getEmbedChatState();
    return Promise.resolve(state?.poll || null);
  });
  ipcMain.handle('chat:clearEmbedPoll', () => {
    embedServer.clearEmbedPoll();
    return Promise.resolve({ ok: true });
  });
  ipcMain.handle('chat:getViewerCounts', async () => {
    const counts = await platformActions.getViewerCounts();
    let chatScraper = null;
    try { chatScraper = require('./services/chatScraper'); } catch (_) {}
    if (chatScraper && typeof chatScraper.getScrapedViewerCounts === 'function') {
      const scraped = chatScraper.getScrapedViewerCounts();
      for (const [platform, n] of Object.entries(scraped)) {
        if (typeof n !== 'number' || n < 0 || !platform) continue;
        const api = counts[platform] || 0;
        counts[platform] = Math.max(api, n);
      }
    }
    const embed = embedServer.getClientCount ? embedServer.getClientCount() : 0;
    const total =
      (counts.twitch || 0) +
      (counts.kick || 0) +
      (counts.youtube || 0) +
      (counts.rumble || 0) +
      (counts.podawful || 0) +
      (counts.odysee || 0) +
      (counts.dlive || 0) +
      embed;
    return { ...counts, embed, total };
  });
  ipcMain.handle('chat:hasPlatformAuth', (_, platformId) => platformActions.hasAuth(platformId));
const oauthService = require('./services/oauthService');
ipcMain.handle('chat:startOAuth', (_, platformId) => oauthService.runOAuth(platformId));

// Tracker (Gangstalking)
ipcMain.handle('tracker:getPeople', () => storage.getTrackedPeople());
ipcMain.handle('tracker:addPerson', (_, person) => {
  const people = storage.getTrackedPeople();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const normLinks = (raw) =>
    Array.isArray(raw)
      ? raw
          .map((x) => ({ label: String(x?.label || '').trim(), url: String(x?.url || '').trim() }))
          .filter((x) => x.url)
      : [];
  const normSections = (raw) =>
    Array.isArray(raw)
      ? raw
          .map((x) => ({ title: String(x?.title || '').trim(), body: String(x?.body || '') }))
          .filter((x) => x.title || x.body.trim())
      : [];
  const normTabs = (raw) =>
    Array.isArray(raw)
      ? raw
          .map((x) => ({ label: String(x?.label || '').trim(), content: String(x?.content || '') }))
          .filter((x) => x.label || x.content.trim())
      : [];
  const allowedCallout = new Set(['note', 'quote', 'alert']);
  const normCallouts = (raw) =>
    Array.isArray(raw)
      ? raw
          .map((x) => {
            const v = String(x?.variant || 'note').toLowerCase();
            return { variant: allowedCallout.has(v) ? v : 'note', body: String(x?.body || '') };
          })
          .filter((x) => x.body.trim())
      : [];
  const entry = {
    id,
    name: person.name || 'Unknown',
    youtubeUrl: person.youtubeUrl || '',
    twitterHandle: person.twitterHandle || '',
    facebookUrl: person.facebookUrl || '',
    avatarPath: person.avatarPath || null,
    akas: typeof person.akas === 'string' ? person.akas : '',
    bio: typeof person.bio === 'string' ? person.bio : '',
    references: typeof person.references === 'string' ? person.references : '',
    dateOfBirth: typeof person.dateOfBirth === 'string' ? person.dateOfBirth : '',
    dateDiscovered: typeof person.dateDiscovered === 'string' ? person.dateDiscovered : '',
    dateOfDeath: typeof person.dateOfDeath === 'string' ? person.dateOfDeath : '',
    customLinks: normLinks(person.customLinks),
    wikiSections: normSections(person.wikiSections),
    wikiTabs: normTabs(person.wikiTabs),
    wikiCallouts: normCallouts(person.wikiCallouts),
    addedAt: new Date().toISOString()
  };
  goonipediaFolder.syncTrackedPersonToFolder(entry);
  people.push(entry);
  storage.setTrackedPeople(people);
  return entry;
});
ipcMain.handle('tracker:updatePerson', (_, id, updates) => {
  const people = storage.getTrackedPeople();
  const i = people.findIndex((p) => p.id === id);
  if (i === -1) return null;
  people[i] = { ...people[i], ...updates };
  goonipediaFolder.syncTrackedPersonToFolder(people[i]);
  storage.setTrackedPeople(people);
  return people[i];
});
ipcMain.handle('tracker:deletePerson', (_, id) => {
  goonipediaFolder.removeEntryFolderById(id);
  const people = storage.getTrackedPeople().filter((p) => p.id !== id);
  storage.setTrackedPeople(people);
  return true;
});
ipcMain.handle('tracker:getAvatarDataUrl', (_, avatarPath) => {
  if (!avatarPath || typeof avatarPath !== 'string') return null;
  try {
    if (!fs.existsSync(avatarPath) || !fs.statSync(avatarPath).isFile()) return null;
    const buf = fs.readFileSync(avatarPath);
    const base64 = buf.toString('base64');
    const ext = path.extname(avatarPath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : 'image/png';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
});
ipcMain.handle('tracker:fetchYouTubeFeed', (_, url) =>
  youtubeFeed.fetchFeedForUrl(url, { apiKey: storage.getYouTubeChatApiKey() })
);

ipcMain.handle('tracker:fetchXTweets', (_, handle) => xTweets.fetchLatestXTweets({ handle, limit: 10 }));

// Command Center (podawful socials + merch)
ipcMain.handle('command-center:podawfulTweets', () =>
  podawfulTweets.fetchLatestTweets({ limit: 12, oembedFirst: true, oembedCount: 5 })
);
ipcMain.handle('command-center:podawfulMerch', () => podawfulMerch.fetchLatestMerch());

// Music
ipcMain.handle('music:getFolder', () => getEffectiveMusicFolder());
ipcMain.handle('music:setFolder', (_, folderPath) => {
  storage.setMusicFolder(folderPath);
  return folderPath;
});
const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.m4v', '.mov']);

function getVideoFilesInDir(dirPath) {
  try {
    const names = fs.readdirSync(dirPath);
    return names
      .filter((n) => VIDEO_EXT.has(path.extname(n).toLowerCase()))
      .map((n) => ({ name: n, path: path.join(dirPath, n) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
function getAudioFilesInDir(dirPath) {
  try {
    const names = fs.readdirSync(dirPath);
    return names
      .filter((n) => AUDIO_EXT.has(path.extname(n).toLowerCase()))
      .map((n) => ({ name: n, path: path.join(dirPath, n) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
ipcMain.handle('music:getTrackList', (_, folderPath) => {
  if (!folderPath || typeof folderPath !== 'string') return [];
  try {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) return [];
    return getAudioFilesInDir(folderPath);
  } catch {
    return [];
  }
});
ipcMain.handle('music:getFolderStructure', (_, folderPath) => {
  if (!folderPath || typeof folderPath !== 'string') return { root: folderPath, tabs: [], rootTracks: [] };
  try {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) return { root: folderPath, tabs: [], rootTracks: [] };
    const rootTracks = getAudioFilesInDir(folderPath);
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const tabs = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const subPath = path.join(folderPath, e.name);
      const tracks = getAudioFilesInDir(subPath);
      tabs.push({ name: e.name, path: subPath, tracks });
    }
    tabs.sort((a, b) => a.name.localeCompare(b.name));
    return { root: folderPath, tabs, rootTracks };
  } catch {
    return { root: folderPath, tabs: [], rootTracks: [] };
  }
});
ipcMain.handle('music:getFileUrl', (_, filePath) => {
  if (!filePath || typeof filePath !== 'string') return null;
  const musicFolder = getEffectiveMusicFolder();
  if (!musicFolder) return null;
  try {
    const resolved = path.normalize(path.resolve(filePath));
    if (!isPathUnderFolder(resolved, musicFolder)) return null;
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
    return 'goonopticon-music://' + encodeURIComponent(resolved);
  } catch {
    return null;
  }
});
const MIME_BY_EXT = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac', '.webm': 'audio/webm' };
ipcMain.handle('music:readFile', (_, filePath) => {
  if (!filePath || typeof filePath !== 'string') return null;
  const musicFolder = getEffectiveMusicFolder();
  if (!musicFolder) return null;
  try {
    const resolved = path.normalize(path.resolve(filePath));
    if (!isPathUnderFolder(resolved, musicFolder)) return null;
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
    const buf = fs.readFileSync(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME_BY_EXT[ext] || 'audio/mpeg';
    const copy = new Uint8Array(buf.length);
    copy.set(buf);
    return { buffer: copy.buffer, mime };
  } catch (e) {
    logger.warn('Music readFile failed', { filePath, message: e?.message });
    return null;
  }
});

// Video (uses virus video folder setting)
const VIDEO_MIME_BY_EXT = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/x-m4v' };
ipcMain.handle('video:getFolder', () => DEFAULT_VIDEO_FOLDER);
ipcMain.handle('video:getList', (_, folderPath) => {
  if (!folderPath || typeof folderPath !== 'string') return [];
  try {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) return [];
    return getVideoFilesInDir(folderPath);
  } catch {
    return [];
  }
});
ipcMain.handle('video:readFile', (_, filePath) => {
  if (!filePath || typeof filePath !== 'string') return null;
  const videoFolder = DEFAULT_VIDEO_FOLDER;
  if (!videoFolder) return null;
  try {
    const resolved = path.normalize(path.resolve(filePath));
    if (!isPathUnderFolder(resolved, videoFolder)) return null;
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
    const buf = fs.readFileSync(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const mime = VIDEO_MIME_BY_EXT[ext] || 'video/mp4';
    const copy = new Uint8Array(buf.length);
    copy.set(buf);
    return { buffer: copy.buffer, mime };
  } catch (e) {
    logger.warn('Video readFile failed', { filePath, message: e?.message });
    return null;
  }
});
