import * as browser from 'webextension-polyfill';
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
export function LogDev(Message, Type = "miscellaneous", Cb)
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
    if (browser && browser.runtime && browser.runtime.sendMessage) {
        const entry = {
            time: new Date().toISOString(),
            action: msgStr,
            type: typeof Type === "string" ? Type : "miscellaneous",
            color: color
        };
        browser.runtime.sendMessage({ type: "devlog", entry })
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
        return;
    }
}
if (typeof window !== "undefined") {
  window.LogDev = LogDev;
}