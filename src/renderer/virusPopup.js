const scanPhase = document.getElementById('scan-phase');
const videoPhase = document.getElementById('video-phase');
const video = document.getElementById('virus-video');
const btnClose = document.getElementById('btn-close');
const overlay = document.getElementById('virus-trick-overlay');
const scanLog = document.getElementById('scan-log');
const scanPercent = document.getElementById('scan-percent');
const virusStatusText = document.getElementById('virus-status-text');
const virusTimer = document.getElementById('virus-timer');

const SCAN_LINES_POOL = [
  { text: 'Initializing security scan...', cls: '' },
  { text: 'Scanning C:\\Users\\', cls: '' },
  { text: 'Scanning C:\\Program Files\\', cls: '' },
  { text: 'Checking system registry...', cls: '' },
  { text: 'Analyzing running processes...', cls: 'warn' },
  { text: 'Threat found: Trojan.Generic', cls: 'danger' },
  { text: 'Threat found: PUP.AWFULTECH', cls: 'danger' },
  { text: 'Threat found: HackTool.Goonopticon', cls: 'danger' },
  { text: 'Location: %TEMP%\\svchost_crisis.exe', cls: 'danger' },
  { text: 'Location: %APPDATA%\\crisis_support.dll', cls: 'danger' },
  { text: 'Severity: Critical', cls: 'danger' },
  { text: 'Recommendation: Contact AWFULTECH CRISIS SUPPORT', cls: 'warn' },
  { text: 'Checking network connections...', cls: '' },
  { text: 'Quarantine failed — manual action required', cls: 'warn' }
];

const STATUS_ROTATE_BASE = [
  'Streaming…',
  'Threat level: Critical',
  'Connection secured',
  'AWFULTECH CRISIS SUPPORT — LIVE',
  'Encrypting... Just kidding.',
  'podawful.com/cult',
  'DISCORD.CULT',
  'Link your account for support'
];

const TOAST_MESSAGES = [
  'Threat quarantined',
  'Action required',
  'Windows Security — Update available',
  'Critical: Review threat details'
];

let state = {
  videoUrls: [],
  virusLines: [],
  clickheadUrl: null,
  giantTextEl: null,
  glitchTimer: null,
  statusIndex: 0,
  timerInterval: null,
  restartCountdownInterval: null,
  toastTimeout: null
};

function scheduleGlitch() {
  if (state.glitchTimer) return;
  const run = () => {
    if (Math.random() < 0.4) {
      document.body.classList.add('virus-glitch');
      const duration = 250 + Math.random() * 150;
      setTimeout(() => document.body.classList.remove('virus-glitch'), duration);
    }
    state.glitchTimer = setTimeout(run, 5000 + Math.random() * 8000);
  };
  state.glitchTimer = setTimeout(run, 3000 + Math.random() * 5000);
}

function getScanLinesForRun() {
  const base = [...SCAN_LINES_POOL];
  const count = 6 + Math.floor(Math.random() * 4);
  const out = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * base.length);
    out.push(base.splice(idx, 1)[0]);
  }
  return out;
}

function runScanPhase() {
  scanLog.innerHTML = '';
  const lines = getScanLinesForRun();
  let pct = 0;
  const pctInterval = setInterval(() => {
    pct = Math.min(pct + 2 + Math.floor(Math.random() * 4), 100);
    if (scanPercent) scanPercent.textContent = pct + '%';
    if (pct >= 100) clearInterval(pctInterval);
  }, 80);

  lines.forEach((line, i) => {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'scan-log-line ' + (line.cls || '');
      el.textContent = '> ' + line.text;
      scanLog.appendChild(el);
      scanLog.scrollTop = scanLog.scrollHeight;
    }, 200 + i * 180);
  });
}

function getStatusLines() {
  const arr = [...STATUS_ROTATE_BASE];
  if (state.virusLines && state.virusLines.length) {
    const pick = state.virusLines.slice(0, 6);
    arr.push(...pick);
  }
  return arr;
}

function startVideoPhaseUI() {
  const statusLines = getStatusLines();
  state.statusIndex = 0;
  if (virusStatusText) virusStatusText.textContent = statusLines[0];
  const statusInterval = setInterval(() => {
    state.statusIndex = (state.statusIndex + 1) % statusLines.length;
    if (virusStatusText) virusStatusText.textContent = statusLines[state.statusIndex];
  }, 2500);
  state.timerInterval = setInterval(() => {
    if (!virusTimer) return;
    const m = Math.floor((Date.now() - (state.videoStartTime || Date.now())) / 60000);
    const s = Math.floor(((Date.now() - (state.videoStartTime || Date.now())) % 60000) / 1000);
    virusTimer.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }, 1000);
  state.statusInterval = statusInterval;

  startRestartCountdown();
  showRandomToast();
}

function startRestartCountdown() {
  const banner = document.getElementById('virus-restart-banner');
  const countEl = document.getElementById('virus-restart-countdown');
  if (!banner || !countEl) return;
  let secs = 60;
  countEl.textContent = secs;
  banner.classList.add('active');
  state.restartCountdownInterval = setInterval(() => {
    secs--;
    countEl.textContent = secs;
    if (secs <= 0) {
      if (state.restartCountdownInterval) clearInterval(state.restartCountdownInterval);
      state.restartCountdownInterval = null;
      secs = 60;
      countEl.textContent = secs;
      triggerCloseAttempt();
    }
  }, 1000);
}

