// Splash text
async function refreshSplashText() {
  try {
    const text = await window.goonAPI.getRandomSplash();
    const el = document.getElementById('splash-text');
    if (el) el.textContent = text;
  } catch (err) {
    console.error('Failed to get splash text:', err);
  }
}

/** Random image from src/splash/images (see splashTextService). */
async function loadHomeSplashPoster() {
  const img = document.getElementById('home-splash-poster');
  if (!img) return;
  try {
    const url = await window.goonAPI?.getRandomSplashImageUrl?.();
    if (!url) return;
    img.onload = () => {
      img.style.display = '';
    };
    img.onerror = () => {
      img.style.display = 'none';
    };
    img.src = url;
  } catch (_) {
    img.style.display = 'none';
  }
}

// Toast (single feedback channel)
const toastEl = document.getElementById('toast-root');
let toastTimer = null;
window.addEventListener('appUpdateAvailable', (e) => {
  const version = e.detail?.version || 'new';
  if (window.confirm(`Update to v${version} is available. Download now?`)) window.goonAPI?.downloadUpdate?.();
});
window.addEventListener('appUpdateNotAvailable', () => {
  if (toastEl) { toastEl.textContent = "You're up to date."; toastEl.classList.add('show'); setTimeout(() => toastEl?.classList.remove('show'), 2500); }
});
window.addEventListener('appUpdateDownloaded', () => {
  if (window.confirm('Update ready. Restart to install?')) window.goonAPI?.quitAndInstall?.();
});
window.addEventListener('appUpdateError', (e) => {
  const msg = e.detail?.message || 'Update check failed';
  if (toastEl) { toastEl.textContent = msg; toastEl.classList.add('show'); setTimeout(() => toastEl?.classList.remove('show'), 4000); }
});

window.addEventListener('goonToast', (e) => {
  const msg = e.detail && typeof e.detail === 'string' ? e.detail : 'Done';
  if (toastEl) {
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.style.display = 'none';
      toastTimer = null;
    }, 3000);
  }
});

let podawfulScreenFxTimer = null;
window.addEventListener('podawfulFeedScreenEffects', () => {
  document.body.classList.add('podawful-feed-screen-fx');
  if (podawfulScreenFxTimer) clearTimeout(podawfulScreenFxTimer);
  podawfulScreenFxTimer = setTimeout(() => {
    document.body.classList.remove('podawful-feed-screen-fx');
    podawfulScreenFxTimer = null;
  }, 3200);
});

let podawfulTweetFxTimer = null;
window.addEventListener('podawfulTweetScreenEffects', () => {
  document.body.classList.add('podawful-tweet-screen-fx');
  if (podawfulTweetFxTimer) clearTimeout(podawfulTweetFxTimer);
  podawfulTweetFxTimer = setTimeout(() => {
    document.body.classList.remove('podawful-tweet-screen-fx');
    podawfulTweetFxTimer = null;
  }, 4800);
});

// Dev Log — panel + background collector (warn, error, action, info, debug, log)
const DEVLOG_COLORS = {
  error: '#f44336',
  warn: '#ff9800',
  action: '#4caf50',
  info: '#2196f3',
  debug: '#9c27b0',
  log: '#78909c'
};
const DEVLOG_MAX = 1000;
const DEVLOG_CATEGORIES = ['action', 'warn', 'error', 'info', 'debug', 'log'];
const devLogEntries = [];
let devLogFilterAll = true;
let devLogFilterCategories = { action: true, warn: true, error: true, info: true, debug: true, log: true };
function devLogPush(category, message, data) {
  const entry = {
    ts: new Date().toISOString(),
    t: Date.now(),
    category: category in DEVLOG_COLORS ? category : 'log',
    message: typeof message === 'string' ? message : (message != null ? String(message) : ''),
    data: data
  };
  devLogEntries.push(entry);
  if (devLogEntries.length > DEVLOG_MAX) devLogEntries.shift();
  window.dispatchEvent(new CustomEvent('devLogUpdated', { detail: entry }));
}
function devLogGetEntries() {
  return [...devLogEntries];
}
function devLogGetFilteredEntries() {
  const entries = devLogGetEntries();
  if (devLogFilterAll) return entries;
  return entries.filter((e) => devLogFilterCategories[e.category]);
}
function devLogClear() {
  devLogEntries.length = 0;
  window.dispatchEvent(new CustomEvent('devLogUpdated', { detail: null }));
}
window.devLog = (category, message, data) => devLogPush(category, message, data);

/** Writes to <userData>/freeze-trace.log via main process (sync on disk). */
function freezeMark(tag, detail) {
  try {
    window.goonAPI?.freezeTraceMark?.(tag, detail);
  } catch (_) {}
}

(function patchConsoleForDevLog() {
  const origWarn = console.warn;
  const origError = console.error;
  console.warn = function (...args) {
    devLogPush('warn', args.map((a) => (typeof a === 'object' && a != null ? JSON.stringify(a) : String(a))).join(' '));
    origWarn.apply(console, args);
  };
  console.error = function (...args) {
    devLogPush('error', args.map((a) => (typeof a === 'object' && a != null ? JSON.stringify(a) : String(a))).join(' '));
    origError.apply(console, args);
  };
})();

function renderDevLogViewList() {
  const list = document.getElementById('devlog-view-list');
  if (!list) return;
  const entries = devLogGetFilteredEntries();
  list.innerHTML = entries
    .map(
      (e) =>
        `<div class="devlog-entry" style="border-left-color:${DEVLOG_COLORS[e.category] || DEVLOG_COLORS.log};">
          <span class="devlog-entry-time">${e.ts.slice(11, 23)}</span>
          <span style="color:${DEVLOG_COLORS[e.category] || DEVLOG_COLORS.log};font-weight:600;">[${e.category}]</span>
          ${escapeHtmlDevLog(e.message)}${e.data != null ? ' ' + escapeHtmlDevLog(typeof e.data === 'object' ? JSON.stringify(e.data) : String(e.data)) : ''}
        </div>`
    )
    .join('');
  list.scrollTop = list.scrollHeight;
}
function escapeHtmlDevLog(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
window.addEventListener('devLogUpdated', () => {
  if (document.getElementById('devlog-view-list')) renderDevLogViewList();
});
(async () => {
  const enabled = await window.goonAPI.getDevLogVisible?.();
  const btn = document.getElementById('btn-devlog');
  if (btn) btn.style.display = enabled ? '' : 'none';
})();
// View switching (Tracker, Report, Settings = in-page views)
const viewEl = document.getElementById('view');
function isChatPopout() {
  return typeof window !== 'undefined' && (
    window.goonAPI?.isChatPopoutWindow === true ||
    window.location.search.includes('popout=chat') ||
    window.location.hash.includes('popout=chat')
  );
}
function isGrokPopout() {
  return typeof window !== 'undefined' && (
    window.goonAPI?.isGrokPopoutWindow === true ||
    window.location.search.includes('popout=grok') ||
    window.location.hash.includes('popout=grok')
  );
}
const menuButtons = document.querySelectorAll('.menu button[data-view]');

const VIEW_ACTION_LABELS = {
  timestamp: 'Timecode Arsenal',
  music: 'Podawful AV HELL',
  chat: 'Chat',
  grok: 'Erm, Grok',
  tracker: 'Gangstalking',
  goonipedia: 'Goonipedia',
  report: 'Report to HQ',
  settings: 'Configure Surveillance',
  devlog: 'Dev Log',
  overlay: 'Deploy Overlay'
};

function setSidebarActiveForView(view) {
  document.getElementById('btn-main-menu')?.classList.toggle('active', !view);
  document.querySelectorAll('.menu button[data-view]').forEach((b) => {
    b.classList.toggle('active', !!view && b.getAttribute('data-view') === view);
  });
}

menuButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.getAttribute('data-view');
    loadView(view);
    refreshSplashText();
  });
});

function initChatPopoutIfNeeded() {
  if (!isChatPopout()) return;
  document.body.classList.add('chat-popout', 'view-popout');
  document.querySelector('.menu')?.style.setProperty('display', 'none');
  document.querySelector('.main-header')?.style.setProperty('display', 'none');
  document.querySelector('.main-footer')?.style.setProperty('display', 'none');
  loadChatView();
}
function initGrokPopoutIfNeeded() {
  if (!isGrokPopout()) return;
  document.body.classList.add('grok-popout', 'view-popout');
  document.querySelector('.menu')?.style.setProperty('display', 'none');
  document.querySelector('.main-header')?.style.setProperty('display', 'none');
  document.querySelector('.main-footer')?.style.setProperty('display', 'none');
  loadView('grok');
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    freezeMark('renderer_domcontentloaded');
    initChatPopoutIfNeeded();
    initGrokPopoutIfNeeded();
    scheduleChatConnectionsBootstrap();
    loadHomeSplashPoster();
    setInterval(() => freezeMark('renderer_pulse'), 10000);
  });
} else {
  freezeMark('renderer_domcontentloaded');
  initChatPopoutIfNeeded();
  initGrokPopoutIfNeeded();
  scheduleChatConnectionsBootstrap();
  loadHomeSplashPoster();
  setInterval(() => freezeMark('renderer_pulse'), 10000);
}

/** After removing chatService.init→updateConnections(), main process only syncs when Chat loads. Re-prime in background when Live streams is on so ingest works without opening Chat. */
function scheduleChatConnectionsBootstrap() {
  if (isChatPopout()) return;
  setTimeout(async () => {
    try {
      if ((await window.goonAPI.chatGetChatUnifiedEnabled?.()) !== true) return;
      const saved = await window.goonAPI.chatGetAddedStreams?.();
      if (!Array.isArray(saved) || saved.length === 0) return;
      await window.goonAPI.chatSetAddedStreams?.(saved);
    } catch (_) {}
  }, 2800);
}

// Iframe views (timestamp, music) can request close -> back to menu
let currentView = null;
let currentPoppedOutView = null;

window.addEventListener('message', (e) => {
  if (e?.data?.type === 'goonopticon-close-view') {
    devLogPush('action', 'Closed view → Command Center');
    showMainMenu();
    refreshSplashText();
  }
  if (e?.data?.type === 'goonopticon-view-popped-out' && e.data?.view) {
    currentPoppedOutView = e.data.view;
    showPoppedOutPlaceholder(e.data.view);
  }
  if (e?.data?.type === 'goonopticon-devlog' && (e.data.category || e.data.message)) {
    devLogPush(e.data.category || 'action', e.data.message || '', e.data.data);
  }
});

const POPPED_LABELS = {
  timestamp: 'Timecode Arsenal',
  music: 'Podawful AV HELL',
  grok: 'Erm, Grok'
};

function showPoppedOutPlaceholder(view) {
  const label = POPPED_LABELS[view] || view;
  viewEl.innerHTML = `
    <div class="view-popped-placeholder">
      <div class="view-popped-overlay"></div>
      <div class="view-popped-message">
        <p>${label} is open in a separate window.</p>
        <button type="button" class="hud-btn" id="view-show-in-panel-again">Show in panel again</button>
      </div>
    </div>
  `;
  document.getElementById('view-show-in-panel-again')?.addEventListener('click', () => {
    currentPoppedOutView = null;
    loadView(view);
  });
}

function loadView(view) {
  freezeMark('loadView', { view });
  if (currentView === 'chat' && view !== 'chat') clearChatViewIntervals();
  currentPoppedOutView = null;
  const label = VIEW_ACTION_LABELS[view] || view;
  devLogPush('action', `Opened ${label}`);
  currentView = view;
  setSidebarActiveForView(view);
  switch (view) {
    case 'timestamp':
      viewEl.innerHTML = '<iframe src="timestamp.html" class="view-iframe" title="Timecode Arsenal"></iframe>';
      break;
    case 'music':
      viewEl.innerHTML = '<iframe src="music.html" class="view-iframe" title="Podawful AV HELL"></iframe>';
      break;
    case 'chat':
      loadChatView();
      break;
    case 'grok':
      viewEl.innerHTML = '<iframe src="grok.html" class="view-iframe" title="Erm, Grok"></iframe>';
      break;
    case 'tracker':
      loadTrackerView();
      break;
    case 'goonipedia':
      loadGoonipediaView();
      break;
    case 'report':
      loadReportView();
      break;
    case 'settings':
      loadSettingsView();
      break;
    case 'devlog':
      loadDevLogView();
      break;
    default:
      viewEl.innerHTML = `
        <div class="view-placeholder">Unknown view.</div>
      `;
  }
}

function loadDevLogView() {
  const filterCheckboxes = DEVLOG_CATEGORIES.map(
    (c) => `<label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;"><input type="checkbox" class="devlog-filter-cb" data-category="${c}" ${devLogFilterCategories[c] ? 'checked' : ''} />${c}</label>`
  ).join('');
  viewEl.innerHTML = `
    <div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;">
      <div class="view-title-bar">
        <span>[ DEV LOG ]</span>
        <div class="title-bar-actions"></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;flex-shrink:0;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;">
          <span style="opacity:0.8;font-size:12px;">Filter:</span>
          <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;"><input type="checkbox" id="devlog-filter-all" ${devLogFilterAll ? 'checked' : ''} />All</label>
          ${filterCheckboxes}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="hud-btn" id="devlog-open-freeze-trace">Open freeze trace log</button>
          <button type="button" class="hud-btn" id="devlog-view-clear">Clear</button>
        </div>
      </div>
      <div id="devlog-view-list" class="devlog-view-list"></div>
    </div>
  `;
  const listEl = document.getElementById('devlog-view-list');
  const updateFilter = () => {
    devLogFilterAll = document.getElementById('devlog-filter-all')?.checked ?? true;
    if (!devLogFilterAll) {
      DEVLOG_CATEGORIES.forEach((c) => {
        const cb = listEl?.closest('.view-wrap')?.querySelector(`.devlog-filter-cb[data-category="${c}"]`);
        if (cb) devLogFilterCategories[c] = cb.checked;
      });
    }
    renderDevLogViewList();
  };
  document.getElementById('devlog-filter-all')?.addEventListener('change', updateFilter);
  listEl?.closest('.view-wrap')?.querySelectorAll('.devlog-filter-cb').forEach((cb) => {
    cb.addEventListener('change', updateFilter);
  });
  renderDevLogViewList();
  document.getElementById('devlog-open-freeze-trace')?.addEventListener('click', async () => {
    const r = await window.goonAPI.openFreezeTrace?.();
    if (r?.ok) devLogPush('action', 'Opened freeze-trace.log', r.path);
    else {
      const p = await window.goonAPI.getFreezeTracePath?.();
      devLogPush('warn', r?.error || 'Could not open trace', p || '');
      window.goonAPI.showToast?.(p ? `Trace file: ${p}` : 'No trace path');
    }
  });
  document.getElementById('devlog-view-clear')?.addEventListener('click', () => {
    devLogPush('action', 'Dev Log cleared');
    devLogClear();
    renderDevLogViewList();
  });
}

// External links
function openExternal(url) {
  window.goonAPI.openExternal(url);
}

document.getElementById('btn-reboot')?.addEventListener('click', async () => {
  devLogPush('action', 'Reboot system');
  let done = false;
  const doReboot = () => {
    if (done) return;
    done = true;
    window.goonAPI.rebootApp?.();
  };
  try {
    const soundOn = await window.goonAPI?.getSoundExitEnabled?.();
    if (soundOn) {
      const audio = new Audio('sounds/exit.wav');
      audio.volume = 0.5;
      audio.addEventListener('ended', doReboot);
      audio.addEventListener('error', doReboot);
      audio.play().catch(doReboot);
      setTimeout(doReboot, 2000);
      return;
    }
  } catch (_) {}
  doReboot();
});

document.getElementById('footer-podawful').addEventListener('click', (e) => {
  e.preventDefault();
  openExternal('https://podawful.com');
});
document.getElementById('footer-awfultech').addEventListener('click', (e) => {
  e.preventDefault();
  openExternal('https://awful.tech');
});
document.getElementById('footer-discord')?.addEventListener('click', (e) => {
  e.preventDefault();
  openExternal('https://discord.com/invite/podawful');
});

const COMMAND_CENTER_STATIC_CHANGELOG = [
  '0.2.0 — Freeze trace log, splash/images posters, Chat live-stream toggle UX.',
  'Custom window chrome (frameless, theme-matched title bar).',
  'Settings reorganized into tabs: General, Display, Appearance, Extension, Virus popup.',
  'Command Center: changelog, Awful.tube, X, Instagram.',
  'Join the Cult (Discord) link in footer.',
  'Virus popup: optional random video popup from a folder.'
];

function clearChatViewIntervals() {
  if (window._chatViewersInterval) {
    clearInterval(window._chatViewersInterval);
    window._chatViewersInterval = null;
  }
  if (window._chatPollBarInterval) {
    clearInterval(window._chatPollBarInterval);
    window._chatPollBarInterval = null;
  }
}

// Main menu (back to home) — Command Center with changelog and social
async function showMainMenu() {
  clearChatViewIntervals();
  const changelogRaw = await window.goonAPI.getChangelog?.().catch(() => null);
  const changelogList = Array.isArray(changelogRaw) && changelogRaw.length ? changelogRaw : COMMAND_CENTER_STATIC_CHANGELOG;
  const changelogHtml = changelogList.map((line) => `<li>${escapeHtml(line)}</li>`).join('');

  const channelUrl = (await window.goonAPI.getCommandCenterYouTubeChannel?.().catch(() => '') || 'https://www.youtube.com/@PodAwful');

  viewEl.innerHTML = `
    <div class="command-center-content" style="display:flex;flex-direction:column;gap:24px;max-height:100%;overflow:auto;">
      <div id="command-center-poster-wrap" style="display:none;text-align:center;flex-shrink:0;">
        <img id="command-center-poster-api" alt="" decoding="async" style="max-width:100%;max-height:min(280px,32vh);object-fit:contain;border:1px solid var(--hud-border);border-radius:4px;" />
      </div>
      <section class="hud-panel" style="padding:16px;">
        <details id="command-center-changelog" style="margin:0;">
          <summary style="margin:0;font-family:var(--hud-font-mono);font-size:12px;letter-spacing:0.12em;color:var(--hud-accent);cursor:pointer;user-select:none;">CHANGELOG</summary>
          <ul style="margin:8px 0 0 0;padding-left:20px;opacity:0.9;font-size:var(--ui-font-size,14px);line-height:1.6;">${changelogHtml}</ul>
        </details>
      </section>
      <section class="hud-panel" style="padding:16px;">
        <h3 style="margin:0 0 8px 0;font-family:var(--hud-font-mono);font-size:12px;letter-spacing:0.12em;color:var(--hud-accent);">AWFUL.TUBE</h3>
        <div id="command-center-youtube" style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
          <p style="margin:0;opacity:0.7;font-size:12px;">Loading latest Pod Awful uploads…</p>
        </div>
        <div id="command-center-youtube-embed" style="display:none;margin-top:12px;aspect-ratio:16/9;max-width:560px;background:#000;"></div>
      </section>
      <section class="hud-panel" style="padding:16px;">
        <h3 style="margin:0 0 8px 0;font-family:var(--hud-font-mono);font-size:12px;letter-spacing:0.12em;color:var(--hud-accent);">X / TWITTER</h3>
        <div id="command-center-tweets" style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
          <p style="margin:0;opacity:0.9;font-size:var(--ui-font-size,14px);"><a href="https://x.com/podawful" target="_blank" rel="noopener" style="color:var(--hud-accent);">Open @podawful on X</a></p>
          <p id="command-center-tweets-loading" style="margin:0;opacity:0.7;font-size:12px;">Loading latest tweets…</p>
        </div>
      </section>
      <section class="hud-panel" style="padding:16px;">
        <h3 style="margin:0 0 8px 0;font-family:var(--hud-font-mono);font-size:12px;letter-spacing:0.12em;color:var(--hud-accent);">MERCH</h3>
        <div id="command-center-merch" style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
          <p style="margin:0;opacity:0.7;font-size:12px;">Loading latest merch…</p>
        </div>
      </section>
      <section class="hud-panel" style="padding:16px;">
        <h3 style="margin:0 0 8px 0;font-family:var(--hud-font-mono);font-size:12px;letter-spacing:0.12em;color:var(--hud-accent);">INSTAGRAM</h3>
        <p style="margin:0;opacity:0.9;font-size:var(--ui-font-size,14px);"><a href="https://www.instagram.com/podawful" target="_blank" rel="noopener" style="color:var(--hud-accent);">Open @podawful on Instagram</a></p>
      </section>
      <section style="opacity:0.7;font-size:12px;">
        Henchmen, pick your mission from the sidebar. Timecode Arsenal and Podawful AV HELL open in separate windows.
      </section>
    </div>
  `;
  viewEl.querySelectorAll('.command-center-content a[href^="http"]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); window.goonAPI.openExternal(a.href); });
  });

  (async () => {
    const wrap = document.getElementById('command-center-poster-wrap');
    const img = document.getElementById('command-center-poster-api');
    if (!wrap || !img) return;
    try {
      const url = await window.goonAPI?.getRandomSplashImageUrl?.();
      if (!url) return;
      img.onload = () => {
        wrap.style.display = 'block';
      };
      img.onerror = () => {
        wrap.style.display = 'none';
      };
      img.src = url;
    } catch (_) {}
  })();

  if (window.goonAPI.trackerFetchYouTubeFeed) {
    window.goonAPI.trackerFetchYouTubeFeed(channelUrl).then((entries) => {
      const listContainer = document.getElementById('command-center-youtube');
      const embedContainer = document.getElementById('command-center-youtube-embed');
      const first = entries && entries[0];
      const recent = (entries || []).slice(0, 10);

      if (recent.length && listContainer) {
        const thumb = first?.videoId ? `https://img.youtube.com/vi/${first.videoId}/mqdefault.jpg` : '';
        const latestUrl = first?.videoId ? `https://www.youtube.com/watch?v=${first.videoId}` : (first?.link || '');
        listContainer.innerHTML = `
          <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;">
            ${thumb && latestUrl ? `<a href="${escapeHtml(latestUrl)}" data-href="${escapeHtml(latestUrl)}" style="flex-shrink:0;display:inline-flex;align-items:center;gap:8px;color:var(--hud-accent);text-decoration:none;border:1px solid var(--hud-border);padding:6px 8px;border-radius:4px;background:var(--hud-surface);"><img src="${escapeHtml(thumb)}" alt="" width="160" height="90" style="object-fit:cover;border:1px solid var(--hud-border);" /><span style="display:inline-block;max-width:240px;">${escapeHtml(first.title || 'Latest video')}</span></a>` : ''}
          </div>
          <div style="margin-top:10px;">
            <p style="margin:0;font-size:11px;opacity:0.8;">Recent uploads</p>
            <ul style="margin:6px 0 0 0;padding-left:18px;font-size:12px;line-height:1.6;">
              ${recent.map((e) => `<li><a href="${escapeHtml(e.link)}" data-href="${escapeHtml(e.link)}" style="color:var(--hud-accent);cursor:pointer;text-decoration:none;">${escapeHtml(e.title)}</a></li>`).join('')}
            </ul>
          </div>
        `;
      }
      if (!recent.length && listContainer) {
        listContainer.innerHTML = `<p style="margin:0;opacity:0.7;font-size:12px;">No uploads found (or YouTube blocked RSS).</p>`;
      }

      if (first?.videoId && embedContainer) {
        const vid = first.videoId;
        setTimeout(() => {
          const el = document.getElementById('command-center-youtube-embed');
          if (!el || el !== embedContainer) return;
          el.style.display = 'block';
          el.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${encodeURIComponent(vid)}" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen style="border:none;"></iframe>`;
        }, 400);
      }

      // Click -> open externally
      document.querySelectorAll('#command-center-youtube a[data-href]').forEach((a) => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const href = a.getAttribute('data-href');
          if (href) window.goonAPI.openExternal(href);
        });
      });
    }).catch(() => {});
  }

  // Podawful tweets + merch
  const tweetsEl = document.getElementById('command-center-tweets');
  const tweetsLoadingEl = document.getElementById('command-center-tweets-loading');
  if (window.goonAPI.commandCenterFetchPodawfulTweets && tweetsEl && tweetsLoadingEl) {
    window.goonAPI.commandCenterFetchPodawfulTweets().then((tweets) => {
      if (!tweets || !tweets.length) {
        tweetsLoadingEl.textContent = 'No tweets found (or blocked).';
        return;
      }
      tweetsLoadingEl.remove();
      tweetsEl.innerHTML += `
        <p style="margin:0;font-size:11px;opacity:0.8;">Latest tweets</p>
        <ul style="margin:6px 0 0 0;padding-left:18px;font-size:12px;line-height:1.6;">
          ${tweets.slice(0, 8).map((t, i) => `<li><a href="${escapeHtml(t.link)}" data-href="${escapeHtml(t.link)}" style="color:var(--hud-accent);cursor:pointer;text-decoration:none;">${escapeHtml(t.text || 'Tweet ' + (i + 1))}</a></li>`).join('')}
        </ul>
      `;
      tweetsEl.querySelectorAll('a[data-href]').forEach((a) => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          window.goonAPI.openExternal(a.getAttribute('data-href'));
        });
      });
    }).catch(() => {
      if (tweetsLoadingEl) tweetsLoadingEl.textContent = 'Could not load tweets.';
    });
  }

  const merchEl = document.getElementById('command-center-merch');
  if (window.goonAPI.commandCenterFetchPodawfulMerch && merchEl) {
    window.goonAPI.commandCenterFetchPodawfulMerch().then((items) => {
      if (!items || !items.length) {
        merchEl.innerHTML = '<p style="margin:0;opacity:0.7;font-size:12px;">No merch found (or blocked).</p>';
        return;
      }
      const featured = items.slice(0, 8);
      merchEl.innerHTML = `
        <p style="margin:0;font-size:11px;opacity:0.8;">Latest merch</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">
          ${featured.map((m) => `<a href="${escapeHtml(m.link)}" data-href="${escapeHtml(m.link)}" style="color:var(--hud-accent);text-decoration:none;border:1px solid var(--hud-border);background:var(--hud-surface);padding:6px 8px;border-radius:4px;display:inline-flex;align-items:flex-start;gap:8px;max-width:260px;">
            <span style="display:inline-block;max-width:170px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;">${escapeHtml(m.title || m.slug || 'Merch item')}</span>
          </a>`).join('')}
        </div>
      `;
      merchEl.querySelectorAll('a[data-href]').forEach((a) => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          window.goonAPI.openExternal(a.getAttribute('data-href'));
        });
      });
    }).catch(() => {
      merchEl.innerHTML = '<p style="margin:0;opacity:0.7;font-size:12px;">Could not load merch.</p>';
    });
  }
}

document.getElementById('btn-main-menu').addEventListener('click', async () => {
  devLogPush('action', 'Opened Command Center');
  currentView = null;
  setSidebarActiveForView(null);
  try {
    await showMainMenu();
  refreshSplashText();
  } catch (err) {
    console.error('Command Center failed:', err);
    if (viewEl) viewEl.innerHTML = '<div class="view-placeholder" style="color:var(--color-error,#f44);">Failed to load Command Center. See console.</div>';
  }
});

function hexFromInput(hex) {
  if (!hex || !hex.startsWith('#')) return '';
  return hex.length === 7 ? hex : '';
}

