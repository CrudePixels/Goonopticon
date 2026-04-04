const Store = require('electron-store');
const { normalizeYouTubeUrl } = require('../utils/urlTime');

const store = new Store();

const STORAGE_KEYS = {
  THEME: 'PodAwful::Theme',
  UI_CUSTOMIZATION: 'PodAwful::UICustomization',
  PREFERRED_DISPLAY_ID: 'PodAwful::PreferredDisplayId',
  SPLASH_DURATION_MS: 'PodAwful::SplashDurationMs',
  SOUND_BOOT_ENABLED: 'PodAwful::SoundBootEnabled',
  SOUND_EXIT_ENABLED: 'PodAwful::SoundExitEnabled',
  COMPACT: 'PodAwful::Compact',
  TAG_FILTER: 'PodAwful::TagFilterMulti',
  NOTE_SEARCH: 'PodAwful::NoteSearch',
  PINNED_GROUPS: 'PodAwful::PinnedGroups',
  NOTES_LOCKED: 'PodAwful::NotesLocked',
  CUSTOM_THEME_PRESETS: 'PodAwful::CustomThemePresets',
  SCHEMA_VERSION: 'PodAwful::SchemaVersion',
  RECENT_URLS: 'PodAwful::RecentUrls',
  BRIDGE_PORT: 'PodAwful::BridgePort',
  WINDOW_BOUNDS: 'PodAwful::WindowBounds',
  CURRENT_VIDEO_URL: 'PodAwful::CurrentVideoUrl',
  VIDEO_NICKNAMES: 'PodAwful::VideoNicknames',
  SEEN_EXTENSION_SETUP: 'PodAwful::SeenExtensionSetup',
  SEEN_PILL_CHOICE: 'PodAwful::SeenPillChoice',
  TRACKED_PEOPLE: 'PodAwful::TrackedPeople',
  MUSIC_FOLDER: 'PodAwful::MusicFolder',
  VIRUS_POPUP_ENABLED: 'PodAwful::VirusPopupEnabled',
  VIRUS_VIDEO_FOLDER: 'PodAwful::VirusVideoFolder',
  GROK_ENABLED: 'PodAwful::GrokEnabled',
  GROK_ROAST_MODE: 'PodAwful::GrokRoastMode',
  GROK_TROLL_MODE: 'PodAwful::GrokTrollMode',
  GROK_ALWAYS_ON_TOP: 'PodAwful::GrokAlwaysOnTop',
  GROK_VOLUME: 'PodAwful::GrokVolume',
  GROK_RANDOM_INTERVAL_MIN: 'PodAwful::GrokRandomIntervalMin',
  GROK_RANDOM_INTERVAL_MAX: 'PodAwful::GrokRandomIntervalMax',
  GROK_CATEGORY_TOGGLES: 'PodAwful::GrokCategoryToggles',
  GROK_CLICK_COUNT: 'PodAwful::GrokClickCount',
  GROK_FIRST_OPEN_DONE: 'PodAwful::GrokFirstOpenDone',
  GROK_THEME: 'PodAwful::GrokTheme',
  DEV_LOG_VISIBLE: 'PodAwful::DevLogVisible',
  CHAT_ADDED_STREAMS: 'PodAwful::ChatAddedStreams',
  CHAT_LOG: 'PodAwful::ChatLog',
  CHAT_USER_HISTORIES: 'PodAwful::ChatUserHistories',
  CHAT_MODERATION_HISTORY: 'PodAwful::ChatModerationHistory',
  CHAT_DONATIONS: 'PodAwful::ChatDonations',
  CHAT_USER_IDENTITIES: 'PodAwful::ChatUserIdentities',
  CHAT_USER_IDENTITY_LINKS: 'PodAwful::ChatUserIdentityLinks',
  CHAT_EMBED_ENABLED: 'PodAwful::ChatEmbedEnabled',
  CHAT_EMBED_PORT: 'PodAwful::ChatEmbedPort',
  CHAT_FILTER_PLATFORM_EMOTES: 'PodAwful::ChatFilterPlatformEmotes',
  CHAT_PLATFORM_EMOTE_BLOCKLIST: 'PodAwful::ChatPlatformEmoteBlocklist',
  DISCORD_BOT_TOKEN: 'PodAwful::DiscordBotToken',
  CHAT_FONT_SCALE: 'PodAwful::ChatFontScale',
  CHAT_PLATFORM_LABEL_MODE: 'PodAwful::ChatPlatformLabelMode',
  CHAT_PLATFORM_FILTER: 'PodAwful::ChatPlatformFilter',
  CHAT_NUKE_PHRASES: 'PodAwful::ChatNukePhrases',
  CHAT_CUSTOM_COMMANDS: 'PodAwful::ChatCustomCommands',
  CHAT_CINEMA_PLATFORM: 'PodAwful::ChatCinemaPlatform',
  CHAT_HIGHLIGHT_KEYWORDS: 'PodAwful::ChatHighlightKeywords',
  CHAT_PINNED_MESSAGE: 'PodAwful::ChatPinnedMessage',
  CHAT_TROLL_HISTORY: 'PodAwful::ChatTrollHistory',
  CHAT_WHISPERS: 'PodAwful::ChatWhispers',
  EMBED_CHAT_STATE: 'PodAwful::EmbedChatState',
  PLATFORM_AUTH: 'PodAwful::PlatformAuth',
  YOUTUBE_CHAT_API_KEY: 'PodAwful::YouTubeChatApiKey',
  COMMAND_CENTER_YOUTUBE_CHANNEL: 'PodAwful::CommandCenterYouTubeChannel',
  FEED_ALERT_ENABLED: 'PodAwful::FeedAlertEnabled',
  FEED_ALERT_POLL_MS: 'PodAwful::FeedAlertPollMs',
  FEED_ALERT_SEEDED: 'PodAwful::FeedAlertSeeded',
  FEED_ALERT_LAST_RSS_VIDEO_ID: 'PodAwful::FeedAlertLastRssVideoId',
  FEED_ALERT_LAST_LIVE_VIDEO_ID: 'PodAwful::FeedAlertLastLiveVideoId',
  TWEET_ALERT_ENABLED: 'PodAwful::TweetAlertEnabled',
  TWEET_ALERT_SEEDED: 'PodAwful::TweetAlertSeeded',
  TWEET_ALERT_LAST_STATUS_ID: 'PodAwful::TweetAlertLastStatusId',
  CHAT_UNIFIED_ENABLED: 'PodAwful::ChatUnifiedEnabled',
  notesKey: (url) => `PodAwful::Notes::${encodeURIComponent(normalizeYouTubeUrl(url))}`,
  groupsKey: (url) => `PodAwful::Groups::${encodeURIComponent(normalizeYouTubeUrl(url))}`,
  videoTagsKey: (url) => `PodAwful::VideoTags::${encodeURIComponent(normalizeYouTubeUrl(url))}`,
  videoPinsKey: (url) => `PodAwful::VideoPins::${encodeURIComponent(normalizeYouTubeUrl(url))}`
};

function get(key, defaultValue = null) {
  const v = store.get(key);
  return v === undefined ? defaultValue : v;
}

function set(key, value) {
  store.set(key, value);
}

// Notes
function getNotes(url) {
  return get(STORAGE_KEYS.notesKey(url), []);
}

function setNotes(url, notes) {
  set(STORAGE_KEYS.notesKey(url), Array.isArray(notes) ? notes : []);
}

function addNote(url, note) {
  const notes = getNotes(url);
  notes.push(note);
  setNotes(url, notes);
}

function updateNote(url, noteId, updatedNote) {
  const notes = getNotes(url);
  const i = notes.findIndex((n) => n.id === noteId);
  if (i === -1) throw new Error(`Note ${noteId} not found`);
  notes[i] = { ...notes[i], ...updatedNote };
  setNotes(url, notes);
}

