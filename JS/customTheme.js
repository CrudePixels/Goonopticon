import { LogDev } from './log.js';
import * as browser from 'webextension-polyfill';

// Default theme configuration
const DEFAULT_CUSTOM_THEME = {
    name: 'Custom',
    colors: {
        primary: '#FFD600',      // Accent color
        background: '#1a1a1a',   // Main background
        surface: '#222222',      // Card/note background
        text: '#e0e0e0',         // Primary text
        textSecondary: '#b0b0b0', // Secondary text
        border: '#333333',       // Border color
        success: '#4CAF50',      // Success color
        warning: '#FF9800',      // Warning color
        error: '#F44336',        // Error color
        info: '#2196F3',         // Info color
        highlight: '#FFD600'     // Timestamp highlight color
    },
    typography: {
        fontSize: '14px',        // Base font size
        fontSizeSmall: '12px',   // Small text
        fontSizeLarge: '16px',   // Large text
        fontWeight: '400',       // Normal weight
        fontWeightBold: '600',   // Bold weight
        lineHeight: '1.4',       // Line height
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif"
    },
    spacing: {
        padding: '12px',         // Default padding
        margin: '8px',           // Default margin
        borderRadius: '6px',     // Border radius
        gap: '8px'               // Gap between elements
    },
    buttons: {
        height: '40px',          // Button height
        padding: '8px 16px',     // Button padding
        fontSize: '14px',        // Button font size
        borderRadius: '6px',     // Button border radius
        backgroundColor: '#FFD600', // Button background color
        textColor: '#000000',    // Button text color
        borderColor: '#FFD600'   // Button border color
    }
};

// Theme storage keys
const CUSTOM_THEME_KEY = 'PodAwful::CustomTheme';
const CUSTOM_PRESETS_KEY = 'PodAwful::CustomPresets';

/**
 * Gets the current custom theme from storage
 * @param {function} callback - Callback with (err, theme)
 */
export function getCustomTheme(callback) {
    LogDev('getCustomTheme called', 'data');
    browser.storage.local.get([CUSTOM_THEME_KEY])
        .then(result => {
            const theme = result[CUSTOM_THEME_KEY] || DEFAULT_CUSTOM_THEME;
            LogDev('Custom theme loaded: ' + JSON.stringify(theme), 'data');
            callback(null, theme);
        })
        .catch(err => {
            LogDev('Error loading custom theme: ' + err, 'error');
            callback(err, DEFAULT_CUSTOM_THEME);
        });
}

/**
 * Saves the custom theme to storage
 * @param {Object} theme - Theme object to save
 * @param {function} callback - Callback with (err)
 */
export function setCustomTheme(theme, callback) {
    LogDev('setCustomTheme called', 'system');
    browser.storage.local.set({ [CUSTOM_THEME_KEY]: theme })
        .then(() => {
            LogDev('Custom theme saved', 'system');
            if (callback) callback(null);
        })
        .catch(err => {
            LogDev('Error saving custom theme: ' + err, 'error');
            if (callback) callback(err);
        });
}

/**
 * Applies the custom theme to the document
 * @param {Object} theme - Theme object to apply
 */
