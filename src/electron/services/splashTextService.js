const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const SPLASH_DIR = path.join(__dirname, '../../splash');
const SPLASH_IMAGES_DIR = path.join(SPLASH_DIR, 'images');
const SPLASH_IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.bmp']);
const QUOTES_FILE = path.join(SPLASH_DIR, 'quotes.txt');
const LOADING_FILE = path.join(SPLASH_DIR, 'loading.txt');

let cachedQuotes = null;
let cachedLoading = null;

function loadQuotes() {
  if (cachedQuotes) return cachedQuotes;
  try {
    const raw = fs.readFileSync(QUOTES_FILE, 'utf8');
    cachedQuotes = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));
  } catch (err) {
    console.error('Failed to load quotes.txt:', err);
    cachedQuotes = ['Henchmen, get to work!', 'Booting surveillance suite...'];
  }
  return cachedQuotes;
}

function loadLoadingLines() {
  if (cachedLoading) return cachedLoading;
  try {
    const raw = fs.readFileSync(LOADING_FILE, 'utf8');
    cachedLoading = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));
  } catch (err) {
    console.error('Failed to load loading.txt:', err);
    cachedLoading = [
      'booting up CRTS',
      'warming Goo',
      'fixing robotron',
      'initializing surveillance suite'
    ];
  }
  return cachedLoading;
}

/** Random line from quotes.txt (footer / one-off splash). */
function getRandomSplash() {
  const lines = loadQuotes();
  if (!lines.length) return 'Goonopticon Desktop';
  const idx = Math.floor(Math.random() * lines.length);
  return lines[idx];
}

/** All loading lines for splash screen cycle. */
function getLoadingLines() {
  return loadLoadingLines();
}

function listSplashImageFiles() {
  try {
    if (!fs.existsSync(SPLASH_IMAGES_DIR)) return [];
    const names = fs.readdirSync(SPLASH_IMAGES_DIR);
    return names
      .filter((f) => SPLASH_IMAGE_EXT.has(path.extname(f).toLowerCase()))
      .map((f) => path.join(SPLASH_IMAGES_DIR, f))
      .filter((abs) => {
        try {
          return fs.statSync(abs).isFile();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

/** Random image from splash/images as file:// URL for <img src> (Electron). */
function getRandomSplashImageUrl() {
  const files = listSplashImageFiles();
  if (!files.length) return null;
  const pick = files[Math.floor(Math.random() * files.length)];
  return pathToFileURL(pick).href;
}

module.exports = { getRandomSplash, getLoadingLines, getRandomSplashImageUrl };
