import { LogDev } from '../../log.js';
import { DEFAULT_CUSTOM_THEME, STORAGE_KEYS } from './theme-definitions.js';
import * as browser from 'webextension-polyfill';

/**
 * Theme Storage Module
 * Handles loading and saving themes to browser storage
 */

/**
 * Gets the custom theme from storage
 * @param {Function} callback - Callback function
 */
export function getCustomTheme(callback) {
    LogDev("GetCustomTheme called", "data");
    browser.storage.local.get([STORAGE_KEYS.CUSTOM_THEME], (result) => {
        if (browser.runtime.lastError) {
            LogDev("GetCustomTheme error: " + browser.runtime.lastError, "error");
            return callback(browser.runtime.lastError);
        }
        
        const customTheme = result[STORAGE_KEYS.CUSTOM_THEME];
        if (customTheme) {
            LogDev("Custom theme loaded from storage", "data");
            callback(null, customTheme);
        } else {
            LogDev("No custom theme found in storage", "data");
            callback(null, null);
        }
    });
}

/**
 * Sets the custom theme in storage
 * @param {Object} theme - Theme object to save
 * @param {Function} callback - Callback function
 */
export function setCustomTheme(theme, callback) {
    LogDev("SetCustomTheme called", "data");
    browser.storage.local.set({ [STORAGE_KEYS.CUSTOM_THEME]: theme }, () => {
        if (browser.runtime.lastError) {
            LogDev("SetCustomTheme error: " + browser.runtime.lastError, "error");
            return callback && callback(browser.runtime.lastError);
        }
        LogDev("Custom theme saved to storage", "data");
        callback && callback(null);
    });
}

/**
 * Gets the selected theme from storage
 * @param {Function} callback - Callback function
 */
export function getSelectedTheme(callback) {
    LogDev("GetSelectedTheme called", "data");
    browser.storage.local.get([STORAGE_KEYS.THEME], (result) => {
        if (browser.runtime.lastError) {
            LogDev("GetSelectedTheme error: " + browser.runtime.lastError, "error");
            return callback(browser.runtime.lastError);
        }
        
        const theme = result[STORAGE_KEYS.THEME] || 'default';
        LogDev("Selected theme loaded: " + theme, "data");
        callback(null, theme);
    });
}

/**
 * Sets the selected theme in storage
 * @param {string} themeName - Name of the theme
 * @param {Function} callback - Callback function
 */
export function setSelectedTheme(themeName, callback) {
    LogDev("SetSelectedTheme called: " + themeName, "data");
    browser.storage.local.set({ [STORAGE_KEYS.THEME]: themeName }, () => {
        if (browser.runtime.lastError) {
            LogDev("SetSelectedTheme error: " + browser.runtime.lastError, "error");
            return callback && callback(browser.runtime.lastError);
        }
        LogDev("Selected theme saved: " + themeName, "data");
        callback && callback(null);
    });
}

/**
 * Gets the selected preset from storage
 * @param {Function} callback - Callback function
 */
export function getSelectedPreset(callback) {
    LogDev("GetSelectedPreset called", "data");
    browser.storage.local.get([STORAGE_KEYS.SELECTED_PRESET], (result) => {
        if (browser.runtime.lastError) {
            LogDev("GetSelectedPreset error: " + browser.runtime.lastError, "error");
            return callback(browser.runtime.lastError);
        }
        
        const preset = result[STORAGE_KEYS.SELECTED_PRESET] || 'Default';
        LogDev("Selected preset loaded: " + preset, "data");
        callback(null, preset);
    });
}

/**
 * Sets the selected preset in storage
 * @param {string} presetName - Name of the preset
 * @param {Function} callback - Callback function
 */
export function setSelectedPreset(presetName, callback) {
    LogDev("SetSelectedPreset called: " + presetName, "data");
    browser.storage.local.set({ [STORAGE_KEYS.SELECTED_PRESET]: presetName }, () => {
        if (browser.runtime.lastError) {
            LogDev("SetSelectedPreset error: " + browser.runtime.lastError, "error");
            return callback && callback(browser.runtime.lastError);
        }
        LogDev("Selected preset saved: " + presetName, "data");
        callback && callback(null);
    });
}

/**
 * Resets the custom theme to default
 * @param {Function} callback - Callback function
 */
export function resetCustomTheme(callback) {
    LogDev("ResetCustomTheme called", "data");
    setCustomTheme(DEFAULT_CUSTOM_THEME, callback);
}
