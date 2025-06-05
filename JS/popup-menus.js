// Version: 1.0.3
import { LogDev } from './log.js';
import { OpenSubMenu } from './popup-shared.js';

document.addEventListener("DOMContentLoaded", function ()
{
    const Theme = localStorage.getItem("PodAwful::Theme") || "default";
    // Ensure both .popup and theme class are present
    document.body.classList.remove("default-theme", "dark-theme", "light-theme");
    document.body.classList.add(`${Theme}-theme`);

    const Params = new URLSearchParams(window.location.search);
    const Panel = (Params.get("panel") || "menu").toLowerCase();

    const MenuTitle = document.getElementById("menuTitle");
    const MenuContent = document.getElementById("menuContent");
    const BackBtn = document.getElementById("menuBack");

    if (!MenuTitle || !MenuContent || !BackBtn)
        return;

    const SetContent = Html => { MenuContent.innerHTML = Html; };

    function IsHotkeysEnabled()
    {
        return localStorage.getItem("PodAwful::HotkeysEnabled") !== "false";
    }
    function SetHotkeysEnabled(Val)
    {
        localStorage.setItem("PodAwful::HotkeysEnabled", Val ? "true" : "false");
    }

    const Panels = {
        importexport: function ()
        {
            MenuTitle.textContent = "Import/Export";
            SetContent(`
                <button class="podawful-btn" id="importBtn" title="Import notes from a file">Import Notes</button>
                <button class="podawful-btn" id="exportBtn" title="Export your notes to a file">Export Notes</button>
                <input type="file" id="importFile" style="display:none" accept=".json"/>
                <div id="importExportStatus" style="margin-top:10px;"></div>
            `);

            const ImportBtn = document.getElementById("importBtn");
            const ImportFile = document.getElementById("importFile");
            const ExportBtn = document.getElementById("exportBtn");
            const StatusDiv = document.getElementById("importExportStatus");

            if (ImportBtn && ImportFile)
            {
                ImportBtn.onclick = function ()
                {
                    ImportFile.click();
                };

                ImportFile.onchange = function (E)
                {
                    try
                    {
                        const File = E.target.files[0];
                        if (!File) return;
                        const Reader = new FileReader();
                        Reader.onload = function (Evt)
                        {
                            try
                            {
                                const Data = JSON.parse(Evt.target.result);
                                localStorage.setItem("PodAwful::Notes::imported", JSON.stringify(Data));
                                if (StatusDiv) StatusDiv.textContent = "Import successful!";
                            } catch {
                                if (StatusDiv) StatusDiv.textContent = "Invalid file format.";
                            }
                        };
                        Reader.readAsText(File);
                    } catch (Err)
                    {
                        if (StatusDiv) StatusDiv.textContent = "Import failed.";
                    }
                };
            }

            if (ExportBtn)
            {
                ExportBtn.onclick = function ()
                {
                    try
                    {
                        const Notes = localStorage.getItem("PodAwful::Notes::" + location.href) || "[]";
                        const BlobObj = new Blob([Notes], { type: "application/json" });
                        const Url = URL.createObjectURL(BlobObj);
                        const A = document.createElement("a");
                        A.href = Url;
                        A.download = "podawful-notes.json";
                        A.click();
                        URL.revokeObjectURL(Url);
                        if (StatusDiv) StatusDiv.textContent = "Exported!";
                    } catch (Err)
                    {
                        if (StatusDiv) StatusDiv.textContent = "Export failed.";
                    }
                };
            }
        },

        hotkeys: function ()
        {
            MenuTitle.textContent = "Hotkeys";
            SetContent(`
                <div>
                    <label>
                        Add Timestamp:
                        <input id="hotkeyAdd" maxlength="1" style="width:2em" title="Set hotkey for Add Timestamp">
                        <label><input type="checkbox" id="hotkeyAddCtrl">Ctrl</label>
                        <label><input type="checkbox" id="hotkeyAddAlt">Alt</label>
                        <label><input type="checkbox" id="hotkeyAddShift">Shift</label>
                    </label>
                </div>
                <div>
                    <label>
                        Toggle Sidebar:
                        <input id="hotkeySidebar" maxlength="1" style="width:2em" title="Set hotkey for Toggle Sidebar">
                        <label><input type="checkbox" id="hotkeySidebarCtrl">Ctrl</label>
                        <label><input type="checkbox" id="hotkeySidebarAlt">Alt</label>
                        <label><input type="checkbox" id="hotkeySidebarShift">Shift</label>
                    </label>
                </div>
                <div>
                    <label>
                        Lock Notes:
                        <input id="hotkeyLock" maxlength="1" style="width:2em" title="Set hotkey for Lock Notes">
                        <label><input type="checkbox" id="hotkeyLockCtrl">Ctrl</label>
                        <label><input type="checkbox" id="hotkeyLockAlt">Alt</label>
                        <label><input type="checkbox" id="hotkeyLockShift">Shift</label>
                    </label>
                </div>
                <div>
                    <label>
                        Dev Log:
                        <input id="hotkeyDev" maxlength="1" style="width:2em" title="Set hotkey for Dev Log">
                        <label><input type="checkbox" id="hotkeyDevCtrl">Ctrl</label>
                        <label><input type="checkbox" id="hotkeyDevAlt">Alt</label>
                        <label><input type="checkbox" id="hotkeyDevShift">Shift</label>
                    </label>
                </div>
                <button class="podawful-btn" id="saveHotkeys" title="Save your hotkey settings">Save Hotkeys</button>
                <button class="podawful-btn" id="resetHotkeys" title="Reset hotkeys to default">Reset Hotkeys</button>
                <button class="podawful-btn" id="toggleHotkeysBtn" title="Enable or disable hotkeys"></button>
                <button class="podawful-btn" id="toggleYTKeys" title="Enable or disable YouTube's own hotkeys"></button>
                <div id="hotkeyStatus" style="margin-top:10px;"></div>
            `);

            // Get elements
            const HotkeyAdd = document.getElementById("hotkeyAdd");
            const HotkeyAddCtrl = document.getElementById("hotkeyAddCtrl");
            const HotkeyAddAlt = document.getElementById("hotkeyAddAlt");
            const HotkeyAddShift = document.getElementById("hotkeyAddShift");

            const HotkeySidebar = document.getElementById("hotkeySidebar");
            const HotkeySidebarCtrl = document.getElementById("hotkeySidebarCtrl");
            const HotkeySidebarAlt = document.getElementById("hotkeySidebarAlt");
            const HotkeySidebarShift = document.getElementById("hotkeySidebarShift");

            const HotkeyLock = document.getElementById("hotkeyLock");
            const HotkeyLockCtrl = document.getElementById("hotkeyLockCtrl");
            const HotkeyLockAlt = document.getElementById("hotkeyLockAlt");
            const HotkeyLockShift = document.getElementById("hotkeyLockShift");

            const HotkeyDev = document.getElementById("hotkeyDev");
            const HotkeyDevCtrl = document.getElementById("hotkeyDevCtrl");
            const HotkeyDevAlt = document.getElementById("hotkeyDevAlt");
            const HotkeyDevShift = document.getElementById("hotkeyDevShift");

            const SaveHotkeys = document.getElementById("saveHotkeys");
            const ResetHotkeys = document.getElementById("resetHotkeys");
            const ToggleBtn = document.getElementById("toggleHotkeysBtn");
            const StatusDiv = document.getElementById("hotkeyStatus");
            const ToggleYTKeysBtn = document.getElementById("toggleYTKeys");

            // Load hotkeys
            const Hotkeys = JSON.parse(localStorage.getItem("PodAwful::Hotkeys") || "{}");

            if (HotkeyAdd) HotkeyAdd.value = Hotkeys.addTimestamp?.key || "t";
            if (HotkeyAddCtrl) HotkeyAddCtrl.checked = Hotkeys.addTimestamp?.ctrl || false;
            if (HotkeyAddAlt) HotkeyAddAlt.checked = Hotkeys.addTimestamp?.alt || false;
            if (HotkeyAddShift) HotkeyAddShift.checked = Hotkeys.addTimestamp?.shift || false;

            if (HotkeySidebar) HotkeySidebar.value = Hotkeys.toggleSidebar?.key || "s";
            if (HotkeySidebarCtrl) HotkeySidebarCtrl.checked = Hotkeys.toggleSidebar?.ctrl || false;
            if (HotkeySidebarAlt) HotkeySidebarAlt.checked = Hotkeys.toggleSidebar?.alt || false;
            if (HotkeySidebarShift) HotkeySidebarShift.checked = Hotkeys.toggleSidebar?.shift || false;

            if (HotkeyLock) HotkeyLock.value = Hotkeys.lockNotes?.key || "l";
            if (HotkeyLockCtrl) HotkeyLockCtrl.checked = Hotkeys.lockNotes?.ctrl || false;
            if (HotkeyLockAlt) HotkeyLockAlt.checked = Hotkeys.lockNotes?.alt || false;
            if (HotkeyLockShift) HotkeyLockShift.checked = Hotkeys.lockNotes?.shift || false;

            if (HotkeyDev) HotkeyDev.value = Hotkeys.devLog?.key || "d";
            if (HotkeyDevCtrl) HotkeyDevCtrl.checked = Hotkeys.devLog?.ctrl || false;
            if (HotkeyDevAlt) HotkeyDevAlt.checked = Hotkeys.devLog?.alt || false;
            if (HotkeyDevShift) HotkeyDevShift.checked = Hotkeys.devLog?.shift || false;

            if (SaveHotkeys)
            {
                SaveHotkeys.onclick = function ()
                {
                    try
                    {
                        const NewHotkeys = {
                            addTimestamp: {
                                key: HotkeyAdd?.value || "t",
                                ctrl: HotkeyAddCtrl?.checked || false,
                                alt: HotkeyAddAlt?.checked || false,
                                shift: HotkeyAddShift?.checked || false
                            },
                            toggleSidebar: {
                                key: HotkeySidebar?.value || "s",
                                ctrl: HotkeySidebarCtrl?.checked || false,
                                alt: HotkeySidebarAlt?.checked || false,
                                shift: HotkeySidebarShift?.checked || false
                            },
                            lockNotes: {
                                key: HotkeyLock?.value || "l",
                                ctrl: HotkeyLockCtrl?.checked || false,
                                alt: HotkeyLockAlt?.checked || false,
                                shift: HotkeyLockShift?.checked || false
                            },
                            devLog: {
                                key: HotkeyDev?.value || "d",
                                ctrl: HotkeyDevCtrl?.checked || false,
                                alt: HotkeyDevAlt?.checked || false,
                                shift: HotkeyDevShift?.checked || false
                            }
                        };
                        localStorage.setItem("PodAwful::Hotkeys", JSON.stringify(NewHotkeys));
                        if (StatusDiv) StatusDiv.textContent = "Hotkeys saved!";
                    } catch (Err)
                    {
                        if (StatusDiv) StatusDiv.textContent = "Failed to save hotkeys.";
                    }
                };
            }

            if (ResetHotkeys)
            {
                ResetHotkeys.onclick = function ()
                {
                    try
                    {
                        const DefaultHotkeys = {
                            addTimestamp: { key: "t", ctrl: false, alt: false, shift: false },
                            toggleSidebar: { key: "s", ctrl: false, alt: false, shift: false },
                            lockNotes: { key: "l", ctrl: false, alt: false, shift: false },
                            devLog: { key: "d", ctrl: false, alt: false, shift: false }
                        };
                        if (HotkeyAdd) HotkeyAdd.value = DefaultHotkeys.addTimestamp.key;
                        if (HotkeyAddCtrl) HotkeyAddCtrl.checked = false;
                        if (HotkeyAddAlt) HotkeyAddAlt.checked = false;
                        if (HotkeyAddShift) HotkeyAddShift.checked = false;

                        if (HotkeySidebar) HotkeySidebar.value = DefaultHotkeys.toggleSidebar.key;
                        if (HotkeySidebarCtrl) HotkeySidebarCtrl.checked = false;
                        if (HotkeySidebarAlt) HotkeySidebarAlt.checked = false;
                        if (HotkeySidebarShift) HotkeySidebarShift.checked = false;

                        if (HotkeyLock) HotkeyLock.value = DefaultHotkeys.lockNotes.key;
                        if (HotkeyLockCtrl) HotkeyLockCtrl.checked = false;
                        if (HotkeyLockAlt) HotkeyLockAlt.checked = false;
                        if (HotkeyLockShift) HotkeyLockShift.checked = false;

                        if (HotkeyDev) HotkeyDev.value = DefaultHotkeys.devLog.key;
                        if (HotkeyDevCtrl) HotkeyDevCtrl.checked = false;
                        if (HotkeyDevAlt) HotkeyDevAlt.checked = false;
                        if (HotkeyDevShift) HotkeyDevShift.checked = false;

                        localStorage.setItem("PodAwful::Hotkeys", JSON.stringify(DefaultHotkeys));
                        if (StatusDiv) StatusDiv.textContent = "Hotkeys reset to default!";
                    } catch (Err)
                    {
                        if (StatusDiv) StatusDiv.textContent = "Failed to reset hotkeys.";
                    }
                };
            }

            function UpdateToggleText()
            {
                if (ToggleBtn)
                {
                    ToggleBtn.textContent = IsHotkeysEnabled() ? "Hotkeys: On" : "Hotkeys: Off";
                    ToggleBtn.title = IsHotkeysEnabled() ? "Turn hotkeys off" : "Turn hotkeys on";
                }
            }
            UpdateToggleText();

            if (ToggleBtn)
            {
                ToggleBtn.onclick = function ()
                {
                    SetHotkeysEnabled(!IsHotkeysEnabled());
                    UpdateToggleText();
                    if (StatusDiv) StatusDiv.textContent = `Hotkeys ${IsHotkeysEnabled() ? "enabled" : "disabled"}!`;
                };
            }

            // YouTube hotkeys toggle button logic
            function updateYTBtn()
            {
                const blocked = localStorage.getItem("PodAwful::BlockYouTubeHotkeys") === "true";
                if (ToggleYTKeysBtn)
                {
                    ToggleYTKeysBtn.textContent = "YouTube Hotkeys: " + (blocked ? "Off" : "On");
                    ToggleYTKeysBtn.title = blocked
                        ? "YouTube hotkeys are disabled (extension will block them)"
                        : "YouTube hotkeys are enabled (extension will not block them)";
                }
            }
            if (ToggleYTKeysBtn)
            {
                ToggleYTKeysBtn.onclick = function ()
                {
                    const blocked = localStorage.getItem("PodAwful::BlockYouTubeHotkeys") === "true";
                    localStorage.setItem("PodAwful::BlockYouTubeHotkeys", blocked ? "false" : "true");
                    updateYTBtn();
                    if (StatusDiv) StatusDiv.textContent = "YouTube hotkeys " + (blocked ? "enabled" : "disabled") + "!";
                };
                updateYTBtn();
            }
        },

        settings: function ()
        {
            MenuTitle.textContent = "Settings";
            SetContent(`
                <label><input type="checkbox" id="compactMode" title="Enable compact sidebar mode"> Compact Mode</label><br>
                <label>Theme:
                    <select id="themeSelect">
                        <option value="default">Default</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </label><br>
                <button class="podawful-btn" id="saveSettings" title="Save your settings">Save Settings</button>
                <div id="settingsStatus" style="margin-top:10px;"></div>
            `);

            const CompactMode = document.getElementById("compactMode");
            const ThemeSelect = document.getElementById("themeSelect");
            const SaveSettings = document.getElementById("saveSettings");
            const StatusDiv = document.getElementById("settingsStatus");

            if (CompactMode) CompactMode.checked = localStorage.getItem("PodAwful::Compact") === "true";
            if (ThemeSelect) ThemeSelect.value = localStorage.getItem("PodAwful::Theme") || "default";

            if (SaveSettings)
            {
                SaveSettings.onclick = function ()
                {
                    const Compact = CompactMode?.checked;
                    const Theme = ThemeSelect?.value || "default";
                    localStorage.setItem("PodAwful::Compact", Compact);
                    localStorage.setItem("PodAwful::Theme", Theme);
                    if (StatusDiv) StatusDiv.textContent = "Settings saved!";
                    document.body.classList.remove("default-theme", "dark-theme", "light-theme");
                    document.body.classList.add(Theme + "-theme");
                    if (Compact)
                        document.body.classList.add("compact");
                    else
                        document.body.classList.remove("compact");
                };
            }
        },

        changelog: function ()
        {
            MenuTitle.textContent = "Changelog";
            SetContent(`
                <pre style="max-height:200px;overflow:auto;" id="changelogContent">Loading...</pre>
            `);
            const ChangelogContent = document.getElementById("changelogContent");
            fetch("../changelog.txt")
                .then(R => R.text())
                .then(Txt => { if (ChangelogContent) ChangelogContent.textContent = Txt; })
                .catch(() => { if (ChangelogContent) ChangelogContent.textContent = "Unable to load changelog."; });
        },

        devlog: function ()
        {
            MenuTitle.textContent = "Dev Log";
            SetContent(`
                <div style="margin-bottom:8px;">
                    <label for="devlogFilter">Filter:</label>
                    <select id="devlogFilter" title="Filter log entries">
                        <option value="all">All</option>
                        <option value="error">Errors</option>
                        <option value="info">Info</option>
                    </select>
                </div>
                <pre style="max-height:200px;overflow:auto;" id="devlogContent">Loading...</pre>
                <button class="podawful-btn" id="clearDevLogPanel" title="Clear the devlog panel display">Clear Dev Log</button>
                <button class="podawful-btn" id="exportDevLog" title="Export the developer log to a text file">Export Dev Log</button>
                <button class="podawful-btn" id="deleteAllDevLogs" title="Delete all dev logs">Delete all Dev Logs</button>
                <div id="devlogError" style="color:#FFD600;margin-top:8px;"></div>
            `);

            const DevlogContent = document.getElementById("devlogContent");
            const DevlogFilter = document.getElementById("devlogFilter");
            const ClearDevLogPanel = document.getElementById("clearDevLogPanel");
            const ExportDevLog = document.getElementById("exportDevLog");
            const DeleteAllDevLogs = document.getElementById("deleteAllDevLogs");

            function ShowLog(Filter = "all")
            {
                if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)
                {
                    chrome.storage.local.get(["PodAwful::DevLog"], (Result) =>
                    {
                        let DevLog = Array.isArray(Result["PodAwful::DevLog"]) ? Result["PodAwful::DevLog"] : [];
                        RenderDevLog(DevLog, Filter);
                    });
                } else
                {
                    let DevLog = JSON.parse(localStorage.getItem("PodAwful::DevLog") || "[]");
                    RenderDevLog(DevLog, Filter);
                }
            }

            function RenderDevLog(DevLog, Filter)
            {
                DevLog = DevLog.slice().reverse();
                let Filtered = DevLog;
                if (Filter === "error") Filtered = DevLog.filter(E => E.type === "error");
                else if (Filter === "info") Filtered = DevLog.filter(E => !E.type || E.type === "info");
                if (DevlogContent)
                {
                    DevlogContent.innerHTML =
                        Filtered.map(E =>
                            E.type === "error"
                                ? `<span class="devlog-error">[${E.time}] [ERROR] ${E.action}</span>`
                                : `[${E.time}] ${E.action}`
                        ).join("<br>") || "No log.";
                }
            }

            ShowLog();

            if (DevlogFilter)
            {
                DevlogFilter.onchange = function (E)
                {
                    ShowLog(E.target.value);
                };
            }

            if (ClearDevLogPanel)
            {
                ClearDevLogPanel.onclick = function ()
                {
                    if (DevlogContent)
                        DevlogContent.innerHTML = "No log.";
                };
            }

            if (ExportDevLog)
            {
                ExportDevLog.onclick = function ()
                {
                    function ExportLog(DevLog)
                    {
                        const Lines = DevLog.map(E =>
                            `[${E.time}] [${E.type || "info"}] ${E.action}`
                        );
                        const BlobObj = new Blob([Lines.join("\n")], { type: "text/plain" });
                        const Url = URL.createObjectURL(BlobObj);
                        const A = document.createElement("a");
                        A.href = Url;
                        A.download = "podawful-devlog.txt";
                        A.click();
                        URL.revokeObjectURL(Url);
                    }
                    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)
                    {
                        chrome.storage.local.get(["PodAwful::DevLog"], (Result) =>
                        {
                            let DevLog = Array.isArray(Result["PodAwful::DevLog"]) ? Result["PodAwful::DevLog"] : [];
                            ExportLog(DevLog);
                        });
                    } else
                    {
                        let DevLog = JSON.parse(localStorage.getItem("PodAwful::DevLog") || "[]");
                        ExportLog(DevLog);
                    }
                };
            }

            if (DeleteAllDevLogs)
            {
                DeleteAllDevLogs.onclick = function ()
                {
                    if (!confirm("Are you sure you want to permanently delete all dev logs? This cannot be undone.")) return;
                    let ClearedChrome = false, ClearedLocal = false;
                    function AfterClear()
                    {
                        if (ClearedChrome && ClearedLocal)
                        {
                            ShowLog();
                        }
                    }
                    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)
                    {
                        chrome.storage.local.set({ "PodAwful::DevLog": [] }, () =>
                        {
                            ClearedChrome = true;
                            AfterClear();
                        });
                    } else
                    {
                        ClearedChrome = true;
                    }
                    localStorage.setItem("PodAwful::DevLog", "[]");
                    ClearedLocal = true;
                    AfterClear();
                };
            }
        },

        menu: function ()
        {
            MenuTitle.textContent = "Menu";
            SetContent(`
                <button class="podawful-btn" id="reportBugBtn" title="Send a bug report">Report a Bug</button>
                <p>Select an option from the popup.</p>
            `);
            const ReportBugBtn = document.getElementById("reportBugBtn");
            if (ReportBugBtn)
            {
                ReportBugBtn.onclick = function ()
                {
                    window.open("mailto:podawfulhenchman@gmail.com?subject=PodAwful%20Bug%20Report", "_blank");
                };
            }
        }
    };

    const PanelFn = Panels[Panel] || Panels.menu;
    try { PanelFn(); } catch (Err) { }

    BackBtn.classList.add("podawful-btn");
    BackBtn.title = "Return to main menu";
    BackBtn.onclick = function ()
    {
        window.location.href = "popup.html";
    };
});