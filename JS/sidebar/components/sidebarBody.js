// Sidebar Body Component
import { renderGroup } from './groupComponent.js';
import { renderNote } from './noteComponent.js';
import { LogDev } from '../../log.js';
import * as browser from 'webextension-polyfill';

// Persistent variable for currently dragged group
let draggedGroupName = null;

/**
 * Renders the sidebar body, including groups and notes.
 * @param {Object} props - Sidebar body properties and handlers.
 * @returns {HTMLElement} The sidebar body DOM element.
 */
export function renderSidebarBody(props) {
    const {
        groups,
        allGroups, // Original groups for reordering
        notes,
        selectedGroup,
        locked,
        container,
        renderSidebar,
        highlight,
        selectedNoteIds = new Set(),
        selectedGroupNames = new Set(),
        onNoteSelect,
        onGroupSelect,
        clearBulkSelection,
        bulkActionsEnabled = false
    } = props;

    try {
        const body = document.createElement('div');
        body.className = 'sidebar-body';

        // Use the bulkActionsEnabled prop passed from parent
        
        // Bulk actions toolbar - only show if enabled and there are selections
        if (bulkActionsEnabled && ((selectedNoteIds && selectedNoteIds.size > 0) || (selectedGroupNames && selectedGroupNames.size > 0))) {
            const bulkBar = document.createElement('div');
            bulkBar.className = 'sidebar-bulk-bar';
            bulkBar.innerHTML = `
                <span>${selectedNoteIds.size} notes, ${selectedGroupNames.size} groups selected</span>
                <button class="sidebar__bulk-delete">Delete</button>
                <button class="sidebar__bulk-move">Move</button>
                <button class="sidebar__bulk-tag">Tag</button>
                <button class="sidebar__bulk-clear">Clear</button>
            `;
            bulkBar.querySelector('.sidebar__bulk-clear').onclick = clearBulkSelection;
            
            // Bulk delete handler
            bulkBar.querySelector('.sidebar__bulk-delete').onclick = async () => {
                const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
                    title: 'Delete Selected',
                    message: `Delete ${selectedNoteIds.size} notes and ${selectedGroupNames.size} groups? This cannot be undone.`
                }) : Promise.resolve(confirm(`Delete ${selectedNoteIds.size} notes and ${selectedGroupNames.size} groups? This cannot be undone.`)));
                if (!confirmed) return;
                // Delete notes
                let newNotes = notes.filter(n => !selectedNoteIds.has(n.id));
                // Delete groups (and their notes)
                let newGroups = allGroups.filter(g => !selectedGroupNames.has(String(g)));
                newNotes = newNotes.filter(n => !selectedGroupNames.has(String(n.group)));
                // Save
                import('../storage.js').then(({ setNotes, setGroups }) => {
                    setNotes(location.href, newNotes, () => {
                        setGroups(newGroups, () => {
                            clearBulkSelection();
                            renderSidebar(container);
                        });
                    });
                });
            };
            
            // Bulk move handler
            bulkBar.querySelector('.sidebar__bulk-move').onclick = async () => {
                const availableGroups = allGroups.filter(g => !selectedGroupNames.has(String(g))).map(g => String(g));
                let targetGroup = null;
                if (window.showInputModal) {
                    targetGroup = await window.showInputModal({
                        title: 'Move Notes',
                        label: 'Move selected notes to group:',
                        type: 'select',
                        options: availableGroups
                    });
                } else {
                    targetGroup = prompt('Move selected notes to which group?', availableGroups[0] || '');
                }
                if (!targetGroup || !availableGroups.includes(targetGroup)) return;
                // Move notes
                let newNotes = notes.map(n => selectedNoteIds.has(n.id) ? { ...n, group: String(targetGroup) } : n);
                import('../storage.js').then(({ setNotes }) => {
                    setNotes(location.href, newNotes, () => {
                        clearBulkSelection();
                        renderSidebar(container);
                    });
                });
            };
            
            // Bulk tag handler
            bulkBar.querySelector('.sidebar__bulk-tag').onclick = async () => {
                let tag = null;
                if (window.showInputModal) {
                    tag = await window.showInputModal({
                        title: 'Tag Notes',
                        label: 'Add tag to selected notes:',
                        placeholder: 'Enter tag name'
                    });
                } else {
                    tag = prompt('Add tag to selected notes:');
                }
                if (!tag || !tag.trim()) return;
                let newNotes = notes.map(n => selectedNoteIds.has(n.id)
                    ? { ...n, tags: Array.from(new Set([...(n.tags || []), tag.trim()])) }
                    : n);
                import('../storage.js').then(({ setNotes }) => {
                    setNotes(location.href, newNotes, () => {
                        clearBulkSelection();
                        renderSidebar(container);
                    });
                });
            };
            
            body.appendChild(bulkBar);
        }

        if (!groups || groups.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'sidebar-empty';
            emptyDiv.textContent = 'No groups found.';
            body.appendChild(emptyDiv);
            return body;
        }

        // Render each group (groupComponent.js already handles drag-and-drop reordering)
        groups.forEach((group, idx) => {
            const groupName = String(group);
            const groupNotes = (notes || []).filter(note => String(note.group) === groupName);
            const groupProps = {
                groupName: groupName,
                notes: groupNotes,
                allGroups: allGroups, // Pass allGroups for reordering
                locked,
                container,
                renderSidebar,
                highlight,
                selected: selectedGroupNames.has(groupName),
                onSelect: onGroupSelect,
                selectedNoteIds,
                onNoteSelect
            };
            const groupElem = renderGroup(groupProps);
            body.appendChild(groupElem);
        });

        return body;
    } catch (e) {
        LogDev('renderSidebarBody error: ' + e, 'error');
        const errorDiv = document.createElement('div');
        errorDiv.textContent = 'Body failed to render';
        errorDiv.style.color = 'var(--error, #c00)';
        return errorDiv;
    }
}