import { GetNotes, GetPinnedGroups, GetCompact, GetTheme, GetSidebarVisible, GetLockedPromise, GetTagFilter, GetNoteSearch, GetGroups } from './storage.js';
import { LogDev } from '../log.js';
import { ShowTagManager } from './tagmanager.js';
import { ApplyTheme } from '../theme.js';
import { renderTagFilter } from './tagFilterComponent.js';
import { renderGroup } from './groupComponent.js';
import { renderSidebarFooter } from './sidebarFooter.js';
import { ParseTime } from './logic.js';
import { renderNote } from './noteComponent.js';

let searchWrapper = null;
let SearchInput = null;
let clearBtn = null;
let notesSection = null;

function updateThemeClasses(theme, ...elements)
{
    const classes = ['default-theme', 'dark-theme', 'light-theme'];
    elements.forEach(el =>
    {
        if (el)
        {
            el.classList.remove(...classes);
            el.classList.add(`${theme}-theme`);
        }
    });
}

function showSidebar(sidebar)
{
    sidebar.classList.remove('sidebar-hide');
    sidebar.style.display = '';
    document.body.classList.add('sidebar-visible');
    LogDev("Sidebar shown", "system");
}

function hideSidebar(sidebar)
{
    sidebar.classList.add('sidebar-hide');
    sidebar.style.display = 'none';
    document.body.classList.remove('sidebar-visible');
    LogDev("Sidebar hidden", "system");
}

let headerRendered = false;
let headerContainer = null;
let bodyContainer = null;

