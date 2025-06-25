import { renderNote } from './noteComponent.js';
import { SetNotes, SetGroups, RenameGroup, DeleteGroup, GetNotes } from './storage.js';
import { LogDev } from '../log.js';
import { showInputModal, showConfirmModal } from './modal.js';

export function renderGroup({ GroupName, Notes, PinnedGroups, Locked, Container, RenderSidebar, AllGroups })
{
    try
    {
        LogDev("Rendering group: " + GroupName, "render");
        const groupNotes = Array.isArray(Notes) ? Notes.filter(n => n.group === GroupName) : [];

        // --- Make the group container draggable ---
        const GroupDiv = document.createElement("div");
        GroupDiv.className = "note-group";
        GroupDiv.dataset.group = GroupName;
        GroupDiv.draggable = !Locked;
        GroupDiv.dataset.groupName = GroupName;

        GroupDiv.addEventListener('dragstart', (e) =>
        {
            if (Locked) return e.preventDefault();
            e.dataTransfer.setData('group-name', GroupName);
            GroupDiv.classList.add('dragging-group');
            document.body.classList.add('body-dragging-notes');
        });
        GroupDiv.addEventListener('dragend', () =>
        {
            GroupDiv.classList.remove('dragging-group');
            document.body.classList.remove('body-dragging-notes');
            document.querySelectorAll('.group-dropzone-outer.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        // --- Outer drop zone for group reordering ---
        const outerDropZone = document.createElement('div');
        outerDropZone.className = 'group-dropzone-outer';
        outerDropZone.tabIndex = 0;
        outerDropZone.setAttribute('aria-label', `Drop group before ${GroupName}`);
        outerDropZone.addEventListener('dragover', (e) =>
        {
            if (e.dataTransfer.types.includes('group-name'))
            {
                e.preventDefault();
                outerDropZone.classList.add('drag-over');
            }
        });
        outerDropZone.addEventListener('dragleave', () =>
        {
            outerDropZone.classList.remove('drag-over');
        });
        outerDropZone.addEventListener('drop', (e) =>
        {
            e.preventDefault();
            outerDropZone.classList.remove('drag-over');
            document.body.classList.remove('body-dragging-notes');
            const draggedGroup = e.dataTransfer.getData('group-name');
            if (!draggedGroup || draggedGroup === GroupName) return;

            // Reorder groups
            const idxFrom = AllGroups.indexOf(draggedGroup);
            const idxTo = AllGroups.indexOf(GroupName);
            if (idxFrom === -1 || idxTo === -1) return;
            const newGroups = [...AllGroups];
            newGroups.splice(idxFrom, 1);
            newGroups.splice(idxTo, 0, draggedGroup);

            SetGroups(newGroups, () =>
            {
                RenderSidebar(Container);
            });
        });

        // --- Drop zone at the top of every group (for dropping notes into empty groups) ---
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
            document.body.classList.remove('body-dragging-notes');
            const draggedNoteId = e.dataTransfer.getData('note-id');
            if (!draggedNoteId) return;

            GetNotes(location.href, (notesRaw) =>
            {
                const notes = Array.isArray(notesRaw) ? notesRaw : [];
                const draggedIdx = notes.findIndex(n => n.id === draggedNoteId);
                if (draggedIdx === -1) return;
                notes[draggedIdx].group = GroupName;
                // Move to start of group
                const [draggedNote] = notes.splice(draggedIdx, 1);
                // Find first note in this group
                let firstIdx = notes.findIndex(n => n.group === GroupName);
                if (firstIdx === -1)
                {
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

        // Helper for status feedback
        const showStatus = (msg, duration = 2000) =>
        {
            let statusDiv = Container.querySelector('.group-status-msg');
            if (!statusDiv)
            {
                statusDiv = document.createElement('div');
                statusDiv.className = 'group-status-msg';
                statusDiv.style.margin = '4px 0 8px 0';
                Container.insertBefore(statusDiv, Container.firstChild);
            }
            statusDiv.textContent = msg;
            setTimeout(() => { statusDiv.textContent = ""; }, duration);
        };

        // Rename button
        const RenameBtn = document.createElement("button");
        RenameBtn.textContent = "✎";
        RenameBtn.title = "Rename group";
        RenameBtn.setAttribute('aria-label', 'Rename group');
        RenameBtn.disabled = Locked;
        RenameBtn.className = "note-action-btn note-edit-btn";
        if (Locked) RenameBtn.classList.add('locked-hide');
        RenameBtn.onclick = async () =>
        {
            if (Locked) return;
            const newName = await showInputModal({
                title: "Rename Group",
                label: "New group name:",
                value: GroupName,
                validate: (val) => val.trim() ? true : "Group name cannot be empty."
            });
            if (!newName || newName.trim() === "" || newName === GroupName) return;
            if (Notes.some(n => n.group === newName))
            {
                showStatus("A group with that name already exists.");
                return;
            }
            Notes.forEach(N =>
            {
                if (N.group === GroupName) N.group = newName;
            });
            SetNotes(location.href, Notes, (err) =>
            {
                if (err)
                {
                    showStatus("Failed to rename group.");
                    return;
                }
                RenameGroup(GroupName, newName, (err2) =>
                {
                    if (err2)
                    {
                        showStatus("Failed to rename group.");
                    } else
                    {
                        showStatus("Group renamed.");
                        RenderSidebar(Container);
                    }
                });
            });
        };
        GroupActions.appendChild(RenameBtn);

        // Delete button
        const DeleteBtn = document.createElement("button");
        DeleteBtn.textContent = "🗑";
        DeleteBtn.title = "Delete group";
        DeleteBtn.setAttribute('aria-label', 'Delete group');
        DeleteBtn.disabled = Locked;
        DeleteBtn.className = "note-action-btn note-delete-btn";
        if (Locked) DeleteBtn.classList.add('locked-hide');
        DeleteBtn.onclick = async () =>
        {
            if (Locked) return;
            const confirmed = await showConfirmModal({
                title: "Delete Group",
                message: `Delete group "${GroupName}" and all its notes?`,
                okText: "Delete",
                cancelText: "Cancel"
            });
            if (!confirmed) return;
            const NewNotes = Array.isArray(Notes) ? Notes.filter(N => N.group !== GroupName) : [];
            SetNotes(location.href, NewNotes, (err) =>
            {
                if (err)
                {
                    showStatus("Failed to delete group.");
                    return;
                }
                DeleteGroup(GroupName, (err2) =>
                {
                    if (err2)
                    {
                        showStatus("Failed to delete group.");
                    } else
                    {
                        showStatus("Group deleted.");
                        RenderSidebar(Container);
                    }
                });
            });
        };
        GroupActions.appendChild(DeleteBtn);

        TitleRow.appendChild(GroupTitle);
        GroupDiv.appendChild(TitleRow);
        GroupDiv.appendChild(GroupActions);

        // Notes in group
        groupNotes.forEach((Note) =>
        {
            const noteNode = renderNote({
                Note,
                GroupName,
                Notes,
                Locked,
                Container,
                RenderSidebar
            });
            if (noteNode instanceof Node)
            {
                GroupDiv.appendChild(noteNode);
            } else
            {
                console.error("renderNote did not return a Node", noteNode);
            }
        });

        // --- If group is empty, show a message or visual cue ---
        if (groupNotes.length === 0)
        {
            const emptyMsg = document.createElement("div");
            emptyMsg.className = "empty-group-msg";
            emptyMsg.textContent = "Drop notes here";
            GroupDiv.appendChild(emptyMsg);
        }

        // --- Wrap group in a container with the outer drop zone for reordering ---
        const wrapper = document.createElement('div');
        wrapper.appendChild(outerDropZone);
        wrapper.appendChild(GroupDiv);
        return wrapper;
    } catch (e)
    {
        console.error("renderGroup error:", e);
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Group failed to render";
        errorDiv.style.color = "red";
        return errorDiv;
    }
}