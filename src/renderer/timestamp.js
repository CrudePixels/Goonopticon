import { getTimecode, parseTime, generateNoteId, getYouTubeVideoId, ensureAbsoluteUrl } from './utils/urlTime.js';

if (typeof window !== 'undefined' && !window.goonAPI && window.parent?.goonAPI) window.goonAPI = window.parent.goonAPI;

let currentUrl = '';
let notes = [];
let groups = [];
let allTags = [];
let availableTags = [];
let notesLocked = false;
let videoPins = { groups: [], notes: [], tags: [] };
let pinnedGroupNames = new Set();
let pinnedNoteIds = new Set();
let pinnedTagNames = new Set();
let bulkMode = false;
let selectedIds = new Set();
let currentVideoTime = null;
let ytExternalMode = false;
let videoNicknames = {};
let savedVideos = [];
const savedVideoTitleEls = new Map(); // url -> HTMLElement
const HIGHLIGHT_THRESHOLD = 5;

const videoUrlEl = document.getElementById('video-url');
const btnLoad = document.getElementById('btn-load');
const searchEl = document.getElementById('search');
const tagFilterEl = document.getElementById('tag-filter');
const newGroupEl = document.getElementById('new-group');
const btnAddGroup = document.getElementById('btn-add-group');
const groupRenameSelectEl = document.getElementById('group-rename-select');
const btnRenameGroup = document.getElementById('btn-rename-group');

const videoSaveNicknameEl = document.getElementById('video-save-nickname');
const btnSaveVideo = document.getElementById('btn-save-video');

const btnExportCurrentJson = document.getElementById('btn-export-current-json');
const btnExportCurrentCsv = document.getElementById('btn-export-current-csv');
const btnExportCurrentMd = document.getElementById('btn-export-current-md');
const btnExportAllJson = document.getElementById('btn-export-all-json');
const btnManagePins = document.getElementById('btn-manage-pins');
const pinModalEl = document.getElementById('pin-modal');
const pinTypeGroupsBtn = document.getElementById('pin-type-groups');
const pinTypeNotesBtn = document.getElementById('pin-type-notes');
const pinTypeTagsBtn = document.getElementById('pin-type-tags');
const pinPanelGroupsEl = document.getElementById('pin-panel-groups');
const pinPanelNotesEl = document.getElementById('pin-panel-notes');
const pinPanelTagsEl = document.getElementById('pin-panel-tags');
const pinGroupsListEl = document.getElementById('pin-groups-list');
const pinNotesListEl = document.getElementById('pin-notes-list');
const pinTagsListEl = document.getElementById('pin-tags-list');
const btnPinModalClose = document.getElementById('pin-modal-close');
const btnImport = document.getElementById('btn-import');
const importFileEl = document.getElementById('importFile');
const statusEl = document.getElementById('status');
const noteTimeEl = document.getElementById('note-time');
const noteTextEl = document.getElementById('note-text');
const noteTagsEl = document.getElementById('note-tags');
const noteGroupEl = document.getElementById('note-group');
const btnAddNote = document.getElementById('btn-add-note');
const notesListEl = document.getElementById('notes-list');
const videoPlaceholderEl = document.getElementById('video-placeholder');
const videoEmbedEl = document.getElementById('video-embed');

// Edit modals
const groupEditModalEl = document.getElementById('group-edit-modal');
const groupEditNameEl = document.getElementById('group-edit-name');
const btnGroupEditCancel = document.getElementById('group-edit-cancel');
const btnGroupEditSave = document.getElementById('group-edit-save');

const noteEditModalEl = document.getElementById('note-edit-modal');
const noteEditTimeEl = document.getElementById('note-edit-time');
const noteEditGroupEl = document.getElementById('note-edit-group');
const noteEditTextEl = document.getElementById('note-edit-text');
const noteEditTagsEl = document.getElementById('note-edit-tags');
const btnNoteEditCancel = document.getElementById('note-edit-cancel');
const btnNoteEditSave = document.getElementById('note-edit-save');

function getEmbedUrl(url, startSeconds = 0) {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  const u = new URL('https://www.youtube-nocookie.com/embed/' + id);
  u.searchParams.set('autoplay', '0');
  if (startSeconds > 0) u.searchParams.set('start', String(Math.floor(startSeconds)));
  return u.toString();
}

function setVideoEmbed(url, startSeconds = 0) {
  if (!videoPlaceholderEl || !videoEmbedEl) return;
  const src = url ? getEmbedUrl(ensureAbsoluteUrl(url), startSeconds) : null;
  if (!src) {
    videoPlaceholderEl.style.display = '';
    videoEmbedEl.style.display = 'none';
    videoEmbedEl.removeAttribute('src');
    return;
  }
  videoPlaceholderEl.style.display = 'none';
  videoEmbedEl.style.display = 'block';
  videoEmbedEl.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  videoEmbedEl.setAttribute('allowfullscreen', '');
  videoEmbedEl.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  videoEmbedEl.src = src;
}

function setStatus(msg, ok = true) {
  statusEl.textContent = msg;
  statusEl.style.color = ok ? '' : 'var(--color-error, var(--hud-accent-amber))';
  if (msg) setTimeout(() => { statusEl.textContent = ''; }, 3000);
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return url || '';
  try {
    const u = new URL(ensureAbsoluteUrl(url));
    if (!u.hostname.includes('youtube.com') && !u.hostname.includes('youtu.be')) return url;
    u.searchParams.delete('t');
    u.searchParams.delete('start');
    u.searchParams.delete('time_continue');
    return u.toString();
  } catch {
    return url;
  }
}

function urlWithTimestamp(url, seconds) {
  if (!url || seconds == null) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      u.searchParams.set('t', String(Math.floor(seconds)));
    } else if (u.hostname.includes('youtube.com')) {
      u.searchParams.set('t', String(Math.floor(seconds)));
    }
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
  await window.goonAPI.addRecentUrl(normalized);
  await window.goonAPI.setCurrentVideoUrl(normalized);
  notes = await window.goonAPI.getNotes(normalized);
  groups = await window.goonAPI.getGroups(normalized);
  availableTags = await window.goonAPI?.timecodeGetVideoTags?.(normalized).catch(() => []);
  const noteTags = Array.isArray(notes) ? notes.flatMap((n) => n.tags || []) : [];
  allTags = [...new Set([...(availableTags || []), ...noteTags])];
  setVideoEmbed(normalized);
  notesLocked = await window.goonAPI.getNotesLocked?.() ?? false;
  videoPins = await window.goonAPI?.timecodeGetVideoPins?.(normalized).catch(() => ({ groups: [], notes: [], tags: [] })) || { groups: [], notes: [], tags: [] };
  pinnedGroupNames = new Set(videoPins?.groups || []);
  pinnedNoteIds = new Set(videoPins?.notes || []);
  pinnedTagNames = new Set(videoPins?.tags || []);
  setStatus('');
  renderNotes();
  renderGroupSelect();
  renderTagFilter();
  renderRecentUrls();
  updateLockUI();
  updateBulkUI();
  await refreshSavedVideosList();
  if (videoSaveNicknameEl) {
    const nick = (videoNicknames && typeof videoNicknames === 'object' ? videoNicknames[currentUrl] : '') || '';
    videoSaveNicknameEl.value = nick || '';
  }
}

async function renderRecentUrls() {
  const urls = await window.goonAPI.getRecentUrls();
  const datalist = document.getElementById('recent-urls');
  if (!datalist) return;
  datalist.innerHTML = urls.map((u) => `<option value="${escapeHtml(u)}">`).join('');
}

