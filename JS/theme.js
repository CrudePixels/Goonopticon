import { LogDev } from './log.js';
import { getCustomTheme, applyCustomTheme } from './customTheme.js';

const THEME_CLASSES = ["default-theme", "dark-theme", "light-theme", "custom-theme"];

/**
 * Applies the selected theme to the body, sidebar, and any additional elements.
 * @param {string} selectedTheme - The theme name (e.g., "default", "dark", "light", "custom").
 * @param {HTMLElement[]} [extraElements=[]] - Additional elements to apply the theme to.
 */
export function applyTheme(selectedTheme = "custom", extraElements = [])
{
    LogDev("ApplyTheme called with: " + selectedTheme, "render");
    
    // Always use custom theme by default
    getCustomTheme((err, customTheme) => {
        if (err) {
            LogDev("Error loading custom theme: " + err, "error");
            return;
        }
        applyCustomTheme(customTheme);
        updateThemeClass("custom-theme", extraElements);
    });
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