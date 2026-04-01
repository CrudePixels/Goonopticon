/**
 * Per-platform moderation (timeout, ban, mod) and polls.
 * User signs in via OAuth (Settings → Platform accounts → Sign in); we store the token.
 */

const https = require('https');
const storage = require('../storage/adapter');

const TWITCH_BROADCASTER_LOGIN = 'podawful';
const KICK_CHANNEL_SLUG = 'podawful';
const YOUTUBE_LIVECHAT_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';

const DEFAULT_TWITCH_LOGIN = 'podawful';
const DEFAULT_KICK_SLUG_VIEWERS = 'podawful';
const VIEWER_COUNT_PLATFORMS = ['twitch', 'kick', 'youtube'];

function parseAddedStreamsForViewerCounts(addedStreams) {
  const twitch = [];
  const kick = [];
  const youtube = [];
  if (!Array.isArray(addedStreams)) return { twitch, kick, youtube };
  for (const id of addedStreams) {
    if (typeof id !== 'string' || id.startsWith('other:')) continue;
    const colon = id.indexOf(':');
    const platformId = colon >= 0 ? id.slice(0, colon) : id;
    const channel = colon >= 0 ? id.slice(colon + 1) : '';
    if (!VIEWER_COUNT_PLATFORMS.includes(platformId)) continue;
    if (platformId === 'twitch') {
      const login = (channel || DEFAULT_TWITCH_LOGIN).replace(/^#/, '').toLowerCase().trim();
      if (login) twitch.push(login);
    } else if (platformId === 'kick') {
      const slug = (channel || DEFAULT_KICK_SLUG_VIEWERS).replace(/^@/, '').toLowerCase().trim();
      if (slug) kick.push(slug);
    } else if (platformId === 'youtube') {
      youtube.push(channel || '');
    }
  }
  return {
    twitch: [...new Set(twitch)],
    kick: [...new Set(kick)],
    youtube
  };
}

function httpsGetJson(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(buf || '{}'));
          } catch {
            resolve({});
          }
        });
      })
      .on('error', () => resolve({}));
  });
}

function kickPublicChannelHeaders(slug) {
  const s = (slug || '').trim() || DEFAULT_KICK_SLUG_VIEWERS;
  const referer = `https://kick.com/${encodeURIComponent(s)}`;
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: referer,
    Origin: 'https://kick.com'
  };
}

function kickPublicFetchChannel(slug) {
  const s = (slug || '').trim() || DEFAULT_KICK_SLUG_VIEWERS;
  const url = `https://kick.com/api/v2/channels/${encodeURIComponent(s)}`;
  // Kick often blocks Node https (Cloudflare). Prefer Electron net.fetch when available.
  try {
    const { net } = require('electron');
    if (net && typeof net.fetch === 'function') {
      return net
        .fetch(url, { headers: kickPublicChannelHeaders(s) })
        .then((res) => (res && res.ok ? res.text() : null))
        .then((t) => {
          try {
            return t ? JSON.parse(t) : {};
          } catch {
            return {};
          }
        })
        .catch(() => ({}));
    }
  } catch (_) {}
  return new Promise((resolve) => {
    https
      .get(url, { headers: kickPublicChannelHeaders(s) }, (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(buf || '{}'));
          } catch {
            resolve({});
          }
        });
      })
      .on('error', () => resolve({}));
  });
}

/**
 * Resolve the live broadcast video id for a stream key value (11-char id, UC… channel id, or @handle / slug).
 * Prefer channel-scoped live search so counts/chat match the intended channel, not arbitrary global search hits.
 */
