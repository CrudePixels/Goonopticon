/* global podawfulCrtAPI */

let alarmCtx = null;
let alarmTimer = null;

function stopAlarm() {
  if (alarmTimer) {
    clearTimeout(alarmTimer);
    alarmTimer = null;
  }
  try {
    if (alarmCtx) alarmCtx.close();
  } catch (_) {}
  alarmCtx = null;
}

function playAlarmBurst() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!alarmCtx) alarmCtx = new Ctx();
    const ctx = alarmCtx;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 880;
    g.gain.value = 0.12;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.14);

    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'sawtooth';
    o2.frequency.value = 1320;
    g2.gain.value = 0.06;
    o2.connect(g2);
    g2.connect(ctx.destination);
    o2.start();
    o2.stop(ctx.currentTime + 0.1);
  } catch (_) {}
}

/** Bursts then silence (same for real alerts and demos — was infinite before). */
const CRT_ALARM_BURST_COUNT = 10;
const CRT_ALARM_BURST_GAP_MS = 400;

function startAlarmPattern() {
  stopAlarm();
  let n = 0;
  const tick = () => {
    playAlarmBurst();
    n += 1;
    if (n >= CRT_ALARM_BURST_COUNT) return;
    alarmTimer = setTimeout(tick, CRT_ALARM_BURST_GAP_MS);
  };
  tick();
}

function applyPayload(payload) {
  const kind = payload.kind === 'live' ? 'live' : 'video';
  const videoId = payload.videoId || '';
  const titleEl = document.getElementById('crt-title');
  const kindEl = document.getElementById('crt-kind');
  const frame = document.getElementById('crt-frame');

  if (kindEl) kindEl.textContent = kind === 'live' ? '● LIVE' : '▶ NEW';
  if (titleEl) titleEl.textContent = payload.title || (kind === 'live' ? 'Livestream' : 'New upload');

  if (frame && videoId) {
    const q = 'autoplay=1&rel=0&modestbranding=1';
    frame.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${q}`;
  }

  startAlarmPattern();
}

function boot() {
  const api = window.podawfulCrtAPI;
  if (!api) return;

  document.getElementById('crt-close')?.addEventListener('click', () => {
    stopAlarm();
    api.close();
  });

  api.onPlay((payload) => {
    if (payload && payload.videoId) applyPayload(payload);
  });
}

boot();

window.addEventListener('beforeunload', stopAlarm);
