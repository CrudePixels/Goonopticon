// Version: 1.3.3

import { RenderSidebar } from './render.js';
import { LogDev } from '../log.js';
import { GetSidebarVisible } from './storage.js';
import { ApplyTheme } from '../theme.js';
import { STORAGE_KEYS } from '../utils.js';

// Helper to inject sidebar if visible
function EnsureSidebarInjected()
{
    GetSidebarVisible((Visible) =>
    {
        let Container = document.getElementById('podawful-sidebar');
        if (Container)
        {
            Container.remove(); // Remove the old sidebar and all its event listeners
        }
        if (Visible)
        {
            Container = document.createElement('div');
            Container.id = 'podawful-sidebar';
            document.body.appendChild(Container);
            RenderSidebar(Container);
        }
    });
}

// 1. Inject sidebar on load if visible
document.addEventListener("DOMContentLoaded", () =>
{
    GetSidebarVisible((Visible) =>
    {
        if (Visible) EnsureSidebarInjected();
    });
});

// 2. Listen for storage changes and update sidebar
chrome.storage.onChanged.addListener((changes, area) =>
{
    if (area !== "local") return;
    const relevantKeys = [
        STORAGE_KEYS.NOTES(location.href),
        STORAGE_KEYS.GROUPS(location.href),
        STORAGE_KEYS.SIDEBAR_VISIBLE,
        STORAGE_KEYS.THEME,
        STORAGE_KEYS.COMPACT,
        STORAGE_KEYS.TAG_FILTER,
        STORAGE_KEYS.NOTE_SEARCH
    ];
    if (relevantKeys.some(key => key in changes))
    {
        EnsureSidebarInjected();
        if (STORAGE_KEYS.THEME in changes)
        {
            ApplyTheme(changes[STORAGE_KEYS.THEME].newValue || "default");
        }
    }
});

// Listen for theme changes and apply them to the sidebar
window.addEventListener("storage", function (e)
{
    if (e.key === STORAGE_KEYS.THEME)
    {
        ApplyTheme(e.newValue || "default");
    }
});

// 3. Global error handler for dev log
window.addEventListener("error", (E) =>
{
    LogDev("[ERROR] " + (E.error?.stack || E.message || E));
});

// 4. (Optional) Listen for messages for future features
chrome.runtime.onMessage.addListener((Msg, Sender, SendResponse) =>
{
    if (Msg.Action === "refreshSidebar")
    {
        EnsureSidebarInjected();
        SendResponse({ Status: "refreshed" });
    }
    else if (Msg.Action === "toggleSidebar")
    {
        // Immediately toggle sidebar visibility
        const container = document.getElementById('podawful-sidebar');
        const visible = !!container && !container.classList.contains('sidebar-hide');
        if (visible)
        {
            if (container)
            {
                container.classList.add('sidebar-hide');
                container.addEventListener('transitionend', function handler(ev)
                {
                    container.style.display = 'none';
                    container.removeEventListener('transitionend', handler);
                });
            }
            document.body.classList.remove('sidebar-visible');
        }
        else
        {
            EnsureSidebarInjected();
        }
        SendResponse({ Status: "toggled" });
    }
});