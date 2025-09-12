import { LogDev } from '../log.js';

/**
 * Unified Modal System
 * Provides consistent modal functionality across the extension
 */
export class ModalSystem {
    constructor() {
        this.activeModals = new Map();
        this.modalCounter = 0;
    }

    /**
     * Show a simple modal with a message
     * @param {Object} options - Modal options
     * @returns {Promise<void>}
     */
    async showModal(options) {
        const {
            title = 'Modal',
            message = '',
            type = 'info',
            showCloseButton = true,
            closeOnBackdrop = true,
            closeOnEscape = true
        } = options;

        return new Promise((resolve) => {
            const modalId = `modal-${++this.modalCounter}`;
            const modal = this.createModal(modalId, {
                title,
                message,
                type,
                showCloseButton,
                closeOnBackdrop,
                closeOnEscape,
                onClose: () => {
                    this.removeModal(modalId);
                    resolve();
                }
            });

            this.activeModals.set(modalId, modal);
            document.body.appendChild(modal);
            this.focusModal(modal);
        });
    }

    /**
     * Show a confirmation modal
     * @param {Object} options - Modal options
     * @returns {Promise<boolean>}
     */
    async showConfirmModal(options) {
        const {
            title = 'Confirm',
            message = 'Are you sure?',
            confirmText = 'Yes',
            cancelText = 'No',
            type = 'warning'
        } = options;

        return new Promise((resolve) => {
            const modalId = `modal-${++this.modalCounter}`;
            const modal = this.createModal(modalId, {
                title,
                message,
                type,
                showCloseButton: false,
                closeOnBackdrop: false,
                closeOnEscape: true,
                buttons: [
                    {
                        text: cancelText,
                        class: 'modal-btn-cancel',
                        action: () => {
                            this.removeModal(modalId);
                            resolve(false);
                        }
                    },
                    {
                        text: confirmText,
                        class: 'modal-btn-confirm',
                        action: () => {
                            this.removeModal(modalId);
                            resolve(true);
                        }
                    }
                ],
                onClose: () => {
                    this.removeModal(modalId);
                    resolve(false);
                }
            });

            this.activeModals.set(modalId, modal);
            document.body.appendChild(modal);
            this.focusModal(modal);
        });
    }

    /**
     * Show an input modal
     * @param {Object} options - Modal options
     * @returns {Promise<string|null>}
     */
    async showInputModal(options) {
        const {
            title = 'Input',
            message = 'Enter a value:',
            defaultValue = '',
            placeholder = '',
            inputType = 'text',
            confirmText = 'OK',
            cancelText = 'Cancel'
        } = options;

        return new Promise((resolve) => {
            const modalId = `modal-${++this.modalCounter}`;
            const modal = this.createModal(modalId, {
                title,
                message,
                type: 'info',
                showCloseButton: false,
                closeOnBackdrop: false,
                closeOnEscape: true,
                input: {
                    type: inputType,
                    value: defaultValue,
                    placeholder
                },
                buttons: [
                    {
                        text: cancelText,
                        class: 'modal-btn-cancel',
                        action: () => {
                            this.removeModal(modalId);
                            resolve(null);
                        }
                    },
                    {
                        text: confirmText,
                        class: 'modal-btn-confirm',
                        action: () => {
                            const input = modal.querySelector('.modal-input');
                            const value = input ? input.value : null;
                            this.removeModal(modalId);
                            resolve(value);
                        }
                    }
                ],
                onClose: () => {
                    this.removeModal(modalId);
                    resolve(null);
                }
            });

            this.activeModals.set(modalId, modal);
            document.body.appendChild(modal);
            this.focusModal(modal);

            // Focus input after modal is shown
            setTimeout(() => {
                const input = modal.querySelector('.modal-input');
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        });
    }

    /**
     * Show a choice modal with multiple options
     * @param {Object} options - Modal options
     * @returns {Promise<string|null>}
     */
    async showChoiceModal(options) {
        const {
            title = 'Choose',
            message = 'Select an option:',
            options: choices = [],
            cancelText = 'Cancel'
        } = options;

        return new Promise((resolve) => {
            const modalId = `modal-${++this.modalCounter}`;
            const modal = this.createModal(modalId, {
                title,
                message,
                type: 'info',
                showCloseButton: false,
                closeOnBackdrop: false,
                closeOnEscape: true,
                choices,
                buttons: [
                    {
                        text: cancelText,
                        class: 'modal-btn-cancel',
                        action: () => {
                            this.removeModal(modalId);
                            resolve(null);
                        }
                    }
                ],
                onClose: () => {
                    this.removeModal(modalId);
                    resolve(null);
                }
            });

            this.activeModals.set(modalId, modal);
            document.body.appendChild(modal);
            this.focusModal(modal);
        });
    }

    /**
     * Show a two-choice modal
     * @param {Object} options - Modal options
     * @returns {Promise<string|null>}
     */
    async showTwoChoiceModal(options) {
        const {
            title = 'Choose',
            message = 'Select an option:',
            option1 = 'Option 1',
            option2 = 'Option 2',
            cancelText = 'Cancel'
        } = options;

        return this.showChoiceModal({
            title,
            message,
            options: [option1, option2],
            cancelText
        });
    }

    /**
     * Create a modal element
     * @param {string} modalId - Unique modal ID
     * @param {Object} options - Modal options
     * @returns {HTMLElement} Modal element
     */
    createModal(modalId, options) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `${modalId}-title`);

        modal.innerHTML = `
            <div class="modal-content">
                ${options.showCloseButton ? '<button class="modal-close" aria-label="Close">✕</button>' : ''}
                <h3 id="${modalId}-title" class="modal-title">${options.title}</h3>
                <div class="modal-body">
                    <p class="modal-message">${options.message}</p>
                    ${options.input ? this.createInputHTML(options.input) : ''}
                    ${options.choices ? this.createChoicesHTML(options.choices, modalId) : ''}
                </div>
                ${options.buttons ? this.createButtonsHTML(options.buttons) : ''}
            </div>
        `;

        // Add event listeners
        this.addModalEventListeners(modal, options);

        return modal;
    }

