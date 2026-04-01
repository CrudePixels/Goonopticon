import { applyTheme } from './theme.js';
import * as GL from './grokLinesEngine.js';

if (typeof window !== 'undefined' && !window.goonAPI && window.parent?.goonAPI) {
  window.goonAPI = window.parent.goonAPI;
}

const api = window.goonAPI;
const gb = api?.grokBuddy;

const buddy = document.getElementById('grok-buddy');
const bubble = document.getElementById('grok-bubble');
const sprite = document.getElementById('grok-sprite');
const spriteImg = document.getElementById('grok-sprite-img');
const grokInput = document.getElementById('grok-input');
const grokBtn = document.getElementById('grok-btn');
const grokTipEl = document.getElementById('grok-tip');


const SPRITE_EXT = '.webp';
const SPRITES = {
  idle: [`../grokBuddy/sprites/idle_1${SPRITE_EXT}`, `../grokBuddy/sprites/idle_2${SPRITE_EXT}`],
  walk: [`../grokBuddy/sprites/walk_1${SPRITE_EXT}`, `../grokBuddy/sprites/walk_2${SPRITE_EXT}`],
  alert: [`../grokBuddy/sprites/alert${SPRITE_EXT}`],
  investigate: [`../grokBuddy/sprites/investigate${SPRITE_EXT}`]
};

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

let spriteLoaded = false;
let idleFrame = 0;
let idleInterval = null;
let currentState = 'idle';
let cachedVolume = 0.4;
let roastMode = false;
let trollMode = false;
let initialSpoken = false;
const recentLines = [];
let bubbleToken = 0;

// Grok settings live in Configure Surveillance → Erm, Grok.

async function refreshVolume() {
  if (!gb) return;
  try {
    cachedVolume = await gb.getGrokVolume();
  } catch (_) {}
}

