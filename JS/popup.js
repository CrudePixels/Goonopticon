// Version: 1.0.4 (refactored for dynamic menu)
import { LogDev } from './log.js';
import { GetTheme } from './sidebar/storage.js';
import { ApplyTheme } from './theme.js';
import { renderMainMenu } from './popup-menus.js';

document.addEventListener("DOMContentLoaded", () =>
{
    LogDev("Popup DOMContentLoaded event", "render");

    // --- Theme and Logo ---
    function applyPopupTheme(themeName)
    {
        LogDev("Applying popup theme: " + themeName, "render");
        const themeClass = (themeName || "default") + "-theme";
        document.body.className = `popup ${themeClass}`;
        // Set the logo based on theme
        let LogoFile = "logo-default.png";
        if (themeName === "light") LogoFile = "logo-light.png";
        else if (themeName === "dark") LogoFile = "logo-dark.png";
        const LogoImg = document.getElementById("popupLogo");
        if (LogoImg)
        {
            LogoImg.src = chrome.runtime.getURL("Resources/" + LogoFile);
            LogDev("Popup logo set for theme: " + themeName, "render");
        }
    }

    const SelectedTheme = localStorage.getItem("PodAwful::Theme") || "default";
    applyPopupTheme(SelectedTheme);

    // Listen for theme changes (if changed elsewhere)
    GetTheme(theme =>
    {
        LogDev("Theme loaded from storage: " + theme, "render");
        applyPopupTheme(theme);
    });

    // --- Render the main menu ---
    LogDev("Rendering main menu in popup", "render");
    renderMainMenu();
});