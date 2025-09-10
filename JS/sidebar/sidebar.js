import { renderSidebarHeader } from './components/sidebarHeader.js';
import { renderSidebarBody } from './components/sidebarBody.js';
import { renderSidebarFooter } from './components/sidebarFooter.js';
import { showTagManager } from './tagmanager.js';
import { highlightCurrentTimestamp, setupSidebarDragAndDrop } from './dragdrop.js';
import { getTimecode, parseTime } from './logic.js';
import
{
    getNotes, getPinnedGroups, getCompact, getTheme, getSidebarVisible,
    getLockedPromise, getTagFilter, getNoteSearch, getGroups, getAllNotes, setAllNotes,
    addGroup, addNote, deleteGroup, renameGroup, saveUndo, setGroups, setInStorage, setLocked, setNoteSearch, setNotes, setPinnedGroups, setSidebarVisible, setTagFilter, setTheme, getDevLog, getUndo, SCHEMA_VERSION
} from './storage.js';
import { LogDev } from '../log.js';
import { normalizeYouTubeUrl } from '../utils.js';
import { applyTheme } from '../theme.js';
import { showInputModal } from './modal.js';
import * as browser from 'webextension-polyfill';

import initSidebar from './main.js';
import { startHighlightingTimestamps, stopHighlightingTimestamps } from './dragdrop.js';
import quotesRaw from '../../Resources/Quotes.txt';

initSidebar();

// Add a global to track the current error message
let currentSidebarError = null;

function showSidebarError(message) {
    currentSidebarError = message;
    const errorBanner = document.createElement('div');
    errorBanner.className = 'sidebar__error-banner';
    errorBanner.textContent = message;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sidebar__error-close';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Dismiss error');
    closeBtn.onclick = () => {
        currentSidebarError = null;
        if (errorBanner.parentNode) errorBanner.parentNode.removeChild(errorBanner);
    };
    errorBanner.appendChild(closeBtn);
    // Insert at the very top of the sidebar container
    const sidebar = document.getElementById('podawful-sidebar') || document.querySelector('.sidebar');
    if (sidebar) sidebar.insertBefore(errorBanner, sidebar.firstChild);
}

// Bulk selection state
let selectedNoteIds = new Set();
let selectedGroupNames = new Set();

function clearBulkSelection() {
    selectedNoteIds.clear();
    selectedGroupNames.clear();
}

