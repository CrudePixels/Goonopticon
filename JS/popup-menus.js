import { LogDev } from './log.js';

// --- Storage Keys ---
const DEVLOG_BTN_KEY = "PodAwful::ShowDevLogBtn";
const CHANGELOG_BTN_KEY = "PodAwful::ShowChangelogBtn";
const HOTKEYS_BTN_KEY = "PodAwful::ShowHotkeysBtn";

// --- Storage Helpers ---
function getBtnSetting(key, cb, defaultVal = true)
{
    LogDev(`getBtnSetting called for key: ${key}`, "data");
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)
    {
        chrome.storage.local.get([key], result =>
        {
            LogDev(`chrome.storage.local.get for key: ${key} returned: ${JSON.stringify(result)}`, "data");
            if (result && key in result)
            {
                cb(result[key] === true || result[key] === "true");
            } else
            {
                cb(defaultVal);
            }
        });
    } else
    {
        LogDev(`localStorage fallback not used for key: ${key}`, "warning");
        cb(defaultVal);
    }
}
function setBtnSetting(key, val, cb)
{
    LogDev(`setBtnSetting called for key: ${key}, val: ${val}`, "system");
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)
    {
        let obj = {};
        obj[key] = !!val;
        chrome.storage.local.set(obj, () =>
        {
            LogDev(`chrome.storage.local.set for key: ${key} to ${val}`, "system");
            if (cb) cb();
        });
    } else
    {
        LogDev(`localStorage fallback not used for key: ${key}`, "warning");
        if (cb) cb();
    }
    LogDev(`${key} setting changed: ${val}`, "system");
}

// --- Individual Button Renderers ---
export function renderDevLogBtn()
{
    LogDev("renderDevLogBtn called", "render");
    getBtnSetting(DEVLOG_BTN_KEY, show =>
    {
        const btn = document.getElementById('devlog');
        if (btn) btn.style.display = show ? '' : 'none';
    });
}
function renderChangelogBtn()
{
    LogDev("renderChangelogBtn called", "render");
    getBtnSetting(CHANGELOG_BTN_KEY, show =>
    {
        const btn = document.getElementById('changelog');
        if (btn) btn.style.display = show ? '' : 'none';
    });
}
function renderHotkeysBtn()
{
    LogDev("renderHotkeysBtn called", "render");
    getBtnSetting(HOTKEYS_BTN_KEY, show =>
    {
        const btn = document.getElementById('hotkeys');
        if (btn) btn.style.display = show ? '' : 'none';
    });
}

