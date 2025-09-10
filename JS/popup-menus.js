import { LogDev } from './log.js';
import { applyTheme } from './theme.js';
import { getNotes, setNotes } from './sidebar/storage.js';
import { 
    saveCustomPreset, 
    deletePreset, 
    setCustomTheme, 
    resetCustomTheme, 
    restoreDefaultPresets,
    getCustomTheme,
    getPresetThemes,
    createThemeFromPreset,
    getAllPresets,
    applyCustomTheme
} from './customTheme.js';
import { 
    loadAllThemes, 
    loadThemeFromFile, 
    saveCustomThemeToStorage, 
    deleteCustomTheme, 
    exportTheme, 
    importTheme, 
    downloadTheme 
} from './themeManager.js';
import browser from 'webextension-polyfill';

// Simple modal function for popup context
function showModal(title, message, type = 'info') {
    // Remove any existing modal
    const existingModal = document.getElementById('popupModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'popupModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: var(--note-bg, #222);
        border: 1px solid var(--sidebar-border, #333);
        border-radius: 8px;
        padding: 20px;
        max-width: 300px;
        width: 90%;
        text-align: center;
        color: var(--sidebar-fg, #e0e0e0);
    `;
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
        margin: 0 0 10px 0;
        color: var(--accent, #FFD600);
    `;
    
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        margin: 0 0 15px 0;
    `;
    
    const button = document.createElement('button');
    button.textContent = 'OK';
    button.className = 'podawful-btn';
    button.style.cssText = `
        background: ${type === 'error' ? '#F44336' : type === 'success' ? '#4CAF50' : 'var(--accent, #FFD600)'};
        color: ${type === 'error' || type === 'success' ? 'white' : 'black'};
    `;
    button.onclick = () => modal.remove();
    
    modalContent.appendChild(titleEl);
    modalContent.appendChild(messageEl);
    modalContent.appendChild(button);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
}

// Confirmation modal function for popup context
function showConfirmModal(title, message, okText = 'OK', cancelText = 'Cancel', onConfirm) {
    // Remove any existing modal
    const existingModal = document.getElementById('popupConfirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'popupConfirmModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: var(--note-bg, #222);
        border: 1px solid var(--sidebar-border, #333);
        border-radius: 8px;
        padding: 20px;
        max-width: 300px;
        width: 90%;
        text-align: center;
        color: var(--sidebar-fg, #e0e0e0);
    `;
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
        margin: 0 0 10px 0;
        color: var(--accent, #FFD600);
    `;
    
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        margin: 0 0 15px 0;
    `;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: center;
    `;
    
    const okButton = document.createElement('button');
    okButton.textContent = okText;
    okButton.className = 'podawful-btn';
    okButton.style.cssText = `
        background: #F44336;
        color: white;
        padding: 8px 16px;
    `;
    okButton.onclick = () => {
        modal.remove();
        if (onConfirm) onConfirm();
    };
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = cancelText;
    cancelButton.className = 'podawful-btn';
    cancelButton.style.cssText = `
        background: #666;
        color: white;
        padding: 8px 16px;
    `;
    cancelButton.onclick = () => modal.remove();
    
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(okButton);
    
    modalContent.appendChild(titleEl);
    modalContent.appendChild(messageEl);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
}

// Input modal function for getting theme names
function showInputModal(title, message, placeholder = '', callback) {
    // Remove any existing modal
    const existingModal = document.getElementById('popupInputModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'popupInputModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: var(--note-bg, #222);
        border: 1px solid var(--sidebar-border, #333);
        border-radius: 8px;
        padding: 20px;
        max-width: 350px;
        width: 90%;
        text-align: center;
        color: var(--sidebar-fg, #e0e0e0);
    `;
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
        margin: 0 0 10px 0;
        color: var(--accent, #FFD600);
    `;
    
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        margin: 0 0 15px 0;
    `;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.style.cssText = `
        width: 100%;
        padding: 8px;
        margin: 10px 0;
        border: 1px solid var(--sidebar-border, #333);
        border-radius: 4px;
        background: var(--surface, #333);
        color: var(--sidebar-fg, #e0e0e0);
        font-size: 14px;
    `;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-top: 15px;
    `;
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className = 'podawful-btn';
    saveButton.style.cssText = `
        background: var(--accent, #FFD600);
        color: black;
        flex: 1;
    `;
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'podawful-btn';
    cancelButton.style.cssText = `
        background: var(--surface, #333);
        color: var(--sidebar-fg, #e0e0e0);
        flex: 1;
    `;
    
    saveButton.onclick = () => {
        const value = input.value.trim();
        if (value) {
            modal.remove();
            callback(value);
        }
    };
    
    cancelButton.onclick = () => modal.remove();
    
    // Handle Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const value = input.value.trim();
            if (value) {
                modal.remove();
                callback(value);
            }
        }
    });
    
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    
    modalContent.appendChild(titleEl);
    modalContent.appendChild(messageEl);
    modalContent.appendChild(input);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
    // Focus the input
    setTimeout(() => input.focus(), 100);
}

// Save theme as new preset
async function saveAsCustomTheme() {
    try {
        // saveCustomPreset is now statically imported
        
        // Get current theme from form
        const theme = getCurrentThemeFromForm();
        
        showInputModal(
            'Save Theme As',
            'Enter a name for your custom theme:',
            'My Custom Theme',
            (name) => {
                saveCustomPreset(name, theme, (err) => {
                    if (err) {
                        LogDev('Error saving custom preset: ' + err, 'error');
                        showModal('Error', 'Failed to save custom preset', 'error');
                    } else {
                        LogDev('Custom preset saved successfully', 'system');
                        showModal('Success', `Theme "${name}" saved as preset!`, 'success');
                        loadPresets(); // Reload presets
                    }
                });
            }
        );
    } catch (err) {
        LogDev('Error saving custom preset: ' + err, 'error');
        showModal('Error', 'Failed to save custom preset', 'error');
    }
}

// Load selected preset theme
async function loadSelectedPresetTheme() {
    const presetSelect = document.getElementById('presetSelect');
    const selectedPresetName = presetSelect.value;
    
    if (!selectedPresetName) {
        showModal('Error', 'Please select a preset to load', 'error');
        return;
    }
    
    try {
        // getAllPresets is now statically imported
        getAllPresets((err, presets) => {
            if (err) {
                LogDev('Error loading presets: ' + err, 'error');
                return;
            }
            
            const selectedPreset = presets.find(p => p.name === selectedPresetName);
            if (!selectedPreset) {
                LogDev('Preset not found: ' + selectedPresetName, 'error');
                showModal('Error', 'Preset not found', 'error');
                return;
            }
            
            LogDev('Loading preset: ' + selectedPresetName, 'system');
            LogDev('Selected preset object: ' + JSON.stringify(selectedPreset), 'system');
            
            // Check if buttons object exists
            if (!selectedPreset.buttons) {
                LogDev('ERROR: selectedPreset.buttons is undefined!', 'error');
                showModal('Error', 'Invalid preset: missing button properties', 'error');
                return;
            }
            
            // Update all form fields
            document.getElementById('primaryColor').value = selectedPreset.colors.primary;
            document.getElementById('backgroundColor').value = selectedPreset.colors.background;
            document.getElementById('surfaceColor').value = selectedPreset.colors.surface;
            document.getElementById('textColor').value = selectedPreset.colors.text;
            document.getElementById('textSecondaryColor').value = selectedPreset.colors.textSecondary;
            document.getElementById('borderColor').value = selectedPreset.colors.border;
            document.getElementById('successColor').value = selectedPreset.colors.success;
            document.getElementById('warningColor').value = selectedPreset.colors.warning;
            document.getElementById('errorColor').value = selectedPreset.colors.error;
            document.getElementById('infoColor').value = selectedPreset.colors.info;
            document.getElementById('highlightColor').value = selectedPreset.colors.highlight;
            
            // Typography fields
            document.getElementById('fontSize').value = parseInt(selectedPreset.typography.fontSize);
            document.getElementById('fontSizeValue').textContent = selectedPreset.typography.fontSize;
            document.getElementById('fontSizeSmall').value = parseInt(selectedPreset.typography.fontSizeSmall);
            document.getElementById('fontSizeSmallValue').textContent = selectedPreset.typography.fontSizeSmall;
            document.getElementById('fontSizeLarge').value = parseInt(selectedPreset.typography.fontSizeLarge);
            document.getElementById('fontSizeLargeValue').textContent = selectedPreset.typography.fontSizeLarge;
            document.getElementById('fontWeight').value = selectedPreset.typography.fontWeight;
            document.getElementById('lineHeight').value = parseFloat(selectedPreset.typography.lineHeight);
            document.getElementById('lineHeightValue').textContent = selectedPreset.typography.lineHeight;
            document.getElementById('fontFamily').value = selectedPreset.typography.fontFamily;
            
            // Button fields
            document.getElementById('buttonHeight').value = parseInt(selectedPreset.buttons.height);
            document.getElementById('buttonHeightValue').textContent = selectedPreset.buttons.height;
            document.getElementById('buttonPadding').value = parseInt(selectedPreset.buttons.padding.split(' ')[0]);
            document.getElementById('buttonPaddingValue').textContent = selectedPreset.buttons.padding.split(' ')[0];
            document.getElementById('buttonFontSize').value = parseInt(selectedPreset.buttons.fontSize);
            document.getElementById('buttonFontSizeValue').textContent = selectedPreset.buttons.fontSize;
            document.getElementById('buttonBorderRadius').value = parseInt(selectedPreset.buttons.borderRadius);
            document.getElementById('buttonBorderRadiusValue').textContent = selectedPreset.buttons.borderRadius;
            // Validate and set button colors with fallbacks
            const buttonBg = selectedPreset.buttons.backgroundColor || '#FFD600';
            const buttonText = selectedPreset.buttons.textColor || '#000000';
            const buttonBorder = selectedPreset.buttons.borderColor || '#FFD600';
            
            LogDev(`Button colors - bg: ${buttonBg}, text: ${buttonText}, border: ${buttonBorder}`, 'system');
            
            document.getElementById('buttonBackgroundColor').value = buttonBg;
            document.getElementById('buttonTextColor').value = buttonText;
            document.getElementById('buttonBorderColor').value = buttonBorder;
            
            const applyToMenusElement = document.getElementById('applyToMenus');
            if (applyToMenusElement) {
                applyToMenusElement.checked = selectedPreset.buttons.applyToMenus || false;
            }
            
            // Spacing fields
            document.getElementById('padding').value = parseInt(selectedPreset.spacing.padding);
            document.getElementById('paddingValue').textContent = selectedPreset.spacing.padding;
            document.getElementById('margin').value = parseInt(selectedPreset.spacing.margin);
            document.getElementById('marginValue').textContent = selectedPreset.spacing.margin;
            document.getElementById('borderRadius').value = parseInt(selectedPreset.spacing.borderRadius);
            document.getElementById('borderRadiusValue').textContent = selectedPreset.spacing.borderRadius;
            document.getElementById('gap').value = parseInt(selectedPreset.spacing.gap);
            document.getElementById('gapValue').textContent = selectedPreset.spacing.gap;
            
            // Apply the theme immediately
            const theme = getCurrentThemeFromForm();
            applyCustomTheme(theme);
            
            // Save the theme to storage so sidebar gets notified
            setCustomTheme(theme, (err) => {
                if (err) {
                    LogDev('Error saving preset theme: ' + err, 'error');
                    showModal('Error', 'Failed to save theme', 'error');
                } else {
                    LogDev('Preset theme saved successfully', 'system');
                    
                    // Also save the theme selection to storage for persistence
                    browser.storage.local.set({ 'PodAwful::Theme': selectedPresetName }, (err) => {
                        if (err) {
                            LogDev('Error saving theme selection: ' + err, 'error');
                        } else {
                            LogDev('Theme selection saved: ' + selectedPresetName, 'data');
                        }
                    });
                    
                    showModal('Success', `Preset "${selectedPresetName}" loaded!`, 'success');
                }
            });
        });
    } catch (err) {
        LogDev('Error loading preset: ' + err, 'error');
        showModal('Error', 'Failed to load preset', 'error');
    }
}

// Delete selected preset
async function deleteSelectedPreset() {
    const presetSelect = document.getElementById('presetSelect');
    const selectedPreset = presetSelect.value;
    
    if (!selectedPreset) {
        showModal('Error', 'Please select a preset to delete', 'error');
        return;
    }
    
    // Check if it's a built-in preset (only prevent deletion of core presets)
    const corePresets = ['Default', 'Light', 'Dark'];
    if (corePresets.includes(selectedPreset)) {
        showModal('Error', 'Cannot delete core presets (Default, Light, Dark)', 'error');
        return;
    }
    
    showConfirmModal(
        'Delete Preset',
        `Are you sure you want to delete "${selectedPreset}"?`,
        'Delete',
        'Cancel',
        async () => {
            try {
                // deletePreset is now statically imported
                deletePreset(selectedPreset, (err) => {
                    if (err) {
                        LogDev('Error deleting preset: ' + err, 'error');
                        showModal('Error', 'Failed to delete preset', 'error');
                    } else {
                        LogDev('Preset deleted successfully', 'system');
                        showModal('Success', `Preset "${selectedPreset}" deleted!`, 'success');
                        loadPresets(); // Reload presets
                    }
                });
            } catch (err) {
                LogDev('Error deleting preset: ' + err, 'error');
                showModal('Error', 'Failed to delete preset', 'error');
            }
        }
    );
}

// Save and apply custom theme
async function saveAndApplyCustomTheme() {
    try {
        LogDev('Save button clicked', 'system');
        
        // setCustomTheme and applyCustomTheme are now statically imported
        
        const theme = getCurrentThemeFromForm();
        LogDev('Theme from form: ' + JSON.stringify(theme), 'system');
        
        // Apply theme immediately first
        LogDev('Applying theme...', 'system');
        applyCustomTheme(theme);
        
        // Then save it
        LogDev('Saving theme to storage...', 'system');
        setCustomTheme(theme, (err) => {
            if (err) {
                LogDev('Error saving custom theme: ' + err, 'error');
                showModal('Error', 'Failed to save custom theme', 'error');
            } else {
                LogDev('Custom theme saved successfully', 'system');
                showModal('Success', 'Theme saved and applied!', 'success');
            }
        });
    } catch (err) {
        LogDev('Error saving custom theme: ' + err, 'error');
        showModal('Error', 'Failed to save custom theme', 'error');
    }
}

// Reset custom theme
async function resetCustomThemeFunction() {
    try {
        // resetCustomTheme is now statically imported
        
        resetCustomTheme((err) => {
            if (err) {
                LogDev('Error resetting custom theme: ' + err, 'error');
                showModal('Error', 'Failed to reset custom theme', 'error');
            } else {
                LogDev('Custom theme reset successfully', 'system');
                loadCustomThemeSettings();
                showModal('Success', 'Custom theme reset to default!', 'success');
            }
        });
    } catch (err) {
        LogDev('Error resetting custom theme: ' + err, 'error');
        showModal('Error', 'Failed to reset custom theme', 'error');
    }
}

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

function renderThemeSettingsBtn()
{
    LogDev("renderThemeSettingsBtn called", "render");
    getBtnSetting("PodAwful::ShowThemeSettings", show =>
    {
        const btn = document.getElementById('themeSettings');
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
            <button class="podawful-btn" id="themeSettings">Theme Settings</button>
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
    document.getElementById("themeSettings")?.addEventListener("click", () =>
    {
        LogDev("Theme Settings button clicked", "interaction");
        renderThemeSettings();
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
    renderThemeSettingsBtn();
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
        <label><input type="checkbox" id="toggleThemeSettings" /> Theme Settings</label><br>
        <button class="podawful-btn" id="checkForUpdates" style="margin-top: 10px;">Check for Updates</button><br>
        <button class="podawful-btn" id="backBtn">Back</button>
    `;

    // Theme Settings toggle
    const themeSettingsToggle = document.getElementById('toggleThemeSettings');
    if (themeSettingsToggle) {
        // Check if theme settings are enabled
        browser.storage.local.get("PodAwful::ShowThemeSettings")
            .then(result => {
                const enabled = result["PodAwful::ShowThemeSettings"] === true;
                themeSettingsToggle.checked = enabled;
            });
        
        themeSettingsToggle.addEventListener('change', function (e) {
            LogDev("Theme Settings toggle interaction: " + e.target.checked, "interaction");
            setBtnSetting("PodAwful::ShowThemeSettings", e.target.checked, () => {
                renderThemeSettingsBtn();
            });
        });
    }

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


    document.getElementById("checkForUpdates")?.addEventListener("click", async () =>
    {
        LogDev("Check for Updates button clicked", "interaction");
        
        // Show loading state
        const updateBtn = document.getElementById("checkForUpdates");
        const originalText = updateBtn.textContent;
        updateBtn.textContent = "Checking...";
        updateBtn.disabled = true;
        
        try {
            // Send message to background script to check for updates
            const response = await browser.runtime.sendMessage({ action: 'checkForUpdates' });
            
            if (response && response.success) {
                // Check if update is available
                const updateInfo = await browser.storage.local.get(['updateAvailable', 'latestVersion', 'currentVersion']);
                
                if (updateInfo.updateAvailable) {
                    const currentVersion = updateInfo.currentVersion || browser.runtime.getManifest().version;
                    showModal(
                        'Update Available!', 
                        `Version ${updateInfo.latestVersion} is available. You are currently on version ${currentVersion}. Check the extension popup for update details.`, 
                        'success'
                    );
                } else {
                    // Get current version from manifest if not in storage
                    const currentVersion = updateInfo.currentVersion || browser.runtime.getManifest().version;
                    showModal(
                        'Up to Date', 
                        `You are running the latest version (${currentVersion}).`, 
                        'info'
                    );
                }
            } else {
                showModal('Update Check Failed', 'Could not check for updates. Please try again later.', 'error');
            }
        } catch (error) {
            LogDev('Error checking for updates: ' + error.message, 'error');
            showModal('Update Check Failed', 'An error occurred while checking for updates. Please try again later.', 'error');
        } finally {
            // Restore button state
            updateBtn.textContent = originalText;
            updateBtn.disabled = false;
        }
    });

    document.getElementById("backBtn")?.addEventListener("click", () =>
    {
        LogDev("Back to Main Menu from Settings panel", "interaction");
        renderMainMenu();
    });
}

// --- Theme Settings Panel ---
function renderThemeSettings()
{
    LogDev("Navigated to Theme Settings panel", "interaction");
    LogDev("renderThemeSettings called", "render");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Theme Settings";
    
    // Load custom theme settings first, then render the form
    loadCustomThemeSettings().then(() => {
        renderThemeSettingsForm();
    });
}

function renderThemeSettingsForm() {
    const MenuContent = document.getElementById("menuContent");
    if (!MenuContent) return;
    
    MenuContent.innerHTML = `
        <div id="customThemeSettings" style="margin-top: 12px; padding: 12px; border: 1px solid var(--sidebar-border, #333); border-radius: 6px; background: var(--note-bg, #222);">
            <h4 style="margin: 0 0 12px 0; color: var(--accent, #FFD600);">Custom Theme Settings</h4>
            
            <!-- Preset Themes -->
            <div style="margin-bottom: 16px;">
                <label for="presetSelect">Preset:</label>
                <div style="display: flex; gap: 4px; margin-top: 4px;">
                    <select id="presetSelect" style="flex: 1;">
                        <option value="Default">Default</option>
                    </select>
                    <button id="loadPreset" class="podawful-btn" style="padding: 4px 8px; font-size: 12px;" title="Load selected preset">Load</button>
                    <button id="deletePreset" class="podawful-btn" style="padding: 4px 8px; font-size: 12px;" title="Delete selected preset">🗑️</button>
                </div>
            </div>
            
            <!-- Colors Section -->
            <div style="margin-bottom: 20px; padding: 16px; background: #2a2a2a; border-radius: 8px; border: 1px solid #444;">
                <h5 style="margin: 0 0 12px 0; color: var(--accent, #FFD600); font-size: 16px; font-weight: 600;">Colors</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="primaryColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Primary</label>
                        <input type="color" id="primaryColor" value="#FFD600" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="backgroundColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Background</label>
                        <input type="color" id="backgroundColor" value="#1a1a1a" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="surfaceColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Surface</label>
                        <input type="color" id="surfaceColor" value="#222222" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="textColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Text</label>
                        <input type="color" id="textColor" value="#e0e0e0" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="textSecondaryColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Text Secondary</label>
                        <input type="color" id="textSecondaryColor" value="#b0b0b0" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="borderColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Border</label>
                        <input type="color" id="borderColor" value="#333333" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="successColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Success</label>
                        <input type="color" id="successColor" value="#4CAF50" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="warningColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Warning</label>
                        <input type="color" id="warningColor" value="#FF9800" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="errorColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Error</label>
                        <input type="color" id="errorColor" value="#F44336" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="infoColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Info</label>
                        <input type="color" id="infoColor" value="#2196F3" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="highlightColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Highlight</label>
                        <input type="color" id="highlightColor" value="#FFD600" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                </div>
            </div>
            
            <!-- Typography Section -->
            <div style="margin-bottom: 20px; padding: 16px; background: #2a2a2a; border-radius: 8px; border: 1px solid #444;">
                <h5 style="margin: 0 0 12px 0; color: var(--accent, #FFD600); font-size: 16px; font-weight: 600;">Typography</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="fontSize" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Font Size</label>
                        <input type="range" id="fontSize" min="10" max="20" value="14" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="fontSizeValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">14px</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="fontSizeSmall" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Small Text</label>
                        <input type="range" id="fontSizeSmall" min="8" max="16" value="12" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="fontSizeSmallValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">12px</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="fontSizeLarge" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Large Text</label>
                        <input type="range" id="fontSizeLarge" min="14" max="24" value="16" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="fontSizeLargeValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">16px</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="fontWeight" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Font Weight</label>
                        <select id="fontWeight" style="width: 100%; padding: 6px; border: 1px solid #555; border-radius: 4px; background: #333; color: #e0e0e0; font-size: 12px;">
                            <option value="300">Light (300)</option>
                            <option value="400" selected>Normal (400)</option>
                            <option value="500">Medium (500)</option>
                            <option value="600">Semi Bold (600)</option>
                            <option value="700">Bold (700)</option>
                        </select>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="lineHeight" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Line Height</label>
                        <input type="range" id="lineHeight" min="1.0" max="2.0" step="0.1" value="1.4" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="lineHeightValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">1.4</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="fontFamily" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Font Family</label>
                        <select id="fontFamily" style="width: 100%; padding: 6px; border: 1px solid #555; border-radius: 4px; background: #333; color: #e0e0e0; font-size: 12px;">
                            <option value="'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif" selected>System Default</option>
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                            <option value="'Times New Roman', Times, serif">Times New Roman</option>
                            <option value="'Courier New', Courier, monospace">Courier New</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Buttons Section -->
            <div style="margin-bottom: 20px; padding: 16px; background: #2a2a2a; border-radius: 8px; border: 1px solid #444;">
                <h5 style="margin: 0 0 12px 0; color: var(--accent, #FFD600); font-size: 16px; font-weight: 600;">Buttons</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="buttonHeight" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Height</label>
                        <input type="range" id="buttonHeight" min="30" max="60" value="40" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="buttonHeightValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">40px</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="buttonPadding" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Padding</label>
                        <input type="range" id="buttonPadding" min="4" max="20" value="8" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="buttonPaddingValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">8px</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="buttonFontSize" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Font Size</label>
                        <input type="range" id="buttonFontSize" min="10" max="18" value="14" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="buttonFontSizeValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">14px</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="buttonBorderRadius" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Border Radius</label>
                        <input type="range" id="buttonBorderRadius" min="0" max="20" value="6" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="buttonBorderRadiusValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">6px</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="buttonBackgroundColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Background</label>
                        <input type="color" id="buttonBackgroundColor" value="#FFD600" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="buttonTextColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Text Color</label>
                        <input type="color" id="buttonTextColor" value="#000000" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="buttonBorderColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Border Color</label>
                        <input type="color" id="buttonBorderColor" value="#FFD600" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #333; border-radius: 4px; border: 1px solid #555;">
                        <input type="checkbox" id="applyToMenus" style="margin: 0; width: 16px; height: 16px; accent-color: var(--accent, #FFD600);">
                        <label for="applyToMenus" style="margin: 0; font-size: 12px; color: #e0e0e0; font-weight: 500;">Apply to Extension Menus</label>
                    </div>
                </div>
            </div>
            
            <!-- Spacing Section -->
            <div style="margin-bottom: 20px; padding: 16px; background: #2a2a2a; border-radius: 8px; border: 1px solid #444;">
                <h5 style="margin: 0 0 12px 0; color: var(--accent, #FFD600); font-size: 16px; font-weight: 600;">Spacing</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="padding" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Padding</label>
                        <input type="range" id="padding" min="4" max="24" value="12" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="paddingValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">12px</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="margin" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Margin</label>
                        <input type="range" id="margin" min="2" max="20" value="8" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="marginValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">8px</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="borderRadius" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Border Radius</label>
                        <input type="range" id="borderRadius" min="0" max="20" value="6" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="borderRadiusValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">6px</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="gap" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Gap</label>
                        <input type="range" id="gap" min="2" max="20" value="8" style="width: 100%; height: 6px; background: #444; border-radius: 3px; outline: none;">
                        <span id="gapValue" style="color: var(--accent, #FFD600); font-size: 11px; font-weight: 600;">8px</span>
                    </div>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div style="display: flex; gap: 12px; margin-top: 20px; padding: 16px; background: #2a2a2a; border-radius: 8px; border: 1px solid #444;">
                <button id="saveTheme" class="podawful-btn" style="flex: 1; padding: 12px 16px; font-size: 14px; font-weight: 600; background: var(--accent, #FFD600); color: #000; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">Apply</button>
                <button id="saveAsTheme" class="podawful-btn" style="flex: 1; padding: 12px 16px; font-size: 14px; font-weight: 600; background: #333; color: #e0e0e0; border: 1px solid #555; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">Save As</button>
                <button id="resetTheme" class="podawful-btn" style="flex: 1; padding: 12px 16px; font-size: 14px; font-weight: 600; background: #d32f2f; color: #fff; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">Reset</button>
            </div>
            
            <!-- Import/Export Buttons -->
            <div style="display: flex; gap: 12px; margin-top: 12px; padding: 16px; background: #2a2a2a; border-radius: 8px; border: 1px solid #444;">
                <button id="exportTheme" class="podawful-btn" style="flex: 1; padding: 12px 16px; font-size: 14px; font-weight: 600; background: #4CAF50; color: #fff; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">📤 Export Theme</button>
                <button id="importTheme" class="podawful-btn" style="flex: 1; padding: 12px 16px; font-size: 14px; font-weight: 600; background: #2196F3; color: #fff; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">📥 Import Theme</button>
            </div>
        </div>
        <button class="podawful-btn" id="restoreDefaultPresets" style="margin-top: 10px;">Restore Default Presets</button>
        <button class="podawful-btn" id="backBtn">Back</button>
    `;

    // Load presets first
    loadPresets();
    
    // Setup event listeners
    setupCustomThemeEventListeners();

    // Accessibility: Add aria-labels to all menu buttons
    const menuButtons = MenuContent.querySelectorAll('button');
    menuButtons.forEach(btn => {
        if (!btn.hasAttribute('aria-label')) {
            btn.setAttribute('aria-label', btn.textContent.trim());
        }
    });

    // Accessibility: Keyboard navigation for menu
    MenuContent.addEventListener('keydown', (e) => {
        const focusable = Array.from(MenuContent.querySelectorAll('button, select, input'));
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

    document.getElementById("restoreDefaultPresets")?.addEventListener("click", async () =>
    {
        LogDev("Restore Default Presets button clicked", "interaction");
        try {
            // restoreDefaultPresets is now statically imported
            restoreDefaultPresets((err) => {
                if (err) {
                    LogDev('Error restoring default presets: ' + err, 'error');
                    showModal('Error', 'Failed to restore default presets', 'error');
                } else {
                    LogDev('Default presets restored successfully', 'system');
                    showModal('Success', 'Default presets restored! All custom presets have been removed.', 'success');
                }
            });
        } catch (err) {
            LogDev('Error importing restoreDefaultPresets: ' + err, 'error');
            showModal('Error', 'Failed to restore default presets', 'error');
        }
    });

    document.getElementById("backBtn")?.addEventListener("click", () =>
    {
        LogDev("Back to Main Menu from Theme Settings panel", "interaction");
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
        <pre style="max-height:200px;overflow:auto;overflow-x:auto;white-space:pre-wrap;word-wrap:break-word;" id="devlogContent">Loading...</pre>
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

// --- Custom Theme Functions ---

// Save the last selected preset
function saveSelectedPreset(presetName) {
    try {
        browser.storage.local.set({ 'PodAwful::SelectedPreset': presetName });
        LogDev('Saved selected preset: ' + presetName, 'data');
    } catch (err) {
        LogDev('Error saving selected preset: ' + err, 'error');
    }
}

// Load the last selected preset
function loadSelectedPreset(callback) {
    try {
        browser.storage.local.get(['PodAwful::SelectedPreset']).then((result) => {
            const selectedPreset = result['PodAwful::SelectedPreset'] || 'Default';
            LogDev('Loaded selected preset: ' + selectedPreset, 'data');
            callback(selectedPreset);
        });
    } catch (err) {
        LogDev('Error loading selected preset: ' + err, 'error');
        callback('Default');
    }
}

// Apply a preset theme (for loading saved settings - no auto-reload)
function applyPresetTheme(presetName, presets) {
    try {
        const preset = presets.find(p => p.name === presetName);
        if (!preset) {
            LogDev('Preset not found: ' + presetName, 'error');
            return;
        }
        
        LogDev('Loading preset theme: ' + presetName, 'system');
        
        // Update all form fields first (same as change event listener)
        document.getElementById('primaryColor').value = preset.colors.primary;
        document.getElementById('backgroundColor').value = preset.colors.background;
        document.getElementById('surfaceColor').value = preset.colors.surface;
        document.getElementById('textColor').value = preset.colors.text;
        document.getElementById('textSecondaryColor').value = preset.colors.textSecondary;
        document.getElementById('borderColor').value = preset.colors.border;
        document.getElementById('successColor').value = preset.colors.success;
        document.getElementById('warningColor').value = preset.colors.warning;
        document.getElementById('errorColor').value = preset.colors.error;
        document.getElementById('infoColor').value = preset.colors.info;
        document.getElementById('highlightColor').value = preset.colors.highlight;
        
        document.getElementById('fontSize').value = parseInt(preset.typography.fontSize);
        document.getElementById('fontSizeValue').textContent = preset.typography.fontSize;
        document.getElementById('fontSizeSmall').value = parseInt(preset.typography.fontSizeSmall);
        document.getElementById('fontSizeSmallValue').textContent = preset.typography.fontSizeSmall;
        document.getElementById('fontSizeLarge').value = parseInt(preset.typography.fontSizeLarge);
        document.getElementById('fontSizeLargeValue').textContent = preset.typography.fontSizeLarge;
        document.getElementById('fontWeight').value = preset.typography.fontWeight;
        document.getElementById('lineHeight').value = parseFloat(preset.typography.lineHeight);
        document.getElementById('lineHeightValue').textContent = preset.typography.lineHeight;
        document.getElementById('fontFamily').value = preset.typography.fontFamily;
        
        document.getElementById('buttonHeight').value = parseInt(preset.buttons.height);
        document.getElementById('buttonHeightValue').textContent = preset.buttons.height;
        document.getElementById('buttonPadding').value = parseInt(preset.buttons.padding.split(' ')[0]);
        document.getElementById('buttonPaddingValue').textContent = preset.buttons.padding;
        document.getElementById('buttonFontSize').value = parseInt(preset.buttons.fontSize);
        document.getElementById('buttonFontSizeValue').textContent = preset.buttons.fontSize;
        document.getElementById('buttonBorderRadius').value = parseInt(preset.buttons.borderRadius);
        document.getElementById('buttonBorderRadiusValue').textContent = preset.buttons.borderRadius;
        document.getElementById('buttonBackgroundColor').value = preset.buttons.backgroundColor;
        document.getElementById('buttonTextColor').value = preset.buttons.textColor;
        document.getElementById('buttonBorderColor').value = preset.buttons.borderColor;
        document.getElementById('applyToMenus').checked = preset.buttons.applyToMenus || false;
        
        document.getElementById('padding').value = parseInt(preset.spacing.padding);
        document.getElementById('paddingValue').textContent = preset.spacing.padding;
        document.getElementById('margin').value = parseInt(preset.spacing.margin);
        document.getElementById('marginValue').textContent = preset.spacing.margin;
        document.getElementById('borderRadius').value = parseInt(preset.spacing.borderRadius);
        document.getElementById('borderRadiusValue').textContent = preset.spacing.borderRadius;
        document.getElementById('gap').value = parseInt(preset.spacing.gap);
        document.getElementById('gapValue').textContent = preset.spacing.gap;
        
        // Apply the theme silently (without showing the success message or reloading)
        try {
            // Create theme object from form fields (same as applyCustomThemeFunction but without modal/reload)
            const theme = {
                name: 'Custom',
                colors: {
                    primary: document.getElementById('primaryColor').value,
                    background: document.getElementById('backgroundColor').value,
                    surface: document.getElementById('surfaceColor').value,
                    text: document.getElementById('textColor').value,
                    textSecondary: document.getElementById('textSecondaryColor').value,
                    border: document.getElementById('borderColor').value,
                    success: document.getElementById('successColor').value,
                    warning: document.getElementById('warningColor').value,
                    error: document.getElementById('errorColor').value,
                    info: document.getElementById('infoColor').value,
                    highlight: document.getElementById('highlightColor').value
                },
                typography: {
                    fontSize: document.getElementById('fontSize').value + 'px',
                    fontSizeSmall: document.getElementById('fontSizeSmall').value + 'px',
                    fontSizeLarge: document.getElementById('fontSizeLarge').value + 'px',
                    fontWeight: document.getElementById('fontWeight').value,
                    fontWeightBold: '600',
                    lineHeight: document.getElementById('lineHeight').value,
                    fontFamily: document.getElementById('fontFamily').value
                },
                spacing: {
                    padding: document.getElementById('padding').value + 'px',
                    margin: document.getElementById('margin').value + 'px',
                    borderRadius: document.getElementById('borderRadius').value + 'px',
                    gap: document.getElementById('gap').value + 'px'
                },
                buttons: {
                    height: document.getElementById('buttonHeight').value + 'px',
                    padding: document.getElementById('buttonPadding').value + 'px 16px',
                    fontSize: document.getElementById('buttonFontSize').value + 'px',
                    borderRadius: document.getElementById('buttonBorderRadius').value + 'px',
                    backgroundColor: document.getElementById('buttonBackgroundColor').value,
                    textColor: document.getElementById('buttonTextColor').value,
                    borderColor: document.getElementById('buttonBorderColor').value,
                    applyToMenus: document.getElementById('applyToMenus').checked
                }
            };
            
            // Apply the theme silently (no modal, no reload)
            applyCustomTheme(theme);
            
            // Save the theme to storage so sidebar gets notified
            setCustomTheme(theme, (err) => {
                if (err) {
                    LogDev('Error saving theme: ' + err, 'error');
                } else {
                    LogDev('Theme saved successfully: ' + presetName, 'system');
                }
            });
            
            LogDev('Theme applied silently: ' + presetName, 'system');
        } catch (err) {
            LogDev('Error applying theme silently: ' + err, 'error');
        }
        
        LogDev('Preset form fields loaded: ' + presetName, 'system');
    } catch (err) {
        LogDev('Error loading preset theme: ' + err, 'error');
    }
}

async function loadCustomThemeSettings() {
    return new Promise((resolve) => {
        try {
            // getCustomTheme, getPresetThemes, createThemeFromPreset are now statically imported
            
            // Load current custom theme
            getCustomTheme((err, theme) => {
                if (err) {
                    LogDev('Error loading custom theme: ' + err, 'error');
                    resolve();
                    return;
                }
            
            // Populate form fields with validation
            const setValue = (id, value, fallback = '') => {
                const element = document.getElementById(id);
                if (element) {
                    if (value && typeof value === 'string' && value.match(/^#[0-9A-Fa-f]{6}$/)) {
                        element.value = value;
                    } else {
                        element.value = fallback;
                    }
                }
            };
            
            setValue('primaryColor', theme.colors.primary, '#FFD600');
            setValue('backgroundColor', theme.colors.background, '#1a1a1a');
            setValue('surfaceColor', theme.colors.surface, '#222222');
            setValue('textColor', theme.colors.text, '#e0e0e0');
            setValue('textSecondaryColor', theme.colors.textSecondary, '#b0b0b0');
            setValue('borderColor', theme.colors.border, '#333333');
            setValue('successColor', theme.colors.success, '#4CAF50');
            setValue('warningColor', theme.colors.warning, '#FF9800');
            setValue('errorColor', theme.colors.error, '#F44336');
            setValue('infoColor', theme.colors.info, '#2196F3');
            setValue('highlightColor', theme.colors.highlight, '#FFD600');
            
            // Typography fields with validation
            const setTypographyValue = (id, value, textId = null) => {
                const element = document.getElementById(id);
                if (element && value !== undefined && value !== null) {
                    element.value = value;
                    if (textId) {
                        const textElement = document.getElementById(textId);
                        if (textElement) {
                            textElement.textContent = value;
                        }
                    }
                }
            };
            
            setTypographyValue('fontSize', parseInt(theme.typography.fontSize), 'fontSizeValue');
            setTypographyValue('fontSizeSmall', parseInt(theme.typography.fontSizeSmall), 'fontSizeSmallValue');
            setTypographyValue('fontSizeLarge', parseInt(theme.typography.fontSizeLarge), 'fontSizeLargeValue');
            setTypographyValue('fontWeight', theme.typography.fontWeight);
            setTypographyValue('lineHeight', parseFloat(theme.typography.lineHeight), 'lineHeightValue');
            setTypographyValue('fontFamily', theme.typography.fontFamily);
            
            // Button fields with validation
            setTypographyValue('buttonHeight', parseInt(theme.buttons.height), 'buttonHeightValue');
            setTypographyValue('buttonPadding', parseInt(theme.buttons.padding.split(' ')[0]), 'buttonPaddingValue');
            setTypographyValue('buttonFontSize', parseInt(theme.buttons.fontSize), 'buttonFontSizeValue');
            setTypographyValue('buttonBorderRadius', parseInt(theme.buttons.borderRadius), 'buttonBorderRadiusValue');
            setValue('buttonBackgroundColor', theme.buttons.backgroundColor, '#FFD600');
            setValue('buttonTextColor', theme.buttons.textColor, '#000000');
            setValue('buttonBorderColor', theme.buttons.borderColor, '#FFD600');
            
            const applyToMenusElement = document.getElementById('applyToMenus');
            if (applyToMenusElement) {
                applyToMenusElement.checked = theme.buttons.applyToMenus || false;
            }
            
            // Spacing fields with validation
            setTypographyValue('padding', parseInt(theme.spacing.padding), 'paddingValue');
            setTypographyValue('margin', parseInt(theme.spacing.margin), 'marginValue');
            setTypographyValue('borderRadius', parseInt(theme.spacing.borderRadius), 'borderRadiusValue');
            setTypographyValue('gap', parseInt(theme.spacing.gap), 'gapValue');
            
            LogDev('Custom theme settings loaded successfully', 'system');
            
            // Load the last selected preset
            loadSelectedPreset((err, selectedPreset) => {
                if (!err && selectedPreset) {
                    const presetSelect = document.getElementById('presetSelect');
                    if (presetSelect) {
                        presetSelect.value = selectedPreset;
                        LogDev('Loaded last selected preset: ' + selectedPreset, 'data');
                    }
                }
                resolve();
            });
        });
        
    } catch (err) {
        LogDev('Error loading custom theme module: ' + err, 'error');
        resolve();
    }
    });
}

function setupCustomThemeEventListeners() {
    // Preset selection - only save selection, don't load preset
    document.getElementById('presetSelect').addEventListener('change', async (e) => {
        if (!e.target.value) return;
        
        // Save the selected preset
        saveSelectedPreset(e.target.value);
        LogDev('Preset selected: ' + e.target.value, 'system');
    });
    
    // Load preset button - use the separate function
    document.getElementById('loadPreset').addEventListener('click', loadSelectedPresetTheme);
    
    // Color inputs - apply theme when changed with debouncing
    const colorInputs = [
        'primaryColor', 'backgroundColor', 'surfaceColor', 'textColor', 'textSecondaryColor',
        'borderColor', 'successColor', 'warningColor', 'errorColor', 'infoColor', 'highlightColor',
        'buttonBackgroundColor', 'buttonTextColor', 'buttonBorderColor'
    ];
    
    // Debounce function to limit theme application frequency
    let themeUpdateTimeout;
    const debouncedThemeUpdate = () => {
        clearTimeout(themeUpdateTimeout);
        themeUpdateTimeout = setTimeout(() => {
            LogDev('Applying theme after color change', 'system');
            applyCustomThemeFunction();
        }, 300); // 300ms delay for better performance
    };
    
    colorInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            // Use 'change' event for immediate theme application (better performance)
            input.addEventListener('change', () => {
                LogDev('Color input changed: ' + inputId + ' = ' + input.value, 'system');
                applyCustomThemeFunction();
            });
            
            // Use 'input' event only for visual feedback (no theme application)
            input.addEventListener('input', () => {
                // Add a subtle visual indicator that color is being processed
                input.style.opacity = '0.8';
                input.style.transition = 'opacity 0.1s ease';
                
                // Reset opacity after a short delay
                setTimeout(() => {
                    input.style.opacity = '1';
                }, 100);
            });
        }
    });
    
    // Font size sliders
    document.getElementById('fontSize').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('fontSizeValue').textContent = value;
    });
    
    document.getElementById('fontSizeSmall').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('fontSizeSmallValue').textContent = value;
    });
    
    document.getElementById('fontSizeLarge').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('fontSizeLargeValue').textContent = value;
    });
    
    // Line height slider
    document.getElementById('lineHeight').addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('lineHeightValue').textContent = value;
    });
    
    // Button sliders
    document.getElementById('buttonHeight').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('buttonHeightValue').textContent = value;
    });
    
    document.getElementById('buttonPadding').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('buttonPaddingValue').textContent = value;
    });
    
    document.getElementById('buttonFontSize').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('buttonFontSizeValue').textContent = value;
    });
    
    document.getElementById('buttonBorderRadius').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('buttonBorderRadiusValue').textContent = value;
    });
    
    // Spacing sliders
    document.getElementById('padding').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('paddingValue').textContent = value;
    });
    
    document.getElementById('margin').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('marginValue').textContent = value;
    });
    
    document.getElementById('borderRadius').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('borderRadiusValue').textContent = value;
    });
    
    document.getElementById('gap').addEventListener('input', (e) => {
        const value = e.target.value + 'px';
        document.getElementById('gapValue').textContent = value;
    });
    
    // Color inputs - no automatic preview
    ['primaryColor', 'backgroundColor', 'surfaceColor', 'textColor', 'textSecondaryColor', 'borderColor', 'successColor', 'warningColor', 'errorColor', 'infoColor', 'highlightColor', 'buttonBackgroundColor', 'buttonTextColor', 'buttonBorderColor'].forEach(id => {
        // No event listener - user must click Apply to see changes
    });
    
    // Typography changes - no automatic preview
    // No event listeners - user must click Apply to see changes
    
    // Action buttons
    document.getElementById('saveAsTheme').addEventListener('click', saveAsCustomTheme);
    document.getElementById('saveTheme').addEventListener('click', saveAndApplyCustomTheme);
    document.getElementById('resetTheme').addEventListener('click', resetCustomThemeFunction);
    document.getElementById('loadPreset').addEventListener('click', loadSelectedPresetTheme);
    document.getElementById('deletePreset').addEventListener('click', deleteSelectedPreset);
    
    // Import/Export buttons
    document.getElementById('exportTheme').addEventListener('click', exportCurrentTheme);
    document.getElementById('importTheme').addEventListener('click', importThemeFile);
}

