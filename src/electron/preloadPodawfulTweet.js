const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('podawfulTweetPopupAPI', {
  onShow: (cb) => {
    ipcRenderer.on('tweetPopup:show', (_, payload) => cb(payload));
  },
  close: () => ipcRenderer.send('tweetPopup:close'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
});
