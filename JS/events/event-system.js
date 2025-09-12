import { LogDev } from '../log.js';

/**
 * Centralized Event System
 * Provides event bus functionality for component communication
 */
export class EventSystem {
    constructor() {
        this.listeners = new Map();
        this.globalListeners = new Map();
        this.eventHistory = [];
        this.maxHistorySize = 100;
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Event name
     * @param {Function} callback - Event callback
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback, options = {}) {
        const {
            once = false,
            priority = 0,
            context = null
        } = options;

        const listener = {
            callback,
            once,
            priority,
            context,
            id: this.generateListenerId()
        };

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        const eventListeners = this.listeners.get(eventName);
        eventListeners.push(listener);
        
        // Sort by priority (higher priority first)
        eventListeners.sort((a, b) => b.priority - a.priority);

        LogDev(`Event listener added: ${eventName} (priority: ${priority})`, 'system');

        // Return unsubscribe function
        return () => this.off(eventName, listener.id);
    }

    /**
     * Subscribe to all events (global listener)
     * @param {Function} callback - Event callback
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    onAll(callback, options = {}) {
        const {
            once = false,
            priority = 0,
            context = null
        } = options;

        const listener = {
            callback,
            once,
            priority,
            context,
            id: this.generateListenerId()
        };

        this.globalListeners.set(listener.id, listener);

        LogDev(`Global event listener added (priority: ${priority})`, 'system');

        return () => this.offAll(listener.id);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Event name
     * @param {string|Function} listenerId - Listener ID or callback function
     */
    off(eventName, listenerId) {
        if (!this.listeners.has(eventName)) return;

        const eventListeners = this.listeners.get(eventName);
        const index = eventListeners.findIndex(listener => 
            listener.id === listenerId || listener.callback === listenerId
        );

        if (index !== -1) {
            eventListeners.splice(index, 1);
            LogDev(`Event listener removed: ${eventName}`, 'system');
        }
    }

    /**
     * Unsubscribe from all events
     * @param {string} listenerId - Listener ID
     */
    offAll(listenerId) {
        if (this.globalListeners.has(listenerId)) {
            this.globalListeners.delete(listenerId);
            LogDev(`Global event listener removed`, 'system');
        }
    }

    /**
     * Emit an event
     * @param {string} eventName - Event name
     * @param {*} data - Event data
     * @param {Object} options - Emit options
     */
    emit(eventName, data = null, options = {}) {
        const {
            async = false,
            preventDefault = false,
            stopPropagation = false
        } = options;

        const event = {
            name: eventName,
            data,
            timestamp: Date.now(),
            preventDefault: () => { preventDefault = true; },
            stopPropagation: () => { stopPropagation = true; },
            defaultPrevented: false,
            propagationStopped: false
        };

        // Add to history
        this.addToHistory(event);

        LogDev(`Event emitted: ${eventName}`, 'system');

        if (async) {
            // Emit asynchronously
            setTimeout(() => this.processEvent(event), 0);
        } else {
            // Emit synchronously
            this.processEvent(event);
        }
    }

    /**
     * Process an event through all listeners
     * @param {Object} event - Event object
     */
    processEvent(event) {
        // Process global listeners first
        this.globalListeners.forEach(listener => {
            if (event.propagationStopped) return;
            this.callListener(listener, event);
        });

        // Process specific event listeners
        if (this.listeners.has(event.name)) {
            const eventListeners = this.listeners.get(event.name);
            eventListeners.forEach(listener => {
                if (event.propagationStopped) return;
                this.callListener(listener, event);
            });
        }
    }

    /**
     * Call a listener with error handling
     * @param {Object} listener - Listener object
     * @param {Object} event - Event object
     */
    callListener(listener, event) {
        try {
            if (listener.context) {
                listener.callback.call(listener.context, event);
            } else {
                listener.callback(event);
            }

            // Remove if it's a once listener
            if (listener.once) {
                this.off(event.name, listener.id);
            }
        } catch (error) {
            LogDev(`Error in event listener for ${event.name}: ${error.message}`, 'error');
        }
    }

    /**
     * Add event to history
     * @param {Object} event - Event object
     */
    addToHistory(event) {
        this.eventHistory.push(event);
        
        // Maintain max history size
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * Get event history
     * @param {string} eventName - Optional event name filter
     * @param {number} limit - Maximum number of events to return
     * @returns {Array} Event history
     */
    getHistory(eventName = null, limit = null) {
        let history = this.eventHistory;
        
        if (eventName) {
            history = history.filter(event => event.name === eventName);
        }
        
        if (limit) {
            history = history.slice(-limit);
        }
        
        return history;
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
        LogDev('Event history cleared', 'system');
    }

    /**
     * Get listener count for an event
     * @param {string} eventName - Event name
     * @returns {number} Listener count
     */
    getListenerCount(eventName) {
        const eventListeners = this.listeners.get(eventName) || [];
        return eventListeners.length + this.globalListeners.size;
    }

    /**
     * Get all registered event names
     * @returns {Array} Event names
     */
    getEventNames() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Remove all listeners for an event
     * @param {string} eventName - Event name
     */
    removeAllListeners(eventName) {
        if (this.listeners.has(eventName)) {
            this.listeners.delete(eventName);
            LogDev(`All listeners removed for event: ${eventName}`, 'system');
        }
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.listeners.clear();
        this.globalListeners.clear();
        LogDev('All event listeners removed', 'system');
    }

    /**
     * Generate unique listener ID
     * @returns {string} Listener ID
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create a namespaced event emitter
     * @param {string} namespace - Namespace prefix
     * @returns {Object} Namespaced emitter
     */
    createNamespace(namespace) {
        return {
            on: (eventName, callback, options) => 
                this.on(`${namespace}:${eventName}`, callback, options),
            off: (eventName, listenerId) => 
                this.off(`${namespace}:${eventName}`, listenerId),
            emit: (eventName, data, options) => 
                this.emit(`${namespace}:${eventName}`, data, options)
        };
    }
}

// Create global instance
export const eventSystem = new EventSystem();

// Export convenience functions
export const on = (eventName, callback, options) => eventSystem.on(eventName, callback, options);
export const off = (eventName, listenerId) => eventSystem.off(eventName, listenerId);
export const emit = (eventName, data, options) => eventSystem.emit(eventName, data, options);
export const onAll = (callback, options) => eventSystem.onAll(callback, options);
export const offAll = (listenerId) => eventSystem.offAll(listenerId);

// Common event names
export const EVENTS = {
    // Theme events
    THEME_CHANGED: 'theme:changed',
    THEME_APPLIED: 'theme:applied',
    
    // Note events
    NOTE_CREATED: 'note:created',
    NOTE_UPDATED: 'note:updated',
    NOTE_DELETED: 'note:deleted',
    NOTE_SELECTED: 'note:selected',
    
    // Group events
    GROUP_CREATED: 'group:created',
    GROUP_UPDATED: 'group:updated',
    GROUP_DELETED: 'group:deleted',
    
    // UI events
    SIDEBAR_TOGGLED: 'ui:sidebar:toggled',
    MODAL_OPENED: 'ui:modal:opened',
    MODAL_CLOSED: 'ui:modal:closed',
    
    // Storage events
    STORAGE_CHANGED: 'storage:changed',
    DATA_LOADED: 'data:loaded',
    DATA_SAVED: 'data:saved',
    
    // Error events
    ERROR_OCCURRED: 'error:occurred',
    WARNING_SHOWN: 'warning:shown'
};
