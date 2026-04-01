/**
 * Fetch recent videos from a YouTube channel via public RSS feed.
 * Supports /channel/UC…, /@handle, /c/custom, /user/legacy (resolves ID from page HTML).
 */

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

function normalizeYouTubeInput(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!/(?:^|\.)youtube\.com$/i.test(u.hostname) && !/^youtu\.be$/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function extractChannelId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const m = trimmed.match(/(?:www\.)?youtube\.com\/channel\/([a-zA-Z0-9_-]{24})\b/i);
  if (m) return m[1];
  return null;
}

function channelIdFromHtml(html) {
  if (!html || typeof html !== 'string') return null;
  const canonical =
    html.match(
      /<link[^>]+rel=["']canonical["'][^>]+href=["']https?:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})["']/i
    ) ||
    html.match(
      /<link[^>]+href=["']https?:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})["'][^>]*rel=["']canonical["']/i
    );
  if (canonical) return canonical[1];
  // r.jina / stripped HTML can remove the <link rel="canonical"> tag,
  // so fall back to a looser "youtube.com/channel/UC..." match.
  const looser = html.match(/https?:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/i);
  if (looser) return looser[1];
  const patterns = [
    /"channelId":"(UC[a-zA-Z0-9_-]{22})"/,
    /"externalId":"(UC[a-zA-Z0-9_-]{22})"/,
    /"browseId":"(UC[a-zA-Z0-9_-]{22})"/
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function urlNeedsPageResolve(absUrl) {
  try {
    const u = new URL(absUrl);
    const p = u.pathname || '';
    return /^\/@[^/]+/.test(p) || /^\/c\/[^/]+/.test(p) || /^\/user\/[^/]+/.test(p);
  } catch {
    return false;
  }
}

async function resolveChannelIdFromYouTubePage(absUrl) {
  const safeUrl = absUrl && typeof absUrl === 'string' ? absUrl.trim() : null;
  if (!safeUrl) return null;

  const urlForJina = (schemeUrl) => {
    try {
      // schemeUrl e.g. https://www.youtube.com/@PodAwful => www.youtube.com/@PodAwful
      const noProto = schemeUrl.replace(/^https?:\/\//i, '');
      return `https://r.jina.ai/${schemeUrl.startsWith('https://') ? 'https' : 'http'}://${noProto}`;
    } catch {
      return null;
    }
  };

  // Jina first: direct youtube.com fetches often fail from servers / Electron without a session.
  const candidates = [
    urlForJina(safeUrl),
    (() => {
      try {
        const noProto = safeUrl.replace(/^https?:\/\//i, '');
        return `https://r.jina.ai/http://${noProto}`;
      } catch {
        return null;
      }
    })(),
    safeUrl
  ].filter(Boolean);

  for (const u of candidates) {
    try {
      const res = await fetch(u, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': PAGE_UA
        }
      });
      if (!res.ok) continue;
      const html = await res.text();
      const id = channelIdFromHtml(html);
      if (id) return id;
    } catch {
      // continue
    }
  }

  return null;
}

function uploadsPlaylistIdFromChannelId(channelId) {
  if (!channelId || typeof channelId !== 'string') return null;
  if (!/^UC[a-zA-Z0-9_-]{22}$/.test(channelId)) return null;
  return `UU${channelId.slice(2)}`;
}

async function fetchTextMaybeNetFetch(url, headers, signal) {
  try {
    const { net } = require('electron');
    if (net && typeof net.fetch === 'function') {
      const res = await net.fetch(url, { headers, signal });
      if (res.ok) {
        const xml = await res.text();
        if (xml && /<entry[\s>]/i.test(xml)) return xml;
      }
    }
  } catch {
    // fall through
  }
  try {
    const res = await fetch(url, {
      signal,
      headers
    });
    if (!res.ok) return null;
    const xml = await res.text();
    return xml && /<entry[\s>]/i.test(xml) ? xml : null;
  } catch {
    return null;
  }
}

async function fetchChannelFeed(channelId) {
  if (!channelId) return [];
  const playlistId = uploadsPlaylistIdFromChannelId(channelId);
  const rssHeaders = {
    Accept: 'application/xml,text/xml,application/atom+xml,*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': PAGE_UA
  };
  const urls = [
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    `https://youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    ...(playlistId
      ? [
          `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`,
          `https://youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`
        ]
      : [])
  ];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 16000);
      try {
        const xml = await fetchTextMaybeNetFetch(url, rssHeaders, controller.signal);
        if (xml) return parseRssEntries(xml);
      } finally {
        clearTimeout(t);
      }
    } catch {
      // next
    }
  }

  const jinaRss = [
    `https://r.jina.ai/https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    ...(playlistId
      ? [
          `https://r.jina.ai/https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`,
          `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`
        ]
      : [])
  ];
  for (const url of jinaRss) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 22000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'text/plain,text/html,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': PAGE_UA
        }
      });
      const text = await res.text();
      if (text && /<entry[\s>]/i.test(text)) {
        const parsed = parseRssEntries(text);
        if (parsed.length) return parsed;
      }
      const rawIds = [];
      for (const m of text.matchAll(/<yt:videoId>([a-zA-Z0-9_-]{11})<\/yt:videoId>/gi)) rawIds.push(m[1]);
      for (const m of text.matchAll(/watch\?v=([a-zA-Z0-9_-]{11})/gi)) rawIds.push(m[1]);
      const stubIds = uniqueInOrder(rawIds).slice(0, 15);
      if (stubIds.length) {
        const stub = stubIds.map((videoId) => ({
          title: '',
          link: `https://www.youtube.com/watch?v=${videoId}`,
          published: '',
          videoId
        }));
        return enrichEntriesWithOembed(stub);
      }
    } catch {
      // next
    } finally {
      clearTimeout(t);
    }
  }

  return [];
}