async function resolveYouTubeLiveVideoId(apiKey, channelRaw) {
  const ch = (channelRaw || '').trim();
  if (!apiKey || !ch) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(ch)) return ch;
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(ch)) {
    const url =
      'https://www.googleapis.com/youtube/v3/search?part=id&channelId=' +
      encodeURIComponent(ch) +
      '&eventType=live&type=video&key=' +
      encodeURIComponent(apiKey);
    const res = await httpsGetJson(url);
    return res.items?.[0]?.id?.videoId || null;
  }
  const slug = ch.replace(/^@/, '').trim();
  if (!slug) return null;
  let channelId = null;
  const handleRes = await httpsGetJson(
    'https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=' +
      encodeURIComponent(slug) +
      '&key=' +
      encodeURIComponent(apiKey)
  );
  channelId = handleRes.items?.[0]?.id || null;
  if (!channelId) {
    const chSearch = await httpsGetJson(
      'https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=' +
        encodeURIComponent(slug) +
        '&key=' +
        encodeURIComponent(apiKey)
    );
    channelId = chSearch.items?.[0]?.id?.channelId || null;
  }
  if (channelId) {
    const liveRes = await httpsGetJson(
      'https://www.googleapis.com/youtube/v3/search?part=id&channelId=' +
        encodeURIComponent(channelId) +
        '&eventType=live&type=video&key=' +
        encodeURIComponent(apiKey)
    );
    const vid = liveRes.items?.[0]?.id?.videoId || null;
    if (vid) return vid;
  }
  const fallback = await httpsGetJson(
    'https://www.googleapis.com/youtube/v3/search?part=id&eventType=live&type=video&q=' +
      encodeURIComponent(slug) +
      '&key=' +
      encodeURIComponent(apiKey)
  );
  return fallback.items?.[0]?.id?.videoId || null;
}

async function youtubeConcurrentViewersForChannel(apiKey, channelRaw) {
  const videoId = await resolveYouTubeLiveVideoId(apiKey, channelRaw);
  if (!videoId) return 0;
  const videoUrl =
    'https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=' +
    encodeURIComponent(videoId) +
    '&key=' +
    encodeURIComponent(apiKey);
  const videoRes = await httpsGetJson(videoUrl);
  const concurrent = videoRes.items?.[0]?.liveStreamingDetails?.concurrentViewers;
  if (typeof concurrent === 'string') return parseInt(concurrent, 10) || 0;
  if (typeof concurrent === 'number') return concurrent;
  return 0;
}

function twitchRequest(method, path, auth, body) {
  const { accessToken, clientId } = auth || {};
  if (!accessToken || !clientId) return Promise.resolve({ ok: false, error: 'Twitch auth not set' });
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'api.twitch.tv',
        path: '/helix' + path,
        method,
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Client-Id': clientId,
          'Content-Type': 'application/json'
        }
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(buf || '{}');
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: j, status: res.statusCode });
          } catch {
            resolve({ ok: false, error: buf || 'Invalid response' });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

async function twitchGetUserId(login) {
  const auth = storage.getPlatformAuth('twitch');
  const r = await twitchRequest('GET', '/users?login=' + encodeURIComponent(login), auth);
  if (!r.ok || !r.data?.data?.[0]) return null;
  return r.data.data[0].id;
}

async function twitchGetTokenUserId() {
  const auth = storage.getPlatformAuth('twitch');
  const r = await twitchRequest('GET', '/users', auth);
  if (!r.ok || !r.data?.data?.[0]) return null;
  return r.data.data[0].id;
}

async function twitchGetBroadcasterId() {
  return twitchGetUserId(TWITCH_BROADCASTER_LOGIN);
}

// ---------- Kick ----------
function kickRequest(method, path, auth, body) {
  const token = auth?.accessToken;
  if (!token) return Promise.resolve({ ok: false, error: 'Kick auth not set' });
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'api.kick.com',
        path,
        method,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(buf || '{}');
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: j, status: res.statusCode });
          } catch {
            resolve({ ok: false, error: buf || 'Invalid response' });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

async function kickGetChannelBySlug(slug) {
  const auth = storage.getPlatformAuth('kick');
  const r = await kickRequest('GET', '/public/v1/channels?slug=' + encodeURIComponent(slug), auth);
  if (!r.ok || !r.data?.data?.[0]) return null;
  const id = r.data.data[0].broadcaster_user_id;
  return id != null ? Number(id) : null;
}

async function kickGetBroadcasterId() {
  const id = await kickGetChannelBySlug(KICK_CHANNEL_SLUG);
  return id;
}

async function kickGetUserIdBySlug(slug) {
  const id = await kickGetChannelBySlug(slug);
  return id;
}

// ---------- YouTube ----------
function youtubeRequest(method, path, auth, body, searchParams) {
  const token = auth?.accessToken;
  if (!token) return Promise.resolve({ ok: false, error: 'YouTube auth not set' });
  const qs = searchParams ? '?' + new URLSearchParams(searchParams).toString() : '';
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'www.googleapis.com',
        path: '/youtube/v3' + path + qs,
        method,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(buf || '{}');
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: j, status: res.statusCode });
          } catch {
            resolve({ ok: false, error: buf || 'Invalid response' });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

async function youtubeGetLiveChatId(auth) {
  const apiKey = storage.getYouTubeChatApiKey();
  if (!apiKey) return null;
  const searchUrl = 'https://www.googleapis.com/youtube/v3/search?part=id,snippet&eventType=live&type=video&q=podawful&key=' + encodeURIComponent(apiKey);
  const searchRes = await new Promise((resolve) => {
    https.get(searchUrl, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => { try { resolve(JSON.parse(buf || '{}')); } catch { resolve({}); } });
    }).on('error', () => resolve({}));
  });
  const vid = searchRes.items?.[0]?.id?.videoId;
  if (!vid) return null;
  const videoRes = await new Promise((resolve) => {
    https.get(
      'https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=' + vid + '&key=' + encodeURIComponent(apiKey),
      (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => { try { resolve(JSON.parse(buf || '{}')); } catch { resolve({}); } });
      }
    ).on('error', () => resolve({}));
  });
  return videoRes.items?.[0]?.liveStreamingDetails?.activeLiveChatId || null;
}

