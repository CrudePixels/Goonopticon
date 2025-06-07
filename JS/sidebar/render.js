import { GetNotes, GetPinnedGroups, GetCompact, GetTheme, GetSidebarVisible, GetLockedPromise, GetTagFilter, GetNoteSearch, SetLocked, SetSidebarVisible, SetTagFilter, SetNoteSearch, SetNotes, SetPinnedGroups, AddGroup, GetGroups, AddNote, RenameGroup, DeleteGroup } from './storage.js';
import { LogDev } from '../log.js';
import { ShowTagManager } from './tagmanager.js';
import { ApplyTheme } from '../theme.js';
import { renderTagFilter } from './tagFilterComponent.js';
import { renderGroup } from './groupComponent.js';
import { renderSidebarFooter } from './sidebarFooter.js';

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
                Container.classList.add('sidebar-hide');
                document.body.classList.remove('sidebar-visible');
                updateShowSidebarButton();
                return;
            } else
            {
                Container.style.display = '';
                Container.classList.remove('sidebar-hide');
                document.body.classList.add('sidebar-visible');
            }

            Container.innerHTML = '';
            const themeClass = (Theme || "default") + "-theme";
            ApplyTheme(Theme || "default");
            Container.classList.remove('default-theme', 'dark-theme', 'light-theme');
            Container.classList.add(themeClass);
            document.body.classList.remove('default-theme', 'dark-theme', 'light-theme');
            document.body.classList.add(themeClass);

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

            const ToggleBtn = document.createElement('button');
            ToggleBtn.className = 'sidebar-action-btn';
            ToggleBtn.style.float = 'right';
            ToggleBtn.style.marginLeft = '12px';
            ToggleBtn.textContent = 'Hide Sidebar';
            ToggleBtn.onclick = () =>
            {
                chrome.storage.local.set({ "PodAwful::SidebarVisible": "false" }, () =>
                {
                    const sidebar = document.getElementById('podawful-sidebar');
                    if (sidebar)
                    {
                        sidebar.classList.add('sidebar-hide');
                        sidebar.style.display = 'none';
                    }
                    document.body.classList.remove('sidebar-visible');
                    RenderSidebar(sidebar);
                });
            };
            Header.appendChild(ToggleBtn);

            Container.appendChild(Header);

            // === TAG FILTER ===
            Container.appendChild(renderTagFilter(Notes, SelectedTags, Locked, Container));

            // === SEARCH FIELD ===
            const SearchInput = document.createElement("input");
            SearchInput.type = "text";
            SearchInput.placeholder = "Search notes...";
            SearchInput.value = Search || "";
            SearchInput.disabled = Locked;
            SearchInput.oninput = () =>
            {
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
                if (Locked) return;
                const Name = prompt("New group name:");
                if (!Name || !Name.trim()) return;
                AddGroup(Name.trim(), () => RenderSidebar(Container));
            };
            GroupControls.appendChild(AddGroupBtn);

            const TagManagerBtn = document.createElement("button");
            TagManagerBtn.textContent = "Tags";
            TagManagerBtn.title = "Manage tags";
            TagManagerBtn.onclick = () => ShowTagManager(Notes, () => RenderSidebar(Container));
            GroupControls.appendChild(TagManagerBtn);

            Container.appendChild(GroupControls);

            // === GROUPS AND NOTES ===
            GetGroups((AllGroups) =>
            {
                AllGroups.forEach(GroupName =>
                {
                    Container.appendChild(renderGroup({
                        GroupName,
                        Notes,
                        PinnedGroups,
                        Locked,
                        Container,
                        RenderSidebar
                    }));
                });

                // === FOOTER ===
                Container.appendChild(renderSidebarFooter({ Locked, Container, RenderSidebar }));
            });

            // === TIMESTAMP HIGHLIGHTING ===
            import('./dragdrop.js').then(({ highlightCurrentTimestamp, setupSidebarDragAndDrop }) =>
            {
                const v = document.querySelector("video");
                if (v)
                {
                    v.removeEventListener("timeupdate", highlightCurrentTimestamp);
                    v.addEventListener("timeupdate", highlightCurrentTimestamp);
                }
                setupSidebarDragAndDrop(Container, RenderSidebar);
            });

            updateShowSidebarButton();
        });
    } catch (Err)
    {
        LogDev("[ERROR] Sidebar Promise.all failed: " + (Err && Err.stack || Err));
        LogDev("[ERROR] RenderSidebar: " + (Err.stack || Err));
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
            showBtn.className = 'sidebar-action-btn';
            showBtn.style.position = 'fixed';
            showBtn.style.right = '24px';
            showBtn.style.bottom = '24px';
            showBtn.style.zIndex = 1000001;
            showBtn.onclick = () =>
            {
                chrome.storage.local.set({ "PodAwful::SidebarVisible": "true" }, () =>
                {
                    const sidebar = document.getElementById('podawful-sidebar');
                    if (sidebar)
                    {
                        sidebar.classList.remove('sidebar-hide');
                        sidebar.style.display = '';
                        document.body.classList.add('sidebar-visible');
                        RenderSidebar(sidebar);
                    }
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
        // Optionally re-render sidebar if theme changes
        const sidebar = document.getElementById('podawful-sidebar');
        if (sidebar) RenderSidebar(sidebar);
    }
});