function deleteNote(url, noteId) {
  setNotes(url, getNotes(url).filter((n) => n.id !== noteId));
}

// Groups
function getGroups(url) {
  return get(STORAGE_KEYS.groupsKey(url), []);
}

function setGroups(url, groups) {
  set(STORAGE_KEYS.groupsKey(url), Array.isArray(groups) ? groups : []);
}

function addGroup(url, groupName) {
  const groups = getGroups(url);
  if (!groups.includes(groupName)) {
    groups.push(groupName);
    setGroups(url, groups);
  }
}

function deleteGroup(url, groupName) {
  setGroups(url, getGroups(url).filter((g) => g !== groupName));
}

function renameGroup(url, oldName, newName) {
  const groups = getGroups(url);
  const i = groups.indexOf(oldName);
  if (i === -1) throw new Error(`Group "${oldName}" not found`);
  groups[i] = newName;
  setGroups(url, groups);
}

// Video tags (availability registry - independent from notes)
function getVideoTags(url) {
  const v = get(STORAGE_KEYS.videoTagsKey(url), []);
  return Array.isArray(v) ? v.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim()).slice(0, 500) : [];
}

function setVideoTags(url, tags) {
  const cleaned = Array.isArray(tags) ? tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim().slice(0, 64)) : [];
  const uniq = Array.from(new Set(cleaned));
  set(STORAGE_KEYS.videoTagsKey(url), uniq);
}

// Video pins (per-video)
function getVideoPins(url) {
  const v = get(STORAGE_KEYS.videoPinsKey(url), { groups: [], notes: [], tags: [] });
  if (!v || typeof v !== 'object') return { groups: [], notes: [], tags: [] };
  const groups = Array.isArray(v.groups) ? v.groups.filter((x) => typeof x === 'string') : [];
  const notes = Array.isArray(v.notes) ? v.notes.filter((x) => typeof x === 'string') : [];
  const tags = Array.isArray(v.tags) ? v.tags.filter((x) => typeof x === 'string') : [];
  return { groups: groups.map((s) => s.trim()).filter(Boolean), notes: notes.map((s) => s.trim()).filter(Boolean), tags: tags.map((s) => s.trim()).filter(Boolean) };
}

function setVideoPins(url, pins) {
  const cur = getVideoPins(url);
  const p = pins && typeof pins === 'object' ? pins : {};
  const groups = Array.isArray(p.groups) ? p.groups.filter((x) => typeof x === 'string').map((s) => s.trim()).filter(Boolean) : cur.groups;
  const notes = Array.isArray(p.notes) ? p.notes.filter((x) => typeof x === 'string').map((s) => s.trim()).filter(Boolean) : cur.notes;
  const tags = Array.isArray(p.tags) ? p.tags.filter((x) => typeof x === 'string').map((s) => s.trim()).filter(Boolean) : cur.tags;
  set(STORAGE_KEYS.videoPinsKey(url), { groups, notes, tags });
}

// Settings
function getTheme() {
  return get(STORAGE_KEYS.THEME, 'default');
}

function setTheme(theme) {
  set(STORAGE_KEYS.THEME, theme);
}

function getUICustomization() {
  return get(STORAGE_KEYS.UI_CUSTOMIZATION, null);
}

function setUICustomization(obj) {
  set(STORAGE_KEYS.UI_CUSTOMIZATION, obj);
}

function getPreferredDisplayId() {
  const v = get(STORAGE_KEYS.PREFERRED_DISPLAY_ID, null);
  return v === undefined || v === null ? null : Number(v);
}

function setPreferredDisplayId(id) {
  set(STORAGE_KEYS.PREFERRED_DISPLAY_ID, id == null ? null : Number(id));
}

function getSplashDurationMs() {
  const v = get(STORAGE_KEYS.SPLASH_DURATION_MS, 5500);
  const n = Number(v);
  return Number.isFinite(n) && n >= 2000 && n <= 15000 ? n : 5500;
}

function setSplashDurationMs(ms) {
  const n = Number(ms);
  set(STORAGE_KEYS.SPLASH_DURATION_MS, Number.isFinite(n) ? Math.max(2000, Math.min(15000, n)) : 5500);
}

function getSoundBootEnabled() {
  return get(STORAGE_KEYS.SOUND_BOOT_ENABLED, true);
}

function setSoundBootEnabled(enabled) {
  set(STORAGE_KEYS.SOUND_BOOT_ENABLED, !!enabled);
}

function getSoundExitEnabled() {
  return get(STORAGE_KEYS.SOUND_EXIT_ENABLED, true);
}

function setSoundExitEnabled(enabled) {
  set(STORAGE_KEYS.SOUND_EXIT_ENABLED, !!enabled);
}

function getTagFilter() {
  return get(STORAGE_KEYS.TAG_FILTER, []);
}

function setTagFilter(tags) {
  set(STORAGE_KEYS.TAG_FILTER, Array.isArray(tags) ? tags : []);
}

function getNoteSearch() {
  return get(STORAGE_KEYS.NOTE_SEARCH, '');
}

function setNoteSearch(search) {
  set(STORAGE_KEYS.NOTE_SEARCH, String(search));
}

function getPinnedGroups() {
  return get(STORAGE_KEYS.PINNED_GROUPS, []);
}

function setPinnedGroups(groups) {
  set(STORAGE_KEYS.PINNED_GROUPS, Array.isArray(groups) ? groups : []);
}

function getNotesLocked() {
  return get(STORAGE_KEYS.NOTES_LOCKED, false);
}

function setNotesLocked(locked) {
  set(STORAGE_KEYS.NOTES_LOCKED, !!locked);
}

function getCustomThemePresets() {
  const v = get(STORAGE_KEYS.CUSTOM_THEME_PRESETS, null);
  return v && typeof v === 'object' ? v : {};
}

function setCustomThemePresets(presets) {
  set(STORAGE_KEYS.CUSTOM_THEME_PRESETS, presets && typeof presets === 'object' ? presets : {});
}

function getRecentUrls() {
  return get(STORAGE_KEYS.RECENT_URLS, []);
}

function addRecentUrl(url) {
  const normalized = normalizeYouTubeUrl(url);
  if (!normalized) return;
  let urls = getRecentUrls();
  urls = urls.filter((u) => u !== normalized);
  urls.unshift(normalized);
  urls = urls.slice(0, 20);
  set(STORAGE_KEYS.RECENT_URLS, urls);
}

function getBridgePort() {
  return get(STORAGE_KEYS.BRIDGE_PORT, 9245);
}

function setBridgePort(port) {
  set(STORAGE_KEYS.BRIDGE_PORT, port);
}

function getWindowBounds(key) {
  return get(`${STORAGE_KEYS.WINDOW_BOUNDS}::${key}`, null);
}

function setWindowBounds(key, bounds) {
  set(`${STORAGE_KEYS.WINDOW_BOUNDS}::${key}`, bounds);
}

function getCurrentVideoUrl() {
  return get(STORAGE_KEYS.CURRENT_VIDEO_URL, '');
}

function setCurrentVideoUrl(url) {
  set(STORAGE_KEYS.CURRENT_VIDEO_URL, url || '');
}

