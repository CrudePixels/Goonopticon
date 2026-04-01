/* global podawfulTweetPopupAPI */

let chimeCtx = null;
let chimeTimeout = null;

function stopChime() {
  if (chimeTimeout) {
    clearTimeout(chimeTimeout);
    chimeTimeout = null;
  }
  try {
    if (chimeCtx) chimeCtx.close();
  } catch (_) {}
  chimeCtx = null;
}

function playAscendingChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!chimeCtx) chimeCtx = new Ctx();
    const ctx = chimeCtx;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const freqs = [523.25, 659.25, 783.99];
    const now = ctx.currentTime;
    freqs.forEach((hz, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = hz;
      const t0 = now + i * 0.14;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.11, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.36);
    });
  } catch (_) {}
}

/** Three chime sequences then silence (real + demo — was looping until close). */
const TWEET_CHIME_ROUNDS = 3;
const TWEET_CHIME_GAP_MS = 1200;

function scheduleChimeRepeats() {
  stopChime();
  let round = 0;
  const rounds = () => {
    playAscendingChime();
    round += 1;
    if (round >= TWEET_CHIME_ROUNDS) return;
    chimeTimeout = setTimeout(rounds, TWEET_CHIME_GAP_MS);
  };
  rounds();
}

let lastXUrl = '';

function applyPayload(payload) {
  const id = payload.id || '';
  lastXUrl = payload.xUrl || (id ? `https://x.com/podawful/status/${id}` : '');
  const snippet = document.getElementById('snippet');
  const frame = document.getElementById('tweet-frame');

  if (snippet) {
    const t = (payload.text || '').trim();
    snippet.textContent = t;
  }

  if (frame && id) {
    frame.src =
      'https://platform.twitter.com/embed/Tweet.html?id=' +
      encodeURIComponent(id) +
      '&theme=dark&dnt=true&lang=en';
  }

  scheduleChimeRepeats();
}

function boot() {
  const api = window.podawfulTweetPopupAPI;
  if (!api) return;

  document.getElementById('btn-close')?.addEventListener('click', () => {
    stopChime();
    api.close();
  });

  document.getElementById('btn-open-x')?.addEventListener('click', () => {
    if (lastXUrl) api.openExternal(lastXUrl);
  });

  api.onShow((p) => {
    if (p && p.id) applyPayload(p);
  });
}

boot();

window.addEventListener('beforeunload', stopChime);
