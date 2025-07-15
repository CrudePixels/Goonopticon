// Note Component
import { setNotes, getNotes } from '../storage.js';
import { LogDev } from '../../log.js';
import { showInputModal, showConfirmModal } from '../modal.js';
import * as browser from 'webextension-polyfill';

/**
 * Renders a note in the sidebar.
 * @param {Object} props - Note properties and handlers.
 * @returns {HTMLElement} The note DOM element.
 */
export function renderNote(props) {
    const {
        Note,
        GroupName,
        Notes,
        Locked,
        Container,
        RenderSidebar,
        highlight,
        selected = false,
        onSelect
    } = props;

    try {
        // --- Drop zone before each note (for drag-and-drop) ---
        let dropZone = null;
        if (!Locked) {
            dropZone = document.createElement("div");
            dropZone.className = "note-dropzone";
            dropZone.tabIndex = 0;
            dropZone.setAttribute('aria-label', `Drop note before ${Note.text}`);
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                const draggedNoteId = e.dataTransfer.getData('note-id');
                if (!draggedNoteId) return;
                getNotes(location.href, (notesRaw) => {
                    const notes = Array.isArray(notesRaw) ? notesRaw : [];
                    const draggedIdx = notes.findIndex(n => n.id === draggedNoteId);
                    const targetIdx = notes.findIndex(n => n.id === Note.id);
                    if (draggedIdx === -1 || targetIdx === -1) return;
                    notes[draggedIdx].group = GroupName;
                    const [draggedNote] = notes.splice(draggedIdx, 1);
                    let insertIdx = targetIdx;
                    if (draggedIdx < targetIdx) insertIdx--;
                    notes.splice(insertIdx, 0, draggedNote);
                    setNotes(location.href, notes, (err) => {
                        if (err) { showStatus(Container, 'Failed to save/load note. Please try again.'); LogDev('Failed to save/load note: ' + err, 'error'); return; }
                        RenderSidebar(Container);
                    });
                });
            });
        }

        // --- The note itself ---
        const NoteDiv = document.createElement("div");
        NoteDiv.className = "note-item";
        NoteDiv.dataset.noteId = Note.id;
        NoteDiv.draggable = !Locked;
        NoteDiv.tabIndex = 0;
        NoteDiv.setAttribute('aria-label', `Note: ${Note.text}`);
        let dragStartTimeout = null;
        let dragAllowed = false;
        NoteDiv.addEventListener('mousedown', (e) => {
            if (Locked) return;
            dragAllowed = false;
            dragStartTimeout = setTimeout(() => {
                dragAllowed = true;
                NoteDiv.draggable = true;
            }, 50); // Lowered from 150ms to 50ms for faster drag
        });
        NoteDiv.addEventListener('mouseup', (e) => {
            clearTimeout(dragStartTimeout);
            NoteDiv.draggable = false;
        });
        NoteDiv.addEventListener('mouseleave', (e) => {
            clearTimeout(dragStartTimeout);
            NoteDiv.draggable = false;
        });
        NoteDiv.addEventListener('dragstart', (e) => {
            if (Locked || !dragAllowed) {
                e.preventDefault();
                return;
            }
        });
        // Always show grab cursor
        NoteDiv.style.cursor = 'grab';
        NoteDiv.addEventListener('mousedown', () => {
            NoteDiv.style.cursor = 'grabbing';
        });
        NoteDiv.addEventListener('mouseup', () => {
            NoteDiv.style.cursor = 'grab';
        });
        NoteDiv.addEventListener('mouseleave', () => {
            NoteDiv.style.cursor = 'grab';
        });

        // Bulk select checkbox - only show if bulk actions are enabled
        browser.storage.local.get(['PodAwful::EnableBulkActions'])
            .then(result => {
                const bulkActionsEnabled = result['PodAwful::EnableBulkActions'] === true;
                if (bulkActionsEnabled) {
                    const noteCheckbox = document.createElement('input');
                    noteCheckbox.type = 'checkbox';
                    noteCheckbox.className = 'note__select-checkbox';
                    noteCheckbox.checked = selected;
                    noteCheckbox.setAttribute('aria-label', `Select note: ${Note.text}`);
                    noteCheckbox.onclick = (e) => {
                        if (typeof onSelect === 'function') onSelect(Note.id, e.target.checked);
                    };
                    NoteDiv.appendChild(noteCheckbox);
                }
            });

        // --- Note content row ---
        const contentRow = document.createElement("div");
        contentRow.className = "note-content-row";

        // --- Note content column ---
        const contentCol = document.createElement("div");
        contentCol.className = "note-content-col";

        // Timestamp (only if present)
        if (Note.time) {
            const timeSpan = document.createElement("span");
            timeSpan.className = "note-timestamp";
            timeSpan.textContent = Note.time;
            timeSpan.title = "Jump to timestamp";
            timeSpan.style.cursor = "pointer";
            timeSpan.setAttribute('aria-label', 'Jump to timestamp');
            timeSpan.onclick = () => {
                const v = document.querySelector("video");
                if (v) {
                    v.currentTime = parseTime(Note.time);
                    v.play();
                }
            };
            contentCol.appendChild(timeSpan);


        }

        // Note text
        const textSpan = document.createElement("span");
        textSpan.className = "note-text";
        if (highlight) {
            textSpan.innerHTML = highlightText(String(Note.text), highlight);
        } else {
            textSpan.textContent = String(Note.text);
        }
        contentCol.appendChild(textSpan);

        // Tags (if present)
        if (Note.tags && Array.isArray(Note.tags) && Note.tags.length > 0) {
            const tagsDiv = document.createElement("div");
            tagsDiv.className = "note-tags";
            Note.tags.forEach(tag => {
                const tagSpan = document.createElement("span");
                tagSpan.className = "note-tag";
                tagSpan.textContent = tag;
                tagsDiv.appendChild(tagSpan);
            });
            contentCol.appendChild(tagsDiv);
        }

        contentRow.appendChild(contentCol);
        NoteDiv.appendChild(contentRow);

        // --- Note actions row ---
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "note-actions";

        // Prevent drag from action buttons
        actionsDiv.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        actionsDiv.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });

        // Helper for status feedback
        function showStatus(container, msg, duration = 2000) {
            let statusDiv = container.querySelector('.note-status-msg');
            if (!statusDiv) {
                statusDiv = document.createElement('div');
                statusDiv.className = 'note-status-msg';
                statusDiv.style.color = 'var(--accent, #FFD600)';
                statusDiv.style.margin = '4px 0 8px 0';
                statusDiv.style.fontSize = '12px';
                container.insertBefore(statusDiv, container.firstChild);
            }
            statusDiv.textContent = msg;
            setTimeout(() => { statusDiv.textContent = ""; }, duration);
        }

        // Edit button
        const editBtn = document.createElement("button");
        editBtn.className = "note-edit-btn";
        editBtn.title = "Edit note";
        editBtn.setAttribute('aria-label', 'Edit note');
        editBtn.textContent = "\u270e";
        editBtn.disabled = Locked;
        if (Locked) editBtn.classList.add('locked-hide');
        editBtn.onclick = async () => {
            if (Locked) return;
            const newText = await showInputModal({
                title: "Edit Note",
                label: "Note text:",
                value: String(Note.text),
                validate: (val) => val.trim() ? true : "Note text cannot be empty."
            });
            if (newText === null) return;
            const newTime = await showInputModal({
                title: "Edit Timestamp",
                label: "Timestamp (optional):",
                value: Note.time || "",
                placeholder: "e.g., 1:23 or 1:23:45"
            });
            if (newTime === null) return;

            getNotes(location.href, (notesRaw) => {
                const notes = Array.isArray(notesRaw) ? notesRaw : [];
                const idx = notes.findIndex(n => n.id === Note.id);
                if (idx !== -1) {
                    let changed = false;
                    if (newText.trim() !== "" && String(notes[idx].text) !== newText.trim()) {
                        notes[idx].text = newText.trim();
                        changed = true;
                    }
                    if (typeof newTime === "string" && newTime.trim() !== "" && String(notes[idx].time) !== newTime.trim()) {
                        notes[idx].time = newTime.trim();
                        changed = true;
                    }
                    if (changed) {
                        setNotes(location.href, notes, (err) => {
                            if (err) { showStatus(Container, "Failed to edit note."); LogDev('Failed to edit note: ' + err, 'error'); return; }
                            RenderSidebar(Container);
                        });
                    }
                }
            });
        };
        actionsDiv.appendChild(editBtn);

        // Tag button
        const tagBtn = document.createElement("button");
        tagBtn.className = "note-tag-btn";
        tagBtn.title = "Edit tags";
        tagBtn.setAttribute('aria-label', 'Edit tags');
        tagBtn.textContent = "\ud83c\udff7\ufe0f";
        tagBtn.disabled = Locked;
        if (Locked) tagBtn.classList.add('locked-hide');
        tagBtn.onclick = async () => {
            if (Locked) return;
            // Always treat tags as array of strings
            const currentTags = Array.isArray(Note.tags)
                ? Note.tags.join(", ")
                : (typeof Note.tags === "string" ? Note.tags : "");
            const tagInput = await showInputModal({
                title: "Edit Tags",
                label: "Tags (comma separated):",
                value: currentTags,
                validate: (val) => true // Optionally add validation for tags
            });
            if (tagInput === null) return;
            const tags = tagInput.split(",").map(t => t.trim()).filter(Boolean);
            getNotes(location.href, (notesRaw) => {
                const notes = Array.isArray(notesRaw) ? notesRaw : [];
                const idx = notes.findIndex(n => n.id === Note.id);
                if (idx !== -1) {
                    notes[idx].tags = tags;
                    setNotes(location.href, notes, (err) => {
                        if (err) { showStatus(Container, "Failed to edit tags."); LogDev('Failed to edit tags: ' + err, 'error'); return; }
                        RenderSidebar(Container);
                    });
                }
            });
        };
        actionsDiv.appendChild(tagBtn);

        // Copy timestamp URL button (only if note has a timestamp)
        if (Note.time && Note.time.trim()) {
            const copyBtn = document.createElement("button");
            copyBtn.className = "note-copy-btn";
            copyBtn.title = "Copy timestamp URL";
            copyBtn.setAttribute('aria-label', 'Copy timestamp URL');
            copyBtn.textContent = "\uD83D\uDCCB";
            copyBtn.disabled = Locked;
            if (Locked) copyBtn.classList.add('locked-hide');
            copyBtn.onclick = async () => {
                if (Locked) return;
                // Get the current video URL
                let url = window.location.href;
                // If the note has a timestamp, add it to the URL
                if (Note.time && Note.time.trim()) {
                    const seconds = parseTime(Note.time);
                    if (seconds > 0) {
                        // Remove any existing timestamp parameter
                        url = url.replace(/[?&]t=\d+/, '');
                        // Add the new timestamp parameter
                        const separator = url.includes('?') ? '&' : '?';
                        url += `${separator}t=${seconds}`;
                    }
                }
                try {
                    await navigator.clipboard.writeText(url);
                    showStatus(NoteDiv, 'URL copied!');
                } catch (err) {
                    console.error('Failed to copy URL:', err);
                    showStatus(NoteDiv, 'Failed to copy URL');
                }
            };
            actionsDiv.appendChild(copyBtn);
        }

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "note-delete-btn";
        deleteBtn.title = "Delete note";
        deleteBtn.setAttribute('aria-label', 'Delete note');
        deleteBtn.textContent = "\ud83d\uddd1";
        deleteBtn.disabled = Locked;
        if (Locked) deleteBtn.classList.add('locked-hide');
        deleteBtn.onclick = async () => {
            if (Locked) return;
            const confirmed = await showConfirmModal({
                title: "Delete Note",
                message: `Delete note "${String(Note.text)}"?`,
                okText: "Delete",
                cancelText: "Cancel"
            });
            if (!confirmed) return;
            getNotes(location.href, (notesRaw) => {
                const notes = Array.isArray(notesRaw) ? notesRaw : [];
                const newNotes = notes.filter(n => n.id !== Note.id);
                setNotes(location.href, newNotes, (err) => {
                    if (err) { showStatus(Container, "Failed to delete note."); LogDev('Failed to delete note: ' + err, 'error'); return; }
                    RenderSidebar(Container);
                });
            });
        };
        actionsDiv.appendChild(deleteBtn);

        NoteDiv.appendChild(actionsDiv);

        // --- Drag event handlers ---
        NoteDiv.addEventListener('dragstart', (e) => {
            if (Locked) {
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData('note-id', Note.id);
            NoteDiv.classList.add('dragging-note');
            document.body.classList.add('body-dragging-notes');
        });
        NoteDiv.addEventListener('dragend', () => {
            NoteDiv.classList.remove('dragging-note');
            document.body.classList.remove('body-dragging-notes');
            document.querySelectorAll('.note-dropzone.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        // --- Return the complete note structure ---
        const wrapper = document.createElement('div');
        if (dropZone) {
            wrapper.appendChild(dropZone);
        }
        wrapper.appendChild(NoteDiv);
        return wrapper;

    } catch (e) {
        LogDev('renderNote error: ' + e, 'error');
        const errorDiv = document.createElement('div');
        errorDiv.textContent = 'Note failed to render';
        errorDiv.style.color = 'var(--error, #c00)';
        return errorDiv;
    }
}

// Helper function to parse time strings
function parseTime(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}

// Helper function to highlight text
function highlightText(text, highlight) {
    if (!highlight) return text;
    const regex = new RegExp(`(${highlight})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
} 