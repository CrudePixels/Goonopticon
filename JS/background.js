import { LogDev } from './log.js';
import * as browser from 'webextension-polyfill';

// Listen for devlog messages from any context and store them in browser.storage.local
browser.runtime.onMessage.addListener((msg, sender, sendResponse) =>
{
    LogDev("Received message in background: " + JSON.stringify(msg), "event");
    
    // Handle devlog messages
    if (msg && msg.type === "devlog" && msg.entry)
    {
        browser.storage.local.get(["PodAwful::DevLog"], (result) => {
            if (browser.runtime.lastError) {
                LogDev("Error fetching DevLog: " + browser.runtime.lastError, "error");
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
            browser.storage.local.set({ "PodAwful::DevLog": DevLog }, () => {
                if (browser.runtime.lastError) {
                    LogDev("Error updating DevLog: " + browser.runtime.lastError, "error");
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
browser.runtime.onInstalled.addListener((details) =>
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
        const currentVersion = browser.runtime.getManifest().version;
        LogDev("Current version: " + currentVersion, "system");
        
        // Check if we should check for updates (avoid checking too frequently, unless forced)
        if (!forceCheck) {
            const lastCheck = await new Promise((resolve, reject) => {
                browser.storage.local.get(['lastUpdateCheck'], (result) => {
                    if (browser.runtime.lastError) {
                        reject(browser.runtime.lastError);
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
            browser.storage.local.set({ lastUpdateCheck: now }, () => {
                if (browser.runtime.lastError) {
                    reject(browser.runtime.lastError);
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
                browser.storage.local.set({
                    updateAvailable: true,
                    latestVersion: latestVersion,
                    currentVersion: currentVersion,
                    releaseUrl: releaseData.html_url,
                    releaseNotes: releaseData.body
                }, () => {
                    if (browser.runtime.lastError) {
                        reject(browser.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            
            // Show notification
            browser.notifications.create({
                type: 'basic',
                iconUrl: 'Resources/icon-48.png',
                title: 'Goonopticon Update Available',
                message: `Version ${latestVersion} is now available! Click to update.`
            });
        } else {
            LogDev("Extension is up to date", "system");
            await new Promise((resolve, reject) => {
                browser.storage.local.set({ updateAvailable: false }, () => {
                    if (browser.runtime.lastError) {
                        reject(browser.runtime.lastError);
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