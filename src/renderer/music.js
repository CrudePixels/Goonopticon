import { applyTheme } from './theme.js';
if (typeof window !== 'undefined' && !window.goonAPI && window.parent?.goonAPI) window.goonAPI = window.parent.goonAPI;
applyTheme();

const api = window.goonAPI || window.parent?.goonAPI;
const audio = new Audio();
const video = document.getElementById('video-player');
let trackList = [];
let folderStructure = null;
let currentTabKey = 'root';
function devLogToParent(category, message) {
  try {
    if (window.parent && window.parent !== window)
      window.parent.postMessage({ type: 'goonopticon-devlog', category: category || 'action', message: message || '' }, '*');
  } catch (_) {}
}
let currentIndex = -1;
let currentBlobUrl = null;
let loopTrack = false;
let autoplayNext = true;
let mode = 'music'; // 'music' | 'video'
let videoList = [];
let currentVideoIndex = -1;
let currentVideoBlobUrl = null;

function setMode(nextMode) {
  mode = nextMode === 'video' ? 'video' : 'music';
  const sw = document.getElementById('av-switch');
  const btnMusic = document.getElementById('av-btn-music');
  const btnVideo = document.getElementById('av-btn-video');
  const videoWrap = document.getElementById('video-wrap');
  const musicTabsEl = document.getElementById('music-tabs');
  if (sw) sw.style.display = 'flex';

  if (btnMusic) btnMusic.classList.toggle('active', mode === 'music');
  if (btnVideo) btnVideo.classList.toggle('active', mode === 'video');

  if (mode === 'video') {
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
    audio.pause();
    if (videoWrap) videoWrap.style.display = 'block';
    if (musicTabsEl) musicTabsEl.style.display = 'none';
    if (currentVideoBlobUrl) {
      URL.revokeObjectURL(currentVideoBlobUrl);
      currentVideoBlobUrl = null;
    }
    loadVideoFolderAndRender().catch(() => {});
  } else {
    if (video) video.pause();
    if (currentVideoBlobUrl) {
      URL.revokeObjectURL(currentVideoBlobUrl);
      currentVideoBlobUrl = null;
    }
    if (videoWrap) videoWrap.style.display = 'none';
    if (musicTabsEl) musicTabsEl.style.display = '';
    renderTrackList(trackList);
    if (folderStructure) renderTabs();
  }
  updatePlayButton();
}

async function loadVideoFolderAndRender() {
  const listEl = document.getElementById('track-list');
  if (!api?.videoGetFolder || !api?.videoGetList) {
    if (listEl) listEl.innerHTML = '<p style="opacity:0.6;">Video API not available.</p>';
    return;
  }
  const folder = await api.videoGetFolder();
  const list = (await api.videoGetList(folder)) || [];
  videoList = list;
  if (!listEl) return;
  if (!list.length) {
    listEl.innerHTML = '<p style="opacity:0.6;">No video files in src/video. (mp4, webm, m4v, mov)</p>';
    return;
  }
  listEl.innerHTML = list
    .map((t, i) => `<div class="track-item" data-index="${i}" role="button" tabindex="0">${escapeHtml(t.name)}</div>`)
    .join('');
  listEl.querySelectorAll('.track-item').forEach((el) => {
    el.addEventListener('click', () => playVideo(Number(el.getAttribute('data-index'))));
  });
  currentVideoIndex = -1;
}

async function playVideo(index) {
  if (!video) return;
  if (index < 0 || index >= videoList.length) return;
  currentVideoIndex = index;
  const item = videoList[index];
  if (currentVideoBlobUrl) {
    URL.revokeObjectURL(currentVideoBlobUrl);
    currentVideoBlobUrl = null;
  }
  const data = await api?.videoReadFile?.(item.path);
  if (!data?.buffer) {
    showMusicError('Could not load video');
    return;
  }
  const blob = new Blob([data.buffer], { type: data.mime || 'video/mp4' });
  const url = URL.createObjectURL(blob);
  currentVideoBlobUrl = url;
  video.src = url;
  video.load();
  video.play().catch(() => showMusicError('Could not play video'));
  highlightCurrentVideo();
  devLogToParent('action', 'Video: playing — ' + (item.name || ('video ' + (index + 1))));
}

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateTimeDisplay() {
  const el = document.getElementById('time-display');
  if (!el) return;
  const current = mode === 'video' ? video.currentTime : audio.currentTime;
  const duration = mode === 'video' ? video.duration : audio.duration;
  el.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
}

function updateProgressBar() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  const duration = mode === 'video' ? video.duration : audio.duration;
  const current = mode === 'video' ? video.currentTime : audio.currentTime;
  if (duration && Number.isFinite(duration)) bar.value = (current / duration) * 100;
  updateTimeDisplay();
}