function getVideoTitleCacheKey(normUrl) {
  return 'goonopticon_timecode_videoTitle:' + normUrl;
}

function getCachedVideoTitle(normUrl) {
  try { return window.localStorage?.getItem(getVideoTitleCacheKey(normUrl)); } catch { return null; }
}

function setCachedVideoTitle(normUrl, title) {
  try { window.localStorage?.setItem(getVideoTitleCacheKey(normUrl), title); } catch (_) {}
}

async function refreshSavedVideosList() {
  const listEl = document.getElementById('saved-videos-list');
  const summaryEl = document.getElementById('saved-videos-summary');
  if (!listEl || !summaryEl) return;

  const allNotes = await window.goonAPI?.getAllNotes?.().catch(() => ({})) || {};
  videoNicknames = await window.goonAPI?.getVideoNicknames?.().catch(() => ({})) || {};

  const noteUrls = Object.keys(allNotes).filter((u) => Array.isArray(allNotes[u]) && allNotes[u].length > 0);
  const nicknameUrls = Object.keys(videoNicknames || {});
  const urlSet = new Set([...noteUrls, ...nicknameUrls]);
  const urls = [...urlSet];
  urls.sort((a, b) => {
    const aNorm = normalizeUrl(a) || a;
    const bNorm = normalizeUrl(b) || b;
    const aCur = aNorm === currentUrl ? 1 : 0;
    const bCur = bNorm === currentUrl ? 1 : 0;
    if (aCur !== bCur) return bCur - aCur;

    const aNotes = allNotes[a]?.length || allNotes[aNorm]?.length || 0;
    const bNotes = allNotes[b]?.length || allNotes[bNorm]?.length || 0;
    if (aNotes !== bNotes) return bNotes - aNotes;
    return aNorm.localeCompare(bNorm);
  });

  savedVideos = urls.map((url) => {
    const normKey = normalizeUrl(url) || url;
    return { url, notesCount: allNotes[url]?.length || allNotes[normKey]?.length || 0 };
  });

  summaryEl.textContent = `Saved videos (${savedVideos.length})`;
  listEl.innerHTML = savedVideos
    .map((v) => {
      const normKey = normalizeUrl(v.url) || v.url;
      const directNick = (videoNicknames && typeof videoNicknames === 'object' ? videoNicknames[v.url] : '') || '';
      const nick = directNick || ((videoNicknames && typeof videoNicknames === 'object' ? videoNicknames[normKey] : '') || '');
      const isCurrent = normKey === currentUrl;
      return `
        <div class="saved-video-row" data-url="${escapeHtml(v.url)}">
          <button type="button" class="hud-btn btn-open-video" data-url="${escapeHtml(v.url)}">${isCurrent ? 'Current' : 'Open'}</button>
          <div class="saved-video-title">${escapeHtml(isCurrent ? 'Loading title…' : 'Loading title…')}</div>
          <input type="text" class="saved-video-nickname" placeholder="Nickname" value="${escapeHtml(nick)}" />
        </div>
      `.trim();
    })
    .join('');

  savedVideoTitleEls.clear();
  listEl.querySelectorAll('.saved-video-row').forEach((row) => {
    const url = row.getAttribute('data-url') || '';
    const normKey = normalizeUrl(url) || url;
    const titleEl = row.querySelector('.saved-video-title');
    if (titleEl) savedVideoTitleEls.set(normKey, titleEl);

    const openBtn = row.querySelector('.btn-open-video');
    if (openBtn) {
      openBtn.addEventListener('click', async () => {
        const rawUrl = openBtn.getAttribute('data-url') || url;
        if (!rawUrl) return;
        await loadForUrl(rawUrl);
      });
    }

    const nickInput = row.querySelector('.saved-video-nickname');
    if (nickInput) {
      let lastNick = String(nickInput.value || '');
      const saveNick = async () => {
        const next = String(nickInput.value || '').trim().slice(0, 64);
        if (next === lastNick) return;
        lastNick = next;
        await window.goonAPI?.setVideoNickname?.(url, next);
        videoNicknames[normKey] = next;
      };
      nickInput.addEventListener('blur', saveNick);
      nickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          nickInput.blur();
        }
      });
    }
  });

  // Resolve titles after the UI is built (async, cached)
  for (const v of savedVideos) {
    const normKey = normalizeUrl(v.url) || v.url;
    const cached = getCachedVideoTitle(normKey);
    if (cached) {
      const el = savedVideoTitleEls.get(normKey);
      if (el) el.textContent = cached;
      continue;
    }
    const r = await window.goonAPI?.timecodeGetVideoTitle?.(v.url).catch(() => null);
    const title = (r && typeof r.title === 'string' && r.title.trim()) ? r.title.trim() : '';
    const finalTitle = title || v.url;
    setCachedVideoTitle(normKey, finalTitle);
    const el = savedVideoTitleEls.get(normKey);
    if (el) el.textContent = finalTitle;
  }
}

function renderGroupSelect() {
  const sorted = [...groups].sort((a, b) => a.localeCompare(b));
  noteGroupEl.innerHTML = '<option value="">-- No group --</option>';
  sorted.forEach((g) => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    noteGroupEl.appendChild(opt);
  });
}

function updateLockUI() {
  const btn = document.getElementById('btn-lock');
  const groupsAdd = document.getElementById('groups-add-details');
  const addNoteDetails = document.getElementById('add-note-details');
  if (btn) {
    btn.textContent = notesLocked ? 'Unlock' : 'Lock';
    btn.classList.toggle('btn-active', notesLocked);
  }
  if (groupsAdd) groupsAdd.style.display = notesLocked ? 'none' : '';
  if (addNoteDetails) addNoteDetails.style.display = notesLocked ? 'none' : '';
}

function updateBulkUI() {
  const bar = document.getElementById('bulk-actions-bar');
  const btn = document.getElementById('btn-bulk');
  if (bar) bar.classList.toggle('visible', bulkMode);
  if (btn) btn.classList.toggle('btn-active', bulkMode);
  const countEl = document.getElementById('bulk-count');
  if (countEl) countEl.textContent = `${selectedIds.size} selected`;
  renderNotes();
}

function renderTagFilter() {
  tagFilterEl.innerHTML = '<option value="">All tags</option>';
  allTags.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = pinnedTagNames.has(t) ? `📌 ${t}` : t;
    tagFilterEl.appendChild(opt);
  });
}

function filterNotes() {
  const search = searchEl.value.trim().toLowerCase();
  const tagFilter = tagFilterEl.value;
  return notes.filter((n) => {
    if (search && !(n.text || '').toLowerCase().includes(search)) return false;
    if (tagFilter && !(n.tags || []).includes(tagFilter)) return false;
    return true;
  });
}

function getOrderedGroupNames() {
  const pinnedFirst = groups.filter((g) => pinnedGroupNames.has(g));
  const rest = groups.filter((g) => !pinnedGroupNames.has(g)).sort((a, b) => a.localeCompare(b));
  return [...pinnedFirst, ...rest];
}

