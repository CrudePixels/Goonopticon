const buddy = document.getElementById('grok-buddy');
const bubble = document.getElementById('grok-bubble');
const sprite = document.getElementById('grok-sprite');
const spriteImg = document.getElementById('grok-sprite-img');
const grokInput = document.getElementById('grok-input');
const grokBtn = document.getElementById('grok-btn');
const contextMenu = document.getElementById('grok-context-menu');
const settingsPanel = document.getElementById('grok-settings-panel');
const askPanel = document.getElementById('grok-ask-panel');
const grokClose = document.getElementById('grok-close');
const grokAlwaysOnTop = document.getElementById('grok-always-on-top');
const grokVolume = document.getElementById('grok-volume');
const grokTheme = document.getElementById('grok-theme');
const grokSettingsRoast = document.getElementById('grok-settings-roast');
const grokSettingsTroll = document.getElementById('grok-settings-troll');

const AVATAR_W = 200, AVATAR_H = 280;
const PANEL_W = 320, SETTINGS_H = 420, ASK_H = 320;

const api = window.grokBuddyAPI;
const recentLines = [];
let initialSpoken = false;
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

const SPRITE_EXT = '.webp'; // or '.png' — use whatever format you put in sprites/
const SPRITES = {
  idle: [`sprites/idle_1${SPRITE_EXT}`, `sprites/idle_2${SPRITE_EXT}`],
  walk: [`sprites/walk_1${SPRITE_EXT}`, `sprites/walk_2${SPRITE_EXT}`],
  alert: [`sprites/alert${SPRITE_EXT}`],
  investigate: [`sprites/investigate${SPRITE_EXT}`]
};

let spriteLoaded = false;
let idleFrame = 0;
let idleInterval = null;
let currentState = 'idle';

let cachedVolume = 0.4;
async function refreshVolume() {
  try { cachedVolume = await api.getGrokVolume(); } catch (_) {}
}
function playSound(name) {
  try {
    const a = new Audio(`sounds/${name}.wav`);
    a.volume = cachedVolume;
    a.play().catch(() => {});
  } catch (_) {}
}

function setSpriteFrame(src) {
  if (!spriteImg) return;
  spriteImg.src = src;
}

let walkFrame = 0;

function setSpriteState(state) {
  if (!spriteLoaded || !sprite) return;
  currentState = state;
  sprite.dataset.state = state;
  const frames = SPRITES[state];
  if (frames && frames.length) setSpriteFrame(frames[0]);
  if (idleInterval) clearInterval(idleInterval);
  idleInterval = null;
  if (state === 'idle' && SPRITES.idle.length >= 2) {
    idleInterval = setInterval(() => {
      idleFrame = 1 - idleFrame;
      setSpriteFrame(SPRITES.idle[idleFrame]);
    }, 500);
  } else if (state === 'walk' && SPRITES.walk && SPRITES.walk.length >= 2) {
    idleInterval = setInterval(() => {
      walkFrame = (walkFrame + 1) % SPRITES.walk.length;
      setSpriteFrame(SPRITES.walk[walkFrame]);
    }, 200);
  }
}

if (spriteImg) {
  const initial = spriteImg.dataset.initial;
  if (initial) spriteImg.src = initial + SPRITE_EXT;
  spriteImg.onload = () => {
    spriteLoaded = true;
    sprite?.classList.add('has-sprite');
    setSpriteState('idle');
  };
  spriteImg.onerror = () => {
    sprite?.classList.remove('has-sprite');
  };
}

let roastMode = false;
let trollMode = false;

async function loadModes() {
  if (!api?.getGrokRoastMode) return;
  roastMode = await api.getGrokRoastMode();
  trollMode = await api.getGrokTrollMode();
  updateModeUI();
}
function updateModeUI() {
  const roastItem = contextMenu?.querySelector('[data-action="roast"]');
  const trollItem = contextMenu?.querySelector('[data-action="troll"]');
  roastItem?.classList.toggle('active', roastMode);
  trollItem?.classList.toggle('active', trollMode);
  grokSettingsRoast && (grokSettingsRoast.checked = roastMode);
  grokSettingsTroll && (grokSettingsTroll.checked = trollMode);
}
loadModes();

