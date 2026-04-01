const { createWindow } = require('./windowManager');
const { getAppIconPath } = require('../utils/iconPath');

function openMusicWindow() {
  const iconPath = getAppIconPath();
  return createWindow({
    file: 'music.html',
    width: 900,
    height: 600,
    boundsKey: 'music',
    options: {
      frame: false,
      ...(iconPath && { icon: iconPath })
    }
  });
}

module.exports = { openMusicWindow };