// --- Main Menu Rendering ---
export function renderMainMenu()
{
    LogDev("Navigated to Main Menu", "interaction");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Menu";
    MenuContent.innerHTML = `
        <div class="popup-buttons">
            <button class="podawful-btn" id="toggleSidebar">Hide Sidebar</button>
            <button class="podawful-btn" id="importExport">Import/Export</button>
            <button class="podawful-btn" id="hotkeys">Hotkeys</button>
            <button class="podawful-btn" id="settings">Settings</button>
            <button class="podawful-btn" id="changelog">Changelog</button>
            <button class="podawful-btn" id="devlog">Dev Log</button>
            <button class="podawful-btn" id="reportBug">Report Bug</button>
        </div>
    `;

    // Sidebar toggle logic
    const sidebarBtn = document.getElementById("toggleSidebar");
    if (sidebarBtn)
    {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
        {
            if (!tabs[0]) return;
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () =>
                {
                    return new Promise(resolve =>
                    {
                        chrome.storage.local.get(["PodAwful::SidebarVisible"], result =>
                        {
                            resolve(result["PodAwful::SidebarVisible"] !== "false");
                        });
                    });
                }
            }, (results) =>
            {
                const visible = results?.[0]?.result;
                sidebarBtn.textContent = visible ? "Hide Sidebar" : "Show Sidebar";
            });
        });

        sidebarBtn.addEventListener("click", () =>
        {
            LogDev("Sidebar toggle interaction", "interaction");
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
            {
                if (!tabs[0]) return;
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () =>
                    {
                        chrome.storage.local.get(["PodAwful::SidebarVisible"], result =>
                        {
                            const visible = result["PodAwful::SidebarVisible"] !== "false";
                            chrome.storage.local.set({ "PodAwful::SidebarVisible": visible ? "false" : "true" }, () =>
                            {
                                // Optionally, trigger a sidebar re-render if needed
                                const sidebar = document.getElementById('podawful-sidebar');
                                if (sidebar) {
                                    sidebar.style.display = visible ? 'none' : '';
                                }
                            });
                        });
                    }
                }, () =>
                {
                    setTimeout(() => renderMainMenu(), 300);
                });
            });
        });
    }

    document.getElementById("importExport")?.addEventListener("click", () =>
    {
        LogDev("Import/Export button clicked", "interaction");
        renderImportExport();
    });
    document.getElementById("hotkeys")?.addEventListener("click", () =>
    {
        LogDev("Hotkeys button clicked", "interaction");
        renderHotkeys();
    });
    document.getElementById("settings")?.addEventListener("click", () =>
    {
        LogDev("Settings button clicked", "interaction");
        renderSettings();
    });
    document.getElementById("changelog")?.addEventListener("click", () =>
    {
        LogDev("Changelog button clicked", "interaction");
        renderChangelog();
    });
    document.getElementById("devlog")?.addEventListener("click", () =>
    {
        LogDev("Dev Log button clicked", "interaction");
        renderDevLog();
    });
    document.getElementById("reportBug")?.addEventListener("click", () =>
    {
        LogDev("Report Bug button clicked", "interaction");
        window.open("mailto:podawfulhenchman@gmail.com?subject=PodAwful%20Bug%20Report", "_blank");
    });

    renderDevLogBtn();
    renderChangelogBtn();
    renderHotkeysBtn();
}

// --- Import/Export Panel ---
function renderImportExport()
{
    LogDev("Navigated to Import/Export panel", "interaction");
    LogDev("renderImportExport called", "render");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Import/Export";
    MenuContent.innerHTML = `
        <button class="podawful-btn" id="importBtn">Import Notes</button>
        <button class="podawful-btn" id="exportBtn">Export Notes</button>
        <input type="file" id="importFile" style="display:none" accept=".json"/>
        <div id="importExportStatus" style="margin-top:10px;"></div>
        <button class="podawful-btn" id="backBtn">Back</button>
    `;

    const ImportBtn = document.getElementById("importBtn");
    const ImportFile = document.getElementById("importFile");
    const ExportBtn = document.getElementById("exportBtn");
    const StatusDiv = document.getElementById("importExportStatus");

    ImportBtn?.addEventListener("click", () =>
    {
        LogDev("Import Notes interaction", "interaction");
        ImportFile?.click();
    });
    ImportFile?.addEventListener("change", (E) =>
    {
        LogDev("Import file input changed", "event");
        try
        {
            const File = E.target.files[0];
            if (!File)
            {
                LogDev("Import cancelled by user (no file selected)", "warning");
                return;
            }
            const Reader = new FileReader();
            Reader.onload = function (Evt)
            {
                try
                {
                    const Data = JSON.parse(Evt.target.result);
                    localStorage.setItem("PodAwful::Notes::imported", JSON.stringify(Data));
                    if (StatusDiv) StatusDiv.textContent = "Import successful!";
                    LogDev("Import successful", "system");
                } catch {
                    if (StatusDiv) StatusDiv.textContent = "Invalid file format.";
                    LogDev("Import failed: Invalid file format", "error");
                }
            };
            Reader.readAsText(File);
        } catch {
            if (StatusDiv) StatusDiv.textContent = "Import failed.";
            LogDev("Import failed: Exception thrown", "error");
        }
    });

    ExportBtn?.addEventListener("click", () =>
    {
        LogDev("Export Notes interaction", "interaction");
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
            LogDev("Exported notes", "system");
        } catch {
            if (StatusDiv) StatusDiv.textContent = "Export failed.";
            LogDev("Export failed", "error");
        }
    });

    document.getElementById("backBtn")?.addEventListener("click", () =>
    {
        LogDev("Back to Main Menu from Import/Export panel", "interaction");
        renderMainMenu();
    });
}

