import { GetNotes, GetPinnedGroups, GetCompact, GetTheme, GetSidebarVisible, GetLockedPromise, GetTagFilter, GetNoteSearch, SetLocked, SetSidebarVisible, SetTagFilter, SetNoteSearch, SetNotes, SetPinnedGroups, AddGroup, GetGroups, AddNote, RenameGroup, DeleteGroup } from './storage.js';
import { LogDev } from '../log.js';
import { ShowTagManager } from './tagmanager.js';
import { ApplyTheme } from '../theme.js';
import { renderTagFilter } from './tagFilterComponent.js';
import { renderGroup } from './groupComponent.js';
import { renderSidebarFooter } from './sidebarFooter.js';
import { ParseTime } from './logic.js';
import { renderNote } from './noteComponent.js';

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

export function RenderSidebar(Container)
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
                if (!SidebarVisible)
                {
                    hideSidebar(Container);
                    updateShowSidebarButton();
                    return;
                } else
                {
                    showSidebar(Container);
                }

                Container.innerHTML = '';
                const themeClass = (Theme || "default");
                ApplyTheme(themeClass);
                updateThemeClasses(themeClass, Container, document.body);

                // === HEADER ===
                const Header = document.createElement('div');
                Header.className = 'sidebar-header';
                let LogoFile = "logo-default.png";
                if (Theme === "light") LogoFile = "logo-light.png";
                else if (Theme === "dark") LogoFile = "logo-dark.png";
                Header.innerHTML = `
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
                        RenderSidebar(sidebar);
                        LogDev("Sidebar hidden and re-rendered", "event");
                    });
                };
                Header.appendChild(ToggleBtn);

                Container.appendChild(Header);

                // === STATUS MESSAGE ===
                let statusDiv = document.createElement('div');
                statusDiv.id = 'sidebarStatus';
                statusDiv.style.color = '#FFD600';
                statusDiv.style.margin = '4px 0 8px 0';
                Container.appendChild(statusDiv);

                // === TAG FILTER ===
                Container.appendChild(renderTagFilter(Notes, SelectedTags, Locked, Container));

                // === SEARCH FIELD ===
                const SearchInput = document.createElement("input");
                SearchInput.type = "text";
                SearchInput.placeholder = "Search notes...";
                SearchInput.value = Search || "";
                SearchInput.disabled = Locked;
                SearchInput.setAttribute('aria-label', 'Search notes');
                SearchInput.oninput = () =>
                {
                    SetNoteSearch(SearchInput.value, () =>
                    {
                        RenderSidebar(Container);
                    });
                };

                Container.appendChild(SearchInput);

                // === GROUP CONTROLS ===
                /*  const GroupControls = document.createElement("div");
                  GroupControls.className = "sidebar-group-controls";
                  const AddGroupBtn = document.createElement("button");
                  AddGroupBtn.textContent = "+ Group";
                  AddGroupBtn.title = "Add a new group";
                  AddGroupBtn.setAttribute('aria-label', 'Add a new group');
                  AddGroupBtn.disabled = Locked;
                  AddGroupBtn.onclick = () =>
                  {
                      if (Locked) return;
                      const Name = prompt("New group name:");
                      if (!Name || !Name.trim())
                      {
                          statusDiv.textContent = "Group name cannot be empty.";
                          setTimeout(() => { statusDiv.textContent = ""; }, 2000);
                          return;
                      }
                      AddGroup(Name.trim(), () =>
                      {
                          RenderSidebar(Container);
                      });
                  };
                  GroupControls.appendChild(AddGroupBtn);
  
                  const TagManagerBtn = document.createElement("button");
                  TagManagerBtn.textContent = "Tags";
                  TagManagerBtn.title = "Manage tags";
                  TagManagerBtn.setAttribute('aria-label', 'Manage tags');
                  TagManagerBtn.onclick = () =>
                  {
                      ShowTagManager(Notes, Container);
                  };
                  GroupControls.appendChild(TagManagerBtn);
  
                  Container.appendChild(GroupControls);
                  */

                // === GROUPS AND NOTES ===
                GetGroups((err, AllGroupsRaw) =>
                {
                    const AllGroups = Array.isArray(AllGroupsRaw) ? AllGroupsRaw : [];
                    if (err)
                    {
                        return;
                    }
                    AllGroups.forEach(GroupName =>
                    {
                        const groupNode = renderGroup({
                            GroupName,
                            Notes,
                            PinnedGroups,
                            Locked,
                            Container,
                            RenderSidebar,
                            AllGroups
                        });
                        if (groupNode instanceof Node)
                        {
                            Container.appendChild(groupNode);
                        }
                    });

                    // --- Render ungrouped notes with drop zones ---
                    const ungroupedNotes = Notes.filter(n => !n.group);
                    ungroupedNotes.forEach((Note) =>
                    {
                        const noteNode = renderNote({
                            Note,
                            GroupName: null,
                            Notes,
                            Locked,
                            Container,
                            RenderSidebar
                        });
                        if (noteNode instanceof Node)
                        {
                            Container.appendChild(noteNode);
                        }
                    });

                    Container.appendChild(renderSidebarFooter({ Locked, Container, RenderSidebar }));
                });

                // === TIMESTAMP HIGHLIGHTING ===
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