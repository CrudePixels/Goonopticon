import { LogDev } from '../../log.js';
import browser from 'webextension-polyfill';

/**
 * Shows the help/about modal
 */
export function showHelpAboutModal() {
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
            <h2>Help and About</h2>
            <p><strong>Goonopticon</strong> is a big and unstoppable browser extension for timestamping YouTube video.
            <h3>Key Features</h3>
            <ul>
                <li>📝 Timestamped notes</li>
                <li>🏷️ Tag system with search and filtering</li>
                <li>📁 Group organization</li>
                <li>📤 Import/export in JSON, CSV, and Markdown formats</li>
                <li>🎨 Multiple themes (Default, Light, Dark, Compact)</li>
                <li>🌐 Cross-browser support</li>
                <li>♿ Full accessibility support with ARIA and keyboard navigation</li>
                <li>🔄 Automatic updates with GitHub Actions</li>
                <li>🔗 URL normalization for consistent note storage</li>
                <li>📢 Update notifications with direct release links</li>
            </ul>
            
            <h3>How to Use</h3>
            <ol> 
                <li>Navigate to any YouTube video page</li>
                <li>Click the Goonopticon extension icon to open the popup menu</li>
                <li>Use "Show Sidebar" to toggle the timestamping interface</li>
                <li>Add notes at specific timestamps using the video player</li>
                <li>Organize content with groups and tags for easy retrieval</li>
                <li>Export your notes in various formats for backup or sharing</li>
            </ol>
            
            <h3>Credits</h3>
            <p>Created by Henchman CrudePixels<br>
            <p>Version: <span id="aboutVersion"></span></p>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Set version
    const manifest = browser.runtime.getManifest();
    const versionSpan = document.getElementById('aboutVersion');
    if (versionSpan && manifest.version) {
        versionSpan.textContent = `v${manifest.version}`;
    }
    
    // Focus modal for accessibility
    setTimeout(() => modal.focus(), 0);
    
    // Close button event
    const closeBtn = modal.querySelector('.popup-modal__close');
    closeBtn?.addEventListener('click', () => {
        modal.remove();
    });
    
    // Close on escape key
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.remove();
        }
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}