// --- Hotkeys Panel ---
function renderHotkeys()
{
    LogDev("Navigated to Hotkeys panel", "interaction");
    LogDev("renderHotkeys called", "render");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Hotkeys";
    MenuContent.innerHTML = `
        <div>
            <label>
                Add Timestamp:
                <input id="hotkeyAdd" maxlength="1" style="width:2em">
                <label><input type="checkbox" id="hotkeyAddCtrl">Ctrl</label>
                <label><input type="checkbox" id="hotkeyAddAlt">Alt</label>
                <label><input type="checkbox" id="hotkeyAddShift">Shift</label>
            </label>
        </div>
        <div>
            <label>
                Toggle Sidebar:
                <input id="hotkeySidebar" maxlength="1" style="width:2em">
                <label><input type="checkbox" id="hotkeySidebarCtrl">Ctrl</label>
                <label><input type="checkbox" id="hotkeySidebarAlt">Alt</label>
                <label><input type="checkbox" id="hotkeySidebarShift">Shift</label>
            </label>
        </div>
        <div>
            <label>
                Lock Notes:
                <input id="hotkeyLock" maxlength="1" style="width:2em">
                <label><input type="checkbox" id="hotkeyLockCtrl">Ctrl</label>
                <label><input type="checkbox" id="hotkeyLockAlt">Alt</label>
                <label><input type="checkbox" id="hotkeyLockShift">Shift</label>
            </label>
        </div>
        <div>
            <label>
                Dev Log:
                <input id="hotkeyDev" maxlength="1" style="width:2em">
                <label><input type="checkbox" id="hotkeyDevCtrl">Ctrl</label>
                <label><input type="checkbox" id="hotkeyDevAlt">Alt</label>
                <label><input type="checkbox" id="hotkeyDevShift">Shift</label>
            </label>
        </div>
        <div class="button-group">
            <button class="podawful-btn" id="saveHotkeys">Save Hotkeys</button>
            <button class="podawful-btn" id="resetHotkeys">Reset Hotkeys</button>
        </div>
        <div id="hotkeyStatus" style="margin-top:10px;"></div>
        <button class="podawful-btn" id="backBtn">Back</button>
    `;

    const Hotkeys = JSON.parse(localStorage.getItem("PodAwful::Hotkeys") || "{}");
    document.getElementById("hotkeyAdd").value = Hotkeys.addTimestamp?.key || "t";
    document.getElementById("hotkeyAddCtrl").checked = Hotkeys.addTimestamp?.ctrl || false;
    document.getElementById("hotkeyAddAlt").checked = Hotkeys.addTimestamp?.alt || false;
    document.getElementById("hotkeyAddShift").checked = Hotkeys.addTimestamp?.shift || false;

    document.getElementById("hotkeySidebar").value = Hotkeys.toggleSidebar?.key || "s";
    document.getElementById("hotkeySidebarCtrl").checked = Hotkeys.toggleSidebar?.ctrl || false;
    document.getElementById("hotkeySidebarAlt").checked = Hotkeys.toggleSidebar?.alt || false;
    document.getElementById("hotkeySidebarShift").checked = Hotkeys.toggleSidebar?.shift || false;

    document.getElementById("hotkeyLock").value = Hotkeys.lockNotes?.key || "l";
    document.getElementById("hotkeyLockCtrl").checked = Hotkeys.lockNotes?.ctrl || false;
    document.getElementById("hotkeyLockAlt").checked = Hotkeys.lockNotes?.alt || false;
    document.getElementById("hotkeyLockShift").checked = Hotkeys.lockNotes?.shift || false;

    document.getElementById("hotkeyDev").value = Hotkeys.devLog?.key || "d";
    document.getElementById("hotkeyDevCtrl").checked = Hotkeys.devLog?.ctrl || false;
    document.getElementById("hotkeyDevAlt").checked = Hotkeys.devLog?.alt || false;
    document.getElementById("hotkeyDevShift").checked = Hotkeys.devLog?.shift || false;

    document.getElementById("saveHotkeys")?.addEventListener("click", () =>
    {
        LogDev("Save Hotkeys interaction", "interaction");
        const StatusDiv = document.getElementById("hotkeyStatus");
        try
        {
            const NewHotkeys = {
                addTimestamp: {
                    key: document.getElementById("hotkeyAdd").value || "t",
                    ctrl: document.getElementById("hotkeyAddCtrl").checked,
                    alt: document.getElementById("hotkeyAddAlt").checked,
                    shift: document.getElementById("hotkeyAddShift").checked
                },
                toggleSidebar: {
                    key: document.getElementById("hotkeySidebar").value || "s",
                    ctrl: document.getElementById("hotkeySidebarCtrl").checked,
                    alt: document.getElementById("hotkeySidebarAlt").checked,
                    shift: document.getElementById("hotkeySidebarShift").checked
                },
                lockNotes: {
                    key: document.getElementById("hotkeyLock").value || "l",
                    ctrl: document.getElementById("hotkeyLockCtrl").checked,
                    alt: document.getElementById("hotkeyLockAlt").checked,
                    shift: document.getElementById("hotkeyLockShift").checked
                },
                devLog: {
                    key: document.getElementById("hotkeyDev").value || "d",
                    ctrl: document.getElementById("hotkeyDevCtrl").checked,
                    alt: document.getElementById("hotkeyDevAlt").checked,
                    shift: document.getElementById("hotkeyDevShift").checked
                }
            };
            localStorage.setItem("PodAwful::Hotkeys", JSON.stringify(NewHotkeys));
            if (StatusDiv) StatusDiv.textContent = "Hotkeys saved!";
            LogDev("Hotkeys saved", "system");
        } catch {
            if (StatusDiv) StatusDiv.textContent = "Failed to save hotkeys.";
            LogDev("Failed to save hotkeys", "error");
        }
    });

    document.getElementById("resetHotkeys")?.addEventListener("click", () =>
    {
        LogDev("Reset Hotkeys interaction", "interaction");
        const StatusDiv = document.getElementById("hotkeyStatus");
        try
        {
            const DefaultHotkeys = {
                addTimestamp: { key: "t", ctrl: false, alt: false, shift: false },
                toggleSidebar: { key: "s", ctrl: false, alt: false, shift: false },
                lockNotes: { key: "l", ctrl: false, alt: false, shift: false },
                devLog: { key: "d", ctrl: false, alt: false, shift: false }
            };
            localStorage.setItem("PodAwful::Hotkeys", JSON.stringify(DefaultHotkeys));
            renderHotkeys();
            if (StatusDiv) StatusDiv.textContent = "Hotkeys reset to default!";
            LogDev("Hotkeys reset to default", "system");
        } catch {
            if (StatusDiv) StatusDiv.textContent = "Failed to reset hotkeys.";
            LogDev("Failed to reset hotkeys", "error");
        }
    });

    document.getElementById("backBtn")?.addEventListener("click", () =>
    {
        LogDev("Back to Main Menu from Hotkeys panel", "interaction");
        renderMainMenu();
    });
}

