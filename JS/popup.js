import { applyTheme } from './theme.js';
import { renderMainMenu } from './popup-menus.js';
import browser from 'webextension-polyfill';

// Apply the theme and render the menu after DOM is ready
document.addEventListener("DOMContentLoaded", () =>
{
    browser.storage.local.get(["PodAwful::Theme"]).then(result => {
        const theme = result["PodAwful::Theme"] || "default";
        applyTheme(theme);

        // Only render the menu after the theme is applied
        renderMainMenu();
    });
});

// Listen for theme changes in real-time (if changed elsewhere)
browser.storage.onChanged.addListener((changes, area) =>
{
    if (area === "local" && changes["PodAwful::Theme"])
    {
        const newTheme = changes["PodAwful::Theme"].newValue || "default";
        applyTheme(newTheme);
    }
});