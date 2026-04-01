/**
 * YouTube live chat via Innertube get_live_chat (no API key). Continuation + keys parsed from watch HTML.
 */

const https = require('https');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FALLBACK_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

function httpsRequest(options, postBody) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    if (postBody) req.write(postBody);
    req.end();
  });
}

function fetchTextElectron(urlStr) {
  return new Promise((resolve) => {
    try {
      const { net } = require('electron');
      if (!net || typeof net.fetch !== 'function') {
        resolve('');
        return;
      }
      net
        .fetch(urlStr, {
          headers: {
            'User-Agent': UA,
            'Accept-Language': 'en-US,en;q=0.9',
            Accept: 'text/html,*/*'
          }
        })
        .then((res) => (res && res.ok ? res.text() : null))
        .then((t) => resolve(typeof t === 'string' && t.length > 400 ? t : ''))
        .catch(() => resolve(''));
    } catch (_) {
      resolve('');
    }
  });
}

function fetchTextHttps(urlStr, redirectsLeft = 8) {
  const u = new URL(urlStr);
  return httpsRequest({
    hostname: u.hostname,
    path: u.pathname + u.search,
    method: 'GET',
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,*/*'
    }
  }).then(({ status, body, headers }) => {
    const loc = headers && headers.location;
    if (status >= 300 && status < 400 && loc && redirectsLeft > 0) {
      const next = new URL(String(loc).trim(), urlStr).toString();
      return fetchTextHttps(next, redirectsLeft - 1);
    }
    return status === 200 ? body : '';
  });
}

function fetchText(urlStr, redirectsLeft = 8) {
  return fetchTextElectron(urlStr).then((html) => {
    if (html && html.length > 800) return html;
    return fetchTextHttps(urlStr, redirectsLeft);
  });
}

function extractJsonAfter(html, marker) {
  const i = html.indexOf(marker);
  if (i === -1) return null;
  let j = i + marker.length;
  while (j < html.length && /\s/.test(html[j])) j++;
  if (html[j] !== '{') return null;
  let depth = 0;
  const start = j;
  for (; j < html.length; j++) {
    const c = html[j];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return html.slice(start, j + 1);
    }
  }
  return null;
}

function findLiveChatContinuation(obj, depth) {
  if (!obj || typeof obj !== 'object' || depth > 60) return null;
  const lr = obj.liveChatRenderer;
  if (lr && Array.isArray(lr.continuations)) {
    const c = lr.continuations[0];
    const t =
      c?.reloadContinuationData?.continuation ||
      c?.timedContinuationData?.continuation ||
      c?.invalidationContinuationData?.continuation;
    if (t) return String(t);
  }
  for (const k of Object.keys(obj)) {
    const f = findLiveChatContinuation(obj[k], depth + 1);
    if (f) return f;
  }
  return null;
}

function extractInnertube(html) {
  const keyM = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const verM = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
  return {
    apiKey: keyM ? keyM[1] : FALLBACK_KEY,
    clientVersion: verM ? verM[1] : '2.20241126.01.00'
  };
}

function continuationFromWatchHtml(html) {
  const markers = ['var ytInitialData = ', 'ytInitialData = '];
  for (const m of markers) {
    const raw = extractJsonAfter(html, m);
    if (!raw) continue;
    try {
      const j = JSON.parse(raw);
      const c = findLiveChatContinuation(j, 0);
      if (c) return c;
    } catch (_) {}
  }
  const pr = extractJsonAfter(html, 'var ytInitialPlayerResponse = ');
  if (pr) {
    try {
      const j = JSON.parse(pr);
      const c = findLiveChatContinuation(j, 0);
      if (c) return c;
    } catch (_) {}
  }
  return null;
}

function runsToText(runs) {
  if (!Array.isArray(runs)) return '';
  return runs.map((r) => r?.text || '').join('');
}

function authorExtrasFromChatRenderer(r) {
  const thumbs = r?.authorPhoto?.thumbnails;
  let avatarUrl = '';
  if (Array.isArray(thumbs) && thumbs.length) {
    const last = thumbs[thumbs.length - 1];
    avatarUrl = (last && last.url) || thumbs[0]?.url || '';
  }
  const channelId = r?.authorExternalChannelId ? String(r.authorExternalChannelId) : '';
  const ex = {};
  if (avatarUrl) ex.avatarUrl = String(avatarUrl);
  if (channelId) ex.channelId = channelId;
  return Object.keys(ex).length ? ex : undefined;
}

function parseActions(actions, emit) {
  if (!Array.isArray(actions)) return;
  for (const act of actions) {
    const item = act?.addChatItemAction?.item;
    if (!item) continue;
    const tm = item.liveChatTextMessageRenderer;
    if (tm) {
      const author = tm.authorName?.simpleText || '?';
      const text = runsToText(tm.message?.runs) || tm.message?.simpleText || '';
      const t = String(text || '').trim();
      if (t) emit(author, t, authorExtrasFromChatRenderer(tm));
      continue;
    }
    const pm = item.liveChatPaidMessageRenderer;
    if (pm) {
      const author = pm.authorName?.simpleText || '?';
      const text = runsToText(pm.message?.runs) || '';
      const t = String(text || '').trim();
      if (t) emit(author, t, authorExtrasFromChatRenderer(pm));
    }
  }
}

function nextContinuationFromResponse(j) {
  const cc = j?.continuationContents?.liveChatContinuation;
  if (!cc) return null;
  const conts = cc.continuations;
  if (!Array.isArray(conts) || !conts.length) return null;
  const c = conts[0];
  return (
    c?.reloadContinuationData?.continuation ||
    c?.timedContinuationData?.continuation ||
    c?.invalidationContinuationData?.continuation ||
    null
  );
}

const active = new Map();

/**
 * @param {string} streamKey e.g. youtube:VIDEOID
 * @param {string} videoId 11-char
 * @param {(author: string, text: string, extra?: { avatarUrl?: string, channelId?: string }) => void} emit
 */
function start(streamKey, videoId, emit) {
  stop(streamKey);
  let stopped = false;
  let timer = null;
  let cont = null;
  let apiKey = FALLBACK_KEY;
  let clientVersion = '2.20241126.01.00';

  const MWEB_VER = '2.20250301.00.00';

  const loop = (useMwebClient = false) => {
    if (stopped) return;
    if (!cont) {
      timer = setTimeout(() => {
        timer = null;
        refreshContinuation();
      }, 12000);
      return;
    }
    const body = JSON.stringify({
      context: {
        client: {
          hl: 'en',
          gl: 'US',
          clientName: useMwebClient ? 'MWEB' : 'WEB',
          clientVersion: useMwebClient ? MWEB_VER : clientVersion
        }
      },
      continuation: cont
    });
    const path = `/youtubei/v1/live_chat/get_live_chat?key=${encodeURIComponent(apiKey)}&prettyPrint=false`;
    httpsRequest(
      {
        hostname: 'www.youtube.com',
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8'),
          'User-Agent': UA,
          Origin: 'https://www.youtube.com',
          Referer: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
        }
      },
      body
    )
      .then(({ status, body: resBody }) => {
        if (stopped) return;
        if (status !== 200) {
          if (!useMwebClient && cont) {
            loop(true);
            return;
          }
          cont = null;
          timer = setTimeout(() => {
            timer = null;
            refreshContinuation();
          }, 15000);
          return;
        }
        let j;
        try {
          j = JSON.parse(resBody);
        } catch (_) {
          cont = null;
          timer = setTimeout(() => {
            timer = null;
            refreshContinuation();
          }, 10000);
          return;
        }
        const cc = j?.continuationContents?.liveChatContinuation;
        if (cc?.actions) parseActions(cc.actions, emit);
        const nxt = nextContinuationFromResponse(j);
        if (nxt) cont = nxt;
        else {
          cont = null;
          timer = setTimeout(() => {
            timer = null;
            refreshContinuation();
          }, 6000);
          return;
        }
        const ms = Math.min(Math.max(Number(cc?.pollingIntervalMillis) || 1000, 800), 8000);
        timer = setTimeout(() => {
          timer = null;
          loop(false);
        }, ms);
      })
      .catch(() => {
        if (stopped) return;
        cont = null;
        timer = setTimeout(() => {
          timer = null;
          refreshContinuation();
        }, 12000);
      });
  };

  function refreshContinuation() {
    if (stopped) return;
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`;
    fetchText(url)
      .then((html) => {
        if (stopped || !html) {
          timer = setTimeout(() => {
            timer = null;
            refreshContinuation();
          }, 20000);
          return;
        }
        const cfg = extractInnertube(html);
        apiKey = cfg.apiKey;
        clientVersion = cfg.clientVersion;
        const c = continuationFromWatchHtml(html);
        if (c) {
          cont = c;
          loop(false);
        } else {
          timer = setTimeout(() => {
            timer = null;
            refreshContinuation();
          }, 20000);
        }
      })
      .catch(() => {
        if (stopped) return;
        timer = setTimeout(() => {
          timer = null;
          refreshContinuation();
        }, 20000);
      });
  }

  refreshContinuation();

  active.set(streamKey, () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  });
}

function stop(streamKey) {
  const fn = active.get(streamKey);
  if (fn) {
    try {
      fn();
    } catch (_) {}
    active.delete(streamKey);
  }
}

function stopAll() {
  for (const k of active.keys()) stop(k);
}

/** Resolve @handle or handle string to live video id from /live page HTML */
function resolveLiveVideoId(channel) {
  const c = (channel || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(c)) return Promise.resolve(c);
  let path;
  if (c.startsWith('@')) path = `https://www.youtube.com/${encodeURI(c)}/live`;
  else if (c) path = `https://www.youtube.com/@${encodeURIComponent(c)}/live`;
  else return Promise.resolve(null);
  return fetchText(path).then((html) => {
    if (!html) return null;
    const m =
      html.match(/"contentVideoId":"([a-zA-Z0-9_-]{11})"/) ||
      html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/) ||
      html.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/) ||
      html.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/) ||
      html.match(/watch\?v=([a-zA-Z0-9_-]{11})/) ||
      html.match(/\/embed\/([a-zA-Z0-9_-]{11})/) ||
      html.match(/\/live\/([a-zA-Z0-9_-]{11})/) ||
      html.match(/\/shorts\/([a-zA-Z0-9_-]{11})/) ||
      html.match(/"canonicalBaseUrl":"https:\\\/\\\/www\.youtube\.com\\\/watch\?v=([a-zA-Z0-9_-]{11})"/) ||
      html.match(/"video_id":"([a-zA-Z0-9_-]{11})"/i) ||
      html.match(/"externalVideoId":"([a-zA-Z0-9_-]{11})"/) ||
      html.match(/%22videoId%22%3A%22([a-zA-Z0-9_-]{11})%22/);
    return m ? m[1] : null;
  });
}

module.exports = { start, stop, stopAll, resolveLiveVideoId };