function highlightCurrent() {
  document.querySelectorAll('.track-item').forEach((el, i) => {
    el.classList.toggle('playing', i === currentIndex);
  });
}

function highlightCurrentVideo() {
  document.querySelectorAll('.track-item').forEach((el, i) => {
    el.classList.toggle('playing', i === currentVideoIndex);
  });
}

async function playTrack(index) {
  if (index < 0 || index >= trackList.length) return;
  currentIndex = index;
  const track = trackList[index];
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  const data = await api?.musicReadFile?.(track.path);
  if (!data?.buffer) {
    showMusicError('Could not load track');
    return;
  }
  const blob = new Blob([data.buffer], { type: data.mime || 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  currentBlobUrl = url;
  audio.volume = 1;
  audio.src = url;
  audio.load();
  audio.play().catch((e) => {
    console.warn('Music play failed', e);
    showMusicError('Could not load track');
  });
  highlightCurrent();
  updatePlayButton();
  devLogToParent('action', 'Music: playing — ' + (track.name || ('track ' + (index + 1))));
}

function showMusicError(msg) {
  const listEl = document.getElementById('track-list');
  if (!listEl) return;
  const prev = listEl.querySelector('.music-error-msg');
  if (prev) prev.remove();
  const el = document.createElement('p');
  el.className = 'music-error-msg';
  el.style.cssText = 'margin:8px 0;padding:8px;background:var(--color-error, #4a1515);color:#fff;border-radius:4px;font-size:12px;';
  el.textContent = msg;
  listEl.prepend(el);
  setTimeout(() => el.remove(), 4000);
}

audio.addEventListener('error', () => showMusicError('Could not load track'));

audio.addEventListener('timeupdate', updateProgressBar);
audio.addEventListener('durationchange', updateProgressBar);
audio.addEventListener('ended', () => {
  if (loopTrack && currentIndex >= 0) {
    playTrack(currentIndex);
    return;
  }
  if (autoplayNext && currentIndex >= 0 && currentIndex < trackList.length - 1) {
    playTrack(currentIndex + 1);
    return;
  }
  currentIndex = -1;
  highlightCurrent();
  updateTimeDisplay();
});

video?.addEventListener('ended', () => {
  if (mode !== 'video') return;
  if (loopTrack && currentVideoIndex >= 0) {
    playVideo(currentVideoIndex);
    return;
  }
  if (autoplayNext && currentVideoIndex >= 0 && currentVideoIndex < videoList.length - 1) {
    playVideo(currentVideoIndex + 1);
    return;
  }
  currentVideoIndex = -1;
  highlightCurrentVideo();
});

video?.addEventListener('timeupdate', updateProgressBar);
video?.addEventListener('durationchange', updateProgressBar);
video?.addEventListener('play', updatePlayButton);
video?.addEventListener('pause', updatePlayButton);
video?.addEventListener('error', () => showMusicError('Could not play video'));

function updatePlayButton() {
  const btn = document.getElementById('btn-play');
  if (!btn) return;
  if (mode === 'video') btn.textContent = video?.paused ? '[ > ]' : '[ || ]';
  else btn.textContent = audio.paused ? '[ > ]' : '[ || ]';
}

document.getElementById('btn-play')?.addEventListener('click', () => {
  if (mode === 'video') {
    if (video?.paused) {
      if (currentVideoIndex >= 0) video.play();
      else if (videoList.length) playVideo(0);
    } else {
      video?.pause();
    }
  } else {
    if (audio.paused) {
      if (currentIndex >= 0) audio.play();
      else if (trackList.length) playTrack(0);
    } else {
      audio.pause();
    }
  }
  updatePlayButton();
});
audio.addEventListener('play', updatePlayButton);
audio.addEventListener('pause', updatePlayButton);

document.getElementById('btn-prev')?.addEventListener('click', () => {
  if (mode === 'video') {
    if (currentVideoIndex <= 0) video.currentTime = 0;
    else playVideo(currentVideoIndex - 1);
    return;
  }
  if (currentIndex <= 0) audio.currentTime = 0;
  else playTrack(currentIndex - 1);
});

document.getElementById('btn-next')?.addEventListener('click', () => {
  if (mode === 'video') {
    if (videoList.length === 0) return;
    if (currentVideoIndex < videoList.length - 1) playVideo(currentVideoIndex + 1);
    else playVideo(0);
    return;
  }
  if (trackList.length === 0) return;
  if (currentIndex < trackList.length - 1) playTrack(currentIndex + 1);
  else playTrack(0);
});

document.getElementById('btn-loop')?.addEventListener('click', () => {
  loopTrack = !loopTrack;
  const btn = document.getElementById('btn-loop');
  if (btn) {
    btn.classList.toggle('active', loopTrack);
    btn.textContent = loopTrack ? '[ LOOP* ]' : '[ LOOP ]';
    btn.title = loopTrack ? 'Loop current track (on)' : 'Loop current track';
  }
});

document.getElementById('btn-autoplay')?.addEventListener('click', () => {
  autoplayNext = !autoplayNext;
  const btn = document.getElementById('btn-autoplay');
  if (btn) {
    btn.classList.toggle('active', autoplayNext);
    btn.textContent = autoplayNext ? '[ NEXT ]' : '[ NEXT ]';
    btn.title = autoplayNext ? 'Autoplay next track (on)' : 'Autoplay next track (off)';
  }
});

document.getElementById('progress-bar')?.addEventListener('input', (e) => {
  const pct = Number(e.target.value) / 100;
  if (mode === 'video') {
    if (Number.isFinite(video.duration)) video.currentTime = pct * video.duration;
  } else {
    if (Number.isFinite(audio.duration)) audio.currentTime = pct * audio.duration;
  }
});

function renderTrackList(list) {
  const listEl = document.getElementById('track-list');
  if (!listEl) return;
  if (!list.length) {
    listEl.innerHTML = '<p style="opacity:0.6;">No audio files in this folder. (mp3, wav, ogg, m4a, flac)</p>';
    return;
  }
  listEl.innerHTML = list
    .map(
      (t, i) =>
        `<div class="track-item" data-index="${i}" role="button" tabindex="0">${escapeHtml(t.name)}</div>`
    )
    .join('');
  listEl.querySelectorAll('.track-item').forEach((el) => {
    el.addEventListener('click', () => playTrack(Number(el.getAttribute('data-index'))));
  });
  currentIndex = -1;
  highlightCurrent();
}

function renderTabs() {
  const tabsEl = document.getElementById('music-tabs');
  if (!tabsEl || !folderStructure) return;
  const { tabs, rootTracks } = folderStructure;
  const hasSubfolders = tabs && tabs.length > 0;
  tabsEl.style.display = hasSubfolders ? 'flex' : 'none';
  if (!hasSubfolders) return;
  tabsEl.innerHTML =
    '<button type="button" class="music-tab' + (currentTabKey === 'root' ? ' active' : '') + '" data-tab="root">Root</button>' +
    (tabs || [])
      .map(
        (t) =>
          '<button type="button" class="music-tab' +
          (currentTabKey === t.name ? ' active' : '') +
          '" data-tab="' +
          escapeHtml(t.name) +
          '">' +
          escapeHtml(t.name) +
          '</button>'
      )
      .join('');
  tabsEl.querySelectorAll('.music-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTabKey = btn.getAttribute('data-tab');
      tabsEl.querySelectorAll('.music-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (currentTabKey === 'root') {
        trackList = folderStructure.rootTracks || [];
      } else {
        const tab = (folderStructure.tabs || []).find((t) => t.name === currentTabKey);
        trackList = tab ? tab.tracks : [];
      }
      renderTrackList(trackList);
    });
  });
}

