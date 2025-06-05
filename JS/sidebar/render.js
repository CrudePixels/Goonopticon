import
{
    GetNotes,
    GetPinnedGroups,
    GetCompact,
    GetTheme,
    GetSidebarVisible,
    GetLockedPromise,
    GetTagFilter,
    GetNoteSearch,
    SaveUndo,
    SetLocked,
    SetSidebarVisible,
    SetTagFilter,
    SetNoteSearch,
    SetNotes,
    SetPinnedGroups,
    AddGroup
} from './storage.js';

import { LogDev } from '../log.js';
import { ShowTagManager } from './tagmanager.js';
import
{
    GetAllTags,
    GenerateNoteId,
    ParseTime,
    GetTimecode
} from './logic.js';

export function RenderSidebar(Container)
{
    try
    {
        Promise.all([
            new Promise(Resolve => GetNotes(location.href, Resolve)),
            new Promise(Resolve => GetPinnedGroups(Resolve)),
            new Promise(Resolve => GetCompact(Resolve)),
            new Promise(Resolve => GetTheme(Resolve)),
            new Promise(Resolve => GetSidebarVisible(Resolve)),
            GetLockedPromise(),
            new Promise(Resolve => GetTagFilter(Resolve)),
            new Promise(Resolve => GetNoteSearch(Resolve))
        ]).then(([Notes, PinnedGroups, Compact, Theme, SidebarVisible, Locked, SelectedTags, Search]) =>
        {
            LogDev("Sidebar data loaded", { Notes, PinnedGroups, Compact, Theme, SidebarVisible, Locked, SelectedTags, Search });

            if (!SidebarVisible)
            {
                Container.style.display = 'none';
                return;
            } else
            {
                Container.style.display = '';
            }

            Container.innerHTML = '';
            const theme = (Theme || "default") + "-theme";
            Container.classList.remove('default-theme', 'dark-theme', 'light-theme');
            Container.classList.add(theme);
            document.body.classList.remove('default-theme', 'dark-theme', 'light-theme');
            document.body.classList.add(theme);
            LogDev("Sidebar container after clear:", Container);

            // === HEADER ===
            const Header = document.createElement('div');
            Header.className = 'sidebar-header';
            let LogoFile = "logo-default.png";
            if (Theme === "light") LogoFile = "logo-light.png";
            else if (Theme === "dark") LogoFile = "logo-dark.png";
            Header.innerHTML = `
                <h2>PodAwful's Timestamps</h2>
                <img class="sidebar-logo" src="${chrome.runtime.getURL("Resources/" + LogoFile)}" />
                <div class="sidebar-url">${document.title}<br/><a href="${location.href}" target="_blank">${location.href}</a></div>
            `;
            Container.appendChild(Header);
            LogDev("Sidebar container after header:", Container);

            // === TAG FILTER ===
            const TagRow = document.createElement('div');
            TagRow.className = 'sidebar-tag-filter';
            const Tags = GetAllTags(Notes);
            TagRow.innerHTML = "<b>Filter tags:</b> ";
            Tags.forEach(Tag =>
            {
                const Label = document.createElement("label");
                Label.style.marginRight = "8px";
                const Cb = document.createElement("input");
                Cb.type = "checkbox";
                Cb.value = Tag;
                Cb.checked = SelectedTags.includes(Tag);
                Cb.disabled = Locked;
                Cb.onchange = () =>
                {
                    LogDev(`Filter tag toggled: ${Tag} (${Cb.checked ? "on" : "off"})`);
                    let NewTags = SelectedTags.slice();
                    if (Cb.checked) NewTags.push(Tag);
                    else NewTags = NewTags.filter(T => T !== Tag);
                    SetTagFilter(NewTags, () => RenderSidebar(Container));
                };
                Label.appendChild(Cb);
                Label.appendChild(document.createTextNode(" " + Tag));
                TagRow.appendChild(Label);
            });
            Container.appendChild(TagRow);

            // === SEARCH FIELD ===
            const SearchInput = document.createElement("input");
            SearchInput.type = "text";
            SearchInput.placeholder = "Search notes...";
            SearchInput.value = Search || "";
            SearchInput.disabled = Locked;
            SearchInput.oninput = () =>
            {
                LogDev("Note search changed");
                SetNoteSearch(SearchInput.value, () => RenderSidebar(Container));
            };
            Container.appendChild(SearchInput);

            // === GROUP CONTROLS ===
            const GroupControls = document.createElement("div");
            GroupControls.className = "sidebar-group-controls";
            const AddGroupBtn = document.createElement("button");
            AddGroupBtn.textContent = "+ Group";
            AddGroupBtn.title = "Add a new group";
            AddGroupBtn.disabled = Locked;
            AddGroupBtn.onclick = () =>
            {
                try
                {
                    LogDev("Clicked + Group");
                    if (Locked) return;
                    const Name = prompt("New group name:");
                    if (!Name) return;
                    AddGroup(Name, () => RenderSidebar(Container));
                }
                catch (Err)
                {
                    LogDev("[ERROR] AddGroupBtn.onclick: " + (Err.stack || Err));
                }
            };
            GroupControls.appendChild(AddGroupBtn);

            // Tag manager button
            const TagManagerBtn = document.createElement("button");
            TagManagerBtn.textContent = "Tags";
            TagManagerBtn.title = "Manage tags";
            TagManagerBtn.onclick = () => ShowTagManager(Notes, () => RenderSidebar(Container));
            GroupControls.appendChild(TagManagerBtn);

            Container.appendChild(GroupControls);

            // === GROUPS AND NOTES ===
            // Group notes by group name
            const Groups = {};
            Notes.forEach(Note =>
            {
                if (!Groups[Note.group]) Groups[Note.group] = [];
                Groups[Note.group].push(Note);
            });

            Object.keys(Groups).forEach(GroupName =>
            {
                const GroupDiv = document.createElement("div");
                GroupDiv.className = "note-group";
                GroupDiv.dataset.group = GroupName;

                // Group title row
                const TitleRow = document.createElement("div");
                TitleRow.className = "group-title-row";

                const GroupTitle = document.createElement("span");
                GroupTitle.className = "group-title";
                GroupTitle.textContent = GroupName;
                TitleRow.appendChild(GroupTitle);

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
                    if (Object.keys(Groups).includes(newName))
                    {
                        alert("A group with that name already exists.");
                        return;
                    }
                    Notes.forEach(N =>
                    {
                        if (N.group === GroupName) N.group = newName;
                    });
                    SetNotes(location.href, Notes, () => RenderSidebar(Container));
                };
                TitleRow.appendChild(RenameBtn);

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
                TitleRow.appendChild(PinBtn);

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
                        SetNotes(location.href, NewNotes, () => RenderSidebar(Container));
                    }
                };
                TitleRow.appendChild(DeleteBtn);

                GroupDiv.appendChild(TitleRow);

                // Notes in group
                Groups[GroupName].forEach(Note =>
                {
                    const NoteDiv = document.createElement("div");
                    NoteDiv.className = "note-item";
                    NoteDiv.dataset.noteId = Note.id;
                    NoteDiv.draggable = !Locked;

                    // Drag-and-drop events
                    NoteDiv.addEventListener("dragstart", e =>
                    {
                        if (Locked) return;
                        e.dataTransfer.setData("text/plain", Note.id);
                        NoteDiv.classList.add("dragging");
                    });
                    NoteDiv.addEventListener("dragend", e =>
                    {
                        NoteDiv.classList.remove("dragging");
                    });
                    NoteDiv.addEventListener("dragover", e =>
                    {
                        if (Locked) return;
                        e.preventDefault();
                        NoteDiv.classList.add("drag-over");
                    });
                    NoteDiv.addEventListener("dragleave", e =>
                    {
                        NoteDiv.classList.remove("drag-over");
                    });
                    NoteDiv.addEventListener("drop", e =>
                    {
                        if (Locked) return;
                        e.preventDefault();
                        NoteDiv.classList.remove("drag-over");
                        const fromId = e.dataTransfer.getData("text/plain");
                        const toId = Note.id;
                        if (!fromId || fromId === toId) return;
                        const fromIdx = Notes.findIndex(n => n.id === fromId);
                        const toIdx = Notes.findIndex(n => n.id === toId);
                        if (fromIdx === -1 || toIdx === -1) return;
                        // Only reorder if both notes are in the same group
                        if (Notes[fromIdx].group === Notes[toIdx].group)
                        {
                            const [moved] = Notes.splice(fromIdx, 1);
                            Notes.splice(toIdx, 0, moved);
                            SetNotes(location.href, Notes, () => RenderSidebar(Container));
                        } else
                        {
                            // Move to new group
                            Notes[fromIdx].group = Notes[toIdx].group;
                            SetNotes(location.href, Notes, () => RenderSidebar(Container));
                        }
                    });

                    // Allow drop on group for moving between groups
                    GroupDiv.addEventListener("dragover", e =>
                    {
                        if (Locked) return;
                        e.preventDefault();
                        GroupDiv.classList.add("drag-over");
                    });
                    GroupDiv.addEventListener("dragleave", e =>
                    {
                        GroupDiv.classList.remove("drag-over");
                    });
                    GroupDiv.addEventListener("drop", e =>
                    {
                        if (Locked) return;
                        e.preventDefault();
                        GroupDiv.classList.remove("drag-over");
                        const noteId = e.dataTransfer.getData("text/plain");
                        if (!noteId) return;
                        const idx = Notes.findIndex(n => n.id === noteId);
                        if (idx === -1) return;
                        Notes[idx].group = GroupName;
                        SetNotes(location.href, Notes, () => RenderSidebar(Container));
                    });

                    // Time
                    const TimeSpan = document.createElement("span");
                    TimeSpan.className = "note-time";
                    TimeSpan.textContent = Note.time || "";
                    if (Note.time)
                    {
                        TimeSpan.onclick = () =>
                        {
                            const v = document.querySelector("video");
                            if (v) v.currentTime = ParseTime(Note.time);
                        };
                    }
                    NoteDiv.appendChild(TimeSpan);

                    // Text
                    const TextDiv = document.createElement("div");
                    TextDiv.className = "note-text";
                    TextDiv.textContent = Note.text;
                    NoteDiv.appendChild(TextDiv);

                    // Tags
                    const TagsDiv = document.createElement("div");
                    TagsDiv.className = "note-tags";
                    (Note.tags || []).forEach(Tag =>
                    {
                        const TagSpan = document.createElement("span");
                        TagSpan.className = "note-tag";
                        TagSpan.textContent = Tag;
                        TagsDiv.appendChild(TagSpan);
                    });
                    // Add Tag button
                    if (!Locked)
                    {
                        const AddTagBtn = document.createElement("button");
                        AddTagBtn.textContent = "+";
                        AddTagBtn.title = "Add tag";
                        AddTagBtn.onclick = () =>
                        {
                            const tag = prompt("Add tag (comma separated for multiple):");
                            if (!tag) return;
                            const tagsToAdd = tag.split(",").map(t => t.trim()).filter(Boolean);
                            const idx = Notes.findIndex(n => n.id === Note.id);
                            if (idx !== -1)
                            {
                                Notes[idx].tags = Array.from(new Set([...(Notes[idx].tags || []), ...tagsToAdd]));
                                SetNotes(location.href, Notes, () => RenderSidebar(Container));
                            }
                        };
                        TagsDiv.appendChild(AddTagBtn);
                    }
                    NoteDiv.appendChild(TagsDiv);

                    // Note controls
                    const NoteButtons = document.createElement("div");
                    NoteButtons.className = "note-buttons";

                    // Edit button
                    const EditBtn = document.createElement("button");
                    EditBtn.textContent = "✏️";
                    EditBtn.title = "Edit note";
                    EditBtn.disabled = Locked;
                    EditBtn.onclick = () =>
                    {
                        if (Locked) return;
                        const NewText = prompt("Edit note text:", Note.text);
                        if (NewText !== null)
                        {
                            // Add this for editing time
                            const NewTime = prompt("Edit timestamp:", Note.time || "");
                            if (NewTime !== null) {
                                Note.text = NewText;
                                Note.time = NewTime;
                                SetNotes(location.href, Notes, () => RenderSidebar(Container));
                            }
                        }
                    };
                    NoteButtons.appendChild(EditBtn);

                    // Delete button
                    const DelBtn = document.createElement("button");
                    DelBtn.textContent = "🗑";
                    DelBtn.title = "Delete note";
                    DelBtn.disabled = Locked;
                    DelBtn.onclick = () =>
                    {
                        if (Locked) return;
                        if (confirm("Delete this note?"))
                        {
                            const Idx = Notes.indexOf(Note);
                            if (Idx !== -1)
                            {
                                Notes.splice(Idx, 1);
                                SetNotes(location.href, Notes, () => RenderSidebar(Container));
                            }
                        }
                    };
                    NoteButtons.appendChild(DelBtn);

                    NoteDiv.appendChild(NoteButtons);

                    GroupDiv.appendChild(NoteDiv);
                });

                Container.appendChild(GroupDiv);
            });

            // === FOOTER ===
            const Footer = document.createElement("div");
            Footer.className = "sidebar-footer";
            const actions = [
                { text: "+ Timestamp", id: "sidebarAddTimestamp" },
                { text: "+ Note", id: "sidebarAddNote" },
                { text: Locked ? "Unlock" : "Lock", id: "sidebarLock" }
            ];
            actions.forEach(action =>
            {
                const btn = document.createElement("button");
                btn.textContent = action.text;
                btn.id = action.id;
                btn.className = "sidebar-action-btn";
                btn.disabled = (action.id !== "sidebarLock" && Locked);
                switch (action.id)
                {
                    case "sidebarAddTimestamp":
                        btn.onclick = () =>
                        {
                            if (Locked) return;
                            const v = document.querySelector("video");
                            let defaultTime = v ? GetTimecode(v.currentTime) : "";
                            let inputTime = prompt("Timestamp? (leave blank for current)", defaultTime);
                            let time = inputTime && inputTime.trim() !== "" ? inputTime.trim() : defaultTime;
                            const text = prompt("Note:");
                            if (!text) return;
                            Notes.push({
                                id: GenerateNoteId(),
                                group: "Ungrouped",
                                text: text,
                                time: time,
                                tags: [],
                                created: Date.now()
                            });
                            SetNotes(location.href, Notes, () => RenderSidebar(Container));
                        };
                        break;
                    case "sidebarAddNote":
                        btn.onclick = () =>
                        {
                            if (Locked) return;
                            const text = prompt("Enter note text:");
                            if (!text) return;
                            Notes.push({
                                id: GenerateNoteId(),
                                group: "Ungrouped",
                                text: text,
                                time: "",
                                tags: [],
                                created: Date.now()
                            });
                            SetNotes(location.href, Notes, () => RenderSidebar(Container));
                        };
                        break;
                    case "sidebarLock":
                        btn.onclick = () =>
                        {
                            SetLocked(!Locked, () => RenderSidebar(Container));
                        };
                        break;
                }
                Footer.appendChild(btn);
            });
            Container.appendChild(Footer);

            // === TIMESTAMP HIGHLIGHTING ===
            function highlightCurrentTimestamp()
            {
                const v = document.querySelector("video");
                if (!v) return;
                const current = v.currentTime;
                document.querySelectorAll('.note-item').forEach(el =>
                {
                    const noteId = el.dataset.noteId;
                    const note = Notes.find(n => n.id === noteId);
                    if (note && note.time)
                    {
                        const t = ParseTime(note.time);
                        if (Math.abs(current - t) < 3)
                        {
                            el.classList.add("highlight");
                        } else
                        {
                            el.classList.remove("highlight");
                        }
                    } else
                    {
                        el.classList.remove("highlight");
                    }
                });
            }
            const v = document.querySelector("video");
            if (v)
            {
                v.removeEventListener("timeupdate", highlightCurrentTimestamp);
                v.addEventListener("timeupdate", highlightCurrentTimestamp);
            }
        });
    } catch (Err)
    {
        LogDev("[ERROR] Sidebar Promise.all failed: " + (err && err.stack || err));
        LogDev("[ERROR] RenderSidebar: " + (Err.stack || Err));
    }
}