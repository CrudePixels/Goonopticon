const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('noidAPI', {
  onImage: (cb) => {
    ipcRenderer.on('noid:setImage', (_, url) => cb(url));
  },
  onTrick: (cb) => {
    ipcRenderer.on('noid:trick', (_, payload) => cb(payload));
  },
  tryClose: () => ipcRenderer.send('noid:tryClose'),
  close: () => ipcRenderer.send('noid:close')
});