async function loadFolder(folderPath) {
  if (!folderPath || !api?.musicSetFolder) return;
  await api.musicSetFolder(folderPath);
  if (api.musicGetFolderStructure) {
    folderStructure = await api.musicGetFolderStructure(folderPath) || { root: folderPath, tabs: [], rootTracks: [] };
    currentTabKey = 'root';
    trackList = folderStructure.rootTracks || [];
    renderTabs();
  } else {
    folderStructure = null;
    trackList = (await api.musicGetTrackList?.(folderPath)) || [];
  }
  const listEl = document.getElementById('track-list');
  if (!listEl) return;
  renderTrackList(trackList);
  devLogToParent('action', 'Music: folder loaded — ' + (folderStructure ? (folderStructure.rootTracks?.length || 0) + ' in root, ' + (folderStructure.tabs?.length || 0) + ' subfolder(s)' : trackList.length + ' track(s)'));
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

window.addEventListener('pagehide', () => {
  if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
  if (currentVideoBlobUrl) URL.revokeObjectURL(currentVideoBlobUrl);
});

(async () => {
  const pathEl = document.getElementById('folder-path');
  const listEl = document.getElementById('track-list');
  if (!api?.musicGetFolder) {
    if (pathEl) pathEl.textContent = '';
    if (listEl) listEl.innerHTML = '<p style="opacity:0.6;">Music API not available. Try opening Podawful AV HELL from the main window.</p>';
    return;
  }
  const folderPath = await api.musicGetFolder();
  if (folderPath) {
    pathEl.textContent = folderPath;
    await loadFolder(folderPath);
    updatePlayButton();
  }
})();

document.getElementById('av-btn-music')?.addEventListener('click', () => setMode('music'));
document.getElementById('av-btn-video')?.addEventListener('click', () => setMode('video'));