export function RenderSidebar(Container, overrideSelectedTags, forceHeaderRerender = false)
{
    LogDev("RenderSidebar called", "render");
    if (!Container)
    {
        LogDev("[ERROR] RenderSidebar: Container is null/undefined", "error");
        return;
    }
    try
    {
        Promise.all([
            new Promise(Resolve => GetNotes(location.href, (data) => Resolve(Array.isArray(data) ? data : []))),
            new Promise(Resolve => GetPinnedGroups((err, data) => Resolve(Array.isArray(data) ? data : []))),
            new Promise(Resolve => GetCompact((err, data) => Resolve(data))),
            new Promise(Resolve => GetTheme((err, data) => Resolve(data))),
            new Promise(Resolve => GetSidebarVisible((err, data) => Resolve(data))),
            GetLockedPromise(),
            new Promise(Resolve => GetTagFilter((err, data) => Resolve(Array.isArray(data) ? data : []))),
            new Promise(Resolve => GetNoteSearch((err, data) => Resolve(data)))
        ])
            .then(([Notes, PinnedGroups, Compact, Theme, SidebarVisible, Locked, SelectedTags, Search]) =>
            {
                if (overrideSelectedTags)
                {
                    SelectedTags = overrideSelectedTags;
                }

                if (!SidebarVisible)
                {
                    hideSidebar(Container);
                    updateShowSidebarButton();
                    return;
                } else
                {
                    showSidebar(Container);
                }

                // === HEADER ===
                if (!headerRendered || forceHeaderRerender)
                {
                    Container.innerHTML = '';
                    headerContainer = document.createElement('div');
                    headerContainer.className = 'sidebar-header';

                    let LogoFile = "logo-default.png";
                    if (Theme === "light") LogoFile = "logo-light.png";
                    else if (Theme === "dark") LogoFile = "logo-dark.png";
                    headerContainer.innerHTML = `
                    <h2>Goonopticon</h2>
                    <img class="sidebar-logo" src="${chrome.runtime.getURL("Resources/" + LogoFile)}" />
                    <div class="sidebar-url">${document.title}<br/><a href="${location.href}" target="_blank">${location.href}</a></div>
                `;

                    const ToggleBtn = document.createElement('button');
                    ToggleBtn.className = 'sidebar-action-btn';
                    ToggleBtn.style.float = 'right';
                    ToggleBtn.style.marginLeft = '12px';
                    ToggleBtn.textContent = 'Hide Sidebar';
                    ToggleBtn.setAttribute('aria-label', 'Hide Sidebar');
                    ToggleBtn.onclick = () =>
                    {
                        LogDev("Hide Sidebar button clicked", "interaction");
                        chrome.storage.local.set({ "PodAwful::SidebarVisible": "false" }, () =>
                        {
                            const sidebar = document.getElementById('podawful-sidebar');
                            if (sidebar)
                            {
                                hideSidebar(sidebar);
                            }
                            RenderSidebar(sidebar, undefined, true);
                            LogDev("Sidebar hidden and re-rendered", "event");
                        });
                    };
                    headerContainer.appendChild(ToggleBtn);

                    // Status message
                    let statusDiv = document.createElement('div');
                    statusDiv.id = 'sidebarStatus';
                    statusDiv.style.color = '#FFD600';
                    statusDiv.style.margin = '4px 0 8px 0';
                    headerContainer.appendChild(statusDiv);

                    // Tag filter
                    headerContainer.appendChild(renderTagFilter(
                        Notes,
                        SelectedTags,
                        Locked,
                        (newTags) => RenderSidebar(Container, newTags, true) // Force header rerender on tag change
                    ));

                    // Search bar
                    let searchWrapper = document.createElement("div");
                    searchWrapper.style.display = "flex";
                    searchWrapper.style.alignItems = "center";
                    searchWrapper.style.gap = "4px";

                    let SearchInput = document.createElement("input");
                    SearchInput.type = "text";
                    SearchInput.placeholder = "Search notes...";
                    SearchInput.setAttribute('aria-label', 'Search notes');
                    SearchInput.value = Search || "";

                    let searchTimeout = null;
                    SearchInput.oninput = (e) =>
                    {
                        const localSearch = e.target.value;
                        if (searchTimeout) clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() =>
                        {
                            chrome.storage.local.set({ "PodAwful::NoteSearch": localSearch }, () =>
                            {
                                RenderSidebar(Container, SelectedTags, false); // Only rerender body
                            });
                        }, 200);
                    };

                    searchWrapper.appendChild(SearchInput);

                    let clearBtn = document.createElement("button");
                    clearBtn.textContent = "✕";
                    clearBtn.title = "Clear search";
                    clearBtn.style.marginLeft = "2px";
                    clearBtn.onclick = () =>
                    {
                        SearchInput.value = "";
                        chrome.storage.local.set({ "PodAwful::NoteSearch": "" });
                        RenderSidebar(Container, SelectedTags, false); // Only rerender body
                    };
                    searchWrapper.appendChild(clearBtn);

                    headerContainer.appendChild(searchWrapper);

                    Container.appendChild(headerContainer);
                    headerRendered = true;
                }

                // === BODY ===
                // Remove old body if present
                if (bodyContainer) bodyContainer.remove();
                bodyContainer = document.createElement('div');
                bodyContainer.className = 'sidebar-body';
                Container.appendChild(bodyContainer);

                // Render notes/groups into body
                GetGroups((err, AllGroupsRaw) =>
                {
                    const AllGroups = Array.isArray(AllGroupsRaw) ? AllGroupsRaw : [];
                    if (err) return;

                    renderNotesSection(AllGroups, Notes, SelectedTags, (Search || "").trim().toLowerCase(), PinnedGroups, Locked, bodyContainer, RenderSidebar);

                    bodyContainer.appendChild(renderSidebarFooter({ Locked, Container, RenderSidebar }));
                });

                // ...timestamp highlighting and theme logic unchanged...
                import('./dragdrop.js').then(({ highlightCurrentTimestamp, setupSidebarDragAndDrop }) =>
                {
                    const v = document.querySelector("video");
                    if (v)
                    {
                        v.removeEventListener("timeupdate", window._podawfulHighlightHandler);
                        window._podawfulHighlightHandler = () =>
                        {
                            highlightCurrentTimestamp(Notes, ParseTime, 5);
                        };
                        v.addEventListener("timeupdate", window._podawfulHighlightHandler);
                    }
                    setupSidebarDragAndDrop(Container, RenderSidebar);
                });

                updateShowSidebarButton();

                const sidebar = document.getElementById('podawful-sidebar');
                if (Locked)
                {
                    sidebar.classList.add('locked');
                } else
                {
                    sidebar.classList.remove('locked');
                }
            })
            .catch(Err =>
            {
                if (Container)
                {
                    Container.innerHTML = "<div style='color:#FFD600'>Failed to load sidebar. Please reload the page.</div>";
                }
            });
    } catch (Err)
    {
        if (Container)
        {
            Container.innerHTML = "<div style='color:#FFD600'>Failed to load sidebar. Please reload the page.</div>";
        }
    }
}

