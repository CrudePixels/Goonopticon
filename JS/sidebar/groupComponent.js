import { renderNote } from './noteComponent.js';
import { SetNotes, SetPinnedGroups, RenameGroup, DeleteGroup, GetNotes, SetGroups } from './storage.js';
import { LogDev } from '../log.js';

export function renderGroup({ GroupName, Notes, PinnedGroups, Locked, Container, RenderSidebar })
{
    const groupNotes = Notes.filter(n => n.group === GroupName);

    const GroupDiv = document.createElement("div");
    GroupDiv.className = "note-group";
    GroupDiv.dataset.group = GroupName;

    // --- Drop zone at the top of every group (for dropping into empty groups) ---
    const groupDropZone = document.createElement("div");
    groupDropZone.className = "note-dropzone group-dropzone";
    groupDropZone.tabIndex = 0;
    groupDropZone.setAttribute('aria-label', `Drop notes into group ${GroupName}`);
    groupDropZone.addEventListener('dragover', (e) =>
    {
        e.preventDefault();
        groupDropZone.classList.add('drag-over');
    });
    groupDropZone.addEventListener('dragleave', () =>
    {
        groupDropZone.classList.remove('drag-over');
    });
    groupDropZone.addEventListener('drop', (e) =>
    {
        e.preventDefault();
        groupDropZone.classList.remove('drag-over');
        const draggedNoteId = e.dataTransfer.getData('note-id');
        if (!draggedNoteId) return;

        GetNotes(location.href, (notes) =>
        {
            const draggedIdx = notes.findIndex(n => n.id === draggedNoteId);
            if (draggedIdx === -1) return;
            notes[draggedIdx].group = GroupName;
            // Move to start of group
            const [draggedNote] = notes.splice(draggedIdx, 1);
            // Find first note in this group
            let firstIdx = notes.findIndex(n => n.group === GroupName);
            if (firstIdx === -1)
            {
                // Group is empty, just push
                notes.push(draggedNote);
            } else
            {
                notes.splice(firstIdx, 0, draggedNote);
            }
            SetNotes(location.href, notes, () => RenderSidebar(Container));
        });
    });
    GroupDiv.appendChild(groupDropZone);

    // Group title row
    const TitleRow = document.createElement("div");
    TitleRow.className = "group-title-row";

    const GroupTitle = document.createElement("span");
    GroupTitle.className = "group-title";
    GroupTitle.textContent = GroupName;

    const GroupActions = document.createElement("div");
    GroupActions.className = "group-actions";

    // Rename button
    const RenameBtn = document.createElement("button");
    RenameBtn.textContent = "✎";
    RenameBtn.title = "Rename group";
    RenameBtn.disabled = Locked;
    RenameBtn.onclick = () =>
    {
        if (Locked) return;
        const newName = prompt("Rename group:", GroupName);
        if (!newName || newName === GroupName) return;
        Notes.forEach(N =>
        {
            if (N.group === GroupName) N.group = newName;
        });
        SetNotes(location.href, Notes, () =>
        {
            RenameGroup(GroupName, newName, () => RenderSidebar(Container));
        });
    };
    GroupActions.appendChild(RenameBtn);

    // Pin/Unpin button
    const PinBtn = document.createElement("button");
    const isPinned = PinnedGroups.includes(GroupName);
    PinBtn.textContent = isPinned ? "📌" : "📍";
    PinBtn.title = isPinned ? "Unpin group" : "Pin group";
    PinBtn.disabled = Locked;
    PinBtn.onclick = () =>
    {
        let newPins;
        if (isPinned)
        {
            newPins = PinnedGroups.filter(g => g !== GroupName);
        } else
        {
            newPins = PinnedGroups.concat([GroupName]);
        }
        SetPinnedGroups(newPins, () => RenderSidebar(Container));
    };
    GroupActions.appendChild(PinBtn);

    // Delete button
    const DeleteBtn = document.createElement("button");
    DeleteBtn.textContent = "🗑";
    DeleteBtn.title = "Delete group";
    DeleteBtn.disabled = Locked;
    DeleteBtn.onclick = () =>
    {
        if (Locked) return;
        if (confirm(`Delete group "${GroupName}" and all its notes?`))
        {
            const NewNotes = Notes.filter(N => N.group !== GroupName);
            SetNotes(location.href, NewNotes, () =>
            {
                DeleteGroup(GroupName, () => RenderSidebar(Container));
            });
        }
    };
    GroupActions.appendChild(DeleteBtn);

    TitleRow.appendChild(GroupTitle);
    TitleRow.appendChild(GroupActions);

    GroupDiv.appendChild(TitleRow);

    // Notes in group
    groupNotes.forEach((Note, noteIdx) =>
    {
        GroupDiv.appendChild(renderNote({
            Note,
            GroupName,
            Notes,
            Locked,
            Container,
            RenderSidebar
        }));
    });

    // --- If group is empty, show a message or visual cue ---
    if (groupNotes.length === 0)
    {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "empty-group-msg";
        emptyMsg.textContent = "Drop notes here";
        GroupDiv.appendChild(emptyMsg);
    }

    return GroupDiv;
}