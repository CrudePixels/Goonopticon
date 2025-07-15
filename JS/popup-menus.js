import { LogDev } from './log.js';
import { applyTheme } from './theme.js';
import { getNotes, setNotes } from './sidebar/storage.js';
import browser from 'webextension-polyfill';

// --- Storage Keys ---
const DEVLOG_BTN_KEY = "PodAwful::ShowDevLogBtn";
const CHANGELOG_BTN_KEY = "PodAwful::ShowChangelogBtn";
const HOTKEYS_BTN_KEY = "PodAwful::ShowHotkeysBtn";
const BULK_ACTIONS_KEY = "PodAwful::EnableBulkActions";

// --- Storage Helpers ---
function getBtnSetting(key, cb, defaultVal = false)
{
    LogDev(`getBtnSetting called for key: ${key}`, "data");
    if (browser && browser.storage && browser.storage.local) {
        browser.storage.local.get([key])
            .then(result => {
                LogDev(`browser.storage.local.get for key: ${key} returned: ${JSON.stringify(result)}`, "data");
                if (result && key in result) {
                    cb(result[key] === true || result[key] === "true");
                } else {
                    cb(defaultVal);
                }
            });
    } else {
        LogDev(`localStorage fallback not used for key: ${key}`, "warning");
        cb(defaultVal);
    }
}
function setBtnSetting(key, val, cb)
{
    LogDev(`setBtnSetting called for key: ${key}, val: ${val}`, "system");
    if (browser && browser.storage && browser.storage.local) {
        let obj = {};
        obj[key] = !!val;
        browser.storage.local.set(obj)
            .then(() => {
                LogDev(`browser.storage.local.set for key: ${key} to ${val}`, "system");
                if (cb) cb();
            });
    } else {
        LogDev(`localStorage fallback not used for key: ${key}`, "warning");
        if (cb) cb();
    }
    LogDev(`${key} setting changed: ${val}`, "system");
}

/**
 * Renders the Dev Log button, showing or hiding it based on settings.
 */
export function renderDevLogBtn()
{
    LogDev("renderDevLogBtn called", "render");
    getBtnSetting(DEVLOG_BTN_KEY, show =>
    {
        const btn = document.getElementById('devlog');
        if (btn) btn.style.display = show ? '' : 'none';
    }, false);
}
function renderChangelogBtn()
{
    LogDev("renderChangelogBtn called", "render");
    getBtnSetting(CHANGELOG_BTN_KEY, show =>
    {
        const btn = document.getElementById('changelog');
        if (btn) btn.style.display = show ? '' : 'none';
    }, false);
}

/**
 * Renders the main popup menu UI.
 */