// Floating "Show Sidebar" button logic
function updateShowSidebarButton()
{
    const sidebar = document.getElementById('podawful-sidebar');
    let showBtn = document.getElementById('podawful-show-sidebar-btn');
    const isHidden = !sidebar || sidebar.classList.contains('sidebar-hide') || sidebar.style.display === 'none';

    if (isHidden)
    {
        if (!showBtn)
        {
            showBtn = document.createElement('button');
            showBtn.id = 'podawful-show-sidebar-btn';
            showBtn.textContent = 'Show Sidebar';
            showBtn.className = 'sidebar-action-btn sidebar-action-btn--floating';

            // --- THEME FIX START ---
            // Get the current theme from body or sidebar
            let themeClass = Array.from(document.body.classList).find(cls => /-theme$/.test(cls));
            if (!themeClass && sidebar)
            {
                themeClass = Array.from(sidebar.classList).find(cls => /-theme$/.test(cls));
            }
            if (themeClass)
            {
                showBtn.classList.add(themeClass);
            }
            // --- THEME FIX END ---

            showBtn.setAttribute('aria-label', 'Show Sidebar');
            showBtn.onclick = () =>
            {
                chrome.storage.local.set({ "PodAwful::SidebarVisible": "true" }, () =>
                {
                    let sidebar = document.getElementById('podawful-sidebar');
                    if (!sidebar)
                    {
                        sidebar = document.createElement('div');
                        sidebar.id = 'podawful-sidebar';
                        sidebar.className = 'podawful-sidebar';
                        document.body.appendChild(sidebar);
                    }
                    showSidebar(sidebar);
                    RenderSidebar(sidebar);
                    showBtn.remove();
                });
            };
            document.body.appendChild(showBtn);
        }
    } else if (showBtn)
    {
        showBtn.remove();
    }
}

chrome.storage.onChanged.addListener((changes, area) =>
{
    if (area === 'local' && changes['PodAwful::Theme'])
    {
        const theme = changes['PodAwful::Theme'].newValue || "default";
        ApplyTheme(theme);
        updateThemeClasses(theme, document.body, document.getElementById('podawful-sidebar'));
        const sidebar = document.getElementById('podawful-sidebar');
        if (sidebar) RenderSidebar(sidebar);
    }

    if (area === 'local' && changes['PodAwful::SidebarVisible'])
    {
        const sidebar = document.getElementById('podawful-sidebar');
        if (sidebar)
        {
            RenderSidebar(sidebar);
        }
    }
});

export default function renderSidebar()
{
    if (document.getElementById('podawful-sidebar'))
    {
        return;
    }

    const sidebar = document.createElement('div');
    sidebar.id = 'podawful-sidebar';
    sidebar.className = 'podawful-sidebar';
    document.body.appendChild(sidebar);
    showSidebar(sidebar);
    RenderSidebar(sidebar);
}

function renderNotesSection(AllGroups, Notes, SelectedTags, searchStr, PinnedGroups, Locked, Container, RenderSidebar)
{
    // Ensure this container is only created once and reused
    let notesSection = document.getElementById('sidebar-notes-section');
    if (notesSection) notesSection.remove();

    notesSection = document.createElement('div');
    notesSection.id = 'sidebar-notes-section';
    Container.appendChild(notesSection);

    // Filter notes by search and tags
    let filteredNotes = Notes;
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

    // Render groups and notes (move your group/note rendering logic here)
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
            notesSection.appendChild(groupNode);
        }
    });

    // Render ungrouped notes
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
            notesSection.appendChild(noteNode);
        }
    });
}