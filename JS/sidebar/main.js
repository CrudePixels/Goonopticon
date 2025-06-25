import { renderSidebar } from './sidebar.js';
import { ApplyTheme } from '../theme.js';
import { GetNotes } from './storage.js';

export default function initSidebar()
{
    chrome.storage.local.get('PodAwful::Theme', (result) =>
    {
        const theme = result['PodAwful::Theme'] || 'default';
        ApplyTheme(theme);

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
chrome.storage.onChanged.addListener((changes, area) =>
{
    if (area === 'local' && changes['PodAwful::Theme'])
    {
        const theme = changes['PodAwful::Theme'].newValue || "default";
        ApplyTheme(theme);
        const sidebar = document.getElementById('podawful-sidebar');
        if (sidebar) renderSidebar(sidebar);
    }
    if (area === 'local' && changes['PodAwful::SidebarVisible'])
    {
        const sidebar = document.getElementById('podawful-sidebar');
        if (sidebar) renderSidebar(sidebar);
    }
});