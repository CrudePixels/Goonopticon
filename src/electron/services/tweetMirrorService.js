const { chromiumFetch } = require('./chromiumFetch');

const PAGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function uniqueInOrder(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (!it || seen.has(it)) continue;
    seen.add(it);
    out.push(it);
  }
  return out;
}

async function fetchText(url, { timeoutMs = 18000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await chromiumFetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/plain,text/html,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': PAGE_UA
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/** r.jina.ai sometimes returns non-2xx while still serving markdown — always read body and detect /status/ links. */
async function fetchJinaBody(url, { timeoutMs = 22000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await chromiumFetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/plain,text/html,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': PAGE_UA
      }
    });
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Parse status IDs from Jina's markdown/text dump of an X profile.
 * Only keeps URLs where the path segment before /status/ matches @handle (case-insensitive).
 */
function parseStatusIdsFromXMirror(text, handle, limit) {
  const clean = String(handle || '').trim().replace(/^@/, '');
  if (!clean || !text) return [];
  const ids = [];
  const re =
    /(?:x\.com|twitter\.com|mobile\.x\.com|mobile\.twitter\.com)\/([^/]+)\/status\/(\d{10,22})/gi;
  for (const m of text.matchAll(re)) {
    const seg = (m[1] || '').trim();
    if (seg.toLowerCase() !== clean.toLowerCase()) continue;
    ids.push(m[2]);
    if (ids.length >= limit * 2) break;
  }
  return uniqueInOrder(ids).slice(0, limit);
}

/**
 * Best-effort: latest tweet status IDs via r.jina.ai mirror of x.com (when TwStalker is blocked).
 */
async function fetchStatusesViaJinaX(handle, { limit = 12, timeoutMs = 22000 } = {}) {
  const clean = String(handle || '').trim().replace(/^@/, '');
  if (!clean) return [];

  const enc = encodeURIComponent(clean);
  // mobile.x.com mirrors through Jina usually include /status/ links; desktop x.com often 403s from Jina.
  const urls = [
    `https://r.jina.ai/https://mobile.x.com/${enc}`,
    `https://r.jina.ai/http://mobile.x.com/${enc}`,
    `https://r.jina.ai/https://mobile.twitter.com/${enc}`,
    `https://r.jina.ai/http://mobile.twitter.com/${enc}`,
    `https://r.jina.ai/https://x.com/${enc}`,
    `https://r.jina.ai/http://x.com/${enc}`,
    `https://r.jina.ai/https://twitter.com/${enc}`,
    `https://r.jina.ai/http://twitter.com/${enc}`,
    `https://r.jina.ai/https://xcancel.com/${enc}`,
    `https://r.jina.ai/http://xcancel.com/${enc}`
  ];

  for (const u of urls) {
    try {
      const text = await fetchJinaBody(u, { timeoutMs });
      if (!text || text.length < 80) continue;
      if (/^<!doctype html>[\s\S]{0,400}<title>403<\/title>/i.test(text) && !/\/status\/\d{10,}/.test(text)) {
        continue;
      }
      const ids = parseStatusIdsFromXMirror(text, clean, limit);
      if (ids.length) return ids;
    } catch {
      // next url
    }
  }
  return [];
}

module.exports = { fetchStatusesViaJinaX, parseStatusIdsFromXMirror };