function renderNotes() {
  const filtered = filterNotes();
  if (filtered.length === 0) {
    notesListEl.innerHTML = '<div class="empty">No notes yet. Add one above.</div>';
    return;
  }
  const locked = notesLocked;
  const bulk = bulkMode;
  const highlight = (n) => currentVideoTime != null && Math.abs((n.time || 0) - currentVideoTime) <= HIGHLIGHT_THRESHOLD;
  const byGroup = new Map();
  byGroup.set('', []); // Ungrouped
  filtered.forEach((n) => {
    const g = n.group || '';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(n);
  });
  const orderedGroups = getOrderedGroupNames();
  orderedGroups.forEach((g) => { if (!byGroup.has(g)) byGroup.set(g, []); });
  const orderedSet = new Set(orderedGroups);
  const extraGroups = [...byGroup.keys()].filter((g) => g !== '' && !orderedSet.has(g)).sort((a, b) => a.localeCompare(b));
  const groupOrder = ['', ...orderedGroups, ...extraGroups];
  const html = groupOrder
    .map((groupName) => {
      const groupNotes = (byGroup.get(groupName) || []).slice().sort((a, b) => (a.time || 0) - (b.time || 0));
      const label = groupName === '' ? 'Ungrouped' : groupName;
      const canDragGroup = !locked && groupName !== '';
      const labelDragClass = canDragGroup ? 'group-header-draggable' : '';
      const isPinnedGroup = pinnedGroupNames.has(groupName);
      const pinnedClass = isPinnedGroup ? 'group-header-pinned' : '';
      const headerActions =
        !locked && groupName
          ? `<span class="group-header-actions">
              <button type="button" class="note-action-btn btn-edit-group-row" data-group="${escapeHtml(groupName)}" title="Edit group" draggable="false">✏️</button>
              <button type="button" class="note-action-btn btn-delete-group-row" data-group="${escapeHtml(groupName)}" title="Delete group" draggable="false">🗑️</button>
            </span>`
          : '';
      const headerHtml = `<div class="group-container-header ${pinnedClass}" data-group-name="${escapeHtml(groupName)}" data-group-label="${escapeHtml(label)}"><span class="group-header-label ${labelDragClass}" draggable="${canDragGroup}">${escapeHtml(label)}</span>${headerActions}</div>`;
      const notesHtml = groupNotes
        .map((n) => {
          const isHighlight = highlight(n);
          const checked = selectedIds.has(n.id);
          const isPinned = pinnedNoteIds.has(n.id);
          const pinnedTagsOnNote = Array.isArray(n.tags) && n.tags.some((t) => pinnedTagNames.has(t));
          const noteClass = ['note-item', isHighlight ? 'note-item-highlight' : '', isPinned ? 'note-item-pinned' : '', !locked ? 'draggable' : ''].filter(Boolean).join(' ');
          return `
    <div class="${noteClass}" data-id="${n.id}" data-time="${n.time}" data-group-name="${escapeHtml(n.group || '')}" draggable="${!locked}">
      ${bulk ? `<input type="checkbox" class="note-bulk-cb" data-id="${n.id}" ${checked ? 'checked' : ''} />` : ''}
      <span class="note-time" contenteditable="${!locked}" data-id="${n.id}" data-field="time" data-time="${n.time}" title="Timecode (e.g., 1:23 or 1:23:45)">${getTimecode(n.time)}</span>
      <div class="note-content">
        <div class="note-text" contenteditable="${!locked}" data-id="${n.id}" data-field="text">${escapeHtml(n.text || '')}</div>
        <div class="note-meta">
            <span
              class="note-tags${pinnedTagsOnNote ? ' note-tags-pinned' : ''}"
            contenteditable="${!locked}"
            data-id="${n.id}"
            data-field="tags"
            title="Tags (comma-separated)"
          >${escapeHtml((n.tags || []).join(', '))}</span>
        </div>
      </div>
      <div class="note-actions">
        ${!locked ? `<button type="button" class="note-action-btn btn-copy-url" data-time="${n.time}" title="Copy timestamp URL" draggable="false">📋</button>
        <button type="button" class="note-action-btn btn-edit-note" data-id="${n.id}" title="Edit note" draggable="false">✏️</button>
        <button type="button" class="note-action-btn btn-delete" data-id="${n.id}" title="Delete" draggable="false">🗑️</button>` : ''}
      </div>
    </div>`;
        })
        .join('');
      return `<div class="group-container" data-group-name="${escapeHtml(groupName)}">${headerHtml}<div class="group-container-notes">${notesHtml}</div></div>`;
    })
    .join('');
  notesListEl.innerHTML = html;
  notesListEl.querySelectorAll('.note-item').forEach((row) => {
    const seek = () => {
      const t = Number(row.dataset.time);
      if (Number.isFinite(t)) jumpToTime(t);
    };
    if (locked) {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.note-actions')) return;
        seek();
      });
    } else {
      row.querySelector('.note-time')?.addEventListener('click', (e) => {
        e.stopPropagation();
        seek();
      });
    }
  });
  notesListEl.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); deleteNote(btn.dataset.id); });
  });
  notesListEl.querySelectorAll('.btn-edit-note').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openEditNoteModal(btn.dataset.id, 'text');
    });
  });
  notesListEl.querySelectorAll('.btn-edit-group-row').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const g = btn.dataset.group || '';
      openEditGroupModal(g);
    });
  });
  notesListEl.querySelectorAll('.btn-delete-group-row').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const g = btn.dataset.group || '';
      if (!g) return;
      if (!confirm(`Delete group "${g}" and remove it from all notes?`)) return;
      await deleteGroupByName(g);
    });
  });
  notesListEl.querySelectorAll('.btn-copy-url').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); copyTimestampUrl(Number(btn.dataset.time)); });
  });
  notesListEl.querySelectorAll('.note-bulk-cb').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedIds.add(cb.dataset.id);
      else selectedIds.delete(cb.dataset.id);
      document.getElementById('bulk-count').textContent = `${selectedIds.size} selected`;
    });
  });
  notesListEl.querySelectorAll('.note-time[contenteditable="true"]').forEach((el) => {
    el.addEventListener('blur', () => saveNoteEdit(el.dataset.id, 'time', el.textContent));
  });
  notesListEl.querySelectorAll('.note-text[contenteditable="true"]').forEach((el) => {
    el.addEventListener('blur', () => saveNoteEdit(el.dataset.id, 'text', el.textContent));
  });
  notesListEl.querySelectorAll('.note-tags[contenteditable="true"]').forEach((el) => {
    el.addEventListener('blur', () => saveNoteEdit(el.dataset.id, 'tags', el.textContent));
  });
  if (!locked) setupDragAndDrop();
}

let dragSource = null;
let dragType = null;

function setupDragAndDrop() {
  notesListEl.querySelectorAll('.group-header-draggable').forEach((labelEl) => {
    const header = labelEl.closest('.group-container-header');
    if (!header) return;
    labelEl.addEventListener('dragstart', (e) => {
      dragSource = header;
      dragType = 'group';
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', header.dataset.groupName || '');
      header.classList.add('dragging');
    });
    labelEl.addEventListener('dragend', () => {
      header.classList.remove('dragging');
      dragSource = null;
      dragType = null;
      notesListEl.querySelectorAll('.group-container-header.drag-over, .group-container-notes.drag-over').forEach((el) => el.classList.remove('drag-over'));
    });
  });
  notesListEl.querySelectorAll('.note-item.draggable').forEach((noteEl) => {
    noteEl.addEventListener('dragstart', (e) => {
      // Don't start a drag when user is interacting with actions or editing fields.
      const target = e.target;
      if (target && (target.closest?.('.note-actions') || target.closest?.('[contenteditable="true"]'))) {
        e.preventDefault();
        return;
      }
      dragSource = noteEl;
      dragType = 'note';
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', noteEl.dataset.id || '');
      noteEl.classList.add('dragging');
    });
    noteEl.addEventListener('dragend', () => {
      noteEl.classList.remove('dragging');
      dragSource = null;
      dragType = null;
      notesListEl.querySelectorAll('.group-container-header.drag-over, .group-container-notes.drag-over').forEach((el) => el.classList.remove('drag-over'));
    });
  });
  notesListEl.querySelectorAll('.group-container-header').forEach((header) => {
    header.addEventListener('dragover', (e) => {
      if (dragType !== 'group' && dragType !== 'note') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      header.classList.add('drag-over');
    });
    header.addEventListener('dragleave', () => header.classList.remove('drag-over'));
    header.addEventListener('drop', (e) => {
      e.preventDefault();
      header.classList.remove('drag-over');
      if (dragType === 'group' && dragSource && dragSource !== header) {
        const fromName = dragSource.dataset.groupName;
        const toName = header.dataset.groupName;
        if (fromName && toName !== undefined && fromName !== toName) reorderGroups(fromName, toName);
      } else if (dragType === 'note' && dragSource && dragSource.dataset.id) {
        const noteId = dragSource.dataset.id;
        const targetGroup = header.getAttribute('data-group-name') ?? '';
        moveNoteToGroup(noteId, targetGroup);
      }
    });
  });
}

