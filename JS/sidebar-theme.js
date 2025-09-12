import { LogDev } from '../log.js';
import { applyCustomTheme } from '../theme/modules/theme-application.js';
import * as browser from 'webextension-polyfill';

/**
 * Sidebar Theme Handler
 * Only handles applying themes, not loading theme files
 * Theme files should be loaded in popup/background context
 */

/**
 * Applies a theme to the sidebar
 * @param {string} themeName - Theme name (default, light, dark, custom)
 * @param {Object} customTheme - Custom theme object (if themeName is 'custom')
 */
export async function applyThemeToSidebar(themeName, customTheme = null) {
    LogDev(`Applying theme to sidebar: ${themeName}`, 'system');
    
    try {
        if (themeName === 'custom' && customTheme) {
            // Apply custom theme directly
            LogDev('Applying custom theme to sidebar', 'system');
            applyCustomTheme(customTheme);
        } else {
            // For preset themes, we need to load them from storage
            // The popup should have already loaded and saved them
            const result = await browser.storage.local.get(`PodAwful::PresetTheme::${themeName}`);
            const presetTheme = result[`PodAwful::PresetTheme::${themeName}`];
            
            if (presetTheme) {
                LogDev(`Applying preset theme to sidebar: ${presetTheme.name}`, 'system');
                applyCustomTheme(presetTheme);
            } else {
                LogDev(`Preset theme ${themeName} not found in storage, using default styling`, 'warning');
                // Apply basic default styling
                applyDefaultSidebarTheme();
            }
        }
    } catch (err) {
        LogDev(`Error applying theme to sidebar: ${err.message}`, 'error');
        // Fallback to default styling
        applyDefaultSidebarTheme();
    }
}

/**
 * Applies default sidebar theme
 */
function applyDefaultSidebarTheme() {
    LogDev('Applying default sidebar theme', 'system');
    
    // Apply basic default theme variables
    const root = document.documentElement;
    root.style.setProperty('--sidebar-bg', '#1a1a1a');
    root.style.setProperty('--sidebar-text', '#ffffff');
    root.style.setProperty('--sidebar-accent', '#FFD600');
    root.style.setProperty('--sidebar-button-bg', '#FFD600');
    root.style.setProperty('--sidebar-button-text', '#000000');
    
    // Add theme class
    document.body.classList.add('default-theme');
}

/**
 * Loads and applies the current theme from storage
 */
export async function loadCurrentTheme() {
    try {
        const [themeResult, customThemeResult] = await Promise.all([
            browser.storage.local.get('PodAwful::Theme'),
            browser.storage.local.get('PodAwful::CustomTheme')
        ]);
        
        const theme = themeResult['PodAwful::Theme'] || 'default';
        const customTheme = customThemeResult['PodAwful::CustomTheme'];
        
        LogDev(`Loading current theme: ${theme}`, 'system');
        
        if (customTheme) {
            // Custom theme takes precedence
            await applyThemeToSidebar('custom', customTheme);
        } else {
            // Apply preset theme
            await applyThemeToSidebar(theme);
        }
    } catch (err) {
        LogDev(`Error loading current theme: ${err.message}`, 'error');
        applyDefaultSidebarTheme();
    }
}
