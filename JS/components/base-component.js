import { LogDev } from '../log.js';

/**
 * Base Component Class
 * Provides common functionality for all components
 */
export class BaseComponent {
    constructor(element, options = {}) {
        this.element = element;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.eventListeners = new Map();
        this.isDestroyed = false;
        
        this.init();
    }

    /**
     * Get default options for the component
     * @returns {Object} Default options
     */
    getDefaultOptions() {
        return {
            debug: false,
            autoInit: true
        };
    }

    /**
     * Initialize the component
     */
    init() {
        if (this.options.autoInit) {
            this.render();
            this.bindEvents();
        }
    }

    /**
     * Render the component (to be implemented by subclasses)
     */
    render() {
        throw new Error('render() method must be implemented by subclass');
    }

    /**
     * Bind event listeners (to be implemented by subclasses)
     */
    bindEvents() {
        // Override in subclasses
    }

    /**
     * Add event listener with automatic cleanup
     * @param {HTMLElement} element - Element to bind to
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element || this.isDestroyed) return;
        
        const wrappedHandler = (e) => {
            if (this.isDestroyed) return;
            try {
                handler.call(this, e);
            } catch (error) {
                LogDev(`Error in event handler for ${event}: ${error.message}`, 'error');
            }
        };
        
        element.addEventListener(event, wrappedHandler, options);
        
        // Store for cleanup
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, []);
        }
        this.eventListeners.get(element).push({ event, handler: wrappedHandler, options });
    }

    /**
     * Remove event listener
     * @param {HTMLElement} element - Element to unbind from
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    removeEventListener(element, event, handler) {
        if (!element) return;
        
        element.removeEventListener(event, handler);
        
        // Remove from stored listeners
        if (this.eventListeners.has(element)) {
            const listeners = this.eventListeners.get(element);
            const index = listeners.findIndex(l => l.event === event && l.handler === handler);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {*} detail - Event detail
     */
    emit(eventName, detail = null) {
        if (this.isDestroyed) return;
        
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true
        });
        
        this.element.dispatchEvent(event);
    }

    /**
     * Show status message
     * @param {string} message - Status message
     * @param {string} type - Message type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    showStatus(message, type = 'info', duration = 3000) {
        if (this.isDestroyed) return;
        
        const statusElement = this.element.querySelector('.status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message status-${type}`;
            
            if (duration > 0) {
                setTimeout(() => {
                    if (!this.isDestroyed) {
                        statusElement.textContent = '';
                        statusElement.className = 'status-message';
                    }
                }, duration);
            }
        }
    }

    /**
     * Update component options
     * @param {Object} newOptions - New options to merge
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.render();
    }

    /**
     * Get component state
     * @returns {Object} Component state
     */
    getState() {
        return {
            isDestroyed: this.isDestroyed,
            options: { ...this.options }
        };
    }

    /**
     * Destroy the component and clean up
     */
    destroy() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // Remove all event listeners
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        this.eventListeners.clear();
        
        // Remove element from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        LogDev(`Component destroyed: ${this.constructor.name}`, 'system');
    }

    /**
     * Log debug message if debugging is enabled
     * @param {string} message - Debug message
     * @param {string} type - Log type
     */
    debug(message, type = 'miscellaneous') {
        if (this.options.debug) {
            LogDev(`[${this.constructor.name}] ${message}`, type);
        }
    }
}
