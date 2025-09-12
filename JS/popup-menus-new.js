import { LogDev } from './log.js';
import { renderMainMenu } from './popup/modules/popup-main-menu.js';

// Re-export the main function
export { renderMainMenu };

// --- Initial Render ---
if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(renderMainMenu, 0);
} else {
    document.addEventListener("DOMContentLoaded", renderMainMenu);
}

document.addEventListener('DOMContentLoaded', () => {
    const logo = document.getElementById('popupLogo');
    if (logo && typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
        logo.src = browser.runtime.getURL('Resources/icon-48.png');
    }
});