// --- Settings Panel ---
function renderSettings()
{
    LogDev("Navigated to Settings panel", "interaction");
    LogDev("renderSettings called", "render");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Settings";
    MenuContent.innerHTML = `
        <label><input type="checkbox" id="toggleDevLogBtn" /> Show Dev Log Button</label><br>
        <label><input type="checkbox" id="toggleChangelogBtn" /> Show Changelog Button</label><br>
        <label><input type="checkbox" id="toggleHotkeysBtn" /> Show Hotkeys Button</label><br>
        <label for="themeSelect">Theme:</label>
        <select id="themeSelect">
            <option value="default">Default</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
        <button class="podawful-btn" id="backBtn">Back</button>
    `;

    // Theme select logic
    const themeSelect = document.getElementById('themeSelect');
    const currentTheme = localStorage.getItem("PodAwful::Theme") || "default";
    themeSelect.value = currentTheme;
    themeSelect.addEventListener('change', function (e) {
        const selectedTheme = e.target.value;
        localStorage.setItem("PodAwful::Theme", selectedTheme);
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ "PodAwful::Theme": selectedTheme }, () => {
                LogDev("Theme changed via settings panel: " + selectedTheme, "interaction");
            });
        }
        // Apply theme immediately in popup
        import('./theme.js').then(({ ApplyTheme }) => {
            ApplyTheme(selectedTheme);
        });
    });

    // Dev Log toggle
    const devLogToggle = document.getElementById('toggleDevLogBtn');
    if (devLogToggle)
    {
        getBtnSetting(DEVLOG_BTN_KEY, checked =>
        {
            devLogToggle.checked = checked;
        });
        devLogToggle.addEventListener('change', function (e)
        {
            LogDev("Dev Log toggle interaction: " + e.target.checked, "interaction");
            setBtnSetting(DEVLOG_BTN_KEY, e.target.checked, () =>
            {
                renderDevLogBtn();
            });
        });
    }

    // Changelog toggle
    const changelogToggle = document.getElementById('toggleChangelogBtn');
    if (changelogToggle)
    {
        getBtnSetting(CHANGELOG_BTN_KEY, checked =>
        {
            changelogToggle.checked = checked;
        });
        changelogToggle.addEventListener('change', function (e)
        {
            LogDev("Changelog toggle interaction: " + e.target.checked, "interaction");
            setBtnSetting(CHANGELOG_BTN_KEY, e.target.checked, () =>
            {
                renderChangelogBtn();
            });
        });
    }

    // Hotkeys toggle
    const hotkeysToggle = document.getElementById('toggleHotkeysBtn');
    if (hotkeysToggle)
    {
        getBtnSetting(HOTKEYS_BTN_KEY, checked =>
        {
            hotkeysToggle.checked = checked;
        });
        hotkeysToggle.addEventListener('change', function (e)
        {
            LogDev("Hotkeys toggle interaction: " + e.target.checked, "interaction");
            setBtnSetting(HOTKEYS_BTN_KEY, e.target.checked, () =>
            {
                renderHotkeysBtn();
            });
        });
    }

    document.getElementById("backBtn")?.addEventListener("click", () =>
    {
        LogDev("Back to Main Menu from Settings panel", "interaction");
        renderMainMenu();
    });
}

