/**
 * Polls TwStalker + optional Twitter oEmbed for newest @podawful status id.
 */

const storage = require('../storage/adapter');
const podawfulTweets = require('./podawfulTweetsService');

let pollTimer = null;
let inFlight = false;
let alertCallback = null;

function setPodawfulTweetAlertHandler(fn) {
  alertCallback = typeof fn === 'function' ? fn : null;
}

async function runTweetPoll() {
  if (!storage.getPodawfulTweetAlertEnabled()) return;
  if (inFlight) return;
  inFlight = true;
  try {
    const tweets = await podawfulTweets.fetchLatestTweets({ limit: 6, oembedFirst: true });
    const newest = tweets[0];
    const id = newest?.id || '';
    if (!id) return;

    const seeded = storage.getPodawfulTweetAlertSeeded();
    const last = storage.getPodawfulTweetAlertLastStatusId();

    if (!seeded) {
      storage.setPodawfulTweetAlertLastStatusId(id);
      storage.setPodawfulTweetAlertSeeded(true);
      return;
    }

    if (id !== last) {
      storage.setPodawfulTweetAlertLastStatusId(id);
      const xUrl = `https://x.com/podawful/status/${id}`;
      alertCallback?.({
        id,
        link: newest.link || xUrl,
        xUrl,
        text: newest.text || ''
      });
    }
  } finally {
    inFlight = false;
  }
}

function stopPodawfulTweetAlertPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPodawfulTweetAlertPolling() {
  stopPodawfulTweetAlertPolling();
  if (!storage.getPodawfulTweetAlertEnabled()) return;
  const ms = Math.max(20000, storage.getPodawfulFeedAlertPollMs() || 90000);
  pollTimer = setInterval(() => runTweetPoll(), ms);
  setTimeout(() => runTweetPoll(), 11000);
}

function restartPodawfulTweetAlertPolling() {
  stopPodawfulTweetAlertPolling();
  startPodawfulTweetAlertPolling();
}

module.exports = {
  setPodawfulTweetAlertHandler,
  runTweetPoll,
  startPodawfulTweetAlertPolling,
  stopPodawfulTweetAlertPolling,
  restartPodawfulTweetAlertPolling
};
