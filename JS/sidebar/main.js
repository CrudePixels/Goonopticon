import renderSidebar from './render.js';
import { LogDev } from '../log.js';

// Initialize the sidebar when the DOM is ready
if (document.readyState === "complete" || document.readyState === "interactive")
{
    setTimeout(() =>
    {
        LogDev("Sidebar main.js: Initializing sidebar (DOM ready)", "system");
        renderSidebar();
    }, 0);
} else
{
    document.addEventListener("DOMContentLoaded", () =>
    {
        LogDev("Sidebar main.js: Initializing sidebar (DOMContentLoaded)", "system");
        renderSidebar();
    });
}