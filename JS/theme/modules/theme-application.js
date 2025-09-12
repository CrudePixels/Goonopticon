import { LogDev } from '../../log.js';
import { DEFAULT_CUSTOM_THEME, THEME_CLASSES } from './theme-definitions.js';

/**
 * Theme Application Module
 * Handles applying themes to DOM elements via CSS variables
 */

/**
 * Applies a custom theme to the DOM
 * @param {Object} theme - Theme object to apply
 */
export function applyCustomTheme(theme) {
    LogDev('applyCustomTheme called', 'render');
    
    if (!theme) {
        LogDev('No theme provided, using default', 'warning');
        theme = DEFAULT_CUSTOM_THEME;
    }

    // Merge with default theme to ensure all properties exist
    const mergedTheme = {
        ...DEFAULT_CUSTOM_THEME,
        ...theme,
        colors: { ...DEFAULT_CUSTOM_THEME.colors, ...(theme.colors || {}) },
        typography: { ...DEFAULT_CUSTOM_THEME.typography, ...(theme.typography || {}) },
        spacing: { ...DEFAULT_CUSTOM_THEME.spacing, ...(theme.spacing || {}) },
        buttons: { ...DEFAULT_CUSTOM_THEME.buttons, ...(theme.buttons || {}) }
    };
    
    LogDev('Merged theme:', 'data', mergedTheme);

    // Apply to root element
    applyThemeToElement(document.documentElement, mergedTheme);
    
    // Apply to body
    applyThemeToElement(document.body, mergedTheme);
    
    // Apply to sidebar if it exists
    const sidebar = document.getElementById('podawful-sidebar');
    if (sidebar) {
        applyThemeToElement(sidebar, mergedTheme);
    }
    
    // Add theme classes
    addThemeClasses(mergedTheme);
    
    // Add apply-to-menus class if enabled
    if (mergedTheme.buttons.applyToMenus) {
        document.body.classList.add('apply-to-menus');
        document.documentElement.classList.add('apply-to-menus');
        const sidebar = document.getElementById('podawful-sidebar');
        if (sidebar) {
            sidebar.classList.add('apply-to-menus');
        }
        LogDev('Added apply-to-menus class', 'system');
    } else {
        document.body.classList.remove('apply-to-menus');
        document.documentElement.classList.remove('apply-to-menus');
        const sidebar = document.getElementById('podawful-sidebar');
        if (sidebar) {
            sidebar.classList.remove('apply-to-menus');
        }
        LogDev('Removed apply-to-menus class', 'system');
    }
}

/**
 * Applies theme to a specific element
 * @param {HTMLElement} element - Element to apply theme to
 * @param {Object} theme - Theme object
 */
function applyThemeToElement(element, theme) {
    if (!element) return;
    
    LogDev(`Applying theme to element: ${element.id || element.tagName}`, 'system');
    
    // Apply colors
    Object.entries(theme.colors).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.match(/^#[0-9A-Fa-f]{6}$/)) {
            element.style.setProperty(`--custom-${key}`, value);
        } else {
            const fallbackColors = {
                primary: '#FFD600',
                background: '#1a1a1a',
                surface: '#222222',
                text: '#e0e0e0',
                textSecondary: '#b0b0b0',
                border: '#333333',
                success: '#4CAF50',
                warning: '#FF9800',
                error: '#F44336',
                info: '#2196F3',
                highlight: '#FFD600'
            };
            const fallbackValue = fallbackColors[key] || '#FFD600';
            element.style.setProperty(`--custom-${key}`, fallbackValue);
        }
    });
    
    // Apply typography
    Object.entries(theme.typography).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            element.style.setProperty(`--custom-${key}`, value);
        }
    });
    
    // Apply spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            element.style.setProperty(`--custom-${key}`, value);
        }
    });
    
    // Apply buttons
    Object.entries(theme.buttons).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            element.style.setProperty(`--custom-${key}`, value);
        }
    });
    
    // Set backward compatibility variables
    setBackwardCompatibilityVariables(element, theme);
}

/**
 * Sets backward compatibility CSS variables
 * @param {HTMLElement} element - Element to set variables on
 * @param {Object} theme - Theme object
 */
function setBackwardCompatibilityVariables(element, theme) {
    // Set old --accent variable
    const primaryColor = theme.colors.primary;
    if (primaryColor && typeof primaryColor === 'string' && primaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
        element.style.setProperty('--accent', primaryColor);
    } else {
        element.style.setProperty('--accent', '#FFD600');
    }
    
    // Set old button variables
    if (theme.buttons.backgroundColor) {
        element.style.setProperty('--button-bg', theme.buttons.backgroundColor);
        element.style.setProperty('--custom-buttonBackgroundColor', theme.buttons.backgroundColor);
        element.style.setProperty('--button-background-color', theme.buttons.backgroundColor);
    }
    
    if (theme.buttons.textColor) {
        element.style.setProperty('--button-fg', theme.buttons.textColor);
        element.style.setProperty('--custom-buttonTextColor', theme.buttons.textColor);
        element.style.setProperty('--button-text-color', theme.buttons.textColor);
    }
    
    if (theme.buttons.borderColor) {
        element.style.setProperty('--button-border', theme.buttons.borderColor);
        element.style.setProperty('--custom-buttonBorderColor', theme.buttons.borderColor);
        element.style.setProperty('--button-border-color', theme.buttons.borderColor);
    }
}

/**
 * Adds theme classes to elements
 * @param {Object} theme - Theme object
 */
function addThemeClasses(theme) {
    // Add custom theme class to body and html
    document.body.classList.add('custom-theme');
    document.documentElement.classList.add('custom-theme');
    
    // Add custom theme class to sidebar if it exists
    const sidebar = document.getElementById('podawful-sidebar');
    if (sidebar) {
        sidebar.classList.add('custom-theme');
        LogDev('Added custom-theme class to sidebar', 'system');
    }
}

/**
 * Updates theme class on elements
 * @param {string} themeClass - The theme class to apply
 * @param {HTMLElement[]} extraElements - Additional elements to apply the theme to
 */
export function updateThemeClass(themeClass, extraElements = []) {
    function updateElement(el) {
        if (!el) return;
        el.classList.remove(...THEME_CLASSES);
        el.classList.add(themeClass);
        LogDev("Theme class applied to element: " + (el.id || el.tagName), "render");
    }

    try {
        updateElement(document.body);
        updateElement(document.getElementById('podawful-sidebar'));
        extraElements.forEach(updateElement);
        LogDev("Theme applied successfully: " + themeClass, "render");
    } catch (err) {
        LogDev("Theme error: " + err, "error");
    }
}
