import { LogDev } from './log.js';
import { loadThemeFromFile } from './theme-loader.js';
import { applyCustomTheme, updateThemeClass } from './theme/modules/theme-application.js';
import { getCustomTheme, getSelectedTheme, setSelectedTheme } from './theme/modules/theme-storage.js';

/**
 * Main Theme Module
 * Unified interface for theme management
 */

/**
 * Applies the selected theme to the body, sidebar, and any additional elements.
 * @param {string} selectedTheme - The theme name (e.g., "default", "dark", "light", "custom").
 * @param {HTMLElement[]} [extraElements=[]] - Additional elements to apply the theme to.
 */
export async function applyTheme(selectedTheme = "default", extraElements = []) {
    LogDev("ApplyTheme called with: " + selectedTheme, "render");
    
    try {
        if (selectedTheme === "custom") {
            // Load custom theme from storage
            getCustomTheme((err, customTheme) => {
                if (err) {
                    LogDev("Error loading custom theme: " + err, "error");
                    return;
                }
                if (customTheme) {
                    applyCustomTheme(customTheme);
                    updateThemeClass("custom-theme", extraElements);
                } else {
                    // Fallback to default if no custom theme
                    loadAndApplyPresetTheme("default", extraElements);
                }
            });
        } else {
            // Load preset theme from JSON file
            await loadAndApplyPresetTheme(selectedTheme, extraElements);
        }
    } catch (err) {
        LogDev("Error applying theme: " + err, "error");
        // Fallback to default theme
        await loadAndApplyPresetTheme("default", extraElements);
    }
}

/**
 * Loads and applies a preset theme from JSON file
 * @param {string} themeName - The theme name
 * @param {HTMLElement[]} extraElements - Additional elements to apply the theme to
 */
async function loadAndApplyPresetTheme(themeName, extraElements = []) {
    try {
        const theme = await loadThemeFromFile(themeName);
        LogDev(`Loaded preset theme: ${theme.name}`, "render");
        
        // Apply the theme
        applyCustomTheme(theme);
        
        // Update theme class
        const themeClass = themeName === "default" ? "default-theme" : 
                          themeName === "dark" ? "dark-theme" : 
                          themeName === "light" ? "light-theme" : "custom-theme";
        updateThemeClass(themeClass, extraElements);
        
        // Note: Preset themes are not saved as custom themes to avoid conflicts
        // The theme selection is saved separately in PodAwful::Theme
        
    } catch (err) {
        LogDev("Error loading preset theme: " + err, "error");
        throw err;
    }
}

// Re-export functions from modules for backward compatibility
export { 
    getCustomTheme, 
    setCustomTheme 
} from './theme/modules/theme-storage.js';

export { 
    applyCustomTheme 
} from './theme/modules/theme-application.js';
