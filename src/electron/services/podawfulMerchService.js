const { chromiumFetch } = require('./chromiumFetch');

const PAGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SHOP_URL = 'https://awful.tech/merch';

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

function slugToTitle(slug) {
  try {
    const decoded = decodeURIComponent(slug);
    return decoded
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return String(slug || '')
      .replace(/[-_]+/g, ' ')
      .trim();
  }
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 9000);
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

/**
 * Best-effort: parse product links from the shop page.
 * Returns { link, title } based on the /merch/p/<slug> URLs.
 */
async function fetchLatestMerch({ limit = 12 } = {}) {
  try {
    const html = await fetchHtml(SHOP_URL);

    const urls = [];

    // Absolute links
    const absRe = /https?:\/\/awful\.tech\/merch\/p\/([^"'?\s)]+)/gi;
    for (const m of html.matchAll(absRe)) {
      const slug = m[1] || '';
      if (slug) urls.push(`https://awful.tech/merch/p/${slug}`);
    }

    // Relative hrefs: href="/merch/p/<slug>"
    const relHrefRe = /href=["']\/merch\/p\/([^"']+)["']/gi;
    for (const m of html.matchAll(relHrefRe)) {
      const slug = (m[1] || '').trim();
      if (slug) urls.push(`https://awful.tech/merch/p/${slug}`);
    }

    // As a last resort, grab any /merch/p/<slug> occurrences.
    const looseRe = /\/merch\/p\/([^"'?\s)]+)/gi;
    for (const m of html.matchAll(looseRe)) {
      const slug = m[1] || '';
      if (!slug) continue;
      // Guard: ignore overly long "slugs" from template text.
      if (slug.length > 80) continue;
      urls.push(`https://awful.tech/merch/p/${slug}`);
    }

    const uniqueUrls = uniqueInOrder(urls).slice(0, limit);
    return uniqueUrls.map((link) => {
      const slug = link.split('/merch/p/')[1] || '';
      return { link, slug, title: slugToTitle(slug) };
    });
  } catch {
    return [];
  }
}

module.exports = { fetchLatestMerch };