export function applyCustomTheme(theme) {
    LogDev('applyCustomTheme called', 'render');
    
    if (!theme) {
        LogDev('No theme provided, using default', 'warning');
        theme = DEFAULT_CUSTOM_THEME;
    }

    // Merge with default theme to ensure all properties exist
    const mergedTheme = {
        ...DEFAULT_CUSTOM_THEME,
        ...theme,
        colors: { ...DEFAULT_CUSTOM_THEME.colors, ...(theme.colors || {}) },
        typography: { ...DEFAULT_CUSTOM_THEME.typography, ...(theme.typography || {}) },
        spacing: { ...DEFAULT_CUSTOM_THEME.spacing, ...(theme.spacing || {}) },
        buttons: { ...DEFAULT_CUSTOM_THEME.buttons, ...(theme.buttons || {}) }
    };
    
    LogDev('Merged theme:', 'data', mergedTheme);

    // Apply CSS custom properties
    const root = document.documentElement;
    LogDev('Applying theme to root element', 'system');
    
    // Colors with validation
    Object.entries(mergedTheme.colors).forEach(([key, value]) => {
        // Validate color value and provide fallback
        if (value && typeof value === 'string' && value.match(/^#[0-9A-Fa-f]{6}$/)) {
            root.style.setProperty(`--custom-${key}`, value);
            LogDev(`Set color ${key}: ${value}`, 'system');
        } else {
            // Use default fallback colors
            const fallbackColors = {
                primary: '#FFD600',
                background: '#1a1a1a',
                surface: '#222222',
                text: '#e0e0e0',
                textSecondary: '#b0b0b0',
                border: '#333333',
                success: '#4CAF50',
                warning: '#FF9800',
                error: '#F44336',
                info: '#2196F3',
                highlight: '#FFD600'
            };
            const fallbackValue = fallbackColors[key] || '#FFD600';
            root.style.setProperty(`--custom-${key}`, fallbackValue);
            LogDev(`Using fallback color for ${key}: ${fallbackValue} (original: ${value})`, 'system');
        }
    });
    
    // Typography with validation
    Object.entries(mergedTheme.typography).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            root.style.setProperty(`--custom-${key}`, value);
        }
    });
    
    // Spacing with validation
    Object.entries(mergedTheme.spacing).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            root.style.setProperty(`--custom-${key}`, value);
        }
    });
    
    // Buttons with validation
    Object.entries(mergedTheme.buttons).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            root.style.setProperty(`--custom-${key}`, value);
        }
    });

    // Add custom theme class to body and html
    document.body.classList.add('custom-theme');
    document.documentElement.classList.add('custom-theme');
    
    // Add apply-to-menus class if enabled
    if (mergedTheme.buttons.applyToMenus) {
        document.body.classList.add('apply-to-menus');
        document.documentElement.classList.add('apply-to-menus');
    } else {
        document.body.classList.remove('apply-to-menus');
        document.documentElement.classList.remove('apply-to-menus');
    }
    
    LogDev('Custom theme applied successfully', 'render');
}

/**
 * Resets the custom theme to default
 * @param {function} callback - Callback with (err)
 */
export function resetCustomTheme(callback) {
    LogDev('resetCustomTheme called', 'system');
    setCustomTheme(DEFAULT_CUSTOM_THEME, callback);
}

/**
 * Saves a custom preset theme
 * @param {string} name - Name of the preset
 * @param {object} theme - Theme object to save
 * @param {function} callback - Callback with (err)
 */
export function saveCustomPreset(name, theme, callback) {
    LogDev('saveCustomPreset called: ' + name, 'system');
    
    browser.storage.local.get([CUSTOM_PRESETS_KEY])
        .then(result => {
            const presets = result[CUSTOM_PRESETS_KEY] || {};
            presets[name] = {
                ...theme,
                name: name,
                isCustom: true
            };
            
            browser.storage.local.set({ [CUSTOM_PRESETS_KEY]: presets })
                .then(() => {
                    if (browser.runtime.lastError) {
                        LogDev('Error saving custom preset: ' + browser.runtime.lastError.message, 'error');
                        if (callback) callback(browser.runtime.lastError);
                    } else {
                        LogDev('Custom preset saved successfully', 'system');
                        if (callback) callback(null);
                    }
                });
        });
}

/**
 * Gets all custom presets
 * @param {function} callback - Callback with (err, presets)
 */
export function getCustomPresets(callback) {
    LogDev('getCustomPresets called', 'data');
    
    browser.storage.local.get([CUSTOM_PRESETS_KEY])
        .then(result => {
            const presets = result[CUSTOM_PRESETS_KEY] || {};
            LogDev('Custom presets loaded: ' + Object.keys(presets).length, 'data');
            if (callback) callback(null, presets);
        });
}

/**
 * Deletes a custom preset
 * @param {string} name - Name of the preset to delete
 * @param {function} callback - Callback with (err)
 */