// Prevent multiple simultaneous theme applications
let isApplyingTheme = false;

async function applyCustomThemeFunction() {
    if (isApplyingTheme) {
        LogDev('Theme application already in progress, skipping', 'system');
        return;
    }
    
    isApplyingTheme = true;
    
    try {
        // applyCustomTheme is now statically imported
        
        // Helper function to safely get color value with fallback
        const getColorValue = (id, fallback) => {
            const element = document.getElementById(id);
            const value = element ? element.value : fallback;
            return value && value.match(/^#[0-9A-Fa-f]{6}$/) ? value : fallback;
        };
        
        const theme = {
            name: 'Custom',
            colors: {
                primary: getColorValue('primaryColor', '#FFD600'),
                background: getColorValue('backgroundColor', '#1a1a1a'),
                surface: getColorValue('surfaceColor', '#222222'),
                text: getColorValue('textColor', '#e0e0e0'),
                textSecondary: getColorValue('textSecondaryColor', '#b0b0b0'),
                border: getColorValue('borderColor', '#333333'),
                success: getColorValue('successColor', '#4CAF50'),
                warning: getColorValue('warningColor', '#FF9800'),
                error: getColorValue('errorColor', '#F44336'),
                info: getColorValue('infoColor', '#2196F3'),
                highlight: getColorValue('highlightColor', '#FFD600')
            },
            typography: {
                fontSize: document.getElementById('fontSize').value + 'px',
                fontSizeSmall: document.getElementById('fontSizeSmall').value + 'px',
                fontSizeLarge: document.getElementById('fontSizeLarge').value + 'px',
                fontWeight: document.getElementById('fontWeight').value,
                fontWeightBold: '600',
                lineHeight: document.getElementById('lineHeight').value,
                fontFamily: document.getElementById('fontFamily').value
            },
            spacing: {
                padding: document.getElementById('padding').value + 'px',
                margin: document.getElementById('margin').value + 'px',
                borderRadius: document.getElementById('borderRadius').value + 'px',
                gap: document.getElementById('gap').value + 'px'
            },
            buttons: {
                height: document.getElementById('buttonHeight').value + 'px',
                padding: document.getElementById('buttonPadding').value + 'px 16px',
                fontSize: document.getElementById('buttonFontSize').value + 'px',
                borderRadius: document.getElementById('buttonBorderRadius').value + 'px',
                backgroundColor: getColorValue('buttonBackgroundColor', '#FFD600'),
                textColor: getColorValue('buttonTextColor', '#000000'),
                borderColor: getColorValue('buttonBorderColor', '#FFD600'),
                applyToMenus: document.getElementById('applyToMenus') ? document.getElementById('applyToMenus').checked : false
            }
        };
        
        // Apply the theme silently (no modal, no reload)
        LogDev('Applying custom theme to popup', 'system');
        try {
            applyCustomTheme(theme);
        } catch (err) {
            LogDev('Error applying theme: ' + err, 'error');
        }
        
        // Save the theme to storage so sidebar gets notified
        setCustomTheme(theme, (err) => {
            if (err) {
                LogDev('Error saving custom theme: ' + err, 'error');
            } else {
                LogDev('Custom theme applied and saved successfully', 'system');
            }
        });
    } catch (err) {
        LogDev('Error applying custom theme: ' + err, 'error');
        showModal('Error', 'Failed to apply theme', 'error');
    } finally {
        isApplyingTheme = false;
    }
}

async function saveCustomTheme() {
    try {
        // setCustomTheme is now statically imported
        
        const theme = getCurrentThemeFromForm();
        
        setCustomTheme(theme, (err) => {
            if (err) {
                LogDev('Error saving custom theme: ' + err, 'error');
                showModal('Error', 'Failed to save custom theme', 'error');
            } else {
                LogDev('Custom theme saved successfully', 'system');
                showModal('Success', 'Custom theme saved!', 'success');
            }
        });
    } catch (err) {
        LogDev('Error saving custom theme: ' + err, 'error');
        showModal('Error', 'Failed to save custom theme', 'error');
    }
}

// Load all themes (built-in + custom) from JSON files
async function loadPresets() {
    try {
        LogDev('Loading themes from JSON files...', 'system');
        
        // Load all themes using the new theme manager
        const themes = await loadAllThemes();
        
        const presetSelect = document.getElementById('presetSelect');
        if (!presetSelect) return;
        
        // Clear existing options
        presetSelect.innerHTML = '';
        
        // Add themes to dropdown
        themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.name;
            option.textContent = theme.name;
            presetSelect.appendChild(option);
        });
        
        // Set default selection
        presetSelect.value = 'Default';
        
        LogDev(`Themes loaded: ${themes.length}`, 'system');
    } catch (err) {
        LogDev('Error loading themes: ' + err, 'error');
        showModal('Error', 'Failed to load themes', 'error');
    }
}

