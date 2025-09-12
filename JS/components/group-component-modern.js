import { BaseComponent } from './base-component.js';
import { NoteComponent } from './note-component-modern.js';
import { LogDev } from '../log.js';
import { setNotes, setGroups, renameGroup, deleteGroup, getNotes, getGroups } from '../sidebar/storage-new.js';
import { showInputModal, showConfirmModal } from '../sidebar/modal.js';

/**
 * Modern Group Component
 * Improved version using the base component class
 */
export class GroupComponent extends BaseComponent {
    constructor(groupName, notes = [], options = {}) {
        super(document.createElement('div'), options);
        this.groupName = groupName;
        this.notes = notes;
        this.url = options.url || location.href;
        this.noteComponents = new Map();
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showActions: true,
            editable: true,
            draggable: false,
            collapsible: true,
            collapsed: false
        };
    }

    render() {
        this.element.className = 'group-item';
        this.element.dataset.groupName = this.groupName;
        
        this.element.innerHTML = `
            <div class="group-header">
                <div class="group-title">${this.escapeHtml(this.groupName)}</div>
                <div class="group-notes-count">${this.notes.length} note${this.notes.length !== 1 ? 's' : ''}</div>
                ${this.options.showActions ? this.renderGroupActions() : ''}
                ${this.options.collapsible ? this.renderCollapseButton() : ''}
            </div>
            <div class="group-content ${this.options.collapsed ? 'collapsed' : ''}">
                <div class="group-notes"></div>
            </div>
            <div class="status-message"></div>
        `;

        this.renderNotes();
        this.debug(`Rendered group: ${this.groupName}`);
    }

    renderGroupActions() {
        return `
            <div class="group-actions">
                <button class="group-action-btn" data-action="edit" title="Edit Group">✏️</button>
                <button class="group-action-btn" data-action="delete" title="Delete Group">🗑️</button>
                ${this.options.draggable ? '<button class="group-drag-handle" title="Drag Group">⋮⋮</button>' : ''}
            </div>
        `;
    }

    renderCollapseButton() {
        return `
            <button class="group-collapse-btn" title="${this.options.collapsed ? 'Expand' : 'Collapse'} Group">
                ${this.options.collapsed ? '▶' : '▼'}
            </button>
        `;
    }

    renderNotes() {
        const notesContainer = this.element.querySelector('.group-notes');
        if (!notesContainer) return;

        // Clear existing note components
        this.noteComponents.forEach(component => component.destroy());
        this.noteComponents.clear();
        notesContainer.innerHTML = '';

        // Render each note
        this.notes.forEach(note => {
            const noteComponent = new NoteComponent(note, {
                ...this.options,
                url: this.url
            });

            // Listen for note events
            noteComponent.addEventListener(noteComponent.element, 'timestamp-click', (e) => {
                this.emit('note-timestamp-click', e.detail);
            });

            noteComponent.addEventListener(noteComponent.element, 'drag-start', (e) => {
                this.emit('note-drag-start', e.detail);
            });

            this.noteComponents.set(note.id, noteComponent);
            notesContainer.appendChild(noteComponent.element);
        });
    }

    bindEvents() {
        // Group action buttons
        this.element.querySelectorAll('.group-action-btn').forEach(btn => {
            const action = btn.dataset.action;
            this.addEventListener(btn, 'click', (e) => {
                e.stopPropagation();
                this.handleGroupAction(action);
            });
        });

        // Collapse button
        const collapseBtn = this.element.querySelector('.group-collapse-btn');
        if (collapseBtn) {
            this.addEventListener(collapseBtn, 'click', (e) => {
                e.stopPropagation();
                this.toggleCollapse();
            });
        }

        // Drag handle
        if (this.options.draggable) {
            const dragHandle = this.element.querySelector('.group-drag-handle');
            if (dragHandle) {
                this.addEventListener(dragHandle, 'mousedown', (e) => {
                    this.handleDragStart(e);
                });
            }
        }
    }

    handleGroupAction(action) {
        switch (action) {
            case 'edit':
                this.editGroup();
                break;
            case 'delete':
                this.deleteGroup();
                break;
        }
    }

    async editGroup() {
        try {
            const newName = await showInputModal({
                title: 'Edit Group Name',
                message: 'Enter new name for the group:',
                defaultValue: this.groupName,
                placeholder: 'Enter group name...'
            });

            if (newName && newName !== this.groupName) {
                await this.renameGroup(newName);
                this.showStatus('Group renamed', 'success');
            }
        } catch (error) {
            LogDev(`Error editing group: ${error.message}`, 'error');
            this.showStatus('Error editing group', 'error');
        }
    }

    async deleteGroup() {
        try {
            const confirmed = await showConfirmModal({
                title: 'Delete Group',
                message: `Are you sure you want to delete the group "${this.groupName}" and all its notes?`
            });

            if (confirmed) {
                await this.removeGroup();
                this.showStatus('Group deleted', 'success');
            }
        } catch (error) {
            LogDev(`Error deleting group: ${error.message}`, 'error');
            this.showStatus('Error deleting group', 'error');
        }
    }

    async renameGroup(newName) {
        try {
            await renameGroup(this.url, this.groupName, newName);
            
            // Update local state
            this.groupName = newName;
            this.element.dataset.groupName = newName;
            
            // Update title display
            const titleElement = this.element.querySelector('.group-title');
            if (titleElement) {
                titleElement.textContent = newName;
            }
            
            this.debug(`Renamed group to: ${newName}`);
        } catch (error) {
            LogDev(`Error renaming group: ${error.message}`, 'error');
            throw error;
        }
    }

    async removeGroup() {
        try {
            await deleteGroup(this.url, this.groupName);
            
            // Destroy all note components
            this.noteComponents.forEach(component => component.destroy());
            this.noteComponents.clear();
            
            this.destroy();
            this.debug(`Removed group: ${this.groupName}`);
        } catch (error) {
            LogDev(`Error removing group: ${error.message}`, 'error');
            throw error;
        }
    }

    toggleCollapse() {
        this.options.collapsed = !this.options.collapsed;
        
        const content = this.element.querySelector('.group-content');
        const collapseBtn = this.element.querySelector('.group-collapse-btn');
        
        if (content) {
            content.classList.toggle('collapsed', this.options.collapsed);
        }
        
        if (collapseBtn) {
            collapseBtn.textContent = this.options.collapsed ? '▶' : '▼';
            collapseBtn.title = this.options.collapsed ? 'Expand Group' : 'Collapse Group';
        }
        
        this.debug(`Group ${this.options.collapsed ? 'collapsed' : 'expanded'}`);
    }

    handleDragStart(e) {
        if (this.options.draggable) {
            this.emit('drag-start', {
                groupName: this.groupName,
                element: this.element
            });
        }
    }

    /**
     * Add a note to the group
     * @param {Object} note - Note to add
     */
    async addNote(note) {
        try {
            const notes = await getNotes(this.url);
            const noteIndex = notes.findIndex(n => n.id === note.id);
            
            if (noteIndex !== -1) {
                notes[noteIndex].group = this.groupName;
                await setNotes(this.url, notes);
                
                // Update local notes
                this.notes.push(note);
                this.renderNotes();
                
                // Update notes count
                this.updateNotesCount();
                
                this.debug(`Added note to group: ${note.id}`);
            }
        } catch (error) {
            LogDev(`Error adding note to group: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Remove a note from the group
     * @param {string} noteId - ID of note to remove
     */
    async removeNote(noteId) {
        try {
            const notes = await getNotes(this.url);
            const noteIndex = notes.findIndex(n => n.id === noteId);
            
            if (noteIndex !== -1) {
                notes[noteIndex].group = null;
                await setNotes(this.url, notes);
                
                // Update local notes
                this.notes = this.notes.filter(n => n.id !== noteId);
                
                // Destroy note component
                const noteComponent = this.noteComponents.get(noteId);
                if (noteComponent) {
                    noteComponent.destroy();
                    this.noteComponents.delete(noteId);
                }
                
                // Update notes count
                this.updateNotesCount();
                
                this.debug(`Removed note from group: ${noteId}`);
            }
        } catch (error) {
            LogDev(`Error removing note from group: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Update the notes count display
     */
    updateNotesCount() {
        const countElement = this.element.querySelector('.group-notes-count');
        if (countElement) {
            countElement.textContent = `${this.notes.length} note${this.notes.length !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Update group data and re-render
     * @param {Object} groupData - New group data
     */
    updateGroupData(groupData) {
        if (groupData.name) {
            this.groupName = groupData.name;
        }
        if (groupData.notes) {
            this.notes = groupData.notes;
        }
        this.render();
        this.bindEvents();
    }

    /**
     * Get current group data
     * @returns {Object} Group data
     */
    getGroupData() {
        return {
            name: this.groupName,
            notes: [...this.notes]
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        // Destroy all note components
        this.noteComponents.forEach(component => component.destroy());
        this.noteComponents.clear();
        
        super.destroy();
    }
}
