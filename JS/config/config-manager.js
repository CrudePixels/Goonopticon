import { LogDev } from '../log.js';
import { getStorage, setStorage } from '../storage/storage-modern.js';

/**
 * Configuration Manager
 * Centralized configuration management for the extension
 */
export class ConfigManager {
    constructor() {
        this.config = new Map();
        this.defaults = new Map();
        this.watchers = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize configuration with defaults
     * @param {Object} defaultConfig - Default configuration values
     */
    async initialize(defaultConfig = {}) {
        if (this.isInitialized) return;

        // Set defaults
        Object.entries(defaultConfig).forEach(([key, value]) => {
            this.defaults.set(key, value);
        });

        // Load configuration from storage
        await this.loadFromStorage();

        this.isInitialized = true;
        LogDev('Configuration manager initialized', 'system');
    }

    /**
     * Get a configuration value
     * @param {string} key - Configuration key
     * @param {*} defaultValue - Default value if key not found
     * @returns {*} Configuration value
     */
    get(key, defaultValue = null) {
        if (this.config.has(key)) {
            return this.config.get(key);
        }
        
        if (this.defaults.has(key)) {
            return this.defaults.get(key);
        }
        
        return defaultValue;
    }

    /**
     * Set a configuration value
     * @param {string} key - Configuration key
     * @param {*} value - Configuration value
     * @param {Object} options - Set options
     */
    async set(key, value, options = {}) {
        const {
            persist = true,
            notify = true,
            validate = true
        } = options;

        // Validate value if validator exists
        if (validate && this.validators.has(key)) {
            const validator = this.validators.get(key);
            if (!validator(value)) {
                throw new Error(`Invalid value for configuration key: ${key}`);
            }
        }

        const oldValue = this.config.get(key);
        this.config.set(key, value);

        // Persist to storage
        if (persist) {
            await this.saveToStorage();
        }

        // Notify watchers
        if (notify) {
            this.notifyWatchers(key, value, oldValue);
        }

        LogDev(`Configuration updated: ${key} = ${value}`, 'data');
    }

    /**
     * Set multiple configuration values
     * @param {Object} config - Configuration object
     * @param {Object} options - Set options
     */
    async setMultiple(config, options = {}) {
        const {
            persist = true,
            notify = true
        } = options;

        const changes = new Map();

        // Update all values
        Object.entries(config).forEach(([key, value]) => {
            const oldValue = this.config.get(key);
            this.config.set(key, value);
            changes.set(key, { oldValue, newValue: value });
        });

        // Persist to storage
        if (persist) {
            await this.saveToStorage();
        }

        // Notify watchers
        if (notify) {
            changes.forEach((change, key) => {
                this.notifyWatchers(key, change.newValue, change.oldValue);
            });
        }

        LogDev(`Multiple configurations updated: ${Object.keys(config).join(', ')}`, 'data');
    }

    /**
     * Watch for configuration changes
     * @param {string} key - Configuration key to watch
     * @param {Function} callback - Change callback
     * @returns {Function} Unwatch function
     */
    watch(key, callback) {
        if (!this.watchers.has(key)) {
            this.watchers.set(key, new Set());
        }

        this.watchers.get(key).add(callback);

        LogDev(`Configuration watcher added for: ${key}`, 'system');

        // Return unwatch function
        return () => {
            const watchers = this.watchers.get(key);
            if (watchers) {
                watchers.delete(callback);
                if (watchers.size === 0) {
                    this.watchers.delete(key);
                }
            }
        };
    }

    /**
     * Watch for any configuration changes
     * @param {Function} callback - Change callback
     * @returns {Function} Unwatch function
     */
    watchAll(callback) {
        if (!this.watchers.has('*')) {
            this.watchers.set('*', new Set());
        }

        this.watchers.get('*').add(callback);

        LogDev('Global configuration watcher added', 'system');

        return () => {
            const watchers = this.watchers.get('*');
            if (watchers) {
                watchers.delete(callback);
                if (watchers.size === 0) {
                    this.watchers.delete('*');
                }
            }
        };
    }

    /**
     * Notify watchers of configuration changes
     * @param {string} key - Configuration key
     * @param {*} newValue - New value
     * @param {*} oldValue - Old value
     */
    notifyWatchers(key, newValue, oldValue) {
        // Notify specific key watchers
        const keyWatchers = this.watchers.get(key);
        if (keyWatchers) {
            keyWatchers.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    LogDev(`Error in configuration watcher for ${key}: ${error.message}`, 'error');
                }
            });
        }

        // Notify global watchers
        const globalWatchers = this.watchers.get('*');
        if (globalWatchers) {
            globalWatchers.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    LogDev(`Error in global configuration watcher: ${error.message}`, 'error');
                }
            });
        }
    }

    /**
     * Load configuration from storage
     */
    async loadFromStorage() {
        try {
            const storedConfig = await getStorage('PodAwful::Config', {});
            
            Object.entries(storedConfig).forEach(([key, value]) => {
                this.config.set(key, value);
            });

            LogDev('Configuration loaded from storage', 'data');
        } catch (error) {
            LogDev(`Error loading configuration from storage: ${error.message}`, 'error');
        }
    }

    /**
     * Save configuration to storage
     */
    async saveToStorage() {
        try {
            const configObject = Object.fromEntries(this.config);
            await setStorage({ 'PodAwful::Config': configObject });
            LogDev('Configuration saved to storage', 'data');
        } catch (error) {
            LogDev(`Error saving configuration to storage: ${error.message}`, 'error');
        }
    }

    /**
     * Reset configuration to defaults
     * @param {string[]} keys - Keys to reset (optional, resets all if not provided)
     */
    async reset(keys = null) {
        const keysToReset = keys || Array.from(this.config.keys());

        keysToReset.forEach(key => {
            if (this.defaults.has(key)) {
                const oldValue = this.config.get(key);
                const newValue = this.defaults.get(key);
                this.config.set(key, newValue);
                this.notifyWatchers(key, newValue, oldValue);
            }
        });

        await this.saveToStorage();
        LogDev(`Configuration reset for keys: ${keysToReset.join(', ')}`, 'system');
    }

    /**
     * Get all configuration values
     * @returns {Object} All configuration values
     */
    getAll() {
        return Object.fromEntries(this.config);
    }

    /**
     * Check if configuration key exists
     * @param {string} key - Configuration key
     * @returns {boolean} True if key exists
     */
    has(key) {
        return this.config.has(key) || this.defaults.has(key);
    }

    /**
     * Delete a configuration key
     * @param {string} key - Configuration key to delete
     */
    async delete(key) {
        const oldValue = this.config.get(key);
        this.config.delete(key);
        
        await this.saveToStorage();
        this.notifyWatchers(key, undefined, oldValue);
        
        LogDev(`Configuration deleted: ${key}`, 'system');
    }

    /**
     * Clear all configuration
     */
    async clear() {
        this.config.clear();
        await this.saveToStorage();
        LogDev('All configuration cleared', 'system');
    }

    /**
     * Add a validator for a configuration key
     * @param {string} key - Configuration key
     * @param {Function} validator - Validator function
     */
    addValidator(key, validator) {
        if (!this.validators) {
            this.validators = new Map();
        }
        this.validators.set(key, validator);
    }

    /**
     * Get configuration schema
     * @returns {Object} Configuration schema
     */
    getSchema() {
        return {
            defaults: Object.fromEntries(this.defaults),
            validators: this.validators ? Object.fromEntries(this.validators) : {},
            watchers: Object.fromEntries(
                Array.from(this.watchers.entries()).map(([key, watchers]) => [
                    key,
                    watchers.size
                ])
            )
        };
    }
}

// Create global instance
export const configManager = new ConfigManager();

// Default configuration
export const DEFAULT_CONFIG = {
    // UI Settings
    sidebarVisible: false,
    compactMode: false,
    showDevLogBtn: false,
    showChangelogBtn: false,
    showHotkeysBtn: false,
    enableBulkActions: false,
    
    // Theme Settings
    theme: 'default',
    customTheme: null,
    
    // Feature Flags
    enableDragDrop: true,
    enableKeyboardShortcuts: true,
    enableAutoSave: true,
    enableNotifications: true,
    
    // Performance Settings
    maxNotesPerPage: 1000,
    debounceDelay: 300,
    cacheSize: 100,
    
    // Debug Settings
    debugMode: false,
    logLevel: 'info',
    enablePerformanceMonitoring: false
};

// Initialize with defaults
configManager.initialize(DEFAULT_CONFIG);

// Export convenience functions
export const getConfig = (key, defaultValue) => configManager.get(key, defaultValue);
export const setConfig = (key, value, options) => configManager.set(key, value, options);
export const watchConfig = (key, callback) => configManager.watch(key, callback);
export const watchAllConfig = (callback) => configManager.watchAll(callback);