async function loadSettingsView() {
  viewEl.innerHTML = '<div class="view-placeholder">Loading settings…</div>';
  const [theme, bridgePort, extensionPath, custom, displays, preferredDisplayId, splashDurationMs, soundBoot, soundExit, virusPopupEnabled, virusVideoFolder, musicFolder, grokEnabled, grokRoastMode, grokTrollMode, grokVolume, grokTheme, grokRandMin, grokRandMax, grokCats, devLogVisible, customPresets, youtubeChatApiKey, discordBotToken, commandCenterYouTubeChannel, feedAlertEnabled, feedAlertPollMs, tweetAlertEnabled, authTwitch, authKick, authYoutube, embedEnabled, embedPort, filterPlatformEmotes, platformEmoteBlocklist, chatFontScaleNum, chatNukePhrases, chatCustomCommands, chatHighlightKeywords] = await Promise.all([
    window.goonAPI.getTheme(),
    window.goonAPI.getBridgePort(),
    window.goonAPI.getExtensionPath?.() || '',
    window.goonAPI.getUICustomization(),
    window.goonAPI.getDisplays?.() || [],
    window.goonAPI.getPreferredDisplayId?.() ?? null,
    window.goonAPI.getSplashDurationMs?.() ?? 5500,
    window.goonAPI.getSoundBootEnabled?.() ?? true,
    window.goonAPI.getSoundExitEnabled?.() ?? true,
    window.goonAPI.getVirusPopupEnabled?.() ?? false,
    window.goonAPI.getVirusVideoFolder?.() ?? '',
    window.goonAPI.musicGetFolder?.() ?? '',
    window.goonAPI.getGrokEnabled?.() ?? true,
    window.goonAPI.grokBuddy?.getGrokRoastMode?.().catch(() => false) ?? false,
    window.goonAPI.grokBuddy?.getGrokTrollMode?.().catch(() => false) ?? false,
    window.goonAPI.grokBuddy?.getGrokVolume?.().catch(() => 0.4) ?? 0.4,
    window.goonAPI.grokBuddy?.getGrokTheme?.().catch(() => 'default') ?? 'default',
    window.goonAPI.grokBuddy?.getGrokRandomIntervalMin?.().catch(() => 5000) ?? 5000,
    window.goonAPI.grokBuddy?.getGrokRandomIntervalMax?.().catch(() => 9000) ?? 9000,
    window.goonAPI.grokBuddy?.getGrokCategoryToggles?.().catch(() => null) ?? null,
    window.goonAPI.getDevLogVisible?.() ?? false,
    window.goonAPI.getCustomThemePresets?.() ?? {},
    window.goonAPI.getYouTubeChatApiKey?.() ?? '',
    window.goonAPI.getDiscordBotToken?.() ?? '',
    window.goonAPI.getCommandCenterYouTubeChannel?.() ?? '',
    window.goonAPI.getPodawfulFeedAlertEnabled?.() ?? false,
    window.goonAPI.getPodawfulFeedAlertPollMs?.() ?? 90000,
    window.goonAPI.getPodawfulTweetAlertEnabled?.() ?? false,
    window.goonAPI.getPlatformAuth?.('twitch') ?? null,
    window.goonAPI.getPlatformAuth?.('kick') ?? null,
    window.goonAPI.getPlatformAuth?.('youtube') ?? null,
    window.goonAPI.chatGetEmbedEnabled?.() ?? false,
    window.goonAPI.chatGetEmbedPort?.() ?? 8766,
    window.goonAPI.chatGetFilterPlatformEmotes?.() ?? false,
    window.goonAPI.chatGetPlatformEmoteBlocklist?.() ?? [],
    window.goonAPI.chatGetFontScale?.() ?? 5,
    window.goonAPI.chatGetNukePhrases?.() ?? [],
    window.goonAPI.chatGetCustomCommands?.() ?? {},
    window.goonAPI.chatGetHighlightKeywords?.() ?? []
  ]);
  const platformEmoteBlocklistStr = Array.isArray(platformEmoteBlocklist) ? platformEmoteBlocklist.join('\n') : '';
  const chatHighlightKeywordsStr = Array.isArray(chatHighlightKeywords) ? chatHighlightKeywords.join('\n') : '';
  const chatFontScale = Math.max(1, Math.min(10, Number(chatFontScaleNum) || 5));
  const nukePhrasesStr = Array.isArray(chatNukePhrases)
    ? chatNukePhrases
        .map((n) => {
          const p = n.phrase || '';
          if (n.action === 'timeout' && n.timeoutSeconds) return `${p} | timeout ${n.timeoutSeconds}`;
          return n.isRegex ? `/${p}/` : p;
        })
        .join('\n')
    : '';
  const customCommandsStr =
    chatCustomCommands && typeof chatCustomCommands === 'object'
      ? Object.entries(chatCustomCommands)
          .map(([k, v]) => `${k}\t${v}`)
          .join('\n')
      : '';
  const presetNames = Object.keys(customPresets || {}).sort();
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const displayOptions = (displays || []).map((d) => `<option value="${d.id}" ${preferredDisplayId === d.id ? 'selected' : ''}>${d.label}</option>`).join('');
  const baseStyle = 'padding:8px 12px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:var(--ui-border-radius,4px);';
  viewEl.innerHTML = `
    <div class="view-title-bar">
      <span>[ CONFIGURE SURVEILLANCE ]</span>
      <div class="title-bar-actions"></div>
    </div>
    <div class="settings-tabs" style="display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap;">
      <button type="button" class="hud-btn settings-tab-btn active" data-tab="general">General</button>
      <button type="button" class="hud-btn settings-tab-btn" data-tab="sound">Sound</button>
      <button type="button" class="hud-btn settings-tab-btn" data-tab="display">Display</button>
      <button type="button" class="hud-btn settings-tab-btn" data-tab="appearance">Appearance</button>
      <button type="button" class="hud-btn settings-tab-btn" data-tab="grok">Erm, Grok</button>
      <button type="button" class="hud-btn settings-tab-btn" data-tab="extension">Extension</button>
      <button type="button" class="hud-btn settings-tab-btn" data-tab="virus">Virus popup</button>
      <button type="button" class="hud-btn settings-tab-btn" data-tab="platforms">Platform accounts</button>
      <button type="button" class="hud-btn settings-tab-btn" data-tab="embed">Chat embed</button>
      <button type="button" class="hud-btn settings-tab-btn" data-tab="chat">Chat</button>
    </div>
    <div class="settings-panels" style="display:flex;flex-direction:column;gap:16px;max-width:520px;max-height:70vh;overflow-y:auto;">
      <div class="settings-tab-panel active" id="settings-panel-general" data-panel="general" style="display:flex;">
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Splash screen</h3>
          <label style="display:block;margin-bottom:4px;opacity:0.8;">Duration (ms)</label>
          <input type="number" id="settings-splash-duration" value="${splashDurationMs}" min="2000" max="15000" step="500" style="width:100px;${baseStyle}" />
          <span style="font-size:12px;opacity:0.6;margin-left:8px;">2–15 seconds</span>
        </div>
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Dev Log</h3>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="settings-devlog-visible" ${devLogVisible ? 'checked' : ''} />
            <span>Enable Dev Log — adds button at bottom of sidebar; logs display in the main panel on the right</span>
          </label>
        </div>
        
        <div class="hud-panel" style="padding:16px;">
          <label style="display:block;margin-bottom:4px;opacity:0.8;">Extension bridge port</label>
          <input type="number" id="settings-port" value="${bridgePort}" min="1024" max="65535" style="width:100px;${baseStyle}" />
          <span style="font-size:12px;opacity:0.6;margin-left:8px;">Restart extension after change</span>
        </div>
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Podawful AV HELL</h3>
          <label style="display:block;margin-bottom:4px;opacity:0.8;">Music folder (default: src/music)</label>
        <div style="display:flex;gap:8px;">
            <input type="text" id="settings-music-folder" readonly value="${esc(musicFolder || '')}" placeholder="src/music" style="flex:1;${baseStyle}font-size:12px;" />
            <button type="button" id="settings-music-browse" class="hud-btn">Select folder</button>
        </div>
      </div>
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Command Center</h3>
          <label style="display:block;margin-bottom:4px;opacity:0.8;">YouTube channel URL (for latest video on home)</label>
          <input type="text" id="settings-command-center-youtube" value="${esc(commandCenterYouTubeChannel || '')}" placeholder="https://www.youtube.com/channel/UC…" style="width:100%;${baseStyle}font-size:12px;" />
          <span style="font-size:12px;opacity:0.6;">Leave empty to show link only. Use channel URL like youtube.com/channel/UC…</span>
        </div>
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Pod Awful feed alarm</h3>
          <p style="opacity:0.8;font-size:12px;margin:0 0 12px 0;">CRT pop-out, alarm tone, and main-window shake when this channel posts a new video or goes live. Uses the Command Center URL above (default @podawfulH2BH).</p>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer;">
            <input type="checkbox" id="settings-feed-alert-enabled" ${feedAlertEnabled ? 'checked' : ''} />
            <span>Enable feed detection &amp; CRT alert</span>
          </label>
          <label style="display:block;margin-bottom:4px;opacity:0.8;">Poll interval (ms)</label>
          <input type="number" id="settings-feed-alert-poll" value="${Number(feedAlertPollMs) || 90000}" min="20000" max="600000" step="5000" style="width:120px;${baseStyle}" />
          <span style="font-size:12px;opacity:0.6;margin-left:8px;">20s–10min — RSS for uploads; add YouTube Data API key under Chat for faster live detection</span>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <button type="button" id="settings-feed-alert-test-crt" class="hud-btn">Test CRT window</button>
            <button type="button" id="settings-feed-alert-check-now" class="hud-btn">Check feed now</button>
          </div>
          <hr style="border:none;border-top:1px solid var(--color-border);margin:14px 0;opacity:0.6;" />
          <h4 style="margin:0 0 8px 0;font-size:13px;opacity:0.95;">X / Twitter (@podawful)</h4>
          <p style="opacity:0.75;font-size:12px;margin:0 0 10px 0;">Separate chime and a corner popup with embed + scraped text when a new tweet appears (same poll interval as above).</p>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;cursor:pointer;">
            <input type="checkbox" id="settings-tweet-alert-enabled" ${tweetAlertEnabled ? 'checked' : ''} />
            <span>Enable tweet alerts</span>
          </label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" id="settings-tweet-alert-test" class="hud-btn">Test tweet popup</button>
            <button type="button" id="settings-tweet-alert-check" class="hud-btn">Check tweets now</button>
          </div>
          <p style="font-size:11px;opacity:0.65;margin:14px 0 8px 0;">Temp — full real alert chain (main-window FX, OS notification, sound, popup):</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" id="settings-demo-video-alert" class="hud-btn">Demo video alert</button>
            <button type="button" id="settings-demo-tweet-alert" class="hud-btn">Demo tweet alert</button>
          </div>
        </div>
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Updates</h3>
          <button type="button" id="settings-check-updates" class="hud-btn">Check for updates</button>
          <span style="font-size:12px;opacity:0.6;margin-left:8px;">Only works when running from installer; checks GitHub Releases.</span>
        </div>
      </div>
      <div class="settings-tab-panel" id="settings-panel-sound" data-panel="sound" style="display:none;">
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Sound options</h3>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;">
            <input type="checkbox" id="settings-sound-boot" ${soundBoot ? 'checked' : ''} />
            <span>Play boot sound on splash</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="settings-sound-exit" ${soundExit ? 'checked' : ''} />
            <span>Play sound on exit / Reboot system</span>
          </label>
        </div>
      </div>
      <div class="settings-tab-panel" id="settings-panel-grok" data-panel="grok" style="display:none;">
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Erm, Grok</h3>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:12px;">
            <input type="checkbox" id="settings-grok-enabled" ${grokEnabled ? 'checked' : ''} />
            <span>Enable Grok (sidebar buddy, tray menu, Ctrl+Shift+G popout)</span>
          </label>
          <div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:14px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="settings-grok-roast" ${grokRoastMode ? 'checked' : ''} />
              <span>Roast mode</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="settings-grok-troll" ${grokTrollMode ? 'checked' : ''} />
              <span>Troll mode</span>
            </label>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:10px 12px;align-items:center;max-width:420px;">
            <label style="opacity:0.85;">Volume</label>
            <input type="range" id="settings-grok-volume" min="0" max="100" value="${Math.round((Number(grokVolume) || 0.4) * 100)}" />
            <label style="opacity:0.85;">Accent</label>
            <select id="settings-grok-theme" style="max-width:200px;${baseStyle}">
              <option value="default" ${grokTheme === 'amber' ? '' : 'selected'}>Match HUD</option>
              <option value="amber" ${grokTheme === 'amber' ? 'selected' : ''}>Amber</option>
            </select>
            <label style="opacity:0.85;">Random min (ms)</label>
            <input type="number" id="settings-grok-rand-min" value="${Number(grokRandMin) || 5000}" min="1000" step="500" style="width:120px;${baseStyle}" />
            <label style="opacity:0.85;">Random max (ms)</label>
            <input type="number" id="settings-grok-rand-max" value="${Number(grokRandMax) || 9000}" min="1500" step="500" style="width:120px;${baseStyle}" />
          </div>
          <h4 style="margin:16px 0 8px 0;font-size:13px;opacity:0.95;">Random categories</h4>
          <div style="display:flex;flex-wrap:wrap;gap:12px 18px;">
            ${(() => {
              const t = grokCats && typeof grokCats === 'object' ? grokCats : { idle: true, drama: true, goon_alert: true, lolcow_alert: true, investigation: true };
              const mk = (k, label) => `<label style=\"display:flex;align-items:center;gap:8px;cursor:pointer;\"><input type=\"checkbox\" class=\"settings-grok-cat\" data-cat=\"${k}\" ${t[k] !== false ? 'checked' : ''} /> <span>${label}</span></label>`;
              return [
                mk('idle', 'Idle'),
                mk('drama', 'Drama'),
                mk('goon_alert', 'Goon alert'),
                mk('lolcow_alert', 'Lolcow'),
                mk('investigation', 'Investigation')
              ].join('');
            })()}
          </div>
          <p style="opacity:0.65;font-size:12px;margin:14px 0 0 0;">Tip: Grok lives in the left sidebar; pop out or overlay from there. Tune behavior here.</p>
        </div>
      </div>
      <div class="settings-tab-panel" id="settings-panel-display" data-panel="display" style="display:none;">
        <div class="hud-panel" style="padding:16px;">
        <h3 style="margin-top:0;font-size:14px;">Display</h3>
        <label style="display:block;margin-bottom:4px;opacity:0.8;">Preferred monitor (splash and main window open here)</label>
          <select id="settings-display" style="width:100%;max-width:280px;${baseStyle}">
          <option value="" ${preferredDisplayId == null ? 'selected' : ''}>System default (primary)</option>
          ${displayOptions}
        </select>
          <p style="font-size:12px;opacity:0.7;margin-top:12px;">Window positions are saved automatically when you close each window.</p>
      </div>
      </div>
      <div class="settings-tab-panel" id="settings-panel-appearance" data-panel="appearance" style="display:none;">
        <div class="hud-panel" style="padding:16px;margin-bottom:16px;">
        <label style="display:block;margin-bottom:4px;opacity:0.8;">Theme</label>
          <select id="settings-theme" style="width:200px;${baseStyle}">
          <option value="default" ${theme === 'default' ? 'selected' : ''}>CRT Security (default)</option>
          <option value="podawful" ${theme === 'podawful' ? 'selected' : ''}>Podawful</option>
          <option value="redmode" ${theme === 'redmode' ? 'selected' : ''}>RED MODE</option>
          <option value="polocule" ${theme === 'polocule' ? 'selected' : ''}>Polycule Blue</option>
          <option value="paycell" ${theme === 'paycell' ? 'selected' : ''}>Paycell Green</option>
          <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
          <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
        </select>
      </div>
        <div class="hud-panel" style="padding:16px;">
        <h3 style="margin-top:0;font-size:14px;">Customize UI</h3>
        <p style="opacity:0.8;font-size:12px;margin-bottom:12px;">Override colors, text size, and button style. Leave blank to use theme defaults.</p>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 12px;align-items:center;max-width:400px;">
          <label style="opacity:0.9;">Background</label>
          <input type="color" id="custom-bg" style="width:48px;height:28px;padding:2px;cursor:pointer;border:1px solid var(--color-border);" />
          <label style="opacity:0.9;">Surface</label>
          <input type="color" id="custom-surface" style="width:48px;height:28px;padding:2px;cursor:pointer;border:1px solid var(--color-border);" />
          <label style="opacity:0.9;">Text</label>
          <input type="color" id="custom-text" style="width:48px;height:28px;padding:2px;cursor:pointer;border:1px solid var(--color-border);" />
          <label style="opacity:0.9;">Accent</label>
          <input type="color" id="custom-accent" style="width:48px;height:28px;padding:2px;cursor:pointer;border:1px solid var(--color-border);" />
          <label style="opacity:0.9;">Font size (px)</label>
            <input type="number" id="custom-fontSize" min="10" max="24" placeholder="14" style="width:80px;${baseStyle}" />
          <label style="opacity:0.9;">Button padding</label>
            <input type="text" id="custom-buttonPadding" placeholder="8px 12px" style="width:100px;${baseStyle}" />
          <label style="opacity:0.9;">Border radius (px)</label>
            <input type="number" id="custom-borderRadius" min="0" max="24" placeholder="0" style="width:80px;${baseStyle}" />
            <label style="opacity:0.9;">Border color</label>
            <input type="color" id="custom-border" style="width:48px;height:28px;padding:2px;cursor:pointer;border:1px solid var(--color-border);" />
            <label style="opacity:0.9;">Font family</label>
            <select id="custom-fontFamily" style="width:180px;${baseStyle}">
              <option value="">Theme default</option>
              <option value="monospace">Monospace</option>
              <option value="VT323, monospace">VT323</option>
              <option value="Consolas, monospace">Consolas</option>
              <option value="system-ui, sans-serif">System UI</option>
            </select>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button type="button" id="custom-save" class="hud-btn">Apply custom UI</button>
          <button type="button" id="custom-reset" class="hud-btn">Reset to theme</button>
        </div>
          <h3 style="margin-top:16px;font-size:14px;">Saved presets</h3>
          <p style="opacity:0.8;font-size:12px;margin-bottom:8px;">Save current colors/UI as a named preset, or load/delete presets.</p>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <select id="custom-preset-select" style="min-width:140px;${baseStyle}">
              <option value="">— Select preset —</option>
              ${(presetNames || []).map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}
            </select>
            <button type="button" id="custom-preset-load" class="hud-btn">Load</button>
            <button type="button" id="custom-preset-delete" class="hud-btn">Delete</button>
      </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
            <input type="text" id="custom-preset-name" placeholder="Preset name" style="width:140px;${baseStyle}" />
            <button type="button" id="custom-preset-save" class="hud-btn">Save current as preset</button>
      </div>
        </div>
      </div>
      <div class="settings-tab-panel" id="settings-panel-extension" data-panel="extension" style="display:none;">
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Goonopticon Bridge — your eyes on the web</h3>
          <p style="opacity:0.8;font-size:13px;margin-bottom:12px;">Load the extension to wield timecodes across YouTube, Vimeo, Twitch. Boom — instant seek.</p>
          <ol style="margin:0 0 12px 0;padding-left:20px;opacity:0.9;font-size:13px;">
            <li>Open <code>chrome://extensions</code></li>
            <li>Enable <strong>Developer mode</strong></li>
            <li>Click <strong>Load unpacked</strong></li>
            <li>Select the extension folder</li>
          </ol>
          <div style="display:flex;gap:8px;">
            <input type="text" id="settings-extension-path" readonly style="flex:1;${baseStyle}font-size:12px;" />
            <button type="button" id="settings-copy-path" class="hud-btn" title="Copy path">Copy Path</button>
            <button type="button" id="settings-open-extensions" class="hud-btn" title="Opens Chrome or Edge extensions page">Open extensions</button>
          </div>
        </div>
      </div>
      <div class="settings-tab-panel" id="settings-panel-virus" data-panel="virus" style="display:none;">
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Virus popup</h3>
          <p style="opacity:0.8;font-size:12px;margin-bottom:12px;">A fake malware-style window that picks a random video from a folder and plays it, then closes. Random interval 2–15 min when enabled.</p>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer;">
            <input type="checkbox" id="settings-virus-popup" ${virusPopupEnabled ? 'checked' : ''} />
            <span>Enable virus popup</span>
        </label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="settings-virus-folder" readonly value="${(virusVideoFolder || '').replace(/"/g, '&quot;')}" placeholder="Video folder" style="flex:1;${baseStyle}font-size:12px;" />
            <button type="button" id="settings-virus-browse" class="hud-btn">Browse</button>
          </div>
        </div>
      </div>
      <div class="settings-tab-panel" id="settings-panel-platforms" data-panel="platforms" style="display:none;">
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Platform accounts (moderation &amp; polls)</h3>
          <p style="opacity:0.8;font-size:12px;margin-bottom:12px;">Sign in to timeout, ban, add mods, and create polls from the Chat view. Tokens are stored locally.</p>
          <p style="font-size:11px;opacity:0.8;margin-bottom:12px;">Redirect URI: <code style="background:var(--color-surface);padding:2px 6px;">http://localhost:8765/callback</code> — add this in each platform's app settings.</p>
          <h4 style="font-size:12px;margin:12px 0 6px 0;">Twitch</h4>
          <label style="display:block;margin-bottom:2px;opacity:0.8;font-size:11px;">Client ID</label>
          <input type="text" id="settings-twitch-client-id" value="${esc(authTwitch?.clientId || '')}" placeholder="Twitch app client ID" style="width:100%;${baseStyle}font-size:12px;margin-bottom:8px;" />
          <label style="display:block;margin-bottom:2px;opacity:0.8;font-size:11px;">Client secret</label>
          <input type="password" id="settings-twitch-client-secret" value="${esc(authTwitch?.clientSecret || '')}" placeholder="Twitch app client secret" style="width:100%;${baseStyle}font-size:12px;margin-bottom:8px;" autocomplete="off" />
          <label style="display:block;margin-bottom:2px;opacity:0.8;font-size:11px;">Access token (optional; use Sign in to get one)</label>
          <input type="password" id="settings-twitch-token" value="${esc(authTwitch?.accessToken || '')}" placeholder="OAuth token" style="width:100%;${baseStyle}font-size:12px;margin-bottom:8px;" autocomplete="off" />
          <button type="button" id="settings-twitch-signin" class="hud-btn">Sign in with Twitch</button>
          <h4 style="font-size:12px;margin:12px 0 6px 0;">Kick</h4>
          <label style="display:block;margin-bottom:2px;opacity:0.8;font-size:11px;">Client ID</label>
          <input type="text" id="settings-kick-client-id" value="${esc(authKick?.clientId || '')}" placeholder="Kick app client ID" style="width:100%;${baseStyle}font-size:12px;margin-bottom:8px;" />
          <label style="display:block;margin-bottom:2px;opacity:0.8;font-size:11px;">Client secret</label>
          <input type="password" id="settings-kick-client-secret" value="${esc(authKick?.clientSecret || '')}" placeholder="Kick app client secret" style="width:100%;${baseStyle}font-size:12px;margin-bottom:8px;" autocomplete="off" />
          <button type="button" id="settings-kick-signin" class="hud-btn">Sign in with Kick</button>
          <h4 style="font-size:12px;margin:12px 0 6px 0;">YouTube</h4>
          <label style="display:block;margin-bottom:2px;opacity:0.8;font-size:11px;">Client ID</label>
          <input type="text" id="settings-youtube-client-id" value="${esc(authYoutube?.clientId || '')}" placeholder="Google OAuth client ID" style="width:100%;${baseStyle}font-size:12px;margin-bottom:8px;" />
          <label style="display:block;margin-bottom:2px;opacity:0.8;font-size:11px;">Client secret</label>
          <input type="password" id="settings-youtube-client-secret" value="${esc(authYoutube?.clientSecret || '')}" placeholder="Google OAuth client secret" style="width:100%;${baseStyle}font-size:12px;margin-bottom:8px;" autocomplete="off" />
          <button type="button" id="settings-youtube-signin" class="hud-btn">Sign in with YouTube</button>
        </div>
      </div>
      <div class="settings-tab-panel" id="settings-panel-embed" data-panel="embed" style="display:none;">
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Embed chat on a website</h3>
          <p style="opacity:0.8;font-size:12px;margin-bottom:12px;">Run a local server that serves the chat. Use the URL in OBS Browser Source or in an iframe on your site (same machine or local network).</p>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:12px;">
            <input type="checkbox" id="settings-embed-enabled" ${embedEnabled ? 'checked' : ''} />
            <span>Enable embed server</span>
        </label>
          <label style="display:block;margin-bottom:2px;opacity:0.8;font-size:11px;">Port</label>
          <input type="number" id="settings-embed-port" value="${embedPort}" min="1024" max="65535" style="width:100px;${baseStyle}margin-bottom:12px;" />
          <label style="display:block;margin-bottom:2px;opacity:0.8;font-size:11px;">Embed URL</label>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <input type="text" id="settings-embed-url" readonly value="http://localhost:${embedPort}" style="flex:1;${baseStyle}font-size:12px;" />
            <button type="button" class="hud-btn" id="settings-embed-copy-url">Copy</button>
      </div>
          <label style="display:block;margin-bottom:2px;opacity:0.8;font-size:11px;">Embed code (iframe for your website)</label>
          <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;">
            <textarea id="settings-embed-iframe" readonly rows="3" style="flex:1;${baseStyle}font-size:11px;font-family:monospace;resize:vertical;"><iframe src="http://localhost:${embedPort}" width="400" height="500" frameborder="0" title="Chat"></iframe></textarea>
            <button type="button" class="hud-btn" id="settings-embed-copy-iframe">Copy</button>
          </div>
          <p style="font-size:11px;opacity:0.7;">On another device use your PC’s IP instead of localhost (e.g. http://192.168.1.10:${embedPort}).</p>
        </div>
      </div>
      <div class="settings-tab-panel" id="settings-panel-chat" data-panel="chat" style="display:none;">
        <div class="hud-panel" style="padding:16px;">
          <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Chat (unified livestream)</h3>
          <label style="display:block;margin-bottom:4px;opacity:0.8;">YouTube Data API key (optional — for YouTube live chat in Chat view)</label>
          <input type="password" id="settings-youtube-chat-apikey" value="${esc(youtubeChatApiKey || '')}" placeholder="AIza..." style="width:100%;max-width:320px;${baseStyle}font-size:12px;" autocomplete="off" />
          <label style="display:block;margin-top:12px;margin-bottom:4px;opacity:0.8;">Discord bot token (optional — for Discord text channels in Chat view)</label>
          <input type="password" id="settings-discord-bot-token" value="${esc(discordBotToken || '')}" placeholder="Bot token" style="width:100%;max-width:320px;${baseStyle}font-size:12px;" autocomplete="off" />
          <p style="font-size:11px;opacity:0.75;margin-top:6px;margin-bottom:0;line-height:1.35;">
            Requires a bot with <code>Message Content</code> intent enabled in the Developer Portal.
          </p>
          <details style="margin-top:8px;font-size:11px;opacity:0.8;">
            <summary style="cursor:pointer;">How to get a YouTube API key</summary>
            <ol style="margin:6px 0 0 0;padding-left:18px;line-height:1.5;">
              <li>Open <a href="#" id="settings-youtube-apikey-console-link">Google Cloud Console → APIs &amp; Services → Credentials</a>.</li>
              <li>Create a project (or pick one), then enable <strong>YouTube Data API v3</strong> (APIs &amp; Services → Library).</li>
              <li>Go to Credentials → Create credentials → API key. Copy the key.</li>
              <li>Paste it above and leave the Chat view or change any setting to save. Then in Chat, click Add on YouTube.</li>
            </ol>
          </details>
          <label style="display:flex;align-items:center;gap:8px;margin-top:12px;cursor:pointer;">
            <input type="checkbox" id="settings-filter-platform-emotes" ${filterPlatformEmotes ? 'checked' : ''} />
            <span>Filter out emotes from other platforms — only custom emotes show</span>
          </label>
          <label style="display:block;margin-top:8px;margin-bottom:2px;opacity:0.8;font-size:11px;">Additional emote codes to filter (one per line)</label>
          <textarea id="settings-platform-emote-blocklist" rows="4" placeholder="e.g. Kappa&#10;LUL&#10;PogChamp" style="width:100%;max-width:320px;${baseStyle}font-size:12px;resize:vertical;">${esc(platformEmoteBlocklistStr)}</textarea>
          <label style="display:block;margin-top:12px;margin-bottom:2px;opacity:0.8;font-size:11px;">Chat font scale (1–10)</label>
          <input type="number" id="settings-chat-font-scale" value="${chatFontScale}" min="1" max="10" step="1" style="width:80px;${baseStyle}" />
        </div>
        <div class="hud-panel" style="padding:16px;">
          <h3 style="margin-top:0;font-size:14px;">Banned words/phrases</h3>
          <p style="opacity:0.8;font-size:12px;margin-bottom:8px;">One per line. Literal phrase = hide message. <code>phrase | timeout 600</code> = auto-timeout 600s. <code>/regex/</code> = regex match (hide).</p>
          <textarea id="settings-nuke-phrases" rows="6" style="width:100%;${baseStyle}font-size:12px;resize:vertical;">${esc(nukePhrasesStr)}</textarea>
          <h3 style="margin-top:16px;font-size:14px;">Custom commands</h3>
          <p style="opacity:0.8;font-size:12px;margin-bottom:8px;">One per line: <code>!trigger</code> then tab, then response. e.g. <code>!hello	HEY HOWDY</code></p>
          <textarea id="settings-custom-commands" rows="6" style="width:100%;${baseStyle}font-size:12px;resize:vertical;">${esc(customCommandsStr)}</textarea>
          <h3 style="margin-top:16px;font-size:14px;">Highlight keywords</h3>
          <p style="opacity:0.8;font-size:12px;margin-bottom:8px;">Messages containing any of these words (one per line) get a highlight. Case-insensitive.</p>
          <textarea id="settings-highlight-keywords" rows="3" style="width:100%;${baseStyle}font-size:12px;resize:vertical;">${esc(chatHighlightKeywordsStr)}</textarea>
          </div>
      </div>
    </div>
  `;
  const tabLabels = { general: 'General', sound: 'Sound', display: 'Display', appearance: 'Appearance', grok: 'Erm, Grok', extension: 'Extension', virus: 'Virus popup', platforms: 'Platform accounts', embed: 'Chat embed', chat: 'Chat' };
  document.querySelectorAll('.settings-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      devLogPush('action', 'Settings: tab → ' + (tabLabels[tab] || tab));
      document.querySelectorAll('.settings-tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.settings-tab-panel').forEach((p) => {
        p.style.display = p.getAttribute('data-panel') === tab ? 'flex' : 'none';
        p.classList.toggle('active', p.getAttribute('data-panel') === tab);
      });
      btn.classList.add('active');
    });
  });
  const themeEl = document.getElementById('settings-theme');
  if (themeEl) {
    themeEl.addEventListener('change', async () => {
      devLogPush('action', `Settings: theme → ${themeEl.value}`);
      await window.goonAPI.setTheme(themeEl.value);
      if (window.__applyTheme) await window.__applyTheme();
      refreshSplashText();
      window.goonAPI?.showToast?.('Theme applied');
    });
  }
  const displayEl = document.getElementById('settings-display');
  if (displayEl) {
    displayEl.addEventListener('change', async () => {
      const val = displayEl.value;
      await window.goonAPI.setPreferredDisplayId?.(val === '' ? null : Number(val));
      window.goonAPI?.showToast?.('Display preference saved');
    });
  }
  const splashDurationEl = document.getElementById('settings-splash-duration');
  if (splashDurationEl) {
    splashDurationEl.addEventListener('change', async () => {
      const n = parseInt(splashDurationEl.value, 10);
      if (n >= 2000 && n <= 15000) {
        await window.goonAPI.setSplashDurationMs?.(n);
        window.goonAPI?.showToast?.('Splash duration saved');
      }
    });
  }
  const soundBootEl = document.getElementById('settings-sound-boot');
  if (soundBootEl) {
    soundBootEl.addEventListener('change', async () => {
      await window.goonAPI.setSoundBootEnabled?.(soundBootEl.checked);
    });
  }
  const soundExitEl = document.getElementById('settings-sound-exit');
  if (soundExitEl) {
    soundExitEl.addEventListener('change', async () => {
      await window.goonAPI.setSoundExitEnabled?.(soundExitEl.checked);
    });
  }
  const grokEnabledEl = document.getElementById('settings-grok-enabled');
  if (grokEnabledEl) {
    grokEnabledEl.addEventListener('change', async () => {
      const on = grokEnabledEl.checked;
      await window.goonAPI.setGrokEnabled?.(on);
      window.__menuGrokSetEnabled?.(on);
    });
  }
  const grokRoastEl = document.getElementById('settings-grok-roast');
  const grokTrollEl = document.getElementById('settings-grok-troll');
  if (grokRoastEl) {
    grokRoastEl.addEventListener('change', async () => {
      const on = !!grokRoastEl.checked;
      if (on && grokTrollEl) grokTrollEl.checked = false;
      await window.goonAPI.grokBuddy?.setGrokRoastMode?.(on);
      if (on) await window.goonAPI.grokBuddy?.setGrokTrollMode?.(false);
      window.__menuGrokReloadSettings?.();
      window.goonAPI?.showToast?.(on ? 'Grok: Roast mode enabled' : 'Grok: Roast mode disabled');
    });
  }
  if (grokTrollEl) {
    grokTrollEl.addEventListener('change', async () => {
      const on = !!grokTrollEl.checked;
      if (on && grokRoastEl) grokRoastEl.checked = false;
      await window.goonAPI.grokBuddy?.setGrokTrollMode?.(on);
      if (on) await window.goonAPI.grokBuddy?.setGrokRoastMode?.(false);
      window.__menuGrokReloadSettings?.();
      window.goonAPI?.showToast?.(on ? 'Grok: Troll mode enabled' : 'Grok: Troll mode disabled');
    });
  }
  const grokVolEl = document.getElementById('settings-grok-volume');
  if (grokVolEl) {
    grokVolEl.addEventListener('input', async () => {
      const v = Math.max(0, Math.min(1, Number(grokVolEl.value) / 100));
      await window.goonAPI.grokBuddy?.setGrokVolume?.(v);
      window.__menuGrokReloadSettings?.();
    });
  }
  const grokThemeEl = document.getElementById('settings-grok-theme');
  if (grokThemeEl) {
    grokThemeEl.addEventListener('change', async () => {
      await window.goonAPI.grokBuddy?.setGrokTheme?.(grokThemeEl.value === 'amber' ? 'amber' : 'default');
      window.__menuGrokReloadSettings?.();
    });
  }
  const grokMinEl = document.getElementById('settings-grok-rand-min');
  const grokMaxEl = document.getElementById('settings-grok-rand-max');
  async function saveGrokIntervals() {
    const min = Math.max(1000, Number(grokMinEl?.value) || 5000);
    const max = Math.max(1500, Number(grokMaxEl?.value) || 9000);
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    if (grokMinEl) grokMinEl.value = String(lo);
    if (grokMaxEl) grokMaxEl.value = String(hi);
    await window.goonAPI.grokBuddy?.setGrokRandomIntervalMin?.(lo);
    await window.goonAPI.grokBuddy?.setGrokRandomIntervalMax?.(hi);
    window.__menuGrokReloadSettings?.();
  }
  grokMinEl?.addEventListener('change', saveGrokIntervals);
  grokMaxEl?.addEventListener('change', saveGrokIntervals);
  document.querySelectorAll('.settings-grok-cat[data-cat]').forEach((el) => {
    el.addEventListener('change', async () => {
      const toggles = {};
      document.querySelectorAll('.settings-grok-cat[data-cat]').forEach((cb) => {
        const k = cb.getAttribute('data-cat');
        if (k) toggles[k] = !!cb.checked;
      });
      await window.goonAPI.grokBuddy?.setGrokCategoryToggles?.(toggles);
      window.__menuGrokReloadSettings?.();
    });
  });
  window.__menuGrokSetEnabled?.(grokEnabled);
  window.__menuGrokReloadSettings?.();
  const devLogVisibleEl = document.getElementById('settings-devlog-visible');
  if (devLogVisibleEl) {
    devLogVisibleEl.addEventListener('change', async () => {
      const on = devLogVisibleEl.checked;
      devLogPush('action', on ? 'Settings: Dev Log enabled' : 'Settings: Dev Log disabled');
      await window.goonAPI.setDevLogVisible?.(on);
      const btn = document.getElementById('btn-devlog');
      if (btn) btn.style.display = on ? '' : 'none';
    });
  }
  const youtubeChatApiKeyEl = document.getElementById('settings-youtube-chat-apikey');
  if (youtubeChatApiKeyEl) {
    youtubeChatApiKeyEl.addEventListener('change', async () => {
      await window.goonAPI.setYouTubeChatApiKey?.(youtubeChatApiKeyEl.value?.trim() || '');
      window.goonAPI?.showToast?.('YouTube API key saved');
    });
  }
  const discordBotTokenEl = document.getElementById('settings-discord-bot-token');
  if (discordBotTokenEl) {
    discordBotTokenEl.addEventListener('change', async () => {
      await window.goonAPI.setDiscordBotToken?.(discordBotTokenEl.value?.trim() || '');
      window.goonAPI?.showToast?.('Discord bot token saved');
    });
  }
  document.getElementById('settings-youtube-apikey-console-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.goonAPI.openExternal?.('https://console.cloud.google.com/apis/credentials');
  });
  const saveTwitchAuth = async () => {
    const clientId = document.getElementById('settings-twitch-client-id')?.value?.trim() || '';
    const clientSecret = document.getElementById('settings-twitch-client-secret')?.value?.trim() || '';
    const accessToken = document.getElementById('settings-twitch-token')?.value?.trim() || '';
    const existing = await window.goonAPI.getPlatformAuth?.('twitch');
    await window.goonAPI.setPlatformAuth?.('twitch', (clientId || accessToken) ? { ...existing, clientId, clientSecret: clientSecret || existing?.clientSecret, accessToken } : null);
    window.goonAPI?.showToast?.('Twitch auth saved');
  };
  document.getElementById('settings-twitch-client-id')?.addEventListener('change', saveTwitchAuth);
  document.getElementById('settings-twitch-client-secret')?.addEventListener('change', saveTwitchAuth);
  document.getElementById('settings-twitch-token')?.addEventListener('change', saveTwitchAuth);
  document.getElementById('settings-twitch-signin')?.addEventListener('click', async () => {
    await saveTwitchAuth();
    const r = await window.goonAPI.chatStartOAuth?.('twitch');
    window.goonAPI?.showToast?.(r?.ok ? 'Twitch signed in' : (r?.error || 'Sign-in failed'));
    if (r?.ok) loadSettingsView();
  });
  const saveKickAuth = async () => {
    const clientId = document.getElementById('settings-kick-client-id')?.value?.trim() || '';
    const clientSecret = document.getElementById('settings-kick-client-secret')?.value?.trim() || '';
    const existing = await window.goonAPI.getPlatformAuth?.('kick');
    await window.goonAPI.setPlatformAuth?.('kick', (clientId || existing?.accessToken) ? { ...existing, clientId, clientSecret: clientSecret || existing?.clientSecret, accessToken: existing?.accessToken } : null);
    window.goonAPI?.showToast?.('Kick auth saved');
  };
  document.getElementById('settings-kick-client-id')?.addEventListener('change', saveKickAuth);
  document.getElementById('settings-kick-client-secret')?.addEventListener('change', saveKickAuth);
  document.getElementById('settings-kick-signin')?.addEventListener('click', async () => {
    await saveKickAuth();
    const r = await window.goonAPI.chatStartOAuth?.('kick');
    window.goonAPI?.showToast?.(r?.ok ? 'Kick signed in' : (r?.error || 'Sign-in failed'));
    if (r?.ok) loadSettingsView();
  });
  const saveYoutubeAuth = async () => {
    const clientId = document.getElementById('settings-youtube-client-id')?.value?.trim() || '';
    const clientSecret = document.getElementById('settings-youtube-client-secret')?.value?.trim() || '';
    const existing = await window.goonAPI.getPlatformAuth?.('youtube');
    await window.goonAPI.setPlatformAuth?.('youtube', (clientId || existing?.accessToken) ? { ...existing, clientId, clientSecret: clientSecret || existing?.clientSecret, accessToken: existing?.accessToken } : null);
    window.goonAPI?.showToast?.('YouTube auth saved');
  };
  document.getElementById('settings-youtube-client-id')?.addEventListener('change', saveYoutubeAuth);
  document.getElementById('settings-youtube-client-secret')?.addEventListener('change', saveYoutubeAuth);
  document.getElementById('settings-youtube-signin')?.addEventListener('click', async () => {
    await saveYoutubeAuth();
    const r = await window.goonAPI.chatStartOAuth?.('youtube');
    window.goonAPI?.showToast?.(r?.ok ? 'YouTube signed in' : (r?.error || 'Sign-in failed'));
    if (r?.ok) loadSettingsView();
  });
  const embedEnabledEl = document.getElementById('settings-embed-enabled');
  if (embedEnabledEl) {
    embedEnabledEl.addEventListener('change', async () => {
      await window.goonAPI.chatSetEmbedEnabled?.(embedEnabledEl.checked);
      window.goonAPI?.showToast?.(embedEnabledEl.checked ? 'Embed server started' : 'Embed server stopped');
    });
  }
  const embedPortEl = document.getElementById('settings-embed-port');
  if (embedPortEl) {
    embedPortEl.addEventListener('change', async () => {
      const port = parseInt(embedPortEl.value, 10);
      if (port >= 1024 && port <= 65535) {
        await window.goonAPI.chatSetEmbedPort?.(port);
        const urlEl = document.getElementById('settings-embed-url');
        const iframeEl = document.getElementById('settings-embed-iframe');
        if (urlEl) urlEl.value = 'http://localhost:' + port;
        if (iframeEl) iframeEl.value = '<iframe src="http://localhost:' + port + '" width="400" height="500" frameborder="0" title="Chat"></iframe>';
        window.goonAPI?.showToast?.('Port saved');
      }
    });
  }
  document.getElementById('settings-embed-copy-url')?.addEventListener('click', async () => {
    const url = document.getElementById('settings-embed-url')?.value || '';
    if (url) await navigator.clipboard.writeText(url);
    window.goonAPI?.showToast?.('URL copied');
  });
  document.getElementById('settings-embed-copy-iframe')?.addEventListener('click', async () => {
    const code = document.getElementById('settings-embed-iframe')?.value || '';
    if (code) await navigator.clipboard.writeText(code);
    window.goonAPI?.showToast?.('Embed code copied');
  });
  const filterPlatformEmotesEl = document.getElementById('settings-filter-platform-emotes');
  if (filterPlatformEmotesEl) {
    filterPlatformEmotesEl.addEventListener('change', async () => {
      await window.goonAPI.chatSetFilterPlatformEmotes?.(filterPlatformEmotesEl.checked);
    });
  }
  const platformEmoteBlocklistEl = document.getElementById('settings-platform-emote-blocklist');
  if (platformEmoteBlocklistEl) {
    platformEmoteBlocklistEl.addEventListener('blur', async () => {
      const list = (platformEmoteBlocklistEl.value || '').split(/\n/).map((s) => s.trim()).filter(Boolean);
      await window.goonAPI.chatSetPlatformEmoteBlocklist?.(list);
    });
  }
  const chatFontScaleEl = document.getElementById('settings-chat-font-scale');
  if (chatFontScaleEl) {
    chatFontScaleEl.addEventListener('change', async () => {
      const n = Math.max(1, Math.min(10, parseInt(chatFontScaleEl.value, 10) || 5));
      chatFontScaleEl.value = n;
      await window.goonAPI.chatSetFontScale?.(n);
      applyUnifiedChatFontSize(n);
    });
  }
  const nukePhrasesEl = document.getElementById('settings-nuke-phrases');
  if (nukePhrasesEl) {
    nukePhrasesEl.addEventListener('blur', async () => {
      const lines = (nukePhrasesEl.value || '').split(/\n/).map((s) => s.trim()).filter(Boolean);
      const list = [];
      for (const line of lines) {
        const timeoutMatch = line.match(/^(.+?)\s*\|\s*timeout\s+(\d+)$/i);
        if (timeoutMatch) {
          list.push({ phrase: timeoutMatch[1].trim(), isRegex: false, action: 'timeout', timeoutSeconds: parseInt(timeoutMatch[2], 10) || 600 });
        } else if (line.startsWith('/') && line.endsWith('/')) {
          list.push({ phrase: line.slice(1, -1), isRegex: true, action: 'hide' });
        } else {
          list.push({ phrase: line, isRegex: false, action: 'hide' });
        }
      }
      await window.goonAPI.chatSetNukePhrases?.(list);
    });
  }
  const customCommandsEl = document.getElementById('settings-custom-commands');
  if (customCommandsEl) {
    customCommandsEl.addEventListener('blur', async () => {
      const lines = (customCommandsEl.value || '').split(/\n/).map((s) => s.trim()).filter(Boolean);
      const obj = {};
      for (const line of lines) {
        const idx = line.indexOf('\t');
        if (idx > 0) {
          const trigger = line.slice(0, idx).trim();
          const response = line.slice(idx + 1).trim();
          if (trigger) obj[trigger] = response;
        }
      }
      await window.goonAPI.chatSetCustomCommands?.(obj);
    });
  }
  const highlightKeywordsEl = document.getElementById('settings-highlight-keywords');
  if (highlightKeywordsEl) {
    highlightKeywordsEl.addEventListener('blur', async () => {
      const list = (highlightKeywordsEl.value || '').split(/\n/).map((s) => s.trim()).filter(Boolean);
      await window.goonAPI.chatSetHighlightKeywords?.(list);
    });
  }
  const virusPopupEl = document.getElementById('settings-virus-popup');
  if (virusPopupEl) {
    virusPopupEl.addEventListener('change', async () => {
      await window.goonAPI.setVirusPopupEnabled?.(virusPopupEl.checked);
    });
  }
  const virusFolderEl = document.getElementById('settings-virus-folder');
  document.getElementById('settings-virus-browse')?.addEventListener('click', async () => {
    const result = await window.goonAPI.showOpenDialog?.({ properties: ['openDirectory'] });
    if (result?.canceled || !result?.filePaths?.[0]) return;
    const folder = result.filePaths[0];
    await window.goonAPI.setVirusVideoFolder?.(folder);
    if (virusFolderEl) virusFolderEl.value = folder;
  });
  const musicFolderEl = document.getElementById('settings-music-folder');
  document.getElementById('settings-music-browse')?.addEventListener('click', async () => {
    const result = await window.goonAPI.showOpenDialog?.({ properties: ['openDirectory'] });
    if (result?.canceled || !result?.filePaths?.[0]) return;
    const folder = result.filePaths[0];
    await window.goonAPI.musicSetFolder?.(folder);
    if (musicFolderEl) musicFolderEl.value = folder;
    window.goonAPI?.showToast?.('Music folder saved');
  });
  const portEl = document.getElementById('settings-port');
  if (portEl) {
    const initialPort = portEl.value;
    portEl.addEventListener('change', async () => {
      const port = parseInt(portEl.value, 10);
      if (port >= 1024 && port <= 65535) {
        const result = await window.goonAPI.setBridgePort(port);
        if (result && result.ok === false) {
          portEl.value = initialPort;
        }
      }
    });
  }
  const commandCenterYtEl = document.getElementById('settings-command-center-youtube');
  if (commandCenterYtEl) {
    commandCenterYtEl.addEventListener('change', () => {
      const url = (commandCenterYtEl.value || '').trim();
      window.goonAPI.setCommandCenterYouTubeChannel?.(url);
      window.goonAPI?.showToast?.(url ? 'Command Center channel saved' : 'Command Center channel cleared');
    });
  }
  document.getElementById('settings-feed-alert-enabled')?.addEventListener('change', (e) => {
    window.goonAPI.setPodawfulFeedAlertEnabled?.(!!e.target.checked);
    window.goonAPI?.showToast?.(e.target.checked ? 'Feed alarm on' : 'Feed alarm off');
  });
  document.getElementById('settings-feed-alert-poll')?.addEventListener('change', (e) => {
    const n = parseInt(e.target.value, 10);
    if (n >= 20000 && n <= 600000) window.goonAPI.setPodawfulFeedAlertPollMs?.(n);
  });
  document.getElementById('settings-feed-alert-test-crt')?.addEventListener('click', () => {
    window.goonAPI.podawfulFeedTestCrt?.();
  });
  document.getElementById('settings-feed-alert-check-now')?.addEventListener('click', async () => {
    const on = await window.goonAPI.getPodawfulFeedAlertEnabled?.();
    if (!on) {
      window.goonAPI?.showToast?.('Enable feed alarm first');
      return;
    }
    await window.goonAPI.podawfulFeedRunCheckNow?.();
    window.goonAPI?.showToast?.('Feed polled');
  });
  document.getElementById('settings-tweet-alert-enabled')?.addEventListener('change', (e) => {
    window.goonAPI.setPodawfulTweetAlertEnabled?.(!!e.target.checked);
    window.goonAPI?.showToast?.(e.target.checked ? 'Tweet alerts on' : 'Tweet alerts off');
  });
  document.getElementById('settings-tweet-alert-test')?.addEventListener('click', async () => {
    const r = await window.goonAPI.podawfulTweetTestPopup?.();
    if (r && r.ok === false) window.goonAPI?.showToast?.(r.error || 'Could not load tweet preview');
  });
  document.getElementById('settings-tweet-alert-check')?.addEventListener('click', async () => {
    const on = await window.goonAPI.getPodawfulTweetAlertEnabled?.();
    if (!on) {
      window.goonAPI?.showToast?.('Enable tweet alerts first');
      return;
    }
    await window.goonAPI.podawfulTweetRunCheckNow?.();
    window.goonAPI?.showToast?.('Tweet poll done');
  });
  document.getElementById('settings-demo-video-alert')?.addEventListener('click', () => {
    window.goonAPI.podawfulFeedDemoFullAlert?.();
  });
  document.getElementById('settings-demo-tweet-alert')?.addEventListener('click', () => {
    window.goonAPI.podawfulTweetDemoFullAlert?.();
  });
  document.getElementById('settings-check-updates')?.addEventListener('click', async () => {
    const btn = document.getElementById('settings-check-updates');
    if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
    try {
      const result = await window.goonAPI?.checkForUpdates?.();
      if (result?.ok === false && result?.error && !result.error.includes('Not running')) window.goonAPI?.showToast?.(result.error);
    } finally {
      const b = document.getElementById('settings-check-updates');
      if (b) { b.disabled = false; b.textContent = 'Check for updates'; }
    }
  });
  const pathInput = document.getElementById('settings-extension-path');
  if (pathInput) pathInput.value = extensionPath;
  document.getElementById('settings-copy-path')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(extensionPath);
      const btn = document.getElementById('settings-copy-path');
      if (btn) { btn.textContent = 'Copied. Path secured.'; setTimeout(() => { btn.textContent = 'Copy path'; }, 2000); }
    } catch {}
  });
  document.getElementById('settings-open-extensions')?.addEventListener('click', () => {
    showBridgeBrowserPicker();
  });

  // Customize UI: prefill
  const setVal = (id, v) => { const el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; };
  if (custom) {
    setVal('custom-bg', custom.background);
    setVal('custom-surface', custom.surface);
    setVal('custom-text', custom.text);
    setVal('custom-accent', custom.primary);
    setVal('custom-border', custom.border);
    if (custom.ui) {
      setVal('custom-fontSize', custom.ui.fontSize);
      setVal('custom-buttonPadding', custom.ui.buttonPadding);
      setVal('custom-borderRadius', custom.ui.borderRadius ? parseInt(String(custom.ui.borderRadius), 10) : '');
      const ffEl = document.getElementById('custom-fontFamily');
      if (ffEl && custom.ui.fontMono) ffEl.value = custom.ui.fontMono;
    }
  }

  document.getElementById('custom-save')?.addEventListener('click', async () => {
    const bg = document.getElementById('custom-bg')?.value;
    const surface = document.getElementById('custom-surface')?.value;
    const text = document.getElementById('custom-text')?.value;
    const accent = document.getElementById('custom-accent')?.value;
    const border = document.getElementById('custom-border')?.value;
    const fontSize = document.getElementById('custom-fontSize')?.value;
    const buttonPadding = document.getElementById('custom-buttonPadding')?.value?.trim();
    const borderRadius = document.getElementById('custom-borderRadius')?.value;
    const fontFamily = document.getElementById('custom-fontFamily')?.value?.trim();
    const obj = {};
    if (hexFromInput(bg)) obj.background = bg;
    if (hexFromInput(surface)) obj.surface = surface;
    if (hexFromInput(text)) obj.text = text;
    if (hexFromInput(accent)) { obj.primary = accent; obj.highlight = accent; }
    if (hexFromInput(border)) obj.border = border;
    const ui = {};
    if (fontSize) ui.fontSize = parseInt(fontSize, 10);
    if (buttonPadding) {
      const parts = buttonPadding.split(/\s+/).filter(Boolean);
      ui.buttonPadding = parts.map((p) => (/\d+/.test(p) && !p.endsWith('px') ? `${p}px` : p)).join(' ');
    }
    if (borderRadius !== '' && borderRadius != null) ui.borderRadius = `${borderRadius}px`;
    if (fontFamily) ui.fontMono = fontFamily;
    if (Object.keys(ui).length) obj.ui = ui;
    await window.goonAPI.setUICustomization(Object.keys(obj).length ? obj : null);
    if (window.__applyTheme) await window.__applyTheme();
    window.goonAPI?.showToast?.('Theme / UI saved');
  });

  document.getElementById('custom-reset')?.addEventListener('click', async () => {
    await window.goonAPI.setUICustomization(null);
    if (window.__applyTheme) await window.__applyTheme();
    window.goonAPI?.showToast?.('Reset to theme');
    loadSettingsView();
  });
  const presetSelect = document.getElementById('custom-preset-select');
  const presetNameInput = document.getElementById('custom-preset-name');
  document.getElementById('custom-preset-load')?.addEventListener('click', async () => {
    const name = presetSelect?.value;
    if (!name || !customPresets?.[name]) return;
    await window.goonAPI.setUICustomization(customPresets[name]);
    if (window.__applyTheme) await window.__applyTheme();
    window.goonAPI?.showToast?.('Preset applied');
  });
  document.getElementById('custom-preset-delete')?.addEventListener('click', async () => {
    const name = presetSelect?.value;
    if (!name) return;
    const next = { ...customPresets };
    delete next[name];
    await window.goonAPI.setCustomThemePresets?.(next);
    window.goonAPI?.showToast?.('Preset deleted');
    loadSettingsView();
  });
  document.getElementById('custom-preset-save')?.addEventListener('click', async () => {
    const name = (presetNameInput?.value || '').trim();
    if (!name) return;
    const bg = document.getElementById('custom-bg')?.value;
    const surface = document.getElementById('custom-surface')?.value;
    const text = document.getElementById('custom-text')?.value;
    const accent = document.getElementById('custom-accent')?.value;
    const border = document.getElementById('custom-border')?.value;
    const fontSize = document.getElementById('custom-fontSize')?.value;
    const buttonPadding = document.getElementById('custom-buttonPadding')?.value?.trim();
    const borderRadius = document.getElementById('custom-borderRadius')?.value;
    const fontFamily = document.getElementById('custom-fontFamily')?.value?.trim();
    const obj = {};
    if (hexFromInput(bg)) obj.background = bg;
    if (hexFromInput(surface)) obj.surface = surface;
    if (hexFromInput(text)) obj.text = text;
    if (hexFromInput(accent)) { obj.primary = accent; obj.highlight = accent; }
    if (hexFromInput(border)) obj.border = border;
    const ui = {};
    if (fontSize) ui.fontSize = parseInt(fontSize, 10);
    if (buttonPadding) {
      const parts = buttonPadding.split(/\s+/).filter(Boolean);
      ui.buttonPadding = parts.map((p) => (/\d+/.test(p) && !p.endsWith('px') ? `${p}px` : p)).join(' ');
    }
    if (borderRadius !== '' && borderRadius != null) ui.borderRadius = `${borderRadius}px`;
    if (fontFamily) ui.fontMono = fontFamily;
    if (Object.keys(ui).length) obj.ui = ui;
    const next = { ...(await window.goonAPI.getCustomThemePresets?.()) || {} };
    if (Object.keys(obj).length) next[name] = obj;
    else delete next[name];
    await window.goonAPI.setCustomThemePresets?.(next);
    presetNameInput.value = '';
    window.goonAPI?.showToast?.('Preset saved');
    loadSettingsView();
  });
}

function loadTrackerView() {
  viewEl.innerHTML = `
    <div class="view-title-bar">
      <span>[ GANGSTALKING ]</span>
      <div class="title-bar-actions"></div>
      </div>
    <p style="opacity:0.8;margin-bottom:12px;">Add profiles to track. YouTube: channel URL (youtube.com/channel/UC…), @handle link, or /c/… — feed uses public RSS.</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <div style="min-width:280px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
          <span style="opacity:0.8;">Targets</span>
          <div style="display:flex;gap:6px;">
            <div class="tracker-export-wrap" id="tracker-export-wrap">
              <button type="button" class="hud-btn" id="tracker-export-btn" aria-expanded="false" aria-haspopup="true" title="Export options">Export ▾</button>
              <div class="tracker-export-menu" id="tracker-export-menu" role="menu">
                <button type="button" class="hud-btn" role="menuitem" data-tracker-export="json" title="Export all targets as JSON">All targets as JSON…</button>
                <button type="button" class="hud-btn" role="menuitem" data-tracker-export="csv" title="Export all targets as CSV">All targets as CSV…</button>
              </div>
            </div>
            <button type="button" class="hud-btn" id="tracker-add-btn">+ Add Target</button>
          </div>
        </div>
        <div id="tracker-list" style="border:1px solid var(--color-border);border-radius:4px;padding:8px;min-height:120px;max-height:320px;overflow-y:auto;background:var(--hud-surface);"></div>
      </div>
      <div style="flex:1;min-width:280px;">
        <div id="tracker-feed-panel" style="border:1px solid var(--color-border);border-radius:4px;padding:12px;background:var(--hud-surface);min-height:200px;">
          <p style="opacity:0.6;margin:0;">Select a target or add one to fetch their YouTube feed.</p>
        </div>
      </div>
    </div>
    <style>
      .tracker-person-row:hover{background:var(--hud-surface);}
      .tracker-export-wrap{position:relative;}
      .tracker-export-menu{
        display:none;flex-direction:column;gap:2px;position:absolute;top:100%;right:0;margin-top:4px;
        min-width:220px;padding:4px;background:var(--hud-surface);border:1px solid var(--hud-border);
        border-radius:var(--ui-border-radius,4px);box-shadow:0 8px 24px rgba(0,0,0,0.4);z-index:60;
      }
      .tracker-export-menu.is-open{display:flex;}
      .tracker-export-menu .hud-btn{width:100%;justify-content:flex-start;text-align:left;font-size:12px;border-radius:4px;}
    </style>
    <div id="tracker-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;align-items:center;justify-content:center;">
      <div style="background:var(--hud-surface);border:1px solid var(--color-border);border-radius:8px;padding:20px;max-width:400px;width:90%;">
        <h3 style="margin:0 0 12px 0;">Add / Edit Target</h3>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div>
            <label style="display:block;font-size:11px;opacity:0.8;margin-bottom:2px;">Name</label>
            <input type="text" id="tracker-modal-name" placeholder="Display name" style="width:100%;padding:8px;box-sizing:border-box;" />
          </div>
          <div>
            <label style="display:block;font-size:11px;opacity:0.8;margin-bottom:2px;">YouTube channel URL</label>
            <input type="text" id="tracker-modal-youtube" placeholder="https://www.youtube.com/@channel or …/channel/UC…" style="width:100%;padding:8px;box-sizing:border-box;" />
          </div>
          <div>
            <label style="display:block;font-size:11px;opacity:0.8;margin-bottom:2px;">Twitter/X handle</label>
            <input type="text" id="tracker-modal-twitter" placeholder="@handle" style="width:100%;padding:8px;box-sizing:border-box;" />
          </div>
          <div>
            <label style="display:block;font-size:11px;opacity:0.8;margin-bottom:2px;">Also known as</label>
            <textarea id="tracker-modal-akas" rows="2" placeholder="Aliases — optional" style="width:100%;padding:8px;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
          </div>
          <div>
            <label style="display:block;font-size:11px;opacity:0.8;margin-bottom:2px;">Notes (optional)</label>
            <textarea id="tracker-modal-bio" rows="4" placeholder="Private notes — full dossier lives in Goonipedia" style="width:100%;padding:8px;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
          </div>
          <div>
            <label style="display:block;font-size:11px;opacity:0.8;margin-bottom:2px;">Avatar (optional)</label>
            <div style="display:flex;align-items:center;gap:8px;">
              <img id="tracker-modal-avatar-preview" src="" alt="" style="width:48px;height:48px;border-radius:50%;object-fit:cover;background:var(--hud-bg);display:none;" />
              <button type="button" class="hud-btn" id="tracker-modal-avatar-btn">Choose image</button>
              <span id="tracker-modal-avatar-path" style="font-size:11px;opacity:0.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;"></span>
            </div>
          </div>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="hud-btn" id="tracker-modal-cancel">Cancel</button>
          <button type="button" class="hud-btn" id="tracker-modal-save">Save</button>
        </div>
      </div>
    </div>
  `;

  let modalEditingId = null;
  let modalAvatarPath = null;

  async function renderTrackerList() {
      const list = document.getElementById('tracker-list');
    const people = await window.goonAPI.trackerGetPeople();
    if (!people.length) {
      list.innerHTML = '<p style="opacity:0.6;margin:0;">No profiles yet. Henchmen, the watch begins when you add one.</p>';
      return;
    }
    list.innerHTML = people
      .map(
        (p) => `
        <div class="tracker-person-row" data-id="${p.id}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;cursor:pointer;margin-bottom:4px;border:1px solid transparent;" title="Click to load feed">
          <img class="tracker-avatar" data-path="${p.avatarPath || ''}" src="" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:var(--hud-bg);" />
          <span style="flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.name)}</span>
<button type="button" class="hud-btn tracker-edit-btn" data-id="${p.id}">Edit</button>
              <button type="button" class="hud-btn tracker-delete-btn" data-id="${p.id}">×</button>
        </div>
      `
      )
      .join('');

    for (const img of list.querySelectorAll('.tracker-avatar')) {
      const path = img.getAttribute('data-path');
      if (path) {
        const dataUrl = await window.goonAPI.trackerGetAvatarDataUrl(path);
        if (dataUrl) img.src = dataUrl;
      }
    }

    list.querySelectorAll('.tracker-person-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('tracker-edit-btn') || e.target.classList.contains('tracker-delete-btn')) return;
        const id = row.getAttribute('data-id');
        const person = people.find((p) => p.id === id);
        if (person) showTrackerFeed(person);
      });
    });
    list.querySelectorAll('.tracker-edit-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTrackerModal(people.find((p) => p.id === btn.getAttribute('data-id')));
      });
    });
    list.querySelectorAll('.tracker-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Remove this target?')) {
          devLogPush('action', 'Tracker: deleted target');
          await window.goonAPI.trackerDeletePerson(btn.getAttribute('data-id'));
          renderTrackerList();
          document.getElementById('tracker-feed-panel').innerHTML = '<p style="opacity:0.6;margin:0;">Select a target to fetch their feed.</p>';
        }
      });
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  async function showTrackerFeed(person) {
    const panel = document.getElementById('tracker-feed-panel');
    panel.innerHTML = `<p style="opacity:0.8;">Loading feed for ${escapeHtml(person.name)}…</p>`;
    const url = person.youtubeUrl || '';
    if (!url.trim()) {
      panel.innerHTML = `<p style="opacity:0.8;">${escapeHtml(person.name)}</p><p style="opacity:0.6;">No YouTube channel URL. Edit target and paste a full @handle or channel/UC… link.</p>`;
      return;
    }
    const entries = await window.goonAPI.trackerFetchYouTubeFeed(url);
    if (!entries.length) {
      panel.innerHTML = `<p style="opacity:0.8;">${escapeHtml(person.name)}</p><p style="opacity:0.6;">No videos or bad/short URL. Use the full channel link (complete @handle or youtube.com/channel/UC…).</p>`;
      return;
    }
    devLogPush('action', 'Tracker: fetched feed for ' + person.name);
    const first = entries[0];
    const thumb = first?.videoId ? `https://img.youtube.com/vi/${first.videoId}/mqdefault.jpg` : '';
    const socialLines = [];
    const xHandle = person.twitterHandle ? String(person.twitterHandle).trim().replace(/^@/, '') : '';
    if (xHandle) {
      socialLines.push(
        `<a href="https://x.com/${escapeHtml(xHandle)}" class="tracker-feed-link" data-href="https://x.com/${escapeHtml(xHandle)}" style="color:var(--color-primary);">X / Twitter: @${escapeHtml(
          xHandle
        )}</a>`
      );
    }
    if (person.facebookUrl && String(person.facebookUrl).trim()) {
      socialLines.push(`<a href="${escapeHtml(person.facebookUrl)}" class="tracker-feed-link" data-href="${escapeHtml(person.facebookUrl)}" style="color:var(--color-primary);">Facebook</a>`);
    }
    if (!socialLines.length && person.youtubeUrl) {
      socialLines.push(`<a href="${escapeHtml(person.youtubeUrl)}" class="tracker-feed-link" data-href="${escapeHtml(person.youtubeUrl)}" style="color:var(--color-primary);">YouTube channel</a>`);
    }
    panel.innerHTML = `
      <p style="opacity:0.8;margin:0 0 8px 0;">${escapeHtml(person.name)}</p>
      ${first ? `
        <p style="font-size:11px;opacity:0.8;margin:4px 0 6px 0;">Latest video</p>
        <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
          ${thumb ? `<a href="${escapeHtml(first.link)}" class="tracker-feed-link" data-href="${escapeHtml(first.link)}" style="flex-shrink:0;"><img src="${escapeHtml(thumb)}" alt="" style="width:160px;height:90px;object-fit:cover;border:1px solid var(--hud-border);" /></a>` : ''}
          <div style="min-width:0;">
            <a href="${escapeHtml(first.link)}" class="tracker-feed-link" data-href="${escapeHtml(first.link)}" style="color:var(--color-primary);font-weight:600;">${escapeHtml(first.title)}</a>
            <p style="font-size:11px;opacity:0.7;margin:4px 0 0 0;">${escapeHtml(first.published ? new Date(first.published).toLocaleDateString() : '')}</p>
          </div>
        </div>
      ` : ''}
      <p style="font-size:11px;opacity:0.8;margin:4px 0 4px 0;">Recent uploads</p>
      <ul style="margin:0 0 12px 0;padding-left:18px;font-size:12px;">
        ${entries.map((e) => `<li><a href="${escapeHtml(e.link)}" class="tracker-feed-link" data-href="${escapeHtml(e.link)}" style="color:var(--color-primary);cursor:pointer;">${escapeHtml(e.title)}</a></li>`).join('')}
      </ul>
      ${
        socialLines.length
          ? '<p style="font-size:11px;opacity:0.8;margin:8px 0 4px 0;">Socials</p><p style="margin:0;font-size:12px;">' + socialLines.join(' &middot; ') + '</p>'
          : ''
      }
      ${xHandle ? '<div id="tracker-tweets-host" style="margin-top:10px;"><p style="margin:0;font-size:12px;opacity:0.6;">Loading tweets…</p></div>' : ''}
    `;
    panel.querySelectorAll('.tracker-feed-link').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.goonAPI.openExternal(a.getAttribute('data-href'));
      });
    });

    if (xHandle && window.goonAPI.trackerFetchXTweets) {
      window.goonAPI.trackerFetchXTweets(xHandle).then((latestTweets) => {
        const host = document.getElementById('tracker-tweets-host');
        if (!host) return;
        const list = Array.isArray(latestTweets) ? latestTweets : [];
        if (!list.length) {
          host.innerHTML = '<p style="margin:0;font-size:12px;opacity:0.6;">No tweets found (or blocked).</p>';
          return;
        }
        host.innerHTML =
          '<p style="font-size:11px;opacity:0.8;margin:0 0 4px 0;">Latest tweets</p>' +
          '<ul style="margin:0 0 6px 0;padding-left:18px;font-size:12px;">' +
          list
            .slice(0, 8)
            .map((t, i) => {
              const label = (t?.text && String(t.text).trim()) || `Tweet ${i + 1}`;
              return `<li><a href="${escapeHtml(t.link)}" class="tracker-feed-link" data-href="${escapeHtml(t.link)}" style="color:var(--color-primary);cursor:pointer;">${escapeHtml(
                label
              )}</a></li>`;
            })
            .join('') +
          '</ul>';

        host.querySelectorAll('.tracker-feed-link').forEach((a) => {
          a.addEventListener('click', (e) => {
            e.preventDefault();
            window.goonAPI.openExternal(a.getAttribute('data-href'));
          });
        });
      }).catch(() => {
        const host = document.getElementById('tracker-tweets-host');
        if (host) host.innerHTML = '<p style="margin:0;font-size:12px;opacity:0.6;">Could not load tweets.</p>';
      });
    }
  }

  function openTrackerModal(person) {
    modalEditingId = person ? person.id : null;
    modalAvatarPath = person?.avatarPath || null;
    document.getElementById('tracker-modal-name').value = person?.name || '';
    document.getElementById('tracker-modal-youtube').value = person?.youtubeUrl || '';
    document.getElementById('tracker-modal-twitter').value = person?.twitterHandle || '';
    document.getElementById('tracker-modal-akas').value = person?.akas || '';
    document.getElementById('tracker-modal-bio').value = person?.bio || '';
    const preview = document.getElementById('tracker-modal-avatar-preview');
    const pathEl = document.getElementById('tracker-modal-avatar-path');
    if (modalAvatarPath) {
      window.goonAPI.trackerGetAvatarDataUrl(modalAvatarPath).then((url) => {
        preview.src = url || '';
        preview.style.display = url ? 'block' : 'none';
      });
      pathEl.textContent = modalAvatarPath.split(/[/\\]/).pop() || modalAvatarPath;
    } else {
      preview.src = '';
      preview.style.display = 'none';
      pathEl.textContent = '';
    }
    document.getElementById('tracker-modal').style.display = 'flex';
  }

  document.getElementById('tracker-add-btn').addEventListener('click', () => openTrackerModal(null));

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  let trackerExportOutsideClose = null;
  function closeTrackerExportMenu() {
    document.getElementById('tracker-export-menu')?.classList.remove('is-open');
    document.getElementById('tracker-export-btn')?.setAttribute('aria-expanded', 'false');
    if (trackerExportOutsideClose) {
      document.removeEventListener('click', trackerExportOutsideClose);
      trackerExportOutsideClose = null;
    }
  }
  function openTrackerExportMenu() {
    document.getElementById('tracker-export-menu')?.classList.add('is-open');
    document.getElementById('tracker-export-btn')?.setAttribute('aria-expanded', 'true');
    trackerExportOutsideClose = (e) => {
      const wrap = document.getElementById('tracker-export-wrap');
      if (!wrap) {
        document.removeEventListener('click', trackerExportOutsideClose);
        trackerExportOutsideClose = null;
        return;
      }
      if (!wrap.contains(e.target)) closeTrackerExportMenu();
    };
    setTimeout(() => document.addEventListener('click', trackerExportOutsideClose), 0);
  }

  document.getElementById('tracker-export-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('tracker-export-menu');
    if (menu?.classList.contains('is-open')) closeTrackerExportMenu();
    else openTrackerExportMenu();
  });

  document.getElementById('tracker-export-menu')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const item = e.target.closest('[data-tracker-export]');
    if (!item) return;
    const kind = item.getAttribute('data-tracker-export');
    closeTrackerExportMenu();

    if (kind === 'json') {
      devLogPush('action', 'Tracker: exported JSON');
      const people = await window.goonAPI.trackerGetPeople();
      const json = JSON.stringify(people, null, 2);
      downloadBlob(new Blob([json], { type: 'application/json' }), 'goonopticon-tracker.json');
      return;
    }

    if (kind === 'csv') {
      devLogPush('action', 'Tracker: exported CSV');
      const people = await window.goonAPI.trackerGetPeople();
      const header = 'name,youtubeUrl,twitterHandle,facebookUrl,akas,bio,addedAt';
      const rows = people
        .map((p) =>
          [
            (p.name || '').replace(/"/g, '""'),
            (p.youtubeUrl || '').replace(/"/g, '""'),
            (p.twitterHandle || '').replace(/"/g, '""'),
            (p.facebookUrl || '').replace(/"/g, '""'),
            (p.akas || '').replace(/"/g, '""'),
            (p.bio || '').replace(/"/g, '""'),
            (p.addedAt || '')
          ]
            .map((c) => `"${c}"`)
            .join(',')
        )
        .join('\n');
      const csv = [header, rows].filter(Boolean).join('\n');
      downloadBlob(new Blob([csv], { type: 'text/csv' }), 'goonopticon-tracker.csv');
    }
  });

  document.getElementById('tracker-modal-avatar-btn').addEventListener('click', async () => {
    const result = await window.goonAPI.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }] });
    if (!result?.canceled && result?.filePaths?.[0]) {
      modalAvatarPath = result.filePaths[0];
      document.getElementById('tracker-modal-avatar-path').textContent = result.filePaths[0].split(/[/\\]/).pop();
      const dataUrl = await window.goonAPI.trackerGetAvatarDataUrl(modalAvatarPath);
      const preview = document.getElementById('tracker-modal-avatar-preview');
      preview.src = dataUrl || '';
      preview.style.display = 'block';
    }
  });

  document.getElementById('tracker-modal-cancel').addEventListener('click', () => {
    document.getElementById('tracker-modal').style.display = 'none';
  });

  document.getElementById('tracker-modal-save').addEventListener('click', async () => {
    const name = document.getElementById('tracker-modal-name').value?.trim() || 'Unknown';
    const youtubeUrl = document.getElementById('tracker-modal-youtube').value?.trim() || '';
    const twitterHandle = document.getElementById('tracker-modal-twitter').value?.trim() || '';
    const akas = document.getElementById('tracker-modal-akas').value?.trim() || '';
    const bio = document.getElementById('tracker-modal-bio').value || '';
    if (modalEditingId) {
      devLogPush('action', 'Tracker: updated target');
      await window.goonAPI.trackerUpdatePerson(modalEditingId, {
        name,
        youtubeUrl,
        twitterHandle,
        akas,
        bio,
        avatarPath: modalAvatarPath
      });
    } else {
      devLogPush('action', 'Tracker: added target');
      await window.goonAPI.trackerAddPerson({
        name,
        youtubeUrl,
        twitterHandle,
        akas,
        bio,
        avatarPath: modalAvatarPath
      });
    }
    document.getElementById('tracker-modal').style.display = 'none';
    renderTrackerList();
  });

  renderTrackerList();
}

