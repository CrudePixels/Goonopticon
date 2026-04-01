/**
 * Polls YouTube RSS + optional Data API (live) for the Command Center channel.
 * Fires callback on new VOD or when a live broadcast appears.
 */

const https = require('https');
const storage = require('../storage/adapter');
const youtubeFeed = require('./youtubeFeedService');

const DEFAULT_CHANNEL = 'https://www.youtube.com/@podawfulH2BH';

function channelUrlTracked() {
  const u = storage.getCommandCenterYouTubeChannel();
  const s = typeof u === 'string' ? u.trim() : '';
  return s || DEFAULT_CHANNEL;
}

function httpsGetJson(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let buf = '';
        res.on('data', (c) => {
          buf += c;
        });
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

async function fetchLiveForChannel(channelId, apiKey) {
  if (!channelId || !apiKey) return null;
  const url =
    'https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' +
    encodeURIComponent(channelId) +
    '&eventType=live&type=video&maxResults=1&key=' +
    encodeURIComponent(apiKey);
  const j = await httpsGetJson(url);
  const item = j.items?.[0];
  if (!item?.id?.videoId) return null;
  return {
    videoId: item.id.videoId,
    title: item.snippet?.title || ''
  };
}

let pollTimer = null;
let inFlight = false;
let alertCallback = null;

function setPodawfulFeedAlertHandler(fn) {
  alertCallback = typeof fn === 'function' ? fn : null;
}

async function runPoll() {
  if (!storage.getPodawfulFeedAlertEnabled()) return;
  if (inFlight) return;
  inFlight = true;
  try {
    const url = channelUrlTracked();
    const entries = await youtubeFeed.fetchFeedForUrl(url, {
      apiKey: storage.getYouTubeChatApiKey()
    });
    const newest = entries[0];
    const newestId = newest?.videoId || null;

    const channelId = await youtubeFeed.resolveChannelIdForUrl(url);
    const apiKey = storage.getYouTubeChatApiKey();
    let live = null;
    if (channelId && apiKey) {
      live = await fetchLiveForChannel(channelId, apiKey);
    }

    const seeded = storage.getPodawfulFeedAlertSeeded();
    const lastRss = storage.getPodawfulFeedAlertLastRssVideoId();
    const lastLive = storage.getPodawfulFeedAlertLastLiveVideoId();

    if (!seeded) {
      storage.setPodawfulFeedAlertLastRssVideoId(newestId || '');
      storage.setPodawfulFeedAlertLastLiveVideoId(live?.videoId || '');
      storage.setPodawfulFeedAlertSeeded(true);
      return;
    }

    let payload = null;
    const liveId = live?.videoId || null;

    if (liveId && liveId !== lastLive) {
      payload = { kind: 'live', videoId: liveId, title: live.title || 'LIVE' };
      storage.setPodawfulFeedAlertLastLiveVideoId(liveId);
      if (newestId) storage.setPodawfulFeedAlertLastRssVideoId(newestId);
    } else if (!liveId && lastLive) {
      storage.setPodawfulFeedAlertLastLiveVideoId('');
    }

    if (!payload && newestId && newestId !== lastRss) {
      payload = { kind: 'video', videoId: newestId, title: newest.title || 'New video' };
      storage.setPodawfulFeedAlertLastRssVideoId(newestId);
    }

    if (payload && alertCallback) {
      alertCallback(payload);
    }
  } finally {
    inFlight = false;
  }
}

function stopPodawfulFeedAlertPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPodawfulFeedAlertPolling() {
  stopPodawfulFeedAlertPolling();
  if (!storage.getPodawfulFeedAlertEnabled()) return;
  const ms = Math.max(20000, storage.getPodawfulFeedAlertPollMs() || 90000);
  pollTimer = setInterval(() => runPoll(), ms);
  setTimeout(() => runPoll(), 8000);
}

function restartPodawfulFeedAlertPolling() {
  stopPodawfulFeedAlertPolling();
  startPodawfulFeedAlertPolling();
}

module.exports = {
  setPodawfulFeedAlertHandler,
  runPoll,
  startPodawfulFeedAlertPolling,
  stopPodawfulFeedAlertPolling,
  restartPodawfulFeedAlertPolling,
  channelUrlTracked
};