async function reorderGroups(fromGroupName, toGroupName) {
  if (!currentUrl || fromGroupName === '') return;
  const order = getOrderedGroupNames();
  const fromIdx = order.indexOf(fromGroupName);
  const toIdx = toGroupName === '' ? -1 : order.indexOf(toGroupName);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
  const newOrder = order.filter((g) => g !== fromGroupName);
  newOrder.splice(toIdx, 0, fromGroupName);
  groups = newOrder.filter(Boolean);
  await window.goonAPI.setGroups(currentUrl, groups);
  renderGroupSelect();
  renderNotes();
}

async function moveNoteToGroup(noteId, groupName) {
  if (!currentUrl) return;
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;
  await window.goonAPI.updateNote(currentUrl, noteId, { ...note, group: groupName || undefined });
  const i = notes.findIndex((n) => n.id === noteId);
  if (i >= 0) notes[i] = { ...notes[i], group: groupName || undefined };
  renderNotes();
}

// (prompt-based editor removed; now uses modal)

function isValidTimeFormat(str) {
  if (!str || typeof str !== 'string') return true;
  const trimmed = str.trim();
  if (!trimmed) return true;
  if (!/^[\d:]+$/.test(trimmed)) return false;
  return /^(\d+|\d+:\d+|\d+:\d+:\d+)$/.test(trimmed);
}

async function saveNoteEdit(noteId, field, value) {
  if (!currentUrl) return;
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;
  if (field === 'time') {
    if (!isValidTimeFormat(value)) {
      setStatus('Invalid timestamp format. Use format like 1:23 or 1:23:45', false);
      renderNotes();
      return;
    }
  }
  const updated = { ...note };
  if (field === 'text') updated.text = value.trim();
  if (field === 'time') updated.time = parseTime(value);
  if (field === 'tags') {
    const raw = String(value || '')
      .replace(/[\n\r;]/g, ',')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    updated.tags = Array.from(new Set(raw));
  }
  await window.goonAPI.updateNote(currentUrl, noteId, updated);
  const i = notes.findIndex((n) => n.id === noteId);
  if (i >= 0) notes[i] = updated;
  if (field === 'tags') {
    availableTags = [...new Set([...(availableTags || []), ...(updated.tags || [])])];
    await window.goonAPI?.timecodeSetVideoTags?.(currentUrl, availableTags).catch(() => {});
    const noteTags = notes.flatMap((n) => n.tags || []);
    allTags = [...new Set([...(availableTags || []), ...noteTags])];
    renderTagFilter();
  }
  renderNotes();
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function timeToInputString(seconds) {
  const n = Number(seconds);
  return Number.isFinite(n) ? getTimecode(n) : '';
}

function parseTagsInput(str) {
  return String(str || '')
    .replace(/[\n\r;]/g, ',')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 200);
}

function openModal(el) {
  if (!el) return;
  el.style.display = 'flex';
}

function closeModal(el) {
  if (!el) return;
  el.style.display = 'none';
}

let editingGroupOldName = '';
function openEditGroupModal(groupName) {
  if (!groupEditModalEl || !groupEditNameEl) return;
  editingGroupOldName = String(groupName || '');
  groupEditNameEl.value = editingGroupOldName;
  openModal(groupEditModalEl);
  setTimeout(() => groupEditNameEl.focus(), 0);
}

let editingNoteId = '';
function fillNoteEditGroupOptions(selected) {
  if (!noteEditGroupEl) return;
  const opts = ['<option value="">Ungrouped</option>'];
  groups
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .forEach((g) => {
      const sel = g === selected ? ' selected' : '';
      opts.push(`<option value="${escapeHtml(g)}"${sel}>${escapeHtml(g)}</option>`);
    });
  noteEditGroupEl.innerHTML = opts.join('');
  if (selected && groups.includes(selected)) noteEditGroupEl.value = selected;
  if (!selected) noteEditGroupEl.value = '';
}

function openEditNoteModal(noteId, focusField = 'text') {
  if (!noteEditModalEl) return;
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;
  editingNoteId = noteId;
  if (noteEditTimeEl) noteEditTimeEl.value = timeToInputString(note.time ?? 0);
  if (noteEditTextEl) noteEditTextEl.value = String(note.text || '');
  if (noteEditTagsEl) noteEditTagsEl.value = (Array.isArray(note.tags) ? note.tags : []).join(', ');
  fillNoteEditGroupOptions(note.group || '');
  openModal(noteEditModalEl);
  setTimeout(() => {
    const el =
      focusField === 'tags' ? noteEditTagsEl :
      focusField === 'time' ? noteEditTimeEl :
      focusField === 'group' ? noteEditGroupEl :
      noteEditTextEl;
    el?.focus?.();
    if (el && typeof el.select === 'function') el.select();
  }, 0);
}

async function jumpToTime(seconds) {
  const connected = await window.goonAPI.bridgeIsConnected();
  if (connected) {
    const sent = await window.goonAPI.bridgeSendSeek(seconds);
    if (sent) return;
  }
  if (currentUrl && getYouTubeVideoId(currentUrl)) {
    const ytUrl = urlWithTimestamp(currentUrl, seconds);
    if (ytExternalMode && ytUrl) {
      window.goonAPI.openExternal(ytUrl);
      return;
    }
    setVideoEmbed(currentUrl, seconds);
    return;
  }
  const url = urlWithTimestamp(currentUrl, seconds);
  if (url) window.goonAPI.openExternal(url);
}

async function copyTimestampUrl(seconds) {
  if (!currentUrl) return;
  const url = urlWithTimestamp(currentUrl, seconds);
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    setStatus('URL copied.');
    window.goonAPI?.showToast?.('Timestamp URL copied');
  } catch {
    setStatus('Failed to copy URL.', false);
  }
}

async function addNote() {
  if (!currentUrl) {
    const url = videoUrlEl.value.trim();
    if (!url) return;
    await loadForUrl(url);
  }
  const timeStr = noteTimeEl.value.trim();
  const text = noteTextEl.value.trim();
  const tagsStr = noteTagsEl.value.trim();
  const group = noteGroupEl.value || undefined;
  if (!text) return;
  const time = parseTime(timeStr);
  const tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const note = {
    id: generateNoteId(),
    text,
    time,
    group: group || undefined,
    tags
  };
  await window.goonAPI.addNote(currentUrl, note);
  notes.push(note);
  availableTags = [...new Set([...(availableTags || []), ...tags])];
  await window.goonAPI?.timecodeSetVideoTags?.(currentUrl, availableTags).catch(() => {});
  const noteTags = notes.flatMap((n) => n.tags || []);
  allTags = [...new Set([...(availableTags || []), ...noteTags])];
  renderNotes();
  renderTagFilter();
  noteTextEl.value = '';
  noteTimeEl.value = '';
  noteTagsEl.value = '';
}