function buildChannelVideosPageUrl(normalized, channelId) {
  if (channelId) return `https://www.youtube.com/channel/${channelId}/videos`;
  try {
    const u = new URL((normalized || '').split('#')[0]);
    const p = (u.pathname || '').replace(/\/$/, '');
    if (/^\/@[^/]+/.test(p) || /^\/c\/[^/]+/.test(p) || /^\/user\/[^/]+/.test(p)) {
      return `https://www.youtube.com${p}/videos`;
    }
  } catch {
    // ignore
  }
  return null;
}

function parseVideoIdsFromYouTubeHtml(html) {
  if (!html || typeof html !== 'string') return [];
  const ids = [];
  for (const m of html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)) ids.push(m[1]);
  for (const m of html.matchAll(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi)) ids.push(m[1]);
  return uniqueInOrder(ids);
}

async function fetchVideoIdsDirectVideosPage(videosPageUrl) {
  if (!videosPageUrl) return [];
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(videosPageUrl.split('#')[0], {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': PAGE_UA
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const ids = parseVideoIdsFromYouTubeHtml(html);
    return ids.length ? ids : [];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

async function fetchVideoIdsFromJinaVideosPage(videosPageUrl) {
  if (!videosPageUrl) return [];
  const noProto = videosPageUrl.replace(/^https?:\/\//i, '');
  const candidates = [`https://r.jina.ai/https://${noProto}`, `https://r.jina.ai/http://${noProto}`];

  for (const u of candidates) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 28000);
    try {
      const res = await fetch(u, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          Accept: 'text/plain,text/markdown,text/html,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': PAGE_UA
        }
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text || text.length < 200) continue;
      if (/403: Forbidden|blocked|We're sorry/i.test(text) && !/watch\?v=/.test(text)) continue;

      const ids = [];
      for (const m of text.matchAll(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi)) ids.push(m[1]);
      for (const m of text.matchAll(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi)) ids.push(m[1]);
      for (const m of text.matchAll(/youtu\.be\/([a-zA-Z0-9_-]{11})/gi)) ids.push(m[1]);
      for (const m of text.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)) ids.push(m[1]);

      const ordered = uniqueInOrder(ids);
      if (ordered.length) return ordered;
    } catch {
      // next candidate
    } finally {
      clearTimeout(t);
    }
  }
  return [];
}

async function enrichEntriesWithOembed(entries) {
  const out = [];
  for (const e of entries) {
    const vid = e.videoId || (e.link && /[?&]v=([a-zA-Z0-9_-]{11})/.exec(e.link)?.[1]);
    if (!vid) {
      out.push(e);
      continue;
    }
    const watchUrl = `https://www.youtube.com/watch?v=${vid}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(oembedUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': PAGE_UA
        }
      });
      if (res.ok) {
        const j = await res.json();
        const title = (j.title && String(j.title).trim()) || e.title || 'Video';
        out.push({
          ...e,
          videoId: vid,
          link: watchUrl,
          title
        });
        continue;
      }
    } catch {
      // fall through
    } finally {
      clearTimeout(t);
    }
    out.push({
      ...e,
      videoId: vid,
      link: watchUrl,
      title: e.title || 'Video'
    });
  }
  return out;
}

function parseRssEntries(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let m;
  while ((m = entryRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const link = block.match(/<link[^>]*href="([^"]+)"/i);
    const published = block.match(/<published>([^<]+)<\/published>/i);
    const videoId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i) || block.match(/yt:videoId>([^<]+)</i);
    entries.push({
      title: title ? title[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '',
      link: link ? link[1] : '',
      published: published ? published[1] : '',
      videoId: videoId ? videoId[1] : null
    });
  }
  return entries.slice(0, 15);
}

async function resolveChannelIdForUrl(url) {
  const normalized = normalizeYouTubeInput(url);
  if (!normalized) return null;
  let id = extractChannelId(normalized);
  if (!id && urlNeedsPageResolve(normalized)) {
    id = await resolveChannelIdFromYouTubePage(normalized.split('#')[0]);
  }
  return id || null;
}

async function fetchJsonYouTubeApi(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 14000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function resolveChannelIdForDataApi(normalized, apiKey) {
  const key = encodeURIComponent(apiKey);
  const fromUrl = extractChannelId(normalized);
  if (fromUrl) return fromUrl;
  const handleM = normalized.match(/youtube\.com\/@([^/?#]+)/i);
  if (handleM) {
    const handle = decodeURIComponent(handleM[1]);
    const byHandle = await fetchJsonYouTubeApi(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${key}`
    );
    if (byHandle?.items?.[0]?.id) return byHandle.items[0].id;
    const search = await fetchJsonYouTubeApi(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=3&key=${key}`
    );
    for (const it of search?.items || []) {
      const cid = it.id?.channelId;
      if (cid) return cid;
    }
  }
  if (urlNeedsPageResolve(normalized)) {
    return await resolveChannelIdFromYouTubePage(normalized.split('#')[0]);
  }
  return null;
}

/** When RSS / scraping is blocked, a YouTube Data API key (same as live chat key) can still list uploads. */
async function fetchFeedViaYouTubeDataApi(normalized, apiKey) {
  if (!apiKey) return [];
  const channelId = await resolveChannelIdForDataApi(normalized, apiKey);
  if (!channelId) return [];
  const key = encodeURIComponent(apiKey);
  const ch = await fetchJsonYouTubeApi(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${key}`
  );
  const playlistId = ch?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) return [];
  const pl = await fetchJsonYouTubeApi(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=15&key=${key}`
  );
  const items = pl?.items;
  if (!items?.length) return [];
  return items
    .map((item) => {
      const videoId = item.contentDetails?.videoId || '';
      if (!videoId) return null;
      return {
        title: item.snippet?.title || '',
        link: `https://www.youtube.com/watch?v=${videoId}`,
        published: item.snippet?.publishedAt || '',
        videoId
      };
    })
    .filter(Boolean);
}