function loadGoonipediaView() {
  function parseAkasToList(akas) {
    return String(akas || '')
      .split(/[,;\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  viewEl.innerHTML = `
    <style>
      .goonipedia-wrap { display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden; }
      .goonipedia-main { display:flex; flex:1; min-height:0; gap:16px; }
      .goonipedia-sidebar { width:240px; flex-shrink:0; border:1px solid var(--hud-border); border-radius:4px; background:var(--hud-surface); display:flex; flex-direction:column; min-height:0; }
      .goonipedia-search { margin:8px; padding:8px; box-sizing:border-box; width:calc(100% - 16px); background:var(--hud-bg); border:1px solid var(--hud-border); color:var(--hud-text); border-radius:var(--ui-border-radius,4px); font:inherit; }
      .goonipedia-list { overflow-y:auto; flex:1; padding:0 4px 8px; }
      .goonipedia-row { display:flex; align-items:center; gap:8px; padding:8px; border-radius:4px; cursor:pointer; border:1px solid transparent; margin-bottom:2px; }
      .goonipedia-row:hover { background:var(--hud-surface-hover); }
      .goonipedia-row.active { border-color:var(--hud-accent); background:var(--hud-surface-hover); }
      .goonipedia-row .goonipedia-thumb { width:32px; height:32px; border-radius:4px; object-fit:cover; background:var(--hud-bg); flex-shrink:0; }
      .goonipedia-article { flex:1; min-width:0; overflow-y:auto; padding:12px 16px 28px; border:1px solid var(--hud-border); border-radius:4px; background:var(--hud-bg-elevated,var(--hud-surface)); }
      .goonipedia-infobox { float:right; width:min(280px,100%); margin:0 0 16px 16px; border:1px solid var(--hud-border); border-collapse:collapse; font-size:12px; background:var(--hud-surface); }
      .goonipedia-infobox th, .goonipedia-infobox td { border:1px solid var(--hud-border); padding:8px 10px; vertical-align:top; }
      .goonipedia-infobox th { text-align:center; font-family:var(--hud-font-mono); letter-spacing:0.08em; font-size:11px; color:var(--hud-accent); }
      .goonipedia-infobox .goonipedia-portrait { display:block; width:100%; max-height:240px; object-fit:contain; background:var(--hud-bg); }
      .goonipedia-h1 { font-size:clamp(1.35rem,2.8vw,1.85rem); font-weight:400; border-bottom:1px solid var(--hud-border); padding-bottom:10px; margin:0 0 14px 0; font-family:Georgia,'Times New Roman',serif; line-height:1.2; }
      .goonipedia-lead { font-size:14px; line-height:1.55; margin:0 0 16px 0; overflow:hidden; }
      .goonipedia-body { font-size:14px; line-height:1.65; white-space:pre-wrap; overflow-wrap:break-word; clear:both; margin-top:8px; }
      .goonipedia-refs { clear:both; margin-top:28px; padding-top:16px; border-top:1px solid var(--hud-border); font-size:13px; }
      .goonipedia-refs h2 { font-family:var(--hud-font-mono); font-size:11px; letter-spacing:0.1em; margin:0 0 10px 0; color:var(--hud-accent); font-weight:600; }
      .goonipedia-refs ol { margin:0; padding-left:1.25em; line-height:1.55; }
      .goonipedia-aka-tag { display:inline-block; margin:2px 4px 2px 0; padding:2px 8px; border-radius:3px; background:var(--hud-bg); border:1px solid var(--hud-border); font-size:11px; }
      .goonipedia-export-wrap { position:relative; }
      .goonipedia-export-menu {
        display:none; flex-direction:column; gap:2px; position:absolute; top:100%; right:0; margin-top:4px;
        min-width:260px; padding:4px; background:var(--hud-surface); border:1px solid var(--hud-border);
        border-radius:var(--ui-border-radius,4px); box-shadow:0 8px 24px rgba(0,0,0,0.4); z-index:60;
      }
      .goonipedia-export-menu.is-open { display:flex; }
      .goonipedia-export-menu .hud-btn { width:100%; justify-content:flex-start; text-align:left; font-size:12px; border-radius:4px; }
      .goonipedia-mod-lbl { display:block;font-size:11px;opacity:0.85;margin-bottom:3px; }
      .goonipedia-modal-fieldset { border:1px solid var(--hud-border); border-radius:8px; padding:10px 12px; margin:0; }
      .goonipedia-modal-fieldset legend { font-size:11px; padding:0 6px; color:var(--hud-text-dim, #9aa); }
      .goonipedia-tabstrip { display:flex; flex-wrap:wrap; gap:6px; margin:22px 0 0 0; clear:both; border-bottom:1px solid var(--hud-border); padding-bottom:8px; }
      .goonipedia-tab-btn { padding:6px 12px; font-size:12px; border:1px solid var(--hud-border); background:var(--hud-bg); color:var(--hud-text); border-radius:4px 4px 0 0; cursor:pointer; font-family:inherit; }
      .goonipedia-tab-btn:hover { background:var(--hud-surface-hover); }
      .goonipedia-tab-btn.active { border-color:var(--hud-accent); color:var(--hud-accent); border-bottom-color:transparent; margin-bottom:-1px; padding-bottom:7px; }
      .goonipedia-tab-panel { display:none; padding:14px 0 8px 0; font-size:14px; line-height:1.65; white-space:pre-wrap; }
      .goonipedia-tab-panel.active { display:block; }
      .goonipedia-wiki-section { clear:both; margin-top:22px; padding-top:12px; border-top:1px solid var(--hud-border); }
      .goonipedia-wiki-section h2 { font-family:Georgia,'Times New Roman',serif; font-size:1.15rem; font-weight:400; margin:0 0 10px 0; }
      .goonipedia-callout { margin:14px 0; padding:12px 14px; border-radius:4px; font-size:13px; line-height:1.5; border-left:4px solid; }
      .goonipedia-callout-note { border-left-color:var(--hud-accent); background:rgba(127,255,127,0.06); }
      .goonipedia-callout-quote { border-left-color:#889; background:var(--hud-bg); font-style:italic; }
      .goonipedia-callout-alert { border-left-color:#e6a017; background:rgba(230,160,23,0.08); }
    </style>
    <div class="goonipedia-wrap">
      <div class="view-title-bar">
        <span>[ GOONIPEDIA ]</span>
        <div class="title-bar-actions" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
          <button type="button" class="hud-btn" id="goonipedia-add-btn" title="New encyclopedia entry">+ Add entry</button>
          <button type="button" class="hud-btn" id="goonipedia-edit-btn" title="Edit selected entry">Edit entry</button>
          <button type="button" class="hud-btn" id="goonipedia-delete-btn" title="Remove selected entry">Delete</button>
          <div class="goonipedia-export-wrap" id="goonipedia-export-wrap">
            <button type="button" class="hud-btn" id="goonipedia-export-btn" aria-expanded="false" aria-haspopup="true" title="Export options">Export ▾</button>
            <div class="goonipedia-export-menu" id="goonipedia-export-menu" role="menu">
              <button type="button" class="hud-btn" role="menuitem" data-goonipedia-export="entry-json" title="Selected entry; includes portrait as base64 when available">Selected entry as JSON…</button>
              <button type="button" class="hud-btn" role="menuitem" data-goonipedia-export="entry-md" title="Download Markdown file">Selected entry as Markdown…</button>
              <button type="button" class="hud-btn" role="menuitem" data-goonipedia-export="copy-md" title="Copy Markdown to clipboard">Copy article to clipboard</button>
              <button type="button" class="hud-btn" role="menuitem" data-goonipedia-export="all-json" title="All entries in one file (no embedded images)">All entries as JSON…</button>
            </div>
          </div>
        </div>
      </div>
      <p style="opacity:0.85;margin:0 0 12px 0;font-size:13px;line-height:1.45;"><strong>Goonipedia</strong> = full profile. <strong>Gangstalking</strong> = feed tracking. Same people both places.</p>
      <div class="goonipedia-main">
        <aside class="goonipedia-sidebar">
          <input type="search" class="goonipedia-search" id="goonipedia-search" placeholder="Search…" autocomplete="off"/>
          <div class="goonipedia-list" id="goonipedia-list"></div>
        </aside>
        <article class="goonipedia-article" id="goonipedia-article"></article>
      </div>
    </div>
    <div id="goonipedia-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:110;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;">
      <div style="background:var(--hud-surface);border:1px solid var(--color-border);border-radius:10px;padding:16px 18px;width:100%;max-width:760px;max-height:94vh;display:flex;flex-direction:column;box-sizing:border-box;">
        <h3 style="margin:0 0 10px 0;font-family:var(--hud-font-mono);font-size:12px;letter-spacing:0.1em;color:var(--hud-accent);" id="goonipedia-modal-title">GOONIPEDIA — NEW ENTRY</h3>
        <div id="goonipedia-modal-scroll" style="flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding-right:4px;">
          <fieldset class="goonipedia-modal-fieldset">
            <legend>Identity</legend>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div><label class="goonipedia-mod-lbl" for="goonipedia-modal-name">Name</label>
                <input type="text" id="goonipedia-modal-name" placeholder="e.g. Santa Cruz Joker" style="width:100%;padding:8px;box-sizing:border-box;" /></div>
              <div><label class="goonipedia-mod-lbl" for="goonipedia-modal-akas">Also known as</label>
                <textarea id="goonipedia-modal-akas" rows="2" placeholder="Aliases — comma or new line" style="width:100%;padding:8px;box-sizing:border-box;resize:vertical;font:inherit;"></textarea></div>
              <div><label class="goonipedia-mod-lbl">Photo</label>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <img id="goonipedia-modal-avatar-preview" src="" alt="" style="width:52px;height:52px;border-radius:8px;object-fit:cover;background:var(--hud-bg);display:none;" />
                  <button type="button" class="hud-btn" id="goonipedia-modal-avatar-btn">Pick image</button>
                  <span id="goonipedia-modal-avatar-path" style="font-size:11px;opacity:0.6;max-width:160px;overflow:hidden;text-overflow:ellipsis;"></span>
                </div></div>
            </div>
          </fieldset>
          <fieldset class="goonipedia-modal-fieldset">
            <legend>Timeline</legend>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <div style="flex:1;min-width:160px;"><label class="goonipedia-mod-lbl" for="goonipedia-modal-dob">Born</label>
                <input type="text" id="goonipedia-modal-dob" placeholder="yyyy-mm-dd or dd-mm-yyyy" style="width:100%;padding:8px;box-sizing:border-box;" /></div>
              <div style="flex:1;min-width:160px;"><label class="goonipedia-mod-lbl" for="goonipedia-modal-disc">Discovered</label>
                <input type="text" id="goonipedia-modal-disc" placeholder="yyyy-mm-dd or dd-mm-yyyy" style="width:100%;padding:8px;box-sizing:border-box;" /></div>
              <div style="flex:1;min-width:160px;"><label class="goonipedia-mod-lbl" for="goonipedia-modal-dod">Died</label>
                <input type="text" id="goonipedia-modal-dod" placeholder="yyyy-mm-dd or blank" style="width:100%;padding:8px;box-sizing:border-box;" /></div>
            </div>
          </fieldset>
          <fieldset class="goonipedia-modal-fieldset">
            <legend>Social</legend>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div><label class="goonipedia-mod-lbl" for="goonipedia-modal-youtube">YouTube</label>
                <input type="text" id="goonipedia-modal-youtube" placeholder="https://…" style="width:100%;padding:8px;box-sizing:border-box;" /></div>
              <div><label class="goonipedia-mod-lbl" for="goonipedia-modal-twitter">X</label>
                <input type="text" id="goonipedia-modal-twitter" placeholder="@handle" style="width:100%;padding:8px;box-sizing:border-box;" /></div>
              <div><label class="goonipedia-mod-lbl" for="goonipedia-modal-facebook">Facebook</label>
                <input type="text" id="goonipedia-modal-facebook" placeholder="https://…" style="width:100%;padding:8px;box-sizing:border-box;" /></div>
            </div>
          </fieldset>
          <fieldset class="goonipedia-modal-fieldset">
            <legend>Extra links</legend>
            <p style="margin:0 0 8px 0;font-size:11px;opacity:0.75;">Named links in the sidebar box (like YouTube).</p>
            <div id="goonipedia-modal-links-host"></div>
            <button type="button" class="hud-btn" id="goonipedia-modal-add-link" style="margin-top:6px;">+ Add link</button>
          </fieldset>
          <fieldset class="goonipedia-modal-fieldset">
            <legend>Article</legend>
            <div><label class="goonipedia-mod-lbl" for="goonipedia-modal-bio">Main text</label>
              <textarea id="goonipedia-modal-bio" rows="7" placeholder="Opening bit, then blank line, then rest" style="width:100%;padding:8px;box-sizing:border-box;resize:vertical;font:inherit;"></textarea></div>
            <div style="margin-top:8px;"><label class="goonipedia-mod-lbl" for="goonipedia-modal-refs">References</label>
              <textarea id="goonipedia-modal-refs" rows="4" placeholder="One line each" style="width:100%;padding:8px;box-sizing:border-box;resize:vertical;font:inherit;"></textarea></div>
          </fieldset>
          <fieldset class="goonipedia-modal-fieldset">
            <legend>Sections</legend>
            <p style="margin:0 0 8px 0;font-size:11px;opacity:0.75;">Extra blocks with titles.</p>
            <div id="goonipedia-modal-sections-host"></div>
            <button type="button" class="hud-btn" id="goonipedia-modal-add-section" style="margin-top:6px;">+ Add section</button>
          </fieldset>
          <fieldset class="goonipedia-modal-fieldset">
            <legend>Tabs</legend>
            <p style="margin:0 0 8px 0;font-size:11px;opacity:0.75;">Click-to-switch panels on the page.</p>
            <div id="goonipedia-modal-tabs-host"></div>
            <button type="button" class="hud-btn" id="goonipedia-modal-add-tab" style="margin-top:6px;">+ Add tab</button>
          </fieldset>
          <fieldset class="goonipedia-modal-fieldset">
            <legend>Callouts</legend>
            <p style="margin:0 0 8px 0;font-size:11px;opacity:0.75;">Side notes, quotes, warnings.</p>
            <div id="goonipedia-modal-callouts-host"></div>
            <button type="button" class="hud-btn" id="goonipedia-modal-add-callout" style="margin-top:6px;">+ Add callout</button>
          </fieldset>
        </div>
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;flex-wrap:wrap;border-top:1px solid var(--hud-border);padding-top:12px;">
          <button type="button" class="hud-btn" id="goonipedia-modal-cancel">Cancel</button>
          <button type="button" class="hud-btn" id="goonipedia-modal-save">Save entry</button>
        </div>
      </div>
    </div>
  `;

  let peopleCache = [];
  let selectedId = null;
  let goonipediaModalEditingId = null;
  let goonipediaModalAvatarPath = null;

  function goonipediaArr(p, key) {
    if (!p || !Array.isArray(p[key])) return [];
    return p[key];
  }

  function appendGoonipediaLinkRow(host, link = {}) {
    const row = document.createElement('div');
    row.className = 'goonipedia-dyn-link-row';
    row.style.cssText = 'display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap;';
    const lab = document.createElement('input');
    lab.type = 'text';
    lab.className = 'goonipedia-inp-link-label';
    lab.placeholder = 'Link name';
    lab.value = link.label || '';
    lab.style.cssText = 'flex:1;min-width:120px;padding:8px;box-sizing:border-box;';
    const url = document.createElement('input');
    url.type = 'text';
    url.className = 'goonipedia-inp-link-url';
    url.placeholder = 'https://…';
    url.value = link.url || '';
    url.style.cssText = 'flex:2;min-width:200px;padding:8px;box-sizing:border-box;';
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'hud-btn';
    rm.textContent = '×';
    rm.title = 'Remove';
    rm.addEventListener('click', () => row.remove());
    row.appendChild(lab);
    row.appendChild(url);
    row.appendChild(rm);
    host.appendChild(row);
  }

  function appendGoonipediaSectionRow(host, sec = {}) {
    const row = document.createElement('div');
    row.className = 'goonipedia-dyn-sec-row';
    row.style.cssText =
      'display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding:10px;border:1px dashed var(--hud-border);border-radius:6px;';
    const title = document.createElement('input');
    title.type = 'text';
    title.className = 'goonipedia-inp-sec-title';
    title.placeholder = 'Section title';
    title.value = sec.title || '';
    title.style.cssText = 'width:100%;padding:8px;box-sizing:border-box;';
    const body = document.createElement('textarea');
    body.className = 'goonipedia-ta-sec-body';
    body.rows = 4;
    body.placeholder = 'Text';
    body.value = sec.body || '';
    body.style.cssText = 'width:100%;padding:8px;box-sizing:border-box;resize:vertical;font:inherit;';
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'hud-btn';
    rm.textContent = 'Remove';
    rm.addEventListener('click', () => row.remove());
    row.appendChild(title);
    row.appendChild(body);
    row.appendChild(rm);
    host.appendChild(row);
  }

  function appendGoonipediaTabRow(host, tab = {}) {
    const row = document.createElement('div');
    row.className = 'goonipedia-dyn-tab-row';
    row.style.cssText =
      'display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding:10px;border:1px dashed var(--hud-border);border-radius:6px;';
    const label = document.createElement('input');
    label.type = 'text';
    label.className = 'goonipedia-inp-tab-label';
    label.placeholder = 'Tab name';
    label.value = tab.label || '';
    label.style.cssText = 'width:100%;padding:8px;box-sizing:border-box;';
    const content = document.createElement('textarea');
    content.className = 'goonipedia-ta-tab-content';
    content.rows = 4;
    content.placeholder = 'What shows in this tab';
    content.value = tab.content || '';
    content.style.cssText = 'width:100%;padding:8px;box-sizing:border-box;resize:vertical;font:inherit;';
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'hud-btn';
    rm.textContent = 'Remove';
    rm.addEventListener('click', () => row.remove());
    row.appendChild(label);
    row.appendChild(content);
    row.appendChild(rm);
    host.appendChild(row);
  }

  function appendGoonipediaCalloutRow(host, c = {}) {
    const row = document.createElement('div');
    row.className = 'goonipedia-dyn-call-row';
    row.style.cssText =
      'display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding:10px;border:1px dashed var(--hud-border);border-radius:6px;';
    const sel = document.createElement('select');
    sel.className = 'goonipedia-sel-call-variant';
    sel.style.cssText = 'padding:8px;max-width:200px;font:inherit;';
    ['note', 'quote', 'alert'].forEach((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v === 'note' ? 'Note' : v === 'quote' ? 'Quote' : 'Alert';
      sel.appendChild(o);
    });
    const variant = String(c.variant || 'note').toLowerCase();
    if (['note', 'quote', 'alert'].includes(variant)) sel.value = variant;
    const body = document.createElement('textarea');
    body.className = 'goonipedia-ta-call-body';
    body.rows = 3;
    body.placeholder = 'Short text';
    body.value = c.body || '';
    body.style.cssText = 'width:100%;padding:8px;box-sizing:border-box;resize:vertical;font:inherit;';
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'hud-btn';
    rm.textContent = 'Remove';
    rm.addEventListener('click', () => row.remove());
    row.appendChild(sel);
    row.appendChild(body);
    row.appendChild(rm);
    host.appendChild(row);
  }

  function collectGoonipediaLinks() {
    const host = document.getElementById('goonipedia-modal-links-host');
    if (!host) return [];
    const out = [];
    host.querySelectorAll('.goonipedia-dyn-link-row').forEach((row) => {
      const label = row.querySelector('.goonipedia-inp-link-label')?.value?.trim() || '';
      const url = row.querySelector('.goonipedia-inp-link-url')?.value?.trim() || '';
      if (url) out.push({ label: label || 'Link', url });
    });
    return out;
  }

  function collectGoonipediaSections() {
    const host = document.getElementById('goonipedia-modal-sections-host');
    if (!host) return [];
    const out = [];
    host.querySelectorAll('.goonipedia-dyn-sec-row').forEach((row) => {
      const title = row.querySelector('.goonipedia-inp-sec-title')?.value?.trim() || '';
      const body = row.querySelector('.goonipedia-ta-sec-body')?.value || '';
      if (title || body.trim()) out.push({ title, body });
    });
    return out;
  }

  function collectGoonipediaTabs() {
    const host = document.getElementById('goonipedia-modal-tabs-host');
    if (!host) return [];
    const out = [];
    host.querySelectorAll('.goonipedia-dyn-tab-row').forEach((row) => {
      const label = row.querySelector('.goonipedia-inp-tab-label')?.value?.trim() || '';
      const content = row.querySelector('.goonipedia-ta-tab-content')?.value || '';
      if (label || content.trim()) out.push({ label, content });
    });
    return out;
  }

  function collectGoonipediaCallouts() {
    const host = document.getElementById('goonipedia-modal-callouts-host');
    if (!host) return [];
    const allowed = new Set(['note', 'quote', 'alert']);
    const out = [];
    host.querySelectorAll('.goonipedia-dyn-call-row').forEach((row) => {
      let variant = row.querySelector('.goonipedia-sel-call-variant')?.value || 'note';
      if (!allowed.has(variant)) variant = 'note';
      const body = row.querySelector('.goonipedia-ta-call-body')?.value || '';
      if (body.trim()) out.push({ variant, body });
    });
    return out;
  }

  function goonipediaSearchHay(p) {
    const parts = [
      p.name,
      p.akas,
      p.bio,
      p.references,
      p.twitterHandle,
      p.youtubeUrl,
      p.facebookUrl,
      p.dateOfBirth,
      p.dateDiscovered,
      p.dateOfDeath
    ];
    goonipediaArr(p, 'customLinks').forEach((l) => {
      parts.push(l.label, l.url);
    });
    goonipediaArr(p, 'wikiSections').forEach((s) => {
      parts.push(s.title, s.body);
    });
    goonipediaArr(p, 'wikiTabs').forEach((t) => {
      parts.push(t.label, t.content);
    });
    goonipediaArr(p, 'wikiCallouts').forEach((c) => {
      parts.push(c.body);
    });
    return parts.map((x) => String(x || '').toLowerCase()).join('\n');
  }

  function goonipediaSafeFilename(name) {
    const s = String(name || 'goon')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return (s || 'goon').slice(0, 72);
  }

  function goonipediaEntryCore(p) {
    return {
      name: p.name || '',
      akas: p.akas || '',
      bio: p.bio || '',
      references: p.references || '',
      youtubeUrl: p.youtubeUrl || '',
      twitterHandle: p.twitterHandle || '',
      facebookUrl: p.facebookUrl || '',
      dateOfBirth: p.dateOfBirth || '',
      dateDiscovered: p.dateDiscovered || '',
      dateOfDeath: p.dateOfDeath || '',
      customLinks: goonipediaArr(p, 'customLinks').map((l) => ({ ...l })),
      wikiSections: goonipediaArr(p, 'wikiSections').map((s) => ({ ...s })),
      wikiTabs: goonipediaArr(p, 'wikiTabs').map((t) => ({ ...t })),
      wikiCallouts: goonipediaArr(p, 'wikiCallouts').map((c) => ({ ...c })),
      addedAt: p.addedAt || ''
    };
  }

  function splitBioLeadAndBody(rawBio) {
    const t = String(rawBio || '').trim();
    if (!t) return { lead: '', body: '' };
    const sep = t.indexOf('\n\n');
    if (sep === -1) return { lead: t, body: '' };
    return { lead: t.slice(0, sep).trim(), body: t.slice(sep + 2).trim() };
  }

  function parseReferenceLines(s) {
    return String(s || '')
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function goonipediaReferenceLineHtml(line) {
    const m = line.match(/^(https?:\/\/\S+)(\s.*)?$/i);
    if (m) {
      const url = m[1];
      const label = (m[2] && m[2].trim()) || url;
      return `<a href="#" class="goonipedia-ext" data-href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
    }
    return escapeHtml(line);
  }

  function personToMarkdown(p) {
    const akas = parseAkasToList(p.akas);
    const lines = [`# ${p.name || 'Unknown'}`, ''];
    if (akas.length) {
      lines.push('**Also known as:** ' + akas.map((a) => `*${a}*`).join(', '));
      lines.push('');
    }
    if (p.youtubeUrl && String(p.youtubeUrl).trim()) {
      lines.push(`- **YouTube:** ${String(p.youtubeUrl).trim()}`);
    }
    if (p.twitterHandle && String(p.twitterHandle).trim()) {
      const h = String(p.twitterHandle).trim().replace(/^@/, '');
      lines.push(`- **X / Twitter:** [@${h}](https://x.com/${encodeURIComponent(h)})`);
    }
    if (p.facebookUrl && String(p.facebookUrl).trim()) {
      lines.push(`- **Facebook:** ${String(p.facebookUrl).trim()}`);
    }
    if (p.addedAt) {
      lines.push(`- **On file since:** ${new Date(p.addedAt).toLocaleDateString()}`);
    }
    if (p.dateOfBirth && String(p.dateOfBirth).trim()) lines.push(`- **Born:** ${String(p.dateOfBirth).trim()}`);
    if (p.dateDiscovered && String(p.dateDiscovered).trim()) {
      lines.push(`- **Discovered:** ${String(p.dateDiscovered).trim()}`);
    }
    if (p.dateOfDeath && String(p.dateOfDeath).trim()) lines.push(`- **Died:** ${String(p.dateOfDeath).trim()}`);
    goonipediaArr(p, 'customLinks').forEach((l) => {
      if (l.url) lines.push(`- **${l.label || 'Link'}:** ${l.url}`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');
    const bio = (p.bio && String(p.bio).trim()) ? String(p.bio) : '_(No dossier text.)_';
    lines.push(bio);
    lines.push('');
    const refs = parseReferenceLines(p.references);
    if (refs.length) {
      lines.push('## References');
      refs.forEach((r) => lines.push(`- ${r}`));
      lines.push('');
    }
    goonipediaArr(p, 'wikiSections').forEach((s) => {
      if (s.title || s.body) {
        lines.push(`## ${s.title || 'Section'}`);
        lines.push('');
        lines.push(s.body || '');
        lines.push('');
      }
    });
    const tabs = goonipediaArr(p, 'wikiTabs').filter((t) => t.label || (t.content && t.content.trim()));
    if (tabs.length) {
      lines.push('## Tabs');
      tabs.forEach((t) => {
        lines.push(`### ${t.label || 'Tab'}`);
        lines.push(t.content || '');
        lines.push('');
      });
    }
    lines.push(`*Exported from Goonopticon Goonipedia*`);
    return lines.join('\n');
  }

  function downloadGoonipediaBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function openGoonipediaModal(person) {
    goonipediaModalEditingId = person ? person.id : null;
    goonipediaModalAvatarPath = person?.avatarPath || null;
    const titleEl = document.getElementById('goonipedia-modal-title');
    if (titleEl) titleEl.textContent = person ? 'GOONIPEDIA — EDIT ENTRY' : 'GOONIPEDIA — NEW ENTRY';
    document.getElementById('goonipedia-modal-name').value = person?.name || '';
    document.getElementById('goonipedia-modal-youtube').value = person?.youtubeUrl || '';
    document.getElementById('goonipedia-modal-twitter').value = person?.twitterHandle || '';
    document.getElementById('goonipedia-modal-facebook').value = person?.facebookUrl || '';
    document.getElementById('goonipedia-modal-akas').value = person?.akas || '';
    document.getElementById('goonipedia-modal-bio').value = person?.bio || '';
    document.getElementById('goonipedia-modal-refs').value = person?.references || '';
    document.getElementById('goonipedia-modal-dob').value = person?.dateOfBirth || '';
    document.getElementById('goonipedia-modal-disc').value = person?.dateDiscovered || '';
    document.getElementById('goonipedia-modal-dod').value = person?.dateOfDeath || '';

    const lh = document.getElementById('goonipedia-modal-links-host');
    lh.innerHTML = '';
    goonipediaArr(person, 'customLinks').forEach((l) => appendGoonipediaLinkRow(lh, l));
    appendGoonipediaLinkRow(lh, {});

    const sh = document.getElementById('goonipedia-modal-sections-host');
    sh.innerHTML = '';
    goonipediaArr(person, 'wikiSections').forEach((s) => appendGoonipediaSectionRow(sh, s));
    appendGoonipediaSectionRow(sh, {});

    const th = document.getElementById('goonipedia-modal-tabs-host');
    th.innerHTML = '';
    goonipediaArr(person, 'wikiTabs').forEach((t) => appendGoonipediaTabRow(th, t));
    appendGoonipediaTabRow(th, {});

    const ch = document.getElementById('goonipedia-modal-callouts-host');
    ch.innerHTML = '';
    goonipediaArr(person, 'wikiCallouts').forEach((c) => appendGoonipediaCalloutRow(ch, c));
    appendGoonipediaCalloutRow(ch, {});

    const preview = document.getElementById('goonipedia-modal-avatar-preview');
    const pathEl = document.getElementById('goonipedia-modal-avatar-path');
    if (goonipediaModalAvatarPath) {
      window.goonAPI.trackerGetAvatarDataUrl(goonipediaModalAvatarPath).then((url) => {
        preview.src = url || '';
        preview.style.display = url ? 'block' : 'none';
      });
      pathEl.textContent = goonipediaModalAvatarPath.split(/[/\\]/).pop() || goonipediaModalAvatarPath;
    } else {
      preview.src = '';
      preview.style.display = 'none';
      pathEl.textContent = '';
    }
    document.getElementById('goonipedia-modal-scroll')?.scrollTo?.(0, 0);
    document.getElementById('goonipedia-modal').style.display = 'flex';
  }

  function renderArticle(person) {
    const art = document.getElementById('goonipedia-article');
    if (!art) return;
    if (!person) {
      art.innerHTML =
        '<p style="opacity:0.65;margin:20px 0;">Pick someone from the index, or click <strong>+ Add entry</strong>.</p>';
      return;
    }
    const akas = parseAkasToList(person.akas);
    const akaHtml = akas.length
      ? akas.map((a) => `<span class="goonipedia-aka-tag">${escapeHtml(a)}</span>`).join('')
      : '<span style="opacity:0.5;">—</span>';
    const socialRows = [];
    if (person.youtubeUrl && String(person.youtubeUrl).trim()) {
      const u = person.youtubeUrl.trim();
      socialRows.push([
        'YouTube',
        `<a href="#" class="goonipedia-ext" data-href="${escapeHtml(u)}">Open channel</a>`
      ]);
    }
    if (person.twitterHandle && String(person.twitterHandle).trim()) {
      const h = String(person.twitterHandle).trim().replace(/^@/, '');
      const u = `https://x.com/${encodeURIComponent(h)}`;
      socialRows.push([
        'X / Twitter',
        `<a href="#" class="goonipedia-ext" data-href="${escapeHtml(u)}">@${escapeHtml(h)}</a>`
      ]);
    }
    if (person.facebookUrl && String(person.facebookUrl).trim()) {
      const u = person.facebookUrl.trim();
      socialRows.push([
        'Facebook',
        `<a href="#" class="goonipedia-ext" data-href="${escapeHtml(u)}">Open profile</a>`
      ]);
    }
    goonipediaArr(person, 'customLinks').forEach((l) => {
      const u = String(l.url || '').trim();
      if (!u) return;
      const lab = String(l.label || 'Link').trim() || 'Link';
      socialRows.push([lab, `<a href="#" class="goonipedia-ext" data-href="${escapeHtml(u)}">Open</a>`]);
    });
    const timelineRows = [];
    if (person.dateOfBirth && String(person.dateOfBirth).trim()) {
      timelineRows.push(['Born', escapeHtml(String(person.dateOfBirth).trim())]);
    }
    if (person.dateDiscovered && String(person.dateDiscovered).trim()) {
      timelineRows.push(['Discovered', escapeHtml(String(person.dateDiscovered).trim())]);
    }
    if (person.dateOfDeath && String(person.dateOfDeath).trim()) {
      timelineRows.push(['Died', escapeHtml(String(person.dateOfDeath).trim())]);
    }
    const added = person.addedAt ? new Date(person.addedAt).toLocaleDateString() : '—';
    const rawBio = person.bio && String(person.bio).trim() ? String(person.bio) : '';
    const { lead: leadText, body: bodyText } = splitBioLeadAndBody(rawBio);
    const lead = leadText
      ? escapeHtml(leadText.length > 1200 ? `${leadText.slice(0, 1200)}…` : leadText)
      : `${escapeHtml(person.name)} — no dossier text yet. Use <strong>Edit entry</strong> and fill the dossier field.`;
    const portraitRow =
      person.avatarPath &&
      `<tr><td colspan="2" style="padding:0;border:none;"><img class="goonipedia-portrait" id="goonipedia-portrait" alt="" /></td></tr>`;
    const bodyBlock = bodyText
      ? `<div class="goonipedia-body">${escapeHtml(bodyText)}</div>`
      : '';
    const refLines = parseReferenceLines(person.references);
    const refsBlock = refLines.length
      ? `<div class="goonipedia-refs"><h2>References</h2><ol>${refLines
          .map((l) => `<li>${goonipediaReferenceLineHtml(l)}</li>`)
          .join('')}</ol></div>`
      : '';

    const callouts = goonipediaArr(person, 'wikiCallouts');
    const calloutBlock = callouts.length
      ? `<div style="clear:both;margin:10px 0 0 0;">${callouts
          .map((c) => {
            const v = ['note', 'quote', 'alert'].includes(c.variant) ? c.variant : 'note';
            return `<div class="goonipedia-callout goonipedia-callout-${v}">${escapeHtml(c.body)}</div>`;
          })
          .join('')}</div>`
      : '';

    const wikiSecs = goonipediaArr(person, 'wikiSections').filter((s) => s.title || (s.body && s.body.trim()));
    const secBlock = wikiSecs.length
      ? wikiSecs
          .map(
            (s) =>
              `<section class="goonipedia-wiki-section"><h2>${escapeHtml(s.title || 'Section')}</h2><div class="goonipedia-body">${escapeHtml(s.body)}</div></section>`
          )
          .join('')
      : '';

    const wikiTabsList = goonipediaArr(person, 'wikiTabs').filter((t) => t.label || (t.content && t.content.trim()));
    const tabsBlock =
      wikiTabsList.length > 0
        ? `<div class="goonipedia-tabwrap"><div class="goonipedia-tabstrip" role="tablist">${wikiTabsList
            .map(
              (t, i) =>
                `<button type="button" class="goonipedia-tab-btn${i === 0 ? ' active' : ''}" data-gtab-i="${i}" role="tab">${escapeHtml(t.label || `Tab ${i + 1}`)}</button>`
            )
            .join('')}</div>${wikiTabsList
            .map(
              (t, i) =>
                `<div class="goonipedia-tab-panel${i === 0 ? ' active' : ''}" data-gtab-panel="${i}" role="tabpanel">${escapeHtml(t.content)}</div>`
            )
            .join('')}</div>`
        : '';

    art.innerHTML = `
      <h1 class="goonipedia-h1">${escapeHtml(person.name)}</h1>
      <table class="goonipedia-infobox">
        <tr><th colspan="2">${escapeHtml(person.name)}</th></tr>
        ${portraitRow || ''}
        <tr><td style="font-weight:600;width:36%;">Also known as</td><td>${akaHtml}</td></tr>
        ${timelineRows.map(([k, v]) => `<tr><td style="font-weight:600;">${k}</td><td>${v}</td></tr>`).join('')}
        ${socialRows.map(([k, v]) => `<tr><td style="font-weight:600;">${k}</td><td>${v}</td></tr>`).join('')}
        <tr><td style="font-weight:600;">On file since</td><td>${escapeHtml(added)}</td></tr>
      </table>
      ${calloutBlock}
      <p class="goonipedia-lead">${lead}</p>
      ${bodyBlock}
      ${secBlock}
      ${tabsBlock}
      ${refsBlock}
      <p style="margin:20px 0 0 0;font-size:11px;opacity:0.65;"><button type="button" class="hud-btn goonipedia-inline-edit" data-id="${escapeHtml(person.id)}" style="font-size:11px;padding:4px 10px;">Edit this entry</button></p>
    `;

    if (person.avatarPath) {
      const img = document.getElementById('goonipedia-portrait');
      if (img) {
        window.goonAPI.trackerGetAvatarDataUrl(person.avatarPath).then((url) => {
          if (url) img.src = url;
        });
      }
    }

    art.querySelectorAll('.goonipedia-ext').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.goonAPI.openExternal(a.getAttribute('data-href'));
      });
    });
    art.querySelector('.goonipedia-inline-edit')?.addEventListener('click', () => {
      openGoonipediaModal(person);
    });
    art.querySelectorAll('.goonipedia-tabwrap').forEach((wrap) => {
      const btns = wrap.querySelectorAll('.goonipedia-tab-btn[data-gtab-i]');
      const panels = wrap.querySelectorAll('.goonipedia-tab-panel[data-gtab-panel]');
      btns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = btn.getAttribute('data-gtab-i');
          btns.forEach((b) => b.classList.toggle('active', b.getAttribute('data-gtab-i') === i));
          panels.forEach((p) => p.classList.toggle('active', p.getAttribute('data-gtab-panel') === i));
        });
      });
    });
  }

  async function refreshList() {
    const list = document.getElementById('goonipedia-list');
    if (!list) return;
    peopleCache = await window.goonAPI.trackerGetPeople();
    const q = (document.getElementById('goonipedia-search')?.value || '').trim().toLowerCase();
    const filtered = peopleCache.filter((p) => {
      if (!q) return true;
      const hay = goonipediaSearchHay(p);
      return hay.includes(q);
    });
    filtered.sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
    );
    if (!filtered.length) {
      const emptyDb = !peopleCache.length && !q;
      list.innerHTML = emptyDb
        ? '<p style="opacity:0.6;padding:8px;font-size:12px;margin:0;">No entries yet. Click <strong>+ Add entry</strong>.</p>'
        : '<p style="opacity:0.6;padding:8px;font-size:12px;margin:0;">No entries match.</p>';
      renderArticle(null);
      return;
    }
    if (!selectedId || !filtered.some((p) => p.id === selectedId)) selectedId = filtered[0].id;
    list.innerHTML = filtered
      .map(
        (p) => `
        <div class="goonipedia-row ${p.id === selectedId ? 'active' : ''}" data-id="${escapeHtml(p.id)}">
          <img class="goonipedia-thumb" data-path="${escapeHtml(p.avatarPath || '')}" alt="" />
          <span style="font-size:13px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.name)}</span>
        </div>
      `
      )
      .join('');

    list.querySelectorAll('.goonipedia-row').forEach((row) => {
      row.addEventListener('click', () => {
        selectedId = row.getAttribute('data-id');
        list.querySelectorAll('.goonipedia-row').forEach((r) =>
          r.classList.toggle('active', r.getAttribute('data-id') === selectedId)
        );
        renderArticle(peopleCache.find((p) => p.id === selectedId));
      });
    });

    for (const img of list.querySelectorAll('.goonipedia-thumb')) {
      const path = img.getAttribute('data-path');
      if (path) {
        const dataUrl = await window.goonAPI.trackerGetAvatarDataUrl(path);
        if (dataUrl) img.src = dataUrl;
      }
    }

    renderArticle(peopleCache.find((p) => p.id === selectedId) || null);
  }

  document.getElementById('goonipedia-add-btn')?.addEventListener('click', () => {
    devLogPush('action', 'Goonipedia: open add modal');
    openGoonipediaModal(null);
  });
  document.getElementById('goonipedia-edit-btn')?.addEventListener('click', () => {
    const p = peopleCache.find((x) => x.id === selectedId);
    if (!p) {
      window.goonAPI?.showToast?.('Select an entry first');
      return;
    }
    devLogPush('action', 'Goonipedia: open edit modal');
    openGoonipediaModal(p);
  });
  document.getElementById('goonipedia-delete-btn')?.addEventListener('click', async () => {
    const p = peopleCache.find((x) => x.id === selectedId);
    if (!p) {
      window.goonAPI?.showToast?.('Select an entry first');
      return;
    }
    if (!confirm(`Remove "${p.name}" from Goonipedia and Gangstalking?`)) return;
    devLogPush('action', 'Goonipedia: deleted entry');
    await window.goonAPI.trackerDeletePerson(p.id);
    selectedId = null;
    window.goonAPI?.showToast?.('Entry removed');
    refreshList();
  });
  document.getElementById('goonipedia-modal-cancel')?.addEventListener('click', () => {
    document.getElementById('goonipedia-modal').style.display = 'none';
  });
  document.getElementById('goonipedia-modal-add-link')?.addEventListener('click', () => {
    appendGoonipediaLinkRow(document.getElementById('goonipedia-modal-links-host'), {});
  });
  document.getElementById('goonipedia-modal-add-section')?.addEventListener('click', () => {
    appendGoonipediaSectionRow(document.getElementById('goonipedia-modal-sections-host'), {});
  });
  document.getElementById('goonipedia-modal-add-tab')?.addEventListener('click', () => {
    appendGoonipediaTabRow(document.getElementById('goonipedia-modal-tabs-host'), {});
  });
  document.getElementById('goonipedia-modal-add-callout')?.addEventListener('click', () => {
    appendGoonipediaCalloutRow(document.getElementById('goonipedia-modal-callouts-host'), {});
  });
  document.getElementById('goonipedia-modal-avatar-btn')?.addEventListener('click', async () => {
    const result = await window.goonAPI.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }]
    });
    if (!result?.canceled && result?.filePaths?.[0]) {
      goonipediaModalAvatarPath = result.filePaths[0];
      document.getElementById('goonipedia-modal-avatar-path').textContent =
        result.filePaths[0].split(/[/\\]/).pop();
      const dataUrl = await window.goonAPI.trackerGetAvatarDataUrl(goonipediaModalAvatarPath);
      const preview = document.getElementById('goonipedia-modal-avatar-preview');
      preview.src = dataUrl || '';
      preview.style.display = 'block';
    }
  });
  document.getElementById('goonipedia-modal-save')?.addEventListener('click', async () => {
    const name = document.getElementById('goonipedia-modal-name').value?.trim() || 'Unknown';
    const youtubeUrl = document.getElementById('goonipedia-modal-youtube').value?.trim() || '';
    const twitterHandle = document.getElementById('goonipedia-modal-twitter').value?.trim() || '';
    const facebookUrl = document.getElementById('goonipedia-modal-facebook').value?.trim() || '';
    const akas = document.getElementById('goonipedia-modal-akas').value?.trim() || '';
    const bio = document.getElementById('goonipedia-modal-bio').value || '';
    const references = document.getElementById('goonipedia-modal-refs').value || '';
    const dateOfBirth = document.getElementById('goonipedia-modal-dob').value?.trim() || '';
    const dateDiscovered = document.getElementById('goonipedia-modal-disc').value?.trim() || '';
    const dateOfDeath = document.getElementById('goonipedia-modal-dod').value?.trim() || '';
    const customLinks = collectGoonipediaLinks();
    const wikiSections = collectGoonipediaSections();
    const wikiTabs = collectGoonipediaTabs();
    const wikiCallouts = collectGoonipediaCallouts();
    const payload = {
      name,
      youtubeUrl,
      twitterHandle,
      facebookUrl,
      akas,
      bio,
      references,
      dateOfBirth,
      dateDiscovered,
      dateOfDeath,
      customLinks,
      wikiSections,
      wikiTabs,
      wikiCallouts,
      avatarPath: goonipediaModalAvatarPath
    };
    document.getElementById('goonipedia-modal').style.display = 'none';
    if (goonipediaModalEditingId) {
      devLogPush('action', 'Goonipedia: saved entry (update)');
      await window.goonAPI.trackerUpdatePerson(goonipediaModalEditingId, payload);
      window.goonAPI?.showToast?.('Entry updated');
    } else {
      devLogPush('action', 'Goonipedia: saved entry (new)');
      const entry = await window.goonAPI.trackerAddPerson(payload);
      if (entry?.id) selectedId = entry.id;
      window.goonAPI?.showToast?.('Entry added');
    }
    refreshList();
  });

  document.getElementById('goonipedia-search')?.addEventListener('input', () => refreshList());

  let goonipediaExportOutsideClose = null;
  function closeGoonipediaExportMenu() {
    document.getElementById('goonipedia-export-menu')?.classList.remove('is-open');
    document.getElementById('goonipedia-export-btn')?.setAttribute('aria-expanded', 'false');
    if (goonipediaExportOutsideClose) {
      document.removeEventListener('click', goonipediaExportOutsideClose);
      goonipediaExportOutsideClose = null;
    }
  }
  function openGoonipediaExportMenu() {
    document.getElementById('goonipedia-export-menu')?.classList.add('is-open');
    document.getElementById('goonipedia-export-btn')?.setAttribute('aria-expanded', 'true');
    goonipediaExportOutsideClose = (e) => {
      const wrap = document.getElementById('goonipedia-export-wrap');
      if (!wrap) {
        document.removeEventListener('click', goonipediaExportOutsideClose);
        goonipediaExportOutsideClose = null;
        return;
      }
      if (!wrap.contains(e.target)) closeGoonipediaExportMenu();
    };
    setTimeout(() => document.addEventListener('click', goonipediaExportOutsideClose), 0);
  }

  document.getElementById('goonipedia-export-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('goonipedia-export-menu');
    if (menu?.classList.contains('is-open')) closeGoonipediaExportMenu();
    else openGoonipediaExportMenu();
  });

  document.getElementById('goonipedia-export-menu')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const item = e.target.closest('[data-goonipedia-export]');
    if (!item) return;
    const kind = item.getAttribute('data-goonipedia-export');
    closeGoonipediaExportMenu();

    if (kind === 'entry-json' || kind === 'entry-md' || kind === 'copy-md') {
      const p = peopleCache.find((x) => x.id === selectedId);
      if (!p) {
        window.goonAPI?.showToast?.('Select an entry first');
        return;
      }
      if (kind === 'entry-json') {
        devLogPush('action', 'Goonipedia: export entry JSON');
        const entry = { ...goonipediaEntryCore(p) };
        if (p.avatarPath) {
          try {
            const dataUrl = await window.goonAPI.trackerGetAvatarDataUrl(p.avatarPath);
            if (dataUrl) entry.avatarDataUrl = dataUrl;
          } catch (_) {}
        }
        const payload = { format: 'goonipedia-entry-v1', exportedAt: new Date().toISOString(), entry };
        const json = JSON.stringify(payload, null, 2);
        downloadGoonipediaBlob(
          new Blob([json], { type: 'application/json' }),
          `goonipedia-${goonipediaSafeFilename(p.name)}.json`
        );
        window.goonAPI?.showToast?.('Entry exported');
        return;
      }
      if (kind === 'entry-md') {
        devLogPush('action', 'Goonipedia: export entry Markdown');
        const md = personToMarkdown(p);
        downloadGoonipediaBlob(
          new Blob([md], { type: 'text/markdown;charset=utf-8' }),
          `goonipedia-${goonipediaSafeFilename(p.name)}.md`
        );
        window.goonAPI?.showToast?.('Markdown saved');
        return;
      }
      if (kind === 'copy-md') {
        devLogPush('action', 'Goonipedia: copy Markdown');
        const md = personToMarkdown(p);
        try {
          await navigator.clipboard.writeText(md);
          window.goonAPI?.showToast?.('Article copied');
        } catch {
          window.goonAPI?.showToast?.('Copy failed');
        }
        return;
      }
    }

    if (kind === 'all-json') {
      const people = await window.goonAPI.trackerGetPeople();
      if (!people.length) {
        window.goonAPI?.showToast?.('No entries to export');
        return;
      }
      devLogPush('action', 'Goonipedia: export all JSON');
      const sorted = [...people].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
      );
      const payload = {
        format: 'goonipedia-encyclopedia-v1',
        exportedAt: new Date().toISOString(),
        entryCount: sorted.length,
        entries: sorted.map((p) => ({ id: p.id, ...goonipediaEntryCore(p) }))
      };
      const json = JSON.stringify(payload, null, 2);
      downloadGoonipediaBlob(
        new Blob([json], { type: 'application/json' }),
        `goonipedia-encyclopedia-${new Date().toISOString().slice(0, 10)}.json`
      );
      window.goonAPI?.showToast?.(`Exported ${sorted.length} entries`);
    }
  });

  refreshList();
}

