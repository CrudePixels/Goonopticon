const fs = require('fs');
const path = require('path');

const SPLASH_DIR = path.join(__dirname, '../../splash');
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

module.exports = { getRandomSplash, getLoadingLines };
