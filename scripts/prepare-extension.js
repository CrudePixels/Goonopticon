/**
 * Copies the Goonopticon-Extension repo into src/goonopticon-bridge so the app
 * can run and build. Extension lives at: https://github.com/CrudePixels/Goonopticon-Extension
 * Look for: ./Goonopticon-Extension (same workspace) or ../Goonopticon-Extension (sibling clone).
 */

const fs = require('fs');
const path = require('path');

const appRoot = path.join(__dirname, '..');
const outDir = path.join(appRoot, 'src', 'goonopticon-bridge');

const candidates = [
  path.join(appRoot, 'Goonopticon-Extension'),
  path.join(path.dirname(appRoot), 'Goonopticon-Extension')
];

let sourceDir = null;
for (const dir of candidates) {
  if (fs.existsSync(path.join(dir, 'manifest.json'))) {
    sourceDir = dir;
    break;
  }
}

if (!sourceDir) {
  console.warn(
    'prepare-extension: Goonopticon-Extension not found. Tried:\n  ' +
      candidates.map((d) => path.relative(appRoot, d)).join('\n  ') +
      '\nClone https://github.com/CrudePixels/Goonopticon-Extension into one of these paths, or run from app root with Goonopticon-Extension as sibling.'
  );
  process.exit(0);
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const files = ['manifest.json', 'popup.js', 'popup.html', 'background.js', 'options.js', 'options.html', 'README.md'];
for (const f of files) {
  const src = path.join(sourceDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(outDir, f));
  }
}
console.log('prepare-extension: copied extension from', path.relative(appRoot, sourceDir), '-> src/goonopticon-bridge');
