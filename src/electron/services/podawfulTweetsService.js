const { chromiumFetch } = require('./chromiumFetch');

const PAGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const { fetchStatusesViaJinaX } = require('./tweetMirrorService');

const TWSTALKER_URLS = [
  'https://twstalker.com/PODAWFUL?lang=en',
  'https://twstalker.com/podawful?lang=en',
  'https://twstalker.com/podawful',
  'https://r.jina.ai/http://twstalker.com/PODAWFUL?lang=en',
  'https://r.jina.ai/http://twstalker.com/PODAWFUL',
  'https://r.jina.ai/https://twstalker.com/PODAWFUL?lang=en',
  'https://r.jina.ai/http://twstalker.com/podawful?lang=en',
  'https://r.jina.ai/https://twstalker.com/podawful'
];
const PODAWFUL_X_HANDLE = 'podawful';

function uniqueInOrder(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (seen.has(it)) continue;
    seen.add(it);
    out.push(it);
  }
  return out;
}

async function fetchHtml(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await chromiumFetch(url, {
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

function stripTags(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchOEmbedPlainText(statusId, screenName = PODAWFUL_X_HANDLE) {
  if (!statusId) return '';
  const user = String(screenName || PODAWFUL_X_HANDLE).replace(/^@/, '');
  const tweetUrl = `https://x.com/${user}/status/${statusId}`;
  const oembedUrl =
    'https://publish.twitter.com/oembed?omit_script=1&hide_thread=1&dnt=true&url=' +
    encodeURIComponent(tweetUrl);
  try {
    const res = await chromiumFetch(oembedUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': PAGE_UA
      }
    });
    if (!res.ok) return '';
    const j = await res.json();
    if (j.html) return stripTags(j.html).slice(0, 560);
    return typeof j.title === 'string' ? j.title.slice(0, 560) : '';
  } catch {
    return '';
  }
}

async function fetchHtmlWithFallback(urls, opts) {
  let lastErr = null;
  for (const u of urls) {
    try {
      const html = await fetchHtml(u, opts);
      if (html && typeof html === 'string' && html.length > 5) return html;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return '';
}

function parseStatusIdsFromTwStalkerHtml(html) {
  if (!html || typeof html !== 'string') return [];
  const ids = [];
  for (const m of html.matchAll(/twstalker\.com\/(PODAWFUL|podawful)\/status\/(\d+)/gi)) ids.push(m[2]);
  for (const m of html.matchAll(/\/PODAWFUL\/status\/(\d+)/gi)) ids.push(m[1]);
  for (const m of html.matchAll(/\/podawful\/status\/(\d+)/gi)) ids.push(m[1]);
  for (const m of html.matchAll(/(?:x\.com|twitter\.com)\/podawful\/status\/(\d{10,22})/gi)) ids.push(m[1]);
  for (const m of html.matchAll(/(?:x\.com|twitter\.com)\/PODAWFUL\/status\/(\d{10,22})/gi)) ids.push(m[1]);
  return uniqueInOrder(ids).filter(Boolean);
}

async function fetchTwStalkerStatusIds(limit) {
  try {
    const html = await fetchHtmlWithFallback(TWSTALKER_URLS, { timeoutMs: 18000 });
    return parseStatusIdsFromTwStalkerHtml(html).slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Best-effort: parse latest tweet status links from TwStalker + Jina X mirror.
 * Returns { id, link, text } — text filled when oembedFirst + publish.twitter oEmbed succeeds.
 */
async function fetchLatestTweets({ limit = 12, oembedFirst = false, oembedCount = 1 } = {}) {
  const [fromTw, fromJina] = await Promise.all([
    fetchTwStalkerStatusIds(limit),
    fetchStatusesViaJinaX(PODAWFUL_X_HANDLE, { limit, timeoutMs: 24000 })
  ]);
  const uniqueIds = uniqueInOrder([...fromTw, ...fromJina]).slice(0, limit);

  const seen = new Set();
  const unique = [];
  for (const id of uniqueIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push({
      id,
      link: `https://x.com/${PODAWFUL_X_HANDLE}/status/${id}`,
      text: ''
    });
    if (unique.length >= limit) break;
  }

  const n = Math.min(Math.max(0, Number(oembedCount) || 0), unique.length, 8);
  if (oembedFirst && n > 0) {
    const slice = unique.slice(0, n);
    const texts = await Promise.all(slice.map((row) => fetchOEmbedPlainText(row.id, PODAWFUL_X_HANDLE)));
    for (let i = 0; i < slice.length; i++) {
      unique[i] = { ...unique[i], text: texts[i] || '' };
    }
  }

  return unique;
}

module.exports = { fetchLatestTweets, fetchOEmbedPlainText };
