const fs = require('fs');
const path = require('path');

const distDir = path.join(process.cwd(), 'dist', 'win-unpacked');
if (!fs.existsSync(distDir)) {
  console.error('dist/win-unpacked not found. Run npm run build:exe after a successful build.');
  process.exit(1);
}
const files = fs.readdirSync(distDir);
const exe = files.find((f) => f.endsWith('.exe'));
if (!exe) {
  console.error('No .exe found in win-unpacked');
  process.exit(1);
}
const src = path.join(distDir, exe);
const dest = path.join(process.cwd(), exe);
fs.copyFileSync(src, dest);
console.log('Copied', exe, 'to project root.');
