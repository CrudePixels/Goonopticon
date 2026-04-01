const path = require('path');
const fs = require('fs');

const ICONS_DIR = path.join(__dirname, '../../icons');
const CANDIDATES = ['tray.png', 'icon.png', 'icon.ico'];

function getAppIconPath() {
  for (const name of CANDIDATES) {
    const p = path.join(ICONS_DIR, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

module.exports = { getAppIconPath, ICONS_DIR };