// --- Changelog Panel ---
function renderChangelog()
{
    LogDev("Navigated to Changelog panel", "interaction");
    LogDev("renderChangelog called", "render");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Changelog";
    MenuContent.innerHTML = `
        <pre style="max-height:200px;overflow:auto;" id="changelogContent">Loading...</pre>
        <button class="podawful-btn" id="backBtn">Back</button>
    `;
    const ChangelogContent = document.getElementById("changelogContent");
    fetch("../changelog.txt")
        .then(R => R.text())
        .then(Txt => { if (ChangelogContent) ChangelogContent.textContent = Txt; LogDev("Changelog loaded", "data"); })
        .catch(() => { if (ChangelogContent) ChangelogContent.textContent = "Unable to load changelog."; LogDev("Unable to load changelog", "error"); });

    document.getElementById("backBtn")?.addEventListener("click", () =>
    {
        LogDev("Back to Main Menu from Changelog panel", "interaction");
        renderMainMenu();
    });
}

// --- Dev Log Panel ---
function renderDevLog()
{
    LogDev("Navigated to Dev Log panel", "interaction");
    LogDev("renderDevLog called", "render");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Dev Log";
    MenuContent.innerHTML = `
        <label for="devlogFilter">Filter:</label>
        <select id="devlogFilter">
            <option value="all">All</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="system">System</option>
            <option value="interaction">Interaction</option>
            <option value="event">Event</option>
            <option value="render">Render</option>
            <option value="data">Data</option>
            <option value="performance">Performance</option>
            <option value="miscellaneous">Miscellaneous</option>
        </select>
        <pre style="max-height:200px;overflow:auto;" id="devlogContent">Loading...</pre>
        <button class="podawful-btn" id="clearDevLogPanel">Clear Dev Log</button>
        <button class="podawful-btn" id="exportDevLog">Export Dev Log</button>
        <button class="podawful-btn" id="deleteAllDevLogs">Delete all Dev Logs</button>
        <button class="podawful-btn" id="backBtn">Back</button>
    `;

    const DevlogContent = document.getElementById("devlogContent");
    const FilterSelect = document.getElementById("devlogFilter");

    function ShowLog(selectedType = "all")
    {
        let DevLog = [];
        const render = (log) =>
        {
            DevLog = log.slice().reverse();
            if (selectedType !== "all")
            {
                DevLog = DevLog.filter(E => (E.type || "miscellaneous") === selectedType);
            }
            if (DevlogContent)
            {
                DevlogContent.innerHTML =
                    DevLog.map(E =>
                        `<span style="color:${E.color || '#fff'};">[${E.time}] [${typeof E.type === "string" ? E.type.toUpperCase() : "INFO"
                        }] ${E.action}</span>`
                    ).join("<br>") || "No log.";
            }
        };
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)
        {
            chrome.storage.local.get(["PodAwful::DevLog"], (Result) =>
            {
                render(Array.isArray(Result["PodAwful::DevLog"]) ? Result["PodAwful::DevLog"] : []);
                LogDev("Dev Log loaded from chrome.storage", "data");
            });
        } else
        {
            render(JSON.parse(localStorage.getItem("PodAwful::DevLog") || "[]"));
            LogDev("Dev Log loaded from localStorage", "data");
        }
    }

    // Initial log display
    ShowLog();

    // Filter change event
    FilterSelect?.addEventListener("change", () =>
    {
        ShowLog(FilterSelect.value);
    });

    document.getElementById("clearDevLogPanel")?.addEventListener("click", () =>
    {
        LogDev("Clear Dev Log interaction", "interaction");
        if (DevlogContent)
            DevlogContent.innerHTML = "No log.";
    });

    document.getElementById("exportDevLog")?.addEventListener("click", () =>
    {
        LogDev("Export Dev Log interaction", "interaction");
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
                LogDev("Dev Log exported from chrome.storage", "system");
            });
        } else
        {
            let DevLog = JSON.parse(localStorage.getItem("PodAwful::DevLog") || "[]");
            ExportLog(DevLog);
            LogDev("Dev Log exported from localStorage", "system");
        }
    });

    document.getElementById("deleteAllDevLogs")?.addEventListener("click", () =>
    {
        LogDev("Delete all Dev Logs interaction", "interaction");
        if (!confirm("Are you sure you want to permanently delete all dev logs? This cannot be undone."))
        {
            LogDev("Delete all Dev Logs cancelled by user", "warning");
            return;
        }
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)
        {
            chrome.storage.local.set({ "PodAwful::DevLog": [] }, () => ShowLog(FilterSelect.value));
        }
        localStorage.setItem("PodAwful::DevLog", "[]");
        ShowLog(FilterSelect.value);
        LogDev("All Dev Logs deleted", "system");
    });

    document.getElementById("backBtn")?.addEventListener("click", () =>
    {
        LogDev("Back to Main Menu from Dev Log panel", "interaction");
        renderMainMenu();
    });
}

// --- Initial Render ---
if (document.readyState === "complete" || document.readyState === "interactive")
{
    setTimeout(renderMainMenu, 0);
} else
{
    document.addEventListener("DOMContentLoaded", renderMainMenu);
}