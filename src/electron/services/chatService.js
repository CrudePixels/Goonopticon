const path = require('path');
const net = require('net');
const https = require('https');
const WebSocket = require('ws');

const storage = require('../storage/adapter');
const platformActions = require('./platformActions');
const youtubeInnertubeChat = require('./youtubeInnertubeChat');
const rumbleSseChat = require('./rumbleSseChat');
const discordChat = require('./discordChat');

let rumbleSseStopFns = new Map();

function stopAllRumbleSse() {
  for (const stop of rumbleSseStopFns.values()) {
    try {
      stop();
    } catch (_) {}
  }
  rumbleSseStopFns.clear();
}

function getElectronBrowserWindow() {
  try {
    return require('electron').BrowserWindow;
  } catch (_) {
    return null;
  }
}

/** Kick's JSON API often 403s plain Node https (Cloudflare); browser session can still read __NEXT_DATA__. */
const KICK_PAGE_EXTRACT_CHATROOM_JS = `(function(){
  try {
    var el = document.getElementById('__NEXT_DATA__');
    if (el && el.textContent) {
      var j = JSON.parse(el.textContent);
      var p = j.props && j.props.pageProps;
      if (p) {
        var ch = p.channel || p.channelData || {};
        var ls = p.livestream || {};
        var id = (ch.chatroom && ch.chatroom.id) || ch.chatroom_id || ls.chatroom_id || (ls.chatroom && ls.chatroom.id);
        if (id != null && id !== '') return String(id);
      }
    }
  } catch (e) {}
  try {
    var html = document.documentElement ? document.documentElement.innerHTML : '';
    var m = html.match(/"chatroom_id":(\\d+)/);
    if (m) return m[1];
    m = html.match(/chatrooms\\.(\\d+)\\.v2/);
    if (m) return m[1];
  } catch (e2) {}
  return null;
})()`;

function kickChannelApiHeaders(slug) {
  const s = (slug || '').trim() || 'podawful';
  const referer = `https://kick.com/${encodeURIComponent(s)}`;
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: referer,
    Origin: 'https://kick.com',
    'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
  };
}

function getKickChatroomIdFromBrowserPage(slug) {
  const BrowserWindow = getElectronBrowserWindow();
  if (!BrowserWindow) return Promise.resolve(null);
  const s = (slug || '').trim() || DEFAULT_KICK_SLUG;
  return new Promise((resolve) => {
    let settled = false;
    const done = (id) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { win.destroy(); } catch (_) {}
      resolve(id && String(id).length ? String(id) : null);
    };
    const win = new BrowserWindow({
      show: false,
      width: 900,
      height: 800,
      x: -2800,
      y: -2800,
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    const timer = setTimeout(() => done(null), 22000);
    const tryExtract = () => win.webContents.executeJavaScript(KICK_PAGE_EXTRACT_CHATROOM_JS).catch(() => null);
    const run = () => {
      tryExtract().then((id) => {
        if (id) done(id);
      });
    };
    win.webContents.once('did-finish-load', () => {
      run();
      setTimeout(run, 2500);
      setTimeout(() => {
        if (!settled) tryExtract().then((id) => { if (id) done(id); });
      }, 6000);
    });
    win.webContents.once('did-fail-load', () => {
      clearTimeout(timer);
      done(null);
    });
    win.loadURL(`https://kick.com/${encodeURIComponent(s)}`).catch(() => {
      clearTimeout(timer);
      done(null);
    });
  });
}

// --- Twitch IRC ---
const TWITCH_IRC_HOST = 'irc.chat.twitch.tv';
const TWITCH_IRC_PORT = 6667;
const DEFAULT_TWITCH_CHANNEL = 'podawful';

// --- Kick Pusher ---
const KICK_PUSHER_KEY = '32cbd69e4b950bf97679';
const KICK_PUSHER_CLUSTER = 'us2';
const DEFAULT_KICK_SLUG = 'podawful';

// --- YouTube ---
const YOUTUBE_POLL_MS = 2000;

// --- DLive ---
const DLIVE_WS_URL = 'wss://api-ws.dlive.tv/graphql';

// --- Odysee (live chat WS is via Sockety; see odysee-frontend redux/actions/websocket.js) ---
const ODYSEE_SOCKETY_COMMENTRON = 'wss://sockety.odysee.tv/ws/commentron';
const ODYSEE_COMMENTRON_BASES = ['wss://commentron.odysee.com', 'wss://commentron.lbry.com'];
const DEFAULT_ODYSEE_CHANNEL = 'podawful';

let addedStreams = [];
let sendToRenderer = null;

let twitchChannels = [];
let twitchSocket = null;
let kickSlugs = [];
let kickWs = null;
let kickSubs = new Map(); // chatroomId -> slug (for multi-channel)
let youtubePollTimer = null;
let youtubeLiveChatId = null;
let youtubeNextPageToken = null;
let dliveWs = null;
let odyseeWs = null;

function emit(platformId, platformName, username, message, extra) {
  if (typeof sendToRenderer !== 'function') return;
  const pid = platformId && String(platformId).toLowerCase();
  const pname = platformName && String(platformName);
  const msg = message != null ? String(message) : '';
  if (!pid || !msg) return;
  sendToRenderer({
    platformId: pid,
    platformName: pname || pid,
    username: username != null ? String(username) : '?',
    message: msg,
    ...(extra && typeof extra === 'object' ? extra : {}),
    timestamp: Date.now()
  });
}

// ---------- Twitch ----------
function connectTwitch(channels) {
  if (!channels || channels.length === 0) return;
  twitchChannels = channels;
  if (twitchSocket) return;
  const socket = new net.Socket();
  let buffer = '';
  let joined = false;
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      if (line.startsWith('PING ')) {
        socket.write('PONG ' + line.slice(5).trim() + '\r\n');
        continue;
      }
      if (!joined && (line.includes(' 001 ') || line.includes(' 376 ') || line.includes(' 366 '))) {
        const joinList = twitchChannels.map((c) => '#' + c.toLowerCase()).join(',');
        socket.write(`JOIN ${joinList}\r\n`);
        joined = true;
        continue;
      }
      let username, message, bits;
      if (line.startsWith('@')) {
        const spaceIdx = line.indexOf(' ');
        const tagStr = spaceIdx >= 0 ? line.slice(1, spaceIdx) : '';
        const rest = spaceIdx >= 0 ? line.slice(spaceIdx + 1) : '';
        for (const pair of tagStr.split(';')) {
          const eq = pair.indexOf('=');
          if (eq > 0 && pair.slice(0, eq) === 'bits') {
            const v = pair.slice(eq + 1);
            if (v) bits = parseInt(v, 10);
            break;
          }
        }
        const privWithTags = rest.match(/^:([^!]+)![^ ]+ PRIVMSG #([^ ]+) :(.+)$/);
        if (privWithTags) {
          username = privWithTags[1].trim();
          message = privWithTags[3].trim();
        }
      } else {
        const privmsg = line.match(/^:([^!]+)![^ ]+ PRIVMSG #([^ ]+) :(.+)$/);
        if (privmsg) {
          username = privmsg[1].trim();
          message = privmsg[3].trim();
        }
      }
      if (username != null && message != null) {
        const extra = bits != null && !Number.isNaN(bits) ? { donationAmount: bits, donationCurrency: 'bits' } : undefined;
        emit('twitch', 'Twitch', username, message, extra);
      }
    }
  });
  socket.on('close', () => { twitchSocket = null; });
  socket.on('error', () => { twitchSocket = null; });
  socket.connect(TWITCH_IRC_PORT, TWITCH_IRC_HOST, () => {
    const nick = 'justinfan' + Math.floor(Math.random() * 100000);
    socket.write(`CAP REQ :twitch.tv/tags\r\n`);
    socket.write(`NICK ${nick}\r\n`);
    socket.write(`USER ${nick} 0 * :${nick}\r\n`);
  });
  twitchSocket = socket;
}

