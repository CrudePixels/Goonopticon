import { LogDev } from '../../log.js';
import { renderMainMenu } from './popup-main-menu.js';
import { 
    loadAllThemes, 
    loadThemeFromFile, 
    saveCustomThemeToStorage, 
    deleteCustomTheme, 
    exportTheme, 
    importTheme, 
    downloadTheme 
} from '../../themeManager.js';
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
} from '../../customTheme.js';
import browser from 'webextension-polyfill';

/**
 * Renders the theme settings panel
 */
export function renderThemeSettings() {
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
                    <!-- Left Column -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="primaryColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Primary</label>
                            <input type="color" id="primaryColor" value="#FFD600" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="surfaceColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Surface</label>
                            <input type="color" id="surfaceColor" value="#222222" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="textSecondaryColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Text Secondary</label>
                            <input type="color" id="textSecondaryColor" value="#b0b0b0" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="successColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Success</label>
                            <input type="color" id="successColor" value="#4CAF50" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="errorColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Error</label>
                            <input type="color" id="errorColor" value="#F44336" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="highlightColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Highlight</label>
                            <input type="color" id="highlightColor" value="#FFD600" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                    </div>
                    
                    <!-- Right Column -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="backgroundColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Background</label>
                            <input type="color" id="backgroundColor" value="#1a1a1a" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="textColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Text</label>
                            <input type="color" id="textColor" value="#e0e0e0" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="borderColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Border</label>
                            <input type="color" id="borderColor" value="#333333" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="warningColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Warning</label>
                            <input type="color" id="warningColor" value="#FF9800" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label for="infoColor" style="color: #e0e0e0; font-size: 12px; font-weight: 500;">Info</label>
                            <input type="color" id="infoColor" value="#2196F3" style="width: 100%; height: 36px; border: 1px solid #555; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button id="saveTheme" class="podawful-btn" style="flex: 1; padding: 12px 16px; font-size: 14px; font-weight: 600; background: var(--accent, #FFD600); color: #000; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">Apply</button>
                <button id="resetTheme" class="podawful-btn" style="padding: 12px 16px; font-size: 14px; font-weight: 600; background: #666; color: #fff; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">Reset</button>
            </div>
            
            <!-- Back Button -->
            <div style="margin-top: 16px;">
                <button id="backBtn" class="podawful-btn" style="width: 100%; padding: 12px 16px; font-size: 14px; font-weight: 600; background: #444; color: #fff; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">Back</button>
            </div>
        </div>
    `;

    // Setup event listeners
    setupCustomThemeEventListeners();
}

// Setup event listeners for theme settings
function setupCustomThemeEventListeners() {
    // Back button
    document.getElementById("backBtn")?.addEventListener("click", () => {
        LogDev("Back to Main Menu from Theme Settings panel", "interaction");
        renderMainMenu();
    });

    // Load preset button
    document.getElementById('loadPreset')?.addEventListener('click', loadSelectedPresetTheme);
    
    // Delete preset button
    document.getElementById('deletePreset')?.addEventListener('click', deleteSelectedPreset);
    
    // Apply theme button
    document.getElementById('saveTheme')?.addEventListener('click', saveAndApplyCustomTheme);
    
    // Reset theme button
    document.getElementById('resetTheme')?.addEventListener('click', resetCustomThemeFunction);
    
    // Color input changes
    const colorInputs = [
        'primaryColor', 'backgroundColor', 'surfaceColor', 'textColor', 'textSecondaryColor',
        'borderColor', 'successColor', 'warningColor', 'errorColor', 'infoColor', 'highlightColor'
    ];
    
    colorInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', applyCustomThemeFunction);
        }
    });
}

// Load custom theme settings
async function loadCustomThemeSettings() {
    return new Promise((resolve) => {
        try {
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

// Load selected preset
function loadSelectedPreset(callback) {
    browser.storage.local.get(['PodAwful::SelectedPreset'], (result) => {
        if (browser.runtime.lastError) {
            LogDev('Error loading selected preset: ' + browser.runtime.lastError, 'error');
            callback(browser.runtime.lastError);
        } else {
            const selectedPreset = result['PodAwful::SelectedPreset'] || 'Default';
            LogDev('Loaded selected preset: ' + selectedPreset, 'data');
            callback(null, selectedPreset);
        }
    });
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
function deleteSelectedPreset() {
    const presetSelect = document.getElementById('presetSelect');
    const selectedPresetName = presetSelect.value;
    
    if (!selectedPresetName) {
        showModal('Error', 'Please select a preset to delete', 'error');
        return;
    }
    
    // Prevent deleting core presets
    const corePresets = ['Default', 'Light', 'Dark'];
    if (corePresets.includes(selectedPresetName)) {
        showModal('Error', 'Cannot delete core presets', 'error');
        return;
    }
    
    showConfirmModal('Delete Preset', `Are you sure you want to delete the "${selectedPresetName}" preset?`, () => {
        deletePreset(selectedPresetName, (err) => {
            if (err) {
                LogDev('Error deleting preset: ' + err, 'error');
                showModal('Error', 'Failed to delete preset', 'error');
            } else {
                LogDev('Preset deleted successfully: ' + selectedPresetName, 'system');
                showModal('Success', `Preset "${selectedPresetName}" deleted!`, 'success');
                
                // Reload presets
                loadPresets();
            }
        });
    });
}

// Save and apply custom theme
function saveAndApplyCustomTheme() {
    try {
        const theme = getCurrentThemeFromForm();
        LogDev('Saving custom theme: ' + JSON.stringify(theme), 'system');
        
        setCustomTheme(theme, (err) => {
            if (err) {
                LogDev('Error saving custom theme: ' + err, 'error');
                showModal('Error', 'Failed to save custom theme', 'error');
            } else {
                LogDev('Custom theme saved successfully', 'system');
                showModal('Success', 'Custom theme applied!', 'success');
            }
        });
    } catch (err) {
        LogDev('Error in saveAndApplyCustomTheme: ' + err, 'error');
        showModal('Error', 'Failed to save custom theme', 'error');
    }
}

// Reset custom theme
function resetCustomThemeFunction() {
    showConfirmModal('Reset Theme', 'Are you sure you want to reset the custom theme to default?', () => {
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
    });
}

// Apply custom theme function
function applyCustomThemeFunction() {
    if (isApplyingTheme) return;
    
    isApplyingTheme = true;
    
    try {
        const theme = getCurrentThemeFromForm();
        LogDev('Applying custom theme function: ' + JSON.stringify(theme), 'system');
        applyCustomTheme(theme);
    } catch (err) {
        LogDev('Error in applyCustomThemeFunction: ' + err, 'error');
    } finally {
        setTimeout(() => {
            isApplyingTheme = false;
        }, 100);
    }
}

// Get current theme from form
function getCurrentThemeFromForm() {
    return {
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
            fontSize: '14px',
            fontSizeSmall: '12px',
            fontSizeLarge: '16px',
            fontWeight: '400',
            lineHeight: '1.4',
            fontFamily: 'inherit'
        },
        spacing: {
            padding: '8px',
            margin: '8px',
            borderRadius: '6px',
            gap: '8px'
        },
        buttons: {
            height: '40px',
            padding: '8px 16px',
            fontSize: '14px',
            borderRadius: '6px',
            backgroundColor: document.getElementById('primaryColor').value,
            textColor: document.getElementById('textColor').value,
            borderColor: document.getElementById('primaryColor').value,
            applyToMenus: true
        }
    };
}

// Load presets
function loadPresets() {
    loadAllThemes().then(themes => {
        const presetSelect = document.getElementById('presetSelect');
        if (presetSelect) {
            presetSelect.innerHTML = '';
            themes.forEach(theme => {
                const option = document.createElement('option');
                option.value = theme.name;
                option.textContent = theme.name;
                presetSelect.appendChild(option);
            });
        }
    }).catch(err => {
        LogDev('Error loading presets: ' + err, 'error');
    });
}

// Prevent multiple simultaneous theme applications
let isApplyingTheme = false;

// Simple modal functions
function showModal(title, message, type = 'info') {
    // Implementation would go here - keeping it simple for now
    alert(`${title}: ${message}`);
}

function showConfirmModal(title, message, callback) {
    if (confirm(`${title}: ${message}`)) {
        callback();
    }
}