// === CSV/Markdown Conversion Utilities ===
function notesToCSV(notes) {
    if (!Array.isArray(notes) || notes.length === 0) return '';
    const header = ['id', 'text', 'time', 'group', 'tags'];
    const rows = notes.map(n => [
        n.id,
        '"' + (n.text || '').replace(/"/g, '""') + '"',
        n.time || '',
        n.group || '',
        (n.tags || []).join(';')
    ]);
    return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
}
function notesToMarkdown(notes) {
    if (!Array.isArray(notes) || notes.length === 0) return '';
    return notes.map(n => {
        let line = `- [${n.time || ''}] ${n.text || ''}`;
        if (n.tags && n.tags.length) line += ` (tags: ${n.tags.join(', ')})`;
        if (n.group) line += ` [group: ${n.group}]`;
        return line;
    }).join('\n');
}
function csvToNotes(csv) {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const header = lines[0].split(',');
    return lines.slice(1).map(line => {
        const cols = line.split(',');
        const note = {};
        header.forEach((h, i) => {
            if (h === 'tags') note.tags = cols[i] ? cols[i].split(';') : [];
            else note[h] = cols[i] || '';
        });
        return note;
    });
}
function markdownToNotes(md) {
    const lines = md.trim().split(/\r?\n/);
    return lines.map(line => {
        const match = line.match(/^- \[(.*?)\] (.*?)(?: \(tags: (.*?)\))?(?: \[group: (.*?)\])?$/);
        if (!match) return null;
        const [, time, text, tags, group] = match;
        return {
            id: Math.random().toString(36).slice(2),
            time: time || '',
            text: text || '',
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            group: group || ''
        };
    }).filter(Boolean);
}

/**
 * Renders the entire sidebar UI.
 * @param {HTMLElement} Container - The sidebar container element.
 * @param {Array} [overrideSelectedTags] - Optional override for selected tags.
 * @param {boolean} [forceHeaderRerender=false] - Force header rerender.
 * @param {string|null} [overrideSearch=null] - Optional override for search string.
 */
export function renderSidebar(Container, overrideSelectedTags, forceHeaderRerender = false, overrideSearch = null)
{
    LogDev('[Sidebar] renderSidebar called', 'event');
    if (!Container)
    {
        LogDev('[Sidebar] Container is null/undefined', 'error');
        return;
    }
    // Remove any existing error banner before rendering
    const oldBanner = Container.querySelector('.sidebar__error-banner');
    if (oldBanner) oldBanner.remove();
    if (currentSidebarError) showSidebarError(currentSidebarError);
    Promise.all([
        new Promise(Resolve => getNotes(normalizeYouTubeUrl(location.href), (data) => Resolve(Array.isArray(data) ? data : []))),
        new Promise(Resolve => getPinnedGroups((err, data) => Resolve(Array.isArray(data) ? data : []))),
        new Promise(Resolve => getCompact((err, data) => Resolve(data))),
        new Promise(Resolve => getTheme((err, data) => Resolve(data))),
        new Promise(Resolve => getSidebarVisible((err, data) => Resolve(data))),
        getLockedPromise(),
        new Promise(Resolve => getTagFilter((err, data) => Resolve(Array.isArray(data) ? data : []))),
        new Promise(Resolve => getNoteSearch((err, data) => Resolve(data))),
        browser.storage.local.get(['PodAwful::EnableBulkActions']).then(result => result['PodAwful::EnableBulkActions'] === true)
    ]).then(([Notes, PinnedGroups, Compact, Theme, SidebarVisible, Locked, SelectedTags, Search, BulkActionsEnabled]) =>
    {
        LogDev('[Sidebar] Data loaded: ' + JSON.stringify({ Notes, PinnedGroups, Compact, Theme, SidebarVisible, Locked, SelectedTags, Search }), 'data');
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
            stopHighlightingTimestamps();
            cleanupVideoHighlightHandler();
            return;
        } else
        {
            Container.classList.remove('sidebar-hide');
            Container.style.display = '';
            document.body.classList.add('sidebar-visible');
            startHighlightingTimestamps();
        }

        // Fetch groups before rendering body
        getGroups((err, AllGroupsRaw) =>
        {
            if (err) {
                LogDev('[Sidebar] GetGroups error: ' + err, 'error');
                showSidebarError('Failed to load groups from storage. Some features may not work.');
            }
            // Extract group name if group is an object, else use as is
            const AllGroups = Array.isArray(AllGroupsRaw)
                ? AllGroupsRaw.map(g => typeof g === 'string' ? g : (g.name || g.groupName || g.title || String(g)))
                : [];
            // Ensure AllGroups is always an array of strings
            const AllGroupsSanitized = AllGroups.map(g => typeof g === 'string' ? g : String(g));
            LogDev('[Sidebar] AllGroups: ' + JSON.stringify(AllGroupsSanitized), 'data');
            Container.innerHTML = '';

            async function onAddGroup() {
                if (Locked) return;
                const groupName = await showInputModal({
                    title: "Add Group",
                    label: "Group name:",
                    placeholder: "Enter group name"
                });
                if (!groupName || !groupName.trim()) {
                    // Optionally show a status message
                    return;
                }
                addGroup(groupName.trim(), (err) => {
                    if (err) {
                        showSidebarError('Failed to add group. Please try again.');
                        return;
                    }
                    renderSidebar(Container);
                });
            }

            // --- Import/Export Handlers ---
            async function onExportPage() {
                getNotes(normalizeYouTubeUrl(location.href), (notes) => {
                    // Ask user for format
                    const format = prompt('Export format: json, csv, or md?', 'json');
                    let blob, filename;
                    if (format === 'csv') {
                        blob = new Blob([notesToCSV(notes)], { type: 'text/csv' });
                        filename = 'goonopticon-page-notes.csv';
                    } else if (format === 'md' || format === 'markdown') {
                        blob = new Blob([notesToMarkdown(notes)], { type: 'text/markdown' });
                        filename = 'goonopticon-page-notes.md';
                    } else {
                        blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
                        filename = 'goonopticon-page-notes.json';
                    }
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                });
            }
            async function onImportPage() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,application/json,.csv,text/csv,.md,text/markdown';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        try {
                            let notes;
                            if (file.name.endsWith('.csv')) {
                                notes = csvToNotes(evt.target.result);
                            } else if (file.name.endsWith('.md')) {
                                notes = markdownToNotes(evt.target.result);
                            } else {
                                notes = JSON.parse(evt.target.result);
                            }
                            setNotes(normalizeYouTubeUrl(location.href), notes, (err) => {
                                if (err) showSidebarError('Failed to import notes.');
                                else renderSidebar(Container);
                            });
                        } catch (e) { showSidebarError('Invalid file format.'); }
                    };
                    reader.readAsText(file);
                };
                input.click();
            }
            async function onExportAll() {
                try {
                    const allNotes = await getAllNotes();
                    const allGroups = await getGroups();
                    
                    const exportData = {
                        notes: allNotes,
                        groups: allGroups,
                        exportDate: new Date().toISOString(),
                        version: '2.0.6'
                    };
                    
                    const dataStr = JSON.stringify(exportData, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `podawful-notes-export-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                    
                    showSidebarError('All notes exported successfully!');
                } catch (err) {
                    LogDev('Error exporting all notes: ' + err, 'error');
                    showSidebarError('Failed to export all notes.');
                }
            }
            async function onImportAll() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        
                        if (data.notes && data.groups) {
                            await setAllNotes(data.notes);
                            await setGroups(data.groups);
                            showSidebarError('All notes imported successfully!');
                            renderSidebar(document.getElementById('podawful-sidebar'));
                        } else {
                            showSidebarError('Invalid export file format.');
                        }
                    } catch (err) {
                        LogDev('Error importing all notes: ' + err, 'error');
                        showSidebarError('Failed to import notes. Invalid file format.');
                    }
                };
                input.click();
            }

            async function onClearAll() {
                const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
                    title: 'Clear All Notes',
                    message: 'Are you sure you want to delete ALL notes on this page? This cannot be undone.',
                    okText: 'Delete All',
                    cancelText: 'Cancel'
                }) : Promise.resolve(confirm('Delete ALL notes on this page?')));
                if (!confirmed) return;
                setNotes(normalizeYouTubeUrl(location.href), [], (err) => {
                    if (err) {
                        showSidebarError('Failed to clear notes.');
                        return;
                    }
                    renderSidebar(Container);
                });
            }

            function showTagManagerModal() {
                showTagManager(Container, renderSidebar);
            }

            async function onLockToggle() {
                setLocked(!Locked, (err) => {
                    if (err) {
                        showSidebarError('Failed to toggle lock.');
                        return;
                    }
                    renderSidebar(Container);
                });
            }

            async function onAddNote() {
                if (Locked) return;
                const noteText = await window.showInputModal({
                    title: 'Add Note',
                    label: 'Note text:',
                    placeholder: 'Enter note text',
                    validate: val => val.trim() ? true : 'Note text cannot be empty.'
                });
                if (!noteText || !noteText.trim()) return;
                const note = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    text: noteText.trim(),
                    time: '',
                    group: AllGroupsSanitized && AllGroupsSanitized[0] ? AllGroupsSanitized[0] : 'Default',
                    tags: []
                };
                addNote(note, (err) => {
                    if (err) {
                        showSidebarError('Failed to add note.');
                        return;
                    }
                    renderSidebar(Container);
                });
            }

            async function onAddTimestamp() {
                if (Locked) return;
                // Get note text
                let noteText = await window.showInputModal({
                    title: 'Add Timestamped Note',
                    label: 'Note text:',
                    placeholder: 'Enter note text',
                    validate: val => val.trim() ? true : 'Note text cannot be empty.'
                });
                if (!noteText || !noteText.trim()) return;
                // Get current video time
                let currentTime = '';
                const v = document.querySelector('video');
                if (v) {
                    const seconds = Math.floor(v.currentTime);
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = seconds % 60;
                    currentTime = h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
                }
                // Get timestamp
                let noteTime = await window.showInputModal({
                    title: 'Timestamp',
                    label: currentTime ? `Timestamp (leave blank to use current video time: ${currentTime})` : 'Timestamp (e.g., 1:23 or 1:23:45):',
                    placeholder: currentTime ? `e.g., 1:23 or 1:23:45 (current: ${currentTime})` : 'e.g., 1:23 or 1:23:45',
                    validate: val => {
                        if (!val || !val.trim()) return true; // Allow empty (will use current time)
                        const trimmed = val.trim();
                        // Allow only numbers and colons (e.g., 1:23, 1:23:45, or just 123)
                        if (!/^[\d:]+$/.test(trimmed)) {
                            return 'Timestamp can only contain numbers and colons (e.g., 1:23 or 1:23:45)';
                        }
                        // Basic format validation - should be like 1:23 or 1:23:45 or just numbers
                        if (!/^(\d+|\d+:\d+|\d+:\d+:\d+)$/.test(trimmed)) {
                            return 'Invalid timestamp format. Use format like 1:23 or 1:23:45';
                        }
                        return true;
                    }
                });
                if (!noteTime || !noteTime.trim()) noteTime = currentTime;
                if (!noteTime || !noteTime.trim()) return;
                // Parse noteTime: if it's a number, treat as seconds
                let parsedTime = noteTime.trim();
                if (/^\d+$/.test(parsedTime)) {
                    const seconds = parseInt(parsedTime, 10);
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = seconds % 60;
                    parsedTime = h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
                }
                let groupName = 'Default';
                if (AllGroupsSanitized && AllGroupsSanitized.length > 0) {
                    groupName = typeof AllGroupsSanitized[0] === 'string' ? AllGroupsSanitized[0] : (AllGroupsSanitized[0].name || AllGroupsSanitized[0].groupName || AllGroupsSanitized[0].title || String(AllGroupsSanitized[0]));
                }
                groupName = String(groupName);
                const note = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    text: noteText.trim(),
                    time: parsedTime,
                    group: groupName,
                    tags: []
                };
                addNote(note, (err) => {
                    if (err) {
                        showSidebarError('Failed to add timestamped note.');
                        return;
                    }
                    renderSidebar(Container);
                });
            }

            // Search functionality
            function onSearch(searchTerm) {
                // Store search term and rerender with filtered results
                setNoteSearch(searchTerm, (err) => {
                    if (err) {
                        showSidebarError('Failed to save search term.');
                        return;
                    }
                    renderSidebar(Container, null, false, searchTerm);
                });
            }

            // Tag filtering functionality
            function onTagSelect(tag) {
                const newSelectedTags = SelectedTags ? [...SelectedTags] : [];
                const tagIndex = newSelectedTags.indexOf(tag);
                if (tagIndex > -1) {
                    newSelectedTags.splice(tagIndex, 1);
                } else {
                    newSelectedTags.push(tag);
                }
                setTagFilter(newSelectedTags, (err) => {
                    if (err) {
                        showSidebarError('Failed to update tag filter.');
                        return;
                    }
                    renderSidebar(Container, newSelectedTags);
                });
            }

            function onClearTags() {
                setTagFilter([], (err) => {
                    if (err) {
                        showSidebarError('Failed to clear tag filter.');
                        return;
                    }
                    renderSidebar(Container, []);
                });
            }

            function onTagSearch(searchTerm) {
                // This can be used for filtering tags in the tag filter component
                // For now, we'll use the same search functionality
                onSearch(searchTerm);
            }

            // Filter notes based on search term and selected tags
            function filterNotes(notes, searchTerm, selectedTags) {
                let filtered = notes;
                
                // Filter by search term
                if (searchTerm && searchTerm.trim()) {
                    const term = searchTerm.toLowerCase().trim();
                    filtered = filtered.filter(note => {
                        // Search in note text
                        if (note.text && note.text.toLowerCase().includes(term)) return true;
                        // Search in group name
                        if (note.group && note.group.toLowerCase().includes(term)) return true;
                        // Search in tags
                        if (note.tags && Array.isArray(note.tags)) {
                            if (note.tags.some(tag => tag.toLowerCase().includes(term))) return true;
                        }
                        // Search in timestamp
                        if (note.time && note.time.toLowerCase().includes(term)) return true;
                        return false;
                    });
                }
                
                // Filter by selected tags
                if (selectedTags && selectedTags.length > 0) {
                    filtered = filtered.filter(note => {
                        if (!note.tags || !Array.isArray(note.tags)) return false;
                        return selectedTags.some(selectedTag => note.tags.includes(selectedTag));
                    });
                }
                
                return filtered;
            }

            // Filter groups based on search term and selected tags
            function filterGroups(groups, notes, searchTerm, selectedTags) {
                let filtered = groups;
                
                // Filter by search term
                if (searchTerm && searchTerm.trim()) {
                    const term = searchTerm.toLowerCase().trim();
                    const matchingGroups = new Set();
                    
                    // Find groups that have matching notes
                    notes.forEach(note => {
                        if (note.text && note.text.toLowerCase().includes(term)) {
                            matchingGroups.add(note.group);
                        }
                        if (note.tags && Array.isArray(note.tags)) {
                            if (note.tags.some(tag => tag.toLowerCase().includes(term))) {
                                matchingGroups.add(note.group);
                            }
                        }
                    });
                    
                    // Also include groups whose names match
                    groups.forEach(group => {
                        if (String(group).toLowerCase().includes(term)) {
                            matchingGroups.add(String(group));
                        }
                    });
                    
                    filtered = filtered.filter(group => matchingGroups.has(String(group)));
                }
                
                // Filter by selected tags
                if (selectedTags && selectedTags.length > 0) {
                    const groupsWithSelectedTags = new Set();
                    notes.forEach(note => {
                        if (note.tags && Array.isArray(note.tags)) {
                            if (selectedTags.some(selectedTag => note.tags.includes(selectedTag))) {
                                groupsWithSelectedTags.add(note.group);
                            }
                        }
                    });
                    filtered = filtered.filter(group => groupsWithSelectedTags.has(String(group)));
                }
                
                return filtered;
            }

            const filteredNotes = filterNotes(Notes, overrideSearch ?? Search, SelectedTags);
            const filteredGroups = filterGroups(AllGroupsSanitized, Notes, overrideSearch ?? Search, SelectedTags);

            const header = renderSidebarHeader({
                Notes, SelectedTags, Locked, Search: overrideSearch ?? Search, Theme, Container, RenderSidebar: renderSidebar,
                PinnedGroups, groups: AllGroupsSanitized, AllGroups: AllGroupsSanitized,
                onAddGroup,
                onImportPage,
                onExportPage,
                onImportAll,
                onExportAll,
                showTagManagerModal,
                onLockToggle,
                onSearch,
                onNoteSearch: onSearch,
                searchValue: overrideSearch ?? Search,
                notes: Notes,
                selectedTags: SelectedTags,
                onTagSelect,
                onTagSearch,
                onClearTags
            });
            Container.appendChild(header);

            // Pass selection state and handlers to sidebar body
            const body = renderSidebarBody({
                groups: filteredGroups,
                allGroups: AllGroupsSanitized, // Pass original groups for reordering
                notes: filteredNotes,
                selectedGroup: null, // not used for bulk
                locked: Locked,
                container: Container,
                renderSidebar: renderSidebar,
                highlight: overrideSearch ?? Search,
                selectedNoteIds,
                selectedGroupNames,
                onNoteSelect: (noteId, checked) => {
                    if (checked) selectedNoteIds.add(noteId); else selectedNoteIds.delete(noteId);
                    renderSidebar(Container);
                },
                onGroupSelect: (groupName, checked) => {
                    if (checked) selectedGroupNames.add(groupName); else selectedGroupNames.delete(groupName);
                    renderSidebar(Container);
                },
                clearBulkSelection,
                bulkActionsEnabled: BulkActionsEnabled
            });
            // Make body expandable with content
            body.style.overflowY = 'auto';
            body.style.maxHeight = 'calc(100vh - 200px)'; // Allow expansion up to viewport
            body.style.flex = '1'; // Expand to fill available space
            Container.appendChild(body);

            const footer = renderSidebarFooter({ 
                Locked, 
                Container, 
                RenderSidebar: renderSidebar, 
                onAddNote, 
                onClearAll,
                onAddGroup,
                onAddTimestamp,
                onLockToggle,
                locked: Locked,
                groups: AllGroupsSanitized
            });
            Container.appendChild(footer);

            updateShowSidebarButton();

            // Theme and drag/drop logic
            // Set globals for highlightCurrentTimestamp
            window.Notes = Notes;
            window.ParseTime = parseTime;
            const v = document.querySelector("video");
            if (v)
            {
                cleanupVideoHighlightHandler();
                v._podawfulHighlightHandler = () =>
                {
                    highlightCurrentTimestamp();
                };
                v.addEventListener("timeupdate", v._podawfulHighlightHandler);
                // Initial highlight after render
                highlightCurrentTimestamp();
            }
            setupSidebarDragAndDrop(Container, renderSidebar);

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
        LogDev('[Sidebar] Failed to load: ' + Err, 'error');
        if (Container)
        {
            Container.innerHTML = "<div style='color:var(--accent)'>Failed to load sidebar. Please reload the page.</div>";
        }
    });
}

/**
 * Updates the sidebar body (notes/groups) in place.
 * @param {HTMLElement} Container - The sidebar container element.
 * @param {Array} Notes - Notes array.
 * @param {Array} SelectedTags - Selected tags array.
 * @param {string} Search - Search string.
 * @param {Array} PinnedGroups - Pinned groups array.
 * @param {boolean} Locked - Locked state.
 * @param {function} RenderSidebar - Sidebar rerender function.
 * @param {Array} AllGroups - All group names.
 */
export function updateSidebarBody(Container, Notes, SelectedTags, Search, PinnedGroups, Locked, RenderSidebar, AllGroups)
{
    // Remove the old body
    const oldBody = Container.querySelector('.sidebar-body');
    if (oldBody) oldBody.remove();

    // Find the footer
    const footer = Container.querySelector('.sidebar__footer');

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
            showBtn.className = 'sidebar__action-btn sidebar__action-btn--floating';

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
                browser.storage.local.set({ "PodAwful::SidebarVisible": "true" }).then(() => {
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

// Add a cleanup function to remove the timeupdate event listener from the video element when the sidebar is hidden or re-rendered.
function cleanupVideoHighlightHandler() {
    const v = document.querySelector("video");
    if (v && v._podawfulHighlightHandler) {
        v.removeEventListener("timeupdate", v._podawfulHighlightHandler);
        delete v._podawfulHighlightHandler;
    }
}

// Add message listener for IMPORT_NOTES from popup
if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.onMessage) {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && message.type === 'IMPORT_NOTES' && Array.isArray(message.notes)) {
            // Validate notes format: must be array of objects with at least 'text' and 'group'
            const valid = message.notes.every(n => n && typeof n === 'object' && typeof n.text === 'string' && typeof n.group === 'string');
            if (!valid) {
                if (typeof showSidebarError === 'function') {
                    showSidebarError('Import failed: Invalid note format.');
                }
                sendResponse({ success: false, error: 'Invalid note format' });
                return true;
            }
            setNotes(normalizeYouTubeUrl(location.href), message.notes, (err) => {
                if (!err) {
                    // Also update groups list to include all unique group names from imported notes
                    const importedGroups = Array.from(new Set(message.notes.map(n => n.group).filter(Boolean)));
                    if (importedGroups.length > 0) {
                        setGroups(importedGroups, () => {
                            const sidebar = document.getElementById('podawful-sidebar');
                            if (sidebar && typeof window.renderSidebar === 'function') {
                                window.renderSidebar(sidebar);
                            } else if (typeof renderSidebar === 'function' && sidebar) {
                                renderSidebar(sidebar);
                            }
                            sendResponse({ success: true });
                        });
                    } else {
                        const sidebar = document.getElementById('podawful-sidebar');
                        if (sidebar && typeof window.renderSidebar === 'function') {
                            window.renderSidebar(sidebar);
                        } else if (typeof renderSidebar === 'function' && sidebar) {
                            renderSidebar(sidebar);
                        }
                        sendResponse({ success: true });
                    }
                } else {
                    sendResponse({ success: false });
                }
            });
            return true; // Keep the message channel open for async response
        }
        if (message && message.type === 'EXPORT_NOTES') {
            getNotes(normalizeYouTubeUrl(location.href), (notes) => {
                sendResponse({ notes: Array.isArray(notes) ? notes : [] });
            });
            return true; // Keep the message channel open for async response
        }
    });
}