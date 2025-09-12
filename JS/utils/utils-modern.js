import { LogDev } from '../log.js';
import browser from 'webextension-polyfill';

/**
 * Modern Utility Functions
 * Cleaned up and organized utility functions
 */

/**
 * URL Utilities
 */
export const urlUtils = {
    /**
     * Normalizes a YouTube URL by removing timestamp parameters
     * @param {string} url - The YouTube URL to normalize
     * @returns {string} - The normalized URL without timestamp parameters
     */
    normalizeYouTubeUrl(url) {
        if (!url || typeof url !== 'string') return url;
        
        try {
            const urlObj = new URL(url);
            
            // Only normalize YouTube URLs
            if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
                return url;
            }
            
            // Remove timestamp parameters
            urlObj.searchParams.delete('t');
            urlObj.searchParams.delete('start');
            urlObj.searchParams.delete('time_continue');
            
            return urlObj.toString();
        } catch (error) {
            LogDev("Error normalizing URL: " + error, "error");
            return url;
        }
    },

    /**
     * Check if URL is a YouTube video
     * @param {string} url - URL to check
     * @returns {boolean} True if YouTube video
     */
    isYouTubeUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
        } catch {
            return false;
        }
    },

    /**
     * Extract video ID from YouTube URL
     * @param {string} url - YouTube URL
     * @returns {string|null} Video ID or null
     */
    extractVideoId(url) {
        if (!this.isYouTubeUrl(url)) return null;
        
        try {
            const urlObj = new URL(url);
            
            if (urlObj.hostname.includes('youtu.be')) {
                return urlObj.pathname.slice(1);
            } else if (urlObj.hostname.includes('youtube.com')) {
                return urlObj.searchParams.get('v');
            }
        } catch {
            // Ignore errors
        }
        
        return null;
    }
};

/**
 * Time Utilities
 */
