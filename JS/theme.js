import { LogDev } from './log.js';

const THEME_CLASSES = ["default-theme", "dark-theme", "light-theme"];

/**
 * Applies the selected theme to the body, sidebar, and any additional elements.
 * @param {string} selectedTheme - The theme name (e.g., "default", "dark", "light").
 * @param {HTMLElement[]} [extraElements=[]] - Additional elements to apply the theme to.
 */
export function applyTheme(selectedTheme = "default", extraElements = [])
{
    LogDev("ApplyTheme called with: " + selectedTheme, "render");
    const themeClass = `${selectedTheme}-theme`;

    function updateThemeClass(el)
    {
        if (!el) return;
        el.classList.remove(...THEME_CLASSES);
        el.classList.add(themeClass);
        LogDev("Theme class applied to element: " + (el.id || el.tagName), "render");
    }

    try
    {
        updateThemeClass(document.body);
        updateThemeClass(document.getElementById('podawful-sidebar'));
        extraElements.forEach(updateThemeClass);
        LogDev("Theme applied successfully: " + selectedTheme, "render");
    } catch (err)
    {
        LogDev("Theme error: " + err, "error");
    }
}