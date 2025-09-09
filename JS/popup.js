import { applyTheme } from './theme.js';
import { renderMainMenu } from './popup-menus.js';
import * as browser from 'webextension-polyfill';

// Apply the theme and render the menu after DOM is ready
document.addEventListener("DOMContentLoaded", () =>
{
    // Always apply custom theme
    applyTheme("custom");

    // Only render the menu after the theme is applied
    renderMainMenu();
    
    // Load version and check for updates
    loadVersion();
    checkForUpdates();
});

// Listen for theme changes in real-time (if changed elsewhere)
browser.storage.onChanged.addListener((changes, area) =>
{
    if (area === "local" && (changes["PodAwful::CustomTheme"] || changes["PodAwful::Theme"]))
    {
        // Always apply custom theme
        applyTheme("custom");
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
        console.error('Error checking for updates:', error);
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
        console.error('Error loading version:', error);
    }
}