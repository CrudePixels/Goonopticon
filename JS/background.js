import { LogDev } from './log.js';
import browser from 'webextension-polyfill';

// Listen for devlog messages from any context and store them in browser.storage.local
browser.runtime.onMessage.addListener((msg, sender, sendResponse) =>
{
    LogDev("Received message in background: " + JSON.stringify(msg), "event");
    if (msg && msg.type === "devlog" && msg.entry)
    {
        browser.storage.local.get(["PodAwful::DevLog"]).then(result => {
            LogDev("Fetched current DevLog from storage", "data");
            let DevLog = Array.isArray(result["PodAwful::DevLog"]) ? result["PodAwful::DevLog"] : [];
            DevLog.push(msg.entry);
            if (DevLog.length > 100)
            {
                LogDev("DevLog exceeded 100 entries, removing oldest", "performance");
                DevLog.shift();
            }
            browser.storage.local.set({ "PodAwful::DevLog": DevLog }).then(() => {
                LogDev("Updated DevLog in storage", "data");
                sendResponse && sendResponse({ status: "ok" });
            });
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
});