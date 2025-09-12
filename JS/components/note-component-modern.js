import { BaseComponent } from './base-component.js';
import { LogDev } from '../log.js';
import { setNotes, getNotes } from '../sidebar/storage-new.js';
import { showInputModal, showConfirmModal, showChoiceModal } from '../sidebar/modal.js';
import * as browser from 'webextension-polyfill';

/**
 * Modern Note Component
 * Improved version using the base component class
 */
export class NoteComponent extends BaseComponent {
    constructor(note, options = {}) {
        super(document.createElement('div'), options);
        this.note = note;
        this.url = options.url || location.href;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showTimestamp: true,
            showActions: true,
            editable: true,
            draggable: false
        };
    }

    render() {
        this.element.className = 'note-item';
        this.element.dataset.noteId = this.note.id;
        
        this.element.innerHTML = `
            <div class="note-content">
                <div class="note-text">${this.escapeHtml(this.note.text)}</div>
                ${this.options.showTimestamp ? `<div class="note-timestamp">${this.note.timestamp}</div>` : ''}
            </div>
            ${this.options.showActions ? this.renderActions() : ''}
            <div class="status-message"></div>
        `;

        this.debug(`Rendered note: ${this.note.id}`);
    }

    renderActions() {
        return `
            <div class="note-actions">
                <button class="note-action-btn" data-action="edit" title="Edit Note">✏️</button>
                <button class="note-action-btn" data-action="copy" title="Copy URL">📋</button>
                <button class="note-action-btn" data-action="delete" title="Delete Note">🗑️</button>
                ${this.options.draggable ? '<button class="note-drag-handle" title="Drag Note">⋮⋮</button>' : ''}
            </div>
        `;
    }

    bindEvents() {
        // Action buttons
        this.element.querySelectorAll('.note-action-btn').forEach(btn => {
            const action = btn.dataset.action;
            this.addEventListener(btn, 'click', (e) => {
                e.stopPropagation();
                this.handleAction(action);
            });
        });

        // Drag handle
        if (this.options.draggable) {
            const dragHandle = this.element.querySelector('.note-drag-handle');
            if (dragHandle) {
                this.addEventListener(dragHandle, 'mousedown', (e) => {
                    this.handleDragStart(e);
                });
            }
        }

        // Note click for timestamp
        if (this.note.timestamp) {
            this.addEventListener(this.element, 'click', (e) => {
                if (!e.target.closest('.note-actions')) {
                    this.handleTimestampClick();
                }
            });
        }
    }

    handleAction(action) {
        switch (action) {
            case 'edit':
                this.editNote();
                break;
            case 'copy':
                this.copyNoteUrl();
                break;
            case 'delete':
                this.deleteNote();
                break;
        }
    }

    async editNote() {
        try {
            const choice = await showChoiceModal({
                title: 'Edit Note',
                message: 'What would you like to edit?',
                options: ['Edit Text', 'Edit Tags', 'Edit Timestamp']
            });

            switch (choice) {
                case 'Edit Text':
                    await this.editNoteText();
                    break;
                case 'Edit Tags':
                    await this.editNoteTags();
                    break;
                case 'Edit Timestamp':
                    await this.editNoteTimestamp();
                    break;
            }
        } catch (error) {
            LogDev(`Error editing note: ${error.message}`, 'error');
            this.showStatus('Error editing note', 'error');
        }
    }

    async editNoteText() {
        const newText = await showInputModal({
            title: 'Edit Note Text',
            message: 'Enter new text for the note:',
            defaultValue: this.note.text,
            placeholder: 'Enter note text...'
        });

        if (newText && newText !== this.note.text) {
            await this.updateNote({ text: newText });
            this.showStatus('Note text updated', 'success');
        }
    }

    async editNoteTags() {
        const currentTags = this.note.tags || [];
        const newTags = await showInputModal({
            title: 'Edit Note Tags',
            message: 'Enter tags separated by commas:',
            defaultValue: currentTags.join(', '),
            placeholder: 'Enter tags...'
        });

        if (newTags !== null) {
            const tags = newTags.split(',').map(tag => tag.trim()).filter(tag => tag);
            await this.updateNote({ tags });
            this.showStatus('Note tags updated', 'success');
        }
    }

    async editNoteTimestamp() {
        const newTimestamp = await showInputModal({
            title: 'Edit Note Timestamp',
            message: 'Enter new timestamp (format: MM:SS or HH:MM:SS):',
            defaultValue: this.note.timestamp,
            placeholder: 'Enter timestamp...'
        });

        if (newTimestamp && newTimestamp !== this.note.timestamp) {
            await this.updateNote({ timestamp: newTimestamp });
            this.showStatus('Note timestamp updated', 'success');
        }
    }

    async copyNoteUrl() {
        try {
            const url = this.note.url || this.url;
            await navigator.clipboard.writeText(url);
            this.showStatus('URL copied!', 'success');
        } catch (error) {
            LogDev(`Failed to copy URL: ${error.message}`, 'error');
            this.showStatus('Failed to copy URL', 'error');
        }
    }

    async deleteNote() {
        try {
            const confirmed = await showConfirmModal({
                title: 'Delete Note',
                message: 'Are you sure you want to delete this note?'
            });

            if (confirmed) {
                await this.removeNote();
                this.showStatus('Note deleted', 'success');
            }
        } catch (error) {
            LogDev(`Error deleting note: ${error.message}`, 'error');
            this.showStatus('Error deleting note', 'error');
        }
    }

    async updateNote(updates) {
        try {
            const notes = await getNotes(this.url);
            const noteIndex = notes.findIndex(n => n.id === this.note.id);
            
            if (noteIndex !== -1) {
                notes[noteIndex] = { ...notes[noteIndex], ...updates };
                await setNotes(this.url, notes);
                
                // Update local note
                this.note = { ...this.note, ...updates };
                
                // Re-render
                this.render();
                this.bindEvents();
                
                this.debug(`Updated note: ${this.note.id}`);
            }
        } catch (error) {
            LogDev(`Error updating note: ${error.message}`, 'error');
            throw error;
        }
    }

    async removeNote() {
        try {
            const notes = await getNotes(this.url);
            const filteredNotes = notes.filter(n => n.id !== this.note.id);
            await setNotes(this.url, filteredNotes);
            
            this.destroy();
            this.debug(`Removed note: ${this.note.id}`);
        } catch (error) {
            LogDev(`Error removing note: ${error.message}`, 'error');
            throw error;
        }
    }

    handleTimestampClick() {
        if (this.note.timestamp) {
            // Emit event for timestamp handling
            this.emit('timestamp-click', {
                timestamp: this.note.timestamp,
                note: this.note
            });
        }
    }

    handleDragStart(e) {
        if (this.options.draggable) {
            this.emit('drag-start', {
                note: this.note,
                element: this.element
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update note data and re-render
     * @param {Object} noteData - New note data
     */
    updateNoteData(noteData) {
        this.note = { ...this.note, ...noteData };
        this.render();
        this.bindEvents();
    }

    /**
     * Get current note data
     * @returns {Object} Note data
     */
    getNoteData() {
        return { ...this.note };
    }
}