function loadReportView() {
  viewEl.innerHTML = `
    <div class="view-title-bar">
      <span>[ REPORT TO HQ ]</span>
      <div class="title-bar-actions"></div>
    </div>
    <p style="opacity:0.7;font-size:13px;margin-top:-8px;">Something broke? Pod Awful knows. Help us fix it.</p>
    <div style="display:flex;flex-direction:column;gap:12px;max-width:500px;">
      <div>
        <label style="display:block;margin-bottom:4px;opacity:0.8;">Describe the issue</label>
        <textarea id="report-notes" rows="4" style="width:100%;padding:8px 12px;background:#11131a;border:1px solid #333;color:#f5f5f5;border-radius:4px;resize:vertical;" placeholder="What happened? Steps to reproduce?"></textarea>
      </div>
      <div style="display:flex;gap:8px;">
        <button type="button" id="report-copy" class="hud-btn" title="Copy report to clipboard">Copy Evidence</button>
        <button type="button" id="report-github" class="hud-btn" title="Report to GitHub">Report to GitHub</button>
      </div>
      <div id="report-status" style="font-size:12px;opacity:0.9;min-height:20px;margin-top:4px;color:var(--color-primary);"></div>
    </div>
  `;
  const notesEl = document.getElementById('report-notes');
  const copyEl = document.getElementById('report-copy');
  const githubEl = document.getElementById('report-github');
  const statusEl = document.getElementById('report-status');
  copyEl.addEventListener('click', async () => {
    devLogPush('action', 'Report: copied to clipboard');
    const text = (notesEl?.value || '').trim() || 'No description provided.';
    const logPath = await window.goonAPI.getLogPath?.();
    const version = await window.goonAPI.getVersion?.() || '0.2.0';
    const report = `## Bug Report\n\n${text}\n\n---\nGoonopticon Desktop v${version}\nLog: ${logPath || 'N/A'}`;
    try {
      await navigator.clipboard.writeText(report);
      statusEl.textContent = 'Copied. The evidence is mounting.';
      window.goonAPI?.showToast?.('Report copied to clipboard');
    } catch {
      statusEl.textContent = 'Failed to copy.';
      window.goonAPI?.showToast?.('Failed to copy');
    }
  });
  githubEl.addEventListener('click', async () => {
    devLogPush('action', 'Report: opened GitHub');
    const text = (notesEl?.value || '').trim() || 'No description provided.';
    const version = await window.goonAPI.getVersion?.() || '0.2.0';
    const body = encodeURIComponent(`## Bug Report\n\n${text}\n\n---\nGoonopticon Desktop v${version}`);
    window.goonAPI.openExternal(`https://github.com/CrudePixels/Goonopticon/issues/new?body=${body}`);
    statusEl.textContent = 'Opening GitHub… Let the world know.';
  });
}

