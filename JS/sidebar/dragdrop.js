import { LogDev } from '../log.js';
import { isTimeClose } from './logic.js';

/**
 * Highlights the current timestamp in the sidebar.
 * @param {number} [threshold=5] - The time threshold in seconds.
 */
export function highlightCurrentTimestamp(threshold = 5)
{
    // Get notes from the current page context instead of relying on window.Notes
    const sidebar = document.getElementById('podawful-sidebar');
    if (!sidebar) {
        LogDev("highlightCurrentTimestamp: sidebar not found", "event");
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
        let anyHighlighted = false;
        
        // Get all note items in the current sidebar
        document.querySelectorAll('.note-item').forEach(el =>
        {
            const noteId = el.dataset.noteId;
            if (!noteId) return;
            
            // Find the note timestamp element within this note item
            const timestampEl = el.querySelector('.note-timestamp');
            if (!timestampEl || !timestampEl.textContent) {
                el.classList.remove('highlight');
                return;
            }
            
            const timeStr = timestampEl.textContent.trim();
            if (!timeStr) {
                el.classList.remove('highlight');
                return;
            }
            
            // Parse the timestamp
            const t = parseTime(timeStr);
            if (!isNaN(t) && isTimeClose(current, t, threshold))
            {
                el.classList.add("highlight");
                anyHighlighted = true;
                LogDev(`Highlighting note ${noteId} at time ${timeStr} (current: ${current.toFixed(1)}s)`, "event");
            } else
            {
                el.classList.remove("highlight");
            }
        });
        
        if (!anyHighlighted) {
            LogDev(`No notes highlighted at video time ${current.toFixed(1)}s`, "event");
        }
    } catch (err)
    {
        LogDev("highlightCurrentTimestamp error: " + err, "error");
    }
}

// Helper function to parse time strings
function parseTime(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return NaN;
    
    try {
        const parts = timeStr.trim().split(":").map(Number);
        if (parts.some(isNaN)) return NaN;
        
        let seconds = 0;
        if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
        else seconds = Number(timeStr) || 0;
        
        return seconds;
    } catch (err) {
        return NaN;
    }
}

/**
 * Sets up drag-and-drop for the sidebar.
 * @param {HTMLElement} container - The sidebar container.
 * @param {function} renderSidebar - Function to rerender the sidebar.
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

// Highlight notes as video approaches timestamp
let highlightTimer = null;
export function startHighlightingTimestamps() {
    if (highlightTimer) clearInterval(highlightTimer);
    
    // Set up video event listeners for better highlighting control
    const video = document.querySelector('video');
    if (video) {
        // Clear highlights when video is paused
        video.addEventListener('pause', () => {
            clearAllHighlights();
        });
        
        // Resume highlighting when video plays
        video.addEventListener('play', () => {
            if (highlightTimer) clearInterval(highlightTimer);
            highlightTimer = setInterval(() => highlightCurrentTimestamp(5), 500);
        });
    }
    
    highlightTimer = setInterval(() => highlightCurrentTimestamp(5), 500);
}

export function stopHighlightingTimestamps() {
    if (highlightTimer) clearInterval(highlightTimer);
    highlightTimer = null;
    
    // Clear all highlights when stopping
    document.querySelectorAll('.note-item.highlight').forEach(el => {
        el.classList.remove('highlight');
    });
}

export function clearAllHighlights() {
    document.querySelectorAll('.note-item.highlight').forEach(el => {
        el.classList.remove('highlight');
    });
}