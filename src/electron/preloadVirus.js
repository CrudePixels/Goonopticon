const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('virusAPI', {
  onPlay: (cb) => {
    ipcRenderer.on('virus:play', (_, payload) => cb(payload));
  },
  onTrick: (cb) => {
    ipcRenderer.on('virus:trick', (_, payload) => cb(payload));
  },
  tryClose: () => ipcRenderer.send('virus:tryClose'),
  close: () => ipcRenderer.send('virus:close'),
  spawnAnother: () => ipcRenderer.send('virus:spawnAnother')
});