async function youtubeBan(auth, liveChatId, bannedChannelId, type, banDurationSeconds) {
  const body = {
    snippet: {
      liveChatId,
      type: type || 'temporary',
      bannedUserDetails: { channelId: bannedChannelId }
    }
  };
  if (type === 'temporary' && banDurationSeconds) body.snippet.banDurationSeconds = banDurationSeconds;
  const r = await youtubeRequest('POST', '/liveChat/bans', auth, body, { part: 'snippet' });
  return r;
}

// For YouTube timeout we use same ban with type temporary
async function youtubeTimeout(auth, liveChatId, bannedChannelId, durationSeconds) {
  return youtubeBan(auth, liveChatId, bannedChannelId, 'temporary', durationSeconds || 300);
}

async function timeoutUser(platformId, username, durationSeconds, opts) {
  const timeoutReason = (opts && typeof opts.reason === 'string' && opts.reason.trim()) ? opts.reason.trim().slice(0, 500) : 'Timeout from Goonopticon';
  if (platformId === 'twitch') {
    const auth = storage.getPlatformAuth('twitch');
    const broadcasterId = await twitchGetBroadcasterId();
    const userId = await twitchGetUserId(username);
    if (!broadcasterId || !userId) return { ok: false, error: 'User or channel not found' };
    const moderatorId = await twitchGetTokenUserId();
    if (!moderatorId) return { ok: false, error: 'Invalid Twitch token' };
    const r = await twitchRequest('POST', '/moderation/bans', auth, {
      broadcaster_id: broadcasterId,
      moderator_id: moderatorId,
      user_id: userId,
      duration: Math.max(1, Math.min(1209600, durationSeconds || 300)),
      reason: timeoutReason
    });
    return r.ok ? { ok: true } : { ok: false, error: r.data?.message || r.error };
  }
  if (platformId === 'kick') {
    const auth = storage.getPlatformAuth('kick');
    if (!auth?.accessToken) return { ok: false, error: 'Sign in to Kick in Settings first' };
    const broadcasterId = await kickGetBroadcasterId();
    const userId = await kickGetUserIdBySlug(username);
    if (!broadcasterId || !userId) return { ok: false, error: 'User or channel not found' };
    const durationMinutes = Math.max(1, Math.min(10080, Math.ceil((durationSeconds || 300) / 60)));
    const r = await kickRequest('POST', '/public/v1/moderation/bans', auth, {
      broadcaster_user_id: broadcasterId,
      user_id: userId,
      duration: durationMinutes,
      reason: timeoutReason
    });
    return r.ok ? { ok: true } : { ok: false, error: r.data?.message || r.error };
  }
  if (platformId === 'youtube') {
    const auth = storage.getPlatformAuth('youtube');
    if (!auth?.accessToken) return { ok: false, error: 'Sign in to YouTube in Settings first' };
    const channelId = opts?.channelId;
    if (!channelId) return { ok: false, error: 'YouTube timeout requires user channel ID (from chat)' };
    const liveChatId = await youtubeGetLiveChatId(auth);
    if (!liveChatId) return { ok: false, error: 'No active YouTube live chat' };
    const r = await youtubeTimeout(auth, liveChatId, channelId, durationSeconds || 300);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }
  return { ok: false, error: 'Moderation not supported for this platform' };
}

