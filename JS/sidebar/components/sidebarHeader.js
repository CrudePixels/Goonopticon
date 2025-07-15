// Sidebar Header Component
import { LogDev } from '../../log.js';
import * as browser from 'webextension-polyfill';
import { renderTagFilter } from './tagFilterComponent.js';
import { getAllTags } from '../logic.js';

/**
 * Renders the sidebar header.
 * @param {Object} props - Header properties and handlers.
 * @returns {HTMLElement} The sidebar header DOM element.
 */
export function renderSidebarHeader(props) {
    const {
        groups,
        selectedGroup,
        onGroupSelect,
        onAddGroup,
        onImportPage,
        onExportPage,
        onImportAll,
        onExportAll,
        locked,
        onLockToggle,
        theme,
        onThemeToggle,
        showTagManagerModal,
        notes,
        selectedTags,
        onTagSelect,
        onTagSearch,
        onClearTags
    } = props;

    try {
        const header = document.createElement('div');
        header.className = 'sidebar__header';

        // --- Goonopticon Logo and Title ---
        const logo = document.createElement('img');
        logo.className = 'sidebar-logo';
        logo.src = browser.runtime.getURL('Resources/icon-48.png');
        logo.alt = 'Goonopticon Logo';
        logo.style.display = 'block';
        // Fallback: hide image if it fails to load
        logo.onerror = () => {
            logo.style.display = 'none';
        };
        header.appendChild(logo);

        const title = document.createElement('h2');
        title.className = 'sidebar-title';
        title.textContent = 'Goonopticon';
        title.style.textAlign = 'center';
        header.appendChild(title);

        // --- Divider ---
        const divider1 = document.createElement('div');
        divider1.className = 'sidebar-divider';
        header.appendChild(divider1);

        // --- Hide Sidebar Button ---
        const hideBtn = document.createElement('button');
        hideBtn.className = 'sidebar__action-btn';
        hideBtn.textContent = 'Hide Sidebar';
        hideBtn.style.display = 'block';
        hideBtn.style.margin = '0 auto 12px auto';
        hideBtn.style.maxWidth = '200px';
        hideBtn.onclick = () => {
            browser.storage.local.set({ "PodAwful::SidebarVisible": "false" }).then(() => {
                const sidebar = document.getElementById('podawful-sidebar');
                if (sidebar) {
                    sidebar.classList.add('sidebar-hide');
                    sidebar.style.display = 'none';
                }
                document.body.classList.remove('sidebar-visible');
            });
        };
        header.appendChild(hideBtn);

        // --- Tag Filter Section ---
        const filterSection = document.createElement('div');
        filterSection.className = 'sidebar-tag-filter';
        filterSection.style.textAlign = 'center';
        filterSection.style.marginBottom = '12px';
        
        // Get all available tags from notes
        const allTags = getAllTags(notes || []);
        
        // Render the tag filter component
        const tagFilter = renderTagFilter({
            tags: allTags,
            selectedTags: selectedTags || [],
            onTagSelect: onTagSelect,
            onClear: onClearTags,
            onSearch: onTagSearch,
            showTagManagerModal: showTagManagerModal,
            highlight: props.searchValue || ''
        });
        
        filterSection.appendChild(tagFilter);
        header.appendChild(filterSection);

        // --- Divider ---
        const divider2 = document.createElement('div');
        divider2.className = 'sidebar-divider';
        header.appendChild(divider2);

        return header;
    } catch (e) {
        LogDev('renderSidebarHeader error: ' + e, 'error');
        const errorDiv = document.createElement('div');
        errorDiv.textContent = 'Header failed to render';
        errorDiv.style.color = 'var(--error, #c00)';
        return errorDiv;
    }
} 