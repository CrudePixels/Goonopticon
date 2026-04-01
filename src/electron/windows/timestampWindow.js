const { createWindow } = require('./windowManager');
const { getAppIconPath } = require('../utils/iconPath');

function openTimestampWindow() {
  const iconPath = getAppIconPath();
  return createWindow({
    file: 'timestamp.html',
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    boundsKey: 'timestamp',
    options: {
      frame: false,
      ...(iconPath && { icon: iconPath })
    }
  });
}

module.exports = { openTimestampWindow };
