// Version: 1.0.1

import { LogDev } from './log.js';
import { renderMainMenu } from './popup-menus.js';

LogDev("Popup shared loaded", "render");

/**
 * Opens a submenu panel in the popup UI.
 * @param {string} panel - The panel name to open.
 */
export function OpenSubMenu(panel)
{
    LogDev("OpenSubMenu called for panel: " + panel, "event");
    switch (panel)
    {
        case "importexport":
            LogDev("Opening Import/Export submenu", "event");
            renderImportExport();
            break;
        case "hotkeys":
            LogDev("Opening Hotkeys submenu", "event");
            renderHotkeys();
            break;
        case "settings":
            LogDev("Opening Settings submenu", "event");
            renderSettings();
            break;
        case "changelog":
            LogDev("Opening Changelog submenu", "event");
            renderChangelog();
            break;
        case "devlog":
            LogDev("Opening Dev Log submenu", "event");
            renderDevLog();
            break;
        default:
            LogDev("Opening Main Menu (default)", "event");
            renderMainMenu();
    }
}