grokClose?.addEventListener('click', () => {
  if (api?.getGoodbyeLine) showBubble(api.getGoodbyeLine(), false, { sound: 'close' });
  setTimeout(() => api?.close?.(), 120);
});

function hideContextMenu() {
  contextMenu?.setAttribute('hidden', '');
}
function showContextMenu(x, y) {
  if (!contextMenu) return;
  contextMenu.removeAttribute('hidden');
  const rect = contextMenu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width;
  const maxY = window.innerHeight - rect.height;
  contextMenu.style.left = Math.min(Math.max(0, x), maxX) + 'px';
  contextMenu.style.top = Math.min(Math.max(0, y), maxY) + 'px';
}

let lastContextMenuAt = 0;
buddy?.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  lastContextMenuAt = Date.now();
  showContextMenu(e.clientX, e.clientY);
});

// Fallback for cases where `contextmenu` is swallowed (some Electron/OS combos)
buddy?.addEventListener('mouseup', (e) => {
  if (e.button !== 2) return; // right click only
  const now = Date.now();
  if (now - lastContextMenuAt < 200) return;
  lastContextMenuAt = now;
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY);
});
document.addEventListener('click', (e) => {
  if (!contextMenu?.contains(e.target)) hideContextMenu();
});
contextMenu?.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-action]');
  if (!li) return;
  e.stopPropagation();
  const action = li.getAttribute('data-action');
  hideContextMenu();
  if (action === 'ask') {
    askPanel?.removeAttribute('hidden');
    settingsPanel?.setAttribute('hidden', '');
    api?.setSize?.(PANEL_W, ASK_H);
    grokInput?.focus();
  } else if (action === 'deploy-overlay') {
    api?.openOverlay?.();
    showBubble('Overlay deployed.', false, { sound: 'pop' });
  } else if (action === 'roast') {
    roastMode = !roastMode;
    if (roastMode) trollMode = false;
    api?.setGrokRoastMode?.(roastMode);
    if (roastMode) api?.setGrokTrollMode?.(false);
    updateModeUI();
    if (roastMode && api?.getRoastModeOnLine) { playSound('pop'); showBubble(api.getRoastModeOnLine()); }
  } else if (action === 'troll') {
    trollMode = !trollMode;
    if (trollMode) roastMode = false;
    api?.setGrokTrollMode?.(trollMode);
    if (trollMode) api?.setGrokRoastMode?.(false);
    updateModeUI();
    if (trollMode && api?.getTrollModeOnLine) { playSound('pop'); showBubble(api.getTrollModeOnLine()); }
  } else if (action === 'settings') {
    settingsPanel?.removeAttribute('hidden');
    askPanel?.setAttribute('hidden', '');
    api?.setSize?.(PANEL_W, SETTINGS_H);
  } else if (action === 'reload') {
    api?.reloadGrokLines?.().then(() => {
      showBubble(api.getReloadAckLine?.() ?? 'Reloaded.');
    });
  } else if (action === 'close') {
    if (api?.getGoodbyeLine) showBubble(api.getGoodbyeLine(), false, { sound: 'close' });
    setTimeout(() => api?.close?.(), 800);
  }
});

grokSettingsRoast?.addEventListener('change', async () => {
  roastMode = !!grokSettingsRoast.checked;
  if (roastMode) { trollMode = false; grokSettingsTroll && (grokSettingsTroll.checked = false); }
  await api?.setGrokRoastMode?.(roastMode);
  if (roastMode) await api?.setGrokTrollMode?.(false);
  updateModeUI();
  if (roastMode && api?.getRoastModeOnLine) { playSound('pop'); showBubble(api.getRoastModeOnLine()); }
});
grokSettingsTroll?.addEventListener('change', async () => {
  trollMode = !!grokSettingsTroll.checked;
  if (trollMode) { roastMode = false; grokSettingsRoast && (grokSettingsRoast.checked = false); }
  await api?.setGrokTrollMode?.(trollMode);
  if (trollMode) await api?.setGrokRoastMode?.(false);
  updateModeUI();
  if (trollMode && api?.getTrollModeOnLine) { playSound('pop'); showBubble(api.getTrollModeOnLine()); }
});
document.getElementById('grok-settings-close')?.addEventListener('click', () => {
  settingsPanel?.setAttribute('hidden', '');
  api?.setSize?.(AVATAR_W, AVATAR_H);
});
document.getElementById('grok-ask-close')?.addEventListener('click', () => {
  askPanel?.setAttribute('hidden', '');
  grokInput.value = '';
  api?.setSize?.(AVATAR_W, AVATAR_H);
});

