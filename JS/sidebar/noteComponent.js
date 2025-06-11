import { GetNotes, SetNotes } from './storage.js';
import { ParseTime } from './logic.js';
import { LogDev } from '../log.js';

export function renderNote({ Note, GroupName, Notes, Locked, Container, RenderSidebar })
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

        // --- Note content: timestamp, text, tags, and actions ---
        const contentDiv = document.createElement("div");
        contentDiv.className = "note-content";

        // Timestamp
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
            contentDiv.appendChild(timeSpan);
        }

        // Note text
        const textSpan = document.createElement("span");
        textSpan.className = "note-text";
        textSpan.textContent = Note.text;
        contentDiv.appendChild(textSpan);

        // Tags display
        const tagsArr = Array.isArray(Note.tags) ? Note.tags : [];
        if (tagsArr.length > 0)
        {
            const tagsDiv = document.createElement("span");
            tagsDiv.className = "note-tags";
            tagsArr.forEach(tag =>
            {
                const tagSpan = document.createElement("span");
                tagSpan.className = "note-tag";
                tagSpan.textContent = tag;
                tagsDiv.appendChild(tagSpan);
            });
            contentDiv.appendChild(tagsDiv);
        }

        // Actions
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "note-actions";

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
        editBtn.onclick = () =>
        {
            if (Locked) return;
            const newText = prompt("Edit note text:", Note.text);
            if (newText === null) return;
            const newTime = prompt("Edit timestamp (e.g. 1:23:45):", Note.time || "");
            if (newTime === null) return;
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
                    if (typeof newTime === "string" && newTime.trim() !== "" && notes[idx].time !== newTime.trim())
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
        tagBtn.onclick = () =>
        {
            if (Locked) return;
            const currentTags = tagsArr.join(", ");
            const tagInput = prompt("Edit tags (comma separated):", currentTags);
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
        deleteBtn.onclick = () =>
        {
            if (Locked) return;
            const confirmed = confirm("Delete this note?");
            if (confirmed)
            {
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
            }
        };
        actionsDiv.appendChild(deleteBtn);

        // Copy button
        const copyBtn = document.createElement("button");
        copyBtn.className = "note-copy-btn";
        copyBtn.title = "Copy video URL & timestamp";
        copyBtn.setAttribute('aria-label', 'Copy video URL and timestamp');
        copyBtn.textContent = "📋";
        copyBtn.disabled = Locked;
        copyBtn.onclick = () =>
        {
            let url = location.href.split('#')[0];
            const v = document.querySelector("video");
            let seconds = v ? Math.floor(ParseTime(Note.time)) : Math.floor(ParseTime(Note.time));
            url += (url.includes('?') ? '&' : '?') + 't=' + seconds;
            navigator.clipboard.writeText(url).then(() =>
            {
                showStatus(Container, "Copied!");
            }, () =>
            {
                showStatus(Container, "Copy failed.");
            });
        };
        actionsDiv.appendChild(copyBtn);

        contentDiv.appendChild(actionsDiv);
        NoteDiv.appendChild(contentDiv);

        // Return both drop zone and note
        const wrapper = document.createElement("div");
        wrapper.appendChild(dropZone);
        wrapper.appendChild(NoteDiv);
        return wrapper;
    } catch (err)
    {
        LogDev("renderNote error: " + err, "error");
        const errorDiv = document.createElement("div");
        errorDiv.style.color = "red";
        errorDiv.textContent = "Error rendering note.";
        return errorDiv;
    }
}