/**
 * Mirrors each tracked / Goonipedia person to src/goonipedia/<Display name>/entry.json
 * and copies their portrait into that folder under images/ for easy access.
 */
const path = require('path');
const fs = require('fs');

const GOONIPEDIA_ROOT = path.join(__dirname, '..', '..', 'goonipedia');

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

function sanitizeFolderName(name) {
  let s = String(name || '').trim() || 'Unknown';
  s = s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
  s = s.replace(/[. ]+$/g, '');
  return s.slice(0, 120) || 'Unknown';
}

function normalizeDir(p) {
  return path.normalize(path.resolve(p));
}

function isUnderRoot(filePath, root) {
  const resolved = normalizeDir(filePath);
  const base = normalizeDir(root);
  const baseSep = base.endsWith(path.sep) ? base : base + path.sep;
  if (process.platform === 'win32') {
    const r = resolved.toLowerCase();
    const b = base.toLowerCase();
    return r === b || r.startsWith(baseSep.toLowerCase());
  }
  return resolved === base || resolved.startsWith(baseSep);
}

function resolveEntryDir(entry) {
  const base = sanitizeFolderName(entry.name);
  let folderName = base;
  let entryDir = path.join(GOONIPEDIA_ROOT, folderName);
  const jsonPath = path.join(entryDir, 'entry.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (existing && existing.id && existing.id !== entry.id) {
        folderName = `${base} [${entry.id.slice(-6)}]`;
        entryDir = path.join(GOONIPEDIA_ROOT, folderName);
      }
    } catch (_) {}
  }
  return entryDir;
}

function removeOtherFoldersWithSameId(entryId, keepDir) {
  if (!fs.existsSync(GOONIPEDIA_ROOT)) return;
  const keepNorm = normalizeDir(keepDir);
  let dirs;
  try {
    dirs = fs.readdirSync(GOONIPEDIA_ROOT, { withFileTypes: true });
  } catch {
    return;
  }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dir = path.join(GOONIPEDIA_ROOT, d.name);
    if (normalizeDir(dir) === keepNorm) continue;
    const jsonPath = path.join(dir, 'entry.json');
    if (!fs.existsSync(jsonPath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (data && data.id === entryId) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (_) {}
  }
}

/**
 * @param {object} entry - full tracker person object (mutated if avatar is copied)
 */
function syncTrackedPersonToFolder(entry) {
  if (!entry || !entry.id) return;
  try {
    fs.mkdirSync(GOONIPEDIA_ROOT, { recursive: true });
    const entryDir = resolveEntryDir(entry);
    fs.mkdirSync(entryDir, { recursive: true });

    const imagesDir = path.join(entryDir, 'images');
    let avatarPath = entry.avatarPath;

    if (avatarPath && typeof avatarPath === 'string') {
      try {
        if (fs.existsSync(avatarPath) && fs.statSync(avatarPath).isFile()) {
          const alreadyHere = isUnderRoot(avatarPath, entryDir);
          if (!alreadyHere) {
            fs.mkdirSync(imagesDir, { recursive: true });
            let ext = path.extname(avatarPath).toLowerCase();
            if (!IMAGE_EXTS.has(ext)) ext = '.png';
            const dest = path.join(imagesDir, `portrait${ext}`);
            fs.copyFileSync(avatarPath, dest);
            entry.avatarPath = dest;
          }
        }
      } catch (_) {}
    } else {
      if (fs.existsSync(imagesDir)) {
        try {
          fs.rmSync(imagesDir, { recursive: true, force: true });
        } catch (_) {}
      }
    }

    const jsonPath = path.join(entryDir, 'entry.json');
    fs.writeFileSync(jsonPath, JSON.stringify(entry, null, 2), 'utf8');

    removeOtherFoldersWithSameId(entry.id, entryDir);
  } catch (err) {
    console.error('[goonipediaFolder]', err);
  }
}

function removeEntryFolderById(deletedId) {
  if (!deletedId || !fs.existsSync(GOONIPEDIA_ROOT)) return;
  let dirs;
  try {
    dirs = fs.readdirSync(GOONIPEDIA_ROOT, { withFileTypes: true });
  } catch {
    return;
  }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dir = path.join(GOONIPEDIA_ROOT, d.name);
    const jsonPath = path.join(dir, 'entry.json');
    if (!fs.existsSync(jsonPath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (data && data.id === deletedId) {
        fs.rmSync(dir, { recursive: true, force: true });
        return;
      }
    } catch (_) {}
  }
}

function getGoonipediaRoot() {
  return GOONIPEDIA_ROOT;
}

module.exports = {
  syncTrackedPersonToFolder,
  removeEntryFolderById,
  getGoonipediaRoot,
  sanitizeFolderName
};
