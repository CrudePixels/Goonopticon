const { contextBridge, ipcRenderer } = require('electron');

const isChatPopoutWindow = process.__GOON_CHAT_POPOUT_NEXT === true;
if (isChatPopoutWindow) try { delete process.__GOON_CHAT_POPOUT_NEXT; } catch (_) {}

const isGrokPopoutWindow = process.__GOON_GROK_POPOUT_NEXT === true;
if (isGrokPopoutWindow) try { delete process.__GOON_GROK_POPOUT_NEXT; } catch (_) {}

function postToGrokIframes(msg) {
  try {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('iframe').forEach((el) => {
      const s = el.getAttribute('src') || '';
      if (s.includes('grok.html')) el.contentWindow?.postMessage(msg, '*');
    });
  } catch (_) {}
}

const goonAPI = {
  getRandomSplash: () => ipcRenderer.invoke('splash:getRandom'),
  getLoadingLines: () => ipcRenderer.invoke('splash:getLoadingLines'),
  getRandomSplashImageUrl: () => ipcRenderer.invoke('splash:getRandomImageUrl'),
  openTimestampWindow: () => ipcRenderer.invoke('window:openTimestamp'),
  openMusicWindow: () => ipcRenderer.invoke('window:openMusic'),
  openChatPopout: () => ipcRenderer.invoke('window:openChatPopout'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  openOverlayWindow: () => ipcRenderer.invoke('window:openOverlay'),
  openGrokWindow: () => ipcRenderer.invoke('window:openGrokPopout'),
  openGrokPopout: () => ipcRenderer.invoke('window:openGrokPopout'),
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  closeOverlay: () => ipcRenderer.invoke('overlay:close'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  bridgeSendSeek: (time) => ipcRenderer.invoke('bridge:sendSeek', time),
  bridgeIsConnected: () => ipcRenderer.invoke('bridge:isConnected'),
  bridgeGetStatus: () => ipcRenderer.invoke('bridge:getStatus'),
  showToast: (message) => ipcRenderer.invoke('app:showToast', message),
  getThemeColors: (theme) => ipcRenderer.invoke('theme:getColors', theme),
  getFullTheme: (theme) => ipcRenderer.invoke('theme:getFullTheme', theme),
  getUICustomization: () => ipcRenderer.invoke('storage:getUICustomization'),
  setUICustomization: (obj) => ipcRenderer.invoke('storage:setUICustomization', obj),
  rebootApp: () => ipcRenderer.invoke('app:reboot'),
  getLogPath: () => ipcRenderer.invoke('app:getLogPath'),
  freezeTraceMark: (tag, detail) => ipcRenderer.send('diag:freezeTrace', tag, detail),
  getFreezeTracePath: () => ipcRenderer.invoke('diag:getFreezeTracePath'),
  openFreezeTrace: () => ipcRenderer.invoke('diag:openFreezeTrace'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getChangelog: () => ipcRenderer.invoke('app:getChangelog'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  quitAndInstall: () => ipcRenderer.invoke('app:quitAndInstall'),
  getExtensionPath: () => ipcRenderer.invoke('app:getExtensionPath'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  openBrowserExtensions: (browserId) => ipcRenderer.invoke('app:openBrowserExtensions', browserId),
  openChromeExtensions: () => ipcRenderer.invoke('app:openChromeExtensions'),
  getSeenExtensionSetup: () => ipcRenderer.invoke('storage:getSeenExtensionSetup'),
  setSeenExtensionSetup: (seen) => ipcRenderer.invoke('storage:setSeenExtensionSetup', seen),
  getSeenPillChoice: () => ipcRenderer.invoke('storage:getSeenPillChoice'),
  setSeenPillChoice: (seen) => ipcRenderer.invoke('storage:setSeenPillChoice', seen),
  showOpenDialog: (opts) => ipcRenderer.invoke('dialog:open', opts),
  // Storage
  getNotes: (url) => ipcRenderer.invoke('storage:getNotes', url),
  setNotes: (url, notes) => ipcRenderer.invoke('storage:setNotes', url, notes),
  addNote: (url, note) => ipcRenderer.invoke('storage:addNote', url, note),
  updateNote: (url, noteId, updated) => ipcRenderer.invoke('storage:updateNote', url, noteId, updated),
  deleteNote: (url, noteId) => ipcRenderer.invoke('storage:deleteNote', url, noteId),
  getGroups: (url) => ipcRenderer.invoke('storage:getGroups', url),
  setGroups: (url, groups) => ipcRenderer.invoke('storage:setGroups', url, groups),
  addGroup: (url, name) => ipcRenderer.invoke('storage:addGroup', url, name),
  deleteGroup: (url, name) => ipcRenderer.invoke('storage:deleteGroup', url, name),
  renameGroup: (url, oldName, newName) => ipcRenderer.invoke('storage:renameGroup', url, oldName, newName),
  getTheme: () => ipcRenderer.invoke('storage:getTheme'),
  setTheme: (theme) => ipcRenderer.invoke('storage:setTheme', theme),
  getTagFilter: () => ipcRenderer.invoke('storage:getTagFilter'),
  setTagFilter: (tags) => ipcRenderer.invoke('storage:setTagFilter', tags),
  getNoteSearch: () => ipcRenderer.invoke('storage:getNoteSearch'),
  setNoteSearch: (search) => ipcRenderer.invoke('storage:setNoteSearch', search),
  getPinnedGroups: () => ipcRenderer.invoke('storage:getPinnedGroups'),
  setPinnedGroups: (groups) => ipcRenderer.invoke('storage:setPinnedGroups', groups),
  getNotesLocked: () => ipcRenderer.invoke('storage:getNotesLocked'),
  setNotesLocked: (locked) => ipcRenderer.invoke('storage:setNotesLocked', locked),
  getCustomThemePresets: () => ipcRenderer.invoke('storage:getCustomThemePresets'),
  setCustomThemePresets: (presets) => ipcRenderer.invoke('storage:setCustomThemePresets', presets),
  getAllNotes: () => ipcRenderer.invoke('storage:getAllNotes'),
  setAllNotes: (allNotes) => ipcRenderer.invoke('storage:setAllNotes', allNotes),
  getAllGroups: () => ipcRenderer.invoke('storage:getAllGroups'),
  setAllGroups: (allGroups) => ipcRenderer.invoke('storage:setAllGroups', allGroups),
  getRecentUrls: () => ipcRenderer.invoke('storage:getRecentUrls'),
  addRecentUrl: (url) => ipcRenderer.invoke('storage:addRecentUrl', url),
  getBridgePort: () => ipcRenderer.invoke('storage:getBridgePort'),
  setBridgePort: (port) => ipcRenderer.invoke('storage:setBridgePort', port),
  getCurrentVideoUrl: () => ipcRenderer.invoke('storage:getCurrentVideoUrl'),
  setCurrentVideoUrl: (url) => ipcRenderer.invoke('storage:setCurrentVideoUrl', url),
  getVideoNicknames: () => ipcRenderer.invoke('storage:getVideoNicknames'),
  setVideoNickname: (url, nickname) => ipcRenderer.invoke('storage:setVideoNickname', url, nickname),
  timecodeGetVideoTitle: (url) => ipcRenderer.invoke('timecode:getVideoTitle', url),
  timecodeGetVideoTags: (url) => ipcRenderer.invoke('timecode:getVideoTags', url),
  timecodeSetVideoTags: (url, tags) => ipcRenderer.invoke('timecode:setVideoTags', url, tags),
  timecodeGetVideoPins: (url) => ipcRenderer.invoke('timecode:getVideoPins', url),
  timecodeSetVideoPins: (url, pins) => ipcRenderer.invoke('timecode:setVideoPins', url, pins),
  getDisplays: () => ipcRenderer.invoke('app:getDisplays'),
  getPreferredDisplayId: () => ipcRenderer.invoke('storage:getPreferredDisplayId'),
  setPreferredDisplayId: (id) => ipcRenderer.invoke('storage:setPreferredDisplayId', id),
  getSplashDurationMs: () => ipcRenderer.invoke('storage:getSplashDurationMs'),
  setSplashDurationMs: (ms) => ipcRenderer.invoke('storage:setSplashDurationMs', ms),
  getSoundBootEnabled: () => ipcRenderer.invoke('storage:getSoundBootEnabled'),
  setSoundBootEnabled: (on) => ipcRenderer.invoke('storage:setSoundBootEnabled', on),
  getSoundExitEnabled: () => ipcRenderer.invoke('storage:getSoundExitEnabled'),
  setSoundExitEnabled: (on) => ipcRenderer.invoke('storage:setSoundExitEnabled', on),
  getVirusPopupEnabled: () => ipcRenderer.invoke('storage:getVirusPopupEnabled'),
  setVirusPopupEnabled: (on) => ipcRenderer.invoke('storage:setVirusPopupEnabled', on),
  getVirusVideoFolder: () => ipcRenderer.invoke('storage:getVirusVideoFolder'),
  setVirusVideoFolder: (path) => ipcRenderer.invoke('storage:setVirusVideoFolder', path),
  getGrokEnabled: () => ipcRenderer.invoke('storage:getGrokEnabled'),
  setGrokEnabled: (on) => ipcRenderer.invoke('storage:setGrokEnabled', on),
  getDevLogVisible: () => ipcRenderer.invoke('storage:getDevLogVisible'),
  setDevLogVisible: (on) => ipcRenderer.invoke('storage:setDevLogVisible', on),
  getCommandCenterYouTubeChannel: () => ipcRenderer.invoke('storage:getCommandCenterYouTubeChannel'),
  setCommandCenterYouTubeChannel: (url) => ipcRenderer.invoke('storage:setCommandCenterYouTubeChannel', url),
  getPodawfulFeedAlertEnabled: () => ipcRenderer.invoke('storage:getPodawfulFeedAlertEnabled'),
  setPodawfulFeedAlertEnabled: (on) => ipcRenderer.invoke('storage:setPodawfulFeedAlertEnabled', on),
  getPodawfulFeedAlertPollMs: () => ipcRenderer.invoke('storage:getPodawfulFeedAlertPollMs'),
  setPodawfulFeedAlertPollMs: (ms) => ipcRenderer.invoke('storage:setPodawfulFeedAlertPollMs', ms),
  podawfulFeedTestCrt: () => ipcRenderer.invoke('podawfulFeed:testCrt'),
  podawfulFeedRunCheckNow: () => ipcRenderer.invoke('podawfulFeed:runCheckNow'),
  getPodawfulTweetAlertEnabled: () => ipcRenderer.invoke('storage:getPodawfulTweetAlertEnabled'),
  setPodawfulTweetAlertEnabled: (on) => ipcRenderer.invoke('storage:setPodawfulTweetAlertEnabled', on),
  podawfulTweetTestPopup: () => ipcRenderer.invoke('podawfulTweet:testPopup'),
  podawfulTweetRunCheckNow: () => ipcRenderer.invoke('podawfulTweet:runCheckNow'),
  podawfulFeedDemoFullAlert: () => ipcRenderer.invoke('podawfulFeed:demoFullAlert'),
  podawfulTweetDemoFullAlert: () => ipcRenderer.invoke('podawfulTweet:demoFullAlert'),

  // Command Center (podawful socials + merch)
  commandCenterFetchPodawfulTweets: () => ipcRenderer.invoke('command-center:podawfulTweets'),
  commandCenterFetchPodawfulMerch: () => ipcRenderer.invoke('command-center:podawfulMerch'),

  // Tracker (Gangstalking)
  trackerGetPeople: () => ipcRenderer.invoke('tracker:getPeople'),
  trackerAddPerson: (person) => ipcRenderer.invoke('tracker:addPerson', person),
  trackerUpdatePerson: (id, updates) => ipcRenderer.invoke('tracker:updatePerson', id, updates),
  trackerDeletePerson: (id) => ipcRenderer.invoke('tracker:deletePerson', id),
  trackerGetAvatarDataUrl: (path) => ipcRenderer.invoke('tracker:getAvatarDataUrl', path),
  trackerFetchYouTubeFeed: (url) => ipcRenderer.invoke('tracker:fetchYouTubeFeed', url),
  trackerFetchXTweets: (handle) => ipcRenderer.invoke('tracker:fetchXTweets', handle),

  // Music
  musicGetFolder: () => ipcRenderer.invoke('music:getFolder'),
  musicSetFolder: (path) => ipcRenderer.invoke('music:setFolder', path),
  musicGetTrackList: (folderPath) => ipcRenderer.invoke('music:getTrackList', folderPath),
  musicGetFolderStructure: (folderPath) => ipcRenderer.invoke('music:getFolderStructure', folderPath),
  musicGetFileUrl: (filePath) => ipcRenderer.invoke('music:getFileUrl', filePath),
  musicReadFile: (filePath) => ipcRenderer.invoke('music:readFile', filePath),

  // Video (uses virus video folder)
  videoGetFolder: () => ipcRenderer.invoke('video:getFolder'),
  videoGetList: (folderPath) => ipcRenderer.invoke('video:getList', folderPath),
  videoReadFile: (filePath) => ipcRenderer.invoke('video:readFile', filePath),

  chatSendTestMessage: () => ipcRenderer.invoke('chat:sendTestMessage'),
  chatGetAddedStreams: () => ipcRenderer.invoke('chat:getAddedStreams'),
  chatSetAddedStreams: (ids) => ipcRenderer.invoke('chat:setAddedStreams', ids),
  chatGetChatLog: () => ipcRenderer.invoke('chat:getChatLog'),
  chatAppendMessage: (entry) => ipcRenderer.invoke('chat:appendMessage', entry),
  chatGetUserHistory: (platformId, username) => ipcRenderer.invoke('chat:getUserHistory', platformId, username),
  chatGetDonationsForUser: (platformId, username) => ipcRenderer.invoke('chat:getDonationsForUser', platformId, username),
  chatEnsureIdentity: (platformId, username) => ipcRenderer.invoke('chat:ensureIdentity', platformId, username),
  chatGetIdentity: (identityId) => ipcRenderer.invoke('chat:getIdentity', identityId),
  chatSetIdentity: (identityId, data) => ipcRenderer.invoke('chat:setIdentity', identityId, data),
  chatLinkUserToIdentity: (platformId, username, identityId) => ipcRenderer.invoke('chat:linkUserToIdentity', platformId, username, identityId),
  chatUnlinkUser: (platformId, username) => ipcRenderer.invoke('chat:unlinkUser', platformId, username),
  chatGetIdentityIdForUser: (platformId, username) => ipcRenderer.invoke('chat:getIdentityIdForUser', platformId, username),
  chatGetLinkedAccounts: (identityId) => ipcRenderer.invoke('chat:getLinkedAccounts', identityId),
  chatGetIdentityLinks: () => ipcRenderer.invoke('chat:getIdentityLinks'),
  chatGetIdentities: () => ipcRenderer.invoke('chat:getIdentities'),
  chatGetChatUnifiedEnabled: () => ipcRenderer.invoke('chat:getChatUnifiedEnabled'),
  chatSetChatUnifiedEnabled: (enabled) => ipcRenderer.invoke('chat:setChatUnifiedEnabled', enabled),
  chatPrimeConnections: () => ipcRenderer.invoke('chat:primeConnections'),
  chatGetEmbedEnabled: () => ipcRenderer.invoke('chat:getEmbedEnabled'),
  chatSetEmbedEnabled: (enabled) => ipcRenderer.invoke('chat:setEmbedEnabled', enabled),
  chatGetEmbedPort: () => ipcRenderer.invoke('chat:getEmbedPort'),
  chatSetEmbedPort: (port) => ipcRenderer.invoke('chat:setEmbedPort', port),
  chatGetEmbedUrl: () => ipcRenderer.invoke('chat:getEmbedUrl'),
  chatGetFilterPlatformEmotes: () => ipcRenderer.invoke('chat:getFilterPlatformEmotes'),
  chatSetFilterPlatformEmotes: (enabled) => ipcRenderer.invoke('chat:setFilterPlatformEmotes', enabled),
  chatGetPlatformEmoteBlocklist: () => ipcRenderer.invoke('chat:getPlatformEmoteBlocklist'),
  chatSetPlatformEmoteBlocklist: (list) => ipcRenderer.invoke('chat:setPlatformEmoteBlocklist', list),
  chatGetFontScale: () => ipcRenderer.invoke('chat:getFontScale'),
  chatSetFontScale: (scale) => ipcRenderer.invoke('chat:setFontScale', scale),
  chatGetPlatformLabelMode: () => ipcRenderer.invoke('chat:getPlatformLabelMode'),
  chatSetPlatformLabelMode: (mode) => ipcRenderer.invoke('chat:setPlatformLabelMode', mode),
  chatGetPlatformFilter: () => ipcRenderer.invoke('chat:getPlatformFilter'),
  chatSetPlatformFilter: (id) => ipcRenderer.invoke('chat:setPlatformFilter', id),
  chatGetNukePhrases: () => ipcRenderer.invoke('chat:getNukePhrases'),
  chatSetNukePhrases: (list) => ipcRenderer.invoke('chat:setNukePhrases', list),
  chatGetCustomCommands: () => ipcRenderer.invoke('chat:getCustomCommands'),
  chatSetCustomCommands: (obj) => ipcRenderer.invoke('chat:setCustomCommands', obj),
  chatGetCinemaPlatform: () => ipcRenderer.invoke('chat:getCinemaPlatform'),
  chatSetCinemaPlatform: (id) => ipcRenderer.invoke('chat:setCinemaPlatform', id),
  chatGetCinemaYouTubeVideoId: () => ipcRenderer.invoke('chat:getCinemaYouTubeVideoId'),
  chatSetCinemaYouTubeVideoId: (id) => ipcRenderer.invoke('chat:setCinemaYouTubeVideoId', id),
  chatGetHighlightKeywords: () => ipcRenderer.invoke('chat:getHighlightKeywords'),
  chatSetHighlightKeywords: (list) => ipcRenderer.invoke('chat:setHighlightKeywords', list),
  chatGetPinnedMessage: () => ipcRenderer.invoke('chat:getPinnedMessage'),
  chatSetPinnedMessage: (pinned) => ipcRenderer.invoke('chat:setPinnedMessage', pinned),
  chatGetWhisperConversation: (peerKey) => ipcRenderer.invoke('chat:getWhisperConversation', peerKey),
  chatAppendWhisper: (peerKey, fromMe, text) => ipcRenderer.invoke('chat:appendWhisper', peerKey, fromMe, text),
  chatGetWhisperPeerKeys: () => ipcRenderer.invoke('chat:getWhisperPeerKeys'),
  chatGetEmoteList: () => ipcRenderer.invoke('chat:getEmoteList'),
  chatSendMessage: (text) => ipcRenderer.invoke('chat:sendMessage', text),
  chatTimeoutUser: (platformId, username, durationSeconds, opts) => ipcRenderer.invoke('chat:timeoutUser', platformId, username, durationSeconds, opts),
  chatBanUser: (platformId, username, opts) => ipcRenderer.invoke('chat:banUser', platformId, username, opts),
  chatUnbanUser: (platformId, username, opts) => ipcRenderer.invoke('chat:unbanUser', platformId, username, opts),
  chatGetModerationHistory: (platformId, username) => ipcRenderer.invoke('chat:getModerationHistory', platformId, username),
  chatAddMod: (platformId, username) => ipcRenderer.invoke('chat:addMod', platformId, username),
  chatCreatePoll: (platformId, title, choices, durationSeconds) => ipcRenderer.invoke('chat:createPoll', platformId, title, choices, durationSeconds),
  chatCreateEmbedPoll: (question, options, durationSeconds) => ipcRenderer.invoke('chat:createEmbedPoll', question, options, durationSeconds),
  chatGetEmbedPoll: () => ipcRenderer.invoke('chat:getEmbedPoll'),
  chatClearEmbedPoll: () => ipcRenderer.invoke('chat:clearEmbedPoll'),
  chatSetEmbedTroll: (description, url) => ipcRenderer.invoke('chat:setEmbedTroll', description, url),
  chatGetEmbedTroll: () => ipcRenderer.invoke('chat:getEmbedTroll'),
  chatClearEmbedTroll: () => ipcRenderer.invoke('chat:clearEmbedTroll'),
  chatGetTrollHistory: () => ipcRenderer.invoke('chat:getTrollHistory'),
  chatAppendTrollHistory: (entry) => ipcRenderer.invoke('chat:appendTrollHistory', entry),
  chatGetViewerCounts: () => ipcRenderer.invoke('chat:getViewerCounts'),
  chatHasPlatformAuth: (platformId) => ipcRenderer.invoke('chat:hasPlatformAuth', platformId),
  chatStartOAuth: (platformId) => ipcRenderer.invoke('chat:startOAuth', platformId),
  getPlatformAuth: (platformId) => ipcRenderer.invoke('storage:getPlatformAuth', platformId),
  setPlatformAuth: (platformId, data) => ipcRenderer.invoke('storage:setPlatformAuth', platformId, data),
  getYouTubeChatApiKey: () => ipcRenderer.invoke('storage:getYouTubeChatApiKey'),
  setYouTubeChatApiKey: (key) => ipcRenderer.invoke('storage:setYouTubeChatApiKey', key),
  getDiscordBotToken: () => ipcRenderer.invoke('storage:getDiscordBotToken'),
  setDiscordBotToken: (token) => ipcRenderer.invoke('storage:setDiscordBotToken', token),

  grokBuddy: {
    getGrokLines: () => ipcRenderer.invoke('grok:getLines'),
    getGrokRoastMode: () => ipcRenderer.invoke('storage:getGrokRoastMode'),
    setGrokRoastMode: (on) => ipcRenderer.invoke('storage:setGrokRoastMode', on),
    getGrokTrollMode: () => ipcRenderer.invoke('storage:getGrokTrollMode'),
    setGrokTrollMode: (on) => ipcRenderer.invoke('storage:setGrokTrollMode', on),
    getGrokAlwaysOnTop: () => ipcRenderer.invoke('storage:getGrokAlwaysOnTop'),
    setGrokAlwaysOnTop: (on) => ipcRenderer.invoke('storage:setGrokAlwaysOnTop', on),
    getGrokVolume: () => ipcRenderer.invoke('storage:getGrokVolume'),
    setGrokVolume: (v) => ipcRenderer.invoke('storage:setGrokVolume', v),
    getGrokRandomIntervalMin: () => ipcRenderer.invoke('storage:getGrokRandomIntervalMin'),
    setGrokRandomIntervalMin: (ms) => ipcRenderer.invoke('storage:setGrokRandomIntervalMin', ms),
    getGrokRandomIntervalMax: () => ipcRenderer.invoke('storage:getGrokRandomIntervalMax'),
    setGrokRandomIntervalMax: (ms) => ipcRenderer.invoke('storage:setGrokRandomIntervalMax', ms),
    getGrokCategoryToggles: () => ipcRenderer.invoke('storage:getGrokCategoryToggles'),
    setGrokCategoryToggles: (obj) => ipcRenderer.invoke('storage:setGrokCategoryToggles', obj),
    getGrokClickCount: () => ipcRenderer.invoke('storage:getGrokClickCount'),
    setGrokClickCount: (n) => ipcRenderer.invoke('storage:setGrokClickCount', n),
    getGrokFirstOpenDone: () => ipcRenderer.invoke('storage:getGrokFirstOpenDone'),
    setGrokFirstOpenDone: (done) => ipcRenderer.invoke('storage:setGrokFirstOpenDone', done),
    getGrokTheme: () => ipcRenderer.invoke('storage:getGrokTheme'),
    setGrokTheme: (theme) => ipcRenderer.invoke('storage:setGrokTheme', theme),
    getChangelog: () => ipcRenderer.invoke('grok:getChangelog'),
    openOverlay: () => ipcRenderer.invoke('grok:openOverlay')
  }
};
if (isChatPopoutWindow) goonAPI.isChatPopoutWindow = true;
if (isGrokPopoutWindow) goonAPI.isGrokPopoutWindow = true;
contextBridge.exposeInMainWorld('goonAPI', goonAPI);

ipcRenderer.on('bridge:status', (_, data) => {
  window.dispatchEvent(new CustomEvent('bridgeStatus', { detail: data }));
});
ipcRenderer.on('bridge:timeUpdate', (_, data) => {
  window.dispatchEvent(new CustomEvent('bridgeTimeUpdate', { detail: data }));
});
ipcRenderer.on('app:toast', (_, message) => {
  window.dispatchEvent(new CustomEvent('goonToast', { detail: message }));
});
ipcRenderer.on('chat:message', (_, message) => {
  window.dispatchEvent(new CustomEvent('chatMessage', { detail: message }));
});
ipcRenderer.on('chat:messagesBatch', (_, messages) => {
  if (!Array.isArray(messages) || messages.length === 0) return;
  window.dispatchEvent(new CustomEvent('chatMessagesBatch', { detail: messages }));
});
ipcRenderer.on('chat:streamsChanged', () => {
  window.dispatchEvent(new CustomEvent('chatStreamsChanged'));
});
ipcRenderer.on('app:updateAvailable', (_, data) => {
  window.dispatchEvent(new CustomEvent('appUpdateAvailable', { detail: data }));
});
ipcRenderer.on('app:updateNotAvailable', () => {
  window.dispatchEvent(new CustomEvent('appUpdateNotAvailable'));
});
ipcRenderer.on('app:updateDownloaded', () => {
  window.dispatchEvent(new CustomEvent('appUpdateDownloaded'));
});
ipcRenderer.on('app:updateError', (_, data) => {
  window.dispatchEvent(new CustomEvent('appUpdateError', { detail: data }));
});
ipcRenderer.on('podawfulFeed:screenEffects', () => {
  window.dispatchEvent(new CustomEvent('podawfulFeedScreenEffects'));
});
ipcRenderer.on('podawfulTweet:screenEffects', () => {
  window.dispatchEvent(new CustomEvent('podawfulTweetScreenEffects'));
});

ipcRenderer.on('grok:randomComment', () => {
  postToGrokIframes({ type: 'grokRandomComment' });
  window.dispatchEvent(new CustomEvent('grokRandomComment'));
});
ipcRenderer.on('grok:appEvent', (_, payload) => {
  postToGrokIframes({ type: 'grokAppEvent', payload });
  window.dispatchEvent(new CustomEvent('grokAppEvent', { detail: payload }));
});