export function deleteCustomPreset(name, callback) {
    LogDev('deleteCustomPreset called: ' + name, 'system');
    
    browser.storage.local.get([CUSTOM_PRESETS_KEY])
        .then(result => {
            const presets = result[CUSTOM_PRESETS_KEY] || {};
            delete presets[name];
            
            browser.storage.local.set({ [CUSTOM_PRESETS_KEY]: presets })
                .then(() => {
                    if (browser.runtime.lastError) {
                        LogDev('Error deleting custom preset: ' + browser.runtime.lastError.message, 'error');
                        if (callback) callback(browser.runtime.lastError);
                    } else {
                        LogDev('Custom preset deleted successfully', 'system');
                        if (callback) callback(null);
                    }
                });
        });
}

/**
 * Deletes any preset (built-in or custom) by adding it to a deleted list
 * @param {string} name - Name of the preset to delete
 * @param {function} callback - Callback with (err)
 */
export function deletePreset(name, callback) {
    LogDev('deletePreset called: ' + name, 'system');
    
    browser.storage.local.get(['PodAwful::DeletedPresets'])
        .then(result => {
            const deletedPresets = result['PodAwful::DeletedPresets'] || [];
            if (!deletedPresets.includes(name)) {
                deletedPresets.push(name);
            }
            
            browser.storage.local.set({ 'PodAwful::DeletedPresets': deletedPresets })
                .then(() => {
                    if (browser.runtime.lastError) {
                        LogDev('Error deleting preset: ' + browser.runtime.lastError.message, 'error');
                        if (callback) callback(browser.runtime.lastError);
                    } else {
                        LogDev('Preset deleted successfully', 'system');
                        if (callback) callback(null);
                    }
                });
        });
}

/**
 * Gets all available presets (built-in + custom) excluding deleted ones
 * @param {function} callback - Callback with (err, presets)
 */
export function getAllPresets(callback) {
    LogDev('getAllPresets called', 'data');
    
    browser.storage.local.get([CUSTOM_PRESETS_KEY, 'PodAwful::DeletedPresets'])
        .then(result => {
            const customPresets = result[CUSTOM_PRESETS_KEY] || {};
            const deletedPresets = result['PodAwful::DeletedPresets'] || [];
            
            const builtInPresets = getPresetThemes().filter(preset => !deletedPresets.includes(preset.name));
            const customPresetValues = Object.values(customPresets).filter(preset => !deletedPresets.includes(preset.name));
            
            const allPresets = [...builtInPresets, ...customPresetValues];
            
            LogDev('All presets loaded: ' + allPresets.length + ' (deleted: ' + deletedPresets.length + ')', 'data');
            if (callback) callback(null, allPresets);
        })
        .catch(err => {
            LogDev('Error loading presets: ' + err, 'error');
            if (callback) callback(err, null);
        });
}

/**
 * Restores default presets (removes all custom presets and deleted presets)
 * @param {function} callback - Callback with (err)
 */
export function restoreDefaultPresets(callback) {
    LogDev('restoreDefaultPresets called', 'system');
    
    browser.storage.local.remove([CUSTOM_PRESETS_KEY, 'PodAwful::DeletedPresets'])
        .then(() => {
            if (browser.runtime.lastError) {
                LogDev('Error restoring default presets: ' + browser.runtime.lastError.message, 'error');
                if (callback) callback(browser.runtime.lastError);
            } else {
                LogDev('Default presets restored successfully', 'system');
                if (callback) callback(null);
            }
        });
}

/**
 * Gets available preset themes
 * @returns {Array} Array of preset theme objects
 */