function disconnectTwitch() {
  twitchChannels = [];
  if (twitchSocket) {
    try { twitchSocket.destroy(); } catch (_) {}
    twitchSocket = null;
  }
}

// ---------- Kick (Pusher + scraper fallback) ----------
// Channel must be chatrooms.{id}.v2; event is App\Events\ChatMessageEvent. See https://github.com/retconned/kickchat-client
function extractKickChatroomIdFromChannelJson(j) {
  if (!j || typeof j !== 'object') return null;
  const id =
    j.chatroom?.id ??
    j.chatroom_id ??
    j.data?.chatroom?.id ??
    j.data?.chatroom_id ??
    j.livestream?.chatroom?.id ??
    j.livestream?.chatroom_id ??
    j.livestream?.channel?.chatroom?.id ??
    j.channel?.chatroom?.id ??
    j.channel?.chatroom_id ??
    j.stream?.chatroom?.id ??
    j.stream?.chatroom_id ??
    j.broadcast?.chatroom?.id;
  if (id != null && String(id).length > 0) return String(id);
  return null;
}

function getKickChatroomIdHttps(slug) {
  return new Promise((resolve) => {
    const s = (slug || '').trim() || DEFAULT_KICK_SLUG;
    const headers = kickChannelApiHeaders(s);
    const channelUrl = `https://kick.com/api/v2/channels/${encodeURIComponent(s)}`;
    const req = https.get(channelUrl, { headers }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          const id = extractKickChatroomIdFromChannelJson(j);
          if (id != null) {
            resolve(String(id));
            return;
          }
        } catch (_) {}
        const chatroomReq = https.get(
          `https://kick.com/api/v2/channels/${encodeURIComponent(s)}/chatroom`,
          { headers },
          (res2) => {
            let b = '';
            res2.on('data', (c) => { b += c; });
            res2.on('end', () => {
              try {
                const j2 = JSON.parse(b);
                const id2 = extractKickChatroomIdFromChannelJson(j2) ?? j2.id ?? j2.data?.id ?? j2.chatroom?.id ?? j2.chatroom_id;
                resolve(id2 != null ? String(id2) : null);
              } catch {
                resolve(null);
              }
            });
          }
        );
        chatroomReq.on('error', () => resolve(null));
        chatroomReq.setTimeout(8000, () => { chatroomReq.destroy(); resolve(null); });
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

/** Kick blocks Node https (Cloudflare); Chromium net stack matches the desktop app. */
function kickChatroomIdViaElectronNet(slug) {
  return new Promise((resolve) => {
    let net;
    try {
      net = require('electron').net;
    } catch (_) {
      resolve(null);
      return;
    }
    if (!net || typeof net.fetch !== 'function') {
      resolve(null);
      return;
    }
    const s = (slug || '').trim() || DEFAULT_KICK_SLUG;
    const url = `https://kick.com/api/v2/channels/${encodeURIComponent(s)}`;
    const h = kickChannelApiHeaders(s);
    net
      .fetch(url, { headers: h })
      .then((res) => (res && res.ok ? res.json() : null))
      .then((j) => {
        if (!j || typeof j !== 'object') {
          resolve(null);
          return;
        }
        const id = extractKickChatroomIdFromChannelJson(j);
        resolve(id || null);
      })
      .catch(() => resolve(null));
  });
}

function getKickChatroomId(slug) {
  return kickChatroomIdViaElectronNet(slug)
    .then((id) => id || getKickChatroomIdHttps(slug))
    .then((id) => id || getKickChatroomIdFromBrowserPage(slug));
}

function connectKick(slugs) {
  if (!slugs || slugs.length === 0) return;
  kickSlugs = slugs;
  const slugsSnapshot = slugs.slice();
  Promise.all(slugsSnapshot.map((slug) => getKickChatroomId(slug).then((id) => (id ? { slug, id } : null)))).then((results) => {
    const subs = results.filter(Boolean);
    if (kickWs) return;
    if (kickSlugs.length !== slugsSnapshot.length || kickSlugs.some((s, i) => slugsSnapshot[i] !== s)) return;
    if (subs.length === 0) {
      // API failed (e.g. 403): fall back to Kick scraper per channel
      slugsSnapshot.forEach((slug) => {
        startScraperFor('kick:' + slug, 'Kick', 'https://kick.com/' + slug);
      });
      return;
    }
    kickSubs = new Map(subs.map((r) => [r.id, r.slug]));
    // Scraper in parallel with Pusher: dedupe in main.js; scraper is fallback when Pusher events change/break.
    slugsSnapshot.forEach((slug) => {
      startScraperFor('kick:' + slug, 'Kick', 'https://kick.com/' + slug);
    });
    const url = `wss://ws-${KICK_PUSHER_CLUSTER}.pusher.com/app/${KICK_PUSHER_KEY}?protocol=7&client=js&version=8.4.0&flash=false`;
    const ws = new WebSocket(url);
    kickWs = ws;
    const subscribeToKickChannels = () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      subs.forEach((r) => {
        ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: `chatrooms.${r.id}.v2` } }));
      });
    };
    // kickchat-client subscribes on socket open; some stacks need connection_established too — do both.
    ws.on('open', () => {
      subscribeToKickChannels();
    });
    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch (_) { return; }
      const ev = (msg.event || '').toString();
      const evLower = ev.toLowerCase();
      const dataStr = msg.data;
      if (ev === 'pusher:connection_established') {
        subscribeToKickChannels();
        return;
      }
      if (ev === 'pusher:pong') return;
      if (ev === 'pusher_internal:subscription_succeeded') return;
      const isChatEvent =
        ev === 'App\\Events\\ChatMessageEvent' ||
        ev.includes('ChatMessageEvent') ||
        ev.includes('ChatMessageSent') ||
        ev.includes('chat.message.sent') ||
        ev.includes('MessageSent') ||
        evLower.includes('chatmessage') ||
        (evLower.includes('message') && evLower.includes('sent')) ||
        evLower.includes('chat.message');
      if (!isChatEvent) return;
      try {
        const payload = typeof dataStr === 'string' ? JSON.parse(dataStr) : (dataStr && typeof dataStr === 'object' ? dataStr : null);
        if (!payload) return;
        let content = payload.content ?? payload.message ?? payload.text ?? '';
        if (!content && Array.isArray(payload.parts)) {
          content = payload.parts.map((p) => (p && (p.text || p.content)) || '').join('');
        }
        const user =
          payload.sender?.username ??
          payload.sender?.slug ??
          payload.user?.username ??
          payload.user?.login ??
          payload.username ??
          '?';
        if (content) emit('kick', 'Kick', user, content);
      } catch (_) {}
    });
    ws.on('close', () => {
      kickWs = null;
      kickSubs = new Map();
    });
    ws.on('error', () => {
      kickWs = null;
      kickSubs = new Map();
    });
  });
}

