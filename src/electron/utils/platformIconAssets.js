/**
 * Resolves chat platform logos from src/icons ({id}.png|.svg|.webp), then platform-default.*, then built-in SVG.
 */

const path = require('path');
const fs = require('fs');

const ALLOWED_IDS = new Set(['twitch', 'kick', 'youtube', 'rumble', 'odysee', 'dlive', 'podawful', 'embed', 'discord', 'other']);

const MIME = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

const BUILTIN_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <rect width="16" height="16" rx="3" fill="#141418"/>
  <path d="M3.5 5.5c0-.55.45-1 1-1h7c.55 0 1 .45 1 1v3.5c0 .28-.22.5-.5.5H8l-2 2V9H4c-.28 0-.5-.22-.5-.5V5.5z" stroke="#00c853" stroke-width="1" fill="none"/>
  <circle cx="11" cy="6.5" r="0.65" fill="#00c853"/>
</svg>`;

/** When no PNG/SVG file exists in src/icons — distinct colored badges (not official logos). */
const LETTER_BADGE = {
  twitch: { bg: '#9146ff', fg: '#ffffff', ch: 'T' },
  kick: { bg: '#142214', fg: '#53fc18', ch: 'K' },
  youtube: { bg: '#cc0000', fg: '#ffffff', ch: 'Y' },
  rumble: { bg: '#cc5500', fg: '#ffffff', ch: 'R' },
  odysee: { bg: '#2d4a8c', fg: '#ffffff', ch: 'O' },
  dlive: { bg: '#1a1a1a', fg: '#ffd93d', ch: 'D' },
  podawful: { bg: '#8b1538', fg: '#ffffff', ch: 'P' },
  embed: { bg: '#0ea5e9', fg: '#0a0a0a', ch: 'W' },
  discord: { bg: '#5865f2', fg: '#ffffff', ch: 'D' },
  other: { bg: '#3a3a44', fg: '#e0e0e0', ch: '?' }
};

function letterBadgeSvg(platformId) {
  const b = LETTER_BADGE[platformId] || LETTER_BADGE.other;
  const ch = String(b.ch || '?')
    .slice(0, 1)
    .replace(/[<>&'"]/g, '');
  const bg = b.bg;
  const fg = b.fg;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
  <rect width="16" height="16" rx="3" fill="${bg}"/>
  <text x="8" y="11.5" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="9" font-weight="700" fill="${fg}">${ch}</text>
</svg>`;
}

function getIconsDir() {
  return path.join(__dirname, '..', '..', 'icons');
}

function getPlatformsIconsDir() {
  return path.join(getIconsDir(), 'platforms');
}

function normalizePlatformId(raw) {
  const s = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '');
  if (ALLOWED_IDS.has(s)) return s;
  return 'other';
}

/**
 * @returns {{ kind: 'file', filePath: string, mime: string } | { kind: 'svg', body: string }}
 */
function resolvePlatformIcon(platformId) {
  const id = normalizePlatformId(platformId);
  const dir = path.resolve(getIconsDir());
  const platformsDir = path.resolve(getPlatformsIconsDir());
  if (!dir || !fs.existsSync(dir)) return { kind: 'svg', body: letterBadgeSvg(id) };

  const tryFileInDir = (targetDir, base) => {
    if (!base || /[/\\]/.test(base) || base.includes('..')) return null;
    const root = targetDir + path.sep;
    for (const ext of ['.png', '.svg', '.webp']) {
      const p = path.join(targetDir, base + ext);
      const resolved = path.resolve(p);
      if (!resolved.startsWith(root)) continue;
      try {
        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
          return { kind: 'file', filePath: resolved, mime: MIME[ext] || 'application/octet-stream' };
        }
      } catch (_) {}
    }
    return null;
  };

  // 1) Prefer "src/icons/<id>.*" (legacy)
  const specificRoot = tryFileInDir(dir, id);
  if (specificRoot) return specificRoot;

  // 2) Prefer "src/icons/platforms/<id> icon.*" (matches existing filenames like "twitch icon.png")
  if (platformsDir && fs.existsSync(platformsDir)) {
    const specificPlatforms =
      tryFileInDir(platformsDir, id) ||
      tryFileInDir(platformsDir, id + ' icon') ||
      tryFileInDir(platformsDir, id + '_icon');
    if (specificPlatforms) return specificPlatforms;
  }

  // 3) Fallback: "src/icons/<platform-default>.*" or letter badge.
  if (id === 'other') {
    const def =
      tryFileInDir(dir, 'platform-default') ||
      (platformsDir && fs.existsSync(platformsDir) ? tryFileInDir(platformsDir, 'platform-default') : null);
    if (def) return def;
  }
  return { kind: 'svg', body: letterBadgeSvg(id) };
}

module.exports = {
  getIconsDir,
  normalizePlatformId,
  resolvePlatformIcon,
  BUILTIN_FALLBACK_SVG,
  ALLOWED_IDS
};