async function deleteNote(noteId) {
  if (!currentUrl) return;
  await window.goonAPI.deleteNote(currentUrl, noteId);
  notes = notes.filter((n) => n.id !== noteId);
  const noteTags = notes.flatMap((n) => n.tags || []);
  allTags = [...new Set([...(availableTags || []), ...noteTags])];
  renderNotes();
  renderTagFilter();
}

async function addGroup() {
  const name = newGroupEl.value.trim();
  if (!name) return;
  if (!currentUrl) {
    const url = videoUrlEl.value.trim();
    if (!url) { setStatus('Henchmen, load a video first.', false); return; }
    await loadForUrl(url);
  }
  await window.goonAPI.addGroup(currentUrl, name);
  groups.push(name);
  newGroupEl.value = '';
  renderGroupSelect();
  setStatus(`Group "${name}" added.`);
}

async function renameGroupByName(oldName, nextName) {
  if (!currentUrl) return;
  if (!oldName || !nextName) return;
  const newName = String(nextName).trim();
  if (!newName || newName === oldName) return;
  if (groups.includes(newName)) { setStatus('Group name already exists.', false); return; }

  for (const n of notes) {
    if ((n.group || '') !== oldName) continue;
    await window.goonAPI.updateNote(currentUrl, n.id, { ...n, group: newName });
    n.group = newName;
  }

  try { await window.goonAPI.renameGroup?.(currentUrl, oldName, newName); } catch (_) {}
  groups = groups.map((g) => (g === oldName ? newName : g));

  if (pinnedGroupNames.has(oldName)) {
    pinnedGroupNames.delete(oldName);
    pinnedGroupNames.add(newName);
    videoPins.groups = Array.from(pinnedGroupNames);
    await window.goonAPI?.timecodeSetVideoPins?.(currentUrl, videoPins).catch(() => {});
  }

  renderGroupSelect();
  renderNotes();
}

async function deleteGroupByName(groupName) {
  if (!currentUrl) return;
  const g = String(groupName || '').trim();
  if (!g) return;
  if (!groups.includes(g)) return;

  try { await window.goonAPI.deleteGroup?.(currentUrl, g); } catch (_) {}
  groups = groups.filter((x) => x !== g);

  // Move all notes out of this group (Ungrouped).
  for (const n of notes) {
    if ((n.group || '') !== g) continue;
    await window.goonAPI.updateNote(currentUrl, n.id, { ...n, group: undefined });
    n.group = undefined;
  }

  if (pinnedGroupNames.has(g)) {
    pinnedGroupNames.delete(g);
    videoPins.groups = Array.from(pinnedGroupNames);
    await window.goonAPI?.timecodeSetVideoPins?.(currentUrl, videoPins).catch(() => {});
  }

  renderGroupSelect();
  renderNotes();
}

async function renameSelectedGroup() {
  if (!currentUrl) { setStatus('Load a video first.', false); return; }
  if (!groupRenameSelectEl) return;
  const oldName = groupRenameSelectEl.value;
  if (!oldName) return;

  const nextNameRaw = prompt('Rename group:', oldName);
  if (nextNameRaw == null) return;
  const nextName = String(nextNameRaw).trim();
  if (!nextName || nextName === oldName) return;
  if (groups.includes(nextName)) { setStatus('That group name already exists.', false); return; }

  // Update note.group strings first so the UI stays consistent.
  for (const n of notes) {
    if ((n.group || '') !== oldName) continue;
    await window.goonAPI.updateNote(currentUrl, n.id, { ...n, group: nextName });
    n.group = nextName;
  }

  await window.goonAPI.renameGroup?.(currentUrl, oldName, nextName).catch(() => {});
  if (pinnedGroupNames.has(oldName)) {
    pinnedGroupNames.delete(oldName);
    pinnedGroupNames.add(nextName);
    videoPins.groups = Array.from(pinnedGroupNames);
    await window.goonAPI?.timecodeSetVideoPins?.(currentUrl, videoPins).catch(() => {});
  }

  groups = groups.map((g) => (g === oldName ? nextName : g));

  renderGroupSelect();
  renderNotes();

  groupRenameSelectEl.value = '';
  setStatus(`Group renamed: "${oldName}" → "${nextName}".`);
}

async function saveCurrentVideoToList() {
  const urlRaw = (currentUrl || videoUrlEl.value || '').trim();
  const url = currentUrl ? currentUrl : normalizeUrl(urlRaw);
  if (!url) { setStatus('Henchmen, load a video URL first.', false); return; }

  const normKey = normalizeUrl(url) || url;
  const fallbackNickname = (() => {
    const vid = getYouTubeVideoId(url);
    return vid ? vid : String(normKey).split('/').filter(Boolean).pop() || '';
  })();

  const nextNick = String(videoSaveNicknameEl?.value || '').trim().slice(0, 64) || fallbackNickname;
  if (!nextNick) { setStatus('Enter a nickname for this video.', false); return; }

  await window.goonAPI?.setVideoNickname?.(url, nextNick);
  if (videoSaveNicknameEl) videoSaveNicknameEl.value = nextNick;
  await refreshSavedVideosList();
  setStatus('Video saved to list.');
}