function showBubble(text, isRed = false, options = {}) {
  if (text) recentLines.push(text);
  while (recentLines.length > 6) recentLines.shift();
  bubble.classList.remove('typing');
  bubble.textContent = text;
  bubble.classList.toggle('redmode', isRed);
  bubble.classList.add('visible');
  bubble.style.display = 'block';
  if (options.sound !== false) playSound(options.sound || 'pop');
  if (options.alertFrame) { setSpriteState('alert'); sprite?.classList.add('grok-shake'); setTimeout(() => sprite?.classList.remove('grok-shake'), 400); }
  if (options.investigateFrame) { setSpriteState('investigate'); sprite?.classList.add('grok-shake'); setTimeout(() => sprite?.classList.remove('grok-shake'), 400); }
  setTimeout(() => {
    bubble.classList.remove('visible');
    setTimeout(() => {
      bubble.style.display = 'none';
      if (options.alertFrame || options.investigateFrame) setSpriteState('idle');
    }, 200);
  }, 3000);
}

function showTypingThenResponse(response, isRed = false) {
  playSound('hmm');
  bubble.classList.add('typing');
  bubble.textContent = 'typing…';
  bubble.classList.toggle('redmode', isRed);
  bubble.style.display = 'block';
  bubble.classList.add('visible');
  const thinkingMs = 400 + Math.random() * 600;
  setTimeout(() => {
    bubble.classList.remove('typing');
    bubble.textContent = response;
    setTimeout(() => {
      bubble.classList.remove('visible');
      setTimeout(() => { bubble.style.display = 'none'; }, 200);
    }, 3000);
  }, thinkingMs);
}

(async () => {
  await refreshVolume();
  await api?.getGrokLines?.();
  const firstOpen = await api?.getGrokFirstOpenDone?.().catch(() => false);
  if (firstOpen && api?.getGreeting) {
    setTimeout(() => { initialSpoken = true; showBubble(api.getGreeting()); }, 400);
  } else if (!firstOpen && api?.getGreetingFirstTime) {
    setTimeout(() => { initialSpoken = true; showBubble(api.getGreetingFirstTime()); }, 400);
    api?.setGrokFirstOpenDone?.(true);
  }
})();

setTimeout(() => {
  if (!initialSpoken && bubble) {
    showBubble('Right-click for actions.', false, { sound: false });
  }
}, 1200);

const grokTipEl = document.getElementById('grok-tip');
const TIP_ROTATE_MS = 25000;
if (grokTipEl && api?.getChangelog) {
  async function showNextTip() {
    try {
      const arr = await api.getChangelog();
      if (Array.isArray(arr) && arr.length) {
        const line = arr[Math.floor(Math.random() * arr.length)];
        grokTipEl.textContent = line;
        grokTipEl.style.display = 'block';
      }
    } catch (_) {}
  }
  showNextTip();
  setInterval(showNextTip, TIP_ROTATE_MS);
}

(async () => {
  try {
    const onTop = await api.getGrokAlwaysOnTop?.();
    grokAlwaysOnTop.checked = !!onTop;
  } catch (_) {}
})();
grokAlwaysOnTop?.addEventListener('change', () => {
  api?.setGrokAlwaysOnTop?.(grokAlwaysOnTop.checked);
});
(async () => {
  try {
    const v = await api.getGrokVolume?.();
    grokVolume.value = Math.round((v ?? 0.4) * 100);
    cachedVolume = v ?? 0.4;
  } catch (_) {}
})();
grokVolume?.addEventListener('input', () => {
  const v = Number(grokVolume.value) / 100;
  cachedVolume = v;
  api?.setGrokVolume?.(v);
});
(async () => {
  try {
    const theme = await api.getGrokTheme?.();
    grokTheme.value = theme === 'amber' ? 'amber' : 'default';
    document.body.dataset.grokTheme = grokTheme.value;
  } catch (_) {}
})();
grokTheme?.addEventListener('change', () => {
  const theme = grokTheme.value;
  document.body.dataset.grokTheme = theme;
  api?.setGrokTheme?.(theme);
});

