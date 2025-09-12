// Browser Polyfill Fix
// Ensures browser API is available in all contexts

// Try to import webextension-polyfill
let browser;
try {
    const polyfill = require('webextension-polyfill');
    browser = polyfill.default || polyfill;
} catch (err) {
    // Fallback: try to use global browser object
    if (typeof globalThis !== 'undefined' && globalThis.browser) {
        browser = globalThis.browser;
    } else if (typeof window !== 'undefined' && window.browser) {
        browser = window.browser;
    } else if (typeof chrome !== 'undefined') {
        // Chrome fallback
        browser = {
            storage: {
                local: {
                    get: (keys, callback) => {
                        if (typeof keys === 'function') {
                            callback = keys;
                            keys = null;
                        }
                        if (callback) {
                            chrome.storage.local.get(keys, callback);
                        } else {
                            return new Promise((resolve, reject) => {
                                chrome.storage.local.get(keys, (result) => {
                                    if (chrome.runtime.lastError) {
                                        reject(chrome.runtime.lastError);
                                    } else {
                                        resolve(result);
                                    }
                                });
                            });
                        }
                    },
                    set: (items, callback) => {
                        if (callback) {
                            chrome.storage.local.set(items, callback);
                        } else {
                            return new Promise((resolve, reject) => {
                                chrome.storage.local.set(items, () => {
                                    if (chrome.runtime.lastError) {
                                        reject(chrome.runtime.lastError);
                                    } else {
                                        resolve();
                                    }
                                });
                            });
                        }
                    },
                    remove: (keys, callback) => {
                        if (callback) {
                            chrome.storage.local.remove(keys, callback);
                        } else {
                            return new Promise((resolve, reject) => {
                                chrome.storage.local.remove(keys, () => {
                                    if (chrome.runtime.lastError) {
                                        reject(chrome.runtime.lastError);
                                    } else {
                                        resolve();
                                    }
                                });
                            });
                        }
                    },
                    clear: (callback) => {
                        if (callback) {
                            chrome.storage.local.clear(callback);
                        } else {
                            return new Promise((resolve, reject) => {
                                chrome.storage.local.clear(() => {
                                    if (chrome.runtime.lastError) {
                                        reject(chrome.runtime.lastError);
                                    } else {
                                        resolve();
                                    }
                                });
                            });
                        }
                    }
                },
                onChanged: chrome.storage.onChanged
            },
            runtime: {
                getURL: (path) => chrome.runtime.getURL(path),
                lastError: chrome.runtime.lastError,
                onMessage: chrome.runtime.onMessage,
                sendMessage: chrome.runtime.sendMessage,
                onInstalled: chrome.runtime.onInstalled,
                onStartup: chrome.runtime.onStartup,
                getManifest: () => chrome.runtime.getManifest()
            },
            tabs: chrome.tabs,
            notifications: chrome.notifications,
            scripting: chrome.scripting
        };
    } else {
        // Mock browser object for testing
        browser = {
            storage: {
                local: {
                    get: (keys, callback) => {
                        setTimeout(() => callback({}), 0);
                    },
                    set: (items, callback) => {
                        setTimeout(() => callback(), 0);
                    },
                    remove: (keys, callback) => {
                        setTimeout(() => callback(), 0);
                    },
                    clear: (callback) => {
                        setTimeout(() => callback(), 0);
                    }
                },
                onChanged: { addListener: () => {} }
            },
            runtime: {
                getURL: (path) => path,
                lastError: null,
                onMessage: { addListener: () => {} },
                sendMessage: () => Promise.resolve(),
                onInstalled: { addListener: () => {} },
                onStartup: { addListener: () => {} },
                getManifest: () => ({ version: "2.0.7", name: "Goonopticon" })
            },
            tabs: {
                query: () => Promise.resolve([]),
                sendMessage: () => Promise.resolve()
            },
            notifications: {
                create: () => Promise.resolve()
            },
            scripting: {
                executeScript: () => Promise.resolve()
            }
        };
    }
}

// Make browser available globally
if (typeof globalThis !== 'undefined') {
    globalThis.browser = browser;
}
if (typeof window !== 'undefined') {
    window.browser = browser;
}

// Export both default and named exports
export default browser;
export const storage = browser.storage;
export const runtime = browser.runtime;
export const tabs = browser.tabs;
export const notifications = browser.notifications;
export const scripting = browser.scripting;

// Export individual storage and runtime properties for compatibility
export const { local } = browser.storage;
export const { onChanged } = browser.storage;
export const { onInstalled, onStartup, getURL, lastError, onMessage, sendMessage, getManifest } = browser.runtime;
