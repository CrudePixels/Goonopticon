/**
 * Sync-append trace file to find where the app stops (main thread stalls vs renderer hangs).
 * Log: <userData>/freeze-trace.log
 * Disable: set env GOONOPTICON_FREEZE_TRACE=0
 */

const fs = require('fs');
const path = require('path');
const { app, ipcMain, shell } = require('electron');

const LAG_LOG_MS = 900;
let tracePath = null;
let sessionStarted = false;
let watcherOn = false;

function enabled() {
  return process.env.GOONOPTICON_FREEZE_TRACE !== '0';
}

function getPath() {
  try {
    if (tracePath) return tracePath;
    if (app.isReady()) return path.join(app.getPath('userData'), 'freeze-trace.log');
  } catch (_) {}
  return null;
}

function mark(tag, detail) {
  if (!enabled()) return;
  try {
    const p = getPath();
    if (!p) return;
    const extra = detail !== undefined && detail !== null ? ` ${JSON.stringify(detail)}` : '';
    const line = `${Date.now()} ${new Date().toISOString()} [MAIN] ${String(tag)}${extra}\n`;
    fs.appendFileSync(p, line);
  } catch (_) {}
}

function rendererMark(tag, detail) {
  if (!enabled()) return;
  try {
    const p = getPath();
    if (!p) return;
    const extra = detail !== undefined && detail !== null ? ` ${JSON.stringify(detail)}` : '';
    const line = `${Date.now()} ${new Date().toISOString()} [RENDERER] ${String(tag)}${extra}\n`;
    fs.appendFileSync(p, line);
  } catch (_) {}
}

function startSessionBanner() {
  if (!enabled() || sessionStarted) return;
  try {
    tracePath = path.join(app.getPath('userData'), 'freeze-trace.log');
    const banner = `\n========== FREEZE TRACE SESSION ${new Date().toISOString()} pid=${process.pid} ==========\n`;
    fs.appendFileSync(tracePath, banner);
    sessionStarted = true;
    mark('freeze_trace_start', { file: tracePath, hint: 'Last line before a hang is usually the blocking section; EVENT_LOOP_LAG_MS = main process blocked' });
  } catch (e) {
    console.error('freezeTrace session failed', e?.message || e);
  }
}

function startEventLoopLagWatcher() {
  if (!enabled() || watcherOn || !sessionStarted) return;
  watcherOn = true;
  let last = process.hrtime.bigint();
  const step = () => {
    setImmediate(() => {
      const now = process.hrtime.bigint();
      const ms = Number(now - last) / 1e6;
      last = now;
      if (ms >= LAG_LOG_MS) {
        mark('EVENT_LOOP_LAG_MS', { ms: Math.round(ms) });
      }
      step();
    });
  };
  step();
}

function init() {
  if (!enabled()) return;
  startSessionBanner();
  startEventLoopLagWatcher();
}

function registerIpc() {
  ipcMain.on('diag:freezeTrace', (_, tag, detail) => {
    rendererMark(String(tag || 'renderer'), detail);
  });
  ipcMain.handle('diag:getFreezeTracePath', () => getPath() || '');
  ipcMain.handle('diag:openFreezeTrace', async () => {
    const p = getPath();
    if (!p || !fs.existsSync(p)) return { ok: false, error: 'No trace file yet' };
    const errMsg = await shell.openPath(p);
    return errMsg ? { ok: false, error: errMsg } : { ok: true, path: p };
  });
}

function attachWebContentsDiagnostics(wc, label) {
  if (!enabled() || !wc) return;
  wc.on('unresponsive', () => {
    mark('WEBCONTENTS_UNRESPONSIVE', { label: label || 'main', url: wc.getURL() });
  });
  wc.on('responsive', () => {
    mark('WEBCONTENTS_RESPONSIVE', { label: label || 'main' });
  });
  wc.on('did-fail-load', (_e, code, desc, url) => {
    mark('WEBCONTENTS_DID_FAIL_LOAD', { label: label || 'main', code, desc, url });
  });
  wc.on('render-process-gone', (_e, details) => {
    mark('RENDER_PROCESS_GONE', { label: label || 'main', reason: details?.reason, exitCode: details?.exitCode });
  });
}

module.exports = {
  init,
  mark,
  registerIpc,
  getPath,
  attachWebContentsDiagnostics
};
