const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let logPath = null;

function getLogPath() {
  if (!logPath) {
    const userData = app.getPath('userData');
    logPath = path.join(userData, 'goonopticon.log');
  }
  return logPath;
}

function log(level, msg, data) {
  const time = new Date().toISOString();
  const line = `[${time}] [${level}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}\n`;
  try {
    fs.appendFileSync(getLogPath(), line);
  } catch (e) {
    console.error('Logger write failed:', e?.message ?? e);
  }
}

module.exports = {
  info: (msg, data) => log('INFO', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  getLogPath
};
