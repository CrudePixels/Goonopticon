const { fetchStatusesViaJinaX } = require('./tweetMirrorService');

const PAGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function uniqueInOrder(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (!it) continue;
    if (seen.has(it)) continue;
    seen.add(it);
    out.push(it);
  }
  return out;
}

function escapeRegExp(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fetchHtml(url, { timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,*/*',
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

async function fetchHtmlWithFallback(urls, opts) {
  for (const u of urls) {
    try {
      const html = await fetchHtml(u, opts);
      if (html && typeof html === 'string' && html.length > 5) return html;
    } catch {
      // continue
    }
  }
  return '';
}

async function fetchLatestXTweets({ handle, limit = 8 } = {}) {
  const clean = String(handle || '').trim().replace(/^@/, '');
  if (!clean) return [];

  const escaped = escapeRegExp(clean);
  const profileUrl = `https://twstalker.com/${clean}?lang=en`;
  const candidates = [
    profileUrl,
    `https://r.jina.ai/http://${profileUrl.replace(/^https?:\/\//i, '')}`,
    `https://r.jina.ai/https://${profileUrl.replace(/^https?:\/\//i, '')}`
  ];

  const html = await fetchHtmlWithFallback(candidates, { timeoutMs: 15000 });

  const ids = [];
  if (html) {
    // Case-sensitive path segment must match handle exactly as on TwStalker (often uppercase).
    for (const m of html.matchAll(new RegExp(`/${escaped}/status/(\\d+)`, 'gi'))) ids.push(m[1]);
    for (const m of html.matchAll(new RegExp(`twstalker\\.com/${escaped}/status/(\\d+)`, 'gi'))) ids.push(m[1]);
    // Case-insensitive fallback for mirrors that normalize casing
    for (const m of html.matchAll(/twstalker\.com\/([^/]+)\/status\/(\d+)/gi)) {
      if ((m[1] || '').toLowerCase() === clean.toLowerCase()) ids.push(m[2]);
    }
  }

  let uniqueIds = uniqueInOrder(ids).slice(0, limit);

  if (!uniqueIds.length) {
    uniqueIds = await fetchStatusesViaJinaX(clean, { limit, timeoutMs: 22000 });
  }

  return uniqueIds.map((id) => ({
    id,
    link: `https://x.com/${clean}/status/${id}`,
    text: ''
  }));
}

module.exports = { fetchLatestXTweets };
