import { ApplyTheme } from './theme.js';
import { renderMainMenu } from './popup-menus.js';

// Apply the theme and render the menu after DOM is ready
document.addEventListener("DOMContentLoaded", () =>
{
    chrome.storage.local.get(["PodAwful::Theme"], (result) =>
    {
        const theme = result["PodAwful::Theme"] || "default";
        ApplyTheme(theme);

        // Only render the menu after the theme is applied
        renderMainMenu();
    });
});

// Listen for theme changes in real-time (if changed elsewhere)
chrome.storage.onChanged.addListener((changes, area) =>
{
    if (area === "local" && changes["PodAwful::Theme"])
    {
        const newTheme = changes["PodAwful::Theme"].newValue || "default";
        ApplyTheme(newTheme);
    }
});