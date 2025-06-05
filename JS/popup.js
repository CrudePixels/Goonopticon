// Version: 1.0.2 (improved sidebar toggle logic)
import { LogDev } from './log.js';
import { OpenSubMenu } from './popup-shared.js';
import { SetTheme, GetTheme } from './sidebar/storage.js';

document.addEventListener("DOMContentLoaded", () =>
{
    const UpdateSidebarToggleBtn = () =>
    {
        try
        {
            const Btn = document.getElementById("toggleSidebar");
            if (!Btn) return;
            chrome.tabs.query({ active: true, currentWindow: true }, (Tabs) =>
            {
                if (!Tabs[0]) return;
                chrome.scripting.executeScript({
                    target: { tabId: Tabs[0].id },
                    func: () =>
                    {
                        return new Promise(Resolve =>
                        {
                            chrome.storage?.local?.get(["PodAwful::SidebarVisible"], Result =>
                            {
                                Resolve(Result["PodAwful::SidebarVisible"] !== "false");
                            });
                        });
                    }
                }, (Results) =>
                {
                    const Visible = Results?.[0]?.result;
                    Btn.textContent = Visible ? "Hide Sidebar" : "Show Sidebar";
                    Btn.title = Visible ? "Hide the sidebar" : "Show the sidebar";
                });
            });
        }
        catch (Err)
        {
            LogDev("[ERROR] UpdateSidebarToggleBtn: " + (Err.stack || Err));
        }
    };

    // Improved: Use message instead of reload for sidebar toggle
    const Actions = {
        ToggleSidebar: () =>
        {
            LogDev("Clicked Toggle Sidebar (popup)");
            try
            {
                chrome.tabs.query({ active: true, currentWindow: true }, (Tabs) =>
                {
                    if (!Tabs[0]) return;
                    chrome.scripting.executeScript({
                        target: { tabId: Tabs[0].id },
                        func: () =>
                        {
                            chrome.storage.local.get(["PodAwful::SidebarVisible"], Result =>
                            {
                                const Visible = Result["PodAwful::SidebarVisible"] !== "false";
                                chrome.storage.local.set({ "PodAwful::SidebarVisible": (!Visible).toString() }, () =>
                                {
                                    // Send a message to refresh sidebar instead of reloading
                                    chrome.runtime.sendMessage({ Action: "refreshSidebar" });
                                });
                            });
                        }
                    }, () =>
                    {
                        setTimeout(UpdateSidebarToggleBtn, 500);
                    });
                });
            }
            catch (Err)
            {
                LogDev("[ERROR] ToggleSidebar: " + (Err.stack || Err));
            }
        },
        ReportBug: () =>
        {
            LogDev("Clicked Report a Bug (popup)");
            try
            {
                window.open("mailto:podawfulhenchman@gmail.com?subject=PodAwful%20Bug%20Report", "_blank");
            }
            catch (Err)
            {
                LogDev("[ERROR] ReportBug: " + (Err.stack || Err));
            }
        },
        ImportExport: () =>
        {
            try
            {
                LogDev("Viewed submenu: importExport");
                OpenSubMenu("importexport");
            } catch (Err) { LogDev("[ERROR] ImportExport: " + (Err.stack || Err)); }
        },
        Hotkeys: () => { try { OpenSubMenu("hotkeys"); } catch (Err) { LogDev("[ERROR] Hotkeys: " + (Err.stack || Err)); } },
        Settings: () => { try { OpenSubMenu("settings"); } catch (Err) { LogDev("[ERROR] Settings: " + (Err.stack || Err)); } },
        Changelog: () => { try { OpenSubMenu("changelog"); } catch (Err) { LogDev("[ERROR] Changelog: " + (Err.stack || Err)); } },
        Devlog: () => { try { OpenSubMenu("devlog"); } catch (Err) { LogDev("[ERROR] Devlog: " + (Err.stack || Err)); } }
    };

    Object.entries(Actions).forEach(([Id, Handler]) =>
    {
        const Btn = document.getElementById(Id.charAt(0).toLowerCase() + Id.slice(1));
        if (Btn)
        {
            Btn.onclick = function (Event)
            {
                LogDev(`Button clicked: ${Id}`);
                Handler(Event);
            };
            Btn.title = Btn.title || Id.replace(/([A-Z])/g, ' $1').trim();
        }
    });

    UpdateSidebarToggleBtn();

    // Apply theme change
    const SelectedTheme = localStorage.getItem("PodAwful::Theme") || "default";
    const theme = (SelectedTheme || "default") + "-theme";
    document.body.className = `popup ${theme}`;

    // Set the logo based on theme
    const Theme = localStorage.getItem("PodAwful::Theme") || "default";
    let LogoFile = "logo-default.png";
    if (Theme === "light") LogoFile = "logo-light.png";
    else if (Theme === "dark") LogoFile = "logo-dark.png";
    const LogoImg = document.getElementById("popupLogo");
    if (LogoImg)
    {
        LogoImg.src = chrome.runtime.getURL("Resources/" + LogoFile);
    }

    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector)
    {
        themeSelector.addEventListener('change', function ()
        {
            SetTheme(this.value, () =>
            {
                document.body.className = `popup ${this.value}-theme`;
            });
        });
    }

    GetTheme(theme =>
    {
        document.body.classList.remove("default-theme", "dark-theme", "light-theme");
        document.body.classList.add(`${Theme}-theme`);
    });
});

// When user changes theme:
function onThemeChange(newTheme)
{
    SetTheme(newTheme, () =>
    {
        document.body.className = `popup ${newTheme}-theme`;
    });
}

document.addEventListener("DOMContentLoaded", () =>
{
    const ytBtn = document.getElementById("toggleYTKeys");
    if (ytBtn)
    {
        function updateBtn()
        {
            const blocked = localStorage.getItem("PodAwful::BlockYouTubeHotkeys") === "true";
            ytBtn.textContent = "YouTube Hotkeys: " + (blocked ? "Off" : "On");
        }
        ytBtn.onclick = function ()
        {
            const blocked = localStorage.getItem("PodAwful::BlockYouTubeHotkeys") === "true";
            localStorage.setItem("PodAwful::BlockYouTubeHotkeys", blocked ? "false" : "true");
            updateBtn();
        };
        updateBtn();
    }
});