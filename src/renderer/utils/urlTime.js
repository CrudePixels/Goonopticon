/**
 * Timecode and note ID helpers for renderer (no Node).
 */

function getTimecode(seconds) {
  const s = Math.floor(Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

function parseTime(str) {
  if (!str || typeof str !== 'string') return 0;
  const parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(str) || 0;
}

function generateNoteId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function ensureAbsoluteUrl(url) {
  if (!url || typeof url !== 'string') return url || '';
  const t = url.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return 'https://' + t;
}

function getYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(ensureAbsoluteUrl(url));
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname.includes('youtube.com')) {
      if (u.searchParams.has('v')) return u.searchParams.get('v');
      const m = u.pathname.match(/^\/live\/([^/?]+)/);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

export { getTimecode, parseTime, generateNoteId, getYouTubeVideoId, ensureAbsoluteUrl };
