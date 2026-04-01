/**
 * Normalizes a YouTube URL by removing timestamp parameters.
 * @param {string} url - The URL to normalize.
 * @returns {string} - The normalized URL.
 */
function normalizeYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return url || '';
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
      return url;
    }
    urlObj.searchParams.delete('t');
    urlObj.searchParams.delete('start');
    urlObj.searchParams.delete('time_continue');
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Converts seconds to timecode (h:mm:ss or mm:ss).
 * @param {number} seconds
 * @returns {string}
 */
function getTimecode(seconds) {
  try {
    const s = Math.floor(Number(seconds) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/**
 * Parses a timecode string into seconds.
 * @param {string} str - e.g. "1:30" or "1:00:30"
 * @returns {number}
 */
function parseTime(str) {
  try {
    if (!str || typeof str !== 'string') return 0;
    const parts = str.trim().split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(str) || 0;
  } catch {
    return 0;
  }
}

/**
 * Generates a unique note ID.
 * @returns {string}
 */
function generateNoteId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Get all unique tags from notes.
 * @param {Array<{ tags?: string[] }>} notes
 * @returns {string[]}
 */
function getAllTags(notes) {
  if (!Array.isArray(notes)) return [];
  const set = new Set();
  notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
  return Array.from(set);
}

module.exports = {
  normalizeYouTubeUrl,
  getTimecode,
  parseTime,
  generateNoteId,
  getAllTags
};
