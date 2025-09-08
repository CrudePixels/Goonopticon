import { renderSidebar } from './sidebar.js';
import { applyTheme } from '../theme.js';
import { GetNotes } from './storage.js';
import * as browser from 'webextension-polyfill';
import { LogDev } from '../log.js';
import { normalizeYouTubeUrl } from '../utils.js';
import { showInputModal, showConfirmModal } from './modal.js';
console.log('SANITY CHECK - browser:', browser);
console.log('SANITY CHECK - LogDev:', LogDev);

// Set up global modal functions
window.showInputModal = showInputModal;
window.showConfirmModal = showConfirmModal;

// Suppress 'SendMessage failed: Extension context invalidated' errors globally
window.addEventListener('error', function (event) {
  if (event.message && event.message.includes('SendMessage failed: Extension context invalidated')) {
    event.preventDefault();
    return false;
  }
});

export default function initSidebar()
{
    browser.storage.local.get('PodAwful::Theme').then(result => {
        const theme = result['PodAwful::Theme'] || 'default';
        applyTheme(theme);

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