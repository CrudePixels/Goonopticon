import { LogDev } from './log.js';
import * as browser from 'webextension-polyfill';

/**
 * Universal Theme Loader
 * Works in both popup and content script contexts
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

// Embedded theme data as fallback
const EMBEDDED_THEMES = {
    'default': {
        name: 'Default',
        background: '#1a1a1a',
        text: '#ffffff',
        accent: '#FFD600',
        buttonBackground: '#FFD600',
        buttonText: '#000000',
        buttonBorder: '#FFD600',
        primary: '#FFD600',
        secondary: '#333333'
    },
    'light': {
        name: 'Light',
        background: '#ffffff',
        text: '#000000',
        accent: '#007acc',
        buttonBackground: '#007acc',
        buttonText: '#ffffff',
        buttonBorder: '#007acc',
        primary: '#007acc',
        secondary: '#f0f0f0'
    },
    'dark': {
        name: 'Dark',
        background: '#000000',
        text: '#ffffff',
        accent: '#00ff00',
        buttonBackground: '#00ff00',
        buttonText: '#000000',
        buttonBorder: '#00ff00',
        primary: '#00ff00',
        secondary: '#333333'
    }
};

/**
 * Gets embedded theme data as fallback
 * @param {string} themeName - Theme name
 * @returns {Object} Theme object
 */
function getEmbeddedTheme(themeName) {
    const theme = EMBEDDED_THEMES[themeName] || EMBEDDED_THEMES['default'];
    LogDev(`Using embedded theme data for: ${themeName}`, 'system');
    return theme;
}

/**
 * Loads a theme from a JSON file
 * @param {string} themeName - Name of the theme file (without .json)
 * @returns {Promise<Object>} Theme object
 */
export async function loadThemeFromFile(themeName) {
    try {
        const fileName = themeName.endsWith('.json') ? themeName : `${themeName}.json`;
        
        LogDev(`Loading theme from file: ${fileName}`, 'system');
        
        // Try to load from built-in themes first
        if (BUILT_IN_THEMES.includes(fileName)) {
            
            let url;
            
            // Try different URL generation methods
            try {
                if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
                    url = browser.runtime.getURL(`themes/${fileName}`);
                    LogDev(`Using browser.runtime.getURL: ${url}`, 'system');
                } else {
                    throw new Error('browser.runtime.getURL not available');
                }
            } catch (err) {
                LogDev('browser.runtime.getURL not available, trying alternative methods', 'warning');
                
                // Try to construct the extension URL manually
                try {
                    // Get the extension ID from the current script URL
                    const currentScript = document.currentScript || 
                        Array.from(document.scripts).find(script => script.src.includes('sidebar.bundle.js'));
                    
                    if (currentScript && currentScript.src) {
                        const scriptUrl = new URL(currentScript.src);
                        const extensionId = scriptUrl.hostname;
                        url = `chrome-extension://${extensionId}/themes/${fileName}`;
                        LogDev(`Using constructed extension URL: ${url}`, 'system');
                    } else {
                        throw new Error('Could not determine extension ID');
                    }
                } catch (constructErr) {
                    LogDev('Could not construct extension URL, using relative path', 'warning');
                    // Last resort: relative path
                    url = `../themes/${fileName}`;
                }
            }
            
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to load theme file: ${response.statusText}`);
                }
                const theme = await response.json();
                LogDev(`Built-in theme loaded: ${theme.name}`, 'system');
                return theme;
            } catch (fetchErr) {
                LogDev(`Failed to fetch theme file ${fileName}: ${fetchErr.message}`, 'warning');
                // Fallback to embedded theme data
                return getEmbeddedTheme(themeName);
            }
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
 * Loads custom theme from storage
 * @param {string} themeName - Theme name
 * @returns {Promise<Object|null>} Custom theme or null
 */
async function loadCustomThemeFromStorage(themeName) {
    try {
        if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) {
            LogDev('Browser storage not available for custom theme loading', 'warning');
            return null;
        }
        
        const result = await browser.storage.local.get(`PodAwful::CustomTheme::${themeName}`);
        return result[`PodAwful::CustomTheme::${themeName}`] || null;
    } catch (err) {
        LogDev(`Error loading custom theme from storage: ${err.message}`, 'error');
        return null;
    }
}

/**
 * Loads all available themes (built-in + custom)
 * @returns {Promise<Array>} Array of theme objects
 */
export async function loadAllThemes() {
    try {
        const themes = [];
        
        // Get list of deleted presets first
        let deletedPresets = [];
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
            try {
                const result = await browser.storage.local.get(['PodAwful::DeletedPresets']);
                deletedPresets = result['PodAwful::DeletedPresets'] || [];
            } catch (err) {
                LogDev(`Error loading deleted presets: ${err.message}`, 'warning');
            }
        }
        
        // Load built-in themes
        for (const themeFile of BUILT_IN_THEMES) {
            try {
                const themeName = themeFile.replace('.json', '');
                const theme = await loadThemeFromFile(themeName);
                
                // Only add if not deleted
                if (!deletedPresets.includes(theme.name)) {
                    themes.push(theme);
                }
            } catch (err) {
                LogDev(`Failed to load built-in theme ${themeFile}: ${err.message}`, 'warning');
            }
        }
        
        // Load custom themes from storage
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
            try {
                const result = await browser.storage.local.get(null);
                
                // Load themes from PodAwful::CustomTheme:: keys
                const customThemes = Object.keys(result)
                    .filter(key => key.startsWith('PodAwful::CustomTheme::'))
                    .map(key => result[key])
                    .filter(theme => theme && theme.name && !deletedPresets.includes(theme.name));
                
                // Load themes from PodAwful::CustomPresets key
                const customPresets = result['PodAwful::CustomPresets'] || {};
                const presetThemes = Object.values(customPresets)
                    .filter(theme => theme && theme.name && !deletedPresets.includes(theme.name));
                
                themes.push(...customThemes, ...presetThemes);
            } catch (err) {
                LogDev(`Error loading custom themes from storage: ${err.message}`, 'warning');
            }
        }
        
        return themes;
    } catch (err) {
        LogDev(`Error loading all themes: ${err.message}`, 'error');
        return [];
    }
}
