import { LogDev } from '../../log.js';
import { renderImportExport } from './popup-import-export.js';
import { renderSettings } from './popup-settings.js';
import { renderThemeSettings } from './popup-theme-settings.js';
import { renderChangelog } from './popup-changelog.js';
import { renderDevLog } from './popup-dev-log.js';
import { showHelpAboutModal } from './popup-help-about.js';

/**
 * Renders the main popup menu UI.
 */
export function renderMainMenu() {
    LogDev("Navigated to Main Menu", "interaction");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Menu";
    MenuContent.innerHTML = `
        <div class="popup-buttons">
            <button class="podawful-btn" id="importExport">Import/Export</button>
            <button class="podawful-btn" id="settings">Settings</button>
            <button class="podawful-btn" id="themeSettings">Theme Settings</button>
            <button class="podawful-btn" id="changelog">Changelog</button>
            <button class="podawful-btn" id="devlog">Dev Log</button>
            <button class="podawful-btn" id="reportBug">Report Bug</button>
            <button class="podawful-btn" id="helpAbout">Help / About</button>
        </div>
    `;

    // Accessibility: Add aria-labels to all menu buttons
    const menuButtons = MenuContent.querySelectorAll('button');
    menuButtons.forEach(btn => {
        if (!btn.hasAttribute('aria-label')) {
            btn.setAttribute('aria-label', btn.textContent.trim());
        }
    });

    // Accessibility: Keyboard navigation for menu
    MenuContent.addEventListener('keydown', (e) => {
        const focusable = Array.from(MenuContent.querySelectorAll('button'));
        const idx = focusable.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (idx !== -1) {
                const next = focusable[(idx + 1) % focusable.length];
                next.focus();
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (idx !== -1) {
                const prev = focusable[(idx - 1 + focusable.length) % focusable.length];
                prev.focus();
            }
        }
    });

    // Event listeners for main menu buttons
    document.getElementById("importExport")?.addEventListener("click", () => {
        LogDev("Import/Export button clicked", "interaction");
        renderImportExport();
    });

    document.getElementById("settings")?.addEventListener("click", () => {
        LogDev("Settings button clicked", "interaction");
        renderSettings();
    });

    document.getElementById("themeSettings")?.addEventListener("click", () => {
        LogDev("Theme Settings button clicked", "interaction");
        renderThemeSettings();
    });

    document.getElementById("changelog")?.addEventListener("click", () => {
        LogDev("Changelog button clicked", "interaction");
        renderChangelog();
    });

    document.getElementById("devlog")?.addEventListener("click", () => {
        LogDev("Dev Log button clicked", "interaction");
        renderDevLog();
    });

    document.getElementById("reportBug")?.addEventListener("click", () => {
        LogDev("Report Bug button clicked", "interaction");
        window.open("mailto:podawfulhenchman@gmail.com?subject=PodAwful%20Bug%20Report", "_blank");
    });

    document.getElementById("helpAbout")?.addEventListener("click", () => {
        LogDev("Help/About button clicked", "interaction");
        showHelpAboutModal();
    });

    // Render additional UI elements
    renderChangelogBtn();
    renderThemeSettingsBtn();
}

// --- Changelog Button ---
function renderChangelogBtn() {
    const btn = document.getElementById("changelog");
    getBtnSetting("PodAwful::ShowChangelogBtn", (show) => {
        if (btn) btn.style.display = show ? '' : 'none';
    }, false);
}

// --- Theme Settings Button ---
function renderThemeSettingsBtn() {
    const btn = document.getElementById("themeSettings");
    getBtnSetting("PodAwful::ShowThemeSettingsBtn", (show) => {
        if (btn) btn.style.display = show ? '' : 'none';
    }, false);
}

// --- Storage Helpers ---
function getBtnSetting(key, cb, defaultVal = false) {
    LogDev(`getBtnSetting called for key: ${key}`, "data");
    if (browser && browser.storage && browser.storage.local) {
        browser.storage.local.get([key], (result) => {
            if (browser.runtime.lastError) {
                LogDev(`Error getting setting ${key}: ${browser.runtime.lastError}`, "error");
                cb(defaultVal);
            } else {
                const value = result[key] !== undefined ? result[key] : defaultVal;
                LogDev(`Setting ${key}: ${value}`, "data");
                cb(value);
            }
        });
    } else {
        LogDev(`Browser storage not available, using default for ${key}`, "warning");
        cb(defaultVal);
    }
}
