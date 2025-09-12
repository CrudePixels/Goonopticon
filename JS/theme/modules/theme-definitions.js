/**
 * Theme Definitions Module
 * Contains all theme data structures and default values
 */

export const DEFAULT_CUSTOM_THEME = {
    colors: {
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
        backgroundColor: '#FFD600',
        textColor: '#000000',
        borderColor: '#FFD600',
        applyToMenus: true
    }
};

export const BUILT_IN_THEMES = [
    'default.json',
    'light.json', 
    'dark.json',
    'red-mode.json',
    'polycule-blue.json',
    'paycell-green.json'
];

export const THEME_CLASSES = [
    "default-theme", 
    "dark-theme", 
    "light-theme", 
    "custom-theme"
];

export const STORAGE_KEYS = {
    THEME: 'PodAwful::Theme',
    CUSTOM_THEME: 'PodAwful::CustomTheme',
    SELECTED_PRESET: 'PodAwful::SelectedPreset'
};
