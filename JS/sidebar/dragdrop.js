import { LogDev } from '../log.js';
import { IsTimeClose } from './logic.js';

/**
 * Highlights notes whose timestamp is close to the current video time.
 * @param {number} [threshold=5] - Highlight threshold in seconds.
 */
export function highlightCurrentTimestamp(threshold = 5)
{
    const Notes = window.Notes;
    const ParseTime = window.ParseTime;
    if (!Notes || typeof ParseTime !== "function")
    {
        LogDev("highlightCurrentTimestamp: Notes or ParseTime not available", "event");
        return;
    }
    try
    {
        const v = document.querySelector("video");
        if (!v)
        {
            LogDev("highlightCurrentTimestamp: video element not found", "event");
            return;
        }
        const current = v.currentTime;
        document.querySelectorAll('.note-item').forEach(el =>
        {
            const noteId = el.dataset.noteId;
            const note = Notes.find(n => n.id === noteId);
            if (note && note.time)
            {
                const t = ParseTime(note.time);
                if (!isNaN(t) && IsTimeClose(current, t, threshold))
                {
                    el.classList.add("highlight");
                } else
                {
                    el.classList.remove("highlight");
                }
            } else
            {
                el.classList.remove('highlight');
            }
        });
    } catch (err)
    {
        LogDev("highlightCurrentTimestamp error: " + err, "error");
    }
}

/**
 * Enables drag-and-drop for sidebar note items and shows visual drop zones.
 * @param {HTMLElement} container - The sidebar container element.
 * @param {Function} renderSidebar - Function to re-render the sidebar after reordering.
 */
export function setupSidebarDragAndDrop(container, renderSidebar)
{
    LogDev("setupSidebarDragAndDrop called", "event");
    try
    {
        let isDragging = false;

        // Add drag event listeners to all note items
        container.querySelectorAll('.note-item').forEach(item =>
        {
            item.setAttribute('draggable', 'true');

            item.addEventListener('dragstart', (e) =>
            {
                isDragging = true;
                container.classList.add('dragging-notes');
            });

            item.addEventListener('dragend', () =>
            {
                isDragging = false;
                container.classList.remove('dragging-notes');
                // Remove drag-over from all dropzones
                container.querySelectorAll('.note-dropzone').forEach(zone => zone.classList.remove('drag-over'));
            });
        });

        // Add drag event listeners to all drop zones
        container.querySelectorAll('.note-dropzone').forEach(dropZone =>
        {
            dropZone.addEventListener('dragover', (e) =>
            {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', () =>
            {
                dropZone.classList.remove('drag-over');
            });
            dropZone.addEventListener('drop', (e) =>
            {
                dropZone.classList.remove('drag-over');
                // The actual drop logic is handled in noteComponent.js
            });
        });
    } catch (err)
    {
        LogDev("setupSidebarDragAndDrop error: " + err, "error");
    }
}