// Export current theme as JSON file
async function exportCurrentTheme() {
    try {
        LogDev('Exporting current theme...', 'system');
        
        const theme = getCurrentThemeFromForm();
        downloadTheme(theme);
        
        showModal('Success', `Theme "${theme.name}" exported successfully!`, 'success');
    } catch (err) {
        LogDev('Error exporting theme: ' + err, 'error');
        showModal('Error', 'Failed to export theme', 'error');
    }
}

// Import theme from JSON file
async function importThemeFile() {
    try {
        LogDev('Importing theme file...', 'system');
        
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const theme = importTheme(text);
                
                // Load the imported theme into the form
                loadThemeIntoForm(theme);
                
                // Apply the theme
                applyCustomTheme(theme);
                
                showModal('Success', `Theme "${theme.name}" imported successfully!`, 'success');
            } catch (err) {
                LogDev('Error importing theme: ' + err, 'error');
                showModal('Error', 'Invalid theme file: ' + err.message, 'error');
            }
            
            // Clean up
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    } catch (err) {
        LogDev('Error setting up theme import: ' + err, 'error');
        showModal('Error', 'Failed to import theme', 'error');
    }
}

// Load theme into form fields
function loadThemeIntoForm(theme) {
    try {
        LogDev('Loading theme into form: ' + theme.name, 'system');
        
        // Helper function to set value safely
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        };
        
        // Set color values
        setValue('primaryColor', theme.colors.primary);
        setValue('backgroundColor', theme.colors.background);
        setValue('surfaceColor', theme.colors.surface);
        setValue('textColor', theme.colors.text);
        setValue('textSecondaryColor', theme.colors.textSecondary);
        setValue('borderColor', theme.colors.border);
        setValue('successColor', theme.colors.success);
        setValue('warningColor', theme.colors.warning);
        setValue('errorColor', theme.colors.error);
        setValue('infoColor', theme.colors.info);
        setValue('highlightColor', theme.colors.highlight);
        
        // Set typography values
        setValue('fontSize', parseInt(theme.typography.fontSize));
        setValue('fontSizeSmall', parseInt(theme.typography.fontSizeSmall));
        setValue('fontSizeLarge', parseInt(theme.typography.fontSizeLarge));
        setValue('fontWeight', theme.typography.fontWeight);
        setValue('lineHeight', parseFloat(theme.typography.lineHeight));
        setValue('fontFamily', theme.typography.fontFamily);
        
        // Set button values
        setValue('buttonHeight', parseInt(theme.buttons.height));
        setValue('buttonPadding', parseInt(theme.buttons.padding.split(' ')[0]));
        setValue('buttonFontSize', parseInt(theme.buttons.fontSize));
        setValue('buttonBorderRadius', parseInt(theme.buttons.borderRadius));
        setValue('buttonBackgroundColor', theme.buttons.backgroundColor);
        setValue('buttonTextColor', theme.buttons.textColor);
        setValue('buttonBorderColor', theme.buttons.borderColor);
        
        // Set spacing values
        setValue('padding', parseInt(theme.spacing.padding));
        setValue('margin', parseInt(theme.spacing.margin));
        setValue('borderRadius', parseInt(theme.spacing.borderRadius));
        setValue('gap', parseInt(theme.spacing.gap));
        
        // Set apply to menus checkbox
        const applyToMenusElement = document.getElementById('applyToMenus');
        if (applyToMenusElement) {
            applyToMenusElement.checked = theme.buttons.applyToMenus || false;
        }
        
        // Update display values
        updateDisplayValues();
        
        LogDev('Theme loaded into form successfully', 'system');
    } catch (err) {
        LogDev('Error loading theme into form: ' + err, 'error');
        throw err;
    }
}

