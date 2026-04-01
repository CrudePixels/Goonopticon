const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('podawfulCrtAPI', {
  onPlay: (cb) => {
    ipcRenderer.on('podawfulCrt:play', (_, payload) => cb(payload));
  },
  close: () => ipcRenderer.send('podawfulCrt:close')
});
