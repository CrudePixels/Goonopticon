import { LogDev } from '../../log.js';
import { renderMainMenu } from './popup-main-menu.js';
import browser from 'webextension-polyfill';

/**
 * Renders the settings panel
 */
export function renderSettings() {
    LogDev("Navigated to Settings panel", "interaction");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Settings";
    MenuContent.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="showDevLogBtn" style="margin: 0;">
                <span>Show Dev Log Button</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="showChangelogBtn" style="margin: 0;">
                <span>Show Changelog Button</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="showHotkeysBtn" style="margin: 0;">
                <span>Show Hotkeys Button</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="enableBulkActions" style="margin: 0;">
                <span>Enable Bulk Actions</span>
            </label>
        </div>
        <button class="podawful-btn" id="backBtn" style="margin-top: 20px;">Back</button>
    `;

    // Load current settings
    loadSettings();

    // Event listeners
    document.getElementById("backBtn")?.addEventListener("click", () => {
        LogDev("Back to Main Menu from Settings panel", "interaction");
        renderMainMenu();
    });

    // Settings change listeners
    document.getElementById("showDevLogBtn")?.addEventListener("change", (e) => {
        saveSetting("PodAwful::ShowDevLogBtn", e.target.checked);
    });

    document.getElementById("showChangelogBtn")?.addEventListener("change", (e) => {
        saveSetting("PodAwful::ShowChangelogBtn", e.target.checked);
    });

    document.getElementById("showHotkeysBtn")?.addEventListener("change", (e) => {
        saveSetting("PodAwful::ShowHotkeysBtn", e.target.checked);
    });

    document.getElementById("enableBulkActions")?.addEventListener("change", (e) => {
        saveSetting("PodAwful::EnableBulkActions", e.target.checked);
    });
}

// Load settings
function loadSettings() {
    const settings = [
        { key: "PodAwful::ShowDevLogBtn", elementId: "showDevLogBtn", defaultValue: false },
        { key: "PodAwful::ShowChangelogBtn", elementId: "showChangelogBtn", defaultValue: false },
        { key: "PodAwful::ShowHotkeysBtn", elementId: "showHotkeysBtn", defaultValue: false },
        { key: "PodAwful::EnableBulkActions", elementId: "enableBulkActions", defaultValue: false }
    ];

    settings.forEach(setting => {
        getSetting(setting.key, (value) => {
            const element = document.getElementById(setting.elementId);
            if (element) {
                element.checked = value;
            }
        }, setting.defaultValue);
    });
}

// Get setting
function getSetting(key, callback, defaultValue = false) {
    browser.storage.local.get([key], (result) => {
        if (browser.runtime.lastError) {
            LogDev(`Error getting setting ${key}: ${browser.runtime.lastError}`, "error");
            callback(defaultValue);
        } else {
            const value = result[key] !== undefined ? result[key] : defaultValue;
            callback(value);
        }
    });
}

// Save setting
function saveSetting(key, value) {
    browser.storage.local.set({ [key]: value }, () => {
        if (browser.runtime.lastError) {
            LogDev(`Error saving setting ${key}: ${browser.runtime.lastError}`, "error");
        } else {
            LogDev(`Setting ${key} saved: ${value}`, "data");
        }
    });
}