    createInputHTML(input) {
        return `
            <input 
                type="${input.type}" 
                class="modal-input" 
                value="${input.value || ''}" 
                placeholder="${input.placeholder || ''}"
                style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #555; border-radius: 4px; background: #333; color: #fff;"
            />
        `;
    }

    createChoicesHTML(choices, modalId) {
        return `
            <div class="modal-choices">
                ${choices.map((choice, index) => `
                    <button 
                        class="modal-choice-btn" 
                        data-choice="${choice}"
                        style="display: block; width: 100%; padding: 10px; margin: 5px 0; text-align: left; background: #444; color: #fff; border: 1px solid #555; border-radius: 4px; cursor: pointer;"
                    >
                        ${choice}
                    </button>
                `).join('')}
            </div>
        `;
    }

    createButtonsHTML(buttons) {
        return `
            <div class="modal-buttons">
                ${buttons.map(button => `
                    <button 
                        class="modal-btn ${button.class || ''}"
                        style="padding: 8px 16px; margin: 0 5px; border: none; border-radius: 4px; cursor: pointer;"
                    >
                        ${button.text}
                    </button>
                `).join('')}
            </div>
        `;
    }

    addModalEventListeners(modal, options) {
        // Close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                options.onClose && options.onClose();
            });
        }

        // Backdrop click
        if (options.closeOnBackdrop) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    options.onClose && options.onClose();
                }
            });
        }

        // Escape key
        if (options.closeOnEscape) {
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    options.onClose && options.onClose();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }

        // Button clicks
        modal.querySelectorAll('.modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const button = options.buttons.find(b => b.text === btn.textContent.trim());
                if (button && button.action) {
                    button.action();
                }
            });
        });

        // Choice clicks
        modal.querySelectorAll('.modal-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choice = btn.dataset.choice;
                options.onClose && options.onClose();
                // Resolve with choice value
                const modalId = modal.id;
                const modalInstance = this.activeModals.get(modalId);
                if (modalInstance) {
                    this.removeModal(modalId);
                    // This is a bit hacky, but we need to resolve the promise
                    // We'll handle this in the calling method
                }
            });
        });
    }

    focusModal(modal) {
        setTimeout(() => {
            const focusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) {
                focusable.focus();
            } else {
                modal.focus();
            }
        }, 0);
    }

    removeModal(modalId) {
        const modal = this.activeModals.get(modalId);
        if (modal) {
            modal.remove();
            this.activeModals.delete(modalId);
            LogDev(`Modal removed: ${modalId}`, 'system');
        }
    }

    /**
     * Close all active modals
     */
    closeAllModals() {
        this.activeModals.forEach((modal, modalId) => {
            this.removeModal(modalId);
        });
    }

    /**
     * Get count of active modals
     * @returns {number} Number of active modals
     */
    getActiveModalCount() {
        return this.activeModals.size;
    }
}

// Create global instance
export const modalSystem = new ModalSystem();

// Export convenience functions
export const showModal = (options) => modalSystem.showModal(options);
export const showConfirmModal = (options) => modalSystem.showConfirmModal(options);
export const showInputModal = (options) => modalSystem.showInputModal(options);
export const showChoiceModal = (options) => modalSystem.showChoiceModal(options);
export const showTwoChoiceModal = (options) => modalSystem.showTwoChoiceModal(options);