// Update display values for sliders
function updateDisplayValues() {
    const updateValue = (id, valueId) => {
        const element = document.getElementById(id);
        const valueElement = document.getElementById(valueId);
        if (element && valueElement) {
            valueElement.textContent = element.value + (id.includes('Size') || id.includes('Height') || id.includes('Padding') || id.includes('Radius') || id.includes('Gap') ? 'px' : '');
        }
    };
    
    updateValue('fontSize', 'fontSizeValue');
    updateValue('fontSizeSmall', 'fontSizeSmallValue');
    updateValue('fontSizeLarge', 'fontSizeLargeValue');
    updateValue('lineHeight', 'lineHeightValue');
    updateValue('buttonHeight', 'buttonHeightValue');
    updateValue('buttonPadding', 'buttonPaddingValue');
    updateValue('buttonFontSize', 'buttonFontSizeValue');
    updateValue('buttonBorderRadius', 'buttonBorderRadiusValue');
    updateValue('padding', 'paddingValue');
    updateValue('margin', 'marginValue');
    updateValue('borderRadius', 'borderRadiusValue');
    updateValue('gap', 'gapValue');
}

// Get current theme from form
function getCurrentThemeFromForm() {
    // Helper function to safely get element value with fallback
    const getValue = (id, fallback = '') => {
        const element = document.getElementById(id);
        return element ? element.value || fallback : fallback;
    };

    return {
        name: 'Custom',
        colors: {
            primary: getValue('primaryColor', '#FFD600'),
            background: getValue('backgroundColor', '#1a1a1a'),
            surface: getValue('surfaceColor', '#222222'),
            text: getValue('textColor', '#e0e0e0'),
            textSecondary: getValue('textSecondaryColor', '#b0b0b0'),
            border: getValue('borderColor', '#333333'),
            success: getValue('successColor', '#4CAF50'),
            warning: getValue('warningColor', '#FF9800'),
            error: getValue('errorColor', '#F44336'),
            info: getValue('infoColor', '#2196F3'),
            highlight: getValue('highlightColor', '#FFD600')
        },
        typography: {
            fontSize: getValue('fontSize', '14') + 'px',
            fontSizeSmall: getValue('fontSizeSmall', '12') + 'px',
            fontSizeLarge: getValue('fontSizeLarge', '16') + 'px',
            fontWeight: getValue('fontWeight', '400'),
            fontWeightBold: '600',
            lineHeight: getValue('lineHeight', '1.4'),
            fontFamily: getValue('fontFamily', 'system-ui, -apple-system, sans-serif')
        },
        spacing: {
            padding: getValue('padding', '12') + 'px',
            margin: getValue('margin', '8') + 'px',
            borderRadius: getValue('borderRadius', '6') + 'px',
            gap: getValue('gap', '8') + 'px'
        },
        buttons: {
            height: getValue('buttonHeight', '40') + 'px',
            padding: getValue('buttonPadding', '8') + 'px 16px',
            fontSize: getValue('buttonFontSize', '14') + 'px',
            borderRadius: getValue('buttonBorderRadius', '6') + 'px',
            backgroundColor: getValue('buttonBackgroundColor', '#FFD600'),
            textColor: getValue('buttonTextColor', '#000000'),
            borderColor: getValue('buttonBorderColor', '#FFD600'),
            applyToMenus: document.getElementById('applyToMenus') ? document.getElementById('applyToMenus').checked : false
        }
    };
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