// Livestream platforms for unified chat (Pod Awful streams)
/** Logos: place twitch.png, youtube.svg, etc. in src/icons (see src/icons/README.md). */
const CHAT_PLATFORMS = [
  { id: 'dlive', name: 'DLive', url: 'https://dlive.io/PodAwful' },
  { id: 'rumble', name: 'Rumble', url: 'https://rumble.com/c/PODAWFUL' },
  { id: 'kick', name: 'Kick', url: 'https://player.kick.com/podawful/' },
  { id: 'podawful', name: 'Pod Awful', url: 'https://podawful.com/live' },
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/@podawfulH2BH' },
  { id: 'odysee', name: 'Odysee', url: 'https://odysee.com/@podawful:8' },
  { id: 'twitch', name: 'Twitch', url: 'https://www.twitch.tv/podawful' },
  { id: 'discord', name: 'Discord', url: 'https://discord.com' }
];

function chatPlatformIconSrc(platformId) {
  const raw = String(platformId || 'other').trim();
  return `goonopticon-platform-icons:///${encodeURIComponent(raw)}`;
}
const MODERATION_PLATFORMS = ['twitch', 'kick', 'youtube'];
const CHAT_PLATFORM_COLORS = {
  twitch: '#9146ff',
  youtube: '#ff0000',
  kick: '#53fc18',
  dlive: '#ffd93d',
  rumble: '#ff6b00',
  odysee: '#4d7cff',
  podawful: '#c41e3a',
  discord: '#5865f2',
  embed: '#0ea5e9'
};

let chatAddedStreams = new Set();
let chatMessages = [];
/** Skip oldest N messages in UI (scrollback window); module-level so chatMessage listener can adjust when log is trimmed. */
let chatShowFromIndex = 0;
let _chatRenderMessagesRef = null;
let _chatMessageListenerAdded = false;

// Common platform emote codes (Twitch, Kick, YouTube, etc.) — filtered when "Filter platform emotes" is on
const CHAT_PLATFORM_EMOTES_BUILTIN = [
  '4Head', 'Kappa', 'KappaPride', 'LUL', 'PogChamp', 'BibleThump', 'FrankerZ', 'HeyGuys',
  'SeemsGood', 'SMOrc', 'SwiftRage', 'TriHard', 'WutFace', 'EleGiggle', 'DansGame', 'ResidentSleeper',
  'OMGScoots', 'VoHiYo', 'FailFish', 'RalpherZ', 'TheThing', 'OpieOP', 'Keepo', 'Kreygasm',
  'OneHand', 'PogChamp', 'MingLee', 'NotLikeThis', 'SSSsss', 'StinkyCheese', 'BrokeBack', 'SourPls',
  'panicBasket', 'PanicVis', 'PunchTrees', 'RitzMitz', 'ShadyLulu', 'SuperVinlin', 'TPFufun', 'TPcrunchyroll',
  'TwitchRPG', 'TwitchSquid', 'WooferZ', 'YouDontSay', 'duDudu', 'mcaT', 'o_O', 'O_o', 'RaccAttack'
];