module.exports = {
  extractChannelId,
  normalizeYouTubeInput,
  fetchChannelFeed,
  resolveChannelIdForUrl,
  async fetchFeedForUrl(url, opts = {}) {
    const apiKey = typeof opts.apiKey === 'string' ? opts.apiKey.trim() : '';
    const normalized = normalizeYouTubeInput(url);
    if (!normalized) return [];
    let id = extractChannelId(normalized);
    if (!id && urlNeedsPageResolve(normalized)) {
      id = await resolveChannelIdFromYouTubePage(normalized.split('#')[0]);
    }

    if (id) {
      const fromRss = await fetchChannelFeed(id);
      if (fromRss.length) return fromRss;
    }

    // Prefer /@handle/videos (or /c/…/videos) from the original URL — resolved UC id from HTML is often wrong.
    let videosUrl = buildChannelVideosPageUrl(normalized, null);
    if (!videosUrl && id) videosUrl = buildChannelVideosPageUrl(normalized, id);
    if (!videosUrl) {
      if (apiKey) {
        const via = await fetchFeedViaYouTubeDataApi(normalized, apiKey);
        if (via.length) return via;
      }
      return [];
    }

    let videoIds = await fetchVideoIdsFromJinaVideosPage(videosUrl);
    if (!videoIds.length) videoIds = await fetchVideoIdsDirectVideosPage(videosUrl);
    if (!videoIds.length) {
      if (apiKey) {
        const via = await fetchFeedViaYouTubeDataApi(normalized, apiKey);
        if (via.length) return via;
      }
      return [];
    }

    const stub = videoIds.slice(0, 15).map((videoId) => ({
      title: '',
      link: `https://www.youtube.com/watch?v=${videoId}`,
      published: '',
      videoId
    }));

    return enrichEntriesWithOembed(stub);
  }
};
