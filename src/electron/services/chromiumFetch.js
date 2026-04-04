'use strict';

/**
 * Use Chromium's fetch when available (Electron main process). Falls back to Node fetch.
 * Helps with sites that behave differently for undici vs browser stacks (YouTube, mirrors).
 */
async function chromiumFetch(resource, init) {
  try {
    const { net } = require('electron');
    if (net && typeof net.fetch === 'function') {
      return await net.fetch(resource, init);
    }
  } catch {
    // non-Electron or net unavailable
  }
  return fetch(resource, init);
}

module.exports = { chromiumFetch };