function filterMessagePlatformEmotes(text, blocklist) {
  if (!text || !blocklist.length) return text || '';
  const escaped = blocklist.map((s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('\\b(' + escaped.join('|') + ')\\b', 'gi');
  return String(text).replace(re, '').replace(/\s{2,}/g, ' ').trim();
}

function escapeHtmlChat(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeHtmlAttr(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function formatDonationAmount(amount, currency) {
  if (amount == null || amount === '') return '';
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  if (currency === 'bits') return `${Math.floor(n)} bits`;
  if (currency === 'USD' || currency === 'usd') return `$${n.toFixed(2)}`;
  return currency ? `${n.toFixed(2)} ${currency}` : `$${n.toFixed(2)}`;
}

function chatFontSizePxFromScale(scale) {
  const s = Math.max(1, Math.min(10, Number(scale) || 5));
  return `${(10 + (s - 1) * (10 / 9)).toFixed(1)}px`;
}

/** Apply chat font scale to wrap + message list (list needs explicit px; wrap alone is not enough in some layouts). */
function applyUnifiedChatFontSize(scale) {
  const px = chatFontSizePxFromScale(scale);
  const wrap = document.getElementById('chat-messages-wrap');
  const list = document.getElementById('chat-messages');
  if (wrap) wrap.style.fontSize = px;
  if (list) list.style.fontSize = px;
}

function loadChatView() {
  const chatMode = (typeof loadChatView.chatMode === 'string') ? loadChatView.chatMode : 'view';
  freezeMark('loadChatView_begin', { mode: chatMode });
  viewEl.innerHTML = `
    <div class="chat-view" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;">
      <div class="view-title-bar">
        <span>[ CHAT ]</span>
        <div class="title-bar-actions">
          <button type="button" class="hud-btn view-pop-out-btn" id="chat-popout-btn" title="Open in separate window" style="display:${isChatPopout() ? 'none' : 'inline-flex'};">Pop out</button>
          <button type="button" class="btn-close" id="chat-close-window-btn" title="Close">×</button>
        </div>
      </div>
      <div class="chat-live-toggle-bar" style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:10px;padding:10px 12px;background:var(--hud-surface);border:1px solid var(--hud-border);border-radius:4px;flex-shrink:0;">
        <span style="font-size:11px;font-family:var(--hud-font-mono);letter-spacing:0.06em;color:var(--hud-accent);">LIVE STREAMS</span>
        <button type="button" class="hud-btn" id="chat-unified-toggle-btn" style="font-size:11px;padding:6px 12px;" title="When off, no live platform connections or hidden scraper windows. Turn on to start the unified feed.">Live streams: Off</button>
        <span style="font-size:10px;opacity:0.75;line-height:1.4;max-width:340px;">Turn on to start unified feed,</span>
      </div>
      <div class="chat-toolbar" style="display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap;position:relative;z-index:5;flex-shrink:0;background:var(--hud-bg);">
        <div class="chat-mode-toggle-wrap" role="group" aria-label="View or Input mode" style="display:inline-flex;border:1px solid var(--hud-border);border-radius:4px;overflow:hidden;">
          <button type="button" class="chat-mode-option" data-mode="input" style="font-size:11px;padding:6px 10px;border:none;background:${chatMode === 'input' ? 'var(--hud-accent)' : 'rgba(0,0,0,0.35)'};color:${chatMode === 'input' ? 'var(--hud-bg)' : 'var(--hud-text-dim)'};opacity:${chatMode === 'input' ? '1' : '0.7'};cursor:pointer;">Input</button>
          <span class="chat-mode-divider" style="width:1px;background:var(--hud-border);"></span>
          <button type="button" class="chat-mode-option" data-mode="view" style="font-size:11px;padding:6px 10px;border:none;background:${chatMode === 'view' ? 'var(--hud-accent)' : 'rgba(0,0,0,0.35)'};color:${chatMode === 'view' ? 'var(--hud-bg)' : 'var(--hud-text-dim)'};opacity:${chatMode === 'view' ? '1' : '0.7'};cursor:pointer;">View</button>
        </div>
        <span style="flex:1;"></span>
        <button type="button" class="hud-btn" id="chat-scroll-live-btn" style="font-size:11px;" title="Pause live scroll to read history; click to resume">Live</button>
        <button type="button" class="hud-btn" id="chat-viewers-btn" style="font-size:11px;" title="Total viewers across all platforms">Viewers: —</button>
      </div>
      <div id="chat-input-mode-panel" style="display:${chatMode === 'input' ? 'block' : 'none'};">
      <p style="opacity:0.8;font-size:12px;margin:-8px 0 4px 0;">Unified livestream chat. Add streams below — messages from all platforms appear in one feed. Chat is saved automatically.</p>
      <details class="chat-setup-details" style="margin-bottom:12px;font-size:11px;opacity:0.9;">
        <summary style="cursor:pointer;list-style:none;display:inline-flex;align-items:center;gap:4px;user-select:none;">
          <span class="chat-setup-chevron" style="font-family:var(--hud-font-mono);color:var(--hud-accent);">▸</span>
          <span style="font-family:var(--hud-font-mono);color:var(--hud-accent);">Chat features</span>
        </summary>
        <ul class="chat-setup-list" style="margin:8px 0 0 0;padding-left:18px;line-height:1.6;">
          <li><strong>View / Input</strong> — Toggle read-only or typing mode. In Input you can send messages and use custom commands.</li>
          <li><strong>Right-click a username</strong> — Show User Info (profile, stats, chat history, donation history, DM, mark user, timeout, ban, unban, vote to timeout/ban/unban).</li>
          <li><strong>Right-click a message</strong> — Pin it as an announcement above chat.</li>
          <li><strong>Chat filter</strong> — Show All or one platform. Add stream by URL or from the list; filter by keyword in Settings.</li>
          <li><strong>Polls</strong> — Create poll on Twitch, YouTube, or the website embed. Active poll appears at the top with vote counts.</li>
          <li><strong>Start troll</strong> — Pin a short note plus link above chat (in-app and website embed). When done, use <strong>Successful</strong> or <strong>Failed</strong> to log the outcome and clear the banner. Open <strong>Troll log</strong> for history and totals.</li>
          <li><strong>Viewers</strong> — Total viewers across Twitch, Kick, YouTube, and the embed. Emote picker (😀) inserts :shortcodes: from your emotes folder.</li>
        </ul>
      </details>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;">
        <button type="button" class="hud-btn" id="chat-add-stream-btn" style="font-size:11px;display:inline-flex;align-items:center;gap:6px;">+ Add stream</button>
      </div>
      <div id="chat-added-streams" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;min-height:24px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <button type="button" class="hud-btn" id="chat-create-poll-btn" style="font-size:11px;">Create poll</button>
        <button type="button" class="hud-btn" id="chat-start-troll-btn" style="font-size:11px;">Start troll</button>
        <button type="button" class="hud-btn" id="chat-troll-log-btn" style="font-size:11px;">Troll log</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;opacity:0.9;">Chat filter <select id="chat-filter-select" style="padding:6px 10px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;min-width:120px;">
          <option value="all">All</option>
          ${CHAT_PLATFORMS.map((p) => `<option value="${escapeHtmlChat(p.id)}">${escapeHtmlChat(p.name)}</option>`).join('')}
        </select></label>
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;opacity:0.9;">Platform label <select id="chat-platform-label-select" title="Icon only saves horizontal space; hover the icon for the platform name" style="padding:6px 10px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;min-width:118px;">
          <option value="full">Icon + name</option>
          <option value="icon">Icon only</option>
        </select></label>
        </div>
      </div>
      </div>
      <div id="chat-messages-wrap" style="flex:1;min-height:0;display:flex;flex-direction:column;border:1px solid var(--hud-border);border-radius:4px;background:var(--hud-bg);">
        <div id="chat-pinned-bar" style="display:none;flex-shrink:0;padding:8px 12px;background:var(--hud-surface);border-bottom:1px solid var(--hud-border);font-size:11px;align-items:center;gap:8px;"></div>
        <div id="chat-troll-bar" style="display:none;flex-shrink:0;padding:8px 12px;background:var(--hud-surface);border-bottom:1px solid var(--hud-border);font-size:11px;align-items:center;gap:8px;"></div>
        <div id="chat-poll-bar" style="display:none;flex-shrink:0;padding:10px 12px;background:var(--hud-surface);border-bottom:1px solid var(--hud-border);font-size:11px;"></div>
        <div id="chat-messages" class="chat-messages-scroll" style="flex:1;overflow-y:auto;padding:8px;font-family:var(--hud-font-mono);font-size:inherit;"></div>
        <div id="chat-input-wrap" class="chat-input-wrap" style="display:${chatMode === 'input' ? 'flex' : 'none'};padding:8px;border-top:1px solid var(--hud-border);gap:8px;align-items:center;position:relative;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:4px;font-size:11px;opacity:0.9;">Chat size <select id="chat-size-select" style="padding:4px 8px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:11px;">
            <option value="3">Small</option>
            <option value="5" selected>Medium</option>
            <option value="8">Large</option>
          </select></label>
          <input type="text" id="chat-input" placeholder="Type a message…" style="flex:1;min-width:120px;padding:8px 12px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;" />
          <button type="button" class="hud-btn" id="chat-emote-btn" title="Insert emote" style="padding:8px 10px;font-size:14px;">😀</button>
          <button type="button" class="hud-btn" id="chat-send-btn">Send</button>
          <div id="chat-emote-picker" class="chat-emote-picker" style="display:none;position:absolute;bottom:100%;right:0;margin-bottom:4px;width:280px;max-height:240px;background:var(--hud-surface);border:1px solid var(--hud-border);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.4);flex-direction:column;overflow:hidden;z-index:100;">
            <input type="text" id="chat-emote-picker-filter" placeholder="Type to filter…" style="margin:8px;padding:6px 10px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;" />
            <div id="chat-emote-picker-grid" style="flex:1;overflow-y:auto;padding:4px;display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:4px;align-content:start;"></div>
          </div>
        </div>
      </div>
    </div>
    <style>
      .chat-view .chat-platform-btn.added { background:var(--hud-surface-hover); border-color:var(--hud-accent); color:var(--hud-accent); }
      .chat-view .chat-setup-details[open] .chat-setup-chevron { transform:rotate(90deg); }
      .chat-view .chat-setup-list a { color:var(--hud-accent); text-decoration:none; }
      .chat-view .chat-setup-list a:hover { text-decoration:underline; }
      .chat-messages-scroll { overflow-anchor:none; }
      .chat-msg { padding:4px 0; border-bottom:1px solid var(--hud-border); display:flex; align-items:center; gap:8px; flex-wrap:wrap; border-left:3px solid transparent; padding-left:6px; margin-left:2px; font-size:1em; contain:layout style; content-visibility:auto; contain-intrinsic-size:auto 1.4em; }
      .chat-msg .chat-user-avatar { width:22px; height:22px; border-radius:50%; object-fit:cover; flex-shrink:0; background:var(--hud-surface); vertical-align:middle; }
      .chat-msg .chat-platform { font-size:0.85em; opacity:0.9; min-width:4.5em; display:inline-flex; align-items:center; gap:5px; }
      .chat-msg .chat-platform.chat-platform-label-icon-only { min-width:0; gap:0; }
      .chat-platform-img { width:14px; height:14px; object-fit:contain; flex-shrink:0; border-radius:2px; }
      .chat-stream-chip-icon { width:14px; height:14px; object-fit:contain; vertical-align:middle; margin-right:4px; border-radius:2px; }
      .chat-msg .chat-username { color:var(--hud-accent); font-weight:600; cursor:context-menu; }
      .chat-msg .chat-text { flex:1; word-break:break-word; }
      .chat-msg .chat-donation-amount { font-weight:700; margin-left:6px; padding:2px 6px; border-radius:4px; background:var(--color-highlight, #00ff41); color:var(--color-background, #0a0a0a); font-size:0.92em; }
      .chat-msg.chat-msg-donation { background:rgba(0,255,65,0.12); border-radius:4px; margin-right:4px; }
      .chat-msg.chat-msg-marked-highlight { background:rgba(255,200,0,0.15); border-radius:4px; }
      .chat-msg.chat-msg-keyword-highlight { background:rgba(100,180,255,0.15); border-radius:4px; }
      .chat-user-badge { font-size:0.78em; padding:1px 5px; border-radius:3px; background:var(--hud-accent); color:var(--hud-bg); font-weight:600; }
      .chat-user-tags { display:inline-flex; gap:4px; flex-wrap:wrap; margin-left:4px; }
      .chat-user-tag { font-size:0.78em; padding:1px 4px; border-radius:3px; background:var(--hud-surface); border:1px solid var(--hud-border); opacity:0.9; }
      .chat-context-menu { position:fixed;z-index:999;background:var(--hud-surface);border:1px solid var(--hud-border);border-radius:4px;padding:4px 0;min-width:160px;box-shadow:0 4px 12px rgba(0,0,0,0.4); }
      .chat-context-menu button { display:block;width:100%;text-align:left;padding:6px 12px;border:none;background:transparent;color:var(--hud-text);cursor:pointer;font-size:12px; }
      .chat-context-menu button:hover { background:var(--hud-surface-hover); }
      .chat-context-menu button:disabled { opacity:0.5; cursor:not-allowed; }
      .chat-stream-chip { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; background:var(--hud-surface); border:1px solid var(--hud-border); border-radius:4px; font-size:11px; }
      .chat-stream-chip .remove { cursor:pointer; opacity:0.8; }
      .chat-stream-chip .remove:hover { opacity:1; color:var(--hud-accent); }
      .chat-mode-btn.active { background:var(--hud-surface-hover); border-color:var(--hud-accent); color:var(--hud-accent); }
      .chat-filter-tab.active { background:var(--hud-surface-hover); border-color:var(--hud-accent); color:var(--hud-accent); }
      .chat-emote { height:1.2em; vertical-align:middle; display:inline-block; }
      .chat-emote-picker { display: none; }
      .chat-emote-picker[data-open="true"] { display: flex !important; }
      .chat-emote-picker-item { display:flex;flex-direction:column;align-items:center;padding:6px;background:transparent;border:none;border-radius:4px;cursor:pointer;color:var(--hud-text);font-size:10px; }
      .chat-emote-picker-item:hover { background:var(--hud-surface-hover); }
      .chat-emote-picker-item img { width:32px;height:32px;object-fit:contain;margin-bottom:2px; }
      .chat-viewers-dropdown {
        position: fixed;
        z-index: 1200;
        width: min(520px, calc(100vw - 24px));
        max-height: min(420px, calc(100vh - 24px));
        overflow: auto;
        background: var(--hud-surface);
        border: 1px solid var(--hud-border);
        border-radius: 6px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.45);
        padding: 10px 12px;
        font-family: var(--hud-font-mono);
        font-size: 12px;
        color: var(--hud-text);
      }
      .chat-viewers-dropdown .hdr {
        font-weight: 700;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 10px;
      }
      .chat-viewers-dropdown .sub {
        opacity: 0.75;
        font-size: 11px;
        font-weight: 500;
      }
      .chat-viewers-dropdown .row {
        padding: 8px 0;
        border-bottom: 1px solid var(--hud-border);
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      .chat-viewers-dropdown .row:last-child { border-bottom: none; }
      .chat-viewers-dropdown .row .left { flex: 1; min-width: 0; }
      .chat-viewers-dropdown .plat { font-weight: 700; }
      .chat-viewers-dropdown .count { opacity: 0.9; font-weight: 600; }
      .chat-viewers-dropdown .links { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px; }
      .chat-viewers-dropdown .links a {
        color: var(--hud-accent);
        text-decoration: underline;
        opacity: 0.95;
        cursor: pointer;
        word-break: break-word;
      }
      .chat-viewers-dropdown .links a:hover { opacity: 1; }
      .chat-viewers-dropdown .url-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 8px;
        border: 1px solid var(--hud-border);
        border-radius: 999px;
        background: rgba(0,0,0,0.18);
        font-size: 11px;
      }
      .chat-viewers-dropdown .url-chip .ext { opacity: 0.8; font-size: 10px; }
    </style>
  `;

  const messagesEl = document.getElementById('chat-messages');
  const addedStreamsEl = document.getElementById('chat-added-streams');
  const inputWrap = document.getElementById('chat-input-wrap');
  const chatInput = document.getElementById('chat-input');
  let chatIdentityMap = {};
  let chatEmoteNames = [];
  let chatFilterPlatformEmotes = false;
  let chatPlatformEmoteBlocklist = [];
  let chatFontScale = 5;
  /** 'full' | 'icon' — show platform name next to logo in chat rows & chips, or icon only (tooltip). */
  let chatPlatformLabelMode = 'full';
  let chatPlatformFilter = 'all';
  const CHAT_SCROLLBACK_PAGE = 300;
  /** DOM row cap when following live — avoids innerHTML melt on floods (Kick/Twitch). */
  const CHAT_RENDER_ROWS_MAX = 72;
  /** When Live is off / reading history, still cap rows or one innerHTML pass can freeze Electron (1000× emote regex). */
  const CHAT_RENDER_ROWS_HISTORY_MAX = 160;
  const CHAT_MSG_DISPLAY_MAX = 240;
  const CHAT_DATA_MESSAGE_MAX = 320;
  const CHAT_MEMORY_MAX = 1000;
  let chatHighlightKeywords = [];
  let chatPinnedMessage = null;
  let chatAutoScroll = true;
  /** True while we set scrollTop programmatically — ignore scroll listener so we don't flip back to "live" when paused-near-bottom. */
  let chatScrollProgrammaticRestore = false;
  let chatLastMessageTime = 0;

  function replaceEmotesInMessage(text, emoteNames) {
    if (!text || !emoteNames.length) return escapeHtmlChat(text);
    if (emoteNames.length > 100) return escapeHtmlChat(text);
    const escaped = emoteNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const alt = escaped.join('|');
    if (alt.length > 24000) return escapeHtmlChat(text);
    const re = new RegExp(':(' + alt + '):', 'g');
    const withPlaceholders = String(text).replace(re, (_, n) => '{{EMOTE:' + n + '}}');
    const escapedHtml = escapeHtmlChat(withPlaceholders);
    return escapedHtml.replace(/\{\{EMOTE:([^}]+)\}\}/g, (_, n) => '<img src="goonopticon-emotes:///' + escapeHtmlChat(n) + '.png" class="chat-emote" alt=":' + escapeHtmlChat(n) + ':" />');
  }

  document.querySelectorAll('.chat-mode-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (mode !== 'input' && mode !== 'view') return;
      loadChatView.chatMode = mode;
      const isInput = mode === 'input';
      if (inputWrap) inputWrap.style.display = isInput ? 'flex' : 'none';
      const panel = document.getElementById('chat-input-mode-panel');
      if (panel) panel.style.display = isInput ? 'block' : 'none';
      document.querySelectorAll('.chat-mode-option').forEach((b) => {
        const isSelected = (b.dataset.mode || '') === mode;
        b.style.background = isSelected ? 'var(--hud-accent)' : 'rgba(0,0,0,0.35)';
        b.style.color = isSelected ? 'var(--hud-bg)' : 'var(--hud-text-dim)';
        b.style.opacity = isSelected ? '1' : '0.7';
      });
      const viewersBtn = document.getElementById('chat-viewers-btn');
      if (viewersBtn) viewersBtn.style.display = 'inline-flex';
    });
  });
  function updateChatScrollLiveButton() {
    const btn = document.getElementById('chat-scroll-live-btn');
    if (!btn) return;
    if (chatAutoScroll) {
      btn.textContent = 'Live';
      btn.title = 'Live scroll — scroll up to pause';
    } else {
      btn.textContent = '↓ Resume';
      btn.title = 'Resume live scroll';
    }
  }
  document.getElementById('chat-scroll-live-btn')?.addEventListener('click', () => {
    chatAutoScroll = !chatAutoScroll;
    if (chatAutoScroll && messagesEl) {
      chatScrollProgrammaticRestore = true;
      messagesEl.scrollTop = messagesEl.scrollHeight;
      requestAnimationFrame(() => { chatScrollProgrammaticRestore = false; });
    }
    updateChatScrollLiveButton();
  });
  if (messagesEl) {
    messagesEl.addEventListener('scroll', () => {
      if (!messagesEl || chatScrollProgrammaticRestore) return;
      const atBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 30;
      if (atBottom) chatAutoScroll = true;
      else chatAutoScroll = false;
      updateChatScrollLiveButton();
    });
  }
  updateChatScrollLiveButton();
  // Keep the viewers button visible in both view/input modes (dropdown with per-platform counts).
  document.getElementById('chat-popout-btn')?.addEventListener('click', () => {
    window.goonAPI?.openChatPopout?.();
  });
  document.getElementById('chat-close-window-btn')?.addEventListener('click', () => {
    window.goonAPI?.closeWindow?.();
  });
  document.getElementById('chat-send-btn')?.addEventListener('click', async () => {
    let text = (chatInput?.value || '').trim();
    if (!text) return;
    const commands = (await window.goonAPI?.chatGetCustomCommands?.()) || {};
    if (commands[text] != null) text = String(commands[text]).trim();
    if (!text) return;
    window.goonAPI?.chatSendMessage?.(text).then((r) => {
      if (r?.ok) { if (chatInput) chatInput.value = ''; }
      else window.goonAPI?.showToast?.(r?.error || 'Send failed');
    }).catch(() => window.goonAPI?.showToast?.('Send failed'));
  });

  // Per-platform viewer dropdown
  const viewersBtn = document.getElementById('chat-viewers-btn');
  if (viewersBtn) {
    viewersBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleChatViewersDropdown();
    });
  }
  document.addEventListener('click', () => {
    closeChatViewersDropdown();
  });
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('chat-send-btn')?.click();
    }
  });

  const emotePickerEl = document.getElementById('chat-emote-picker');
  const emotePickerGrid = document.getElementById('chat-emote-picker-grid');
  const emotePickerFilter = document.getElementById('chat-emote-picker-filter');
  function renderEmotePickerGrid(names) {
    if (!emotePickerGrid) return;
    const filter = (emotePickerFilter?.value || '').trim().toLowerCase();
    const list = filter ? names.filter((n) => n.toLowerCase().includes(filter)) : names;
    emotePickerGrid.innerHTML = list
      .map(
        (name) =>
          `<button type="button" class="chat-emote-picker-item" data-emote="${escapeHtmlChat(name)}" title=":${escapeHtmlChat(name)}:">
            <img src="goonopticon-emotes:///${escapeHtmlChat(name)}.png" alt=":${escapeHtmlChat(name)}:" onerror="this.style.visibility='hidden'"/>
            <span>${escapeHtmlChat(name)}</span>
          </button>`
      )
      .join('');
    emotePickerGrid.querySelectorAll('.chat-emote-picker-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-emote');
        if (!name || !chatInput) return;
        const insert = ':' + name + ':';
        const start = chatInput.selectionStart != null ? chatInput.selectionStart : chatInput.value.length;
        const end = chatInput.selectionEnd != null ? chatInput.selectionEnd : chatInput.value.length;
        const before = chatInput.value.slice(0, start);
        const after = chatInput.value.slice(end);
        chatInput.value = before + insert + after;
        chatInput.selectionStart = chatInput.selectionEnd = before.length + insert.length;
        chatInput.focus();
        if (emotePickerEl) { emotePickerEl.removeAttribute('data-open'); emotePickerEl.style.display = 'none'; }
      });
    });
  }
  document.getElementById('chat-emote-btn')?.addEventListener('click', () => {
    if (!emotePickerEl) return;
    const isOpen = emotePickerEl.getAttribute('data-open') === 'true';
    if (isOpen) {
      emotePickerEl.removeAttribute('data-open');
      emotePickerEl.style.display = 'none';
      return;
    }
    window.goonAPI?.chatGetEmoteList?.().then((names) => {
      chatEmoteNames = Array.isArray(names) ? names : [];
      renderEmotePickerGrid(chatEmoteNames);
    });
    emotePickerEl.setAttribute('data-open', 'true');
    emotePickerEl.style.display = 'flex';
    emotePickerFilter.value = '';
    emotePickerFilter.focus();
  });
  emotePickerFilter?.addEventListener('input', () => renderEmotePickerGrid(chatEmoteNames));
  emotePickerFilter?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      emotePickerEl?.removeAttribute('data-open');
      emotePickerEl.style.display = 'none';
    }
  });
  document.addEventListener('click', (e) => {
    if (emotePickerEl?.getAttribute('data-open') === 'true' && !emotePickerEl.contains(e.target) && !document.getElementById('chat-emote-btn')?.contains(e.target)) {
      emotePickerEl.removeAttribute('data-open');
      emotePickerEl.style.display = 'none';
    }
  });

  document.getElementById('chat-filter-select')?.addEventListener('change', () => {
    const filter = document.getElementById('chat-filter-select')?.value || 'all';
    chatPlatformFilter = filter;
    window.goonAPI?.chatSetPlatformFilter?.(filter);
    renderChatMessages();
  });

  document.getElementById('chat-add-stream-btn')?.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.id = 'chat-add-stream-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:360px;width:100%;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:14px;">Add stream</h3>
          <button type="button" class="hud-btn" id="chat-add-stream-done" style="padding:4px 10px;">Cancel</button>
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:11px;opacity:0.9;">Stream URL</label>
          <input type="text" id="chat-add-stream-url" placeholder="Paste Twitch, Kick, YouTube, Rumble, Odysee, DLive, Discord…" style="width:100%;margin-top:4px;padding:8px 10px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;box-sizing:border-box;" />
        </div>
        <div id="chat-add-stream-other-wrap" style="display:none;margin-bottom:10px;">
          <label style="font-size:11px;opacity:0.9;">Display name</label>
          <input type="text" id="chat-add-stream-other" placeholder="Label for this stream (shown in your list)" style="width:100%;margin-top:4px;padding:8px 10px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;box-sizing:border-box;" />
          <p style="margin:6px 0 0;font-size:10px;opacity:0.75;line-height:1.35;">This site isn’t auto-linked for chat. The name is for your chips only; open the URL from the list if you added a link.</p>
        </div>
        <button type="button" class="hud-btn" id="chat-add-stream-by-url" style="width:100%;font-size:12px;padding:8px;">Add</button>
      </div>
    `;
    document.body.appendChild(overlay);
    const urlInput = overlay.querySelector('#chat-add-stream-url');
    const otherWrap = overlay.querySelector('#chat-add-stream-other-wrap');
    const otherInput = overlay.querySelector('#chat-add-stream-other');
    function closeAddStreamModal() {
      overlay.remove();
    }
    /** @returns {{ streamKey: string | null, kind: 'parsed' | 'unknown-host' | 'known-bad-path' | 'empty' }} */
    function parseStreamUrlAuto(raw) {
      const trimmed = (raw || '').trim();
      if (!trimmed) return { streamKey: null, kind: 'empty' };
      try {
        const href = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
        const urlObj = new URL(href);
        const host = urlObj.hostname.replace(/^www\./i, '').toLowerCase();
        const pathSegs = urlObj.pathname.split('/').filter(Boolean);
        const vParam = urlObj.searchParams.get('v');
        if (host.endsWith('twitch.tv')) {
          const chan = pathSegs[0] || urlObj.searchParams.get('channel');
          return chan ? { streamKey: 'twitch:' + String(chan).toLowerCase(), kind: 'parsed' } : { streamKey: null, kind: 'known-bad-path' };
        }
        if (host === 'kick.com' || host.endsWith('.kick.com')) {
          const chan = pathSegs[0];
          return chan ? { streamKey: 'kick:' + String(chan).toLowerCase(), kind: 'parsed' } : { streamKey: null, kind: 'known-bad-path' };
        }
        if (host.includes('youtube.com') || host === 'youtu.be') {
          if (pathSegs[0] === 'live' && pathSegs[1] && /^[a-zA-Z0-9_-]{11}$/.test(pathSegs[1])) {
            return { streamKey: 'youtube:' + pathSegs[1], kind: 'parsed' };
          }
          if (pathSegs[0] === 'shorts' && pathSegs[1] && /^[a-zA-Z0-9_-]{11}$/.test(pathSegs[1])) {
            return { streamKey: 'youtube:' + pathSegs[1], kind: 'parsed' };
          }
          if (pathSegs[0] === 'watch' && pathSegs[1] && /^[a-zA-Z0-9_-]{11}$/.test(pathSegs[1])) {
            return { streamKey: 'youtube:' + pathSegs[1], kind: 'parsed' };
          }
          if (host === 'youtu.be' && pathSegs[0] && /^[a-zA-Z0-9_-]{11}$/.test(pathSegs[0])) {
            return { streamKey: 'youtube:' + pathSegs[0], kind: 'parsed' };
          }
          const at = pathSegs[0] && pathSegs[0].startsWith('@') ? pathSegs[0] : null;
          if (vParam) return { streamKey: 'youtube:' + vParam, kind: 'parsed' };
          if (at) return { streamKey: 'youtube:' + at, kind: 'parsed' };
          const skip = new Set(['watch', 'live', 'embed', 'shorts', 'feed', 'results', 'account', 'playlist']);
          const first = pathSegs[0];
          if (first && !skip.has(first.toLowerCase())) {
            return { streamKey: 'youtube:' + first, kind: 'parsed' };
          }
          return { streamKey: null, kind: 'known-bad-path' };
        }
        if (host.endsWith('rumble.com')) {
          if (pathSegs[0] === 'v' && pathSegs[1]) return { streamKey: 'rumble:v:' + pathSegs[1], kind: 'parsed' };
          if (pathSegs[0] === 'embed' && pathSegs[1] === 'v' && pathSegs[2]) return { streamKey: 'rumble:v:' + pathSegs[2], kind: 'parsed' };
          const c = pathSegs[0] === 'c' ? pathSegs[1] : pathSegs[0];
          return c ? { streamKey: 'rumble:' + c, kind: 'parsed' } : { streamKey: null, kind: 'known-bad-path' };
        }
        if (host.endsWith('odysee.com')) {
          const first = pathSegs[0] || '';
          return first ? { streamKey: 'odysee:' + first, kind: 'parsed' } : { streamKey: null, kind: 'known-bad-path' };
        }
        if (host.endsWith('dlive.tv') || host.endsWith('dlive.io')) {
          const chan = pathSegs[0] || pathSegs[pathSegs.length - 1];
          return chan ? { streamKey: 'dlive:' + chan, kind: 'parsed' } : { streamKey: null, kind: 'known-bad-path' };
        }
        if (host.endsWith('podawful.com')) {
          return { streamKey: 'podawful:live', kind: 'parsed' };
        }
        if (host.endsWith('discord.com')) {
          // Discord guild channel URLs:
          //   /channels/<guildId>/<channelId>/...
          if (pathSegs[0] === 'channels' && pathSegs[1] && pathSegs[2]) {
            const guildId = pathSegs[1];
            const channelId = pathSegs[2];
            const looksLikeSnowflake = (s) => /^\d{16,22}$/.test(String(s));
            if (looksLikeSnowflake(guildId) && looksLikeSnowflake(channelId)) {
              // channel part encodes guild/channel so we can build a canonical URL later
              return { streamKey: 'discord:' + String(guildId) + '/' + String(channelId), kind: 'parsed' };
            }
          }
        }
        return { streamKey: null, kind: 'unknown-host' };
      } catch (_) {
        return { streamKey: null, kind: 'unknown-host' };
      }
    }
    function syncUnrecognizedUi() {
      const url = (urlInput?.value || '').trim();
      if (!url) {
        if (otherWrap) otherWrap.style.display = 'none';
        return;
      }
      const { kind } = parseStreamUrlAuto(url);
      if (otherWrap) otherWrap.style.display = kind === 'unknown-host' ? 'block' : 'none';
    }
    urlInput?.addEventListener('input', syncUnrecognizedUi);
    urlInput?.addEventListener('paste', () => setTimeout(syncUnrecognizedUi, 0));
    overlay.querySelector('#chat-add-stream-by-url')?.addEventListener('click', () => {
      const url = (urlInput?.value || '').trim();
      if (!url) {
        window.goonAPI?.showToast?.('Paste a stream URL.');
        return;
      }
      const { streamKey, kind } = parseStreamUrlAuto(url);
      if (kind === 'unknown-host') {
        const label = (otherInput?.value || '').trim().slice(0, 80);
        if (!label) {
          window.goonAPI?.showToast?.('Enter a display name for this stream.');
          otherInput?.focus();
          return;
        }
        const id = 'other:' + label;
        chatAddedStreams.add(id);
        devLogPush('action', `Chat: added Other (${label})`);
        persistAddedStreams();
        renderAddedStreams();
        window.goonAPI?.openExternal?.(/^https?:\/\//i.test(url) ? url : 'https://' + url);
        window.goonAPI?.showToast?.('Added to your list (unsupported site — no unified chat).');
        closeAddStreamModal();
        return;
      }
      if (kind === 'known-bad-path' || !streamKey) {
        window.goonAPI?.showToast?.('Could not parse channel from that URL. Check the link or use a display name for an unsupported site.');
        return;
      }
      chatAddedStreams.add(streamKey);
      const platformId = streamKey.indexOf(':') >= 0 ? streamKey.slice(0, streamKey.indexOf(':')) : streamKey;
      const p = CHAT_PLATFORMS.find((x) => x.id === platformId);
      const chan = streamKey.slice(platformId.length + 1);
      devLogPush('action', `Chat: added ${p?.name || platformId} (${chan})`);
      window.goonAPI?.openExternal?.(/^https?:\/\//i.test(url) ? url : 'https://' + url);
      persistAddedStreams();
      renderAddedStreams();
      closeAddStreamModal();
    });
    overlay.querySelector('#chat-add-stream-done')?.addEventListener('click', () => closeAddStreamModal());
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeAddStreamModal(); });
    urlInput?.focus();
  });

  async function refreshChatIdentityMap() {
    const links = (await window.goonAPI.chatGetIdentityLinks?.()) || {};
    const identities = (await window.goonAPI.chatGetIdentities?.()) || {};
    const map = {};
    for (const [key, id] of Object.entries(links)) {
      const ident = identities[id];
      if (ident) map[key] = { chatColor: ident.chatColor || '', highlight: ident.highlight, tags: ident.tags || [], badge: ident.badge || '' };
    }
    return map;
  }

  function persistAddedStreams() {
    window.goonAPI.chatSetAddedStreams?.([...chatAddedStreams]);
  }

  function renderChatMessages(options = {}) {
    if (!messagesEl || !messagesEl.isConnected) return;
    const recentlyLive = Date.now() - chatLastMessageTime < 120000;
    const scrollToBottom = options.scrollToBottom !== false && chatAutoScroll && recentlyLive;
    const visible = chatMessages.slice(chatShowFromIndex);
    let filtered = chatPlatformFilter === 'all' ? visible : visible.filter((m) => (m.platformId || '') === chatPlatformFilter);
    let renderCapNote = '';
    const rowCap =
      chatAutoScroll && recentlyLive ? CHAT_RENDER_ROWS_MAX : CHAT_RENDER_ROWS_HISTORY_MAX;
    if (filtered.length > rowCap) {
      const omitted = filtered.length - rowCap;
      filtered = filtered.slice(-rowCap);
      renderCapNote = `<div class="chat-render-cap" style="opacity:0.75;font-size:10px;padding:4px 6px;border-bottom:1px solid var(--hud-border);line-height:1.35;">… ${omitted} lines not rendered (keeps the app responsive; full log stays on disk). Use <b>Load older</b> / platform filter / <b>Live</b> to move through history.</div>`;
    }
    const hasOlder = chatShowFromIndex > 0;
    let loadOlderHtml = hasOlder ? `<div class="chat-load-older-wrap" style="padding:8px 0;border-bottom:1px solid var(--hud-border);"><button type="button" class="hud-btn" id="chat-load-older-btn" style="font-size:11px;">Load older (${Math.min(CHAT_SCROLLBACK_PAGE, chatShowFromIndex)} more)</button></div>` : '';
    if (filtered.length === 0 && !hasOlder) {
      const hasStreams = chatAddedStreams.size > 0;
    messagesEl.innerHTML = chatMessages.length === 0
        ? '<div style="opacity:0.8;padding:12px;font-size:12px;line-height:1.5;">' +
          (hasStreams
            ? 'Streams added. Messages appear here when those streams are <strong>live</strong> and the app has connected (can take 30–60 seconds after opening Chat). YouTube: add a Data API key in Settings → Platform accounts for more reliable live chat. <button type="button" class="hud-btn" id="chat-test-connection-btn" style="margin-top:10px;font-size:11px;">Test connection</button>'
            : 'Add streams above. When live chat is connected, messages will appear here — platform, username, message. <button type="button" class="hud-btn" id="chat-test-connection-btn" style="margin-top:10px;font-size:11px;">Test connection</button>') +
          '</div>'
        : '<div style="opacity:0.6;padding:8px;">No messages for this filter. Switch to All or another platform.</div>';
      document.getElementById('chat-test-connection-btn')?.addEventListener('click', () => {
        window.goonAPI?.chatSendTestMessage?.();
      });
      if (scrollToBottom) {
        requestAnimationFrame(() => {
          if (!messagesEl) return;
          chatScrollProgrammaticRestore = true;
          messagesEl.scrollTop = messagesEl.scrollHeight;
          requestAnimationFrame(() => { chatScrollProgrammaticRestore = false; });
        });
      }
      updateChatScrollLiveButton?.();
      return;
    }
    const keywordHighlight = (text) => chatHighlightKeywords.length && chatHighlightKeywords.some((k) => k && String(text).toLowerCase().includes(String(k).toLowerCase()));
    const wasPaused = !chatAutoScroll;
    const skipPausedScrollRestore = options.skipPausedScrollRestore === true;
    const savedScrollTop = wasPaused && !skipPausedScrollRestore ? messagesEl.scrollTop : 0;
    const rows = filtered
      .map((m) => {
        const platformId = m.platformId || '';
        const username = m.username || '?';
        const userKey = platformId + '::' + username;
        const mark = chatIdentityMap[userKey];
        const platMeta = CHAT_PLATFORMS.find((p) => p.id === platformId);
        const borderColor = CHAT_PLATFORM_COLORS[platformId] || 'var(--hud-border)';
        const isDonation = m.donationAmount != null && m.donationAmount !== '';
        const amountDisplay = isDonation ? formatDonationAmount(m.donationAmount, m.donationCurrency) : '';
        const donationClass = isDonation ? ' chat-msg-donation' : '';
        const highlightClass = mark?.highlight ? ' chat-msg-marked-highlight' : '';
        const kwHighlight = keywordHighlight(m.message || '') ? ' chat-msg-keyword-highlight' : '';
        const usernameStyle = mark?.chatColor ? ` style="color:${mark.chatColor}"` : '';
        const badgeHtml = mark?.badge ? `<span class="chat-user-badge">${escapeHtmlChat(mark.badge)}</span>` : '';
        const tagsHtml = (mark?.tags?.length) ? mark.tags.map((t) => `<span class="chat-user-tag">${escapeHtmlChat(t)}</span>`).join('') : '';
        const rawMessage = (m.message || '').replace(/<[^>]*>/g, '');
        let msgText = m.message || '';
        msgText = msgText.replace(/\[emote:\d+:([^\]]+)\]/gi, ':$1:');
        if (msgText.length > CHAT_MSG_DISPLAY_MAX) msgText = msgText.slice(0, CHAT_MSG_DISPLAY_MAX) + '…';
        if (chatFilterPlatformEmotes) {
          const blocklist = [...CHAT_PLATFORM_EMOTES_BUILTIN, ...chatPlatformEmoteBlocklist];
          msgText = filterMessagePlatformEmotes(msgText, blocklist);
        }
        const liteText = chatAutoScroll && recentlyLive;
        const emoteListOk = chatEmoteNames.length > 0 && chatEmoteNames.length <= 100;
        const rowCountOk = filtered.length <= 72;
        const textHtml =
          liteText || !emoteListOk || !rowCountOk
            ? escapeHtmlChat(msgText)
            : replaceEmotesInMessage(msgText, chatEmoteNames);
        const dataMsg =
          rawMessage.length > CHAT_DATA_MESSAGE_MAX ? rawMessage.slice(0, CHAT_DATA_MESSAGE_MAX) : rawMessage;
        const platDisplayName = m.platformName || platMeta?.name || '';
        const platLabelClass =
          chatPlatformLabelMode === 'icon' ? ' chat-platform-label-icon-only' : '';
        const platImgTitle =
          chatPlatformLabelMode === 'icon' && platDisplayName
            ? ` title="${escapeHtmlAttr(platDisplayName)}"`
            : '';
        const platNameSpan =
          chatPlatformLabelMode === 'icon'
            ? ''
            : `<span class="chat-platform-name">${escapeHtmlChat(platDisplayName)}</span>`;
        const avSrc = (m.avatarUrl || '').trim();
        const avatarHtml = avSrc
          ? `<img class="chat-user-avatar" src="${escapeHtmlAttr(avSrc)}" width="22" height="22" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`
          : '';
        return `<div class="chat-msg${donationClass}${highlightClass}${kwHighlight}" data-platform-id="${escapeHtmlChat(platformId)}" data-username="${escapeHtmlChat(username)}" data-platform-name="${escapeHtmlChat(m.platformName || '')}" data-channel-id="${escapeHtmlChat(m.channelId || '')}" data-avatar-url="${avSrc ? escapeHtmlAttr(avSrc) : ''}" data-message="${escapeHtmlChat(dataMsg)}" style="border-left-color:${borderColor}">
            <span class="chat-platform${platLabelClass}"><img class="chat-platform-img" src="${chatPlatformIconSrc(platformId)}" width="14" height="14" alt="" draggable="false" decoding="async"${platImgTitle} />${platNameSpan}</span>
            ${avatarHtml}
            <span class="chat-username" title="Right-click: user menu · elsewhere: pin message"${usernameStyle}>${escapeHtmlChat(username)}</span>${badgeHtml}${tagsHtml ? `<span class="chat-user-tags">${tagsHtml}</span>` : ''}
            ${amountDisplay ? `<span class="chat-donation-amount">${escapeHtmlChat(amountDisplay)}</span>` : ''}
            <span class="chat-text">${textHtml}</span>
          </div>`;
      })
      .join('');
    messagesEl.innerHTML = loadOlderHtml + renderCapNote + rows;
    const loadBtn = document.getElementById('chat-load-older-btn');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        const prevHeight = messagesEl.scrollHeight;
        const prevTop = messagesEl.scrollTop;
        chatShowFromIndex = Math.max(0, chatShowFromIndex - CHAT_SCROLLBACK_PAGE);
        renderChatMessages({ scrollToBottom: false, skipPausedScrollRestore: true });
        requestAnimationFrame(() => {
          if (!messagesEl) return;
          chatScrollProgrammaticRestore = true;
          const newHeight = messagesEl.scrollHeight;
          messagesEl.scrollTop = newHeight - prevHeight + prevTop;
          requestAnimationFrame(() => { chatScrollProgrammaticRestore = false; });
        });
      });
    }
    requestAnimationFrame(() => {
      if (!messagesEl) return;
      if (scrollToBottom) {
        chatScrollProgrammaticRestore = true;
        messagesEl.scrollTop = messagesEl.scrollHeight;
        requestAnimationFrame(() => { chatScrollProgrammaticRestore = false; });
      } else if (wasPaused && !skipPausedScrollRestore && savedScrollTop >= 0) {
        chatScrollProgrammaticRestore = true;
        messagesEl.scrollTop = savedScrollTop;
        requestAnimationFrame(() => { chatScrollProgrammaticRestore = false; });
      }
    });
    updateChatScrollLiveButton?.();
  }

  function updateChatPinnedBar() {
    const bar = document.getElementById('chat-pinned-bar');
    if (!bar) return;
    if (!chatPinnedMessage || !chatPinnedMessage.text) {
      bar.style.display = 'none';
      bar.innerHTML = '';
      return;
    }
    bar.style.display = 'flex';
    const who = chatPinnedMessage.username ? ` — ${escapeHtmlChat(chatPinnedMessage.username)}` : '';
    bar.innerHTML = `<span style="flex:1;word-break:break-word;">📌 ${escapeHtmlChat(chatPinnedMessage.text)}${who}</span><button type="button" class="hud-btn" id="chat-pinned-clear" style="font-size:10px;">Clear</button>`;
    bar.querySelector('#chat-pinned-clear')?.addEventListener('click', async () => {
      chatPinnedMessage = null;
      await window.goonAPI?.chatSetPinnedMessage?.(null);
      updateChatPinnedBar();
    });
  }

  async function updateChatTrollBar() {
    const bar = document.getElementById('chat-troll-bar');
    if (!bar) return;
    const troll = await window.goonAPI?.chatGetEmbedTroll?.();
    if (!troll || (!troll.description && !troll.url)) {
      bar.style.display = 'none';
      bar.innerHTML = '';
      return;
    }
    bar.style.display = 'flex';
    const desc = troll.description ? escapeHtmlChat(troll.description) : '';
    const url = (troll.url || '').trim();
    const linkHtml = url
      ? `<a href="#" id="chat-troll-link" data-href="${escapeHtmlChat(url)}" style="color:var(--hud-accent);text-decoration:underline;word-break:break-all;">${escapeHtmlChat(url)}</a>`
      : '';
    bar.innerHTML = `<span style="flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;word-break:break-word;"><span aria-hidden="true">🎣</span>${desc ? `<span>${desc}</span>` : ''}${linkHtml}</span><div style="display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0;align-items:center;"><button type="button" class="hud-btn" id="chat-troll-success" style="font-size:10px;padding:4px 8px;">Successful</button><button type="button" class="hud-btn" id="chat-troll-fail" style="font-size:10px;padding:4px 8px;">Failed</button></div>`;
    bar.querySelector('#chat-troll-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      const href = e.currentTarget.getAttribute('data-href');
      if (href) window.goonAPI?.openExternal?.(href);
    });
    async function finishTrollWithOutcome(outcome) {
      const t = await window.goonAPI?.chatGetEmbedTroll?.();
      if (!t || (!t.description && !t.url)) return;
      await window.goonAPI?.chatAppendTrollHistory?.({
        description: t.description || '',
        url: t.url || '',
        outcome
      });
      await window.goonAPI?.chatClearEmbedTroll?.();
      updateChatTrollBar();
      window.goonAPI?.showToast?.(outcome === 'success' ? 'Logged: successful' : 'Logged: failed');
    }
    bar.querySelector('#chat-troll-success')?.addEventListener('click', () => finishTrollWithOutcome('success'));
    bar.querySelector('#chat-troll-fail')?.addEventListener('click', () => finishTrollWithOutcome('failed'));
  }

  function formatPollTimeLeft(ms) {
    if (ms <= 0) return '0:00';
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }
  async function updateChatPollBar() {
    const bar = document.getElementById('chat-poll-bar');
    if (!bar) return;
    const poll = await window.goonAPI?.chatGetEmbedPoll?.() || null;
    if (!poll || !poll.question || !Array.isArray(poll.options) || poll.options.length === 0) {
      bar.style.display = 'none';
      bar.innerHTML = '';
      return;
    }
    const totalVotes = poll.options.reduce((s, o) => s + (o.votes || 0), 0);
    const voted = totalVotes;
    const abstained = 0;
    const maxV = Math.max(1, ...poll.options.map((o) => o.votes || 0));
    const endAt = typeof poll.endAt === 'number' ? poll.endAt : 0;
    const now = Date.now();
    const timeLeft = endAt > now ? endAt - now : 0;
    const timeLeftStr = timeLeft > 0 ? formatPollTimeLeft(timeLeft) + ' left' : 'Ended';
    const barsHtml = poll.options
      .map((o) => {
        const v = o.votes || 0;
        const pct = totalVotes > 0 ? Math.round(100 * v / totalVotes) : 0;
        const w = maxV > 0 ? Math.round(100 * v / maxV) : 0;
        return `<div style="margin-bottom:4px;"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:2px;"><span>${escapeHtmlChat(o.text)}</span><span style="opacity:0.9;">${v} (${pct}%)</span></div><div style="height:8px;background:var(--hud-bg);border-radius:4px;overflow:hidden;"><div style="width:${w}%;height:100%;background:var(--hud-accent);border-radius:4px;transition:width 0.2s;"></div></div></div>`;
      })
      .join('');
    bar.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
        <div style="font-weight:600;">📊 ${escapeHtmlChat(poll.question)}</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;">
          <span style="opacity:0.9;" id="chat-poll-timer">${timeLeftStr}</span>
          <button type="button" class="hud-btn" id="chat-end-poll-btn" style="font-size:10px;padding:4px 8px;">End poll</button>
        </div>
      </div>
      ${barsHtml}
      <div style="font-size:10px;opacity:0.85;margin-top:6px;">${voted} voted${abstained ? ` · ${abstained} abstained` : ''}</div>
    `;
    bar.style.display = 'block';
    const endBtn = document.getElementById('chat-end-poll-btn');
    endBtn?.addEventListener('click', async () => {
      await window.goonAPI?.chatClearEmbedPoll?.();
      updateChatPollBar();
    });
  }

  // -------- Viewers dropdown --------
  let chatViewersLastCounts = null;
  let chatViewersLastUpdatedAt = 0;
  let chatViewersDropdownEl = null;
  let chatViewersDropdownOpen = false;
  let chatEmbedEnabled = true;

  function formatTimeAsLocal(ts) {
    if (!Number.isFinite(ts) || ts <= 0) return '—';
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function buildViewerUrl(platformId, channelRaw) {
    const channel = String(channelRaw || '').trim();
    const safePid = String(platformId || '').toLowerCase();
    if (safePid === 'youtube') {
      if (!channel) return 'https://www.youtube.com/@podawfulH2BH/live';
      if (channel.startsWith('@')) return `https://www.youtube.com/${channel}/live`;
      if (/^[a-zA-Z0-9_-]{11}$/.test(channel)) {
        const v = encodeURIComponent(channel);
        return `https://www.youtube.com/live_chat?is_popout=1&v=${v}&embed_domain=${encodeURIComponent('https://www.youtube.com')}`;
      }
      return `https://www.youtube.com/@${channel}/live`;
    }
    if (safePid === 'rumble') {
      if (!channel) return 'https://rumble.com/c/PODAWFUL';
      if (channel.startsWith('v:')) return `https://rumble.com/v/${encodeURIComponent(channel.slice(2))}`;
      return `https://rumble.com/c/${encodeURIComponent(channel)}`;
    }
    if (safePid === 'dlive') {
      const n = channel.replace(/^@/, '').trim() || 'podawful';
      return `https://dlive.tv/${encodeURIComponent(n)}`;
    }
    if (safePid === 'podawful') return 'https://podawful.com/live';
    if (safePid === 'kick') {
      const slug = channel || 'podawful';
      return `https://kick.com/${encodeURIComponent(slug)}`;
    }
    if (safePid === 'odysee') {
      const ch = channel.replace(/^@/, '') || 'podawful:8';
      return `https://odysee.com/@${encodeURIComponent(ch)}/live`;
    }
    if (safePid === 'twitch') {
      const lg = channel.replace(/^#/, '').toLowerCase().trim() || 'podawful';
      return `https://www.twitch.tv/${encodeURIComponent(lg)}`;
    }
    if (safePid === 'discord') {
      // We store as: discord:<guildId>/<channelId> (channel part may include both).
      const parts = channel.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const guildId = parts[0];
        const chId = parts[1];
        return `https://discord.com/channels/${encodeURIComponent(guildId)}/${encodeURIComponent(chId)}`;
      }
      // Fallback: if only channelId is provided, we can't build the canonical URL.
      return null;
    }
    return null;
  }

  function getViewersPlatformsInUse() {
    const by = new Map(); // platformId -> { platformId, name, channels: [] }
    for (const streamKey of chatAddedStreams) {
      if (typeof streamKey !== 'string') continue;
      if (streamKey.startsWith('other:')) continue;
      const colon = streamKey.indexOf(':');
      const pid = colon >= 0 ? streamKey.slice(0, colon) : streamKey;
      const channel = colon >= 0 ? streamKey.slice(colon + 1) : '';
      const p = CHAT_PLATFORMS.find((x) => x.id === pid);
      if (!p) continue;
      if (!by.has(pid)) by.set(pid, { platformId: pid, name: p.name, channels: [] });
      if (channel) by.get(pid).channels.push(channel);
    }
    if (chatEmbedEnabled) {
      by.set('embed', { platformId: 'embed', name: 'Website', channels: [] });
    }
    return by;
  }

  function ensureChatViewersDropdown() {
    if (chatViewersDropdownEl) return chatViewersDropdownEl;
    chatViewersDropdownEl = document.createElement('div');
    chatViewersDropdownEl.id = 'chat-viewers-dropdown';
    chatViewersDropdownEl.className = 'chat-viewers-dropdown';
    document.body.appendChild(chatViewersDropdownEl);
    return chatViewersDropdownEl;
  }

  function closeChatViewersDropdown() {
    chatViewersDropdownOpen = false;
    if (chatViewersDropdownEl) {
      try { chatViewersDropdownEl.remove(); } catch (_) {}
    }
    chatViewersDropdownEl = null;
  }

  function renderChatViewersDropdown() {
    const el = ensureChatViewersDropdown();
    const counts = chatViewersLastCounts || {};
    const asOf = formatTimeAsLocal(chatViewersLastUpdatedAt);
    const inUse = getViewersPlatformsInUse();

    const platRows = [...inUse.values()]
      .map((row) => {
        const pid = row.platformId;
        const count = typeof counts[pid] === 'number' ? counts[pid] : 0;
        const countStr = count > 0 ? count.toLocaleString() : '0';

        if (pid === 'embed') {
          return `
            <div class="row">
              <div class="left">
                <div class="plat">${escapeHtmlChat(row.name)}</div>
                <div class="count">${countStr} viewers</div>
                <div class="links">
                  <a href="https://podawful.com/live" class="url-chip" data-url="https://podawful.com/live" target="_blank" rel="noopener noreferrer">
                    <span class="ext">Open</span> podawful.com/live
                  </a>
                </div>
                <div class="sub" style="margin-top:6px;">As of ${escapeHtmlChat(asOf)}</div>
              </div>
            </div>`;
        }

        const urlSet = new Set();
        const urls = (row.channels || []).filter(Boolean).map((ch) => buildViewerUrl(pid, ch)).filter(Boolean);
        urls.forEach((u) => urlSet.add(u));
        if (!urlSet.size) {
          const u = buildViewerUrl(pid, '');
          if (u) urlSet.add(u);
        }
        const linksHtml = [...urlSet].slice(0, 6).map((u) => {
          const short = u.length > 32 ? u.slice(0, 29) + '…' : u;
          return `<a href="${escapeHtmlAttr(u)}" class="url-chip" data-url="${escapeHtmlAttr(u)}" target="_blank" rel="noopener noreferrer">
            <span class="ext">Open</span> ${escapeHtmlChat(short)}
          </a>`;
        });

        return `
          <div class="row">
            <div class="left">
              <div class="plat">${escapeHtmlChat(row.name)}</div>
              <div class="count">${countStr} viewers</div>
              <div class="links">${linksHtml.join('')}</div>
              <div class="sub" style="margin-top:6px;">As of ${escapeHtmlChat(asOf)}</div>
            </div>
          </div>`;
      })
      .join('');

    el.innerHTML = `
      <div class="hdr">
        <div>Viewer breakdown</div>
        <div class="sub">As of ${escapeHtmlChat(asOf)}</div>
      </div>
      <div>${platRows || '<div style="opacity:0.7;padding:6px 0;">No active platforms.</div>'}</div>
      <div style="margin-top:10px;opacity:0.75;font-size:11px;">
        Numbers update periodically. Click a URL to open the platform.
      </div>
    `;

    el.querySelectorAll('a[data-url]').forEach((a) => {
      a.addEventListener('click', (ev) => {
        // Use our open handler if present; keeps behavior consistent across environments.
        try {
          const url = a.getAttribute('data-url');
          if (!url) return;
          if (window.goonAPI?.openExternal) {
            ev.preventDefault();
            window.goonAPI.openExternal(url);
          }
        } catch (_) {}
      });
    });
  }

  function toggleChatViewersDropdown() {
    const btn = document.getElementById('chat-viewers-btn');
    if (!btn) return;
    if (chatViewersDropdownOpen) {
      closeChatViewersDropdown();
      return;
    }
    chatViewersDropdownOpen = true;
    renderChatViewersDropdown();

    const rect = btn.getBoundingClientRect();
    const el = chatViewersDropdownEl;
    if (el) {
      const margin = 10;
      const desiredTop = rect.bottom + margin;
      const desiredLeft = rect.left;
      const maxLeft = window.innerWidth - el.offsetWidth - margin;
      el.style.top = Math.min(window.innerHeight - 20, desiredTop) + 'px';
      el.style.left = Math.max(margin, Math.min(desiredLeft, maxLeft)) + 'px';
    }
  }

  function refreshViewersButton() {
    const btn = document.getElementById('chat-viewers-btn');
    if (!btn) return;
    window.goonAPI?.chatGetViewerCounts?.().then((c) => {
      if (!c) return;
      chatViewersLastCounts = c;
      chatViewersLastUpdatedAt = Date.now();
      const total =
        typeof c.total === 'number'
          ? c.total
          : (c.twitch || 0) +
            (c.kick || 0) +
            (c.youtube || 0) +
            (c.rumble || 0) +
            (c.podawful || 0) +
            (c.odysee || 0) +
            (c.dlive || 0) +
            (c.embed || 0);
      btn.textContent = 'Viewers: ' + (total > 0 ? total.toLocaleString() : '0');
      btn.title =
        [
          c.twitch > 0 && `Twitch: ${c.twitch}`,
          c.kick > 0 && `Kick: ${c.kick}`,
          c.youtube > 0 && `YouTube: ${c.youtube}`,
          c.rumble > 0 && `Rumble: ${c.rumble}`,
          c.podawful > 0 && `Pod Awful: ${c.podawful}`,
          c.odysee > 0 && `Odysee: ${c.odysee}`,
          c.dlive > 0 && `DLive: ${c.dlive}`,
          c.embed > 0 && `Website: ${c.embed}`
        ]
          .filter(Boolean)
          .join(' · ') || 'Total viewers across all platforms';

      if (chatViewersDropdownOpen) {
        renderChatViewersDropdown();
      }
    }).catch(() => {});
  }

  function renderAddedStreams() {
    if (!addedStreamsEl) return;
    const added = [...chatAddedStreams];
    if (added.length === 0) {
      addedStreamsEl.innerHTML = '';
      return;
    }
    addedStreamsEl.innerHTML = added
      .map((id) => {
        if (id.startsWith('other:')) {
          const raw = id.slice(6);
          const label = escapeHtmlChat(raw);
          const chipText =
            chatPlatformLabelMode === 'icon' ? label : `Other: ${label}`;
          const tip = escapeHtmlAttr(`Other: ${raw}`);
          return `<span class="chat-stream-chip" data-id="${escapeHtmlChat(id)}" title="${tip}">
            <img class="chat-stream-chip-icon" src="${chatPlatformIconSrc('other')}" width="14" height="14" alt="" draggable="false" decoding="async" />
            ${chipText}
            <span class="remove" data-id="${escapeHtmlChat(id)}" title="Remove from chat">×</span>
          </span>`;
        }
        const colon = id.indexOf(':');
        const platformId = colon >= 0 ? id.slice(0, colon) : id;
        const channel = colon >= 0 ? id.slice(colon + 1) : '';
        const p = CHAT_PLATFORMS.find((x) => x.id === platformId);
        if (!p) return '';
        const displayChannel =
          platformId === 'discord'
            ? (channel.split('/').filter(Boolean).slice(-1)[0] || channel)
            : channel;
        const fullLabel = displayChannel ? `${p.name} – ${displayChannel}` : p.name;
        const chipText =
          chatPlatformLabelMode === 'icon'
            ? escapeHtmlChat(displayChannel || p.name)
            : channel
              ? escapeHtmlChat(p.name) + ' – ' + escapeHtmlChat(displayChannel)
              : escapeHtmlChat(p.name);
        return `<span class="chat-stream-chip" data-id="${escapeHtmlChat(id)}" title="${escapeHtmlAttr(fullLabel)}">
          <img class="chat-stream-chip-icon" src="${chatPlatformIconSrc(platformId)}" width="14" height="14" alt="" draggable="false" decoding="async" />
          ${chipText}
          <span class="remove" data-id="${escapeHtmlChat(id)}" title="Remove from chat">×</span>
        </span>`;
      })
      .join('');
    addedStreamsEl.querySelectorAll('.remove').forEach((el) => {
      el.addEventListener('click', () => {
        chatAddedStreams.delete(el.getAttribute('data-id'));
        persistAddedStreams();
        renderAddedStreams();
      });
    });
  }

  document.getElementById('chat-help-youtube-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.goonAPI.openExternal?.('https://console.cloud.google.com/apis/credentials');
  });

  function showUserHistoryModal(platformId, platformName, username) {
    const overlay = document.createElement('div');
    overlay.id = 'chat-user-history-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:480px;width:100%;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-shrink:0;">
          <h3 style="margin:0;font-size:14px;">Chat history: ${escapeHtmlChat(username)} (${escapeHtmlChat(platformName || '')})</h3>
          <button type="button" class="hud-btn" id="chat-user-history-close" style="padding:4px 10px;">Close</button>
        </div>
        <div id="chat-user-history-list" style="flex:1;overflow-y:auto;font-family:var(--hud-font-mono);font-size:12px;padding:8px;background:var(--hud-bg);border:1px solid var(--hud-border);border-radius:4px;"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const listEl = document.getElementById('chat-user-history-list');
    const closeBtn = document.getElementById('chat-user-history-close');
    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
    window.goonAPI.chatGetUserHistory?.(platformId, username).then((history) => {
      if (!listEl) return;
      const sorted = (history || []).slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      if (sorted.length === 0) {
        listEl.innerHTML = '<div style="opacity:0.6;">No saved history for this user yet.</div>';
        return;
      }
      listEl.innerHTML = sorted
        .map((h) => {
          const t = h.timestamp ? new Date(h.timestamp) : null;
          const timeStr = t ? t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
          const platformLabel = escapeHtmlChat(platformName || platformId || '');
          return `<div style="padding:4px 0;border-bottom:1px solid var(--hud-border);"><span style="opacity:0.7;font-size:10px;margin-right:6px;">[${platformLabel}]</span><span style="opacity:0.7;font-size:10px;margin-right:8px;">${escapeHtmlChat(timeStr)}</span>${escapeHtmlChat(h.message || '')}</div>`;
        })
        .join('');
    });
  }

  function showModerationHistoryListModal(platformId, platformName, username) {
    window.goonAPI.chatGetModerationHistory?.(platformId, username).then((entries) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1002;display:flex;align-items:center;justify-content:center;padding:20px;';
      const list = Array.isArray(entries) ? entries : [];
      const rows = list.length
        ? list
            .map((e) => {
              const t = e.timestamp ? new Date(e.timestamp) : null;
              const timeStr = t ? t.toLocaleString() : '';
              const dur = e.action === 'timeout' && e.durationSeconds != null ? ` · ${e.durationSeconds}s` : '';
              const reason = (e.reason || '').trim() ? ` — ${escapeHtmlChat(e.reason)}` : '';
              const status = e.success === false ? `<span style="color:#f66;">Failed</span> ${escapeHtmlChat(e.error || '')}` : '<span style="color:#8f8;">OK</span>';
              return `<div style="padding:8px 0;border-bottom:1px solid var(--hud-border);font-size:12px;"><strong>${escapeHtmlChat(e.action || '')}</strong> · ${escapeHtmlChat(timeStr)}${dur} · ${status}${reason}</div>`;
            })
            .join('')
        : '<div style="opacity:0.7;padding:12px;">No recorded timeouts or bans for this user on this platform yet.</div>';
      overlay.innerHTML = `
        <div class="hud-panel" style="max-width:480px;width:100%;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;">
            <h3 style="margin:0;font-size:14px;">Timeouts & bans — ${escapeHtmlChat(username)}</h3>
            <button type="button" class="hud-btn" id="mod-history-close" style="padding:4px 10px;">Close</button>
          </div>
          <p style="margin:0 0 8px 0;font-size:11px;opacity:0.85;">${escapeHtmlChat(platformName || platformId || '')} · newest first</p>
          <div style="flex:1;overflow-y:auto;font-family:var(--hud-font-mono);font-size:11px;">${rows}</div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#mod-history-close')?.addEventListener('click', () => overlay.remove());
    });
  }

  function showTimeoutReasonModal(platformId, platformName, username, opts) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1002;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:400px;width:100%;display:flex;flex-direction:column;gap:10px;">
        <h3 style="margin:0;font-size:14px;">Timeout ${escapeHtmlChat(username)}</h3>
        <label style="font-size:11px;opacity:0.9;">Duration (seconds)</label>
        <input type="number" id="mod-timeout-dur" value="300" min="1" max="1209600" style="padding:8px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
        <label style="font-size:11px;opacity:0.9;">Reason (optional — sent to Twitch/Kick)</label>
        <textarea id="mod-timeout-reason" rows="3" placeholder="e.g. spam, harassment…" style="padding:8px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;resize:vertical;"></textarea>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">
          <button type="button" class="hud-btn" id="mod-timeout-cancel">Cancel</button>
          <button type="button" class="hud-btn" id="mod-timeout-apply">Apply timeout</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#mod-timeout-cancel')?.addEventListener('click', close);
    overlay.querySelector('#mod-timeout-apply')?.addEventListener('click', () => {
      const sec = parseInt(overlay.querySelector('#mod-timeout-dur')?.value, 10);
      const reason = (overlay.querySelector('#mod-timeout-reason')?.value || '').trim();
      if (!Number.isFinite(sec) || sec < 1) { window.goonAPI?.showToast?.('Invalid duration'); return; }
      const nextOpts = { ...(opts || {}), ...(reason ? { reason } : {}) };
      window.goonAPI.chatTimeoutUser?.(platformId, username, sec, nextOpts).then((r) => {
        window.goonAPI?.showToast?.(r?.ok ? 'Timeout applied' : (r?.error || 'Failed'));
        close();
      });
    });
  }

  function showBanReasonModal(platformId, platformName, username, opts) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1002;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:400px;width:100%;display:flex;flex-direction:column;gap:10px;">
        <h3 style="margin:0;font-size:14px;">Ban ${escapeHtmlChat(username)}</h3>
        <p style="margin:0;font-size:11px;opacity:0.85;">This is permanent on most platforms. Reason is optional but recommended.</p>
        <label style="font-size:11px;opacity:0.9;">Reason (optional — sent to Twitch/Kick)</label>
        <textarea id="mod-ban-reason" rows="3" placeholder="e.g. ToS violation…" style="padding:8px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;resize:vertical;"></textarea>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">
          <button type="button" class="hud-btn" id="mod-ban-cancel">Cancel</button>
          <button type="button" class="hud-btn" id="mod-ban-apply">Ban user</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#mod-ban-cancel')?.addEventListener('click', close);
    overlay.querySelector('#mod-ban-apply')?.addEventListener('click', () => {
      const reason = (overlay.querySelector('#mod-ban-reason')?.value || '').trim();
      const nextOpts = { ...(opts || {}), ...(reason ? { reason } : {}) };
      window.goonAPI.chatBanUser?.(platformId, username, nextOpts).then((r) => {
        window.goonAPI?.showToast?.(r?.ok ? 'User banned' : (r?.error || 'Failed'));
        close();
      });
    });
  }

  function findLatestChatAvatarUrl(forPlatformId, forUsername) {
    const pid = forPlatformId || '';
    const un = forUsername || '';
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const m = chatMessages[i];
      if (!m) continue;
      const mid = m.platformId || m.platform || '';
      const mu = m.username || '';
      if (mid === pid && mu === un) {
        const u = (m.avatarUrl || '').trim();
        if (u) return u;
      }
    }
    return '';
  }

  async function showUserInfoModal(platformId, platformName, username, opts) {
    const modOpts = opts && typeof opts === 'object' ? { ...opts } : {};
    const avatarFromOpts = (modOpts.avatarUrl || '').trim();
    delete modOpts.avatarUrl;
    const moderationOpts = Object.keys(modOpts).length ? modOpts : undefined;

    const identityId = await window.goonAPI.chatEnsureIdentity?.(platformId, username);
    const [identity, linked, history, donationData, modHistory] = await Promise.all([
      window.goonAPI.chatGetIdentity?.(identityId),
      window.goonAPI.chatGetLinkedAccounts?.(identityId),
      window.goonAPI.chatGetUserHistory?.(platformId, username),
      window.goonAPI.chatGetDonationsForUser?.(platformId, username),
      window.goonAPI.chatGetModerationHistory?.(platformId, username)
    ]);
    const markedName = identity?.displayName?.trim() || username;
    const linkedLine = (linked || []).length ? (linked || []).map((a) => `${a.platformId}/${a.username}`).join(', ') : '—';
    const historySeen = new Set();
    const historyDeduped = (history || []).filter((h) => {
      const key = (h.timestamp || 0) + '\n' + (h.message || '');
      if (historySeen.has(key)) return false;
      historySeen.add(key);
      return true;
    });
    const totalChats = historyDeduped.length;
    const totals = donationData?.totalByCurrency || {};
    const totalDonations = Object.entries(totals).length
      ? Object.entries(totals).map(([c, n]) => formatDonationForDisplay(n, c)).join(' + ')
      : '—';
    const mh = Array.isArray(modHistory) ? modHistory : [];
    const nTimeouts = mh.filter((e) => e && e.action === 'timeout' && e.success !== false).length;
    const nBans = mh.filter((e) => e && e.action === 'ban' && e.success !== false).length;
    const nUnbans = mh.filter((e) => e && e.action === 'unban' && e.success !== false).length;
    const supportsModeration = MODERATION_PLATFORMS.includes(platformId);
    const hasAuth = supportsModeration ? await window.goonAPI.chatHasPlatformAuth?.(platformId) : false;

    const overlay = document.createElement('div');
    overlay.id = 'chat-user-info-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:640px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-shrink:0;">
          <div style="display:flex;gap:16px;align-items:flex-start;flex:1;min-width:0;">
            <div class="chat-user-info-avatar" style="width:64px;height:64px;border-radius:12px;background:var(--hud-surface);border:1px solid var(--hud-border);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;"></div>
            <div style="flex:1;min-width:0;">
              <div style="margin-bottom:4px;"><span style="opacity:0.8;font-size:11px;">Username:</span> <strong>${escapeHtmlChat(username)}</strong></div>
              <div><span style="opacity:0.8;font-size:11px;">Marked username:</span> ${escapeHtmlChat(markedName)}</div>
            </div>
          </div>
          <button type="button" class="hud-btn" id="chat-user-info-close" style="padding:4px 10px;">Close</button>
        </div>
        <div style="flex:1;min-height:0;display:flex;flex-direction:row;gap:16px;overflow:hidden;">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;">
            <div style="flex-shrink:0;padding:12px;background:var(--hud-bg);border:1px solid var(--hud-border);border-radius:6px;margin-bottom:12px;font-size:12px;">
              <div style="margin-bottom:4px;"><span style="opacity:0.8;">Current Platform:</span> ${escapeHtmlChat(platformName || '')}</div>
              <div style="margin-bottom:4px;"><span style="opacity:0.8;">Alias:</span> ${escapeHtmlChat(linkedLine)}</div>
              <div style="margin-bottom:4px;"><span style="opacity:0.8;">Total Chats:</span> ${totalChats}</div>
              <div style="margin-bottom:4px;"><span style="opacity:0.8;">Total Donations:</span> ${escapeHtmlChat(totalDonations)}</div>
              <div style="margin-bottom:4px;"><span style="opacity:0.8;">Total timeouts (recorded):</span> ${nTimeouts}</div>
              <div style="margin-bottom:4px;"><span style="opacity:0.8;">Total bans (recorded):</span> ${nBans}</div>
              <div><span style="opacity:0.8;">Total unbans (recorded):</span> ${nUnbans}</div>
            </div>
            <div style="flex:1;min-height:0;display:flex;flex-direction:column;">
              <div style="font-size:11px;opacity:0.9;margin-bottom:6px;">Chat history</div>
              <div id="chat-user-info-history" style="flex:1;overflow-y:auto;font-family:var(--hud-font-mono);font-size:11px;padding:8px;background:var(--hud-bg);border:1px solid var(--hud-border);border-radius:4px;"></div>
            </div>
          </div>
          <div id="chat-user-info-actions" style="flex-shrink:0;display:flex;flex-direction:column;gap:6px;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const avatarWrap = overlay.querySelector('.chat-user-info-avatar');
    const resolvedAvatar = (avatarFromOpts || findLatestChatAvatarUrl(platformId, username) || '').trim();
    if (avatarWrap) {
      if (resolvedAvatar) {
        avatarWrap.innerHTML = `<img src="${escapeHtmlAttr(resolvedAvatar)}" alt="" width="64" height="64" style="width:64px;height:64px;object-fit:cover;display:block;border:0;" loading="eager" decoding="async" referrerpolicy="no-referrer" />`;
      }
    }

    const historyEl = overlay.querySelector('#chat-user-info-history');
    const sorted = historyDeduped.slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    if (sorted.length === 0) {
      historyEl.innerHTML = '<div style="opacity:0.6;">No chat history for this user yet.</div>';
    } else {
      historyEl.innerHTML = sorted
        .map((h) => {
          const t = h.timestamp ? new Date(h.timestamp) : null;
          const timeStr = t ? t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
          const platformLabel = escapeHtmlChat(platformName || platformId || '');
          return `<div style="padding:4px 0;border-bottom:1px solid var(--hud-border);"><span style="opacity:0.7;font-size:10px;margin-right:6px;">[${platformLabel}]</span><span style="opacity:0.7;font-size:10px;margin-right:8px;">${escapeHtmlChat(timeStr)}</span>${escapeHtmlChat(h.message || '')}</div>`;
        })
        .join('');
    }

    const actionsEl = overlay.querySelector('#chat-user-info-actions');
    const addBtn = (label, fn, disabled) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hud-btn';
      btn.style.cssText = 'font-size:11px;';
      btn.textContent = label;
      if (disabled) btn.disabled = true;
      else btn.addEventListener('click', fn);
      actionsEl.appendChild(btn);
    };
    addBtn('View donation history', () => { overlay.remove(); showDonationHistoryModal(platformId, platformName, username); });
    addBtn('Send DM', () => { overlay.remove(); showDmModal(platformId, platformName, username); });
    addBtn('Mark user…', () => { overlay.remove(); showMarkUserModal(platformId, platformName, username); });
    addBtn('Timeouts & bans log', () => showModerationHistoryListModal(platformId, platformName, username));
    addBtn('Timeout…', () => showTimeoutReasonModal(platformId, platformName, username, moderationOpts), !supportsModeration || !hasAuth);
    addBtn('Ban…', () => showBanReasonModal(platformId, platformName, username, moderationOpts), !supportsModeration || !hasAuth);
    addBtn('Unban', () => {
      if (!confirm(`Unban ${username} on ${platformName}?`)) return;
      window.goonAPI.chatUnbanUser?.(platformId, username, moderationOpts).then((r) => {
        window.goonAPI?.showToast?.(r?.ok ? 'User unbanned' : (r?.error || 'Failed'));
      });
    }, !supportsModeration || !hasAuth);
    addBtn('Add as mod', () => {
      window.goonAPI.chatAddMod?.(platformId, username).then((r) => {
        window.goonAPI?.showToast?.(r?.ok ? 'Mod added' : (r?.error || 'Failed'));
      });
    }, !supportsModeration || !hasAuth);
    addBtn('Vote to timeout (10m)', () => startVotebanPoll(platformId, platformName, username, 'timeout', 600, moderationOpts), !supportsModeration || !hasAuth);
    addBtn('Vote to ban', () => startVotebanPoll(platformId, platformName, username, 'ban', null, moderationOpts), !supportsModeration || !hasAuth);
    addBtn('Vote to unban', () => startVotebanPoll(platformId, platformName, username, 'unban', null, moderationOpts), !supportsModeration || !hasAuth);

    overlay.querySelector('#chat-user-info-close').addEventListener('click', () => overlay.remove());
    // Do not close on overlay click — user can interact with modal and use features until they click Close
  }

  function formatDonationForDisplay(amount, currency) {
    if (currency === 'bits') return `${Math.floor(Number(amount))} bits`;
    if (currency === 'USD' || currency === 'usd') return `$${Number(amount).toFixed(2)}`;
    return `${Number(amount).toFixed(2)} ${currency || 'USD'}`;
  }

  async function showDonationHistoryModal(platformId, platformName, username) {
    const data = await window.goonAPI.chatGetDonationsForUser?.(platformId, username);
    const overlay = document.createElement('div');
    overlay.id = 'chat-donation-history-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1001;display:flex;align-items:center;justify-content:center;padding:20px;';
    const totals = data?.totalByCurrency || {};
    const totalLine = Object.entries(totals).length
      ? Object.entries(totals).map(([c, n]) => formatDonationForDisplay(n, c)).join(' + ')
      : '—';
    const breakdown = (data?.donations || []).slice(0, 200).map((d) => {
      const t = d.timestamp ? new Date(d.timestamp) : null;
      const timeStr = t ? t.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '';
      return `<tr><td style="padding:4px 8px;font-size:11px;">${escapeHtmlChat(d.platformId)}</td><td style="padding:4px 8px;">${escapeHtmlChat(formatDonationForDisplay(d.amount, d.currency))}</td><td style="padding:4px 8px;opacity:0.8;font-size:11px;">${escapeHtmlChat(timeStr)}</td></tr>`;
    }).join('');
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:560px;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-shrink:0;">
          <h3 style="margin:0;font-size:14px;">Donation history: ${escapeHtmlChat(username)} (${escapeHtmlChat(platformName || '')})</h3>
          <button type="button" class="hud-btn" id="chat-donation-history-close" style="padding:4px 10px;">Close</button>
        </div>
        <p style="margin:0 0 12px 0;font-size:13px;"><strong>Total donated:</strong> ${escapeHtmlChat(totalLine)}</p>
        <div style="flex:1;overflow-y:auto;font-size:12px;">
          <table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--hud-border);">Platform</th><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--hud-border);">Amount</th><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--hud-border);">When</th></tr></thead><tbody>${breakdown || '<tr><td colspan="3" style="padding:12px;opacity:0.6;">No donations recorded yet.</td></tr>'}</tbody></table>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('chat-donation-history-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
  }

  async function showMarkUserModal(platformId, platformName, username) {
    const identityId = await window.goonAPI.chatEnsureIdentity?.(platformId, username);
    let identity = await window.goonAPI.chatGetIdentity?.(identityId);
    const linked = (await window.goonAPI.chatGetLinkedAccounts?.(identityId)) || [];
    const overlay = document.createElement('div');
    overlay.id = 'chat-mark-user-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1001;display:flex;align-items:center;justify-content:center;padding:20px;';
    const tagsList = (identity?.tags || []).map((t) => `<span class="chat-mark-tag" data-tag="${escapeHtmlChat(t)}">${escapeHtmlChat(t)} <button type="button" class="chat-mark-tag-remove">×</button></span>`).join('');
    const linkedList = linked.map((a) => {
      const isCurrent = a.platformId === platformId && a.username === username;
      return `<span class="chat-mark-linked">${escapeHtmlChat(a.platformId)} / ${escapeHtmlChat(a.username)}${isCurrent ? ' (current)' : ''} ${isCurrent ? '' : `<button type="button" class="chat-mark-unlink" data-pid="${escapeHtmlChat(a.platformId)}" data-user="${escapeHtmlChat(a.username)}">Unlink</button>`}</span>`;
    }).join('');
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:480px;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-shrink:0;">
          <h3 style="margin:0;font-size:14px;">Mark user: ${escapeHtmlChat(username)} (${escapeHtmlChat(platformName || '')})</h3>
          <button type="button" class="hud-btn" id="chat-mark-user-close" style="padding:4px 10px;">Close</button>
        </div>
        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="font-size:11px;opacity:0.9;">Custom tags</label>
            <div id="chat-mark-tags-list" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${tagsList}</div>
            <div style="display:flex;gap:8px;margin-top:6px;">
              <input type="text" id="chat-mark-tag-input" placeholder="Add tag" style="flex:1;padding:6px 10px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;" />
              <button type="button" class="hud-btn" id="chat-mark-tag-add">Add</button>
            </div>
          </div>
          <div>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="chat-mark-highlight" ${identity?.highlight ? 'checked' : ''} /> Highlight this user in chat</label>
          </div>
          <div>
            <label style="font-size:11px;opacity:0.9;">Badge / role (e.g. SUB, MOD, VIP)</label>
            <input type="text" id="chat-mark-badge" value="${escapeHtmlChat(identity?.badge || '')}" placeholder="Optional" style="width:100%;max-width:120px;margin-top:4px;padding:6px 10px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;" />
          </div>
          <div>
            <label style="font-size:11px;opacity:0.9;">Chat color for username</label>
            <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
              <input type="color" id="chat-mark-color" value="${escapeHtmlChat((identity?.chatColor || '#00ff41').slice(0, 7))}" style="width:40px;height:28px;padding:0;border:none;cursor:pointer;" />
              <input type="text" id="chat-mark-color-hex" value="${escapeHtmlChat(identity?.chatColor || '#00ff41')}" placeholder="#hex" style="width:80px;padding:4px 8px;font-size:12px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
            </div>
          </div>
          <div>
            <label style="font-size:11px;opacity:0.9;">Linked accounts (same person)</label>
            <div id="chat-mark-linked-list" style="margin-top:4px;display:flex;flex-direction:column;gap:4px;">${linkedList || '<span style="opacity:0.6;font-size:11px;">No other accounts linked.</span>'}</div>
            <div style="display:flex;gap:8px;margin-top:6px;">
              <select id="chat-mark-link-platform" style="padding:4px 8px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;">
                ${CHAT_PLATFORMS.map((p) => `<option value="${escapeHtmlChat(p.id)}">${escapeHtmlChat(p.name)}</option>`).join('')}
              </select>
              <input type="text" id="chat-mark-link-username" placeholder="Username" style="flex:1;padding:4px 8px;font-size:12px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
              <button type="button" class="hud-btn" id="chat-mark-link-add">Link account</button>
            </div>
          </div>
        </div>
        <div style="flex-shrink:0;margin-top:12px;"><button type="button" class="hud-btn" id="chat-mark-save" style="padding:8px 16px;">Save</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const tagsListEl = document.getElementById('chat-mark-tags-list');
    const tagInput = document.getElementById('chat-mark-tag-input');
    const colorEl = document.getElementById('chat-mark-color');
    const colorHex = document.getElementById('chat-mark-color-hex');
    const linkedListEl = document.getElementById('chat-mark-linked-list');
    const updateColorHex = () => { colorHex.value = colorEl.value.slice(0, 7); };
    colorEl.addEventListener('input', updateColorHex);
    colorHex.addEventListener('input', () => { const v = colorHex.value; if (/^#[0-9A-Fa-f]{6}$/.test(v)) colorEl.value = v; });
    function removeTagHandler(btn) {
      const tag = btn.closest('.chat-mark-tag')?.dataset?.tag;
      if (tag) { identity.tags = (identity.tags || []).filter((x) => x !== tag); btn.closest('.chat-mark-tag')?.remove(); }
    }
    tagsListEl.querySelectorAll('.chat-mark-tag-remove').forEach((btn) => btn.addEventListener('click', () => removeTagHandler(btn)));
    document.getElementById('chat-mark-tag-add').addEventListener('click', () => {
      const t = (tagInput.value || '').trim();
      if (!t) return;
      identity.tags = identity.tags || [];
      if (!identity.tags.includes(t)) identity.tags.push(t);
      tagsListEl.insertAdjacentHTML('beforeend', `<span class="chat-mark-tag" data-tag="${escapeHtmlChat(t)}">${escapeHtmlChat(t)} <button type="button" class="chat-mark-tag-remove">×</button></span>`);
      const newBtn = tagsListEl.lastElementChild?.querySelector('.chat-mark-tag-remove');
      if (newBtn) newBtn.addEventListener('click', () => removeTagHandler(newBtn));
      tagInput.value = '';
    });
    document.querySelectorAll('.chat-mark-unlink').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.pid;
        const user = btn.dataset.user;
        if (pid && user && !(pid === platformId && user === username)) { window.goonAPI.chatUnlinkUser?.(pid, user); btn.closest('.chat-mark-linked')?.remove(); }
      });
    });
    document.getElementById('chat-mark-link-add').addEventListener('click', async () => {
      const pid = document.getElementById('chat-mark-link-platform').value;
      const user = (document.getElementById('chat-mark-link-username').value || '').trim();
      if (!user) return;
      const ok = await window.goonAPI.chatLinkUserToIdentity?.(pid, user, identityId);
      if (ok) {
        if (!linkedListEl.querySelector('.chat-mark-linked')) linkedListEl.innerHTML = '';
        linkedListEl.insertAdjacentHTML('beforeend', `<span class="chat-mark-linked">${escapeHtmlChat(pid)} / ${escapeHtmlChat(user)} <button type="button" class="chat-mark-unlink" data-pid="${escapeHtmlChat(pid)}" data-user="${escapeHtmlChat(user)}">Unlink</button></span>`);
        const newBtn = linkedListEl.lastElementChild?.querySelector('.chat-mark-unlink');
        if (newBtn) newBtn.addEventListener('click', () => { window.goonAPI.chatUnlinkUser?.(newBtn.dataset.pid, newBtn.dataset.user); newBtn.closest('.chat-mark-linked')?.remove(); });
        document.getElementById('chat-mark-link-username').value = '';
      }
      window.goonAPI?.showToast?.(ok ? 'Account linked' : 'Failed');
    });
    document.getElementById('chat-mark-save').addEventListener('click', async () => {
      identity.tags = Array.from(tagsListEl.querySelectorAll('.chat-mark-tag')).map((el) => el.dataset?.tag).filter(Boolean);
      identity.highlight = document.getElementById('chat-mark-highlight').checked;
      identity.badge = (document.getElementById('chat-mark-badge')?.value || '').trim().slice(0, 24) || '';
      identity.chatColor = (colorHex.value || colorEl.value || '').slice(0, 7) || '';
      await window.goonAPI.chatSetIdentity?.(identityId, identity);
      chatIdentityMap = await refreshChatIdentityMap();
      renderChatMessages();
      window.goonAPI?.showToast?.('Saved');
      overlay.remove();
    });
    document.getElementById('chat-mark-user-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
  }

  let chatContextMenuEl = null;
  function closeChatContextMenu() {
    if (chatContextMenuEl) {
      chatContextMenuEl.remove();
      chatContextMenuEl = null;
      document.removeEventListener('click', closeChatContextMenu);
    }
  }

  async function showChatUserContextMenu(e, platformId, platformName, username) {
    e.preventDefault();
    closeChatContextMenu();
    const row = e.target.closest('.chat-msg');
    const opts = {};
    if (row?.dataset?.channelId) opts.channelId = row.dataset.channelId;
    if (row?.dataset?.avatarUrl) opts.avatarUrl = row.dataset.avatarUrl;
    const passOpts = Object.keys(opts).length ? opts : undefined;
    const menu = document.createElement('div');
    menu.className = 'chat-context-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Show User Info';
    b.addEventListener('click', () => {
      closeChatContextMenu();
      showUserInfoModal(platformId, platformName, username, passOpts);
    });
    menu.appendChild(b);
    document.body.appendChild(menu);
    chatContextMenuEl = menu;
    setTimeout(() => document.addEventListener('click', closeChatContextMenu), 0);
  }

  function peerKey(platformId, username) {
    return (platformId || '') + '::' + (username || '?');
  }

  async function showDmModal(platformId, platformName, username) {
    closeChatContextMenu();
    const key = peerKey(platformId, username);
    const overlay = document.createElement('div');
    overlay.id = 'chat-dm-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1001;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:420px;width:100%;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;">
          <h3 style="margin:0;font-size:14px;">DM with ${escapeHtmlChat(username)} (${escapeHtmlChat(platformName || '')})</h3>
          <button type="button" class="hud-btn" id="chat-dm-close" style="padding:4px 10px;">Close</button>
        </div>
        <div id="chat-dm-messages" style="flex:1;overflow-y:auto;padding:8px;font-size:12px;font-family:var(--hud-font-mono);min-height:120px;display:flex;flex-direction:column;gap:4px;"></div>
        <div style="flex-shrink:0;display:flex;gap:8px;padding:8px 0;border-top:1px solid var(--hud-border);">
          <input type="text" id="chat-dm-input" placeholder="Type a message…" style="flex:1;padding:8px 12px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-size:12px;" />
          <button type="button" class="hud-btn" id="chat-dm-send">Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const messagesEl = overlay.querySelector('#chat-dm-messages');
    const inputEl = overlay.querySelector('#chat-dm-input');
    const renderDm = () => {
      window.goonAPI.chatGetWhisperConversation?.(key).then((messages) => {
        if (!messagesEl) return;
        messagesEl.innerHTML = (messages || []).map((m) => {
          const fromMe = m.from === 'me';
          const who = fromMe ? 'You' : escapeHtmlChat(username);
          const cls = fromMe ? 'style="color:var(--hud-accent);"' : '';
          return `<div ${cls}>${who}: ${escapeHtmlChat(m.text || '')}</div>`;
        }).join('');
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    };
    renderDm();
    overlay.querySelector('#chat-dm-send').addEventListener('click', async () => {
      const text = (inputEl?.value || '').trim();
      if (!text) return;
      await window.goonAPI?.chatAppendWhisper?.(key, true, text);
      inputEl.value = '';
      renderDm();
    });
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); overlay.querySelector('#chat-dm-send')?.click(); }
    });
    overlay.querySelector('#chat-dm-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
  }

  function showChatMessageContextMenu(e, row) {
    e.preventDefault();
    e.stopPropagation();
    closeChatContextMenu();
    const platformId = row.dataset?.platformId || '';
    const username = row.dataset?.username || '';
    const platformName = row.dataset?.platformName || '';
    const text = (row.dataset?.message || row.querySelector('.chat-text')?.textContent || '').trim();
    if (!text) return;
    const menu = document.createElement('div');
    menu.className = 'chat-context-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Pin this message';
    b.addEventListener('click', async () => {
      closeChatContextMenu();
      chatPinnedMessage = { text, username, platformId, platformName };
      await window.goonAPI?.chatSetPinnedMessage?.(chatPinnedMessage);
      updateChatPinnedBar();
    });
    menu.appendChild(b);
    document.body.appendChild(menu);
    chatContextMenuEl = menu;
    setTimeout(() => document.addEventListener('click', closeChatContextMenu), 0);
  }

  let votebanPollEnd = null;
  let votebanPollVote = null;
  let votebanPollData = null;
  let votebanPollTimer = null;

  function startVotebanPoll(platformId, platformName, username, action, durationSeconds, opts) {
    if (votebanPollTimer) clearInterval(votebanPollTimer);
    votebanPollData = { platformId, platformName, username, action, durationSeconds, opts };
    votebanPollVote = null;
    votebanPollEnd = Date.now() + 60000;
    const wrap = document.getElementById('chat-messages-wrap');
    if (!wrap) return;
    let bar = wrap.querySelector('.chat-voteban-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'chat-voteban-bar';
      bar.style.cssText = 'flex-shrink:0;padding:8px 12px;background:var(--hud-surface);border-bottom:1px solid var(--hud-border);font-size:11px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;';
      wrap.insertBefore(bar, wrap.firstChild);
    }
    function updateBar() {
      const left = Math.max(0, Math.ceil((votebanPollEnd - Date.now()) / 1000));
        const actionText = action === 'ban' ? 'Ban' : action === 'unban' ? 'Unban' : 'Timeout 10m';
      bar.innerHTML = `<span>${actionText} <strong>${escapeHtmlChat(username)}</strong>? — ${left}s</span><button type="button" class="hud-btn" data-vote="yes" style="font-size:11px;">Yes</button><button type="button" class="hud-btn" data-vote="no" style="font-size:11px;">No</button>`;
      bar.querySelector('[data-vote="yes"]')?.addEventListener('click', () => { votebanPollVote = 'yes'; updateBar(); });
      bar.querySelector('[data-vote="no"]')?.addEventListener('click', () => { votebanPollVote = 'no'; updateBar(); });
      if (left <= 0) {
        clearInterval(votebanPollTimer);
        votebanPollTimer = null;
        if (votebanPollVote === 'yes' && votebanPollData) {
          const d = votebanPollData;
          const voteOpts = { ...(d.opts || {}), reason: 'Community vote (poll)' };
          if (d.action === 'ban') {
            window.goonAPI?.chatBanUser?.(d.platformId, d.username, voteOpts).then((r) => {
              window.goonAPI?.showToast?.(r?.ok ? 'User banned' : (r?.error || 'Failed'));
            });
          } else if (d.action === 'unban') {
            window.goonAPI?.chatUnbanUser?.(d.platformId, d.username, voteOpts).then((r) => {
              window.goonAPI?.showToast?.(r?.ok ? 'User unbanned' : (r?.error || 'Failed'));
            });
          } else {
            window.goonAPI?.chatTimeoutUser?.(d.platformId, d.username, d.durationSeconds || 600, voteOpts).then((r) => {
              window.goonAPI?.showToast?.(r?.ok ? 'Timeout applied' : (r?.error || 'Failed'));
            });
          }
        }
        bar.remove();
        votebanPollData = null;
      }
    }
    updateBar();
    votebanPollTimer = setInterval(updateBar, 1000);
  }

  /** One delegated listener — re-binding per-row on every full innerHTML rebuild was freezing the UI. */
  function bindUserHistoryContextMenu() {
    const container = document.getElementById('chat-messages');
    if (!container || container.dataset.goonChatCtxDeleg === '1') return;
    container.dataset.goonChatCtxDeleg = '1';
    container.addEventListener(
      'contextmenu',
      (e) => {
        const row = e.target.closest('.chat-msg');
        if (!row || !container.contains(row)) return;
        if (e.target.closest('.chat-username')) {
          e.preventDefault();
          showChatUserContextMenu(
            e,
            row.dataset.platformId || '',
            row.dataset.platformName || '',
            row.dataset.username || '?'
          );
          return;
        }
        showChatMessageContextMenu(e, row);
      },
      true
    );
  }

  function showCreatePollModal() {
    const platformsWithAuth = CHAT_PLATFORMS.filter((p) => ['twitch', 'kick', 'youtube'].includes(p.id));
    const overlay = document.createElement('div');
    overlay.id = 'chat-poll-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:400px;width:100%;">
        <h3 style="margin:0 0 12px 0;font-size:14px;">Create poll</h3>
        <label style="display:block;margin-bottom:4px;opacity:0.8;font-size:11px;">Platform</label>
        <select id="chat-poll-platform" style="width:100%;margin-bottom:10px;padding:8px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;">
          <option value="all">All (Twitch + Kick + YouTube + Website)</option>
          ${platformsWithAuth.map((p) => `<option value="${escapeHtmlChat(p.id)}">${escapeHtmlChat(p.name)}</option>`).join('')}
          <option value="embed">Website (embed / Pod Awful)</option>
        </select>
        <label style="display:block;margin-bottom:4px;opacity:0.8;font-size:11px;">Question</label>
        <input type="text" id="chat-poll-title" placeholder="Poll question" style="width:100%;margin-bottom:10px;padding:8px;box-sizing:border-box;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
        <label style="display:block;margin-bottom:4px;opacity:0.8;font-size:11px;">Choices (2–5)</label>
        <input type="text" id="chat-poll-opt1" placeholder="Option 1" style="width:100%;margin-bottom:4px;padding:6px 8px;box-sizing:border-box;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
        <input type="text" id="chat-poll-opt2" placeholder="Option 2" style="width:100%;margin-bottom:4px;padding:6px 8px;box-sizing:border-box;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
        <input type="text" id="chat-poll-opt3" placeholder="Option 3 (optional)" style="width:100%;margin-bottom:4px;padding:6px 8px;box-sizing:border-box;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
        <input type="text" id="chat-poll-opt4" placeholder="Option 4 (optional)" style="width:100%;margin-bottom:4px;padding:6px 8px;box-sizing:border-box;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
        <input type="text" id="chat-poll-opt5" placeholder="Option 5 (optional)" style="width:100%;margin-bottom:10px;padding:6px 8px;box-sizing:border-box;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
        <label style="display:block;margin-bottom:4px;opacity:0.8;font-size:11px;">Duration (seconds)</label>
        <input type="number" id="chat-poll-duration" value="300" min="15" max="1800" style="width:100px;margin-bottom:12px;padding:6px 8px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="hud-btn" id="chat-poll-cancel">Cancel</button>
          <button type="button" class="hud-btn" id="chat-poll-submit">Create</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
    document.getElementById('chat-poll-cancel')?.addEventListener('click', () => overlay.remove());
    document.getElementById('chat-poll-submit')?.addEventListener('click', async () => {
      const platformVal = document.getElementById('chat-poll-platform')?.value || 'twitch';
      const title = document.getElementById('chat-poll-title')?.value?.trim() || 'Poll';
      const opts = [1, 2, 3, 4, 5].map((i) => document.getElementById('chat-poll-opt' + i)?.value?.trim()).filter(Boolean);
      const duration = parseInt(document.getElementById('chat-poll-duration')?.value, 10) || 300;
      if (opts.length < 2) { window.goonAPI?.showToast?.('Need at least 2 options'); return; }
      overlay.remove();
      let ok = 0;
      let err = 0;
      if (platformVal === 'embed') {
        const r = await window.goonAPI.chatCreateEmbedPoll?.(title, opts, duration);
        window.goonAPI?.showToast?.(r?.ok ? 'Poll created on website embed' : 'Failed');
        updateChatPollBar();
        return;
      }
      const platformIds = platformVal === 'all' ? ['twitch', 'kick', 'youtube'] : [platformVal];
      for (const platformId of platformIds) {
        const r = await window.goonAPI.chatCreatePoll?.(platformId, title, opts, duration);
        if (r?.ok) ok++; else err++;
      }
      if (platformVal === 'all') {
        const embedR = await window.goonAPI.chatCreateEmbedPoll?.(title, opts, duration);
        if (embedR?.ok) ok++;
        else err++;
        updateChatPollBar();
      }
      if (platformIds.length > 1 || platformVal === 'all') window.goonAPI?.showToast?.(ok ? `Poll created on ${ok} platform(s)${err ? `, ${err} failed` : ''}` : 'Failed');
      else window.goonAPI?.showToast?.(ok ? 'Poll created' : (err ? 'Failed' : 'Poll created'));
    });
  }

  document.getElementById('chat-create-poll-btn')?.addEventListener('click', showCreatePollModal);

  function showStartTrollModal() {
    const overlay = document.createElement('div');
    overlay.id = 'chat-troll-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:420px;width:100%;">
        <h3 style="margin:0 0 12px 0;font-size:14px;">Start troll</h3>
        <p style="margin:0 0 10px 0;font-size:11px;opacity:0.85;line-height:1.45;">Shows above chat in the app and on the website embed. Paste a full link (https://…).</p>
        <label style="display:block;margin-bottom:4px;opacity:0.8;font-size:11px;">What’s going on</label>
        <textarea id="chat-troll-desc" rows="3" placeholder="Short description for chat…" style="width:100%;margin-bottom:10px;padding:8px;box-sizing:border-box;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;font-family:inherit;font-size:12px;resize:vertical;"></textarea>
        <label style="display:block;margin-bottom:4px;opacity:0.8;font-size:11px;">Link</label>
        <input type="url" id="chat-troll-url" placeholder="https://…" style="width:100%;margin-bottom:12px;padding:8px;box-sizing:border-box;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);border-radius:4px;" />
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="hud-btn" id="chat-troll-cancel">Cancel</button>
          <button type="button" class="hud-btn" id="chat-troll-submit">Show banner</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
    document.getElementById('chat-troll-cancel')?.addEventListener('click', () => overlay.remove());
    document.getElementById('chat-troll-submit')?.addEventListener('click', async () => {
      const description = document.getElementById('chat-troll-desc')?.value?.trim() || '';
      const url = document.getElementById('chat-troll-url')?.value?.trim() || '';
      if (!url) {
        window.goonAPI?.showToast?.('Add a link');
        return;
      }
      const r = await window.goonAPI.chatSetEmbedTroll?.(description, url);
      overlay.remove();
      window.goonAPI?.showToast?.(r?.ok ? 'Troll banner is live' : 'Invalid link');
      updateChatTrollBar();
    });
  }

  document.getElementById('chat-start-troll-btn')?.addEventListener('click', showStartTrollModal);

  function showTrollHistoryModal() {
    const overlay = document.createElement('div');
    overlay.id = 'chat-troll-history-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div class="hud-panel" style="max-width:520px;width:100%;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;gap:8px;flex-wrap:wrap;">
          <h3 style="margin:0;font-size:14px;">Troll log</h3>
          <button type="button" class="hud-btn" id="chat-troll-history-close" style="padding:4px 10px;">Close</button>
        </div>
        <p id="chat-troll-history-summary" style="margin:0 0 8px 0;font-size:11px;opacity:0.9;"></p>
        <div id="chat-troll-history-list" style="flex:1;overflow-y:auto;font-family:var(--hud-font-mono);font-size:11px;padding:8px;background:var(--hud-bg);border:1px solid var(--hud-border);border-radius:4px;min-height:120px;"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const listEl = overlay.querySelector('#chat-troll-history-list');
    const summaryEl = overlay.querySelector('#chat-troll-history-summary');
    overlay.querySelector('#chat-troll-history-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
    window.goonAPI.chatGetTrollHistory?.().then((history) => {
      const list = Array.isArray(history) ? history : [];
      const nOk = list.filter((e) => e.outcome === 'success').length;
      const nBad = list.filter((e) => e.outcome === 'failed').length;
      if (summaryEl) summaryEl.textContent = `Total: ${list.length} · Successful: ${nOk} · Failed: ${nBad}`;
      if (!listEl) return;
      if (list.length === 0) {
        listEl.innerHTML = '<div style="opacity:0.6;">No trolls logged yet.</div>';
        return;
      }
      listEl.innerHTML = list
        .map((e) => {
          const t = e.timestamp ? new Date(e.timestamp) : null;
          const timeStr = t ? t.toLocaleString() : '';
          const badge =
            e.outcome === 'failed'
              ? '<span style="color:#f66;font-weight:600;">Failed</span>'
              : '<span style="color:#8f8;font-weight:600;">Successful</span>';
          const desc = escapeHtmlChat((e.description || '').trim() || '(no description)');
          const url = (e.url || '').trim();
          const urlHtml = url
            ? `<a href="#" class="chat-troll-history-link" data-href="${escapeHtmlChat(url)}" style="color:var(--hud-accent);word-break:break-all;">${escapeHtmlChat(url)}</a>`
            : '—';
          return `<div style="padding:8px 0;border-bottom:1px solid var(--hud-border);line-height:1.45;"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:4px;"><span style="opacity:0.75;font-size:10px;">${escapeHtmlChat(timeStr)}</span>${badge}</div><div style="margin-bottom:4px;">${desc}</div><div>${urlHtml}</div></div>`;
        })
        .join('');
      listEl.querySelectorAll('.chat-troll-history-link').forEach((a) => {
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          const href = ev.currentTarget.getAttribute('data-href');
          if (href) window.goonAPI?.openExternal?.(href);
        });
      });
    });
  }

  document.getElementById('chat-troll-log-btn')?.addEventListener('click', showTrollHistoryModal);

  const originalRenderChatMessages = renderChatMessages;
  renderChatMessages = function (options) {
    originalRenderChatMessages(options);
  };

  let chatRenderDebounceTimer = null;
  /** Coalesce rapid chat lines into fewer DOM rebuilds so toolbar (e.g. Viewers) stays clickable. */
  function scheduleChatRender() {
    if (chatRenderDebounceTimer) return;
    chatRenderDebounceTimer = setTimeout(() => {
      chatRenderDebounceTimer = null;
      requestAnimationFrame(() => {
        renderChatMessages();
      });
    }, 320);
  }
  _chatRenderMessagesRef = scheduleChatRender;

  if (!_chatMessageListenerAdded) {
    _chatMessageListenerAdded = true;
    let _chatViewerRefreshLast = 0;
    window.addEventListener('chatMessagesBatch', (e) => {
      if (!document.getElementById('chat-messages')?.isConnected) return;
      const arr = e.detail;
      if (!Array.isArray(arr) || !arr.length) return;
      const now = Date.now();
      for (const m of arr) {
        if (!m || !(m.platformName || m.platformId) || m.message == null) continue;
        const platform = CHAT_PLATFORMS.find((p) => p.id === (m.platformId || m.platform));
        const entry = {
          platformId: m.platformId || m.platform,
          platformName: m.platformName || platform?.name || '?',
          username: m.username || '?',
          message: m.message,
          timestamp: typeof m.timestamp === 'number' ? m.timestamp : now,
          channelId: m.channelId || undefined,
          avatarUrl: m.avatarUrl || undefined,
          donationAmount: m.donationAmount != null ? m.donationAmount : undefined,
          donationCurrency: m.donationCurrency || undefined
        };
        chatMessages.push(entry);
        while (chatMessages.length > CHAT_MEMORY_MAX) {
          chatMessages.shift();
          if (chatShowFromIndex > 0) chatShowFromIndex -= 1;
        }
      }
      chatLastMessageTime = now;
      if (_chatRenderMessagesRef) _chatRenderMessagesRef();
      if (now - _chatViewerRefreshLast > 10000) {
        _chatViewerRefreshLast = now;
        refreshViewersButton();
      }
    });
    window.addEventListener('chatStreamsChanged', async () => {
      if (!document.getElementById('chat-messages')?.isConnected) return;
      const log = await window.goonAPI.chatGetChatLog?.();
      if (!Array.isArray(log)) return;
      chatMessages = log;
      chatShowFromIndex = Math.max(0, chatMessages.length - CHAT_SCROLLBACK_PAGE);
      renderChatMessages();
      refreshViewersButton();
    });
    window.addEventListener('chatMessage', (e) => {
      if (!document.getElementById('chat-messages')?.isConnected) return;
      const m = e.detail;
      if (m && (m.platformName || m.platformId) && m.message != null) {
        const platform = CHAT_PLATFORMS.find((p) => p.id === (m.platformId || m.platform));
        const entry = {
          platformId: m.platformId || m.platform,
          platformName: m.platformName || platform?.name || '?',
          username: m.username || '?',
          message: m.message,
          timestamp: Date.now(),
          channelId: m.channelId || undefined,
          avatarUrl: m.avatarUrl || undefined,
          donationAmount: m.donationAmount != null ? m.donationAmount : undefined,
          donationCurrency: m.donationCurrency || undefined
        };
        chatMessages.push(entry);
        while (chatMessages.length > CHAT_MEMORY_MAX) {
          chatMessages.shift();
          if (chatShowFromIndex > 0) chatShowFromIndex -= 1;
        }
        chatLastMessageTime = Date.now();
        if (_chatRenderMessagesRef) _chatRenderMessagesRef();
        const now = Date.now();
        if (now - _chatViewerRefreshLast > 10000) {
          _chatViewerRefreshLast = now;
          refreshViewersButton();
        }
      }
    });
  }

  bindUserHistoryContextMenu();

  (async () => {
    const saved = await window.goonAPI.chatGetAddedStreams?.();
    if (Array.isArray(saved)) chatAddedStreams = new Set(saved);
    let unifiedEnabled = (await window.goonAPI.chatGetChatUnifiedEnabled?.()) === true;
    try { chatEmbedEnabled = (await window.goonAPI.chatGetEmbedEnabled?.()) !== false; } catch (_) {}
    const unifiedBtn = document.getElementById('chat-unified-toggle-btn');
    if (unifiedBtn) {
      unifiedBtn.textContent = unifiedEnabled ? 'Live streams: On' : 'Live streams: Off';
      unifiedBtn.addEventListener('click', async () => {
        const next = !unifiedEnabled;
        await window.goonAPI.chatSetChatUnifiedEnabled?.(next);
        unifiedEnabled = next;
        unifiedBtn.textContent = next ? 'Live streams: On' : 'Live streams: Off';
        window.goonAPI?.showToast?.(next ? 'Live stream connections on' : 'Live stream connections off');
      });
    }
    // Sync to main process so chat connections/scrapers start (or restart) when Chat view is shown
    window.goonAPI?.chatSetAddedStreams?.([...chatAddedStreams]);
    // Delayed re-sync so connections refresh even if main wasn't ready on first call (YouTube, Kick, DLive, Odysee, Rumble)
    setTimeout(() => { window.goonAPI?.chatSetAddedStreams?.([...chatAddedStreams]); }, 800);
    const log = await window.goonAPI.chatGetChatLog?.();
    if (Array.isArray(log) && log.length > 0) {
      chatMessages = log;
      chatShowFromIndex = Math.max(0, chatMessages.length - CHAT_SCROLLBACK_PAGE);
    }
    chatHighlightKeywords = (await window.goonAPI.chatGetHighlightKeywords?.()) || [];
    chatPinnedMessage = await window.goonAPI.chatGetPinnedMessage?.() || null;
    chatFilterPlatformEmotes = await window.goonAPI.chatGetFilterPlatformEmotes?.() ?? false;
    chatPlatformEmoteBlocklist = (await window.goonAPI.chatGetPlatformEmoteBlocklist?.()) ?? [];
    chatFontScale = Math.max(1, Math.min(10, (await window.goonAPI.chatGetFontScale?.()) ?? 5));
    chatPlatformLabelMode =
      (await window.goonAPI.chatGetPlatformLabelMode?.()) === 'icon' ? 'icon' : 'full';
    chatPlatformFilter = (await window.goonAPI.chatGetPlatformFilter?.()) || 'all';
    if (chatPlatformFilter === 'embed') chatPlatformFilter = 'all';
    const filterSelect = document.getElementById('chat-filter-select');
    if (filterSelect) { filterSelect.value = chatPlatformFilter; window.goonAPI?.chatSetPlatformFilter?.(chatPlatformFilter); }
    const platformLabelSelect = document.getElementById('chat-platform-label-select');
    if (platformLabelSelect) {
      platformLabelSelect.value = chatPlatformLabelMode;
      platformLabelSelect.addEventListener('change', async () => {
        chatPlatformLabelMode = platformLabelSelect.value === 'icon' ? 'icon' : 'full';
        await window.goonAPI?.chatSetPlatformLabelMode?.(chatPlatformLabelMode);
        renderAddedStreams();
        renderChatMessages();
      });
    }
    const sizeSelect = document.getElementById('chat-size-select');
    if (sizeSelect) {
      const v = chatFontScale <= 3 ? 3 : chatFontScale <= 6 ? 5 : 8;
      sizeSelect.value = String(v);
      sizeSelect.addEventListener('change', async () => {
        const scale = Math.max(1, Math.min(10, parseInt(sizeSelect.value, 10) || 5));
        chatFontScale = scale;
        await window.goonAPI?.chatSetFontScale?.(scale);
        applyUnifiedChatFontSize(scale);
      });
    }
    applyUnifiedChatFontSize(chatFontScale);
    renderAddedStreams();
    renderChatMessages();
    updateChatPinnedBar();
    updateChatTrollBar();
    updateChatPollBar();
    refreshViewersButton();
    if (window._chatViewersInterval) clearInterval(window._chatViewersInterval);
    window._chatViewersInterval = setInterval(() => {
      if (document.getElementById('chat-messages')?.isConnected) refreshViewersButton();
    }, 8000);
    if (window._chatPollBarInterval) clearInterval(window._chatPollBarInterval);
    window._chatPollBarInterval = setInterval(() => {
      if (document.getElementById('chat-messages')?.isConnected) updateChatPollBar();
    }, 1000);
    refreshChatIdentityMap().then((m) => { chatIdentityMap = m; renderChatMessages(); });
    window.goonAPI?.chatGetEmoteList?.().then((names) => { chatEmoteNames = Array.isArray(names) ? names : []; renderChatMessages(); });
  })();
}