async function banUser(platformId, username, opts) {
  const banReason = (opts && typeof opts.reason === 'string' && opts.reason.trim()) ? opts.reason.trim().slice(0, 500) : 'Banned from Goonopticon';
  if (platformId === 'twitch') {
    const auth = storage.getPlatformAuth('twitch');
    const broadcasterId = await twitchGetBroadcasterId();
    const userId = await twitchGetUserId(username);
    if (!broadcasterId || !userId) return { ok: false, error: 'User or channel not found' };
    const moderatorId = await twitchGetTokenUserId();
    if (!moderatorId) return { ok: false, error: 'Invalid Twitch token' };
    const r = await twitchRequest('POST', '/moderation/bans', auth, {
      broadcaster_id: broadcasterId,
      moderator_id: moderatorId,
      user_id: userId,
      reason: banReason
    });
    return r.ok ? { ok: true } : { ok: false, error: r.data?.message || r.error };
  }
  if (platformId === 'kick') {
    const auth = storage.getPlatformAuth('kick');
    if (!auth?.accessToken) return { ok: false, error: 'Sign in to Kick in Settings first' };
    const broadcasterId = await kickGetBroadcasterId();
    const userId = await kickGetUserIdBySlug(username);
    if (!broadcasterId || !userId) return { ok: false, error: 'User or channel not found' };
    const r = await kickRequest('POST', '/public/v1/moderation/bans', auth, {
      broadcaster_user_id: broadcasterId,
      user_id: userId,
      reason: banReason
    });
    return r.ok ? { ok: true } : { ok: false, error: r.data?.message || r.error };
  }
  if (platformId === 'youtube') {
    const auth = storage.getPlatformAuth('youtube');
    if (!auth?.accessToken) return { ok: false, error: 'Sign in to YouTube in Settings first' };
    const channelId = opts?.channelId;
    if (!channelId) return { ok: false, error: 'YouTube ban requires user channel ID (not yet available from chat)' };
    const liveChatId = await youtubeGetLiveChatId(auth);
    if (!liveChatId) return { ok: false, error: 'No active YouTube live chat' };
    const r = await youtubeBan(auth, liveChatId, channelId, 'permanent');
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }
  return { ok: false, error: 'Moderation not supported for this platform' };
}

async function unbanUser(platformId, username, opts) {
  if (platformId === 'twitch') {
    const auth = storage.getPlatformAuth('twitch');
    const broadcasterId = await twitchGetBroadcasterId();
    const userId = await twitchGetUserId(username);
    if (!broadcasterId || !userId) return { ok: false, error: 'User or channel not found' };
    const moderatorId = await twitchGetTokenUserId();
    if (!moderatorId) return { ok: false, error: 'Invalid Twitch token' };
    const q = `broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&user_id=${userId}`;
    const r = await twitchRequest('DELETE', '/moderation/bans?' + q, auth);
    return r.ok || r.status === 204 ? { ok: true } : { ok: false, error: r.data?.message || r.error || 'Unban failed' };
  }
  if (platformId === 'kick') {
    const auth = storage.getPlatformAuth('kick');
    if (!auth?.accessToken) return { ok: false, error: 'Sign in to Kick in Settings first' };
    const broadcasterId = await kickGetBroadcasterId();
    const userId = await kickGetUserIdBySlug(username);
    if (!broadcasterId || !userId) return { ok: false, error: 'User or channel not found' };
    const q = `broadcaster_user_id=${broadcasterId}&user_id=${userId}`;
    const r = await kickRequest('DELETE', '/public/v1/moderation/bans?' + q, auth);
    return r.ok || r.status === 204 ? { ok: true } : { ok: false, error: r.data?.message || r.error || 'Unban failed' };
  }
  if (platformId === 'youtube') {
    return { ok: false, error: 'YouTube live chat unban not supported via API' };
  }
  return { ok: false, error: 'Moderation not supported for this platform' };
}

async function addMod(platformId, username) {
  if (platformId === 'twitch') {
    const auth = storage.getPlatformAuth('twitch');
    const broadcasterId = await twitchGetBroadcasterId();
    const userId = await twitchGetUserId(username);
    if (!broadcasterId || !userId) return { ok: false, error: 'User or channel not found' };
    const tokenUserId = await twitchGetTokenUserId();
    if (tokenUserId !== broadcasterId) return { ok: false, error: 'Only the broadcaster can add mods' };
    const r = await twitchRequest('POST', '/moderation/moderators', auth, {
      broadcaster_id: broadcasterId,
      user_id: userId
    });
    return r.ok ? { ok: true } : { ok: false, error: r.data?.message || r.error };
  }
  return { ok: false, error: 'Unsupported platform' };
}

