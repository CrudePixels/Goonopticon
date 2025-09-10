import { renderSidebar } from './sidebar.js';
import { applyTheme } from '../theme.js';
import { applyCustomTheme } from '../customTheme.js';
import { GetNotes } from './storage.js';
import * as browser from 'webextension-polyfill';
import { LogDev } from '../log.js';
import { normalizeYouTubeUrl } from '../utils.js';
import { showInputModal, showConfirmModal, showChoiceModal, showTwoChoiceModal } from './modal.js';

// Set up global modal functions
window.showInputModal = showInputModal;
window.showConfirmModal = showConfirmModal;
window.showChoiceModal = showChoiceModal;
window.showTwoChoiceModal = showTwoChoiceModal;

// Suppress 'SendMessage failed: Extension context invalidated' errors globally
window.addEventListener('error', function (event) {
  if (event.message && event.message.includes('SendMessage failed: Extension context invalidated')) {
    event.preventDefault();
    return false;
  }
});

export default async function initSidebar()
{
    try {
        // Load both regular theme and custom theme
        const [themeResult, customThemeResult] = await Promise.all([
            browser.storage.local.get('PodAwful::Theme'),
            browser.storage.local.get('PodAwful::CustomTheme')
        ]);
        
        const theme = themeResult['PodAwful::Theme'] || 'default';
        const customTheme = customThemeResult['PodAwful::CustomTheme'];
        
        // Apply the theme (this will handle both preset and custom themes)
        LogDev('Applying theme on sidebar init: ' + theme, 'system');
        await applyTheme(theme);
        
        // If there's a custom theme in storage, apply it (this overrides preset themes)
        if (customTheme) {
            LogDev('Loading custom theme on sidebar init: ' + JSON.stringify(customTheme), 'system');
            applyCustomTheme(customTheme);
        } else {
            LogDev('No custom theme found in storage, using preset theme', 'system');
        }

        // Wait a moment for theme to be applied before creating sidebar
        requestAnimationFrame(() => {
            if (document.getElementById('podawful-sidebar'))
            {
                return;
            }
            const sidebar = document.createElement('div');
            sidebar.id = 'podawful-sidebar';
            sidebar.className = 'podawful-sidebar';
            document.body.appendChild(sidebar);
            sidebar.classList.remove('sidebar-hide');
            sidebar.style.display = '';
            document.body.classList.add('sidebar-visible');
            renderSidebar(sidebar);
        });
    } catch (err) {
        LogDev('Error initializing sidebar theme: ' + err, 'error');
        // Fallback to default theme
        await applyTheme('default');
    }
}

// Listen for theme and sidebar visibility changes
browser.storage.onChanged.addListener((changes, area) =>
{
    if (area === 'local' && changes['PodAwful::Theme'])
    {
        const theme = changes['PodAwful::Theme'].newValue || "default";
        applyTheme(theme);
        const sidebar = document.getElementById('podawful-sidebar');
        if (sidebar) renderSidebar(sidebar);
    }
    if (area === 'local' && changes['PodAwful::CustomTheme'])
    {
        // Apply custom theme changes to the sidebar
        const customTheme = changes['PodAwful::CustomTheme'].newValue;
        if (customTheme) {
            LogDev('Custom theme changed, applying to sidebar', 'system');
            applyCustomTheme(customTheme);
            
            // Re-render the sidebar to apply the new theme
            const sidebar = document.getElementById('podawful-sidebar');
            if (sidebar) {
                LogDev('Re-rendering sidebar with new theme', 'system');
                renderSidebar(sidebar);
            }
        }
    }
    if (area === 'local' && changes['PodAwful::SidebarVisible'])
    {
        const sidebar = document.getElementById('podawful-sidebar');
        if (sidebar) renderSidebar(sidebar);
    }
});

let lastUrl = normalizeYouTubeUrl(location.href);
setInterval(() => {
    const currentUrl = normalizeYouTubeUrl(location.href);
    if (currentUrl !== lastUrl) {
        LogDev(`URL changed from ${lastUrl} to ${currentUrl}`, "event");
        lastUrl = currentUrl;
        
        // Clear any existing highlights when URL changes
        document.querySelectorAll('.note-item.highlight').forEach(el => {
            el.classList.remove('highlight');
        });
        
        const sidebar = document.getElementById('podawful-sidebar');
        if (sidebar && typeof window.renderSidebar === 'function') {
            window.renderSidebar(sidebar);
        } else if (sidebar && typeof renderSidebar === 'function') {
            renderSidebar(sidebar);
        }
    }
}, 1000);

window.renderSidebar = renderSidebar;