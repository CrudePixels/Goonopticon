/**
 * Removes first-run flags so the app shows the pill choice (and extension setup) again.
 * Run before starting the app: node scripts/reset-first-run.js
 */
const fs = require('fs');
const path = require('path');

const keysToDelete = ['PodAwful::SeenPillChoice', 'PodAwful::SeenExtensionSetup'];
const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
const possibleDirs = [
  path.join(appData, 'goonopticon-desktop'),
  path.join(appData, 'Goonopticon Desktop')
];

let cleared = 0;
for (const dir of possibleDirs) {
  const configPath = path.join(dir, 'config.json');
  if (!fs.existsSync(configPath)) continue;
  try {
    let data = fs.readFileSync(configPath, 'utf8');
    let obj;
    try {
      obj = JSON.parse(data);
    } catch {
      continue;
    }
    let changed = false;
    for (const key of keysToDelete) {
      if (key in obj) {
        delete obj[key];
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(configPath, JSON.stringify(obj, null, 2), 'utf8');
      console.log('Cleared first-run flags in', configPath);
      cleared++;
    }
  } catch (e) {
    console.error('Error updating', configPath, e.message);
  }
}
if (cleared === 0) console.log('No config found to update. Run the app once, then run this script.');
