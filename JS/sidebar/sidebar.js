import { renderSidebarHeader } from './sidebarHeader.js';
import { renderSidebarBody } from './sidebarBody.js';
import { renderSidebarFooter } from './sidebarFooter.js';
import
{
    GetNotes, GetPinnedGroups, GetCompact, GetTheme, GetSidebarVisible,
    GetLockedPromise, GetTagFilter, GetNoteSearch, GetGroups
} from './storage.js';
import { LogDev } from '../log.js';
import { ApplyTheme } from '../theme.js';

import initSidebar from './main.js';

initSidebar();

export function renderSidebar(Container, overrideSelectedTags, forceHeaderRerender = false, overrideSearch = null)
{
    console.log('[Sidebar] renderSidebar called');
    if (!Container)
    {
        console.error("[Sidebar] Container is null/undefined");
        return;
    }
    Promise.all([
        new Promise(Resolve => GetNotes(location.href, (data) => Resolve(Array.isArray(data) ? data : []))),
        new Promise(Resolve => GetPinnedGroups((err, data) => Resolve(Array.isArray(data) ? data : []))),
        new Promise(Resolve => GetCompact((err, data) => Resolve(data))),
        new Promise(Resolve => GetTheme((err, data) => Resolve(data))),
        new Promise(Resolve => GetSidebarVisible((err, data) => Resolve(data))),
        GetLockedPromise(),
        new Promise(Resolve => GetTagFilter((err, data) => Resolve(Array.isArray(data) ? data : []))),
        new Promise(Resolve => GetNoteSearch((err, data) => Resolve(data)))
    ]).then(([Notes, PinnedGroups, Compact, Theme, SidebarVisible, Locked, SelectedTags, Search]) =>
    {
        console.log('[Sidebar] Data loaded:', { Notes, PinnedGroups, Compact, Theme, SidebarVisible, Locked, SelectedTags, Search });
        if (overrideSelectedTags)
        {
            SelectedTags = overrideSelectedTags;
        }

        if (!SidebarVisible)
        {
            Container.classList.add('sidebar-hide');
            Container.style.display = 'none';
            document.body.classList.remove('sidebar-visible');
            updateShowSidebarButton();
            return;
        } else
        {
            Container.classList.remove('sidebar-hide');
            Container.style.display = '';
            document.body.classList.add('sidebar-visible');
        }

        // Fetch groups before rendering body
        GetGroups((err, AllGroupsRaw) =>
        {
            if (err) console.error('[Sidebar] GetGroups error:', err);
            const AllGroups = Array.isArray(AllGroupsRaw) ? AllGroupsRaw : [];
            console.log('[Sidebar] AllGroups:', AllGroups);
            Container.innerHTML = '';

            const header = renderSidebarHeader({
                Notes, SelectedTags, Locked, Search: overrideSearch ?? Search, Theme, Container, RenderSidebar: renderSidebar,
                PinnedGroups, AllGroups // <-- add these
            });
            Container.appendChild(header);

            const body = renderSidebarBody({
                Notes, SelectedTags, Search: overrideSearch ?? Search, PinnedGroups, Locked, Container, RenderSidebar: renderSidebar, AllGroups
            });
            Container.appendChild(body);

            const footer = renderSidebarFooter({ Locked, Container, RenderSidebar: renderSidebar });
            Container.appendChild(footer);

            updateShowSidebarButton();

            // Theme and drag/drop logic
            import('./dragdrop.js').then(({ highlightCurrentTimestamp, setupSidebarDragAndDrop }) =>
            {
                // Set globals for highlightCurrentTimestamp
                window.Notes = Notes;
                import('./logic.js').then(mod =>
                {
                    window.ParseTime = mod.ParseTime;
                    const v = document.querySelector("video");
                    if (v)
                    {
                        v.removeEventListener("timeupdate", window._podawfulHighlightHandler);
                        window._podawfulHighlightHandler = () =>
                        {
                            highlightCurrentTimestamp();
                        };
                        v.addEventListener("timeupdate", window._podawfulHighlightHandler);
                        // Initial highlight after render
                        highlightCurrentTimestamp();
                    }
                });
                setupSidebarDragAndDrop(Container, renderSidebar);
            });

            const sidebar = document.getElementById('podawful-sidebar');
            if (Locked)
            {
                sidebar.classList.add('locked');
            } else
            {
                sidebar.classList.remove('locked');
            }
        });
    }).catch(Err =>
    {
        console.error('[Sidebar] Failed to load:', Err);
        if (Container)
        {
            Container.innerHTML = "<div style='color:#FFD600'>Failed to load sidebar. Please reload the page.</div>";
        }
    });
}

export function updateSidebarBody(Container, Notes, SelectedTags, Search, PinnedGroups, Locked, RenderSidebar, AllGroups)
{
    // Remove the old body
    const oldBody = Container.querySelector('.sidebar-body');
    if (oldBody) oldBody.remove();

    // Find the footer
    const footer = Container.querySelector('.sidebar-footer');

    // Render the new body
    const body = renderSidebarBody({
        Notes, SelectedTags, Search, PinnedGroups, Locked, Container, RenderSidebar, AllGroups
    });

    // Insert the new body before the footer, if the footer exists
    if (footer)
    {
        Container.insertBefore(body, footer);
    } else
    {
        Container.appendChild(body);
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
                    sidebar.classList.remove('sidebar-hide');
                    sidebar.style.display = '';
                    document.body.classList.add('sidebar-visible');
                    renderSidebar(sidebar);
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

// Removed setupVideoHighlighting and its call, as highlight logic is now handled above.