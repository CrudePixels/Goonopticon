// Renders the sidebar UI and handles updates
export function RenderSidebar(Container)
{
    try
    {
        Promise.all([
            new Promise(resolve => GetNotes(location.href, resolve)),
            new Promise(resolve => GetPinnedGroups(resolve)),
            new Promise(resolve => GetCompact(resolve)),
            new Promise(resolve => GetTheme(resolve)),
            new Promise(resolve => GetSidebarVisible(resolve)),
            GetLockedPromise(),
            new Promise(resolve => GetTagFilter(resolve)),
            new Promise(resolve => GetNoteSearch(resolve))
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

            // ... (rest of your sidebar rendering logic, including header, groups, notes, etc.)
        });
    } catch (e)
    {
        LogDev("[ERROR] Sidebar Promise.all failed: " + (e && e.stack || e));
        LogDev("[ERROR] RenderSidebar: " + (e.stack || e));
    }
}