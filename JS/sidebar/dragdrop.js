import { LogDev } from '../log.js';
import { IsTimeClose } from './logic.js'; // <-- Add this import

// Drag-and-drop helpers and improved UX

/**
 * Highlights notes whose timestamp is close to the current video time.
 * @param {Array} Notes - The array of note objects.
 * @param {Function} ParseTime - Function to parse a time string to seconds.
 * @param {number} [threshold=5] - Highlight threshold in seconds.
 */
export function highlightCurrentTimestamp(Notes = window.Notes, ParseTime = window.ParseTime, threshold = 5) // default threshold 5s
{
    LogDev("highlightCurrentTimestamp called", "event");
    // Notes and ParseTime are expected to be provided or available globally.
    // If not, highlighting will be skipped.
    try
    {
        const v = document.querySelector("video");
        if (!v || !Notes || typeof ParseTime !== "function")
        {
            LogDev("highlightCurrentTimestamp: prerequisites missing (video, Notes, or ParseTime)", "event");
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
                if (isNaN(t))
                {
                    el.classList.remove("highlight");
                    LogDev(`Note ${note.id} has invalid time, not highlighted`, "event");
                    return;
                }
                if (IsTimeClose(current, t, threshold)) // Use utility function
                {
                    el.classList.add("highlight");
                    LogDev(`Note highlighted: ${note.id}`, "render");
                } else
                {
                    el.classList.remove("highlight");
                }
            } else
            {
                el.classList.remove('highlight');
            }
        });
        LogDev("highlightCurrentTimestamp completed", "event");
    } catch (err)
    {
        LogDev("DragDrop highlightCurrentTimestamp error: " + err, "error");
    }
}

/**
 * Placeholder for future drag-and-drop accessibility and feedback enhancements.
 * Currently, drag-and-drop is handled in the component files.
 * @param {HTMLElement} Container
 * @param {Function} RenderSidebar
 */
export function setupSidebarDragAndDrop(Container, RenderSidebar)
{
    LogDev("setupSidebarDragAndDrop called", "event");
    try
    {
        // TODO: Add keyboard support, ARIA, and improved feedback here.
        // No-op for now.
        LogDev("setupSidebarDragAndDrop completed (no-op)", "event");
    } catch (err)
    {
        LogDev("DragDrop setupSidebarDragAndDrop error: " + err, "error");
    }
}