function showRandomToast() {
  const toast = document.getElementById('virus-toast');
  if (!toast) return;
  if (state.toastTimeout) clearTimeout(state.toastTimeout);
  const msg = TOAST_MESSAGES[Math.floor(Math.random() * TOAST_MESSAGES.length)];
  toast.textContent = msg;
  toast.classList.add('visible');
  toast.onclick = () => {
    toast.classList.remove('visible');
    triggerCloseAttempt();
  };
  state.toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
    state.toastTimeout = setTimeout(showRandomToast, 8000 + Math.random() * 12000);
  }, 4000);
}

function stopVideoPhaseUI() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = null;
  if (state.statusInterval) clearInterval(state.statusInterval);
  state.statusInterval = null;
  if (state.restartCountdownInterval) clearInterval(state.restartCountdownInterval);
  state.restartCountdownInterval = null;
  if (state.toastTimeout) clearTimeout(state.toastTimeout);
  state.toastTimeout = null;
  const toast = document.getElementById('virus-toast');
  if (toast) toast.classList.remove('visible');
  const banner = document.getElementById('virus-restart-banner');
  if (banner) banner.classList.remove('active');
}

function triggerCloseAttempt() {
  if (window.virusAPI) window.virusAPI.tryClose();
}

btnClose.addEventListener('click', triggerCloseAttempt);

document.getElementById('btn-discord')?.addEventListener('click', triggerCloseAttempt);

window.virusAPI.onTrick((payload) => {
  const effect = payload?.effect || 'shake';
  runTrick(effect);
});

function runTrick(effect) {
  switch (effect) {
    case 'volume': {
      video.volume = Math.min(1, (video.volume || 0.5) + 0.35);
      break;
    }
    case 'clickheads': {
      if (!state.clickheadUrl) {
        runTrick('shake');
        return;
      }
      overlay.innerHTML = '';
      overlay.classList.add('active');
      const count = 15 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) {
        const img = document.createElement('img');
        img.className = 'clickhead-img';
        img.src = state.clickheadUrl;
        img.alt = '';
        img.style.left = Math.random() * 100 + '%';
        img.style.top = Math.random() * 100 + '%';
        img.style.transform = `rotate(${Math.random() * 360}deg)`;
        overlay.appendChild(img);
      }
      setTimeout(() => {
        overlay.classList.remove('active');
        overlay.innerHTML = '';
      }, 4000);
      break;
    }
    case 'otherVideo': {
      if (state.videoUrls.length < 2) {
        runTrick('volume');
        return;
      }
      const current = video.src;
      const others = state.videoUrls.filter((u) => u !== current);
      if (others.length) {
        const next = others[Math.floor(Math.random() * others.length)];
        video.src = next;
        video.volume = 1;
        video.play().catch(() => {});
      }
      break;
    }
    case 'giantText': {
      if (!state.virusLines.length) {
        runTrick('flash');
        return;
      }
      const line = state.virusLines[Math.floor(Math.random() * state.virusLines.length)];
      if (state.giantTextEl) state.giantTextEl.remove();
      state.giantTextEl = document.createElement('div');
      state.giantTextEl.id = 'virus-giant-text';
      state.giantTextEl.textContent = line;
      document.body.appendChild(state.giantTextEl);
      const onEnd = () => {
        if (state.giantTextEl) {
          state.giantTextEl.remove();
          state.giantTextEl = null;
        }
        video.removeEventListener('ended', onEnd);
      };
      video.addEventListener('ended', onEnd);
      setTimeout(onEnd, 8000);
      break;
    }
    case 'spawnWindow': {
      if (window.virusAPI.spawnAnother) window.virusAPI.spawnAnother();
      break;
    }
    case 'noid':
      break;
    case 'flash': {
      document.body.classList.add('flash-red');
      setTimeout(() => document.body.classList.remove('flash-red'), 450);
      break;
    }
    case 'shake':
    default: {
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 550);
      break;
    }
  }
}

window.virusAPI.onPlay((payload) => {
  const fileUrl = typeof payload === 'string' ? payload : payload?.fileUrl;
  const title = typeof payload === 'object' && payload?.title ? payload.title : 'Goonopticon Security Breach';
  state.videoUrls = payload?.videoUrls || (fileUrl ? [fileUrl] : []);
  state.virusLines = payload?.virusLines || [];
  state.clickheadUrl = payload?.clickheadUrl || null;

  const titleEl = document.getElementById('virus-title');
  if (titleEl) titleEl.textContent = title;
  document.title = title;
  if (fileUrl) {
    video.src = fileUrl;
    video.volume = 1;
    video.play().catch(() => {});
  }
  if (payload?.soundUrl) {
    const snd = new Audio(payload.soundUrl);
    snd.volume = 0.6;
    snd.play().catch(() => {});
  }

  runScanPhase();

  setTimeout(() => {
    scanPhase.style.display = 'none';
    videoPhase.classList.add('active');
    state.videoStartTime = Date.now();
    startVideoPhaseUI();
    scheduleGlitch();
  }, 1400);

  video.addEventListener('ended', () => {
    if (state.giantTextEl) {
      state.giantTextEl.remove();
      state.giantTextEl = null;
    }
    stopVideoPhaseUI();
    if (state.glitchTimer) clearTimeout(state.glitchTimer);
    state.glitchTimer = null;
    if (window.virusAPI) window.virusAPI.close();
  });
  video.addEventListener('error', () => {
    stopVideoPhaseUI();
    if (state.glitchTimer) clearTimeout(state.glitchTimer);
    state.glitchTimer = null;
    if (window.virusAPI) window.virusAPI.close();
  });
});
