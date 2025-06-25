import { renderGroup } from './groupComponent.js';
import { renderNote } from './noteComponent.js';
import { GetNotes } from './storage.js';

let allNotes = [];

function filterNotes(searchValue) {
    const filteredNotes = allNotes.filter(note =>
        note.text.toLowerCase().includes(searchValue) ||
        (Array.isArray(note.tags) && note.tags.some(tag => tag.toLowerCase().includes(searchValue)))
    );
    renderNotes(filteredNotes);
}

export function renderSidebarBody({
    Notes,
    SelectedTags,
    Search,
    PinnedGroups,
    Locked,
    Container,
    RenderSidebar,
    AllGroups = []
})
{
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'sidebar-body';

    // Filter notes by search and tags
    let filteredNotes = Notes;
    const searchStr = (Search || "").trim().toLowerCase();
    if (searchStr)
    {
        filteredNotes = filteredNotes.filter(note =>
            (note.text && note.text.toLowerCase().includes(searchStr)) ||
            (Array.isArray(note.tags) && note.tags.some(tag => tag.toLowerCase().includes(searchStr)))
        );
    }
    if (SelectedTags && SelectedTags.length > 0)
    {
        filteredNotes = filteredNotes.filter(note =>
            Array.isArray(note.tags) && SelectedTags.some(tag => note.tags.includes(tag))
        );
    }

    // Groups
    AllGroups.forEach(GroupName =>
    {
        const groupNotes = filteredNotes.filter(n => n.group === GroupName);
        if (groupNotes.length === 0) return;
        const groupNode = renderGroup({
            GroupName,
            Notes: filteredNotes,
            PinnedGroups,
            Locked,
            Container,
            RenderSidebar,
            AllGroups
        });
        if (groupNode instanceof Node)
        {
            bodyContainer.appendChild(groupNode);
        }
    });

    // Ungrouped notes
    const ungroupedNotes = filteredNotes.filter(n => !n.group);
    ungroupedNotes.forEach((Note) =>
    {
        const noteNode = renderNote({
            Note,
            GroupName: null,
            Notes: filteredNotes,
            Locked,
            Container,
            RenderSidebar,
            highlight: searchStr
        });
        if (noteNode instanceof Node)
        {
            bodyContainer.appendChild(noteNode);
        }
    });

    return bodyContainer;
}

// When initializing:
GetNotes(location.href, (notesRaw) => {
    allNotes = Array.isArray(notesRaw) ? notesRaw : [];
    renderNotes(allNotes);
    renderSidebarHeader({
        Notes: allNotes,
        // ...other props...
        filterNotes // pass the function
    });
});