export const timeUtils = {
    /**
     * Parse timestamp string to seconds
     * @param {string} timestamp - Timestamp string (MM:SS or HH:MM:SS)
     * @returns {number} Seconds
     */
    parseTimestamp(timestamp) {
        if (!timestamp || typeof timestamp !== 'string') return 0;
        
        const parts = timestamp.split(':').map(Number);
        
        if (parts.length === 2) {
            // MM:SS format
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            // HH:MM:SS format
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        
        return 0;
    },

    /**
     * Format seconds to timestamp string
     * @param {number} seconds - Seconds
     * @param {boolean} includeHours - Include hours in output
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(seconds, includeHours = false) {
        if (typeof seconds !== 'number' || seconds < 0) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (includeHours || hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    },

    /**
     * Check if two timestamps are close
     * @param {string} timestamp1 - First timestamp
     * @param {string} timestamp2 - Second timestamp
     * @param {number} threshold - Threshold in seconds
     * @returns {boolean} True if close
     */
    isTimeClose(timestamp1, timestamp2, threshold = 5) {
        const time1 = this.parseTimestamp(timestamp1);
        const time2 = this.parseTimestamp(timestamp2);
        return Math.abs(time1 - time2) <= threshold;
    }
};

/**
 * DOM Utilities
 */
export const domUtils = {
    /**
     * Create element with attributes and content
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string|HTMLElement} content - Element content
     * @returns {HTMLElement} Created element
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        }
        
        return element;
    },

    /**
     * Add event listener with automatic cleanup
     * @param {HTMLElement} element - Element to bind to
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     * @returns {Function} Cleanup function
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element) return () => {};
        
        element.addEventListener(event, handler, options);
        
        return () => {
            element.removeEventListener(event, handler, options);
        };
    },

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, delay) {
        let timeoutId;
        
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, delay) {
        let lastCall = 0;
        
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }
};

/**
 * Storage Utilities
 */
export const storageUtils = {
    /**
     * Storage keys constants
     */
    KEYS: {
        SIDEBAR_VISIBLE: "PodAwful::SidebarVisible",
        THEME: "PodAwful::Theme",
        COMPACT: "PodAwful::Compact",
        TAG_FILTER: "PodAwful::TagFilterMulti",
        NOTE_SEARCH: "PodAwful::NoteSearch",
        PINNED_GROUPS: "PodAwful::PinnedGroups",
        LOCKED: "PodAwful::Locked",
        DEVLOG: "PodAwful::DevLog",
        UNDO: "PodAwful::Undo",
        SCHEMA_VERSION: "PodAwful::SchemaVersion",
        NOTES: (url) => `PodAwful::Notes::${encodeURIComponent(urlUtils.normalizeYouTubeUrl(url))}`,
        GROUPS: (url) => `PodAwful::Groups::${encodeURIComponent(urlUtils.normalizeYouTubeUrl(url))}`
    },

    /**
     * Safely parse JSON with fallback
     * @param {string} value - JSON string to parse
     * @param {*} fallback - Fallback value
     * @returns {*} Parsed value or fallback
     */
    safeParse(value, fallback = null) {
        try {
            if (typeof value !== "string") return value;
            if (!value.trim().startsWith("{") && !value.trim().startsWith("[") && value.trim()[0] !== '"') {
                return value;
            }
            return JSON.parse(value);
        } catch (error) {
            LogDev("SafeParse error: " + error, "error");
            return fallback;
        }
    }
};

/**
 * Validation Utilities
 */
export const validationUtils = {
    /**
     * Validate hex color
     * @param {string} color - Color string
     * @returns {boolean} True if valid hex color
     */
    isValidHexColor(color) {
        return /^#[0-9A-Fa-f]{6}$/.test(color);
    },

    /**
     * Validate timestamp format
     * @param {string} timestamp - Timestamp string
     * @returns {boolean} True if valid timestamp
     */
    isValidTimestamp(timestamp) {
        if (!timestamp || typeof timestamp !== 'string') return false;
        return /^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(timestamp);
    },

    /**
     * Validate note text
     * @param {string} text - Note text
     * @returns {boolean} True if valid note text
     */
    isValidNoteText(text) {
        return typeof text === 'string' && text.trim().length > 0 && text.length <= 1000;
    },

    /**
     * Validate group name
     * @param {string} name - Group name
     * @returns {boolean} True if valid group name
     */
    isValidGroupName(name) {
        return typeof name === 'string' && name.trim().length > 0 && name.length <= 50;
    }
};

/**
 * Performance Utilities
 */
export const performanceUtils = {
    /**
     * Measure function execution time
     * @param {Function} func - Function to measure
     * @param {string} name - Measurement name
     * @returns {*} Function result
     */
    measure(func, name = 'function') {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        
        LogDev(`${name} executed in ${(end - start).toFixed(2)}ms`, 'performance');
        return result;
    },

    /**
     * Create performance monitor
     * @param {string} name - Monitor name
     * @returns {Object} Monitor object
     */
    createMonitor(name) {
        const start = performance.now();
        
        return {
            end: () => {
                const end = performance.now();
                LogDev(`${name} completed in ${(end - start).toFixed(2)}ms`, 'performance');
                return end - start;
            }
        };
    }
};

/**
 * Error Utilities
 */
export const errorUtils = {
    /**
     * Create error with context
     * @param {string} message - Error message
     * @param {Object} context - Error context
     * @returns {Error} Error object
     */
    createError(message, context = {}) {
        const error = new Error(message);
        error.context = context;
        error.timestamp = Date.now();
        return error;
    },

    /**
     * Handle error with logging
     * @param {Error} error - Error to handle
     * @param {string} context - Error context
     */
    handleError(error, context = 'Unknown') {
        LogDev(`Error in ${context}: ${error.message}`, 'error');
        if (error.context) {
            LogDev(`Error context: ${JSON.stringify(error.context)}`, 'error');
        }
    }
};
