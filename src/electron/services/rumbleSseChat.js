/**
 * Rumble live chat via SSE (RumbleChat(…) → …/chat/{id}/stream).
 * Uses Electron net.fetch first (Node https often blocked by Cloudflare); DOM scraper is fallback.
 */

const https = require('https');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const HTML_HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://rumble.com',
  Referer: 'https://rumble.com/'
};

function fetchHtmlElectronNet(pageUrl) {
  return new Promise((resolve) => {
    try {
      const { net } = require('electron');
      if (!net || typeof net.fetch !== 'function') {
        resolve(null);
        return;
      }
      net
        .fetch(pageUrl, { headers: HTML_HEADERS })
        .then((res) => (res && res.ok ? res.text() : null))
        .then((text) => resolve(text && text.length > 200 ? text : null))
        .catch(() => resolve(null));
    } catch (_) {
      resolve(null);
    }
  });
}

function httpsGet(urlStr, maxRedirects = 8) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: { ...HTML_HEADERS }
      },
      (res) => {
        const loc = res.headers && res.headers.location;
        if (res.statusCode >= 300 && res.statusCode < 400 && loc && maxRedirects > 0) {
          res.resume();
          const next = new URL(String(loc).trim(), urlStr).toString();
          httpsGet(next, maxRedirects - 1).then(resolve).catch(reject);
          return;
        }
        let body = '';
        res.on('data', (c) => {
          body += c;
        });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

/** Port of tylertravisty/rumble-livestream-lib-go parseRumbleChatArgs */
function parseRumbleChatArgs(argsS) {
  let open = 0;
  const args = [];
  let arg = '';
  for (let i = 0; i < argsS.length; i++) {
    const c = argsS[i];
    if (c === ',' && open === 0) {
      args.push(trimRumbleChatArg(arg));
      arg = '';
    } else {
      if (c === '[') open++;
      if (c === ']') open--;
      arg += c;
    }
  }
  if (arg.length) args.push(trimRumbleChatArg(arg));
  return args;
}

function trimRumbleChatArg(arg) {
  return String(arg || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

/** Balanced-paren extract of first RumbleChat( … ) call (handles nested parens in strings). */
function extractRumbleChatArgumentsString(html) {
  const needle = 'RumbleChat';
  let from = 0;
  while (from < html.length) {
    const idx = html.indexOf(needle, from);
    if (idx === -1) return null;
    let i = idx + needle.length;
    while (i < html.length && /\s/.test(html[i])) i++;
    if (html[i] !== '(') {
      from = i;
      continue;
    }
    i++;
    let depth = 1;
    const start = i;
    let inStr = null;
    let esc = false;
    for (; i < html.length && depth > 0; i++) {
      const c = html[i];
      if (inStr) {
        if (esc) {
          esc = false;
          continue;
        }
        if (c === '\\') {
          esc = true;
          continue;
        }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        inStr = c;
        continue;
      }
      if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    if (depth === 0) return html.slice(start, i - 1);
    from = idx + 1;
  }
  return null;
}

function parseRumbleChatFromHtml(html) {
  const argsStr = extractRumbleChatArgumentsString(html);
  if (!argsStr) return null;
  const args = parseRumbleChatArgs(argsStr);
  if (args.length < 7) return null;
  const urlPrefix = args[0];
  const chatId = args[2];
  const channelId = parseInt(args[6], 10);
  if (!urlPrefix || !chatId || Number.isNaN(channelId)) return null;
  return {
    streamUrl: `${urlPrefix.replace(/\/$/, '')}/chat/${chatId}/stream`,
    chatId,
    channelId
  };
}

/** When RumbleChat isn’t in SSR HTML, JSON blobs sometimes embed the stream URL. */
function parseRumbleStreamUrlFallback(html) {
  const m = html.match(/https:\/\/[a-z0-9.-]*rumble\.com\/chat\/[a-f0-9-]{8,}\/stream/i);
  if (!m) return null;
  return { streamUrl: m[0], chatId: 'fallback', channelId: 1 };
}

function parseChatEventJson(buf) {
  try {
    const ce = JSON.parse(buf);
    const users = {};
    for (const u of ce.data?.users || []) {
      users[u.id] = u;
    }
    const out = [];
    for (const m of ce.data?.messages || []) {
      const user = users[m.user_id];
      const text = (m.text || '').trim();
      if (!text) continue;
      out.push({ username: user?.username || '?', message: text });
    }
    return out;
  } catch (_) {
    return [];
  }
}

function runSsePump(info, pageUrl, onMessage) {
  const u = new URL(info.streamUrl);
  let req;
  let destroyed = false;
  let carry = '';

  const pump = () => {
    if (destroyed) return;
    req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'User-Agent': UA,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          Referer: pageUrl.split('?')[0]
        }
      },
      (res) => {
        res.on('data', (chunk) => {
          if (destroyed) return;
          carry += chunk.toString('utf8');
          for (;;) {
            let sep = carry.indexOf('\r\n\r\n');
            if (sep === -1) sep = carry.indexOf('\n\n');
            if (sep === -1) break;
            const block = carry.slice(0, sep).trim();
            carry = carry.slice(sep).replace(/^[\r\n]+/, '');
            const lines = block.split(/\r?\n/);
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const payload = line.slice(5).trim();
                if (payload && payload[0] === '{') {
                  const rows = parseChatEventJson(payload);
                  for (const r of rows) onMessage(r.username, r.message);
                }
              }
            }
          }
        });
        res.on('end', () => {
          if (!destroyed) setTimeout(pump, 2000);
        });
        res.on('error', () => {
          if (!destroyed) setTimeout(pump, 3000);
        });
      }
    );
    req.on('error', () => {
      if (!destroyed) setTimeout(pump, 3000);
    });
    req.setTimeout(0);
    req.end();
  };

  pump();

  return {
    ok: true,
    stop: () => {
      destroyed = true;
      try {
        if (req) req.destroy();
      } catch (_) {}
    }
  };
}

/**
 * @param {string} pageUrl — rumble.com/v/… or /c/…
 * @param {(username: string, message: string) => void} onMessage
 * @returns {Promise<{ ok: boolean, stop: () => void }>}
 */
function start(pageUrl, onMessage) {
  const tryHtml = (body) => {
    if (!body || body.length < 200) return null;
    const info = parseRumbleChatFromHtml(body) || parseRumbleStreamUrlFallback(body);
    if (!info || !info.streamUrl) return null;
    return runSsePump(info, pageUrl, onMessage);
  };

  return fetchHtmlElectronNet(pageUrl)
    .then((electronBody) => {
      const r1 = electronBody ? tryHtml(electronBody) : null;
      if (r1 && r1.ok) return r1;
      return httpsGet(pageUrl).then(({ status, body }) => {
        if (status !== 200 || !body) return { ok: false, stop: () => {} };
        const r2 = tryHtml(body);
        return r2 && r2.ok ? r2 : { ok: false, stop: () => {} };
      });
    })
    .catch(() =>
      httpsGet(pageUrl).then(({ status, body }) => {
        if (status !== 200 || !body) return { ok: false, stop: () => {} };
        const r2 = tryHtml(body);
        return r2 && r2.ok ? r2 : { ok: false, stop: () => {} };
      })
    );
}

module.exports = { start, parseRumbleChatFromHtml, parseRumbleStreamUrlFallback, extractRumbleChatArgumentsString };