export function getPresetThemes() {
    return [
        {
            name: 'Default',
            colors: {
                primary: '#FFD600',
                background: '#1a1a1a',
                surface: '#222222',
                text: '#e0e0e0',
                textSecondary: '#b0b0b0',
                border: '#333333',
                success: '#4CAF50',
                warning: '#FF9800',
                error: '#F44336',
                info: '#2196F3',
                highlight: '#FFD600'
            },
            buttons: {
                height: '40px',
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                backgroundColor: '#FFD600',
                textColor: '#000000',
                borderColor: '#FFD600'
            }
        },
        {
            name: 'Light',
            colors: {
                primary: '#1976d2',
                background: '#ffffff',
                surface: '#f5f5f5',
                text: '#212121',
                textSecondary: '#757575',
                border: '#e0e0e0',
                success: '#2e7d32',
                warning: '#f57c00',
                error: '#d32f2f',
                info: '#1976d2',
                highlight: '#1976d2'
            },
            buttons: {
                height: '40px',
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                backgroundColor: '#1976d2',
                textColor: '#ffffff',
                borderColor: '#1976d2'
            }
        },
        {
            name: 'Dark',
            colors: {
                primary: '#FFD600',
                background: '#121212',
                surface: '#1e1e1e',
                text: '#ffffff',
                textSecondary: '#b0b0b0',
                border: '#333333',
                success: '#4caf50',
                warning: '#ff9800',
                error: '#f44336',
                info: '#2196f3',
                highlight: '#FFD600'
            },
            buttons: {
                height: '40px',
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                backgroundColor: '#FFD600',
                textColor: '#000000',
                borderColor: '#FFD600'
            }
        },
        {
            name: 'Dark Blue',
            colors: {
                primary: '#2196F3',
                background: '#0d1117',
                surface: '#161b22',
                text: '#f0f6fc',
                textSecondary: '#8b949e',
                border: '#30363d',
                success: '#4caf50',
                warning: '#ff9800',
                error: '#f44336',
                info: '#2196f3',
                highlight: '#2196F3'
            },
            buttons: {
                height: '40px',
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                backgroundColor: '#2196F3',
                textColor: '#ffffff',
                borderColor: '#2196F3'
            }
        },
        {
            name: 'Purple',
            colors: {
                primary: '#9c27b0',
                background: '#1a0d1a',
                surface: '#2d1b2d',
                text: '#f3e5f5',
                textSecondary: '#ce93d8',
                border: '#4a148c',
                success: '#4caf50',
                warning: '#ff9800',
                error: '#f44336',
                info: '#2196f3',
                highlight: '#9c27b0'
            },
            buttons: {
                height: '40px',
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                backgroundColor: '#9c27b0',
                textColor: '#ffffff',
                borderColor: '#9c27b0'
            }
        },
        {
            name: 'Green',
            colors: {
                primary: '#4CAF50',
                background: '#0d1a0d',
                surface: '#1a2e1a',
                text: '#e8f5e8',
                textSecondary: '#a5d6a7',
                border: '#2e7d32',
                success: '#4caf50',
                warning: '#ff9800',
                error: '#f44336',
                info: '#2196f3',
                highlight: '#4CAF50'
            },
            buttons: {
                height: '40px',
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                backgroundColor: '#4CAF50',
                textColor: '#000000',
                borderColor: '#4CAF50'
            }
        },
        {
            name: 'Orange',
            colors: {
                primary: '#FF9800',
                background: '#1a0f0a',
                surface: '#2d1f0f',
                text: '#fff3e0',
                textSecondary: '#ffcc80',
                border: '#e65100',
                success: '#4caf50',
                warning: '#ff9800',
                error: '#f44336',
                info: '#2196f3',
                highlight: '#FF9800'
            },
            buttons: {
                height: '40px',
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                backgroundColor: '#FF9800',
                textColor: '#000000',
                borderColor: '#FF9800'
            }
        }
    ];
}

/**
 * Creates a theme from a preset
 * @param {string} presetName - Name of the preset
 * @returns {Object} Theme object
 */
export function createThemeFromPreset(presetName) {
    const presets = getPresetThemes();
    const preset = presets.find(p => p.name === presetName);
    
    if (!preset) {
        LogDev('Preset not found: ' + presetName, 'warning');
        return DEFAULT_CUSTOM_THEME;
    }
    
    return {
        ...DEFAULT_CUSTOM_THEME,
        name: preset.name,
        colors: { ...DEFAULT_CUSTOM_THEME.colors, ...preset.colors }
    };
}
