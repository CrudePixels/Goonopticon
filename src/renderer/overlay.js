import { getTimecode, parseTime } from './utils/urlTime.js';

if (typeof window !== 'undefined' && !window.goonAPI && window.parent?.goonAPI) window.goonAPI = window.parent.goonAPI;

let currentUrl = '';
let notes = [];

const videoUrlEl = document.getElementById('video-url');
const btnLoad = document.getElementById('btn-load');
const btnClose = document.getElementById('btn-close');
const notesListEl = document.getElementById('notes-list');

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return url || '';
  try {
    const u = new URL(url);
    if (!u.hostname.includes('youtube.com') && !u.hostname.includes('youtu.be')) return url;
    u.searchParams.delete('t');
    u.searchParams.delete('start');
    u.searchParams.delete('time_continue');
    return u.toString();
  } catch {
    return url;
  }
}

async function loadForUrl(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return;
  currentUrl = normalized;
  videoUrlEl.value = normalized;
  notes = await window.goonAPI.getNotes(normalized);
  renderNotes();
}

async function jumpToTime(seconds) {
  const connected = await window.goonAPI.bridgeIsConnected();
  if (connected) {
    const sent = await window.goonAPI.bridgeSendSeek(seconds);
    if (sent) return;
  }
  const u = new URL(currentUrl);
  u.searchParams.set('t', String(Math.floor(seconds)));
  window.goonAPI.openExternal(u.toString());
}

function renderNotes() {
  const sorted = [...notes].sort((a, b) => (a.time || 0) - (b.time || 0));
  if (sorted.length === 0) {
    notesListEl.innerHTML = '<div class="overlay-empty">Load a video. Henchmen, the notes await.<br/><small style="opacity:0.7;">For notes beside the video on YouTube, use the Goonopticon browser extension.</small></div>';
    return;
  }
  notesListEl.innerHTML = sorted
    .map(
      (n) => `
    <div class="overlay-item">
      <span class="overlay-item-time">${getTimecode(n.time)}</span>
      <span class="overlay-item-text" title="${escapeHtml(n.text || '')}">${escapeHtml((n.text || '').slice(0, 40))}${(n.text || '').length > 40 ? '…' : ''}</span>
      <button type="button" class="btn-jump" data-time="${n.time}" title="Jump to timestamp">Jump</button>
    </div>
  `
    )
    .join('');
  notesListEl.querySelectorAll('.btn-jump').forEach((btn) => {
    btn.addEventListener('click', () => jumpToTime(Number(btn.dataset.time)));
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

btnLoad.addEventListener('click', async () => {
  const url = videoUrlEl.value.trim();
  if (url) await loadForUrl(url);
});

btnClose.addEventListener('click', () => {
  if (window !== window.top) {
    window.parent.postMessage({ type: 'goonopticon-close-view' }, '*');
  } else {
    window.goonAPI?.closeOverlay?.();
  }
});

(async () => {
  const { applyTheme } = await import('./theme.js');
  await applyTheme();
  const lastUrl = await window.goonAPI.getCurrentVideoUrl?.();
  if (lastUrl) {
    videoUrlEl.value = lastUrl;
    await loadForUrl(lastUrl);
  }
})();
