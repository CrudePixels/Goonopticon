import { GetNotes, SetNotes } from './storage.js';
import { ParseTime } from './logic.js';
import { LogDev } from '../log.js';
import { showInputModal, showConfirmModal } from './modal.js';

// Helper to highlight search matches
function highlightText(text, search)
{
    if (!search) return text;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

export function renderNote({ Note, GroupName, Notes, Locked, Container, RenderSidebar, highlight })
{
    try
    {
        // --- Drop zone before each note (for drag-and-drop) ---
        const dropZone = document.createElement("div");
        dropZone.className = "note-dropzone";
        dropZone.tabIndex = 0;
        dropZone.setAttribute('aria-label', `Drop note before ${Note.text}`);
        dropZone.addEventListener('dragover', (e) =>
        {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () =>
        {
            dropZone.classList.remove('drag-over');
        });
        dropZone.addEventListener('drop', (e) =>
        {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const draggedNoteId = e.dataTransfer.getData('note-id');
            if (!draggedNoteId) return;
            GetNotes(location.href, (notesRaw) =>
            {
                const notes = Array.isArray(notesRaw) ? notesRaw : [];
                const draggedIdx = notes.findIndex(n => n.id === draggedNoteId);
                const targetIdx = notes.findIndex(n => n.id === Note.id);
                if (draggedIdx === -1 || targetIdx === -1) return;
                notes[draggedIdx].group = GroupName;
                const [draggedNote] = notes.splice(draggedIdx, 1);
                let insertIdx = targetIdx;
                if (draggedIdx < targetIdx) insertIdx--;
                notes.splice(insertIdx, 0, draggedNote);
                SetNotes(location.href, notes, () => RenderSidebar(Container));
            });
        });

        // --- The note itself ---
        const NoteDiv = document.createElement("div");
        NoteDiv.className = "note-item";
        NoteDiv.dataset.noteId = Note.id;
        NoteDiv.draggable = !Locked;
        NoteDiv.tabIndex = 0;
        NoteDiv.setAttribute('aria-label', `Note: ${Note.text}`);

        if (!Note.time)
        {
            NoteDiv.classList.add('no-timestamp');
        }

        // Drag and drop handlers
        NoteDiv.addEventListener('dragstart', (e) =>
        {
            if (Locked) return e.preventDefault();
            e.dataTransfer.setData('note-id', Note.id);
            document.body.classList.add('body-dragging-notes');
        });
        NoteDiv.addEventListener('dragend', () =>
        {
            document.body.classList.remove('body-dragging-notes');
        });

        // --- Note title row: timestamp + text ---
        const titleRow = document.createElement("div");
        titleRow.className = "note-title-row";
        titleRow.draggable = !Locked;

        // Drag and drop handlers for title row
        titleRow.addEventListener('dragstart', (e) =>
        {
            if (Locked) return e.preventDefault();
            e.dataTransfer.setData('note-id', Note.id);
            document.body.classList.add('body-dragging-notes');
        });
        titleRow.addEventListener('dragend', () =>
        {
            document.body.classList.remove('body-dragging-notes');
        });

        // Timestamp (only if present)
        if (Note.time)
        {
            const timeSpan = document.createElement("span");
            timeSpan.className = "note-timestamp";
            timeSpan.textContent = Note.time;
            timeSpan.title = "Jump to timestamp";
            timeSpan.style.cursor = "pointer";
            timeSpan.setAttribute('aria-label', 'Jump to timestamp');
            timeSpan.onclick = () =>
            {
                const v = document.querySelector("video");
                if (v)
                {
                    v.currentTime = ParseTime(Note.time);
                    v.play();
                }
            };
            titleRow.appendChild(timeSpan);
        }

        // Note text
        const textSpan = document.createElement("span");
        textSpan.className = "note-text";
        if (highlight)
        {
            textSpan.innerHTML = highlightText(Note.text, highlight);
        } else
        {
            textSpan.textContent = Note.text;
        }
        titleRow.appendChild(textSpan);

        // --- Note actions row ---
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "note-actions";

        // Prevent drag from action buttons
        actionsDiv.addEventListener('mousedown', (e) =>
        {
            e.stopPropagation();
        });
        actionsDiv.addEventListener('dragstart', (e) =>
        {
            e.stopPropagation();
            e.preventDefault();
        });

        // Helper for status feedback
        function showStatus(container, msg, duration = 2000)
        {
            let statusDiv = container.querySelector('.note-status-msg');
            if (!statusDiv)
            {
                statusDiv = document.createElement('div');
                statusDiv.className = 'note-status-msg';
                statusDiv.style.color = '#FFD600';
                statusDiv.style.margin = '4px 0 8px 0';
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
        editBtn.textContent = "✎";
        editBtn.disabled = Locked;
        if (Locked) editBtn.classList.add('locked-hide');
        editBtn.onclick = async () =>
        {
            if (Locked) return;
            const newText = await showInputModal({
                title: "Edit Note",
                label: "Note text:",
                value: Note.text,
                validate: (val) => val.trim() ? true : "Note text cannot be empty."
            });
            if (newText === null) return;

            let newTime = Note.time;
            if (Note.time)
            {
                newTime = await showInputModal({
                    title: "Edit Timestamp",
                    label: "Timestamp (e.g. 1:23:45):",
                    value: Note.time,
                    validate: (val) =>
                        /^(\d+:)?[0-5]?\d:[0-5]\d$/.test(val.trim())
                            ? true
                            : "Please enter a valid timestamp (mm:ss or h:mm:ss)."
                });
                if (newTime === null) return;
            }

            GetNotes(location.href, (notesRaw) =>
            {
                const notes = Array.isArray(notesRaw) ? notesRaw : [];
                const idx = notes.findIndex(n => n.id === Note.id);
                if (idx !== -1)
                {
                    let changed = false;
                    if (newText.trim() !== "" && notes[idx].text !== newText.trim())
                    {
                        notes[idx].text = newText.trim();
                        changed = true;
                    }
                    if (Note.time && typeof newTime === "string" && newTime.trim() !== "" && notes[idx].time !== newTime.trim())
                    {
                        notes[idx].time = newTime.trim();
                        changed = true;
                    }
                    if (changed)
                    {
                        SetNotes(location.href, notes, (err) =>
                        {
                            if (err) showStatus(Container, "Failed to edit note.");
                            else RenderSidebar(Container);
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
        tagBtn.textContent = "🏷️";
        tagBtn.disabled = Locked;
        if (Locked) tagBtn.classList.add('locked-hide');
        tagBtn.onclick = async () =>
        {
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
            GetNotes(location.href, (notesRaw) =>
            {
                const notes = Array.isArray(notesRaw) ? notesRaw : [];
                const idx = notes.findIndex(n => n.id === Note.id);
                if (idx !== -1)
                {
                    notes[idx].tags = tags;
                    SetNotes(location.href, notes, (err) =>
                    {
                        if (err) showStatus(Container, "Failed to edit tags.");
                        else RenderSidebar(Container);
                    });
                }
            });
        };
        actionsDiv.appendChild(tagBtn);

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "note-delete-btn";
        deleteBtn.title = "Delete note";
        deleteBtn.setAttribute('aria-label', 'Delete note');
        deleteBtn.textContent = "🗑";
        deleteBtn.disabled = Locked;
        if (Locked) deleteBtn.classList.add('locked-hide');
        deleteBtn.onclick = async () =>
        {
            if (Locked) return;
            const confirmed = await showConfirmModal({
                title: "Delete Note",
                message: "Are you sure you want to delete this note?",
                okText: "Delete",
                cancelText: "Cancel"
            });
            if (!confirmed) return;
            GetNotes(location.href, (notesRaw) =>
            {
                const notes = Array.isArray(notesRaw) ? notesRaw : [];
                const idx = notes.findIndex(n => n.id === Note.id);
                if (idx !== -1)
                {
                    notes.splice(idx, 1);
                    SetNotes(location.href, notes, (err) =>
                    {
                        if (err) showStatus(Container, "Failed to delete note.");
                        else RenderSidebar(Container);
                    });
                }
            });
        };
        actionsDiv.appendChild(deleteBtn);

        // Copy button (only if timestamp is present)
        if (Note.time)
        {
            const copyBtn = document.createElement("button");
            copyBtn.className = "note-copy-btn";
            copyBtn.title = "Copy video URL & timestamp";
            copyBtn.setAttribute('aria-label', 'Copy video URL and timestamp');
            copyBtn.textContent = "📋";
            copyBtn.disabled = Locked;
            if (Locked) copyBtn.classList.add('locked-hide');
            copyBtn.onclick = () =>
            {
                let url = location.href;
                if (Note.time)
                {
                    // Try to add timestamp to URL (YouTube style)
                    if (url.includes("youtube.com") && !url.includes("t="))
                    {
                        url += (url.includes("?") ? "&" : "?") + "t=" + encodeURIComponent(Note.time);
                    }
                }
                navigator.clipboard.writeText(url)
                    .then(() =>
                    {
                        showStatus(Container, "Copied!");
                    })
                    .catch(() =>
                    {
                        showStatus(Container, "Failed to copy.");
                    });
            };
            actionsDiv.appendChild(copyBtn);
        }

        // --- Compose the note DOM ---
        NoteDiv.appendChild(titleRow);

        // (Optional) Tags - always as separate elements
        const tagsArr = Array.isArray(Note.tags)
            ? Note.tags
            : (typeof Note.tags === "string" ? Note.tags.split(",").map(t => t.trim()).filter(Boolean) : []);
        if (tagsArr.length > 0)
        {
            const tagsDiv = document.createElement("span");
            tagsDiv.className = "note-tags";
            tagsArr.forEach(tag =>
            {
                const tagSpan = document.createElement("span");
                tagSpan.className = "note-tag";
                tagSpan.innerHTML = highlight ? highlightText(tag, highlight) : tag;
                tagsDiv.appendChild(tagSpan);
            });
            NoteDiv.appendChild(tagsDiv);
        }

        NoteDiv.appendChild(actionsDiv);

        // Return a fragment containing the drop zone and the note
        const fragment = document.createDocumentFragment();
        fragment.appendChild(dropZone);
        fragment.appendChild(NoteDiv);
        return fragment;
    } catch (e)
    {
        console.error("renderNote error:", e);
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Note failed to render";
        errorDiv.style.color = "red";
        return errorDiv;
    }
}