let dragging = false;
let startScreenX = 0, startScreenY = 0, startX = 0, startY = 0;
let redLoop = null;

buddy.addEventListener('mousedown', async (e) => {
  if (e.button !== 0) return; // only start dragging on left mouse
  if (e.target.closest('.grok-panel') || e.target.closest('#grok-context-menu')) return;
  const bounds = await api?.getBounds?.();
  if (bounds) {
    dragging = true;
    playSound('pop');
    setSpriteState('walk');
    startScreenX = e.screenX;
    startScreenY = e.screenY;
    startX = bounds.x;
    startY = bounds.y;
  }
});

document.addEventListener('mouseup', () => {
  const wasDragging = dragging;
  dragging = false;
  if (wasDragging) {
    setSpriteState('idle');
    buddy.dataset.justDragged = '1';
    playSound('pop');
    api?.dragEnded?.();
  }
});

document.addEventListener('mousemove', (e) => {
  if (!dragging || !api?.setPosition) return;
  const dx = e.screenX - startScreenX;
  const dy = e.screenY - startScreenY;
  api.setPosition(Math.round(startX + dx), Math.round(startY + dy));
});

buddy.addEventListener('click', async (e) => {
  if (e.target.closest('.grok-panel') || e.target.closest('#grok-context-menu')) return;
  if (buddy.dataset.justDragged === '1') {
    delete buddy.dataset.justDragged;
    return;
  }
  if (!api) return;
  const count = (await api.getGrokClickCount?.().catch(() => 0)) + 1;
  await api.setGrokClickCount?.(count);
  const milestoneLine = api.getMilestoneLine?.(count);
  if (milestoneLine) { showBubble(milestoneLine); return; }
  const cat = Math.random() < 0.5 ? 'gangstalking' : 'useless_advice';
  const line = api.getLineFromCategoryAvoidingRecent?.(cat, recentLines) ?? (cat === 'gangstalking' ? api.getGangstalkingLine() : api.getUselessAdvice());
  showBubble(line);
});

grokBtn.addEventListener('click', async () => {
  if (!api) return;
  const options = {};
  if (roastMode) options.roast = true;
  if (trollMode) options.troll = true;
  const response = api.getResponseForInput(grokInput.value, options);
  grokInput.value = '';
  showTypingThenResponse(response);
  askPanel?.setAttribute('hidden', '');
  api?.setSize?.(AVATAR_W, AVATAR_H);
});

grokInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    grokBtn.click();
  }
});

window.addEventListener('redModeToggled', (e) => {
  const enabled = e.detail?.enabled;
  if (enabled) {
    const state = api?.getRedModeState?.();
    const line = api?.getRedModeLineForState?.(state) || "Everything is too red";
    sprite.style.background = 'linear-gradient(135deg, #660000 0%, #330000 100%)';
    sprite.style.borderColor = '#aa0000';
    showBubble(line, true);
    redLoop = setInterval(() => {
      const s = api?.getRedModeState?.();
      const l = api?.getRedModeLineForState?.(s);
      if (l) showBubble(l, true);
    }, 7000 + Math.random() * 4000);
  } else {
    sprite.style.background = '';
    sprite.style.borderColor = '';
    if (redLoop) clearInterval(redLoop);
    const line = api?.getRedModeDisengagedLine?.() || "Red Mode disengaged. My sanity is returning";
    showBubble(line);
  }
});

window.addEventListener('grokRandomComment', () => {
  if (api?.getDramaLine) showBubble(api.getDramaLine());
});

let randomEventTimer = null;
let attentionSeekTimer = null;
let sleepTimer = null;
let lastInteractionAt = Date.now();
const ATTENTION_SEEK_MS = 2 * 60 * 1000;
const SLEEP_AFTER_MS = 5 * 60 * 1000;

function scheduleRandomEvent() {
  if (randomEventTimer) clearTimeout(randomEventTimer);
  (async () => {
    let min = 5000, max = 9000;
    try { min = await api.getGrokRandomIntervalMin(); max = await api.getGrokRandomIntervalMax(); } catch (_) {}
    const delay = min + Math.random() * (max - min);
    randomEventTimer = setTimeout(() => {
      randomEvent();
      scheduleRandomEvent();
    }, delay);
  })();
}