function playSound(name) {
  try {
    const a = new Audio(`../grokBuddy/sounds/${name}.wav`);
    a.volume = Math.max(0, Math.min(1, cachedVolume));
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
  const initialBase = spriteImg.getAttribute('data-initial') || '';
  let pngFallbackTried = false;
  if (initialBase) spriteImg.src = initialBase + SPRITE_EXT;
  spriteImg.onload = () => {
    spriteLoaded = true;
    sprite?.classList.add('has-sprite');
    setSpriteState('idle');
  };
  spriteImg.onerror = () => {
    if (!pngFallbackTried && spriteImg.src.endsWith('.webp')) {
      pngFallbackTried = true;
      spriteImg.src = initialBase + '.png';
      return;
    }
    sprite?.classList.remove('has-sprite');
    spriteLoaded = false;
  };
}

function showBubble(text, isRed = false, options = {}) {
  if (!bubble) return;
  const token = ++bubbleToken;
  if (text) {
    recentLines.push(text);
    while (recentLines.length > 6) recentLines.shift();
  }
  bubble.classList.remove('typing');
  bubble.textContent = text || '';
  bubble.classList.toggle('redmode', isRed);
  bubble.classList.add('visible');
  bubble.style.display = 'block';
  if (options.sound !== false) playSound(options.sound || 'pop');
  if (options.alertFrame) {
    setSpriteState('alert');
    sprite?.classList.add('grok-shake');
    setTimeout(() => {
      if (token !== bubbleToken) return;
      sprite?.classList.remove('grok-shake');
    }, 400);
  }
  if (options.investigateFrame) {
    setSpriteState('investigate');
    sprite?.classList.add('grok-shake');
    setTimeout(() => {
      if (token !== bubbleToken) return;
      sprite?.classList.remove('grok-shake');
    }, 400);
  }
  const hideMs = typeof options.duration === 'number' ? options.duration : 4200;
  setTimeout(() => {
    if (token !== bubbleToken) return;
    bubble.classList.remove('visible');
    setTimeout(() => {
      if (token !== bubbleToken) return;
      bubble.style.display = 'none';
      if (options.alertFrame || options.investigateFrame) setSpriteState('idle');
    }, 200);
  }, hideMs);
}

function showTypingThenResponse(response, isRed = false) {
  if (!bubble) return;
  const token = ++bubbleToken;
  playSound('hmm');
  bubble.classList.add('typing');
  bubble.textContent = 'typing…';
  bubble.classList.toggle('redmode', isRed);
  bubble.style.display = 'block';
  bubble.classList.add('visible');
  const thinkingMs = 400 + Math.random() * 600;
  setTimeout(() => {
    if (token !== bubbleToken) return;
    bubble.classList.remove('typing');
    bubble.textContent = response;
    setTimeout(() => {
      if (token !== bubbleToken) return;
      bubble.classList.remove('visible');
      setTimeout(() => {
        if (token !== bubbleToken) return;
        bubble.style.display = 'none';
      }, 200);
    }, 3800);
  }, thinkingMs);
}

async function reloadLines() {
  if (!gb?.getGrokLines) return;
  const lines = await gb.getGrokLines();
  GL.setGrokLines(lines || {});
}

function pickRandomBuddyLine() {
  const cats = ['idle', 'drama', 'gangstalking', 'useless_advice', 'investigation', 'greeting'];
  const c = cats[Math.floor(Math.random() * cats.length)];
  let line = GL.requestLine(c);
  if (!line) line = GL.getIdleLine();
  showBubble(line, false, { sound: 'pop' });
}

async function loadModes() {
  if (!gb) return;
  try {
    roastMode = await gb.getGrokRoastMode();
    trollMode = await gb.getGrokTrollMode();
  } catch (_) {}
}

let randomEventTimer = null;
let lastInteractionAt = Date.now();
const ATTENTION_SEEK_MS = 2 * 60 * 1000;
const SLEEP_AFTER_MS = 5 * 60 * 1000;

function scheduleRandomEvent() {
  if (!gb) return;
  if (randomEventTimer) clearTimeout(randomEventTimer);
  randomEventTimer = null;
  if (typeof document !== 'undefined' && document.hidden) return;
  (async () => {
    let min = 5000;
    let max = 9000;
    try {
      min = await gb.getGrokRandomIntervalMin();
      max = await gb.getGrokRandomIntervalMax();
    } catch (_) {}
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const delay = lo + Math.random() * Math.max(1000, hi - lo);
    randomEventTimer = setTimeout(() => {
      randomEvent();
      scheduleRandomEvent();
    }, delay);
  })();
}

async function randomEvent() {
  if (!gb || sprite?.dataset.state === 'sleep') return;
  let toggles = { idle: true, drama: true, goon_alert: true, lolcow_alert: true, investigation: true };
  try {
    toggles = (await gb.getGrokCategoryToggles()) ?? toggles;
  } catch (_) {}
  const r = Math.random();
  if (r < 0.1 && toggles.idle) {
    const line = GL.getLineAvoidingRecent('idle', recentLines);
    if (line) showBubble(line, false, { duration: 3800 });
  } else if (r < 0.18 && toggles.drama) {
    const line = GL.getLineAvoidingRecent('drama', recentLines);
    if (line) showBubble(line, false, { duration: 3800 });
  } else if (r < 0.22 && toggles.goon_alert) {
    const line = GL.getLineAvoidingRecent('goon_alert', recentLines);
    if (line) showBubble(line, false, { sound: 'alert', alertFrame: true, duration: 4200 });
  } else if (r < 0.26 && toggles.lolcow_alert) {
    const line = GL.getLineAvoidingRecent('lolcow_alert', recentLines);
    if (line) showBubble(line, false, { sound: 'alert', alertFrame: true, duration: 4200 });
  } else if (r < 0.3 && toggles.investigation) {
    const line = GL.getLineAvoidingRecent('investigation', recentLines);
    if (line) showBubble(line, false, { investigateFrame: true, duration: 4200 });
  }
}

function onGrokRandomComment() {
  showBubble(GL.getDramaLine(), false, { sound: 'alert', alertFrame: true, duration: 4500 });
}

function handleGrokAppEvent(payload) {
  const { type } = payload || {};
  if (type === 'profileSwitched') {
    applyTheme().then(() => {
      gb?.getGrokTheme?.()
        .then((t) => {
          document.body.dataset.grokTheme = t === 'amber' ? 'amber' : 'default';
        })
        .catch(() => {});
      showBubble(GL.getDramaLine());
    });
    return;
  }
  if (type === 'overlayClosed') showBubble(GL.getIdleLine());
}

grokBtn?.addEventListener('click', async () => {
  if (!gb) return;
  lastInteractionAt = Date.now();
  const options = {};
  if (roastMode) options.roast = true;
  if (trollMode) options.troll = true;
  const response = GL.getResponseForInput(grokInput?.value || '', options);
  grokInput && (grokInput.value = '');
  showTypingThenResponse(response);
});

document.getElementById('grok-random-line')?.addEventListener('click', () => {
  lastInteractionAt = Date.now();
  pickRandomBuddyLine();
});

grokInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    grokBtn?.click();
  }
});

// Settings (roast/troll/volume/theme/interval/categories) are managed in Configure Surveillance → Erm, Grok.

document.getElementById('grok-deploy-overlay')?.addEventListener('click', async () => {
  if (!gb) return;
  try {
    await gb.openOverlay?.();
    showBubble('Overlay deployed.', false, { sound: 'pop' });
  } catch (err) {
    const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Overlay failed to open.';
    showBubble(msg, false, { sound: false, duration: 5200 });
    try {
      api?.showToast?.(msg);
    } catch (_) {}
  }
});

document.getElementById('grok-reload-lines')?.addEventListener('click', async () => {
  if (!gb) return;
  await reloadLines();
  showBubble(GL.getReloadAckLine(), false, { sound: 'pop' });
});

