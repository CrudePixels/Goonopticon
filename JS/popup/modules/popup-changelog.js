import { LogDev } from '../../log.js';
import { renderMainMenu } from './popup-main-menu.js';

/**
 * Renders the changelog panel
 */
export function renderChangelog() {
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

    // Load changelog content
    const ChangelogContent = document.getElementById("changelogContent");
    fetch("../changelog.txt")
        .then(R => R.text())
        .then(Txt => { 
            if (ChangelogContent) ChangelogContent.textContent = Txt; 
            LogDev("Changelog loaded", "data"); 
        })
        .catch(() => { 
            if (ChangelogContent) ChangelogContent.textContent = "Unable to load changelog."; 
            LogDev("Unable to load changelog", "error"); 
        });

    // Event listeners
    document.getElementById("backBtn")?.addEventListener("click", () => {
        LogDev("Back to Main Menu from Changelog panel", "interaction");
        renderMainMenu();
    });
}
