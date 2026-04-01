const { BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { getAppIconPath } = require('../utils/iconPath');

const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v']);
const SOUND_EXT = new Set(['.wav', '.mp3', '.ogg', '.m4a']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);
const VIRUS_TXT = path.join(__dirname, '../../splash/virus.txt');
const NOID_DIR = path.join(__dirname, '../../noid');

function getVideoFiles(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return [];
  const names = fs.readdirSync(folderPath, { withFileTypes: true });
  return names
    .filter((d) => d.isFile() && VIDEO_EXT.has(path.extname(d.name).toLowerCase()))
    .map((d) => path.join(folderPath, d.name));
}

function getRandomVideoFile(folderPath) {
  const files = getVideoFiles(folderPath);
  return files.length === 0 ? null : files[Math.floor(Math.random() * files.length)];
}

function loadVirusLines() {
  try {
    if (!fs.existsSync(VIRUS_TXT)) return [];
    const raw = fs.readFileSync(VIRUS_TXT, 'utf8');
    return raw.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#'));
  } catch {
    return ['CRITICAL THREAT DETECTED', 'DO NOT CLOSE THIS WINDOW'];
  }
}

function getClickheadUrl() {
  const candidates = [
    path.join(__dirname, '../../renderer/clickhead.png'),
    path.join(__dirname, '../../sprites/clickhead.png')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return pathToFileURL(p).href;
  }
  return null;
}

function getRandomSoundUrl(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return null;
  const names = fs.readdirSync(folderPath, { withFileTypes: true });
  const files = names
    .filter((d) => d.isFile() && SOUND_EXT.has(path.extname(d.name).toLowerCase()))
    .map((d) => path.join(folderPath, d.name));
  if (files.length === 0) return null;
  const chosen = files[Math.floor(Math.random() * files.length)];
  return pathToFileURL(chosen).href;
}

function getNoidImagePaths() {
  if (!fs.existsSync(NOID_DIR)) return [];
  const names = fs.readdirSync(NOID_DIR, { withFileTypes: true });
  return names
    .filter((d) => d.isFile() && IMAGE_EXT.has(path.extname(d.name).toLowerCase()))
    .map((d) => path.join(NOID_DIR, d.name));
}

function getRandomNoidImagePath() {
  const files = getNoidImagePaths();
  return files.length === 0 ? null : files[Math.floor(Math.random() * files.length)];
}

let virusWindow = null;
let noidWindows = [];

function openNoidWindow() {
  const imagePath = getRandomNoidImagePath();
  if (!imagePath) return null;
  const iconPath = getAppIconPath();
  const width = 320;
  const height = 320;
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x: dx, y: dy, width: dw, height: dh } = display.workArea;
  const x = dx + Math.floor(Math.random() * Math.max(0, dw - width));
  const y = dy + Math.floor(Math.random() * Math.max(0, dh - height));
  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, '../preloadNoid.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, '../../renderer/noid.html'));
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('noid:setImage', pathToFileURL(imagePath).href);
  });
  win.on('closed', () => {
    noidWindows = noidWindows.filter((w) => w !== win);
  });
  noidWindows.push(win);
  return win;
}

function openVirusPopupWindow(folderPath, onClosed) {
  const videoPath = getRandomVideoFile(folderPath);
  if (!videoPath) return null;

  const iconPath = getAppIconPath();

  virusWindow = new BrowserWindow({
    width: 560,
    height: 440,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, '../preloadVirus.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  virusWindow.loadFile(path.join(__dirname, '../../renderer/virusPopup.html'));

  virusWindow.webContents.once('did-finish-load', () => {
    const { pathToFileURL } = require('url');
    const videoFiles = getVideoFiles(folderPath);
    const videoUrls = videoFiles.map((p) => pathToFileURL(p).href);
    const fileUrl = pathToFileURL(videoPath).href;
    const title = 'Goonopticon Security Breach';
    const virusLines = loadVirusLines();
    const clickheadUrl = getClickheadUrl();
    const soundUrl = getRandomSoundUrl(folderPath);
    virusWindow?.webContents?.send('virus:play', {
      fileUrl,
      title,
      videoUrls,
      virusLines,
      clickheadUrl,
      soundUrl
    });
    if (getNoidImagePaths().length > 0) {
      setTimeout(() => openNoidWindow(), 800);
    }
  });

  virusWindow.on('closed', () => {
    virusWindow = null;
    if (typeof onClosed === 'function') onClosed();
  });

  return virusWindow;
}

const TRICK_EFFECTS = [
  'bigger',
  'volume',
  'clickheads',
  'otherVideo',
  'giantText',
  'spawnWindow',
  'noid',
  'flash',
  'shake'
];
const CLOSE_CHANCE = 0.12;

function registerVirusIPC() {
  ipcMain.on('virus:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.on('virus:tryClose', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    if (Math.random() < CLOSE_CHANCE) {
      win.close();
    } else {
      let effect = TRICK_EFFECTS[Math.floor(Math.random() * TRICK_EFFECTS.length)];
      if (effect === 'noid' && getNoidImagePaths().length === 0) effect = 'shake';
      if (effect === 'bigger') {
        const b = win.getBounds();
        const w = Math.min(960, Math.round(b.width * 1.5));
        const h = Math.min(720, Math.round(b.height * 1.5));
        win.setSize(w, h);
      }
      if (effect === 'noid') openNoidWindow();
      event.sender.send('virus:trick', { effect });
    }
  });

  ipcMain.on('virus:spawnAnother', () => {
    const folder = require('../storage/adapter').getVirusVideoFolder()
      || path.join(__dirname, '../../video');
    openVirusPopupWindow(folder, () => {});
  });

  ipcMain.on('noid:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  const NOID_TRICK_EFFECTS = [
    'swap',
    'bigger',
    'smaller',
    'multiply',
    'flash',
    'glitch',
    'shake'
  ];

  ipcMain.on('noid:tryClose', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;

    const noidImages = getNoidImagePaths();
    if (!noidImages.length) {
      win.close();
      return;
    }

    if (Math.random() < CLOSE_CHANCE) {
      win.close();
      return;
    }

    let effect = NOID_TRICK_EFFECTS[Math.floor(Math.random() * NOID_TRICK_EFFECTS.length)];

    if (effect === 'multiply') {
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) openNoidWindow();
      event.sender.send('noid:trick', { effect });
      return;
    }

    if (effect === 'bigger') {
      const b = win.getBounds();
      const w = Math.min(720, Math.round(b.width * 1.5));
      const h = Math.min(720, Math.round(b.height * 1.5));
      win.setSize(w, h);
      event.sender.send('noid:trick', { effect });
      return;
    }

    if (effect === 'smaller') {
      const b = win.getBounds();
      const w = Math.max(180, Math.round(b.width * 0.75));
      const h = Math.max(180, Math.round(b.height * 0.75));
      win.setSize(w, h);
      event.sender.send('noid:trick', { effect });
      return;
    }

    if (effect === 'swap') {
      const imagePath = getRandomNoidImagePath();
      if (imagePath) {
        event.sender.send('noid:trick', {
          effect: 'swap',
          imageUrl: pathToFileURL(imagePath).href
        });
      } else {
        event.sender.send('noid:trick', { effect: 'shake' });
      }
      return;
    }

    // visual-only effects
    event.sender.send('noid:trick', { effect });
  });
}

module.exports = { openVirusPopupWindow, registerVirusIPC, getVideoFiles };
