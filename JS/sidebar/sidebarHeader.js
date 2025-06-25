import { renderTagFilter } from './tagFilterComponent.js';
import { GetNotes } from './storage.js';
import { updateSidebarBody } from './sidebar.js';

export function renderSidebarHeader({
    Notes,
    SelectedTags,
    Locked,
    Search,
    Theme,
    Container,
    RenderSidebar,
    filterNotes, // <-- add this
    PinnedGroups,   // <-- add this
    AllGroups       // <-- add this
}) {
    const headerContainer = document.createElement('div');
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
    ToggleBtn.onclick = () => {
        chrome.storage.local.set({ "PodAwful::SidebarVisible": "false" }, () => {
            const sidebar = document.getElementById('podawful-sidebar');
            if (sidebar) sidebar.classList.add('sidebar-hide');
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
        (newTags) => RenderSidebar(Container, newTags, true)
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

    let searchDebounceTimer = null;
    SearchInput.oninput = (e) => {
        const searchValue = e.target.value;
        chrome.storage.local.set({ "PodAwful::NoteSearch": searchValue });

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            updateSidebarBody(Container, Notes, SelectedTags, searchValue, PinnedGroups, Locked, RenderSidebar, AllGroups);
        }, 200);
    };

    searchWrapper.appendChild(SearchInput);

    let clearBtn = document.createElement("button");
    clearBtn.textContent = "✕";
    clearBtn.title = "Clear search";
    clearBtn.style.marginLeft = "2px";
    clearBtn.onclick = () => {
        SearchInput.value = "";
        chrome.storage.local.set({ "PodAwful::NoteSearch": "" });
        RenderSidebar(Container, SelectedTags, false);
    };
    searchWrapper.appendChild(clearBtn);

    headerContainer.appendChild(searchWrapper);

    return headerContainer;
}

// Assume allNotes is available in scope and contains the full notes array
let allNotes = []; // Set this when you load notes from storage

// In your sidebar initialization:
GetNotes(location.href, (notesRaw) => {
    allNotes = Array.isArray(notesRaw) ? notesRaw : [];
    renderNotes(allNotes); // Initial render
});