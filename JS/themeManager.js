import { LogDev } from './log.js';
import * as browser from 'webextension-polyfill';

/**
 * Theme Manager - Handles loading themes from JSON files and storage
 */

// Built-in theme files
const BUILT_IN_THEMES = [
    'default.json',
    'light.json', 
    'dark.json',
    'red-mode.json',
    'polycule-blue.json',
    'paycell-green.json'
];

/**
 * Loads a theme from a JSON file
 * @param {string} themeName - Name of the theme file (without .json)
 * @returns {Promise<Object>} Theme object
 */
export async function loadThemeFromFile(themeName) {
    try {
        const fileName = themeName.endsWith('.json') ? themeName : `${themeName}.json`;
        const filePath = `themes/${fileName}`;
        
        LogDev(`Loading theme from file: ${filePath}`, 'system');
        
        // Try to load from built-in themes first
        if (BUILT_IN_THEMES.includes(fileName)) {
            const response = await fetch(browser.runtime.getURL(filePath));
            if (!response.ok) {
                throw new Error(`Failed to load theme file: ${response.statusText}`);
            }
            const theme = await response.json();
            LogDev(`Built-in theme loaded: ${theme.name}`, 'system');
            return theme;
        }
        
        // For custom themes, try to load from storage first
        const customTheme = await loadCustomThemeFromStorage(themeName);
        if (customTheme) {
            return customTheme;
        }
        
        throw new Error(`Theme not found: ${themeName}`);
    } catch (err) {
        LogDev(`Error loading theme from file: ${err.message}`, 'error');
        throw err;
    }
}

/**
 * Loads all available themes (built-in + custom)
 * @returns {Promise<Array>} Array of theme objects
 */
export async function loadAllThemes() {
    try {
        const themes = [];
        
        // Load built-in themes
        for (const themeFile of BUILT_IN_THEMES) {
            try {
                const theme = await loadThemeFromFile(themeFile.replace('.json', ''));
                themes.push(theme);
            } catch (err) {
                LogDev(`Failed to load built-in theme ${themeFile}: ${err.message}`, 'error');
            }
        }
        
        // Load custom themes from storage
        const customThemes = await loadCustomThemesFromStorage();
        themes.push(...customThemes);
        
        LogDev(`Loaded ${themes.length} themes total`, 'system');
        return themes;
    } catch (err) {
        LogDev(`Error loading all themes: ${err.message}`, 'error');
        return [];
    }
}

/**
 * Loads a custom theme from storage
 * @param {string} themeName - Name of the theme
 * @returns {Promise<Object|null>} Theme object or null if not found
 */
async function loadCustomThemeFromStorage(themeName) {
    try {
        const result = await browser.storage.local.get(['PodAwful::CustomThemes']);
        const customThemes = result['PodAwful::CustomThemes'] || {};
        return customThemes[themeName] || null;
    } catch (err) {
        LogDev(`Error loading custom theme from storage: ${err.message}`, 'error');
        return null;
    }
}

/**
 * Loads all custom themes from storage
 * @returns {Promise<Array>} Array of custom theme objects
 */
async function loadCustomThemesFromStorage() {
    try {
        const result = await browser.storage.local.get(['PodAwful::CustomThemes']);
        const customThemes = result['PodAwful::CustomThemes'] || {};
        return Object.values(customThemes);
    } catch (err) {
        LogDev(`Error loading custom themes from storage: ${err.message}`, 'error');
        return [];
    }
}

/**
 * Saves a custom theme to storage
 * @param {Object} theme - Theme object to save
 * @returns {Promise<void>}
 */
export async function saveCustomThemeToStorage(theme) {
    try {
        const result = await browser.storage.local.get(['PodAwful::CustomThemes']);
        const customThemes = result['PodAwful::CustomThemes'] || {};
        customThemes[theme.name] = theme;
        
        await browser.storage.local.set({ 'PodAwful::CustomThemes': customThemes });
        LogDev(`Custom theme saved: ${theme.name}`, 'system');
    } catch (err) {
        LogDev(`Error saving custom theme: ${err.message}`, 'error');
        throw err;
    }
}

/**
 * Deletes a custom theme from storage
 * @param {string} themeName - Name of the theme to delete
 * @returns {Promise<void>}
 */
export async function deleteCustomTheme(themeName) {
    try {
        const result = await browser.storage.local.get(['PodAwful::CustomThemes']);
        const customThemes = result['PodAwful::CustomThemes'] || {};
        delete customThemes[themeName];
        
        await browser.storage.local.set({ 'PodAwful::CustomThemes': customThemes });
        LogDev(`Custom theme deleted: ${themeName}`, 'system');
    } catch (err) {
        LogDev(`Error deleting custom theme: ${err.message}`, 'error');
        throw err;
    }
}

/**
 * Exports a theme as JSON string
 * @param {Object} theme - Theme object to export
 * @returns {string} JSON string
 */
export function exportTheme(theme) {
    try {
        return JSON.stringify(theme, null, 2);
    } catch (err) {
        LogDev(`Error exporting theme: ${err.message}`, 'error');
        throw err;
    }
}

/**
 * Imports a theme from JSON string
 * @param {string} jsonString - JSON string to import
 * @returns {Object} Theme object
 */
export function importTheme(jsonString) {
    try {
        const theme = JSON.parse(jsonString);
        
        // Validate theme structure
        if (!theme.name || !theme.colors || !theme.typography || !theme.spacing || !theme.buttons) {
            throw new Error('Invalid theme structure');
        }
        
        LogDev(`Theme imported: ${theme.name}`, 'system');
        return theme;
    } catch (err) {
        LogDev(`Error importing theme: ${err.message}`, 'error');
        throw err;
    }
}

/**
 * Downloads a theme as a JSON file
 * @param {Object} theme - Theme object to download
 */
export function downloadTheme(theme) {
    try {
        const jsonString = exportTheme(theme);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        LogDev(`Theme downloaded: ${theme.name}`, 'system');
    } catch (err) {
        LogDev(`Error downloading theme: ${err.message}`, 'error');
        throw err;
    }
}