function disconnectKick() {
  kickSlugs = [];
  kickSubs = new Map();
  if (kickWs) {
    try { kickWs.close(); } catch (_) {}
    kickWs = null;
  }
}

// ---------- YouTube ----------
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function youtubeGetLiveChatIdForVideo(apiKey, videoId) {
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return Promise.resolve(null);
  const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
  return httpsGet(videoUrl).then(({ status, body }) => {
    if (status !== 200) return null;
    try {
      const v = JSON.parse(body);
      return v.items?.[0]?.liveStreamingDetails?.activeLiveChatId || null;
    } catch { return null; }
  }).catch(() => null);
}

function youtubeFindLiveChatId(apiKey, searchTerm) {
  return platformActions
    .resolveYouTubeLiveVideoId(apiKey, searchTerm || 'podawful')
    .then((vid) => (vid ? youtubeGetLiveChatIdForVideo(apiKey, vid) : null));
}

let youtubeSearchTerm = 'podawful';
function youtubePoll(apiKey) {
  if (!youtubeLiveChatId) {
    const tryVideo = /^[a-zA-Z0-9_-]{11}$/.test(youtubeSearchTerm)
      ? youtubeGetLiveChatIdForVideo(apiKey, youtubeSearchTerm)
      : youtubeFindLiveChatId(apiKey, youtubeSearchTerm);
    tryVideo.then((id) => {
      youtubeLiveChatId = id;
      youtubeNextPageToken = null;
      if (id) youtubePoll(apiKey);
      else if (addedStreams.some((sid) => typeof sid === 'string' && sid.startsWith('youtube'))) {
        // Stream not live / no chat id yet — retry so we pick up when they go live (scraper runs in parallel).
        youtubePollTimer = setTimeout(() => {
          youtubePollTimer = null;
          youtubePoll(apiKey);
        }, 15000);
      }
    });
    return;
  }
  let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${encodeURIComponent(youtubeLiveChatId)}&part=snippet,authorDetails&key=${encodeURIComponent(apiKey)}`;
  if (youtubeNextPageToken) url += '&pageToken=' + encodeURIComponent(youtubeNextPageToken);
  httpsGet(url).then(({ status, body }) => {
    try {
      const j = JSON.parse(body);
      youtubeNextPageToken = j.nextPageToken || null;
      const pollingMillis = j.pollingIntervalMillis ? Math.min(Math.max(Number(j.pollingIntervalMillis), 1000), 10000) : YOUTUBE_POLL_MS;
      const items = j.items || [];
      for (const it of items) {
        const sn = it.snippet;
        const author = it.authorDetails;
        if (!sn) continue;
        if (sn.type === 'textMessageEvent' && sn.textMessageDetails?.messageText) {
          const username = author?.displayName || author?.display_name || '?';
          const ex = {};
          if (author?.channelId) ex.channelId = author.channelId;
          const av = author?.profileImageUrl || author?.thumbnailUrl;
          if (av) ex.avatarUrl = String(av);
          emit('youtube', 'YouTube', username, sn.textMessageDetails.messageText, Object.keys(ex).length ? ex : undefined);
        } else if (sn.type === 'superChatEvent' && sn.superChatDetails) {
          const username = author?.displayName || author?.display_name || '?';
          const micros = parseInt(sn.superChatDetails.amountMicros, 10);
          const amount = Number.isFinite(micros) ? micros / 1e6 : 0;
          const currency = sn.superChatDetails.currency || 'USD';
          const comment = sn.superChatDetails.userComment || sn.superChatDetails.commentText || '';
          const extra = { donationAmount: amount, donationCurrency: currency };
          if (author?.channelId) extra.channelId = author.channelId;
          const av = author?.profileImageUrl || author?.thumbnailUrl;
          if (av) extra.avatarUrl = String(av);
          emit('youtube', 'YouTube', username, comment, extra);
        } else if (sn.type === 'superStickerEvent' && sn.superStickerDetails) {
          const username = author?.displayName || author?.display_name || '?';
          const micros = parseInt(sn.superStickerDetails.amountMicros, 10);
          const amount = Number.isFinite(micros) ? micros / 1e6 : 0;
          const currency = sn.superStickerDetails.currency || 'USD';
          const altText = sn.superStickerDetails?.superStickerMetadata?.altText || 'Sticker';
          const extra = { donationAmount: amount, donationCurrency: currency };
          if (author?.channelId) extra.channelId = author.channelId;
          const av = author?.profileImageUrl || author?.thumbnailUrl;
          if (av) extra.avatarUrl = String(av);
          emit('youtube', 'YouTube', username, altText, extra);
        }
      }
      if (addedStreams.some((id) => typeof id === 'string' && id.startsWith('youtube'))) {
        youtubePollTimer = setTimeout(() => youtubePoll(apiKey), pollingMillis);
      }
    } catch (_) {
      if (addedStreams.some((id) => typeof id === 'string' && id.startsWith('youtube'))) youtubePollTimer = setTimeout(() => youtubePoll(apiKey), YOUTUBE_POLL_MS);
    }
  }).catch(() => {
    youtubeLiveChatId = null;
    if (addedStreams.some((id) => typeof id === 'string' && id.startsWith('youtube'))) youtubePollTimer = setTimeout(() => youtubePoll(apiKey), YOUTUBE_POLL_MS);
  });
}

function connectYouTube(videoIdOrSearchTerm) {
  const apiKey = (storage.getYouTubeChatApiKey || (() => ''))();
  if (!apiKey || youtubePollTimer) return;
  youtubeSearchTerm = (videoIdOrSearchTerm || 'podawful').trim();
  youtubeLiveChatId = null;
  youtubeNextPageToken = null;
  youtubePoll(apiKey);
}

function disconnectYouTube() {
  if (youtubePollTimer) {
    clearTimeout(youtubePollTimer);
    youtubePollTimer = null;
  }
  youtubeLiveChatId = null;
  youtubeNextPageToken = null;
}

// ---------- DLive (GraphQL WS; must wait for connection_ack before start — see DLive API docs) ----------
function connectDLive(streamer) {
  const raw = (streamer || 'podawful').replace(/"/g, '').trim() || 'podawful';
  // Must open a fresh socket when streamer list changes; stale dliveWs used to block forever (if (dliveWs) return).
  if (dliveWs) {
    try {
      dliveWs.close();
    } catch (_) {}
    dliveWs = null;
  }
  const ws = new WebSocket(DLIVE_WS_URL, ['graphql-ws']);
  dliveWs = ws;
  let acked = false;
  const sendSubscribe = () => {
    if (!acked || ws.readyState !== WebSocket.OPEN) return;
    const gqlStreamer = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    ws.send(
      JSON.stringify({
        id: '1',
        type: 'start',
        payload: {
          query: `subscription{streamMessageReceived(streamer:"${gqlStreamer}"){__typename}}`
        }
      })
    );
  };
  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
  });
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ka') return;
      if (msg.type === 'connection_ack') {
        acked = true;
        sendSubscribe();
        return;
      }
      if (msg.type !== 'data' && msg.type !== 'next') {
        return;
      }
      const payload = msg.payload;
      const dataRoot = payload?.data ?? msg.data;
      const received = dataRoot?.streamMessageReceived;
      if (!received) return;
      const list = Array.isArray(received) ? received : [received];
      const skipTypename = new Set(['Gift', 'Follow', 'Subscription', 'Host', 'Ban', 'Timeout', 'Delete', 'Emote', 'ChatMode', 'Mod']);
      for (const ev of list) {
        if (!ev || typeof ev.content !== 'string' || !ev.content.trim()) continue;
        if (ev.__typename && skipTypename.has(ev.__typename)) continue;
        if (ev.type && ev.type !== 'Message') continue;
        const username = ev.sender?.username || ev.sender?.displayname || '?';
        emit('dlive', 'DLive', username, ev.content.trim());
      }
    } catch (_) {}
  });
  ws.on('close', () => {
    dliveWs = null;
  });
  ws.on('error', () => {
    dliveWs = null;
  });
}

function disconnectDLive() {
  if (dliveWs) {
    try { dliveWs.close(); } catch (_) {}
    dliveWs = null;
  }
}

// ---------- Odysee (commentron WebSocket; resolve livestream via LBRY API when possible) ----------
const LBRY_PROXIES = [
  'https://api.odysee.com/api/v1/proxy',
  'https://api.na-backend.odysee.com/api/v1/proxy',
  'https://api.lbry.tv/api/v1/proxy'
];

function pickResolvedLbryClaim(result, preferredKey) {
  if (!result || typeof result !== 'object') return null;
  const pref = result[preferredKey];
  if (pref && typeof pref === 'object' && !pref.error && pref.claim_id) return pref;
  for (const k of Object.keys(result)) {
    const v = result[k];
    if (v && typeof v === 'object' && !v.error && v.claim_id) return v;
  }
  return null;
}

function resolveOdyseeLivestream(channel, cb) {
  const ch = (channel || DEFAULT_ODYSEE_CHANNEL).replace(/^@/, '');
  const lbryUrl = `lbry://@${ch}/live`;
  const body = JSON.stringify({ method: 'resolve', params: { urls: [lbryUrl] } });
  let proxyIdx = 0;
  function tryProxy() {
    if (proxyIdx >= LBRY_PROXIES.length) {
      cb(null, null);
      return;
    }
    const u = new URL(LBRY_PROXIES[proxyIdx++]);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body, 'utf8') }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            const result = j.result || j;
            const claim = pickResolvedLbryClaim(result, lbryUrl);
            if (!claim || typeof claim !== 'object' || claim.error) {
              tryProxy();
              return;
            }
            const streamClaimId = claim.claim_id || null;
            const signing = claim.signing_channel;
            let category = null;
            if (signing && signing.canonical_url) {
              category = String(signing.canonical_url)
                .replace(/^lbry:\/\//i, '')
                .replace(/#/g, ':');
            } else if (signing && signing.name) {
              const n = String(signing.name);
              category = n.startsWith('@') ? n : '@' + n;
            }
            cb(null, {
              streamClaimId,
              category,
              signingCanonical: signing && signing.canonical_url ? String(signing.canonical_url) : null
            });
          } catch (_) {
            tryProxy();
          }
        });
      }
    );
    req.on('error', () => tryProxy());
    req.setTimeout(6000, () => {
      req.destroy();
      tryProxy();
    });
    req.write(body);
    req.end();
  }
  tryProxy();
}

