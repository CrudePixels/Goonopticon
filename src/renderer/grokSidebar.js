/**
 * Erm, Grok — embedded in main window sidebar (always visible when enabled).
 */
import { applyTheme } from './theme.js';
import * as GL from './grokLinesEngine.js';

const api = window.goonAPI;
const gb = api?.grokBuddy;
const widget = document.getElementById('menu-grok-widget');
if (!widget || !gb) {
  if (widget && !gb) widget.style.display = 'none';
} else {
  const buddy = document.getElementById('grok-sb-buddy');
  const bubble = document.getElementById('grok-sb-bubble');
  const sprite = document.getElementById('grok-sb-sprite');
  const spriteImg = document.getElementById('grok-sb-img');
  const grokInput = document.getElementById('grok-sb-input');
  const grokBtn = document.getElementById('grok-sb-send');
  const roastToggle = document.getElementById('grok-sb-roast');
  const trollToggle = document.getElementById('grok-sb-troll');
  const grokTipEl = document.getElementById('grok-sb-tip');

  function schedulePostPaintWork(fn) {
    const runIdle = () => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => fn(), { timeout: 900 });
      } else {
        setTimeout(fn, 1);
      }
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(runIdle));
    } else {
      setTimeout(runIdle, 0);
    }
  }

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
  let cachedVolume = 0.4;
  let roastMode = false;
  let trollMode = false;
  let initialSpoken = false;
  const recentLines = [];
  let bubbleToken = 0;
  let randomEventTimer = null;
  let lastInteractionAt = Date.now();
  const ATTENTION_SEEK_MS = 2 * 60 * 1000;
  const SLEEP_AFTER_MS = 5 * 60 * 1000;

  async function syncEnabledVisibility() {
    try {
      const on = await window.goonAPI.getGrokEnabled?.().catch(() => true);
      widget.style.display = on !== false ? '' : 'none';
    } catch (_) {
      widget.style.display = '';
    }
  }

  async function refreshVolume() {
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
    } else if (state === 'walk' && SPRITES.walk?.length >= 2) {
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
      sprite?.classList.add('grok-sb-shake');
      setTimeout(() => {
        if (token !== bubbleToken) return;
        sprite?.classList.remove('grok-sb-shake');
      }, 400);
    }
    if (options.investigateFrame) {
      setSpriteState('investigate');
      sprite?.classList.add('grok-sb-shake');
      setTimeout(() => {
        if (token !== bubbleToken) return;
        sprite?.classList.remove('grok-sb-shake');
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
    try {
      roastMode = await gb.getGrokRoastMode();
      trollMode = await gb.getGrokTrollMode();
      if (roastToggle) roastToggle.checked = !!roastMode;
      if (trollToggle) trollToggle.checked = !!trollMode;
    } catch (_) {}
  }

  function scheduleRandomEvent() {
    if (randomEventTimer) clearTimeout(randomEventTimer);
    randomEventTimer = null;
    if (widget.style.display === 'none') return;
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
    if (widget.style.display === 'none') return;
    if (sprite?.dataset.state === 'sleep') return;
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
        gb.getGrokTheme?.()
          .then((t) => {
            widget.dataset.grokTheme = t === 'amber' ? 'amber' : 'default';
          })
          .catch(() => {});
        showBubble(GL.getDramaLine());
      });
      return;
    }
    if (type === 'overlayClosed') showBubble(GL.getIdleLine());
  }

  grokBtn?.addEventListener('click', async () => {
    lastInteractionAt = Date.now();
    const options = {};
    if (roastMode) options.roast = true;
    if (trollMode) options.troll = true;
    const response = GL.getResponseForInput(grokInput?.value || '', options);
    if (grokInput) grokInput.value = '';
    showTypingThenResponse(response);
  });

  document.getElementById('grok-sb-random')?.addEventListener('click', () => {
    lastInteractionAt = Date.now();
    pickRandomBuddyLine();
  });

  document.getElementById('grok-sb-overlay')?.addEventListener('click', async () => {
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

  document.getElementById('grok-sb-reload')?.addEventListener('click', async () => {
    await reloadLines();
    showBubble(GL.getReloadAckLine(), false, { sound: 'pop' });
  });

  document.getElementById('grok-sb-popout')?.addEventListener('click', () => {
    api?.openGrokPopout?.();
  });

  grokInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      grokBtn?.click();
    }
  });
  roastToggle?.addEventListener('change', async () => {
    const on = !!roastToggle.checked;
    roastMode = on;
    if (on) {
      trollMode = false;
      if (trollToggle) trollToggle.checked = false;
    }
    await gb.setGrokRoastMode?.(on);
    if (on) await gb.setGrokTrollMode?.(false);
  });
  trollToggle?.addEventListener('change', async () => {
    const on = !!trollToggle.checked;
    trollMode = on;
    if (on) {
      roastMode = false;
      if (roastToggle) roastToggle.checked = false;
    }
    await gb.setGrokTrollMode?.(on);
    if (on) await gb.setGrokRoastMode?.(false);
  });

  buddy?.addEventListener('click', async (e) => {
    if (e.target.closest('.menu-grok-row, .menu-grok-actions')) return;
    lastInteractionAt = Date.now();
    if (sprite?.dataset.state === 'sleep') {
      sprite.classList.remove('grok-sb-sleep');
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

  window.addEventListener('grokRandomComment', () => onGrokRandomComment());
  window.addEventListener('grokAppEvent', (e) => handleGrokAppEvent(e.detail));

  document.addEventListener('keydown', (e) => {
    if (widget.style.display === 'none') return;
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

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (randomEventTimer) {
        clearTimeout(randomEventTimer);
        randomEventTimer = null;
      }
      return;
    }
    void reloadLines();
    scheduleRandomEvent();
  });

  window.__menuGrokReloadSettings = async () => {
    await refreshVolume();
    await loadModes();
    try {
      const theme = await gb.getGrokTheme();
      widget.dataset.grokTheme = theme === 'amber' ? 'amber' : 'default';
    } catch (_) {}
  };

  window.__menuGrokSetEnabled = (on) => {
    widget.style.display = on ? '' : 'none';
    if (!on && randomEventTimer) {
      clearTimeout(randomEventTimer);
      randomEventTimer = null;
    } else if (on && typeof document !== 'undefined' && !document.hidden) scheduleRandomEvent();
  };

  schedulePostPaintWork(() => {
    (async function init() {
      await syncEnabledVisibility();
      await reloadLines();
      await refreshVolume();
      await loadModes();
      try {
        const theme = await gb.getGrokTheme();
        widget.dataset.grokTheme = theme === 'amber' ? 'amber' : 'default';
      } catch (_) {
        widget.dataset.grokTheme = 'default';
      }
      const TIP_ROTATE_MS = 28000;
      if (grokTipEl && gb.getChangelog) {
        async function showNextTip() {
          try {
            const arr = await gb.getChangelog();
            if (Array.isArray(arr) && arr.length) {
              grokTipEl.textContent = arr[Math.floor(Math.random() * arr.length)];
            }
          } catch (_) {}
        }
        setTimeout(() => {
          void showNextTip();
          setInterval(showNextTip, TIP_ROTATE_MS);
        }, 400);
      }
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
  });

  setTimeout(() => {
    if (!initialSpoken && bubble) showBubble('Tip: Random or type below.', false, { sound: false, duration: 4500 });
  }, 1600);

  function attentionSeek() {
    if (sprite?.dataset.state === 'sleep') return;
    if (Date.now() - lastInteractionAt < ATTENTION_SEEK_MS) return;
    lastInteractionAt = Date.now();
    sprite?.classList.add('grok-sb-jiggle');
    setTimeout(() => sprite?.classList.remove('grok-sb-jiggle'), 600);
    showBubble(GL.getAttentionSeekingLine(), false, { duration: 3800 });
  }

  function goSleep() {
    if (sprite?.dataset.state === 'sleep') return;
    if (Date.now() - lastInteractionAt < SLEEP_AFTER_MS) return;
    setSpriteState('idle');
    sprite?.classList.add('grok-sb-sleep');
    sprite.dataset.state = 'sleep';
  }

  setInterval(() => {
    if (widget.style.display === 'none') return;
    attentionSeek();
    goSleep();
  }, 30000);

  grokInput?.addEventListener('focus', () => {
    lastInteractionAt = Date.now();
  });
}
