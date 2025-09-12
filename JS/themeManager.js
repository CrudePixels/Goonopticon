import { LogDev } from './log.js';
import { loadThemeFromFile as loadThemeFromFileUniversal, loadAllThemes as loadAllThemesUniversal } from './theme-loader.js';

/**
 * Theme Manager - Handles loading themes from JSON files and storage
 * Now uses the universal theme loader
 */

/**
 * Loads a theme from a JSON file
 * @param {string} themeName - Name of the theme file (without .json)
 * @returns {Promise<Object>} Theme object
 */
export async function loadThemeFromFile(themeName) {
    return await loadThemeFromFileUniversal(themeName);
}

/**
 * Loads all available themes (built-in + custom)
 * @returns {Promise<Array>} Array of theme objects
 */
export async function loadAllThemes() {
    return await loadAllThemesUniversal();
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