function connectOdysee(channel) {
  if (odyseeWs) return;
  const rawWithAt = (channel || DEFAULT_ODYSEE_CHANNEL).trim();
  const stream = rawWithAt.replace(/^@/, '');
  const odyseeViewerStreamKey = 'odysee:' + stream;
  function emitComment(c) {
    if (!c || typeof c !== 'object') return;
    const channelName =
      c.channel_name ||
      c.channelName ||
      c.signing_channel?.name ||
      c.channel?.name ||
      c.channel?.channel_name ||
      '';
    const nickname = channelName.startsWith('@') ? channelName.slice(1) : channelName || '?';
    const text = String(
      c.comment ||
        c.comment_text ||
        c.text ||
        c.message ||
        c.body ||
        (typeof c.value === 'string' ? c.value : '') ||
        ''
    ).trim();
    if (text) emit('odysee', 'Odysee', nickname, text);
  }
  function onSocketMessage(data) {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'viewers' && msg.data != null) {
        const c = msg.data.connected;
        if (typeof c === 'number' && !Number.isNaN(c) && c >= 0 && ensureChatScraper() && chatScraper.reportSocketViewerCount) {
          chatScraper.reportSocketViewerCount(odyseeViewerStreamKey, c);
        }
        return;
      }
      if (msg.type === 'delta' && msg.data?.comment) emitComment(msg.data.comment);
      else if (msg.type === 'delta' && msg.data) emitComment(msg.data);
      else if (msg.type === 'comment' && msg.data) emitComment(msg.data);
      else if (msg.comment) emitComment(msg);
      else if (msg.data?.comment) emitComment(msg.data.comment);
    } catch (_) {}
  }
  resolveOdyseeLivestream(rawWithAt, (_, info) => {
    const urls = [];
    const addUrl = (u) => {
      if (u && typeof u === 'string' && !urls.includes(u)) urls.push(u);
    };
    const claimId =
      info && info.streamClaimId && /^[a-f0-9]{40}$/i.test(String(info.streamClaimId))
        ? String(info.streamClaimId)
        : null;
    const categories = [];
    const addCat = (c) => {
      if (c == null) return;
      const s = String(c).trim();
      if (!s || categories.includes(s)) return;
      categories.push(s);
    };
    if (info) {
      addCat(info.category);
      if (info.signingCanonical) {
        addCat(String(info.signingCanonical).replace(/^lbry:\/\//i, '').replace(/#/g, ':'));
      }
    }
    addCat('@' + stream);
    addCat(stream);
    if (rawWithAt.startsWith('@')) addCat(rawWithAt);

    if (claimId) {
      for (const cat of categories) {
        addUrl(
          `${ODYSEE_SOCKETY_COMMENTRON}?${new URLSearchParams({
            id: claimId,
            category: cat,
            sub_category: 'viewer'
          }).toString()}`
        );
      }
      for (const base of ODYSEE_COMMENTRON_BASES) {
        addUrl(`${base}/api/v2?claim_id=${encodeURIComponent(claimId)}`);
      }
    }

    if (!urls.length) return;

    let ai = 0;
    let connectGen = 0;
    function tryConnect() {
      if (odyseeWs) return;
      if (ai >= urls.length) return;
      const wsUrl = urls[ai];
      const myGen = ++connectGen;
      const ws = new WebSocket(wsUrl);
      ws.on('message', onSocketMessage);
      let opened = false;
      const t = setTimeout(() => {
        if (opened || myGen !== connectGen) return;
        try {
          ws.close();
        } catch (_) {}
        ai++;
        tryConnect();
      }, 8000);
      ws.on('open', () => {
        if (myGen !== connectGen) {
          try {
            ws.close();
          } catch (_) {}
          return;
        }
        opened = true;
        clearTimeout(t);
        odyseeWs = ws;
      });
      ws.on('error', () => {
        clearTimeout(t);
        try {
          ws.close();
        } catch (_) {}
        if (odyseeWs === ws) odyseeWs = null;
        if (!opened && myGen === connectGen) {
          ai++;
          tryConnect();
        }
      });
      ws.on('close', () => {
        clearTimeout(t);
        if (odyseeWs === ws) odyseeWs = null;
      });
    }
    tryConnect();
  });
}

function disconnectOdysee() {
  if (odyseeWs) {
    try { odyseeWs.close(); } catch (_) {}
    odyseeWs = null;
  }
  if (ensureChatScraper() && chatScraper.clearSocketViewerCountsWithPrefix) {
    chatScraper.clearSocketViewerCountsWithPrefix('odysee:');
  }
}

// ---------- Scraper (hidden window) for YouTube, Rumble, Pod Awful ----------
let chatScraper = null;

function ensureChatScraper() {
  if (chatScraper && typeof chatScraper.start === 'function') return true;
  try {
    chatScraper = require(path.join(__dirname, 'chatScraper'));
    if (chatScraper && typeof chatScraper.start === 'function') return true;
  } catch (_) {}
  try {
    chatScraper = require('./chatScraper');
    if (chatScraper && typeof chatScraper.start === 'function') return true;
  } catch (_) {}
  return false;
}

function startScraperFor(streamKey, platformName, urlOverride) {
  if (!ensureChatScraper()) return;
  const platformId = streamKey.indexOf(':') >= 0 ? streamKey.split(':')[0] : streamKey;
  chatScraper.start(streamKey, platformName, (payload) => {
    const msg = payload && payload.message != null ? String(payload.message).trim() : '';
    if (!msg) return;
    const username =
      payload && payload.username != null && String(payload.username).trim()
        ? String(payload.username).trim().slice(0, 200)
        : '?';
    const extra = {};
    if (payload.channelId) extra.channelId = payload.channelId;
    if (payload.donationAmount != null && payload.donationAmount !== '') extra.donationAmount = payload.donationAmount;
    if (payload.donationCurrency) extra.donationCurrency = payload.donationCurrency;
    emit(
      payload.platformId || platformId,
      payload.platformName || platformName,
      username,
      msg,
      Object.keys(extra).length ? extra : undefined
    );
  }, urlOverride ? { url: urlOverride } : undefined);
}

function stopScraperFor(platformIdOrStreamKey) {
  if (chatScraper && typeof chatScraper.stop === 'function') chatScraper.stop(platformIdOrStreamKey);
}

function stopAllScrapersForPlatform(platformId) {
  if (chatScraper && typeof chatScraper.stopAllForPlatform === 'function') chatScraper.stopAllForPlatform(platformId);
}

const KNOWN_PLATFORM_IDS = ['twitch', 'kick', 'youtube', 'rumble', 'podawful', 'dlive', 'odysee', 'discord'];
function hasYouTubeApiKey() {
  return !!(storage.getYouTubeChatApiKey && storage.getYouTubeChatApiKey());
}

function parseStreamKeys() {
  const twitch = [];
  const kick = [];
  const youtube = [];
  const rumble = [];
  const podawful = [];
  const odysee = [];
  const dlive = [];
  const discord = [];
  for (const id of addedStreams) {
    if (typeof id !== 'string') continue;
    if (id.startsWith('other:')) continue;
    const colon = id.indexOf(':');
    const platformId = colon >= 0 ? id.slice(0, colon) : id;
    const channel = colon >= 0 ? id.slice(colon + 1) : '';
    if (!KNOWN_PLATFORM_IDS.includes(platformId)) continue;
    if (platformId === 'twitch') twitch.push(channel || DEFAULT_TWITCH_CHANNEL);
    else if (platformId === 'kick') kick.push(channel || DEFAULT_KICK_SLUG);
    else if (platformId === 'youtube') youtube.push({ streamKey: id, channel });
    else if (platformId === 'rumble') rumble.push({ streamKey: id, channel });
    else if (platformId === 'podawful') podawful.push({ streamKey: id, channel });
    else if (platformId === 'odysee') odysee.push(channel || DEFAULT_ODYSEE_CHANNEL);
    else if (platformId === 'dlive') dlive.push(channel || 'PodAwful');
    else if (platformId === 'discord') {
      // We store channel as: <guildId>/<channelId>
      const parts = String(channel || '').split('/').filter(Boolean);
      const channelId = parts.length ? parts[parts.length - 1] : '';
      if (channelId) discord.push({ streamKey: id, channel, channelId });
    }
  }
  return { twitch, kick, youtube, rumble, podawful, odysee, dlive, discord };
}

function buildScraperUrl(platformId, channel) {
  if (platformId === 'youtube') {
    if (!channel) return 'https://www.youtube.com/@podawfulH2BH/live';
    if (channel.startsWith('@')) return `https://www.youtube.com/${channel}/live`;
    // Popout loads chat reliably; consent cookies are seeded in chatScraper before load.
    if (/^[a-zA-Z0-9_-]{11}$/.test(channel)) {
      const v = encodeURIComponent(channel);
      return `https://www.youtube.com/live_chat?is_popout=1&v=${v}&embed_domain=${encodeURIComponent('https://www.youtube.com')}`;
    }
    // Handle or short name: use /@channel/live so YouTube resolves correctly
    return `https://www.youtube.com/@${channel}/live`;
  }
  if (platformId === 'rumble') {
    if (!channel) return 'https://rumble.com/c/PODAWFUL';
    if (channel.startsWith('v:')) return `https://rumble.com/v/${encodeURIComponent(channel.slice(2))}`;
    return `https://rumble.com/c/${encodeURIComponent(channel)}`;
  }
  if (platformId === 'dlive') {
    const n = (channel || 'podawful').replace(/^@/, '').trim() || 'podawful';
    return `https://dlive.tv/${encodeURIComponent(n)}`;
  }
  if (platformId === 'podawful') return 'https://podawful.com/live';
  if (platformId === 'kick') return channel ? `https://kick.com/${channel}` : 'https://kick.com/' + DEFAULT_KICK_SLUG;
  if (platformId === 'odysee') {
    const ch = (channel || DEFAULT_ODYSEE_CHANNEL).replace(/^@/, '');
    return `https://odysee.com/@${ch}/live`;
  }
  return null;
}

function updateConnections() {
  if (!(storage.getChatUnifiedEnabled && storage.getChatUnifiedEnabled())) {
    disconnectTwitch();
    stopAllScrapersForPlatform('twitch');
    disconnectKick();
    stopAllScrapersForPlatform('kick');
    stopAllScrapersForPlatform('youtube');
    disconnectYouTube();
    youtubeInnertubeChat.stopAll();
    stopAllRumbleSse();
    stopAllScrapersForPlatform('rumble');
    stopAllScrapersForPlatform('odysee');
    disconnectOdysee();
    stopAllScrapersForPlatform('podawful');
    stopAllScrapersForPlatform('dlive');
    disconnectDLive();
    try { discordChat.stopDiscord(); } catch (_) {}
    return;
  }

  const parsed = parseStreamKeys();
  // Twitch: one IRC, JOIN all channels (disconnect first so channel list updates)
  if (parsed.twitch.length > 0) {
    disconnectTwitch();
    stopAllScrapersForPlatform('twitch');
    connectTwitch(parsed.twitch);
    const twAuth = storage.getPlatformAuth && storage.getPlatformAuth('twitch');
    const twitchHelix = !!(twAuth && twAuth.accessToken && twAuth.clientId);
    if (!twitchHelix) {
      parsed.twitch.forEach((login) => {
        const lg = (login || DEFAULT_TWITCH_CHANNEL).replace(/^#/, '').toLowerCase().trim();
        if (lg) startScraperFor('twitch:' + lg, 'Twitch', `https://www.twitch.tv/${encodeURIComponent(lg)}`);
      });
    }
  } else { disconnectTwitch(); stopAllScrapersForPlatform('twitch'); }
  // Kick: one Pusher, subscribe to all chatrooms (disconnect first so slug list updates)
  if (parsed.kick.length > 0) {
    disconnectKick();
    stopAllScrapersForPlatform('kick');
    connectKick(parsed.kick);
  } else { disconnectKick(); stopAllScrapersForPlatform('kick'); }
  // YouTube: Innertube get_live_chat (no key) when we can resolve a live video id; Data API when key set; scraper fallback for handles/offline UI
  stopAllScrapersForPlatform('youtube');
  disconnectYouTube();
  youtubeInnertubeChat.stopAll();
  if (parsed.youtube.length > 0) {
    if (hasYouTubeApiKey() && parsed.youtube.length === 1) {
      const y = parsed.youtube[0];
      connectYouTube(y.channel);
    } else {
      disconnectYouTube();
    }
    parsed.youtube.forEach(({ streamKey, channel }) => {
      const url = buildScraperUrl('youtube', channel);
      // Hidden-window scraper runs in parallel with Innertube — Innertube often 403s from Node; scraper uses Chromium.
      startScraperFor(streamKey, 'YouTube', url);
      youtubeInnertubeChat.resolveLiveVideoId(channel).then((vid) => {
        if (!addedStreams.some((id) => id === streamKey)) return;
        if (vid) {
          youtubeInnertubeChat.start(streamKey, vid, (author, text, extra) => {
            emit('youtube', 'YouTube', author, text, extra);
          });
        }
      });
    });
  }
  // Rumble: SSE from page RumbleChat(…) when available; DOM scraper if not
  stopAllScrapersForPlatform('rumble');
  stopAllRumbleSse();
  parsed.rumble.forEach(({ streamKey, channel }) => {
    const url = buildScraperUrl('rumble', channel);
    startScraperFor(streamKey, 'Rumble', url);
    rumbleSseChat.start(url, (username, message) => {
      emit('rumble', 'Rumble', username, message);
    }).then((r) => {
      if (r.ok) rumbleSseStopFns.set(streamKey, r.stop);
    });
  });
  stopAllScrapersForPlatform('podawful');
  parsed.podawful.forEach(({ streamKey }) => {
    startScraperFor(streamKey, 'Pod Awful', buildScraperUrl('podawful'));
  });
  // Odysee: commentron for first + scraper per stream as fallback
  stopAllScrapersForPlatform('odysee');
  if (parsed.odysee.length > 0) {
    disconnectOdysee();
    connectOdysee(parsed.odysee[0]);
    parsed.odysee.forEach((ch) => {
      startScraperFor('odysee:' + ch, 'Odysee', buildScraperUrl('odysee', ch));
    });
  } else disconnectOdysee();
  stopAllScrapersForPlatform('dlive');
  disconnectDLive();
  if (parsed.dlive.length > 0) {
    connectDLive(parsed.dlive[0]);
    parsed.dlive.forEach((ch) => {
      startScraperFor('dlive:' + ch, 'DLive', buildScraperUrl('dlive', ch));
    });
  }
  // Discord: bot token + gateway (no moderation/polls yet).
  try { discordChat.stopDiscord(); } catch (_) {}
  const discordToken = storage.getDiscordBotToken && storage.getDiscordBotToken();
  if (parsed.discord && parsed.discord.length > 0 && discordToken) {
    const channelIds = parsed.discord.map((d) => d.channelId).filter(Boolean);
    discordChat.startDiscord({
      token: discordToken,
      channelIds,
      onMessage: (p) => {
        const extra = {};
        if (p.channelId) extra.channelId = p.channelId;
        if (p.avatarUrl) extra.avatarUrl = p.avatarUrl;
        emit('discord', 'Discord', p.username, p.message, Object.keys(extra).length ? extra : undefined);
      }
    }).then((r) => {
      if (!r || r.ok !== true) {
        if (typeof logger !== 'undefined' && logger.warn) logger.warn('Discord chat failed', r?.error || '');
      }
    }).catch(() => {});
  }
}

function setAddedStreams(ids) {
  addedStreams = Array.isArray(ids) ? ids : [];
  updateConnections();
}

function init(sendToRendererFn) {
  sendToRenderer = sendToRendererFn;
  try {
    chatScraper = require(path.join(__dirname, 'chatScraper'));
  } catch (e) {
    try {
      chatScraper = require('./chatScraper');
    } catch (e2) {
      if (typeof console !== 'undefined' && console.warn) console.warn('Chat scraper failed to load:', (e && e.message) || (e2 && e2.message));
    }
  }
  addedStreams = storage.getChatAddedStreams();
  // Defer so main window can reach ready-to-show before spawning many hidden BrowserWindows (scrapers).
  setTimeout(() => {
    try {
      updateConnections();
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) console.warn('updateConnections failed:', err && err.message);
    }
  }, 1200);
}

module.exports = {
  setAddedStreams,
  init
};
