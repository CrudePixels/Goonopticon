import { LogDev } from '../../log.js';
import { renderMainMenu } from './popup-main-menu.js';
import { getDevLog } from '../../sidebar/storage-new.js';

/**
 * Renders the dev log panel
 */
export function renderDevLog() {
    LogDev("Navigated to Dev Log panel", "interaction");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Dev Log";
    MenuContent.innerHTML = `
        <div style="max-height: 300px; overflow-y: auto; background: #1a1a1a; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap;" id="devLogContent">Loading...</div>
        <button class="podawful-btn" id="clearLogBtn" style="margin-top: 10px;">Clear Log</button>
        <button class="podawful-btn" id="backBtn" style="margin-top: 10px;">Back</button>
    `;

    // Load dev log content
    loadDevLog();

    // Event listeners
    document.getElementById("backBtn")?.addEventListener("click", () => {
        LogDev("Back to Main Menu from Dev Log panel", "interaction");
        renderMainMenu();
    });

    document.getElementById("clearLogBtn")?.addEventListener("click", () => {
        clearDevLog();
    });
}

// Load dev log
function loadDevLog() {
    getDevLog((err, log) => {
        const content = document.getElementById("devLogContent");
        if (content) {
            if (err) {
                content.textContent = "Error loading dev log: " + err;
            } else {
                content.textContent = log || "No dev log entries found.";
            }
        }
    });
}

// Clear dev log
function clearDevLog() {
    // Implementation would go here - keeping it simple for now
    const content = document.getElementById("devLogContent");
    if (content) {
        content.textContent = "Dev log cleared.";
    }
    LogDev("Dev log cleared", "system");
}