async function randomEvent() {
  if (!api) return;
  if (sprite?.dataset.state === 'sleep') return;
  let toggles = { idle: true, drama: true, goon_alert: true, lolcow_alert: true, investigation: true };
  try { toggles = await api.getGrokCategoryToggles?.() ?? toggles; } catch (_) {}
  const r = Math.random();
  if (r < 0.10 && toggles.idle) { const line = api.getLineAvoidingRecent?.('idle', recentLines); if (line) showBubble(line); }
  else if (r < 0.18 && toggles.drama) { const line = api.getLineAvoidingRecent?.('drama', recentLines); if (line) showBubble(line); }
  else if (r < 0.22 && toggles.goon_alert) { const line = api.getLineAvoidingRecent?.('goon_alert', recentLines); if (line) showBubble(line, false, { sound: 'alert', alertFrame: true }); }
  else if (r < 0.26 && toggles.lolcow_alert) { const line = api.getLineAvoidingRecent?.('lolcow_alert', recentLines); if (line) showBubble(line, false, { sound: 'alert', alertFrame: true }); }
  else if (r < 0.30 && toggles.investigation) { const line = api.getLineAvoidingRecent?.('investigation', recentLines); if (line) showBubble(line, false, { investigateFrame: true }); }
}
scheduleRandomEvent();

function attentionSeek() {
  if (sprite?.dataset.state === 'sleep') return;
  if (Date.now() - lastInteractionAt < ATTENTION_SEEK_MS) return;
  lastInteractionAt = Date.now();
  sprite?.classList.add('grok-jiggle');
  setTimeout(() => sprite?.classList.remove('grok-jiggle'), 600);
  if (api?.getAttentionSeekingLine) showBubble(api.getAttentionSeekingLine());
}

function goSleep() {
  if (sprite?.dataset.state === 'sleep') return;
  if (Date.now() - lastInteractionAt < SLEEP_AFTER_MS) return;
  setSpriteState('idle');
  sprite?.classList.add('grok-sleep');
  sprite?.dataset.state = 'sleep';
}

buddy?.addEventListener('click', () => { lastInteractionAt = Date.now(); if (sprite?.dataset.state === 'sleep') { sprite.classList.remove('grok-sleep'); sprite.dataset.state = 'idle'; setSpriteState('idle'); } });
grokInput?.addEventListener('focus', () => { lastInteractionAt = Date.now(); });
setInterval(() => { attentionSeek(); goSleep(); }, 30000);

let dockCorner = 0;
buddy?.addEventListener('dblclick', async (e) => {
  if (e.target.closest('.grok-panel') || e.target.closest('#grok-context-menu')) return;
  // Alt+double-click to dock, otherwise open the actions menu.
  if (e.altKey) {
    const bounds = await api?.getBounds?.();
    if (!bounds) return;
    const w = AVATAR_W;
    const h = AVATAR_H;
    const screenW = window.screen?.availWidth ?? 1920;
    const screenH = window.screen?.availHeight ?? 1080;
    const screenX = window.screen?.availLeft ?? 0;
    const screenY = window.screen?.availTop ?? 0;
    dockCorner = (dockCorner + 1) % 4;
    const x = dockCorner < 2 ? screenX : screenX + screenW - w;
    const y = dockCorner % 2 === 0 ? screenY : screenY + screenH - h;
    api?.setPosition?.(Math.round(x), Math.round(y));
    return;
  }
  if (!contextMenu) return;
  lastContextMenuAt = Date.now();
  showContextMenu(e.clientX, e.clientY);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (api?.getGoodbyeLine) showBubble(api.getGoodbyeLine(), false, { sound: 'close' });
    api?.close?.();
  }
  if (e.key === KONAMI[konamiIndex]) { konamiIndex++; if (konamiIndex >= KONAMI.length) { konamiIndex = 0; if (api?.getLineFromCategoryAvoidingRecent) showBubble(api.requestLine?.('easter_eggs') ?? api.getLineFromCategoryAvoidingRecent('easter_eggs', recentLines)); playSound('pop'); } }
  else konamiIndex = 0;
});

window.addEventListener('grokAppEvent', (e) => {
  const { type } = e.detail || {};
  if (type === 'profileSwitched' && api?.getDramaLine) showBubble(api.getDramaLine());
  if (type === 'overlayClosed' && api?.getIdleLine) showBubble(api.getIdleLine());
});

