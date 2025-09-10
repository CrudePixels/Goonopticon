import { applyTheme } from './theme.js';
import { applyCustomTheme, getCustomTheme } from './customTheme.js';
import { renderMainMenu } from './popup-menus.js';
import { LogDev } from './log.js';
import * as browser from 'webextension-polyfill';

// Apply the theme and render the menu after DOM is ready
document.addEventListener("DOMContentLoaded", async () =>
{
    try {
        // Load the current theme from storage
        const [themeResult, customThemeResult] = await Promise.all([
            browser.storage.local.get('PodAwful::Theme'),
            browser.storage.local.get('PodAwful::CustomTheme')
        ]);
        
        const theme = themeResult['PodAwful::Theme'] || 'default';
        const customTheme = customThemeResult['PodAwful::CustomTheme'];
        
        // Apply the theme (this will handle both preset and custom themes)
        LogDev('Applying theme on popup init: ' + theme, 'system');
        await applyTheme(theme);
        
        // If there's a custom theme in storage, apply it (this overrides preset themes)
        if (customTheme) {
            LogDev('Loading custom theme on popup init', 'system');
            applyCustomTheme(customTheme);
        } else {
            LogDev('No custom theme found in storage, using preset theme', 'system');
        }
        
        // Only render the menu after the theme is applied
        renderMainMenu();
        
        // Load version and check for updates
        loadVersion();
        checkForUpdates();
    } catch (err) {
        LogDev('Error loading theme on popup init: ' + err, 'error');
        // Fallback to default theme
        await applyTheme("default");
        renderMainMenu();
        loadVersion();
        checkForUpdates();
    }
});

// Listen for theme changes in real-time (if changed elsewhere)
browser.storage.onChanged.addListener((changes, area) =>
{
    if (area === "local" && changes["PodAwful::CustomTheme"])
    {
        // Apply custom theme changes
        const customTheme = changes["PodAwful::CustomTheme"].newValue;
        if (customTheme) {
            LogDev('Custom theme changed, applying to popup', 'system');
            applyCustomTheme(customTheme);
        }
    } else if (area === "local" && changes["PodAwful::Theme"])
    {
        // Apply regular theme changes
        const theme = changes["PodAwful::Theme"].newValue || "default";
        applyTheme(theme);
    }
});

// Check for updates and show indicator
async function checkForUpdates() {
    try {
        const result = await browser.storage.local.get(['updateAvailable', 'latestVersion', 'currentVersion', 'releaseUrl']);
        
        if (result.updateAvailable) {
            showUpdateIndicator(result.latestVersion, result.currentVersion, result.releaseUrl);
        } else {
            hideUpdateIndicator();
        }
    } catch (error) {
        LogDev('Error checking for updates: ' + error, 'error');
    }
}

// Show update indicator
function showUpdateIndicator(latestVersion, currentVersion, releaseUrl) {
    const indicator = document.getElementById('updateIndicator');
    const badge = indicator.querySelector('.update-badge');
    
    if (indicator && badge) {
        badge.textContent = `v${latestVersion} Available`;
        indicator.style.display = 'block';
        
        // Add click handler to open release page
        badge.addEventListener('click', () => {
            browser.tabs.create({ url: releaseUrl });
        });
    }
}

// Hide update indicator
function hideUpdateIndicator() {
    const indicator = document.getElementById('updateIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Load version from manifest
async function loadVersion() {
    try {
        const manifest = browser.runtime.getManifest();
        const versionDisplay = document.getElementById('versionDisplay');
        if (versionDisplay && manifest.version) {
            versionDisplay.textContent = `v${manifest.version}`;
        }
    } catch (error) {
        LogDev('Error loading version: ' + error, 'error');
    }
}