// Bridge status (event-driven + initial fetch)
function updateBridgeStatus(data) {
  const el = document.getElementById('bridge-status');
  if (!el) return;
  const connected = data ? data.connected : false;
  const err = data && data.error;
  el.textContent = err ? '[ ERROR ]' : (connected ? '[ LINK ]' : '[ OFFLINE ]');
  el.className = 'hud-status ' + (err ? 'offline' : (connected ? 'online' : 'offline'));
  const portHint = data && data.ok && data.port != null ? ` App bridge port: ${data.port}.` : '';
  el.title = err
    ? (data.error || 'Bridge port in use — change in Settings')
    : connected
      ? 'Bridge connected — timecodes at the ready'
      : `Extension not connected — reload the Goonopticon Bridge extension, then open its popup once.${portHint}`;

  const showSetup = !(connected && !err);
  const hBtn = document.getElementById('btn-bridge-connect');
  const fBtn = document.getElementById('btn-footer-bridge');
  if (hBtn) hBtn.style.display = showSetup ? '' : 'none';
  if (fBtn) fBtn.style.display = showSetup ? '' : 'none';
}
window.addEventListener('bridgeStatus', (e) => updateBridgeStatus(e.detail));
window.addEventListener('bridgeTimeUpdate', (e) => {
  const iframe = document.querySelector('#view .view-iframe');
  if (iframe?.contentWindow && e.detail?.time != null)
    iframe.contentWindow.postMessage({ type: 'goonopticon-timeUpdate', time: e.detail.time }, '*');
});
// Defer bridge IPC until after first paint + boot poster decode to avoid main-process pile-up.
setTimeout(() => {
  (async () => {
    const data = await window.goonAPI.bridgeGetStatus?.();
    if (data) updateBridgeStatus(data);
  })();
  if (!window._bridgeStatusPoll && window.goonAPI?.bridgeGetStatus) {
    window._bridgeStatusPoll = setInterval(() => {
      window.goonAPI.bridgeGetStatus().then((data) => { if (data) updateBridgeStatus(data); }).catch(() => {});
    }, 2500);
  }
}, 4000);

