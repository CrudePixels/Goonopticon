// Version: 1.3.3

import { RenderSidebar } from './render.js';
import { LogDev } from '../log.js';
import { GetSidebarVisible } from './storage.js';

// Helper to inject sidebar if visible
function EnsureSidebarInjected()
{
    GetSidebarVisible((Visible) =>
    {
        let Container = document.getElementById('podawful-sidebar');
        if (!Container)
        {
            Container = document.createElement('div');
            Container.id = 'podawful-sidebar';
            document.body.appendChild(Container);
        }
        if (Visible)
        {
            Container.classList.remove('sidebar-hide');
            RenderSidebar(Container);
        } else
        {
            Container.classList.add('sidebar-hide');
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
chrome.storage.onChanged.addListener((Changes, Area) =>
{
    if (Area === "local" && (
        Changes["PodAwful::Notes::" + location.href] ||
        Changes["PodAwful::SidebarVisible"] ||
        Changes["PodAwful::Theme"] ||
        Changes["PodAwful::Compact"] ||
        Changes["PodAwful::TagFilterMulti"] ||
        Changes["PodAwful::NoteSearch"]
    ))
    {
        EnsureSidebarInjected();
    }
});

// Listen for theme changes and apply them to the sidebar
chrome.storage.onChanged.addListener((changes, area) =>
{
    if (area === 'local' && changes['PodAwful::Theme'])
    {
        // Re-render the sidebar to apply the new theme
        const container = document.getElementById('podawful-sidebar');
        if (container)
        {
            RenderSidebar(container);
        }
        // Apply the new theme class
        const theme = changes['PodAwful::Theme'].newValue || "default";
        ApplyTheme(theme);
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
                    if (ev.propertyName === 'opacity')
                    {
                        container.removeEventListener('transitionend', handler);
                        container.remove();
                    }
                });
            }
            localStorage.setItem("PodAwful::SidebarVisible", "false");
            chrome.storage.local.set({ "PodAwful::SidebarVisible": "false" });
        } else
        {
            localStorage.setItem("PodAwful::SidebarVisible", "true");
            chrome.storage.local.set({ "PodAwful::SidebarVisible": "true" }, () =>
            {
                EnsureSidebarInjected();
            });
        }
        SendResponse({ Status: "toggled" });
    }
});

// Apply selected theme to the sidebar
function ApplyTheme(SelectedTheme)
{
    const Element = document.getElementById('podawful-sidebar');
    if (Element)
    {
        Element.classList.remove('default-theme', 'dark-theme', 'light-theme');
        Element.classList.add(SelectedTheme + '-theme');
    }
}

// On load, apply the current theme
const SelectedTheme = localStorage.getItem("PodAwful::Theme") || "default";
ApplyTheme(SelectedTheme);

// --- Hotkey and YouTube hotkey blocking support ---
function getHotkeySettings()
{
    try
    {
        return JSON.parse(localStorage.getItem("PodAwful::Hotkeys") || "{}");
    } catch {
        return {};
    }
}
function areHotkeysEnabled()
{
    return localStorage.getItem("PodAwful::HotkeysEnabled") !== "false";
}
function isYouTubeHotkeysBlocked()
{
    return localStorage.getItem("PodAwful::BlockYouTubeHotkeys") === "true";
}
function matchHotkey(hk, e)
{
    if (!hk || !hk.key) return false;
    return (
        e.key.toLowerCase() === hk.key.toLowerCase() &&
        !!e.ctrlKey === !!hk.ctrl &&
        !!e.altKey === !!hk.alt &&
        !!e.shiftKey === !!hk.shift
    );
}

document.addEventListener("keydown", function (e)
{
    if (
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) ||
        document.activeElement.isContentEditable
    ) return;

    const hotkeys = getHotkeySettings();
    // Block YouTube hotkeys if enabled and a defined hotkey is pressed
    if (isYouTubeHotkeysBlocked())
    {
        for (const hk of Object.values(hotkeys))
        {
            if (matchHotkey(hk, e))
            {
                e.preventDefault();
                e.stopImmediatePropagation();
                break;
            }
        }
    }

    if (!areHotkeysEnabled()) return;

    if (matchHotkey(hotkeys.toggleSidebar, e))
    {
        e.preventDefault();
        e.stopImmediatePropagation();
        const container = document.getElementById('podawful-sidebar');
        const visible = container && !container.classList.contains('sidebar-hide');
        // Instantly hide or show
        if (visible)
        {
            if (container)
            {
                container.classList.add('sidebar-hide');
                container.addEventListener('transitionend', function handler(ev)
                {
                    if (ev.propertyName === 'opacity')
                    {
                        container.removeEventListener('transitionend', handler);
                        container.remove();
                    }
                });
            }
        } else
        {
            EnsureSidebarInjected();
        }
        // Update storage and notify
        chrome.storage.local.set({ "PodAwful::SidebarVisible": (!visible).toString() }, () =>
        {
            chrome.runtime.sendMessage({ Action: "refreshSidebar" });
        });
    } else if (matchHotkey(hotkeys.addTimestamp, e))
    {
        e.preventDefault();
        e.stopImmediatePropagation();
        const btn = document.getElementById("sidebarAddTimestamp");
        if (btn && !btn.disabled) btn.click();
    } else if (matchHotkey(hotkeys.lockNotes, e))
    {
        e.preventDefault();
        e.stopImmediatePropagation();
        const btn = document.getElementById("sidebarLock");
        if (btn && !btn.disabled) btn.click();
    } else if (matchHotkey(hotkeys.devLog, e))
    {
        e.preventDefault();
        e.stopImmediatePropagation();
        LogDev("Hotkey: Dev Log triggered");
    }
}, true); // Use capture phase