import { LogDev } from '../log.js';
import * as browser from 'webextension-polyfill';

/**
 * Storage Wrapper
 * Provides consistent storage API that works in all contexts
 */

// Ensure browser is available
if (typeof browser === 'undefined') {
    console.error('Browser API not available in storage-wrapper.js');
}

/**
 * Safe storage get function
 * @param {string|string[]} keys - Key(s) to get
 * @param {Function} callback - Callback function (err, result)
 */
export function getFromStorage(keys, callback) {
    LogDev(`getFromStorage called for keys: ${Array.isArray(keys) ? keys.join(', ') : keys}`, "data");
    
    if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) {
        LogDev(`Browser storage not available, using fallback for keys: ${keys}`, "warning");
        const fallback = Array.isArray(keys) ? {} : null;
        return callback && callback(null, fallback);
    }
    
    try {
        browser.storage.local.get(keys, (result) => {
            if (browser.runtime.lastError) {
                LogDev(`Error getting storage for keys ${keys}: ${browser.runtime.lastError}`, "error");
                return callback && callback(browser.runtime.lastError);
            }
            LogDev(`Storage value for keys ${keys}: ${JSON.stringify(result)}`, "data");
            callback && callback(null, result);
        });
    } catch (error) {
        LogDev(`Error in getFromStorage: ${error.message}`, "error");
        callback && callback(error);
    }
}

/**
 * Safe storage set function
 * @param {string} key - Key to set
 * @param {*} value - Value to set
 * @param {Function} callback - Callback function (err)
 */
export function setInStorage(key, value, callback) {
    LogDev(`setInStorage called for key: ${key}`, "data");
    
    if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) {
        LogDev(`Browser storage not available for key ${key}`, "warning");
        return callback && callback(new Error("Browser storage not available"));
    }
    
    try {
        browser.storage.local.set({ [key]: value }, () => {
            if (browser.runtime.lastError) {
                LogDev(`Error setting storage for key ${key}: ${browser.runtime.lastError}`, "error");
                return callback && callback(browser.runtime.lastError);
            }
            LogDev(`Storage set successfully for key: ${key}`, "data");
            callback && callback(null);
        });
    } catch (error) {
        LogDev(`Error in setInStorage: ${error.message}`, "error");
        callback && callback(error);
    }
}

/**
 * Safe storage remove function
 * @param {string|string[]} keys - Key(s) to remove
 * @param {Function} callback - Callback function (err)
 */
export function removeFromStorage(keys, callback) {
    LogDev(`removeFromStorage called for keys: ${Array.isArray(keys) ? keys.join(', ') : keys}`, "data");
    
    if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) {
        LogDev(`Browser storage not available for keys: ${keys}`, "warning");
        return callback && callback(new Error("Browser storage not available"));
    }
    
    try {
        browser.storage.local.remove(keys, () => {
            if (browser.runtime.lastError) {
                LogDev(`Error removing storage for keys ${keys}: ${browser.runtime.lastError}`, "error");
                return callback && callback(browser.runtime.lastError);
            }
            LogDev(`Storage removed successfully for keys: ${keys}`, "data");
            callback && callback(null);
        });
    } catch (error) {
        LogDev(`Error in removeFromStorage: ${error.message}`, "error");
        callback && callback(error);
    }
}

/**
 * Safe storage clear function
 * @param {Function} callback - Callback function (err)
 */
export function clearStorage(callback) {
    LogDev(`clearStorage called`, "data");
    
    if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) {
        LogDev(`Browser storage not available for clear`, "warning");
        return callback && callback(new Error("Browser storage not available"));
    }
    
    try {
        browser.storage.local.clear(() => {
            if (browser.runtime.lastError) {
                LogDev(`Error clearing storage: ${browser.runtime.lastError}`, "error");
                return callback && callback(browser.runtime.lastError);
            }
            LogDev(`Storage cleared successfully`, "data");
            callback && callback(null);
        });
    } catch (error) {
        LogDev(`Error in clearStorage: ${error.message}`, "error");
        callback && callback(error);
    }
}