function hideBridgeBrowserPicker() {
  document.getElementById('bridge-browser-modal')?.classList.remove('visible');
}

function showBridgeBrowserPicker() {
  initBridgeBrowserModal();
  document.getElementById('bridge-browser-modal')?.classList.add('visible');
}

function initBridgeBrowserModal() {
  const modal = document.getElementById('bridge-browser-modal');
  if (!modal || modal.dataset.inited === '1') return;
  modal.dataset.inited = '1';

  window.goonAPI
    .getPlatform?.()
    .then((p) => {
      const safariBtn = document.getElementById('bridge-browser-safari');
      if (safariBtn) safariBtn.style.display = p === 'darwin' ? '' : 'none';
    })
    .catch(() => {});

  modal.querySelectorAll('.bridge-browser-choice').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-browser');
      hideBridgeBrowserPicker();
      const res = await window.goonAPI.openBrowserExtensions?.(id);
      if (res?.ok) {
        await window.goonAPI.showToast?.(`Opened ${btn.textContent.trim()}. Load the bridge folder there.`);
      } else {
        await window.goonAPI.showToast?.(res?.error || 'Could not start that browser.');
      }
    });
  });

  document.getElementById('bridge-browser-cancel')?.addEventListener('click', hideBridgeBrowserPicker);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideBridgeBrowserPicker();
  });
}

async function runBridgeSetupFromApp() {
  const extPath = (await window.goonAPI.getExtensionPath?.()) || '';
  if (extPath) {
    try {
      await navigator.clipboard.writeText(extPath);
    } catch (_) {}
  }
  let p = '';
  try {
    const port = await window.goonAPI.getBridgePort?.();
    if (typeof port === 'number') p = String(port);
  } catch (_) {}
  await window.goonAPI.showToast?.(
    extPath
      ? `Bridge folder path copied.${p ? ` Port ${p} — match in extension Options if you changed it.` : ''} Choose your browser…`
      : 'Bridge path unavailable. Check Configure Surveillance — still pick a browser to open extensions.'
  );
  showBridgeBrowserPicker();
}
['btn-bridge-connect', 'btn-footer-bridge'].forEach((id) => {
  document.getElementById(id)?.addEventListener('click', () => runBridgeSetupFromApp());
});

function initMatrixRain() {
  const container = document.getElementById('matrix-rain');
  if (!container) return;
  container.innerHTML = '';
  const chars = '01アイウエオカキクケコ0123456789ABCDEF';
  const numColumns = Math.min(28, Math.max(14, Math.ceil(window.innerWidth / 36)));
  for (let i = 0; i < numColumns; i++) {
    const col = document.createElement('div');
    col.className = 'matrix-column';
    const lineCount = Math.min(32, Math.ceil(window.innerHeight / 24) + 6);
    let text = '';
    for (let j = 0; j < lineCount; j++) {
      text += chars[Math.floor(Math.random() * chars.length)] + '\n';
    }
    col.textContent = text.trim();
    col.style.left = (i * (100 / numColumns)) + '%';
    col.style.animationDuration = (4 + Math.random() * 6) + 's';
    col.style.animationDelay = -(Math.random() * 8) + 's';
    col.style.opacity = 0.5 + Math.random() * 0.5;
    container.appendChild(col);
  }
}

// First-run pill choice (blue = virus on, red = virus off)
(async () => {
  const pillSeen = await window.goonAPI.getSeenPillChoice?.();
  const pillOverlay = document.getElementById('pill-choice-overlay');
  const pillTooltip = document.getElementById('pill-choice-tooltip');
  const pillBlue = document.getElementById('pill-choice-blue');
  const pillRed = document.getElementById('pill-choice-red');
  const pillImg = document.getElementById('pill-choice-img');
  if (!pillSeen && pillOverlay && !isChatPopout()) {
    pillOverlay.classList.add('visible');
    initMatrixRain();
    if (pillImg) pillImg.onerror = () => { pillImg.style.display = 'none'; };
    pillBlue?.addEventListener('mouseenter', () => { if (pillTooltip) { pillTooltip.textContent = 'Immerse Yourself'; pillTooltip.classList.add('show'); } });
    pillBlue?.addEventListener('mouseleave', () => { pillTooltip?.classList.remove('show'); });
    pillRed?.addEventListener('mouseenter', () => { if (pillTooltip) { pillTooltip.textContent = 'Avoid the Noid'; pillTooltip.classList.add('show'); } });
    pillRed?.addEventListener('mouseleave', () => { pillTooltip?.classList.remove('show'); });
    pillBlue?.addEventListener('click', async () => {
      await window.goonAPI.setVirusPopupEnabled?.(true);
      await window.goonAPI.setSeenPillChoice?.(true);
      pillOverlay.classList.remove('visible');
      showExtensionOverlayIfNeeded();
    });
    pillRed?.addEventListener('click', async () => {
      await window.goonAPI.setVirusPopupEnabled?.(false);
      await window.goonAPI.setSeenPillChoice?.(true);
      pillOverlay.classList.remove('visible');
      showExtensionOverlayIfNeeded();
    });
  } else {
    showExtensionOverlayIfNeeded();
  }
})();

async function showExtensionOverlayIfNeeded() {
  if (isChatPopout()) return;
  const overlay = document.getElementById('first-run-overlay');
  const seen = await window.goonAPI.getSeenExtensionSetup?.();
  if (!seen && overlay) {
    overlay.style.display = 'flex';
    const extPath = await window.goonAPI.getExtensionPath?.() || '';
    const pathInput = document.getElementById('extension-path-display');
    if (pathInput) pathInput.value = extPath;
    document.getElementById('copy-extension-path')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(extPath);
        const btn = document.getElementById('copy-extension-path');
        if (btn) { btn.textContent = 'Copied. Path secured.'; setTimeout(() => { btn.textContent = 'Copy path'; }, 2000); }
      } catch {}
    });
    document.getElementById('open-extensions-page')?.addEventListener('click', () => {
      showBridgeBrowserPicker();
    });
    document.getElementById('first-run-dismiss')?.addEventListener('click', async () => {
      await window.goonAPI.setSeenExtensionSetup?.(true);
      overlay.style.display = 'none';
    });
  }
}

// Custom window controls (frameless)
document.getElementById('btn-window-minimize')?.addEventListener('click', () => window.goonAPI.windowMinimize?.());
document.getElementById('btn-window-maximize')?.addEventListener('click', () => window.goonAPI.windowMaximize?.());
document.getElementById('btn-window-close')?.addEventListener('click', () => window.goonAPI.windowClose?.());

// Unhandled promise rejections → toast + dev log
window.addEventListener('unhandledrejection', (e) => {
  window.goonAPI?.showToast?.('Something went wrong');
  devLogPush('error', 'Unhandled rejection', e.reason != null ? String(e.reason) : undefined);
  console.error('Unhandled rejection:', e.reason);
});

// Initial splash text and window title with random quote
refreshSplashText();
(async () => {
  try {
    const q = await window.goonAPI.getRandomSplash();
    if (q) document.title = 'Goonopticon Security Breach — ' + q;
  } catch (_) {}
})();
// App version in header (from package.json)
(async () => {
  try {
    const v = await window.goonAPI.getVersion?.();
    const el = document.getElementById('app-version');
    if (el && v) el.textContent = 'v' + v;
  } catch (_) {}
})();