async function createPoll(platformId, title, choices, durationSeconds) {
  if (platformId === 'twitch') {
    const auth = storage.getPlatformAuth('twitch');
    const broadcasterId = await twitchGetBroadcasterId();
    if (!broadcasterId) return { ok: false, error: 'Channel not found' };
    const opts = (choices || []).slice(0, 5).filter(Boolean).map((t) => ({ title: String(t).slice(0, 60) }));
    if (opts.length < 2) return { ok: false, error: 'Need 2–5 choices' };
    const r = await twitchRequest('POST', '/polls', auth, {
      broadcaster_id: broadcasterId,
      title: (title || 'Poll').slice(0, 60),
      choices: opts,
      duration: Math.max(15, Math.min(1800, durationSeconds || 300))
    });
    return r.ok ? { ok: true } : { ok: false, error: r.data?.message || r.error };
  }
  if (platformId === 'kick') {
    return { ok: false, error: 'Kick does not support polls via API yet' };
  }
  if (platformId === 'youtube') {
    const auth = storage.getPlatformAuth('youtube');
    if (!auth?.accessToken) return { ok: false, error: 'Sign in to YouTube in Settings first' };
    const liveChatId = await youtubeGetLiveChatId(auth);
    if (!liveChatId) return { ok: false, error: 'No active YouTube live chat' };
    const opts = (choices || []).slice(0, 4).filter(Boolean).map((t) => ({ optionText: String(t).slice(0, 100) }));
    if (opts.length < 2) return { ok: false, error: 'Need 2–4 choices for YouTube' };
    const body = {
      snippet: {
        liveChatId,
        type: 'pollEvent',
        pollDetails: {
          metadata: {
            questionText: (title || 'Poll').slice(0, 100),
            options: opts
          }
        }
      }
    };
    const r = await youtubeRequest('POST', '/liveChat/messages', auth, body, { part: 'snippet' });
    return r.ok ? { ok: true } : { ok: false, error: r.data?.error?.message || r.error || 'YouTube poll failed' };
  }
  return { ok: false, error: 'Unsupported platform' };
}

function hasAuth(platformId) {
  const auth = storage.getPlatformAuth(platformId);
  if (!auth) return false;
  if (platformId === 'twitch') return !!(auth.accessToken && auth.clientId);
  if (platformId === 'kick' || platformId === 'youtube') return !!auth.accessToken;
  return false;
}

async function getViewerCounts() {
  const out = { twitch: 0, kick: 0, youtube: 0, rumble: 0, podawful: 0, odysee: 0, dlive: 0 };
  const parsed = parseAddedStreamsForViewerCounts(storage.getChatAddedStreams());

  const authTwitch = storage.getPlatformAuth('twitch');
  if (authTwitch?.accessToken && authTwitch?.clientId && parsed.twitch.length > 0) {
    const qs = parsed.twitch.map((login) => 'user_login=' + encodeURIComponent(login)).join('&');
    const r = await twitchRequest('GET', '/streams?' + qs, authTwitch);
    if (r.ok && Array.isArray(r.data?.data)) {
      for (const row of r.data.data) {
        if (row.viewer_count != null) out.twitch += Number(row.viewer_count) || 0;
      }
    }
  }

  const apiKey = storage.getYouTubeChatApiKey();
  if (apiKey && parsed.youtube.length > 0) {
    let sum = 0;
    for (const ch of parsed.youtube) {
      sum += await youtubeConcurrentViewersForChannel(apiKey, ch);
    }
    out.youtube = sum;
  }

  if (parsed.kick.length > 0) {
    let sum = 0;
    for (const slug of parsed.kick) {
      const j = await kickPublicFetchChannel(slug);
      const vc = j?.livestream?.viewer_count ?? j?.livestream?.viewerCount ?? j?.viewer_count;
      if (vc != null) sum += Number(vc) || 0;
    }
    out.kick = sum;
  }

  return out;
}

module.exports = {
  timeoutUser,
  banUser,
  unbanUser,
  addMod,
  createPoll,
  hasAuth,
  getViewerCounts,
  resolveYouTubeLiveVideoId
};
