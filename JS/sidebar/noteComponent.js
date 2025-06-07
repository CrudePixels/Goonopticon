import { GetNotes, SetNotes } from './storage.js';
import { ParseTime } from './logic.js';

export function renderNote({ Note, GroupName, Notes, Locked, Container, RenderSidebar })
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

        GetNotes(location.href, (notes) =>
        {
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
    NoteDiv.draggable = true;
    NoteDiv.tabIndex = 0;
    NoteDiv.setAttribute('aria-label', `Note: ${Note.text}`);

    // Drag and drop handlers
    NoteDiv.addEventListener('dragstart', (e) =>
    {
        e.dataTransfer.setData('note-id', Note.id);
        e.dataTransfer.setData('source-group', GroupName);
        NoteDiv.classList.add('dragging');
    });
    NoteDiv.addEventListener('dragend', () =>
    {
        NoteDiv.classList.remove('dragging');
        document.querySelectorAll('.note-dropzone.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    // --- Note content: timestamp, text, and actions ---
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

    // Actions
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "note-actions";

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "note-edit-btn";
    editBtn.title = "Edit note";
    editBtn.textContent = "✎";
    editBtn.onclick = () =>
    {
        const newText = prompt("Edit note:", Note.text);
        if (newText !== null && newText.trim() !== "")
        {
            GetNotes(location.href, (notes) =>
            {
                const idx = notes.findIndex(n => n.id === Note.id);
                if (idx !== -1)
                {
                    notes[idx].text = newText.trim();
                    SetNotes(location.href, notes, () => RenderSidebar(Container));
                }
            });
        }
    };
    actionsDiv.appendChild(editBtn);

    // Tag button
    const tagBtn = document.createElement("button");
    tagBtn.className = "note-tag-btn";
    tagBtn.title = "Edit tags";
    tagBtn.textContent = "🏷️";
    tagBtn.onclick = () =>
    {
        alert("Tag editing not implemented in this snippet.");
    };
    actionsDiv.appendChild(tagBtn);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "note-delete-btn";
    deleteBtn.title = "Delete note";
    deleteBtn.textContent = "🗑";
    deleteBtn.onclick = () =>
    {
        if (confirm("Delete this note?"))
        {
            GetNotes(location.href, (notes) =>
            {
                const idx = notes.findIndex(n => n.id === Note.id);
                if (idx !== -1)
                {
                    notes.splice(idx, 1);
                    SetNotes(location.href, notes, () => RenderSidebar(Container));
                }
            });
        }
    };
    actionsDiv.appendChild(deleteBtn);

    contentDiv.appendChild(actionsDiv);
    NoteDiv.appendChild(contentDiv);

    // Return both drop zone and note
    const wrapper = document.createElement("div");
    wrapper.appendChild(dropZone);
    wrapper.appendChild(NoteDiv);
    return wrapper;
}