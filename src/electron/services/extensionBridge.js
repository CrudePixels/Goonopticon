const { WebSocketServer } = require('ws');
const http = require('http');
const { EventEmitter } = require('events');

const bridgeEmitter = new EventEmitter();
bridgeEmitter.setMaxListeners(8);

let server = null;
let wss = null;
let bridgeClient = null;
let currentPort = null;
let listenResult = { ok: false, port: null, error: null };

function stopBridge() {
  if (bridgeClient) {
    bridgeClient = null;
    bridgeEmitter.emit('disconnect');
  }
  if (wss) {
    wss.close();
    wss = null;
  }
  if (server) {
    try {
      server.close();
    } catch (_) {}
    server = null;
  }
  currentPort = null;
  listenResult = { ok: false, port: null, error: null };
}

function startBridge(port = 9245) {
  return new Promise((resolve) => {
    stopBridge();
    const tryPort = (p) => {
      if (p > port + 10) {
        listenResult = { ok: false, port: port, error: 'Port in use. Try changing port in Settings.' };
        bridgeEmitter.emit('listenError', listenResult);
        resolve(listenResult);
        return;
      }
      server = http.createServer((req, res) => {
        if (req.url === '/goonopticon-bridge-ping' || (req.url && req.url.startsWith('/goonopticon-bridge-ping?'))) {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ ok: true, port: p }));
          return;
        }
        res.statusCode = 404;
        res.end();
      });
      wss = new WebSocketServer({ server });

      wss.on('connection', (ws) => {
        bridgeClient = ws;
        ws.send(JSON.stringify({ event: 'hello', source: 'desktop' }));
        bridgeEmitter.emit('connection');

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.event === 'connected') {}
            if (msg.event === 'timeUpdate' && typeof msg.time === 'number') {
              bridgeEmitter.emit('timeUpdate', msg.time);
            }
          } catch (_) {}
        });

        ws.on('close', () => {
          if (bridgeClient === ws) {
            bridgeClient = null;
            bridgeEmitter.emit('disconnect');
          }
        });

        ws.on('error', () => {
          if (bridgeClient === ws) {
            bridgeClient = null;
            bridgeEmitter.emit('disconnect');
          }
        });
      });

      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
          try { server.close(); } catch (_) {}
          server = null;
          wss = null;
          tryPort(p + 1);
        } else {
          listenResult = { ok: false, port: p, error: err.message };
          bridgeEmitter.emit('listenError', listenResult);
          resolve(listenResult);
        }
      });

      // 0.0.0.0: some setups block 127.0.0.1-only binds; loopback still reaches this from Chrome.
      server.listen(p, '0.0.0.0', () => {
        currentPort = p;
        listenResult = { ok: true, port: p, error: null };
        bridgeEmitter.emit('listening', listenResult);
        resolve(listenResult);
      });
    };
    tryPort(port);
  });
}

function isBridgeConnected() {
  return bridgeClient && bridgeClient.readyState === 1;
}

function sendSeek(time) {
  if (!isBridgeConnected()) return false;
  try {
    bridgeClient.send(JSON.stringify({ action: 'seek', time: Math.floor(time) }));
    return true;
  } catch {
    return false;
  }
}

function getListenResult() {
  return { ...listenResult };
}

module.exports = {
  startBridge,
  stopBridge,
  isBridgeConnected,
  sendSeek,
  getListenResult,
  on: bridgeEmitter.on.bind(bridgeEmitter),
  off: bridgeEmitter.off.bind(bridgeEmitter)
};