// Export helpers (extension-compatible format)
function notesToCSV(notes) {
  if (!Array.isArray(notes) || notes.length === 0) return '';
  const header = ['id', 'text', 'time', 'group', 'tags'];
  const rows = notes.map((n) => [
    n.id,
    '"' + (n.text || '').replace(/"/g, '""') + '"',
    n.time ?? '',
    n.group ?? '',
    (n.tags || []).join(';')
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function notesToMarkdown(notes) {
  if (!Array.isArray(notes) || notes.length === 0) return '';
  return notes
    .map((n) => {
      let line = `- [${getTimecode(n.time ?? 0)}] ${n.text || ''}`;
      if (n.tags && n.tags.length) line += ` (tags: ${n.tags.join(', ')})`;
      if (n.group) line += ` [group: ${n.group}]`;
      return line;
    })
    .join('\n');
}

async function exportCurrent(format) {
  if (!currentUrl) { setStatus('Henchmen, load a video first.', false); return; }
  let blob, name;
  if (format === 'json') {
    const data = { url: currentUrl, notes, groups, exportDate: new Date().toISOString() };
    blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    name = `goonopticon-${new Date().toISOString().slice(0, 10)}.json`;
  } else if (format === 'csv') {
    blob = new Blob([notesToCSV(notes)], { type: 'text/csv' });
    name = `goonopticon-${new Date().toISOString().slice(0, 10)}.csv`;
  } else {
    blob = new Blob([notesToMarkdown(notes)], { type: 'text/markdown' });
    name = `goonopticon-${new Date().toISOString().slice(0, 10)}.md`;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus('Exported. Evidence secured.');
}

async function exportAll() {
  const allNotes = await window.goonAPI.getAllNotes();
  const allGroups = await window.goonAPI.getAllGroups();
  const data = { notes: allNotes, groups: allGroups, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `goonopticon-all-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus('All notes exported. Surveillance complete.');
}

function csvToNotes(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const m = line.match(/("(?:[^"]|"")*"|[^,]*)/g);
    const cols = m ? m.map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"')) : line.split(',');
    return {
      id: cols[0] || generateNoteId(),
      text: cols[1] || '',
      time: parseTime(cols[2] || '0'),
      group: cols[3] || undefined,
      tags: cols[4] ? cols[4].split(';').filter(Boolean) : []
    };
  });
}

function markdownToNotes(md) {
  return md
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^-\s*\[(.*?)\]\s*(.*?)(?:\s*\(tags:\s*(.*?)\))?(?:\s*\[group:\s*(.*?)\])?$/);
      if (!match) return null;
      const [, time, text, tagsStr, group] = match;
      return {
        id: generateNoteId(),
        time: parseTime(time || '0'),
        text: (text || '').trim(),
        tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()) : [],
        group: (group || '').trim() || undefined
      };
    })
    .filter(Boolean);
}

async function doImport(file) {
  const text = await file.text();
  const ext = (file.name || '').toLowerCase();
  if (ext.endsWith('.json')) {
    const data = JSON.parse(text);
    if (data.notes && typeof data.notes === 'object' && !Array.isArray(data.notes)) {
      await window.goonAPI.setAllNotes(data.notes);
      if (data.groups) await window.goonAPI.setAllGroups(data.groups);
      setStatus('All notes imported. Surveillance complete.');
    } else if (data.notes && Array.isArray(data.notes) && currentUrl) {
      await window.goonAPI.setNotes(currentUrl, data.notes);
      if (data.groups && Array.isArray(data.groups)) await window.goonAPI.setGroups(currentUrl, data.groups);
      notes = data.notes;
      groups = data.groups || [];
      renderNotes();
      renderGroupSelect();
      setStatus('Current video notes imported. The evidence mounts.');
    } else {
      setStatus('Invalid format. Pod Awful expects better.', false);
    }
  } else if (ext.endsWith('.csv')) {
    const imported = csvToNotes(text);
    if (!currentUrl) { setStatus('Henchmen, load a video first for CSV import.', false); return; }
    const merged = [...notes];
    for (const n of imported) {
      if (!merged.some((x) => x.id === n.id)) merged.push(n);
    }
    await window.goonAPI.setNotes(currentUrl, merged);
    notes = merged;
    renderNotes();
    setStatus(`${imported.length} notes imported from CSV. The evidence mounts.`);
  } else if (ext.endsWith('.md')) {
    const imported = markdownToNotes(text);
    if (!currentUrl) { setStatus('Henchmen, load a video first for Markdown import.', false); return; }
    const merged = [...notes];
    for (const n of imported) merged.push(n);
    await window.goonAPI.setNotes(currentUrl, merged);
    notes = merged;
    renderNotes();
    setStatus(`${imported.length} notes imported from Markdown. The evidence mounts.`);
  } else {
    setStatus('Unsupported format. Pod Awful expects .json, .csv, or .md.', false);
  }
}

btnLoad.addEventListener('click', async () => {
  const url = videoUrlEl.value.trim();
  if (url) await loadForUrl(url);
});

(async () => {
  notesLocked = await window.goonAPI.getNotesLocked?.() ?? false;
  updateLockUI();
  renderRecentUrls();
  const lastUrl = await window.goonAPI.getCurrentVideoUrl();
  if (lastUrl) {
    videoUrlEl.value = lastUrl;
    await loadForUrl(lastUrl);
  }
})();

window.addEventListener('message', (e) => {
  if (e.data?.type === 'goonopticon-timeUpdate' && typeof e.data.time === 'number') {
    currentVideoTime = e.data.time;
    renderNotes();
  }
});

const btnPopOut = document.getElementById('btn-pop-out');
if (btnPopOut) {
  if (window.parent !== window) {
    btnPopOut.addEventListener('click', () => {
      const api = window.goonAPI || window.parent?.goonAPI;
      api?.openTimestampWindow?.();
      window.parent?.postMessage?.({ type: 'goonopticon-view-popped-out', view: 'timestamp' }, '*');
    });
  } else {
    btnPopOut.style.display = 'none';
    document.body.classList.add('view-popout');
  }
}
const btnClose = document.getElementById('timestamp-close');
if (btnClose) {
  btnClose.addEventListener('click', () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'goonopticon-close-view' }, '*');
    } else {
      window.close();
    }
  });
}
document.getElementById('btn-lock')?.addEventListener('click', async () => {
  notesLocked = !notesLocked;
  await window.goonAPI.setNotesLocked?.(notesLocked);
  updateLockUI();
  renderNotes();
});

try {
  ytExternalMode = window.localStorage?.getItem('goonopticon_timestamp_ytExternal') === '1';
} catch (_) {
  ytExternalMode = false;
}
const btnYtExternal = document.getElementById('btn-yt-external');
if (btnYtExternal) {
  const syncUi = () => {
    btnYtExternal.classList.toggle('btn-active', ytExternalMode);
    btnYtExternal.textContent = ytExternalMode ? 'YT External: ON' : 'YT External';
  };
  syncUi();
  btnYtExternal.addEventListener('click', () => {
    ytExternalMode = !ytExternalMode;
    try {
      window.localStorage?.setItem('goonopticon_timestamp_ytExternal', ytExternalMode ? '1' : '0');
    } catch (_) {}
    syncUi();
  });
}

document.getElementById('btn-bulk')?.addEventListener('click', () => {
  bulkMode = !bulkMode;
  if (!bulkMode) selectedIds.clear();
  updateBulkUI();
});

document.getElementById('bulk-cancel')?.addEventListener('click', () => {
  bulkMode = false;
  selectedIds.clear();
  updateBulkUI();
});

document.getElementById('bulk-delete')?.addEventListener('click', async () => {
  if (!currentUrl || selectedIds.size === 0) return;
  for (const id of selectedIds) await window.goonAPI.deleteNote(currentUrl, id);
  notes = notes.filter((n) => !selectedIds.has(n.id));
  selectedIds.clear();
  bulkMode = false;
  const noteTags = notes.flatMap((n) => n.tags || []);
  allTags = [...new Set([...(availableTags || []), ...noteTags])];
  setStatus('Selected notes deleted.');
  updateBulkUI();
  renderNotes();
  renderTagFilter();
});

document.getElementById('bulk-move')?.addEventListener('click', async () => {
  if (!currentUrl || selectedIds.size === 0) return;
  const group = noteGroupEl.value || prompt('Group name:');
  if (!group?.trim()) return;
  if (!groups.includes(group.trim())) {
    await window.goonAPI.addGroup(currentUrl, group.trim());
    groups.push(group.trim());
    renderGroupSelect();
  }
  for (const id of selectedIds) {
    const note = notes.find((n) => n.id === id);
    if (note) await window.goonAPI.updateNote(currentUrl, id, { ...note, group: group.trim() });
  }
  notes = notes.map((n) => (selectedIds.has(n.id) ? { ...n, group: group.trim() } : n));
  selectedIds.clear();
  bulkMode = false;
  setStatus('Moved to group.');
  updateBulkUI();
  renderNotes();
});

document.getElementById('bulk-add-tag')?.addEventListener('click', async () => {
  if (!currentUrl || selectedIds.size === 0) return;
  const tag = prompt('Tag to add:');
  if (!tag?.trim()) return;
  const nextTag = tag.trim();
  if (!availableTags.includes(nextTag)) {
    availableTags = [...new Set([...(availableTags || []), nextTag])];
    await window.goonAPI?.timecodeSetVideoTags?.(currentUrl, availableTags).catch(() => {});
  }
  for (const id of selectedIds) {
    const note = notes.find((n) => n.id === id);
    if (note) {
      const tags = [...(note.tags || []), nextTag];
      const uniq = [...new Set(tags)];
      await window.goonAPI.updateNote(currentUrl, id, { ...note, tags: uniq });
    }
  }
  notes = await window.goonAPI.getNotes(currentUrl);
  const noteTags = notes.flatMap((n) => n.tags || []);
  allTags = [...new Set([...(availableTags || []), ...noteTags])];
  selectedIds.clear();
  bulkMode = false;
  setStatus('Tag added.');
  updateBulkUI();
  renderNotes();
  renderTagFilter();
});

function openTagManagerModal() {
  const modal = document.getElementById('tag-manager-modal');
  const listEl = document.getElementById('tag-manager-list');
  if (!modal || !listEl) return;

  const tags = [...new Set(allTags || [])].sort();

  const addInput = document.getElementById('tag-manager-add-input');
  const addBtn = document.getElementById('tag-manager-add-btn');
  if (addInput && addBtn) {
    addInput.value = '';
    const addTag = async () => {
      const next = String(addInput.value || '').trim().slice(0, 64);
      if (!next) return;
      if (!availableTags.includes(next)) {
        availableTags = [...new Set([...(availableTags || []), next])];
        await window.goonAPI?.timecodeSetVideoTags?.(currentUrl, availableTags).catch(() => {});
      }
      const noteTags = notes.flatMap((n) => n.tags || []);
      allTags = [...new Set([...(availableTags || []), ...noteTags])];
      openTagManagerModal();
      renderTagFilter();
    };

    addBtn.onclick = () => addTag();
    addInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    };
  }

  listEl.innerHTML = tags.length === 0
    ? '<p style="opacity:0.7;margin:0;">No tags on this video.</p>'
    : tags
      .map(
        (tag) => `
    <div class="tag-row" style="display:flex;align-items:center;gap:8px;margin:4px 0;">
      <input
        type="text"
        class="tag-edit-input"
        data-old-tag="${escapeHtml(tag)}"
        value="${escapeHtml(tag)}"
        style="flex:1;min-width:140px;padding:6px 8px;background:var(--hud-bg-elevated);border:1px solid var(--hud-border);color:var(--hud-text);border-radius:4px;font-size:12px;font-family:var(--hud-font-mono);"
      />
      <button type="button" class="hud-btn tag-delete" data-tag="${escapeHtml(tag)}" style="padding:6px 10px;font-size:11px;">Delete</button>
    </div>
  `
      )
      .join('');

  const saveRename = async (oldTag, inputEl) => {
    const next = String(inputEl?.value || '').trim().slice(0, 64);
    if (!next || next === oldTag) {
      if (inputEl && next !== oldTag) inputEl.value = oldTag;
      return;
    }

    for (const n of notes) {
      if (!Array.isArray(n.tags) || !n.tags.includes(oldTag)) continue;
      const replaced = n.tags.map((t) => (t === oldTag ? next : t));
      const uniq = Array.from(new Set(replaced)).filter(Boolean);
      await window.goonAPI.updateNote(currentUrl, n.id, { ...n, tags: uniq });
    }

    notes = await window.goonAPI.getNotes(currentUrl);
    availableTags = (availableTags || []).map((t) => (t === oldTag ? next : t));
    availableTags = Array.from(new Set(availableTags)).filter(Boolean);
    const noteTags = notes.flatMap((n) => n.tags || []);
    availableTags = Array.from(new Set([...(availableTags || []), ...noteTags])).filter(Boolean);
    await window.goonAPI?.timecodeSetVideoTags?.(currentUrl, availableTags).catch(() => {});
    allTags = [...new Set([...(availableTags || []), ...noteTags])];
    openTagManagerModal();
    renderNotes();
    renderTagFilter();
  };

  listEl.querySelectorAll('.tag-edit-input').forEach((input) => {
    const oldTag = input.getAttribute('data-old-tag') || '';
    input.addEventListener('blur', () => saveRename(oldTag, input));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        input.value = oldTag;
        input.blur();
      }
    });
  });

  listEl.querySelectorAll('.tag-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tag = btn.getAttribute('data-tag') || '';
      if (!tag) return;
      if (!confirm(`Remove tag "${tag}" from all notes on this video?`)) return;
      for (const n of notes) {
        if (!Array.isArray(n.tags) || !n.tags.includes(tag)) continue;
        const filtered = n.tags.filter((t) => t !== tag);
        await window.goonAPI.updateNote(currentUrl, n.id, { ...n, tags: filtered });
      }
      notes = await window.goonAPI.getNotes(currentUrl);
      availableTags = (availableTags || []).filter((t) => t !== tag);
      await window.goonAPI?.timecodeSetVideoTags?.(currentUrl, availableTags).catch(() => {});
      const noteTags = notes.flatMap((n) => n.tags || []);
      allTags = [...new Set([...(availableTags || []), ...noteTags])];
      openTagManagerModal();
      renderNotes();
      renderTagFilter();
    });
  });
  modal.classList.add('visible');
}
document.getElementById('btn-tag-manager')?.addEventListener('click', () => {
  if (!currentUrl) { setStatus('Load a video first.', false); return; }
  openTagManagerModal();
});
document.getElementById('tag-manager-close')?.addEventListener('click', () => {
  document.getElementById('tag-manager-modal')?.classList.remove('visible');
});

btnGroupEditCancel?.addEventListener('click', () => closeModal(groupEditModalEl));
btnGroupEditSave?.addEventListener('click', async () => {
  if (!currentUrl) return;
  const next = String(groupEditNameEl?.value || '').trim();
  if (!next) return;
  const oldName = String(editingGroupOldName || '').trim();
  closeModal(groupEditModalEl);
  if (!oldName) return;
  await renameGroupByName(oldName, next);
});
groupEditModalEl?.addEventListener('click', (e) => {
  if (e.target === groupEditModalEl) closeModal(groupEditModalEl);
});

btnNoteEditCancel?.addEventListener('click', () => closeModal(noteEditModalEl));
btnNoteEditSave?.addEventListener('click', async () => {
  if (!currentUrl) return;
  const note = notes.find((n) => n.id === editingNoteId);
  if (!note) return;

  const nextText = String(noteEditTextEl?.value || '').trim();
  const timeStr = String(noteEditTimeEl?.value || '').trim();
  if (!isValidTimeFormat(timeStr)) {
    setStatus('Invalid timestamp format. Use format like 1:23 or 1:23:45', false);
    return;
  }
  const nextTime = parseTime(timeStr);
  const nextGroup = String(noteEditGroupEl?.value || '').trim();
  const nextTags = Array.from(new Set(parseTagsInput(noteEditTagsEl?.value)));

  const updated = {
    ...note,
    text: nextText,
    time: nextTime,
    group: nextGroup || undefined,
    tags: nextTags
  };

  await window.goonAPI.updateNote(currentUrl, editingNoteId, updated);
  const i = notes.findIndex((n) => n.id === editingNoteId);
  if (i >= 0) notes[i] = updated;

  // Keep tag registry in sync.
  availableTags = Array.from(new Set([...(availableTags || []), ...nextTags])).filter(Boolean);
  await window.goonAPI?.timecodeSetVideoTags?.(currentUrl, availableTags).catch(() => {});
  const noteTags = notes.flatMap((n) => n.tags || []);
  allTags = [...new Set([...(availableTags || []), ...noteTags])];

  closeModal(noteEditModalEl);
  renderNotes();
  renderTagFilter();
});
noteEditModalEl?.addEventListener('click', (e) => {
  if (e.target === noteEditModalEl) closeModal(noteEditModalEl);
});

let pinType = 'groups';
function setPinType(type) {
  pinType = type;
  pinPanelGroupsEl && (pinPanelGroupsEl.style.display = type === 'groups' ? 'block' : 'none');
  pinPanelNotesEl && (pinPanelNotesEl.style.display = type === 'notes' ? 'block' : 'none');
  pinPanelTagsEl && (pinPanelTagsEl.style.display = type === 'tags' ? 'block' : 'none');
}

function openPinModal() {
  if (!pinModalEl) return;
  pinModalEl.style.display = 'flex';
  setPinType('groups');
  renderPinPanel();
}

function closePinModal() {
  if (!pinModalEl) return;
  pinModalEl.style.display = 'none';
}

async function persistPins() {
  if (!currentUrl) return;
  videoPins = {
    groups: Array.from(pinnedGroupNames),
    notes: Array.from(pinnedNoteIds),
    tags: Array.from(pinnedTagNames)
  };
  await window.goonAPI?.timecodeSetVideoPins?.(currentUrl, videoPins).catch(() => {});
}

function renderPinPanel() {
  if (!currentUrl) return;
  if (pinType === 'groups') {
    if (!pinGroupsListEl) return;
    const sorted = groups.slice().sort((a, b) => a.localeCompare(b));
    pinGroupsListEl.innerHTML = sorted
      .map((g) => {
        const pinned = pinnedGroupNames.has(g);
        return `
          <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;border:1px solid var(--hud-border);border-radius:6px;padding:8px 10px;background:${pinned ? 'color-mix(in srgb, var(--hud-accent) 18%, transparent)' : 'var(--hud-bg-elevated)'};">
            <div style="flex:1;min-width:0;font-family:var(--hud-font-mono);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(g)}</div>
            <button type="button" class="hud-btn pin-toggle-btn" data-pin-type="groups" data-pin-name="${escapeHtml(g)}" style="padding:6px 10px;font-size:11px;">
              ${pinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
        `;
      })
      .join('');
    pinGroupsListEl.querySelectorAll('.pin-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.pinName || '';
        if (pinnedGroupNames.has(name)) pinnedGroupNames.delete(name);
        else pinnedGroupNames.add(name);
        await persistPins();
        renderPinPanel();
        renderNotes();
      });
    });
  }

  if (pinType === 'notes') {
    if (!pinNotesListEl) return;
    const sorted = notes.slice().sort((a, b) => (a.time || 0) - (b.time || 0));
    pinNotesListEl.innerHTML = sorted
      .map((n) => {
        const pinned = pinnedNoteIds.has(n.id);
        const t = getTimecode(n.time ?? 0);
        const txt = (n.text || '').replace(/\s+/g, ' ').trim().slice(0, 36);
        return `
          <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;border:1px solid var(--hud-border);border-radius:6px;padding:8px 10px;background:${pinned ? 'color-mix(in srgb, var(--hud-accent) 18%, transparent)' : 'var(--hud-bg-elevated)'};">
            <div style="flex:1;min-width:0;font-family:var(--hud-font-mono);font-size:11px;">
              <div>${escapeHtml(t)}</div>
              <div style="opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(txt)}</div>
            </div>
            <button type="button" class="hud-btn pin-toggle-btn" data-pin-type="notes" data-pin-name="${escapeHtml(n.id)}" style="padding:6px 10px;font-size:11px;">
              ${pinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
        `;
      })
      .join('');
    pinNotesListEl.querySelectorAll('.pin-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.pinName || '';
        if (pinnedNoteIds.has(id)) pinnedNoteIds.delete(id);
        else pinnedNoteIds.add(id);
        await persistPins();
        renderPinPanel();
        renderNotes();
      });
    });
  }

  if (pinType === 'tags') {
    if (!pinTagsListEl) return;
    const sorted = (allTags || []).slice().sort((a, b) => a.localeCompare(b));
    pinTagsListEl.innerHTML = sorted
      .map((t) => {
        const pinned = pinnedTagNames.has(t);
        return `
          <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;border:1px solid var(--hud-border);border-radius:6px;padding:8px 10px;background:${pinned ? 'color-mix(in srgb, var(--hud-accent) 18%, transparent)' : 'var(--hud-bg-elevated)'};">
            <div style="flex:1;min-width:0;font-family:var(--hud-font-mono);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(t)}</div>
            <button type="button" class="hud-btn pin-toggle-btn" data-pin-type="tags" data-pin-name="${escapeHtml(t)}" style="padding:6px 10px;font-size:11px;">
              ${pinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
        `;
      })
      .join('');
    pinTagsListEl.querySelectorAll('.pin-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const t = btn.dataset.pinName || '';
        if (pinnedTagNames.has(t)) pinnedTagNames.delete(t);
        else pinnedTagNames.add(t);
        await persistPins();
        renderPinPanel();
        renderNotes();
        renderTagFilter();
      });
    });
  }
}

btnManagePins?.addEventListener('click', async () => {
  if (!currentUrl) {
    const url = (videoUrlEl?.value || '').trim();
    if (url) await loadForUrl(url).catch(() => {});
  }
  openPinModal();
});
pinTypeGroupsBtn?.addEventListener('click', () => { setPinType('groups'); renderPinPanel(); });
pinTypeNotesBtn?.addEventListener('click', () => { setPinType('notes'); renderPinPanel(); });
pinTypeTagsBtn?.addEventListener('click', () => { setPinType('tags'); renderPinPanel(); });
btnPinModalClose?.addEventListener('click', () => closePinModal());

searchEl.addEventListener('input', renderNotes);
tagFilterEl.addEventListener('change', renderNotes);

btnAddGroup.addEventListener('click', addGroup);

btnRenameGroup?.addEventListener('click', () => {
  renameSelectedGroup().catch(() => {});
});

btnSaveVideo?.addEventListener('click', () => {
  saveCurrentVideoToList().catch(() => {});
});

btnExportCurrentJson?.addEventListener('click', () => exportCurrent('json'));
btnExportCurrentCsv?.addEventListener('click', () => exportCurrent('csv'));
btnExportCurrentMd?.addEventListener('click', () => exportCurrent('md'));
btnExportAllJson?.addEventListener('click', exportAll);

btnImport.addEventListener('click', () => importFileEl.click());

document.getElementById('btn-import-paste')?.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) { setStatus('Clipboard empty. Nothing to import, Henchman.', false); return; }
    const data = JSON.parse(text);
    if (data.notes && typeof data.notes === 'object' && !Array.isArray(data.notes)) {
      await window.goonAPI.setAllNotes(data.notes);
      if (data.groups) await window.goonAPI.setAllGroups(data.groups);
      setStatus('Imported from clipboard. The evidence mounts.');
    } else if (data.notes && Array.isArray(data.notes) && currentUrl) {
      await window.goonAPI.setNotes(currentUrl, data.notes);
      if (data.groups?.length) await window.goonAPI.setGroups(currentUrl, data.groups);
      notes = data.notes;
      groups = data.groups || [];
      renderNotes();
      renderGroupSelect();
      setStatus('Imported from clipboard. The evidence mounts.');
    } else {
      setStatus('Invalid format. Pod Awful expects better.', false);
    }
  } catch (e) {
    setStatus('Failed: ' + (e?.message || 'Invalid JSON'), false);
  }
});
importFileEl.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (f) await doImport(f);
  importFileEl.value = '';
});

btnAddNote.addEventListener('click', addNote);

noteTextEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addNote();
});
