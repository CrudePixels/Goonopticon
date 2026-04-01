/**
 * OAuth login flows: start local server, open browser, exchange code for token.
 * Redirect URI: http://localhost:8765/callback (user must add this to their app settings).
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { shell } = require('electron');
const storage = require('../storage/adapter');

const OAUTH_PORT = 8765;
const REDIRECT_URI = 'http://localhost:' + OAUTH_PORT + '/callback';

function randomState() {
  return crypto.randomBytes(16).toString('hex');
}

function pkceChallenge() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function startOAuthServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '', 'http://localhost');
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><p>Success! You can close this window and return to the app.</p></body></html>');
        server.close();
        resolve({ code, state });
      }
    });
    server.listen(OAUTH_PORT, '127.0.0.1', () => resolve({ server }));
    server.on('error', reject);
    // Return a way to wait for callback and then get code
    const waitForCode = () => new Promise((res, rej) => {
      const timeout = setTimeout(() => {
        server.close();
        rej(new Error('OAuth timeout'));
      }, 120000);
      server.on('request', (req, res) => {
        const url = new URL(req.url || '', 'http://localhost');
        if (url.pathname === '/callback') {
          clearTimeout(timeout);
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><p>Success! You can close this window.</p></body></html>');
          server.close();
          res({ code, state });
        }
      });
    });
    server._waitForCode = waitForCode;
  });
}

function twitchExchange(code, clientId, clientSecret) {
  return new Promise((resolve) => {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    }).toString();
    const req = https.request(
      {
        hostname: 'id.twitch.tv',
        path: '/oauth2/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(buf || '{}');
            resolve(j.access_token ? { ok: true, accessToken: j.access_token, refreshToken: j.refresh_token } : { ok: false, error: j.message || buf });
          } catch {
            resolve({ ok: false, error: buf });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

function kickExchange(code, clientId, clientSecret, codeVerifier) {
  return new Promise((resolve) => {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: codeVerifier
    }).toString();
    const req = https.request(
      {
        hostname: 'id.kick.com',
        path: '/oauth/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(buf || '{}');
            resolve(j.access_token ? { ok: true, accessToken: j.access_token, refreshToken: j.refresh_token } : { ok: false, error: j.error || buf });
          } catch {
            resolve({ ok: false, error: buf });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

function youtubeExchange(code, clientId, clientSecret) {
  return new Promise((resolve) => {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    }).toString();
    const req = https.request(
      {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(buf || '{}');
            resolve(j.access_token ? { ok: true, accessToken: j.access_token, refreshToken: j.refresh_token } : { ok: false, error: j.error_description || buf });
          } catch {
            resolve({ ok: false, error: buf });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

async function runTwitchOAuth() {
  const auth = storage.getPlatformAuth('twitch');
  const clientId = (auth && auth.clientId) || '';
  const clientSecret = (auth && auth.clientSecret) || '';
  if (!clientId) return { ok: false, error: 'Add Twitch Client ID in Settings first' };
  const state = randomState();
  const authUrl = 'https://id.twitch.tv/oauth2/authorize?' + new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'channel:moderate channel:manage:polls channel:read user:read',
    state
  }).toString();
  const server = http.createServer();
  server.listen(OAUTH_PORT, '127.0.0.1');
  const codePromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => { server.close(); reject(new Error('Timeout')); }, 120000);
    server.on('request', (req, res) => {
      const url = new URL(req.url || '', 'http://localhost');
      if (url.pathname === '/callback') {
        clearTimeout(t);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><p>Success! Close this window and return to the app.</p></body></html>');
        server.close();
        resolve({ code: url.searchParams.get('code'), state: url.searchParams.get('state') });
      }
    });
  });
  await shell.openExternal(authUrl);
  const { code } = await codePromise;
  if (!code) return { ok: false, error: 'No code received' };
  const result = await twitchExchange(code, clientId, clientSecret);
  if (!result.ok) return result;
  storage.setPlatformAuth('twitch', { ...auth, clientId, clientSecret, accessToken: result.accessToken, refreshToken: result.refreshToken });
  return { ok: true };
}

async function runKickOAuth() {
  const auth = storage.getPlatformAuth('kick');
  const clientId = (auth && auth.clientId) || '';
  const clientSecret = (auth && auth.clientSecret) || '';
  if (!clientId || !clientSecret) return { ok: false, error: 'Add Kick Client ID and Secret in Settings first' };
  const state = randomState();
  const { verifier, challenge } = pkceChallenge();
  const authUrl = 'https://id.kick.com/oauth/authorize?' + new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'user:read channel:read moderation:ban',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  }).toString();
  const server = http.createServer();
  server.listen(OAUTH_PORT, '127.0.0.1');
  const codePromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => { server.close(); reject(new Error('Timeout')); }, 120000);
    server.on('request', (req, res) => {
      const url = new URL(req.url || '', 'http://localhost');
      if (url.pathname === '/callback') {
        clearTimeout(t);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><p>Success! Close this window and return to the app.</p></body></html>');
        server.close();
        resolve({ code: url.searchParams.get('code') });
      }
    });
  });
  await shell.openExternal(authUrl);
  const { code } = await codePromise;
  if (!code) return { ok: false, error: 'No code received' };
  const result = await kickExchange(code, clientId, clientSecret, verifier);
  if (!result.ok) return result;
  storage.setPlatformAuth('kick', { ...auth, clientId, clientSecret, accessToken: result.accessToken, refreshToken: result.refreshToken });
  return { ok: true };
}

async function runYouTubeOAuth() {
  const auth = storage.getPlatformAuth('youtube');
  const clientId = (auth && auth.clientId) || '';
  const clientSecret = (auth && auth.clientSecret) || '';
  if (!clientId || !clientSecret) return { ok: false, error: 'Add YouTube Client ID and Secret in Settings first' };
  const state = randomState();
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl',
    state,
    access_type: 'offline',
    prompt: 'consent'
  }).toString();
  const server = http.createServer();
  server.listen(OAUTH_PORT, '127.0.0.1');
  const codePromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => { server.close(); reject(new Error('Timeout')); }, 120000);
    server.on('request', (req, res) => {
      const url = new URL(req.url || '', 'http://localhost');
      if (url.pathname === '/callback') {
        clearTimeout(t);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><p>Success! Close this window and return to the app.</p></body></html>');
        server.close();
        resolve({ code: url.searchParams.get('code') });
      }
    });
  });
  await shell.openExternal(authUrl);
  const { code } = await codePromise;
  if (!code) return { ok: false, error: 'No code received' };
  const result = await youtubeExchange(code, clientId, clientSecret);
  if (!result.ok) return result;
  storage.setPlatformAuth('youtube', { ...auth, clientId, clientSecret, accessToken: result.accessToken, refreshToken: result.refreshToken });
  return { ok: true };
}

async function runOAuth(platformId) {
  if (platformId === 'twitch') return runTwitchOAuth();
  if (platformId === 'kick') return runKickOAuth();
  if (platformId === 'youtube') return runYouTubeOAuth();
  return { ok: false, error: 'Unknown platform' };
}

module.exports = { runOAuth, REDIRECT_URI, OAUTH_PORT };