export function renderMainMenu()
{
    LogDev("Navigated to Main Menu", "interaction");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Menu";
    MenuContent.innerHTML = `
        <div class="popup-buttons">
            <button class="podawful-btn" id="importExport">Import/Export</button>
            <button class="podawful-btn" id="settings">Settings</button>
            <button class="podawful-btn" id="changelog">Changelog</button>
            <button class="podawful-btn" id="devlog">Dev Log</button>
            <button class="podawful-btn" id="reportBug">Report Bug</button>
            <button class="podawful-btn" id="helpAbout">Help / About</button>
        </div>
    `;

    // Accessibility: Add aria-labels to all menu buttons
    const menuButtons = MenuContent.querySelectorAll('button');
    menuButtons.forEach(btn => {
        if (!btn.hasAttribute('aria-label')) {
            btn.setAttribute('aria-label', btn.textContent.trim());
        }
    });

    // Accessibility: Keyboard navigation for menu
    MenuContent.addEventListener('keydown', (e) => {
        const focusable = Array.from(MenuContent.querySelectorAll('button'));
        const idx = focusable.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (idx !== -1) {
                const next = focusable[(idx + 1) % focusable.length];
                next.focus();
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (idx !== -1) {
                const prev = focusable[(idx - 1 + focusable.length) % focusable.length];
                prev.focus();
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
                document.activeElement.click();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            const backBtn = MenuContent.querySelector('#backBtn');
            if (backBtn) backBtn.click();
        }
    });

    // Sidebar toggle logic
    const sidebarBtn = document.getElementById("toggleSidebar");
    if (sidebarBtn)
    {
        browser.tabs.query({ active: true, currentWindow: true })
            .then(tabs => {
                if (!tabs[0]) return;
                return browser.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () =>
                    {
                        return new Promise(resolve =>
                        {
                            browser.storage.local.get(["PodAwful::SidebarVisible"])
                                .then(result => {
                                    resolve(result["PodAwful::SidebarVisible"] === true || result["PodAwful::SidebarVisible"] === "true");
                                });
                        });
                    }
                });
            })
            .then(results => {
                const visible = results?.[0]?.result;
                sidebarBtn.textContent = visible ? "Hide Sidebar" : "Show Sidebar";
            });

        sidebarBtn.addEventListener("click", () =>
        {
            LogDev("Sidebar toggle interaction", "interaction");
            browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => {
                    if (!tabs[0]) return;
                    return browser.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: () =>
                        {
                            browser.storage.local.get(["PodAwful::SidebarVisible"])
                                .then(result => {
                                    const visible = result["PodAwful::SidebarVisible"] === true || result["PodAwful::SidebarVisible"] === "true";
                                    browser.storage.local.set({ "PodAwful::SidebarVisible": visible ? "false" : "true" });
                                    // Optionally, trigger a sidebar re-render if needed
                                    const sidebar = document.getElementById('podawful-sidebar');
                                    if (sidebar) {
                                        sidebar.style.display = visible ? 'none' : '';
                                    }
                                });
                        }
                    });
                })
                .then(() => {
                    setTimeout(renderMainMenu, 300);
                });
        });
    }

    document.getElementById("importExport")?.addEventListener("click", () =>
    {
        LogDev("Import/Export button clicked", "interaction");
        renderImportExport();
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
    document.getElementById("helpAbout")?.addEventListener("click", () => {
        showHelpAboutModal();
    });

    renderDevLogBtn();
    renderChangelogBtn();
}

function showHelpAboutModal() {
    // Remove any existing modal
    document.getElementById('helpAboutModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'helpAboutModal';
    modal.className = 'popup-modal';
    modal.tabIndex = -1;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
        <div class="popup-modal__content">
            <button class="popup-modal__close" aria-label="Close Help/About">✕</button>
            <h2>About Goonopticon</h2>
            <p><strong>Goonopticon</strong> is a powerful browser extension for timestamping YouTube videos with advanced group, tag, and note management capabilities. Built for PodAwful.</p>
            
            <h3>Key Features</h3>
            <ul>
                <li>📝 Timestamped notes with rich text and metadata</li>
                <li>🏷️ Advanced tag system with search and filtering</li>
                <li>📁 Group organization for better content management</li>
                <li>📊 Bulk actions for efficient note management</li>
                <li>📤 Import/export in JSON, CSV, and Markdown formats</li>
                <li>🎨 Multiple themes (Default, Light, Dark, Compact)</li>
                <li>⌨️ Customizable hotkeys for quick actions</li>
                <li>🌐 Cross-browser support (Chrome, Firefox, Edge)</li>
                <li>♿ Full accessibility support with ARIA and keyboard navigation</li>
            </ul>
            
            <h3>How to Use</h3>
            <ol>
                <li>Navigate to any YouTube video page</li>
                <li>Click the Goonopticon extension icon to open the popup menu</li>
                <li>Use "Show Sidebar" to toggle the timestamping interface</li>
                <li>Add notes at specific timestamps using the video player</li>
                <li>Organize content with groups and tags for easy retrieval</li>
                <li>Use bulk actions for efficient management of multiple notes</li>
                <li>Export your notes in various formats for backup or sharing</li>
            </ol>
            
            <h3>Advanced Features</h3>
            <ul>
                <li><strong>Tag Manager:</strong> Search, edit, and manage all tags in one place</li>
                <li><strong>Bulk Actions:</strong> Select multiple notes/groups for deletion, moving, or tagging</li>
                <li><strong>Search & Filter:</strong> Find notes quickly with real-time search and tag filtering</li>
                <li><strong>Theme System:</strong> Choose from multiple visual themes to match your preferences</li>
                <li><strong>Dev Tools:</strong> Access detailed logging and debugging information</li>
                <li><strong>Error Recovery:</strong> Robust error handling with user-friendly notifications</li>
            </ul>
            
            <h3>Credits</h3>
            <p>Created by Henchman CrudePixels<br>

            <p>Version: <span id="aboutVersion"></span></p>
        </div>
    `;
    document.body.appendChild(modal);
    // Set version
    const manifest = (browser && browser.runtime && browser.runtime.getManifest) ? browser.runtime.getManifest() : (chrome && chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest() : null);
    if (manifest && manifest.version) {
        modal.querySelector('#aboutVersion').textContent = manifest.version;
    } else {
        // fallback: try fetch manifest.json
        fetch('../manifest.json').then(r => r.json()).then(j => {
            modal.querySelector('#aboutVersion').textContent = j.version || '';
        });
    }
    // Close logic
    const closeBtn = modal.querySelector('.popup-modal__close');
    closeBtn.onclick = () => modal.remove();
    modal.addEventListener('keydown', e => {
        if (e.key === 'Escape') modal.remove();
    });
    setTimeout(() => closeBtn.focus(), 100);
}

// Cross-browser sendMessage helper
function sendMessageToTab(tabId, message, callback) {
    if (typeof browser !== 'undefined' && browser.tabs && browser.tabs.sendMessage.length === 2) {
        browser.tabs.sendMessage(tabId, message).then(callback);
    } else if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.sendMessage) {
        chrome.tabs.sendMessage(tabId, message, callback);
    }
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

    // Accessibility: Add aria-labels to all menu buttons
    const menuButtons = MenuContent.querySelectorAll('button');
    menuButtons.forEach(btn => {
        if (!btn.hasAttribute('aria-label')) {
            btn.setAttribute('aria-label', btn.textContent.trim());
        }
    });
    // Accessibility: Keyboard navigation for menu
    MenuContent.addEventListener('keydown', (e) => {
        const focusable = Array.from(MenuContent.querySelectorAll('button'));
        const idx = focusable.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (idx !== -1) {
                const next = focusable[(idx + 1) % focusable.length];
                next.focus();
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (idx !== -1) {
                const prev = focusable[(idx - 1 + focusable.length) % focusable.length];
                prev.focus();
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
                document.activeElement.click();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            const backBtn = MenuContent.querySelector('#backBtn');
            if (backBtn) backBtn.click();
        }
    });

    const ImportBtn = document.getElementById("importBtn");
    const ImportFile = document.getElementById("importFile");
    const ExportBtn = document.getElementById("exportBtn");
    const StatusDiv = document.getElementById("importExportStatus");

    ImportBtn?.addEventListener("click", () => {
        LogDev("Import Notes interaction", "interaction");
        ImportFile.value = "";
        ImportFile.click();
    });
    ImportFile?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const notes = JSON.parse(evt.target.result);
                browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
                    if (!tabs[0]) return;
                    let responded = false;
                    const timeout = setTimeout(() => {
                        if (!responded) {
                            StatusDiv.textContent = "Sidebar must be open to import notes.";
                        }
                    }, 1500);
                    sendMessageToTab(tabs[0].id, { type: 'IMPORT_NOTES', notes }, (response) => {
                        responded = true;
                        clearTimeout(timeout);
                        if (response && response.success) {
                            StatusDiv.textContent = "Notes imported for this page.";
                        } else {
                            StatusDiv.textContent = "Failed to import notes.";
                        }
                    });
                });
            } catch (e) {
                StatusDiv.textContent = "Failed to import notes: " + e;
            }
        };
        reader.readAsText(file);
    });
    ExportBtn?.addEventListener("click", () => {
        LogDev("Export Notes interaction", "interaction");
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (!tabs[0]) return;
            sendMessageToTab(tabs[0].id, { type: 'EXPORT_NOTES' }, (response) => {
                const notes = response && Array.isArray(response.notes) ? response.notes : [];
                const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'goonopticon-notes.json';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                StatusDiv.textContent = "Notes exported for this page.";
            });
        });
    });
    document.getElementById("backBtn")?.addEventListener("click", () => {
        LogDev("Back to Main Menu from Import/Export panel", "interaction");
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
        <label><input type="checkbox" id="toggleBulkActions" /> Enable Bulk Actions</label><br>
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
    browser.storage.local.get("PodAwful::Theme")
        .then(Result => {
            const currentTheme = Result["PodAwful::Theme"] || "default";
            themeSelect.value = currentTheme;
            themeSelect.addEventListener('change', function (e) {
                const selectedTheme = e.target.value;
                browser.storage.local.set({ "PodAwful::Theme": selectedTheme })
                    .then(() => {
                        applyTheme(selectedTheme);
                    });
            });
        });

    // Dev Log toggle
    const devLogToggle = document.getElementById('toggleDevLogBtn');
    if (devLogToggle)
    {
        getBtnSetting(DEVLOG_BTN_KEY, checked =>
        {
            devLogToggle.checked = checked;
        }, false);
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
        }, false);
        changelogToggle.addEventListener('change', function (e)
        {
            LogDev("Changelog toggle interaction: " + e.target.checked, "interaction");
            setBtnSetting(CHANGELOG_BTN_KEY, e.target.checked, () =>
            {
                renderChangelogBtn();
            });
        });
    }

    // Bulk Actions toggle
    const bulkActionsToggle = document.getElementById('toggleBulkActions');
    if (bulkActionsToggle)
    {
        getBtnSetting(BULK_ACTIONS_KEY, checked =>
        {
            bulkActionsToggle.checked = checked;
        }, false);
        bulkActionsToggle.addEventListener('change', function (e)
        {
            LogDev("Bulk Actions toggle interaction: " + e.target.checked, "interaction");
            setBtnSetting(BULK_ACTIONS_KEY, e.target.checked, () =>
            {
                // No immediate re-render needed, as bulk actions are not directly tied to a button
                // but the setting is saved.
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

    // Accessibility: Add aria-labels to all menu buttons
    const menuButtons = MenuContent.querySelectorAll('button');
    menuButtons.forEach(btn => {
        if (!btn.hasAttribute('aria-label')) {
            btn.setAttribute('aria-label', btn.textContent.trim());
        }
    });
    // Accessibility: Keyboard navigation for menu
    MenuContent.addEventListener('keydown', (e) => {
        const focusable = Array.from(MenuContent.querySelectorAll('button'));
        const idx = focusable.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (idx !== -1) {
                const next = focusable[(idx + 1) % focusable.length];
                next.focus();
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (idx !== -1) {
                const prev = focusable[(idx - 1 + focusable.length) % focusable.length];
                prev.focus();
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
                document.activeElement.click();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            const backBtn = MenuContent.querySelector('#backBtn');
            if (backBtn) backBtn.click();
        }
    });

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

    // Accessibility: Add aria-labels to all menu buttons
    const menuButtons = MenuContent.querySelectorAll('button');
    menuButtons.forEach(btn => {
        if (!btn.hasAttribute('aria-label')) {
            btn.setAttribute('aria-label', btn.textContent.trim());
        }
    });
    // Accessibility: Keyboard navigation for menu
    MenuContent.addEventListener('keydown', (e) => {
        const focusable = Array.from(MenuContent.querySelectorAll('button'));
        const idx = focusable.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (idx !== -1) {
                const next = focusable[(idx + 1) % focusable.length];
                next.focus();
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (idx !== -1) {
                const prev = focusable[(idx - 1 + focusable.length) % focusable.length];
                prev.focus();
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
                document.activeElement.click();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            const backBtn = MenuContent.querySelector('#backBtn');
            if (backBtn) backBtn.click();
        }
    });

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
        browser.storage.local.get("PodAwful::DevLog")
            .then(Result => {
                render(Array.isArray(Result["PodAwful::DevLog"]) ? Result["PodAwful::DevLog"] : []);
                LogDev("Dev Log loaded from chrome.storage", "data");
            });
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
        browser.storage.local.get("PodAwful::DevLog")
            .then(Result => {
                let DevLog = Array.isArray(Result["PodAwful::DevLog"]) ? Result["PodAwful::DevLog"] : [];
                ExportLog(DevLog);
                LogDev("Dev Log exported from chrome.storage", "system");
            });
    });

    document.getElementById("deleteAllDevLogs")?.addEventListener("click", () =>
    {
        LogDev("Delete all Dev Logs interaction", "interaction");
        if (!confirm("Are you sure you want to permanently delete all dev logs? This cannot be undone."))
        {
            LogDev("Delete all Dev Logs cancelled by user", "warning");
            return;
        }
        browser.storage.local.set({ "PodAwful::DevLog": [] })
            .then(() => ShowLog(FilterSelect.value));
        ShowLog(FilterSelect.value);
        LogDev("All Dev Logs deleted", "system");
    });

    document.getElementById("backBtn")?.addEventListener("click", () =>
    {
        LogDev("Back to Main Menu from Dev Log panel", "interaction");
        renderMainMenu();
    });
}

// Add a helper function for schema validation:
function isValidNote(note) {
    return note && typeof note === 'object' &&
        typeof note.id === 'string' &&
        typeof note.text === 'string' &&
        typeof note.group === 'string' &&
        Array.isArray(note.tags) &&
        typeof note.created === 'number';
}
function isValidNotesArray(arr) {
    return Array.isArray(arr) && arr.every(isValidNote);
}
function isValidAllNotesObject(obj) {
    return obj && typeof obj === 'object' &&
        Object.values(obj).every(isValidNotesArray);
}

// --- Initial Render ---
if (document.readyState === "complete" || document.readyState === "interactive")
{
    setTimeout(renderMainMenu, 0);
} else
{
    document.addEventListener("DOMContentLoaded", renderMainMenu);
}
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.getElementById('popupLogo');
    if (logo && typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
        logo.src = browser.runtime.getURL('Resources/icon-48.png');
    }
});