buddy?.addEventListener('click', async (e) => {
  if (e.target.closest('.grok-controls')) return;
  lastInteractionAt = Date.now();
  if (!gb) return;
  if (sprite?.dataset.state === 'sleep') {
    sprite.classList.remove('grok-sleep');
    sprite.dataset.state = 'idle';
    setSpriteState('idle');
    return;
  }
  const count = (await gb.getGrokClickCount?.().catch(() => 0)) + 1;
  await gb.setGrokClickCount?.(count);
  const milestoneLine = GL.getMilestoneLine(count);
  if (milestoneLine) {
    showBubble(milestoneLine);
    return;
  }
  const cat = Math.random() < 0.5 ? 'gangstalking' : 'useless_advice';
  const line =
    GL.getLineFromCategoryAvoidingRecent(cat, recentLines) ||
    (cat === 'gangstalking' ? GL.getGangstalkingLine() : GL.getUselessAdvice());
  showBubble(line);
});

window.addEventListener('message', (e) => {
  if (e.data?.type === 'grokRandomComment') onGrokRandomComment();
  if (e.data?.type === 'grokAppEvent') handleGrokAppEvent(e.data.payload);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    grokInput?.blur();
    return;
  }
  const t = e.target;
  if (t && t.nodeType === 1 && typeof t.closest === 'function' && t.closest('input, textarea, select, [contenteditable="true"]')) {
    konamiIndex = 0;
    return;
  }
  if (e.key === KONAMI[konamiIndex]) {
    konamiIndex += 1;
    if (konamiIndex >= KONAMI.length) {
      konamiIndex = 0;
      const eggs = GL.getEasterEggLine() || GL.getDramaLine();
      showBubble(eggs, false, { sound: 'pop' });
    }
  } else {
    konamiIndex = 0;
  }
});

const TIP_ROTATE_MS = 28000;
if (grokTipEl && gb?.getChangelog) {
  async function showNextTip() {
    try {
      const arr = await gb.getChangelog();
      if (Array.isArray(arr) && arr.length) {
        grokTipEl.textContent = arr[Math.floor(Math.random() * arr.length)];
      }
    } catch (_) {}
  }
  showNextTip();
  setInterval(showNextTip, TIP_ROTATE_MS);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (randomEventTimer) {
      clearTimeout(randomEventTimer);
      randomEventTimer = null;
    }
    return;
  }
  if (gb) {
    void reloadLines();
    scheduleRandomEvent();
  }
});

(async function init() {
  await applyTheme();
  if (!gb) {
    const wrap = document.querySelector('.grok-wrap');
    if (wrap) {
      const p = document.createElement('p');
      p.className = 'grok-card';
      p.style.cssText = 'color:var(--color-warning,#ffb000);margin:16px;';
      p.textContent = 'Grok API unavailable — open this tab from the main Goonopticon window.';
      wrap.prepend(p);
    }
    return;
  }
  await reloadLines();
  await refreshVolume();
  await loadModes();
  try {
    const theme = await gb.getGrokTheme();
    document.body.dataset.grokTheme = theme === 'amber' ? 'amber' : 'default';
  } catch (_) {}
  const seenBefore = await gb.getGrokFirstOpenDone?.().catch(() => true);
  if (seenBefore) {
    setTimeout(() => {
      initialSpoken = true;
      showBubble(GL.getGreeting(), false, { duration: 4500 });
    }, 350);
  } else {
    setTimeout(() => {
      initialSpoken = true;
      showBubble(GL.getGreetingFirstTime(), false, { duration: 5000 });
    }, 350);
    await gb.setGrokFirstOpenDone?.(true);
  }
  scheduleRandomEvent();
})();

setTimeout(() => {
  if (!initialSpoken && bubble) showBubble('Tip: try Random line or Ask below.', false, { sound: false, duration: 4500 });
}, 1600);

function attentionSeek() {
  if (sprite?.dataset.state === 'sleep') return;
  if (Date.now() - lastInteractionAt < ATTENTION_SEEK_MS) return;
  lastInteractionAt = Date.now();
  sprite?.classList.add('grok-jiggle');
  setTimeout(() => sprite?.classList.remove('grok-jiggle'), 600);
  showBubble(GL.getAttentionSeekingLine(), false, { duration: 3800 });
}

function goSleep() {
  if (sprite?.dataset.state === 'sleep') return;
  if (Date.now() - lastInteractionAt < SLEEP_AFTER_MS) return;
  setSpriteState('idle');
  sprite?.classList.add('grok-sleep');
  sprite.dataset.state = 'sleep';
}

setInterval(() => {
  attentionSeek();
  goSleep();
}, 30000);

grokInput?.addEventListener('focus', () => {
  lastInteractionAt = Date.now();
});
