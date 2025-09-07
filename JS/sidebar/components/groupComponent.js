// Group Component
import { renderNote } from './noteComponent.js';
import { setNotes, setGroups, renameGroup, deleteGroup, getNotes } from '../storage.js';
import { LogDev } from '../../log.js';
import { showInputModal, showConfirmModal } from '../modal.js';
import * as browser from 'webextension-polyfill';

/**
 * Renders a group and its notes in the sidebar.
 * @param {Object} props - Group properties and handlers.
 * @returns {HTMLElement} The group DOM element.
 */
export function renderGroup(props) {
    const {
        groupName: GroupName,
        notes: Notes,
        pinnedGroups: PinnedGroups,
        locked: Locked,
        container: Container,
        renderSidebar: RenderSidebar,
        allGroups: AllGroups,
        highlight,
        selected = false,
        onSelect,
        selectedNoteIds = new Set(),
        onNoteSelect
    } = props;

    LogDev("Rendering group: " + GroupName, "render");
    const groupNotes = Array.isArray(Notes) ? Notes.filter(n => n.group === GroupName) : [];

    // --- Make the group container draggable ---
    const GroupDiv = document.createElement("div");
    GroupDiv.className = "note-group";
    GroupDiv.dataset.group = GroupName;
    GroupDiv.dataset.groupName = GroupName;
    // Only allow drag from the group header
    const groupHeader = document.createElement("div");
    groupHeader.className = "group-header";
    groupHeader.style.position = 'relative';
    // Drag functionality removed from group header - only drag handle can be used
    groupHeader.style.cursor = 'default';

    // --- Group header with title and actions ---
    // Bulk select checkbox - only show if bulk actions are enabled
    browser.storage.local.get(['PodAwful::EnableBulkActions'])
        .then(result => {
            const bulkActionsEnabled = result['PodAwful::EnableBulkActions'] === true;
            if (bulkActionsEnabled) {
                const groupCheckbox = document.createElement('input');
                groupCheckbox.type = 'checkbox';
                groupCheckbox.className = 'group__select-checkbox';
                groupCheckbox.checked = selected;
                groupCheckbox.setAttribute('aria-label', `Select group ${String(GroupName)}`);
                groupCheckbox.onclick = (e) => {
                    if (typeof onSelect === 'function') onSelect(String(GroupName), e.target.checked);
                };
                groupHeader.appendChild(groupCheckbox);
            }
        });

    // --- Drag handle removed - using drag button instead ---

    // Group title
    const groupTitle = document.createElement("h3");
    groupTitle.className = "group-title";
    groupTitle.textContent = String(GroupName);
    // No padding needed since drag handle removed
    groupHeader.appendChild(groupTitle);

    const GroupActions = document.createElement("div");
    GroupActions.className = "group-actions";

    // Helper for status feedback
    const showStatus = (container, msg, duration = 2000) => {
        let statusDiv = container.querySelector('.group-status-msg');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.className = 'group-status-msg';
            statusDiv.style.color = 'var(--accent, #FFD600)';
            statusDiv.style.margin = '4px 0 8px 0';
            statusDiv.style.fontSize = '12px';
            container.insertBefore(statusDiv, container.firstChild);
        }
        statusDiv.textContent = msg;
        setTimeout(() => { statusDiv.textContent = ""; }, duration);
    };

    // Group actions button removed

    // Edit button (rename)
    const RenameBtn = document.createElement("button");
    RenameBtn.textContent = "\u270e";
    RenameBtn.title = "Rename group";
    RenameBtn.setAttribute('aria-label', 'Rename group');
    RenameBtn.disabled = Locked;
    RenameBtn.className = "note-action-btn note-edit-btn";
    if (Locked) RenameBtn.classList.add('locked-hide');
    RenameBtn.onclick = async () => {
        if (Locked) return;
        const newName = await showInputModal({
            title: "Rename Group",
            label: "New group name:",
            value: String(GroupName),
            validate: (val) => val.trim() ? true : "Group name cannot be empty."
        });
        if (!newName || newName.trim() === "" || newName === String(GroupName)) return;
        if (Notes.some(n => n.group === newName)) {
            showStatus(Container, "A group with that name already exists.");
            return;
        }
        Notes.forEach(N => {
            if (N.group === GroupName) N.group = newName;
        });
        setNotes(location.href, Notes, (err) => {
            if (err) {
                showStatus(Container, "Failed to rename group.");
                LogDev('Failed to rename group: ' + err, 'error');
                return;
            }
            renameGroup(String(GroupName), newName, (err2) => {
                if (err2) {
                    showStatus(Container, "Failed to rename group.");
                    LogDev('Failed to rename group: ' + err2, 'error');
                } else {
                    showStatus(Container, "Group renamed.");
                    RenderSidebar(Container);
                }
            });
        });
    };
    GroupActions.appendChild(RenameBtn);

    // Delete button
    const DeleteBtn = document.createElement("button");
    DeleteBtn.textContent = "\ud83d\uddd1";
    DeleteBtn.title = "Delete group";
    DeleteBtn.setAttribute('aria-label', 'Delete group');
    DeleteBtn.disabled = Locked;
    DeleteBtn.className = "note-action-btn note-delete-btn";
    if (Locked) DeleteBtn.classList.add('locked-hide');
    DeleteBtn.onclick = async () => {
        if (Locked) return;
        const confirmed = await showConfirmModal({
            title: "Delete Group",
            message: `Delete group "${String(GroupName)}" and all its notes?`,
            okText: "Delete",
            cancelText: "Cancel"
        });
        if (!confirmed) return;
        const NewNotes = Array.isArray(Notes) ? Notes.filter(N => N.group !== GroupName) : [];
        setNotes(location.href, NewNotes, (err) => {
            if (err) {
                showStatus(Container, "Failed to delete group.");
                LogDev('Failed to delete group: ' + err, 'error');
                return;
            }
            deleteGroup(String(GroupName), (err2) => {
                if (err2) {
                    showStatus(Container, "Failed to delete group.");
                    LogDev('Failed to delete group: ' + err2, 'error');
                } else {
                    showStatus(Container, "Group deleted.");
                    RenderSidebar(Container);
                }
            });
        });
    };
    GroupActions.appendChild(DeleteBtn);

    // Drag button (functional drag handle)
    const DragBtn = document.createElement("button");
    DragBtn.textContent = "⋮⋮";
    DragBtn.title = "Drag to move group";
    DragBtn.setAttribute('aria-label', 'Drag to move group');
    DragBtn.disabled = Locked;
    DragBtn.className = "note-action-btn note-drag-btn";
    if (Locked) DragBtn.classList.add('locked-hide');
    DragBtn.style.cursor = 'grab';
    DragBtn.draggable = true;
    
    // Drag event handlers
    DragBtn.addEventListener('dragstart', (e) => {
        if (Locked) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('group-name', GroupName);
        GroupDiv.classList.add('dragging-group');
        document.body.classList.add('body-dragging-groups');
    });
    
    DragBtn.addEventListener('dragend', () => {
        GroupDiv.classList.remove('dragging-group');
        document.body.classList.remove('body-dragging-groups');
        document.querySelectorAll('.group-dropzone-outer.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    
    DragBtn.addEventListener('mousedown', () => {
        if (!Locked) {
            DragBtn.style.cursor = 'grabbing';
        }
    });
    DragBtn.addEventListener('mouseup', () => {
        DragBtn.style.cursor = 'grab';
    });
    DragBtn.addEventListener('mouseleave', () => {
        DragBtn.style.cursor = 'grab';
    });
    
    GroupActions.appendChild(DragBtn);

    groupHeader.appendChild(GroupActions);
    GroupDiv.appendChild(groupHeader);

    // --- Drop zone at the top of every group (for dropping notes into empty groups) ---
    const groupDropZone = document.createElement("div");
    groupDropZone.className = "note-dropzone group-dropzone";
    groupDropZone.tabIndex = 0;
    groupDropZone.setAttribute('aria-label', `Drop notes into group ${GroupName}`);
    groupDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        groupDropZone.classList.add('drag-over');
    });
    groupDropZone.addEventListener('dragleave', () => {
        groupDropZone.classList.remove('drag-over');
    });
    groupDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        groupDropZone.classList.remove('drag-over');
        document.body.classList.remove('body-dragging-groups');
        const draggedNoteId = e.dataTransfer.getData('note-id');
        if (!draggedNoteId) return;
        getNotes(location.href, (notesRaw) => {
            const notes = Array.isArray(notesRaw) ? notesRaw : [];
            const draggedIdx = notes.findIndex(n => n.id === draggedNoteId);
            if (draggedIdx === -1) return;
            notes[draggedIdx].group = GroupName;
            // Move to start of group
            const [draggedNote] = notes.splice(draggedIdx, 1);
            // Find first note in this group
            let firstIdx = notes.findIndex(n => n.group === GroupName);
            if (firstIdx === -1) {
                notes.push(draggedNote);
            } else {
                notes.splice(firstIdx, 0, draggedNote);
            }
            setNotes(location.href, notes, (err) => {
                if (err) {
                    showStatus(Container, 'Failed to save group. Please try again.');
                    LogDev('Failed to save group: ' + err, 'error');
                    return;
                }
                RenderSidebar(Container);
            });
        });
    });
    GroupDiv.appendChild(groupDropZone);

    // Render notes in this group
    groupNotes.forEach(note => {
        const noteElem = renderNote({
            Note: note,
            GroupName,
            Notes,
            Locked,
            Container,
            RenderSidebar,
            highlight,
            selected: selectedNoteIds.has(note.id),
            onSelect: onNoteSelect
        });
        GroupDiv.appendChild(noteElem);
    });

    // --- Drop zone at the end of the group ---
    const endDropZone = document.createElement('div');
    endDropZone.className = 'note-dropzone end-dropzone';
    endDropZone.tabIndex = 0;
    endDropZone.setAttribute('aria-label', `Drop note at end of group ${GroupName}`);
    endDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        endDropZone.classList.add('drag-over');
    });
    endDropZone.addEventListener('dragleave', () => {
        endDropZone.classList.remove('drag-over');
    });
    endDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        endDropZone.classList.remove('drag-over');
        document.body.classList.remove('body-dragging-groups');
        const draggedNoteId = e.dataTransfer.getData('note-id');
        if (!draggedNoteId) return;
        getNotes(location.href, (notesRaw) => {
            const notes = Array.isArray(notesRaw) ? notesRaw : [];
            const draggedIdx = notes.findIndex(n => n.id === draggedNoteId);
            if (draggedIdx === -1) return;
            notes[draggedIdx].group = GroupName;
            // Move to end of group
            const [draggedNote] = notes.splice(draggedIdx, 1);
            // Find last note in this group
            let lastIdx = notes.findLastIndex(n => n.group === GroupName);
            if (lastIdx === -1) {
                notes.push(draggedNote);
            } else {
                notes.splice(lastIdx + 1, 0, draggedNote);
            }
            setNotes(location.href, notes, (err) => {
                if (err) {
                    showStatus(Container, 'Failed to save group. Please try again.');
                    LogDev('Failed to save group: ' + err, 'error');
                    return;
                }
                RenderSidebar(Container);
            });
        });
    });
    GroupDiv.appendChild(endDropZone);

    // --- Wrap group in a container with the outer drop zone for reordering ---
    const wrapper = document.createElement('div');
    if (!Locked) {
        // Outer drop zone for group drag-and-drop
        const outerDropZone = document.createElement('div');
        outerDropZone.className = 'group-dropzone-outer';
        outerDropZone.tabIndex = 0;
        outerDropZone.setAttribute('aria-label', `Drop group before ${GroupName}`);
        // Make the drop zone visually obvious
        outerDropZone.style.height = '12px';
        outerDropZone.style.background = 'rgba(255,255,0,0.15)';
        outerDropZone.style.borderTop = '2px dashed var(--accent, #FFD600)';
        outerDropZone.style.margin = '0 0 2px 0';
        outerDropZone.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('group-name')) {
                e.preventDefault();
                outerDropZone.classList.add('drag-over');
                outerDropZone.style.background = 'rgba(255,255,0,0.35)';
            }
        });
        outerDropZone.addEventListener('dragleave', () => {
            outerDropZone.classList.remove('drag-over');
            outerDropZone.style.background = 'rgba(255,255,0,0.15)';
        });
        outerDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            outerDropZone.classList.remove('drag-over');
            outerDropZone.style.background = 'rgba(255,255,0,0.15)';
            document.body.classList.remove('body-dragging-groups');
            const draggedGroup = e.dataTransfer.getData('group-name');
            if (!draggedGroup || draggedGroup === GroupName) return;
            // Defensive: Ensure AllGroups is an array of strings
            const safeGroups = Array.isArray(AllGroups) ? AllGroups.map(g => typeof g === 'string' ? g : String(g)) : [];
            const idxFrom = safeGroups.indexOf(draggedGroup);
            const idxTo = safeGroups.indexOf(GroupName);
            if (idxFrom === -1 || idxTo === -1) return;
            const newGroups = [...safeGroups];
            newGroups.splice(idxFrom, 1);
            newGroups.splice(idxTo, 0, draggedGroup);
            setGroups(newGroups, (err) => {
                if (err) {
                    showStatus(Container, 'Failed to save group. Please try again.');
                    LogDev('Failed to save group: ' + err, 'error');
                    return;
                }
                // Fetch updated group order and re-render
                import('../storage.js').then(({ getGroups }) => {
                    getGroups((err2, updatedGroups) => {
                        if (err2) {
                            showStatus(Container, 'Failed to reload groups.');
                            LogDev('Failed to reload groups: ' + err2, 'error');
                        }
                        RenderSidebar(Container);
                    });
                });
            });
        });
        wrapper.appendChild(outerDropZone);
    }
    wrapper.appendChild(GroupDiv);
    return wrapper;
}