/**
 * Serves an embeddable chat page over HTTP and streams messages via WebSocket.
 * Use in OBS Browser Source or <iframe> on a website (same machine or local network).
 * Embed users can send messages when onSendMessage is provided.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const storage = require('../storage/adapter');
const platformIconAssets = require('../utils/platformIconAssets');

let server = null;
let wss = null;
let getChatLogFn = null;
let onSendMessageFn = null;
let emotesDir = null;

// Persisted Website/embed-only moderation + nicknames + poll
let embedBans = new Set();
let embedMods = new Set();
let embedTimeouts = new Map(); // username -> until (ms)
let embedNicknames = new Map(); // username -> nickname
let embedPoll = null; // { question, options: [{ text, votes }], endAt, voted: { username: optionIndex } }

function loadEmbedStateFromStore() {
  try {
    const state = storage.getEmbedChatState();
    embedBans = new Set(state.bans || []);
    embedMods = new Set(state.mods || []);
    embedTimeouts = new Map();
    if (Array.isArray(state.timeouts)) {
      const now = Date.now();
      for (const t of state.timeouts) {
        if (t && typeof t.username === 'string' && t.username.trim() && typeof t.until === 'number' && Number.isFinite(t.until) && t.until > now) {
          embedTimeouts.set(t.username.trim(), t.until);
        }
      }
    }
    embedNicknames = new Map();
    if (state.nicknames && typeof state.nicknames === 'object') {
      for (const [k, v] of Object.entries(state.nicknames)) {
        if (typeof k === 'string' && k.trim() && typeof v === 'string' && v.trim()) {
          embedNicknames.set(k.trim(), v.trim());
        }
      }
    }
    embedPoll = state.poll && typeof state.poll === 'object' ? state.poll : null;
  } catch (_) {
    embedBans = new Set();
    embedMods = new Set();
    embedTimeouts = new Map();
    embedNicknames = new Map();
    embedPoll = null;
  }
}

function snapshotEmbedState() {
  const bans = Array.from(embedBans);
  const mods = Array.from(embedMods);
  const timeouts = [];
  const now = Date.now();
  for (const [username, until] of embedTimeouts.entries()) {
    if (until > now) timeouts.push({ username, until });
  }
  const nicknames = {};
  for (const [username, nick] of embedNicknames.entries()) {
    nicknames[username] = nick;
  }
  return { bans, mods, timeouts, nicknames, poll: embedPoll };
}

function isEmbedTimedOut(username) {
  const until = embedTimeouts.get(username);
  if (!until) return false;
  if (Date.now() > until) {
    embedTimeouts.delete(username);
    return false;
  }
  return true;
}

function buildControlPayload() {
  return {
    type: 'control',
    bans: Array.from(embedBans),
    mods: Array.from(embedMods),
    timeouts: Array.from(embedTimeouts.keys()),
    nicknames: Object.fromEntries(embedNicknames.entries()),
    poll: embedPoll
  };
}

function setEmbedPoll(question, options, durationSeconds) {
  const opts = (options || []).slice(0, 5).filter(Boolean).map((t) => ({ text: String(t).slice(0, 100), votes: 0 }));
  if (opts.length < 2) return false;
  const duration = Math.max(15, Math.min(3600, durationSeconds || 300)) * 1000;
  embedPoll = {
    question: String(question || 'Poll').slice(0, 200),
    options: opts,
    endAt: Date.now() + duration,
    voted: {}
  };
  storage.setEmbedChatState(snapshotEmbedState());
  if (wss) {
    const payload = JSON.stringify(buildControlPayload());
    wss.clients.forEach((client) => { if (client.readyState === 1) client.send(payload); });
  }
  return true;
}

function clearEmbedPoll() {
  embedPoll = null;
  storage.setEmbedChatState(snapshotEmbedState());
  if (wss) {
    const payload = JSON.stringify(buildControlPayload());
    wss.clients.forEach((client) => { if (client.readyState === 1) client.send(payload); });
  }
}

const EMBED_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Chat — Goonopticon</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0a0a0a; color: #e0e0e0; font-family: ui-monospace, monospace; font-size: 13px; line-height: 1.4; overflow: hidden; display: flex; flex-direction: column; height: 100vh; }
    .embed-header { flex-shrink: 0; padding: 6px 10px; background: #141414; border-bottom: 1px solid #2a2a2a; font-size: 11px; color: #888; }
    #log { flex: 1; overflow-y: auto; padding: 8px; }
    .msg { padding: 4px 0; border-bottom: 1px solid #1a1a1a; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; border-left: 3px solid transparent; padding-left: 6px; }
    .embed-user-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #1a1a1a; vertical-align: middle; }
    .msg .plat { font-size: 10px; opacity: 0.9; min-width: 52px; display: inline-flex; align-items: center; gap: 4px; }
    .embed-plat-icon { flex-shrink: 0; vertical-align: middle; object-fit: contain; }
    .msg .user { color: #00ff41; font-weight: 600; }
    .msg .donation { font-weight: 700; margin-left: 4px; padding: 2px 6px; border-radius: 4px; background: #00ff41; color: #0a0a0a; font-size: 11px; }
    .msg .text { flex: 1; word-break: break-word; }
    .msg.donation-row { background: rgba(0,255,65,0.08); border-radius: 4px; }
    .status { padding: 8px; color: #666; font-size: 11px; }
    .embed-emote { height: 1.2em; vertical-align: middle; display: inline-block; }
  </style>
</head>
<body>
  <div class="embed-header">Unified chat — embed</div>
  <div id="embed-poll-wrap" style="display:none;flex-shrink:0;padding:8px 10px;background:#141414;border-bottom:1px solid #2a2a2a;font-size:12px;"></div>
  <div id="log"></div>
  <div class="embed-input-wrap" style="flex-shrink:0;padding:8px;border-top:1px solid #2a2a2a;display:flex;gap:8px;align-items:center;">
    <input type="text" id="embed-msg-input" placeholder="Type a message…" style="flex:1;padding:8px 12px;background:#1a1a1a;border:1px solid #2a2a2a;color:#e0e0e0;border-radius:4px;font-size:13px;" />
    <button type="button" id="embed-send-btn" style="padding:8px 16px;background:#00ff41;color:#0a0a0a;border:none;border-radius:4px;cursor:pointer;font-weight:600;">Send</button>
  </div>
  <script>
    var logEl = document.getElementById('log');
    var inputEl = document.getElementById('embed-msg-input');
    var sendBtn = document.getElementById('embed-send-btn');
    var emoteNames = [];
    var embedUsername = 'Viewer';
    var embedFontScale = 5;
    var embedType = 'embed';
    try {
      var params = new URLSearchParams(location.search);
      var u = (params.get('username') || params.get('user') || params.get('displayname') || '').trim().slice(0, 64);
      if (u) embedUsername = u;
      var f = parseInt(params.get('f'), 10);
      if (f >= 1 && f <= 10) embedFontScale = f;
      var t = (params.get('t') || 'embed').toLowerCase();
      if (t === 'stream' || t === 'embed') embedType = t;
    } catch (e) {}
    (function applyEmbedParams() {
      var log = document.getElementById('log');
      if (log) log.style.fontSize = (10 + (embedFontScale - 1) * (10 / 9)).toFixed(1) + 'px';
      var header = document.querySelector('.embed-header');
      if (header) header.style.display = embedType === 'stream' ? 'none' : '';
    })();
    var colors = { twitch: '#9146ff', youtube: '#ff0000', kick: '#53fc18', dlive: '#ffd93d', rumble: '#ff6b00', odysee: '#4d7cff', podawful: '#c41e3a', embed: '#0ea5e9' };
    function esc(s) {
      if (s == null) return '';
      var d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }
    function replaceEmotes(text) {
      if (!text) return esc(text);
      var withPl = String(text).replace(/:([A-Za-z0-9_]+):/g, function (_, n) {
        if (!emoteNames || emoteNames.indexOf(n) === -1) return ':' + n + ':';
        return '{{E:' + n + '}}';
      });
      var out = esc(withPl);
      return out.replace(/\\{\\{E:([^}]+)\\}\\}/g, function(_, n) { return '<img src="/emotes/' + esc(n) + '.png" class="embed-emote" alt=":' + esc(n) + ':" />'; });
    }
    function formatAmount(amount, currency) {
      if (amount == null) return '';
      var n = Number(amount);
      if (!isFinite(n)) return String(amount);
      if (currency === 'bits') return Math.floor(n) + ' bits';
      if (currency === 'USD' || currency === 'usd') return '$' + n.toFixed(2);
      return n.toFixed(2) + ' ' + (currency || '');
    }
    function addMsg(m) {
      var platformId = m.platformId || '';
      var borderColor = colors[platformId] || '#333';
      var isDonation = m.donationAmount != null && m.donationAmount !== '';
      var amountHtml = isDonation ? '<span class="donation">' + esc(formatAmount(m.donationAmount, m.donationCurrency)) + '</span>' : '';
      var row = document.createElement('div');
      row.className = 'msg' + (isDonation ? ' donation-row' : '');
      row.style.borderLeftColor = borderColor;
      var safePlat = /^[a-z0-9_-]+$/i.test(platformId) ? platformId : 'other';
      var av = (m.avatarUrl || '').trim();
      var avHtml = av ? '<img class="embed-user-avatar" src="' + esc(av) + '" width="22" height="22" alt="" decoding="async" referrerpolicy="no-referrer" />' : '';
      row.innerHTML = '<span class="plat"><img class="embed-plat-icon" src="/platform-icons/' + esc(safePlat) + '" width="14" height="14" alt="" decoding="async" /> ' + esc(m.platformName || '') + '</span>' + avHtml + '<span class="user">' + esc(m.username || '') + '</span>' + amountHtml + '<span class="text">' + replaceEmotes(m.message || '') + '</span>';
      logEl.appendChild(row);
      logEl.scrollTop = logEl.scrollHeight;
    }
    function setStatus(text) {
      var s = logEl.querySelector('.status');
      if (s) s.textContent = text; else { s = document.createElement('div'); s.className = 'status'; s.textContent = text; logEl.appendChild(s); }
    }
    var ws = new WebSocket((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host);
    ws.onopen = function() { setStatus('Connected. Waiting for messages…'); };
    ws.onclose = function() { setStatus('Disconnected. Refresh to reconnect.'); };
    ws.onerror = function() { setStatus('Connection error.'); };
    var embedPollState = null;
    function renderPoll() {
      var wrap = document.getElementById('embed-poll-wrap');
      if (!wrap) return;
      if (!embedPollState || !embedPollState.question) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
      var p = embedPollState;
      var endAt = p.endAt || 0;
      var ended = endAt && Date.now() > endAt;
      var myVote = (p.voted && typeof p.voted === 'object' && embedUsername) ? p.voted[embedUsername] : undefined;
      var total = (p.options || []).reduce(function(s, o) { return s + (o.votes || 0); }, 0);
      var html = '<div style="margin-bottom:6px;font-weight:600;">' + esc(p.question) + '</div>';
      (p.options || []).forEach(function(opt, i) {
        var v = opt.votes || 0;
        var pct = total > 0 ? Math.round(100 * v / total) : 0;
        var canVote = !ended && myVote === undefined;
        var isMyVote = myVote === i;
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
        if (canVote) html += '<button type="button" class="embed-poll-opt" data-idx="' + i + '" style="padding:4px 10px;background:#00ff41;color:#0a0a0a;border:none;border-radius:4px;cursor:pointer;font-size:11px;">Vote</button>';
        else if (isMyVote) html += '<span style="color:#00ff41;font-size:11px;">✓</span>';
        html += '<span style="flex:1;">' + esc(opt.text) + '</span><span style="opacity:0.8;font-size:11px;">' + v + ' (' + pct + '%)</span></div>';
      });
      if (ended) html += '<div style="font-size:10px;opacity:0.7;margin-top:4px;">Poll ended</div>';
      wrap.innerHTML = html;
      wrap.style.display = 'block';
      wrap.querySelectorAll('.embed-poll-opt').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (ws.readyState !== 1) return;
          ws.send(JSON.stringify({ type: 'pollVote', optionIndex: idx, username: embedUsername }));
        });
      });
    }
    ws.onmessage = function(ev) {
      try {
        var data = JSON.parse(ev.data);
        if (data.type === 'control') {
          embedPollState = data.poll || null;
          renderPoll();
          return;
        }
        if (Array.isArray(data)) data.forEach(addMsg);
        else if (data.platformId != null) addMsg(data);
      } catch (e) {}
    };
    fetch('/emotes/list').then(function(r){ return r.json(); }).then(function(arr){ emoteNames = Array.isArray(arr) ? arr : []; }).catch(function(){});
    sendBtn.addEventListener('click', function() {
      var t = (inputEl.value || '').trim();
      if (!t || ws.readyState !== 1) return;
      ws.send(JSON.stringify({ type: 'send', text: t, username: embedUsername }));
      inputEl.value = '';
    });
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); sendBtn.click(); }
    });
  </script>
</body>
</html>`;

function onRequest(req, res) {
  if (req.url === '/' || req.url === '/chat' || req.url === '/embed') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(EMBED_HTML);
    return;
  }
  if (req.url === '/emotes/list') {
    try {
      if (!emotesDir || !fs.existsSync(emotesDir)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('[]');
        return;
      }
      const list = fs.readdirSync(emotesDir)
        .filter((f) => f.toLowerCase().endsWith('.png'))
        .map((f) => path.basename(f, '.png'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
    } catch (_) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
    return;
  }
  const emoteMatch = req.url.match(/^\/emotes\/([a-zA-Z0-9_-]+)\.png$/);
  if (emoteMatch && emotesDir) {
    const name = emoteMatch[1];
    const filePath = path.join(emotesDir, name + '.png');
    if (path.resolve(filePath).startsWith(path.resolve(emotesDir)) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  const platMatch = req.url.match(/^\/platform-icons\/([a-zA-Z0-9_-]+)$/);
  if (platMatch) {
    const resolved = platformIconAssets.resolvePlatformIcon(platMatch[1]);
    if (resolved.kind === 'file') {
      res.writeHead(200, { 'Content-Type': resolved.mime, 'Cache-Control': 'public, max-age=3600' });
      fs.createReadStream(resolved.filePath).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    res.end(resolved.body);
    return;
  }
  res.writeHead(404);
  res.end();
}

function broadcast(payload) {
  if (!wss) return;
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(data);
  });
}

function start(port, getChatLog, onSendMessage, emotesPath) {
  if (server) return Promise.resolve();
  getChatLogFn = getChatLog;
  onSendMessageFn = typeof onSendMessage === 'function' ? onSendMessage : null;
  emotesDir = emotesPath && fs.existsSync(emotesPath) && fs.statSync(emotesPath).isDirectory() ? emotesPath : null;
  loadEmbedStateFromStore();
  return new Promise((resolve, reject) => {
    server = http.createServer(onRequest);
    wss = new WebSocket.Server({ server });
    wss.on('connection', (ws) => {
      const log = getChatLogFn ? getChatLogFn() : [];
      if (Array.isArray(log) && log.length > 0) {
        try {
          ws.send(JSON.stringify(log));
        } catch (_) {}
      }
      // Send current Website/embed moderation + nickname state
      try {
        ws.send(JSON.stringify(buildControlPayload()));
      } catch (_) {}
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (!msg) return;

          // Normal Website chat message
          if (msg.type === 'send' && typeof msg.text === 'string' && onSendMessageFn) {
            const username = typeof msg.username === 'string' && msg.username.trim() ? msg.username.trim().slice(0, 64) : 'Viewer';
            if (embedBans.has(username) || isEmbedTimedOut(username)) return;
            onSendMessageFn(msg.text.trim(), username);
            return;
          }

          // Website/embed poll vote
          if (msg.type === 'pollVote' && embedPoll && Array.isArray(embedPoll.options)) {
            const username = (typeof msg.username === 'string' && msg.username.trim() ? msg.username.trim() : '').slice(0, 64);
            if (!username || embedBans.has(username) || isEmbedTimedOut(username)) return;
            if (embedPoll.endAt && Date.now() > embedPoll.endAt) return;
            const idx = parseInt(msg.optionIndex, 10);
            if (!Number.isFinite(idx) || idx < 0 || idx >= embedPoll.options.length) return;
            if (!embedPoll.voted) embedPoll.voted = {};
            if (embedPoll.voted[username] !== undefined) return;
            embedPoll.voted[username] = idx;
            embedPoll.options[idx].votes = (embedPoll.options[idx].votes || 0) + 1;
            storage.setEmbedChatState(snapshotEmbedState());
            const control = JSON.stringify(buildControlPayload());
            wss.clients.forEach((client) => { if (client.readyState === 1) client.send(control); });
            return;
          }

          // Website/embed-only moderation + nickname commands (no authentication yet)
          if (msg.type === 'embedModCommand' && typeof msg.command === 'string') {
            const target = (msg.target || '').trim().slice(0, 64);
            if (!target) return;

            switch (msg.command) {
              case 'ban':
                embedBans.add(target);
                embedTimeouts.delete(target);
                break;
              case 'timeout': {
                const seconds = Number(msg.durationSeconds) || 600;
                embedTimeouts.set(target, Date.now() + seconds * 1000);
                break;
              }
              case 'unban':
                embedBans.delete(target);
                embedTimeouts.delete(target);
                break;
              case 'mod':
                embedMods.add(target);
                break;
              case 'unmod':
                embedMods.delete(target);
                break;
              case 'nickname': {
                const nick = (msg.nickname || '').trim().slice(0, 64);
                if (nick) embedNicknames.set(target, nick);
                else embedNicknames.delete(target);
                break;
              }
              default:
                break;
            }

            // Persist and broadcast updated state to all embed clients
            storage.setEmbedChatState(snapshotEmbedState());
            const control = JSON.stringify(buildControlPayload());
            wss.clients.forEach((client) => {
              if (client.readyState === 1) client.send(control);
            });
          }
        } catch (_) {}
      });
    });
    server.listen(port, '0.0.0.0', () => resolve());
    server.on('error', reject);
  });
}

function stop() {
  if (wss) {
    wss.clients.forEach((c) => c.close());
    wss.close();
    wss = null;
  }
  if (server) {
    server.close();
    server = null;
  }
  getChatLogFn = null;
  onSendMessageFn = null;
  emotesDir = null;
}

function isRunning() {
  return server != null;
}

function getClientCount() {
  if (!wss) return 0;
  let n = 0;
  wss.clients.forEach((c) => { if (c.readyState === 1) n++; });
  return n;
}

function unbanByUsername(username) {
  const target = (username || '').trim().slice(0, 64);
  if (!target) return { ok: false, error: 'Username required' };
  embedBans.delete(target);
  embedTimeouts.delete(target);
  storage.setEmbedChatState(snapshotEmbedState());
  const control = JSON.stringify(buildControlPayload());
  if (wss) wss.clients.forEach((client) => { if (client.readyState === 1) client.send(control); });
  return { ok: true };
}

module.exports = { start, stop, broadcast, isRunning, setEmbedPoll, clearEmbedPoll, getClientCount, unbanByUsername };
