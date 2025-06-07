// Drag-and-drop helpers and improved UX

export function highlightCurrentTimestamp()
{
    const v = document.querySelector("video");
    if (!v) return;
    const current = v.currentTime;
    document.querySelectorAll('.note-item').forEach(el =>
    {
        const noteId = el.dataset.noteId;
        const note = window.Notes?.find(n => n.id === noteId);
        if (note && note.time)
        {
            const t = window.ParseTime(note.time);
            if (Math.abs(current - t) < 3)
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
}

// Optional: Setup drag-and-drop accessibility and feedback
export function setupSidebarDragAndDrop(Container, RenderSidebar)
{
    // Add keyboard support, ARIA, and improved feedback here if desired
    // For now, all drag-and-drop is handled in the component files
    // This is a placeholder for future enhancements
}