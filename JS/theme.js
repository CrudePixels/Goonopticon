import { LogDev } from './log.js';
import { getCustomTheme, applyCustomTheme } from './customTheme.js';
import { loadThemeFromFile } from './themeManager.js';

const THEME_CLASSES = ["default-theme", "dark-theme", "light-theme", "custom-theme"];

/**
 * Applies the selected theme to the body, sidebar, and any additional elements.
 * @param {string} selectedTheme - The theme name (e.g., "default", "dark", "light", "custom").
 * @param {HTMLElement[]} [extraElements=[]] - Additional elements to apply the theme to.
 */
export async function applyTheme(selectedTheme = "default", extraElements = [])
{
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
        
        // Save the theme to storage so it persists across page reloads
        const { setCustomTheme } = await import('./customTheme.js');
        setCustomTheme(theme, (err) => {
            if (err) {
                LogDev("Error saving preset theme to storage: " + err, "error");
            } else {
                LogDev(`Preset theme ${themeName} saved to storage`, "data");
            }
        });
        
    } catch (err) {
        LogDev("Error loading preset theme: " + err, "error");
        throw err;
    }
}

/**
 * Updates theme class on elements
 * @param {string} themeClass - The theme class to apply
 * @param {HTMLElement[]} extraElements - Additional elements to apply the theme to
 */
function updateThemeClass(themeClass, extraElements = [])
{
    function updateElement(el)
    {
        if (!el) return;
        el.classList.remove(...THEME_CLASSES);
        el.classList.add(themeClass);
        LogDev("Theme class applied to element: " + (el.id || el.tagName), "render");
    }

    try
    {
        updateElement(document.body);
        updateElement(document.getElementById('podawful-sidebar'));
        extraElements.forEach(updateElement);
        LogDev("Theme applied successfully: " + themeClass, "render");
    } catch (err)
    {
        LogDev("Theme error: " + err, "error");
    }
}