function getVideoNicknames() {
  const v = get(STORAGE_KEYS.VIDEO_NICKNAMES, {});
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function setVideoNickname(url, nickname) {
  const normalized = normalizeYouTubeUrl(url);
  if (!normalized) return;
  const nick = typeof nickname === 'string' ? nickname.trim().slice(0, 64) : '';
  const all = getVideoNicknames();
  if (!nick) {
    delete all[normalized];
    set(STORAGE_KEYS.VIDEO_NICKNAMES, all);
    return;
  }
  all[normalized] = nick;
  set(STORAGE_KEYS.VIDEO_NICKNAMES, all);
}

function getSeenExtensionSetup() {
  return get(STORAGE_KEYS.SEEN_EXTENSION_SETUP, false);
}

function setSeenExtensionSetup(seen) {
  set(STORAGE_KEYS.SEEN_EXTENSION_SETUP, !!seen);
}

function getSeenPillChoice() {
  return get(STORAGE_KEYS.SEEN_PILL_CHOICE, false);
}

function setSeenPillChoice(seen) {
  set(STORAGE_KEYS.SEEN_PILL_CHOICE, !!seen);
}

// Tracked people (Gangstalking)
function getTrackedPeople() {
  return get(STORAGE_KEYS.TRACKED_PEOPLE, []);
}

function setTrackedPeople(people) {
  set(STORAGE_KEYS.TRACKED_PEOPLE, Array.isArray(people) ? people : []);
}

// Music folder
function getMusicFolder() {
  return get(STORAGE_KEYS.MUSIC_FOLDER, '');
}

function setMusicFolder(folderPath) {
  set(STORAGE_KEYS.MUSIC_FOLDER, typeof folderPath === 'string' ? folderPath : '');
}

function getVirusPopupEnabled() {
  return get(STORAGE_KEYS.VIRUS_POPUP_ENABLED, false);
}

function setVirusPopupEnabled(enabled) {
  set(STORAGE_KEYS.VIRUS_POPUP_ENABLED, !!enabled);
}

function getVirusVideoFolder() {
  return get(STORAGE_KEYS.VIRUS_VIDEO_FOLDER, '');
}

function setVirusVideoFolder(folderPath) {
  set(STORAGE_KEYS.VIRUS_VIDEO_FOLDER, typeof folderPath === 'string' ? folderPath : '');
}

function getGrokEnabled() {
  return get(STORAGE_KEYS.GROK_ENABLED, true);
}

function setGrokEnabled(enabled) {
  set(STORAGE_KEYS.GROK_ENABLED, !!enabled);
}

function getGrokRoastMode() {
  return get(STORAGE_KEYS.GROK_ROAST_MODE, false);
}

function setGrokRoastMode(on) {
  set(STORAGE_KEYS.GROK_ROAST_MODE, !!on);
}

function getGrokTrollMode() {
  return get(STORAGE_KEYS.GROK_TROLL_MODE, false);
}

function setGrokTrollMode(on) {
  set(STORAGE_KEYS.GROK_TROLL_MODE, !!on);
}

function getGrokAlwaysOnTop() {
  return get(STORAGE_KEYS.GROK_ALWAYS_ON_TOP, true);
}
function setGrokAlwaysOnTop(on) {
  set(STORAGE_KEYS.GROK_ALWAYS_ON_TOP, !!on);
}
function getGrokVolume() {
  const v = get(STORAGE_KEYS.GROK_VOLUME, 0.4);
  return typeof v === 'number' && v >= 0 && v <= 1 ? v : 0.4;
}
function setGrokVolume(v) {
  set(STORAGE_KEYS.GROK_VOLUME, typeof v === 'number' ? Math.max(0, Math.min(1, v)) : 0.4);
}
function getGrokRandomIntervalMin() {
  const v = get(STORAGE_KEYS.GROK_RANDOM_INTERVAL_MIN, 5000);
  return typeof v === 'number' && v >= 1000 ? v : 5000;
}
function setGrokRandomIntervalMin(ms) {
  set(STORAGE_KEYS.GROK_RANDOM_INTERVAL_MIN, typeof ms === 'number' ? Math.max(1000, ms) : 5000);
}
function getGrokRandomIntervalMax() {
  const v = get(STORAGE_KEYS.GROK_RANDOM_INTERVAL_MAX, 9000);
  return typeof v === 'number' && v >= 2000 ? v : 9000;
}
function setGrokRandomIntervalMax(ms) {
  set(STORAGE_KEYS.GROK_RANDOM_INTERVAL_MAX, typeof ms === 'number' ? Math.max(2000, ms) : 9000);
}
const DEFAULT_GROK_CATEGORY_TOGGLES = { idle: true, drama: true, goon_alert: true, lolcow_alert: true, investigation: true };
function getGrokCategoryToggles() {
  const v = get(STORAGE_KEYS.GROK_CATEGORY_TOGGLES, null);
  return v && typeof v === 'object' ? { ...DEFAULT_GROK_CATEGORY_TOGGLES, ...v } : DEFAULT_GROK_CATEGORY_TOGGLES;
}
function setGrokCategoryToggles(obj) {
  set(STORAGE_KEYS.GROK_CATEGORY_TOGGLES, obj && typeof obj === 'object' ? obj : DEFAULT_GROK_CATEGORY_TOGGLES);
}
function getGrokClickCount() {
  const v = get(STORAGE_KEYS.GROK_CLICK_COUNT, 0);
  return typeof v === 'number' && v >= 0 ? v : 0;
}
function setGrokClickCount(n) {
  set(STORAGE_KEYS.GROK_CLICK_COUNT, typeof n === 'number' && n >= 0 ? n : 0);
}
function getGrokFirstOpenDone() {
  return get(STORAGE_KEYS.GROK_FIRST_OPEN_DONE, false);
}
function setGrokFirstOpenDone(done) {
  set(STORAGE_KEYS.GROK_FIRST_OPEN_DONE, !!done);
}
function getGrokTheme() {
  return get(STORAGE_KEYS.GROK_THEME, 'default');
}
function setGrokTheme(theme) {
  set(STORAGE_KEYS.GROK_THEME, theme === 'amber' ? 'amber' : 'default');
}

function getDevLogVisible() {
  return get(STORAGE_KEYS.DEV_LOG_VISIBLE, false);
}
function setDevLogVisible(visible) {
  set(STORAGE_KEYS.DEV_LOG_VISIBLE, !!visible);
}

function getChatEmbedEnabled() {
  return get(STORAGE_KEYS.CHAT_EMBED_ENABLED, false);
}

function setChatEmbedEnabled(enabled) {
  set(STORAGE_KEYS.CHAT_EMBED_ENABLED, !!enabled);
}

function getChatEmbedPort() {
  const v = get(STORAGE_KEYS.CHAT_EMBED_PORT, 8766);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : 8766;
}

function setChatEmbedPort(port) {
  const n = Number(port);
  set(STORAGE_KEYS.CHAT_EMBED_PORT, Number.isFinite(n) && n > 0 && n < 65536 ? n : 8766);
}

function getChatFilterPlatformEmotes() {
  return get(STORAGE_KEYS.CHAT_FILTER_PLATFORM_EMOTES, false);
}

function setChatFilterPlatformEmotes(enabled) {
  set(STORAGE_KEYS.CHAT_FILTER_PLATFORM_EMOTES, !!enabled);
}

function getChatPlatformEmoteBlocklist() {
  const v = get(STORAGE_KEYS.CHAT_PLATFORM_EMOTE_BLOCKLIST, []);
  return Array.isArray(v) ? v : [];
}

function setChatPlatformEmoteBlocklist(list) {
  set(STORAGE_KEYS.CHAT_PLATFORM_EMOTE_BLOCKLIST, Array.isArray(list) ? list : []);
}

function getChatFontScale() {
  const v = get(STORAGE_KEYS.CHAT_FONT_SCALE, 5);
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.round(n) : 5;
}

function setChatFontScale(scale) {
  const n = Number(scale);
  set(STORAGE_KEYS.CHAT_FONT_SCALE, Number.isFinite(n) ? Math.max(1, Math.min(10, Math.round(n))) : 5);
}

/** 'full' = icon + platform name; 'icon' = icon only (tooltip shows name). */
function getChatPlatformLabelMode() {
  const v = get(STORAGE_KEYS.CHAT_PLATFORM_LABEL_MODE, 'full');
  return v === 'icon' ? 'icon' : 'full';
}

function setChatPlatformLabelMode(mode) {
  set(STORAGE_KEYS.CHAT_PLATFORM_LABEL_MODE, mode === 'icon' ? 'icon' : 'full');
}

function getChatPlatformFilter() {
  const v = get(STORAGE_KEYS.CHAT_PLATFORM_FILTER, 'all');
  return typeof v === 'string' ? v : 'all';
}

function setChatPlatformFilter(platformId) {
  set(STORAGE_KEYS.CHAT_PLATFORM_FILTER, typeof platformId === 'string' ? platformId : 'all');
}

function getChatNukePhrases() {
  const v = get(STORAGE_KEYS.CHAT_NUKE_PHRASES, []);
  return Array.isArray(v) ? v : [];
}

function setChatNukePhrases(list) {
  set(STORAGE_KEYS.CHAT_NUKE_PHRASES, Array.isArray(list) ? list : []);
}

function getChatCustomCommands() {
  const v = get(STORAGE_KEYS.CHAT_CUSTOM_COMMANDS, {});
  return v && typeof v === 'object' ? v : {};
}

function setChatCustomCommands(obj) {
  set(STORAGE_KEYS.CHAT_CUSTOM_COMMANDS, obj && typeof obj === 'object' ? obj : {});
}

function getChatCinemaPlatform() {
  const v = get(STORAGE_KEYS.CHAT_CINEMA_PLATFORM, 'twitch');
  return typeof v === 'string' ? v : 'twitch';
}

function setChatCinemaPlatform(platformId) {
  set(STORAGE_KEYS.CHAT_CINEMA_PLATFORM, typeof platformId === 'string' ? platformId : 'twitch');
}

function getChatCinemaYouTubeVideoId() {
  const v = get('PodAwful::ChatCinemaYouTubeVideoId', '');
  return typeof v === 'string' ? v : '';
}

function setChatCinemaYouTubeVideoId(id) {
  set('PodAwful::ChatCinemaYouTubeVideoId', typeof id === 'string' ? id : '');
}

function getChatUnifiedEnabled() {
  return get(STORAGE_KEYS.CHAT_UNIFIED_ENABLED, false);
}

function setChatUnifiedEnabled(enabled) {
  set(STORAGE_KEYS.CHAT_UNIFIED_ENABLED, !!enabled);
}

/** Streamer banner for website embed + in-app chat (description + link). */
function normalizeEmbedTroll(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const description = String(raw.description || '').trim().slice(0, 500);
  let url = String(raw.url || '').trim().slice(0, 2048);
  if (!url) return description ? { description, url: '' } : null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^[/\s]+/, '')}`;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  return { description, url };
}

function getEmbedChatState() {
  const v = get(STORAGE_KEYS.EMBED_CHAT_STATE, null);
  if (!v || typeof v !== 'object') {
    return { bans: [], mods: [], timeouts: [], nicknames: {}, poll: null, troll: null };
  }
  const bans = Array.isArray(v.bans) ? v.bans.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()) : [];
  const mods = Array.isArray(v.mods) ? v.mods.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()) : [];
  const poll = v.poll && typeof v.poll === 'object' && v.poll.question && Array.isArray(v.poll.options) ? v.poll : null;
  const timeouts = Array.isArray(v.timeouts)
    ? v.timeouts
        .filter((t) => t && typeof t.username === 'string' && t.username.trim() && typeof t.until === 'number' && Number.isFinite(t.until))
        .map((t) => ({ username: t.username.trim(), until: t.until }))
    : [];
  const nicknamesSrc = v.nicknames && typeof v.nicknames === 'object' ? v.nicknames : {};
  const nicknames = {};
  for (const [k, val] of Object.entries(nicknamesSrc)) {
    if (typeof k === 'string' && k.trim() && typeof val === 'string' && val.trim()) {
      nicknames[k.trim()] = val.trim();
    }
  }
  const troll = normalizeEmbedTroll(v.troll);
  return { bans, mods, timeouts, nicknames, poll, troll };
}

function setEmbedChatState(state) {
  if (!state || typeof state !== 'object') {
    set(STORAGE_KEYS.EMBED_CHAT_STATE, { bans: [], mods: [], timeouts: [], nicknames: {}, poll: null, troll: null });
    return;
  }
  const bans = Array.isArray(state.bans) ? state.bans.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()) : [];
  const mods = Array.isArray(state.mods) ? state.mods.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()) : [];
  let poll = null;
  if (state.poll && typeof state.poll === 'object' && state.poll.question && Array.isArray(state.poll.options)) {
    poll = {
      question: String(state.poll.question).slice(0, 200),
      options: state.poll.options.map((o) => ({ text: String((o && o.text) || o).slice(0, 100), votes: Math.max(0, Number((o && o.votes) ?? 0) || 0) })),
      endAt: typeof state.poll.endAt === 'number' && Number.isFinite(state.poll.endAt) ? state.poll.endAt : Date.now() + 300000,
      voted: state.poll.voted && typeof state.poll.voted === 'object' ? state.poll.voted : {}
    };
  }
  const timeouts = Array.isArray(state.timeouts)
    ? state.timeouts
        .filter((t) => t && typeof t.username === 'string' && t.username.trim() && typeof t.until === 'number' && Number.isFinite(t.until))
        .map((t) => ({ username: t.username.trim(), until: t.until }))
    : [];
  const nicknamesSrc = state.nicknames && typeof state.nicknames === 'object' ? state.nicknames : {};
  const nicknames = {};
  for (const [k, val] of Object.entries(nicknamesSrc)) {
    if (typeof k === 'string' && k.trim() && typeof val === 'string' && val.trim()) {
      nicknames[k.trim()] = val.trim();
    }
  }
  const troll = normalizeEmbedTroll(state.troll);
  set(STORAGE_KEYS.EMBED_CHAT_STATE, { bans, mods, timeouts, nicknames, poll, troll });
}

function getChatAddedStreams() {
  const v = get(STORAGE_KEYS.CHAT_ADDED_STREAMS, []);
  return Array.isArray(v) ? v : [];
}

function setChatAddedStreams(ids) {
  set(STORAGE_KEYS.CHAT_ADDED_STREAMS, Array.isArray(ids) ? ids : []);
}

/** Platforms that correspond to unified stream chips (not other:, not embed). */
const CHAT_UNIFIED_PLATFORMS = new Set(['twitch', 'kick', 'youtube', 'rumble', 'podawful', 'odysee', 'dlive', 'discord']);

function allowedPlatformIdsFromAddedStreams(addedStreamIds) {
  const out = new Set();
  if (!Array.isArray(addedStreamIds)) return out;
  for (const id of addedStreamIds) {
    if (typeof id !== 'string' || id.startsWith('other:')) continue;
    const c = id.indexOf(':');
    const pid = c >= 0 ? id.slice(0, c).toLowerCase() : id.toLowerCase();
    if (CHAT_UNIFIED_PLATFORMS.has(pid)) out.add(pid);
  }
  return out;
}

/**
 * Historical behavior used to prune persisted chat when stream list changed.
 * For "save chats for all users with no limit", we keep history instead.
 * (We still cap what the UI loads via getChatLog() tail.)
 */
function pruneChatLogToAddedStreams(_addedStreamIds) {
  // no-op
}

function isIncomingChatPlatformAllowed(platformId, addedStreamIds) {
  const pid = String(platformId || '').toLowerCase();
  if (pid === 'embed') return !!getChatEmbedEnabled();
  const allowed = allowedPlatformIdsFromAddedStreams(addedStreamIds || getChatAddedStreams());
  return allowed.has(pid);
}

// ---- Chat log persistence (unlimited save, but chunked + tail reads) ----
const CHAT_LOG_CHUNK_SIZE = 500;
/** Keep IPC + renderer work bounded; full history stays in chunked store. */
const CHAT_LOG_TAIL_MAX = 500;
/** Migrating a huge legacy single-array log synchronously freezes the main process (Electron "not responding"). */
const LEGACY_CHAT_LOG_MAX_MIGRATE = 3500;
const CHAT_LOG_META_KEY = 'PodAwful::ChatLogMeta';

function chatLogChunkKey(chunkIndex) {
  return 'PodAwful::ChatLogChunk::' + Number(chunkIndex || 0);
}

function initChatLogChunkedIfNeeded() {
  const meta = get(CHAT_LOG_META_KEY, null);
  if (meta && typeof meta === 'object' && Number.isFinite(meta.total) && Number.isFinite(meta.lastChunkIndex)) return;

  // Lazy migration from old single-key array storage.
  const legacy = get(STORAGE_KEYS.CHAT_LOG, []);
  if (Array.isArray(legacy) && legacy.length > 0) {
    const source =
      legacy.length > LEGACY_CHAT_LOG_MAX_MIGRATE ? legacy.slice(-LEGACY_CHAT_LOG_MAX_MIGRATE) : legacy;
    const total = source.length;
    const lastChunkIndex = Math.max(0, Math.floor((total - 1) / CHAT_LOG_CHUNK_SIZE));
    for (let i = 0; i < source.length; i += CHAT_LOG_CHUNK_SIZE) {
      const chunkIndex = Math.floor(i / CHAT_LOG_CHUNK_SIZE);
      const chunk = source.slice(i, i + CHAT_LOG_CHUNK_SIZE);
      set(chatLogChunkKey(chunkIndex), chunk);
    }
    set(CHAT_LOG_META_KEY, { total, lastChunkIndex });
    // Keep legacy key from being re-loaded as "the truth" (and avoid duplication).
    set(STORAGE_KEYS.CHAT_LOG, []);
    return;
  }

  set(CHAT_LOG_META_KEY, { total: 0, lastChunkIndex: 0 });
}

function getChatLogTail(limit) {
  initChatLogChunkedIfNeeded();
  const meta = get(CHAT_LOG_META_KEY, { total: 0, lastChunkIndex: 0 });
  const total = Number.isFinite(meta.total) ? meta.total : 0;
  if (!total || total <= 0) return [];

  const n = Math.max(0, Number.isFinite(limit) ? limit : CHAT_LOG_TAIL_MAX);
  if (n <= 0) return [];

  const outChunks = [];
  let remaining = n;
  let idx = Number.isFinite(meta.lastChunkIndex) ? meta.lastChunkIndex : 0;
  if (idx < 0) idx = 0;

  for (; idx >= 0 && remaining > 0; idx--) {
    const chunk = get(chatLogChunkKey(idx), []);
    if (!Array.isArray(chunk) || chunk.length === 0) continue;
    const take = Math.min(remaining, chunk.length);
    outChunks.push(chunk.slice(chunk.length - take));
    remaining -= take;
  }

  return outChunks.reverse().flat();
}

function getChatLog() {
  // Historically this returned "recent saved chat". We keep the tail bounded to avoid UI lag.
  return getChatLogTail(CHAT_LOG_TAIL_MAX);
}

function appendChatLogMessage(entry) {
  initChatLogChunkedIfNeeded();
  const ts = typeof entry.timestamp === 'number' ? entry.timestamp : Date.now();
  const toPush = {
    platformId: entry.platformId || '',
    platformName: entry.platformName || '?',
    platformIcon: entry.platformIcon || '',
    username: entry.username || '?',
    message: entry.message || '',
    timestamp: ts,
    channelId: entry.channelId || undefined,
    avatarUrl: entry.avatarUrl || undefined,
    donationAmount: entry.donationAmount != null ? entry.donationAmount : undefined,
    donationCurrency: entry.donationCurrency || undefined
  };

  const meta = get(CHAT_LOG_META_KEY, { total: 0, lastChunkIndex: 0 }) || { total: 0, lastChunkIndex: 0 };
  let lastChunkIndex = Number.isFinite(meta.lastChunkIndex) ? meta.lastChunkIndex : 0;
  if (lastChunkIndex < 0) lastChunkIndex = 0;

  let chunk = get(chatLogChunkKey(lastChunkIndex), []);
  if (!Array.isArray(chunk)) chunk = [];

  if (chunk.length >= CHAT_LOG_CHUNK_SIZE) {
    lastChunkIndex += 1;
    chunk = [];
  }

  chunk.push(toPush);
  set(chatLogChunkKey(lastChunkIndex), chunk);
  set(CHAT_LOG_META_KEY, { total: (Number(meta.total) || 0) + 1, lastChunkIndex });
}

function appendChatLogMessagesBatch(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return;
  initChatLogChunkedIfNeeded();
  const meta = get(CHAT_LOG_META_KEY, { total: 0, lastChunkIndex: 0 }) || { total: 0, lastChunkIndex: 0 };
  let lastChunkIndex = Number.isFinite(meta.lastChunkIndex) ? meta.lastChunkIndex : 0;
  if (lastChunkIndex < 0) lastChunkIndex = 0;
  let chunk = get(chatLogChunkKey(lastChunkIndex), []);
  if (!Array.isArray(chunk)) chunk = [];
  let totalAdded = 0;

  for (const entry of entries) {
    const ts = typeof entry.timestamp === 'number' ? entry.timestamp : Date.now();
    const av = entry.avatarUrl != null && String(entry.avatarUrl).trim() ? String(entry.avatarUrl).trim() : undefined;
    const toPush = {
      platformId: entry.platformId || '',
      platformName: entry.platformName || '?',
      platformIcon: entry.platformIcon || '',
      username: entry.username || '?',
      message: entry.message || '',
      timestamp: ts,
      channelId: entry.channelId || undefined,
      avatarUrl: av,
      donationAmount: entry.donationAmount != null ? entry.donationAmount : undefined,
      donationCurrency: entry.donationCurrency || undefined
    };
    if (chunk.length >= CHAT_LOG_CHUNK_SIZE) {
      set(chatLogChunkKey(lastChunkIndex), chunk);
      lastChunkIndex += 1;
      chunk = [];
    }
    chunk.push(toPush);
    totalAdded += 1;
  }
  set(chatLogChunkKey(lastChunkIndex), chunk);
  set(CHAT_LOG_META_KEY, { total: (Number(meta.total) || 0) + totalAdded, lastChunkIndex });
}

function chatUserKey(platformId, username) {
  return (platformId || '') + '::' + (username || '?');
}

function chatUserHistoryChunkKey(platformId, username) {
  const p = String(platformId || '').toLowerCase();
  const u = String(username || '?');
  return 'PodAwful::ChatUserHistory::' + p + '::' + u;
}

function getChatUserHistory(platformId, username) {
  const legacyAll = get(STORAGE_KEYS.CHAT_USER_HISTORIES, {});
  const legacyKey = chatUserKey(platformId, username);
  const legacyArr = Array.isArray(legacyAll?.[legacyKey]) ? legacyAll[legacyKey] : [];

  const perUserKey = chatUserHistoryChunkKey(platformId, username);
  const perUserArr = get(perUserKey, []);
  const normalizedPerUserArr = Array.isArray(perUserArr) ? perUserArr : [];

  if (normalizedPerUserArr.length === 0) return legacyArr;
  if (legacyArr.length === 0) return normalizedPerUserArr;
  // If both exist, merge in-order-ish (the UI sorts by timestamp anyway).
  return [...legacyArr, ...normalizedPerUserArr];
}

/** Per-user history is read+written on every chat line; unbounded arrays freeze the main process during live floods. */
const CHAT_USER_HISTORY_PER_KEY_MAX = 280;

function appendChatUserMessage(platformId, username, message) {
  const perUserKey = chatUserHistoryChunkKey(platformId, username);
  const arr = get(perUserKey, []);
  const safeArr = Array.isArray(arr) ? arr : [];
  safeArr.push({ message: message || '', timestamp: Date.now() });
  if (safeArr.length > CHAT_USER_HISTORY_PER_KEY_MAX) {
    safeArr.splice(0, safeArr.length - CHAT_USER_HISTORY_PER_KEY_MAX);
  }
  set(perUserKey, safeArr);
}

function appendChatUserMessagesFromBatch(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return;
  const groups = new Map();
  for (const e of entries) {
    const platformId = e.platformId || '';
    const username = e.username || '?';
    const k = chatUserKey(platformId, username);
    if (!groups.has(k)) groups.set(k, { platformId, username, lines: [] });
    groups.get(k).lines.push({
      message: e.message || '',
      timestamp: typeof e.timestamp === 'number' ? e.timestamp : Date.now()
    });
  }
  for (const { platformId, username, lines } of groups.values()) {
    const perUserKey = chatUserHistoryChunkKey(platformId, username);
    const arr = get(perUserKey, []);
    const safeArr = Array.isArray(arr) ? arr : [];
    for (const line of lines) safeArr.push(line);
    if (safeArr.length > CHAT_USER_HISTORY_PER_KEY_MAX) {
      safeArr.splice(0, safeArr.length - CHAT_USER_HISTORY_PER_KEY_MAX);
    }
    set(perUserKey, safeArr);
  }
}

const CHAT_MODERATION_HISTORY_MAX = 8000;

function appendChatModerationEvent(entry) {
  const list = get(STORAGE_KEYS.CHAT_MODERATION_HISTORY, []);
  const arr = Array.isArray(list) ? [...list] : [];
  arr.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 10),
    timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : Date.now(),
    platformId: String(entry.platformId || ''),
    username: String(entry.username || ''),
    action: entry.action === 'ban' || entry.action === 'unban' ? entry.action : 'timeout',
    durationSeconds: entry.durationSeconds != null ? Number(entry.durationSeconds) : undefined,
    reason: typeof entry.reason === 'string' ? entry.reason.slice(0, 500) : '',
    success: entry.success !== false,
    error: typeof entry.error === 'string' ? entry.error.slice(0, 500) : ''
  });
  if (arr.length > CHAT_MODERATION_HISTORY_MAX) arr.splice(0, arr.length - CHAT_MODERATION_HISTORY_MAX);
  set(STORAGE_KEYS.CHAT_MODERATION_HISTORY, arr);
}

function getChatModerationHistory(platformId, username) {
  const p = String(platformId || '');
  const u = String(username || '').toLowerCase();
  const list = get(STORAGE_KEYS.CHAT_MODERATION_HISTORY, []);
  const arr = Array.isArray(list) ? list : [];
  return arr
    .filter((e) => e && e.platformId === p && String(e.username || '').toLowerCase() === u)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

const CHAT_DONATIONS_MAX = 10000;

function appendDonation(platformId, username, amount, currency, message) {
  const list = get(STORAGE_KEYS.CHAT_DONATIONS, []);
  list.push({
    platformId: platformId || '',
    username: username || '?',
    amount: Number(amount) || 0,
    currency: currency || 'USD',
    message: message || '',
    timestamp: Date.now()
  });
  if (list.length > CHAT_DONATIONS_MAX) list.splice(0, list.length - CHAT_DONATIONS_MAX);
  set(STORAGE_KEYS.CHAT_DONATIONS, list);
}

function getDonations() {
  const v = get(STORAGE_KEYS.CHAT_DONATIONS, []);
  return Array.isArray(v) ? v : [];
}

function getDonationsForUserOrIdentity(platformId, username) {
  const links = get(STORAGE_KEYS.CHAT_USER_IDENTITY_LINKS, {});
  const identities = get(STORAGE_KEYS.CHAT_USER_IDENTITIES, {});
  const key = chatUserKey(platformId, username);
  let identityId = links[key] || null;
  let keys = [key];
  if (identityId && identities[identityId]) {
    const linked = (identities[identityId].linkedAccounts || []).slice();
    keys = [...new Set([key, ...linked.map((a) => chatUserKey(a.platformId, a.username))])];
  }
  const list = getDonations();
  const donations = list.filter((d) => keys.includes(chatUserKey(d.platformId, d.username)));
  const totalByCurrency = {};
  donations.forEach((d) => {
    const c = d.currency || 'USD';
    totalByCurrency[c] = (totalByCurrency[c] || 0) + (Number(d.amount) || 0);
  });
  return { donations: donations.slice().reverse(), totalByCurrency, identityId };
}

function chatUserIdentityId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

function getIdentityLinks() {
  const v = get(STORAGE_KEYS.CHAT_USER_IDENTITY_LINKS, {});
  return typeof v === 'object' ? v : {};
}

function getIdentities() {
  const v = get(STORAGE_KEYS.CHAT_USER_IDENTITIES, {});
  return typeof v === 'object' ? v : {};
}

function getIdentityIdForUser(platformId, username) {
  const links = getIdentityLinks();
  return links[chatUserKey(platformId, username)] || null;
}

function getIdentity(identityId) {
  const all = getIdentities();
  const data = all[identityId];
  if (!data) return null;
  return {
    tags: Array.isArray(data.tags) ? data.tags : [],
    highlight: !!data.highlight,
    chatColor: typeof data.chatColor === 'string' ? data.chatColor : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    badge: typeof data.badge === 'string' ? data.badge : '',
    linkedAccounts: Array.isArray(data.linkedAccounts) ? data.linkedAccounts : []
  };
}

function setIdentity(identityId, data) {
  const all = getIdentities();
  if (!all[identityId]) all[identityId] = { tags: [], highlight: false, chatColor: '', displayName: '', badge: '', linkedAccounts: [] };
  if (data.tags != null) all[identityId].tags = Array.isArray(data.tags) ? data.tags : [];
  if (data.highlight != null) all[identityId].highlight = !!data.highlight;
  if (data.chatColor != null) all[identityId].chatColor = typeof data.chatColor === 'string' ? data.chatColor : '';
  if (data.displayName != null) all[identityId].displayName = typeof data.displayName === 'string' ? data.displayName : '';
  if (data.badge != null) all[identityId].badge = typeof data.badge === 'string' ? data.badge : '';
  if (data.linkedAccounts != null) all[identityId].linkedAccounts = Array.isArray(data.linkedAccounts) ? data.linkedAccounts : [];
  set(STORAGE_KEYS.CHAT_USER_IDENTITIES, all);
}

function createIdentity() {
  const identityId = chatUserIdentityId();
  const all = getIdentities();
  all[identityId] = { tags: [], highlight: false, chatColor: '', displayName: '', badge: '', linkedAccounts: [] };
  set(STORAGE_KEYS.CHAT_USER_IDENTITIES, all);
  return identityId;
}

function linkUserToIdentity(platformId, username, identityId) {
  const key = chatUserKey(platformId, username);
  const links = getIdentityLinks();
  const identities = getIdentities();
  if (!identities[identityId]) return false;
  links[key] = identityId;
  const acc = identities[identityId].linkedAccounts || [];
  if (!acc.some((a) => a.platformId === platformId && a.username === username)) {
    acc.push({ platformId, username });
    identities[identityId].linkedAccounts = acc;
    set(STORAGE_KEYS.CHAT_USER_IDENTITIES, identities);
  }
  set(STORAGE_KEYS.CHAT_USER_IDENTITY_LINKS, links);
  return true;
}

function unlinkUser(platformId, username) {
  const key = chatUserKey(platformId, username);
  const links = getIdentityLinks();
  const identities = getIdentities();
  const identityId = links[key];
  if (!identityId) return;
  delete links[key];
  if (identities[identityId]) {
    identities[identityId].linkedAccounts = (identities[identityId].linkedAccounts || []).filter(
      (a) => !(a.platformId === platformId && a.username === username)
    );
    set(STORAGE_KEYS.CHAT_USER_IDENTITIES, identities);
  }
  set(STORAGE_KEYS.CHAT_USER_IDENTITY_LINKS, links);
}

function getLinkedAccounts(identityId) {
  const identities = getIdentities();
  const data = identities[identityId];
  return Array.isArray(data?.linkedAccounts) ? data.linkedAccounts : [];
}

function ensureIdentityForUser(platformId, username) {
  const key = chatUserKey(platformId, username);
  const links = getIdentityLinks();
  let identityId = links[key];
  if (identityId) return identityId;
  identityId = chatUserIdentityId();
  const all = getIdentities();
  all[identityId] = { tags: [], highlight: false, chatColor: '', displayName: '', badge: '', linkedAccounts: [{ platformId, username }] };
  set(STORAGE_KEYS.CHAT_USER_IDENTITIES, all);
  links[key] = identityId;
  set(STORAGE_KEYS.CHAT_USER_IDENTITY_LINKS, links);
  return identityId;
}

function getChatHighlightKeywords() {
  const v = get(STORAGE_KEYS.CHAT_HIGHLIGHT_KEYWORDS, []);
  return Array.isArray(v) ? v : [];
}

function setChatHighlightKeywords(keywords) {
  set(STORAGE_KEYS.CHAT_HIGHLIGHT_KEYWORDS, Array.isArray(keywords) ? keywords : []);
}

function getChatPinnedMessage() {
  const v = get(STORAGE_KEYS.CHAT_PINNED_MESSAGE, null);
  return v && typeof v === 'object' ? v : null;
}

function setChatPinnedMessage(pinned) {
  set(STORAGE_KEYS.CHAT_PINNED_MESSAGE, pinned && typeof pinned === 'object' ? pinned : null);
}

const CHAT_TROLL_HISTORY_CAP = 300;

function getChatTrollHistory() {
  const v = get(STORAGE_KEYS.CHAT_TROLL_HISTORY, []);
  if (!Array.isArray(v)) return [];
  return v.filter((e) => e && typeof e === 'object' && (e.outcome === 'success' || e.outcome === 'failed'));
}

function appendChatTrollHistoryEntry(entry) {
  const description = String(entry?.description || '').slice(0, 500);
  const url = String(entry?.url || '').slice(0, 2048);
  const outcome = entry?.outcome === 'failed' ? 'failed' : 'success';
  const timestamp = typeof entry?.timestamp === 'number' && Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now();
  const row = { description, url, outcome, timestamp };
  const list = getChatTrollHistory();
  list.unshift(row);
  if (list.length > CHAT_TROLL_HISTORY_CAP) list.length = CHAT_TROLL_HISTORY_CAP;
  set(STORAGE_KEYS.CHAT_TROLL_HISTORY, list);
  return row;
}

function getWhisperConversation(peerKey) {
  const all = get(STORAGE_KEYS.CHAT_WHISPERS, {});
  const conv = all[peerKey];
  return Array.isArray(conv?.messages) ? conv.messages : [];
}

function appendWhisper(peerKey, fromMe, text) {
  const all = get(STORAGE_KEYS.CHAT_WHISPERS, {});
  const conv = all[peerKey] || { messages: [] };
  if (!Array.isArray(conv.messages)) conv.messages = [];
  conv.messages.push({ from: fromMe ? 'me' : 'them', text: String(text || ''), timestamp: Date.now() });
  if (conv.messages.length > 500) conv.messages.splice(0, conv.messages.length - 500);
  all[peerKey] = conv;
  set(STORAGE_KEYS.CHAT_WHISPERS, all);
}

function getWhisperPeerKeys() {
  const all = get(STORAGE_KEYS.CHAT_WHISPERS, {});
  return Object.keys(all).filter((k) => (all[k]?.messages?.length || 0) > 0);
}

function getPlatformAuth(platformId) {
  const all = get(STORAGE_KEYS.PLATFORM_AUTH, {});
  const data = all[platformId];
  return data && typeof data === 'object' ? data : null;
}

function setPlatformAuth(platformId, data) {
  const all = get(STORAGE_KEYS.PLATFORM_AUTH, {});
  if (data == null) { delete all[platformId]; set(STORAGE_KEYS.PLATFORM_AUTH, all); return; }
  all[platformId] = data;
  set(STORAGE_KEYS.PLATFORM_AUTH, all);
}

function getYouTubeChatApiKey() {
  const v = get(STORAGE_KEYS.YOUTUBE_CHAT_API_KEY, '');
  return typeof v === 'string' ? v : '';
}

function setYouTubeChatApiKey(key) {
  set(STORAGE_KEYS.YOUTUBE_CHAT_API_KEY, typeof key === 'string' ? key : '');
}

function getDiscordBotToken() {
  const v = get(STORAGE_KEYS.DISCORD_BOT_TOKEN, '');
  return typeof v === 'string' ? v : '';
}

function setDiscordBotToken(token) {
  set(STORAGE_KEYS.DISCORD_BOT_TOKEN, typeof token === 'string' ? token : '');
}

function getCommandCenterYouTubeChannel() {
  const v = get(STORAGE_KEYS.COMMAND_CENTER_YOUTUBE_CHANNEL, '');
  return typeof v === 'string' ? v : '';
}

function setCommandCenterYouTubeChannel(url) {
  set(STORAGE_KEYS.COMMAND_CENTER_YOUTUBE_CHANNEL, typeof url === 'string' ? url : '');
  resetPodawfulFeedAlertState();
}

function getPodawfulFeedAlertEnabled() {
  return !!get(STORAGE_KEYS.FEED_ALERT_ENABLED, false);
}

function setPodawfulFeedAlertEnabled(on) {
  set(STORAGE_KEYS.FEED_ALERT_ENABLED, !!on);
}

function getPodawfulFeedAlertPollMs() {
  const v = get(STORAGE_KEYS.FEED_ALERT_POLL_MS, 90000);
  const n = Number(v);
  return Number.isFinite(n) ? n : 90000;
}

function setPodawfulFeedAlertPollMs(ms) {
  const n = Math.max(20000, Math.min(600000, Number(ms) || 90000));
  set(STORAGE_KEYS.FEED_ALERT_POLL_MS, n);
}

function getPodawfulFeedAlertSeeded() {
  return !!get(STORAGE_KEYS.FEED_ALERT_SEEDED, false);
}

function setPodawfulFeedAlertSeeded(seeded) {
  set(STORAGE_KEYS.FEED_ALERT_SEEDED, !!seeded);
}

function getPodawfulFeedAlertLastRssVideoId() {
  const v = get(STORAGE_KEYS.FEED_ALERT_LAST_RSS_VIDEO_ID, '');
  return typeof v === 'string' ? v : '';
}

function setPodawfulFeedAlertLastRssVideoId(id) {
  set(STORAGE_KEYS.FEED_ALERT_LAST_RSS_VIDEO_ID, typeof id === 'string' ? id : '');
}

function getPodawfulFeedAlertLastLiveVideoId() {
  const v = get(STORAGE_KEYS.FEED_ALERT_LAST_LIVE_VIDEO_ID, '');
  return typeof v === 'string' ? v : '';
}

function setPodawfulFeedAlertLastLiveVideoId(id) {
  set(STORAGE_KEYS.FEED_ALERT_LAST_LIVE_VIDEO_ID, typeof id === 'string' ? id : '');
}

function resetPodawfulFeedAlertState() {
  set(STORAGE_KEYS.FEED_ALERT_SEEDED, false);
  set(STORAGE_KEYS.FEED_ALERT_LAST_RSS_VIDEO_ID, '');
  set(STORAGE_KEYS.FEED_ALERT_LAST_LIVE_VIDEO_ID, '');
}

function getPodawfulTweetAlertEnabled() {
  return !!get(STORAGE_KEYS.TWEET_ALERT_ENABLED, false);
}

function setPodawfulTweetAlertEnabled(on) {
  set(STORAGE_KEYS.TWEET_ALERT_ENABLED, !!on);
}

function getPodawfulTweetAlertSeeded() {
  return !!get(STORAGE_KEYS.TWEET_ALERT_SEEDED, false);
}

function setPodawfulTweetAlertSeeded(seeded) {
  set(STORAGE_KEYS.TWEET_ALERT_SEEDED, !!seeded);
}

function getPodawfulTweetAlertLastStatusId() {
  const v = get(STORAGE_KEYS.TWEET_ALERT_LAST_STATUS_ID, '');
  return typeof v === 'string' ? v : '';
}

function setPodawfulTweetAlertLastStatusId(id) {
  set(STORAGE_KEYS.TWEET_ALERT_LAST_STATUS_ID, typeof id === 'string' ? id : '');
}

function resetPodawfulTweetAlertState() {
  set(STORAGE_KEYS.TWEET_ALERT_SEEDED, false);
  set(STORAGE_KEYS.TWEET_ALERT_LAST_STATUS_ID, '');
}

// Bulk for import/export
function getAllNotes() {
  const all = store.store;
  const out = {};
  for (const key of Object.keys(all)) {
    if (key.startsWith('PodAwful::Notes::')) {
      const url = decodeURIComponent(key.replace('PodAwful::Notes::', ''));
      out[url] = all[key];
    }
  }
  return out;
}

function setAllNotes(allNotes) {
  for (const url of Object.keys(allNotes)) {
    setNotes(url, allNotes[url]);
  }
}

function getAllGroups() {
  const all = store.store;
  const out = {};
  for (const key of Object.keys(all)) {
    if (key.startsWith('PodAwful::Groups::')) {
      const url = decodeURIComponent(key.replace('PodAwful::Groups::', ''));
      out[url] = all[key];
    }
  }
  return out;
}

function setAllGroups(allGroups) {
  for (const url of Object.keys(allGroups)) {
    setGroups(url, allGroups[url]);
  }
}

module.exports = {
  getNotes,
  setNotes,
  addNote,
  updateNote,
  deleteNote,
  getGroups,
  setGroups,
  addGroup,
  deleteGroup,
  renameGroup,
  getTheme,
  setTheme,
  getUICustomization,
  setUICustomization,
  getPreferredDisplayId,
  setPreferredDisplayId,
  getSplashDurationMs,
  setSplashDurationMs,
  getSoundBootEnabled,
  setSoundBootEnabled,
  getSoundExitEnabled,
  setSoundExitEnabled,
  getTagFilter,
  setTagFilter,
  getNoteSearch,
  setNoteSearch,
  getPinnedGroups,
  setPinnedGroups,
  getNotesLocked,
  setNotesLocked,
  getVideoTags,
  setVideoTags,
  getVideoPins,
  setVideoPins,
  getCustomThemePresets,
  setCustomThemePresets,
  getAllNotes,
  setAllNotes,
  getAllGroups,
  setAllGroups,
  getRecentUrls,
  addRecentUrl,
  getBridgePort,
  setBridgePort,
  getWindowBounds,
  setWindowBounds,
  getCurrentVideoUrl,
  setCurrentVideoUrl,
  getVideoNicknames,
  setVideoNickname,
  getSeenExtensionSetup,
  setSeenExtensionSetup,
  getSeenPillChoice,
  setSeenPillChoice,
  getTrackedPeople,
  setTrackedPeople,
  getMusicFolder,
  setMusicFolder,
  getVirusPopupEnabled,
  setVirusPopupEnabled,
  getVirusVideoFolder,
  setVirusVideoFolder,
  getGrokEnabled,
  setGrokEnabled,
  getGrokRoastMode,
  setGrokRoastMode,
  getGrokTrollMode,
  setGrokTrollMode,
  getGrokAlwaysOnTop,
  setGrokAlwaysOnTop,
  getGrokVolume,
  setGrokVolume,
  getGrokRandomIntervalMin,
  setGrokRandomIntervalMin,
  getGrokRandomIntervalMax,
  setGrokRandomIntervalMax,
  getGrokCategoryToggles,
  setGrokCategoryToggles,
  getGrokClickCount,
  setGrokClickCount,
  getGrokFirstOpenDone,
  setGrokFirstOpenDone,
  getGrokTheme,
  setGrokTheme,
  getDevLogVisible,
  setDevLogVisible,
  getChatEmbedEnabled,
  setChatEmbedEnabled,
  getChatEmbedPort,
  setChatEmbedPort,
  getChatFilterPlatformEmotes,
  setChatFilterPlatformEmotes,
  getChatPlatformEmoteBlocklist,
  setChatPlatformEmoteBlocklist,
  getChatFontScale,
  setChatFontScale,
  getChatPlatformLabelMode,
  setChatPlatformLabelMode,
  getChatPlatformFilter,
  setChatPlatformFilter,
  getChatNukePhrases,
  setChatNukePhrases,
  getChatCustomCommands,
  setChatCustomCommands,
  getChatCinemaPlatform,
  setChatCinemaPlatform,
  getChatCinemaYouTubeVideoId,
  setChatCinemaYouTubeVideoId,
  getEmbedChatState,
  setEmbedChatState,
  normalizeEmbedTroll,
  getChatAddedStreams,
  setChatAddedStreams,
  allowedPlatformIdsFromAddedStreams,
  pruneChatLogToAddedStreams,
  isIncomingChatPlatformAllowed,
  getChatLog,
  appendChatLogMessage,
  appendChatLogMessagesBatch,
  getChatUserHistory,
  appendChatModerationEvent,
  getChatModerationHistory,
  appendChatUserMessage,
  appendChatUserMessagesFromBatch,
  appendDonation,
  getDonations,
  getDonationsForUserOrIdentity,
  getIdentityIdForUser,
  getIdentity,
  setIdentity,
  createIdentity,
  ensureIdentityForUser,
  linkUserToIdentity,
  unlinkUser,
  getLinkedAccounts,
  getIdentityLinks,
  getIdentities,
  getChatHighlightKeywords,
  setChatHighlightKeywords,
  getChatPinnedMessage,
  setChatPinnedMessage,
  getChatTrollHistory,
  appendChatTrollHistoryEntry,
  getWhisperConversation,
  appendWhisper,
  getWhisperPeerKeys,
  getPlatformAuth,
  setPlatformAuth,
  getYouTubeChatApiKey,
  setYouTubeChatApiKey,
  getDiscordBotToken,
  setDiscordBotToken,
  getCommandCenterYouTubeChannel,
  setCommandCenterYouTubeChannel,
  getPodawfulFeedAlertEnabled,
  setPodawfulFeedAlertEnabled,
  getPodawfulFeedAlertPollMs,
  setPodawfulFeedAlertPollMs,
  getPodawfulFeedAlertSeeded,
  setPodawfulFeedAlertSeeded,
  getPodawfulFeedAlertLastRssVideoId,
  setPodawfulFeedAlertLastRssVideoId,
  getPodawfulFeedAlertLastLiveVideoId,
  setPodawfulFeedAlertLastLiveVideoId,
  resetPodawfulFeedAlertState,
  getPodawfulTweetAlertEnabled,
  setPodawfulTweetAlertEnabled,
  getPodawfulTweetAlertSeeded,
  setPodawfulTweetAlertSeeded,
  getPodawfulTweetAlertLastStatusId,
  setPodawfulTweetAlertLastStatusId,
  resetPodawfulTweetAlertState,
  getChatUnifiedEnabled,
  setChatUnifiedEnabled
};
