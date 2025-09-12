/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./JS/browser-polyfill-fix.js":
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   getManifest: () => (/* binding */ getManifest),
/* harmony export */   getURL: () => (/* binding */ getURL),
/* harmony export */   lastError: () => (/* binding */ lastError),
/* harmony export */   local: () => (/* binding */ local),
/* harmony export */   notifications: () => (/* binding */ notifications),
/* harmony export */   onChanged: () => (/* binding */ onChanged),
/* harmony export */   onInstalled: () => (/* binding */ onInstalled),
/* harmony export */   onMessage: () => (/* binding */ onMessage),
/* harmony export */   onStartup: () => (/* binding */ onStartup),
/* harmony export */   runtime: () => (/* binding */ runtime),
/* harmony export */   scripting: () => (/* binding */ scripting),
/* harmony export */   sendMessage: () => (/* binding */ sendMessage),
/* harmony export */   storage: () => (/* binding */ storage),
/* harmony export */   tabs: () => (/* binding */ tabs)
/* harmony export */ });
// Browser Polyfill Fix
// Ensures browser API is available in all contexts

// Try to import webextension-polyfill
let browser;
try {
    const polyfill = __webpack_require__("./JS/browser-polyfill-fix.js");
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
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (browser);
const storage = browser.storage;
const runtime = browser.runtime;
const tabs = browser.tabs;
const notifications = browser.notifications;
const scripting = browser.scripting;

// Export individual storage and runtime properties for compatibility
const { local } = browser.storage;
const { onChanged } = browser.storage;
const { onInstalled, onStartup, getURL, lastError, onMessage, sendMessage, getManifest } = browser.runtime;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXTERNAL MODULE: ./JS/browser-polyfill-fix.js
var browser_polyfill_fix = __webpack_require__("./JS/browser-polyfill-fix.js");
;// ./JS/log.js

/**
 * Logs a message to the console and to persistent storage (dev log), with color coding.
 * All logs are sent to the background script for unified storage in browser.storage.local.
 * 
 * Log Types:
 * - error: red, for all errors
 * - warning: orange, for non-critical issues
 * - system: brown, for system functions like updating, installing, etc.
 * - interaction: white, for all interactable things (buttons, confirmations, moving, renaming, deleting, etc.)
 * - event: grey, for dispatched events, listener callbacks, etc.
 * - render: green, for anything that shows on screen
 * - data: blue, for information that is populated, loaded, or written
 * - performance: yellow, for tracking render speed or execution time
 * - miscellaneous: purple, for anything else
 * 
 * @param {string|object} Message - The message or object to log.
 * @param {string} [Type="miscellaneous"] - The log type.
 * @param {function} [Cb] - Optional callback for completion or error.
 */
function LogDev(Message, Type = "miscellaneous", Cb)
{
    const colorMap = {
        error: "red",
        warning: "orange",
        system: "brown",
        interaction: "white",
        event: "grey",
        render: "green",
        data: "blue",
        performance: "yellow",
        miscellaneous: "purple"
    };
    const color = colorMap[Type] || colorMap.miscellaneous;
    const msgStr = typeof Message === "string" ? Message : JSON.stringify(Message);

    // Remove or comment out all direct console.log, console.error, and console.warn statements in favor of LogDev.
    // Console log for dev
    /*
    if (Type === "error")
    {
        console.error("%c[DevLog] " + msgStr, `color:${color}`);
    } else if (Type === "warning")
    {
        console.warn("%c[DevLog] " + msgStr, `color:${color}`);
    } else if (Type === "system")
    {
        console.info("%c[DevLog] " + msgStr, `color:${color}`);
    } else
    {
        console.log("%c[DevLog] " + msgStr, `color:${color}`);
    }
    */

    // Always send to background for unified logging
    if (browser_polyfill_fix && browser_polyfill_fix.runtime && browser_polyfill_fix.runtime.sendMessage) {
        // Check if extension context is still valid
        try {
            // Test if runtime is still available
            if (!browser_polyfill_fix.runtime.id) {
                // Extension context is invalid, skip logging
                if (typeof Cb === 'function') Cb(null);
                return;
            }
        } catch (e) {
            // Extension context is invalid, skip logging
            if (typeof Cb === 'function') Cb(null);
            return;
        }

        const entry = {
            time: new Date().toISOString(),
            action: msgStr,
            type: typeof Type === "string" ? Type : "miscellaneous",
            color: color
        };
        
        // Wrap in try-catch to handle immediate context invalidation
        try {
            browser_polyfill_fix.runtime.sendMessage({ type: "devlog", entry })
                .then((response) => {
                    if (typeof Cb === 'function') Cb(null);
                })
                .catch((err) => {
                    // Suppress extension context errors
                    if (err && (/(Extension context invalidated|Receiving end does not exist)/i).test(err.message)) {
                        // Silently ignore these errors
                        if (typeof Cb === 'function') Cb(null);
                        return;
                    }
                    // Log other errors
                    console.error("SendMessage failed:", err?.message);
                    if (typeof Cb === 'function') Cb(err);
                });
        } catch (e) {
            // Handle immediate context invalidation
            if (typeof Cb === 'function') Cb(null);
        }
        return;
    }
}
if (typeof window !== "undefined") {
  window.LogDev = LogDev;
}
;// ./JS/background.js



// Listen for devlog messages from any context and store them in browser.storage.local
browser_polyfill_fix.runtime.onMessage.addListener((msg, sender, sendResponse) =>
{
    LogDev("Received message in background: " + JSON.stringify(msg), "event");
    
    // Handle devlog messages
    if (msg && msg.type === "devlog" && msg.entry)
    {
        browser_polyfill_fix.storage.local.get(["PodAwful::DevLog"], (result) => {
            if (browser_polyfill_fix.runtime.lastError) {
                LogDev("Error fetching DevLog: " + browser_polyfill_fix.runtime.lastError, "error");
                sendResponse && sendResponse({ status: "error" });
                return;
            }
            
            LogDev("Fetched current DevLog from storage", "data");
            let DevLog = Array.isArray(result["PodAwful::DevLog"]) ? result["PodAwful::DevLog"] : [];
            DevLog.push(msg.entry);
            if (DevLog.length > 100)
            {
                LogDev("DevLog exceeded 100 entries, removing oldest", "performance");
                DevLog.shift();
            }
            browser_polyfill_fix.storage.local.set({ "PodAwful::DevLog": DevLog }, () => {
                if (browser_polyfill_fix.runtime.lastError) {
                    LogDev("Error updating DevLog: " + browser_polyfill_fix.runtime.lastError, "error");
                    sendResponse && sendResponse({ status: "error" });
                    return;
                }
                LogDev("Updated DevLog in storage", "data");
                sendResponse && sendResponse({ status: "ok" });
            });
        });
        // Required for async sendResponse
        return true;
    }
    
    // Handle manual update check requests
    if (msg && msg.action === "checkForUpdates") {
        LogDev("Manual update check requested", "system");
        checkForUpdates(true).then(() => {
            sendResponse && sendResponse({ success: true });
        }).catch((error) => {
            LogDev("Error during manual update check: " + error.message, "error");
            sendResponse && sendResponse({ success: false, error: error.message });
        });
        // Required for async sendResponse
        return true;
    }
    
    LogDev("Unhandled message received in background", "miscellaneous");
    // ...other message handling...
});

// System event logging for install/update
browser_polyfill_fix.runtime.onInstalled.addListener((details) =>
{
    LogDev("onInstalled event triggered", "system");
    LogDev("Extension installed/updated: " + details.reason, "system");
    
    // Check for updates on install/update
    if (details.reason === 'install' || details.reason === 'update') {
        checkForUpdates();
    }
});

// Update checking functionality
async function checkForUpdates(forceCheck = false) {
    try {
        LogDev("Checking for extension updates...", "system");
        
        // Get current version
        const currentVersion = browser_polyfill_fix.runtime.getManifest().version;
        LogDev("Current version: " + currentVersion, "system");
        
        // Check if we should check for updates (avoid checking too frequently, unless forced)
        if (!forceCheck) {
            const lastCheck = await new Promise((resolve, reject) => {
                browser_polyfill_fix.storage.local.get(['lastUpdateCheck'], (result) => {
                    if (browser_polyfill_fix.runtime.lastError) {
                        reject(browser_polyfill_fix.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            if (lastCheck.lastUpdateCheck && (now - lastCheck.lastUpdateCheck) < oneDay) {
                LogDev("Update check skipped - checked recently", "system");
                return;
            }
        }
        
        // Update last check time
        const now = Date.now();
        await new Promise((resolve, reject) => {
            browser_polyfill_fix.storage.local.set({ lastUpdateCheck: now }, () => {
                if (browser_polyfill_fix.runtime.lastError) {
                    reject(browser_polyfill_fix.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
        
        // Check GitHub for latest release
        const response = await fetch('https://api.github.com/repos/CrudePixels/Goonopticon/releases/latest');
        if (!response.ok) {
            LogDev("Failed to fetch release info: " + response.status, "error");
            return;
        }
        
        const releaseData = await response.json();
        const latestVersion = releaseData.tag_name.replace('v', ''); // Remove 'v' prefix if present
        
        LogDev("Latest version: " + latestVersion, "system");
        
        // Compare versions
        if (isNewerVersion(latestVersion, currentVersion)) {
            LogDev("New version available: " + latestVersion, "system");
            
            // Store update info for popup to display
            await new Promise((resolve, reject) => {
                browser_polyfill_fix.storage.local.set({
                    updateAvailable: true,
                    latestVersion: latestVersion,
                    currentVersion: currentVersion,
                    releaseUrl: releaseData.html_url,
                    releaseNotes: releaseData.body
                }, () => {
                    if (browser_polyfill_fix.runtime.lastError) {
                        reject(browser_polyfill_fix.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            
            // Show notification
            browser_polyfill_fix.notifications.create({
                type: 'basic',
                iconUrl: 'Resources/icon-48.png',
                title: 'Goonopticon Update Available',
                message: `Version ${latestVersion} is now available! Click to update.`
            });
        } else {
            LogDev("Extension is up to date", "system");
            await new Promise((resolve, reject) => {
                browser_polyfill_fix.storage.local.set({ updateAvailable: false }, () => {
                    if (browser_polyfill_fix.runtime.lastError) {
                        reject(browser_polyfill_fix.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
        }
        
    } catch (error) {
        LogDev("Error checking for updates: " + error.message, "error");
    }
}

// Simple version comparison function
function isNewerVersion(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
        const v1part = v1parts[i] || 0;
        const v2part = v2parts[i] || 0;
        
        if (v1part > v2part) return true;
        if (v1part < v2part) return false;
    }
    
    return false;
}

// Check for updates on startup
checkForUpdates();
/******/ })()
;
//# sourceMappingURL=background.js.map