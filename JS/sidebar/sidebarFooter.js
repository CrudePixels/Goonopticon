import { AddNote } from './storage.js';
import { GenerateNoteId, GetTimecode } from './logic.js';
import { RenderSidebar } from './render.js';
import { LogDev } from '../log.js';

export function renderSidebarFooter({ Locked, Container, RenderSidebar })
{
    LogDev("Sidebar footer rendered", "render");

    const Footer = document.createElement("div");
    Footer.className = "sidebar-footer";

    // Status message area
    const statusDiv = document.createElement("div");
    statusDiv.className = "sidebar-footer-status";
    statusDiv.style.color = "#FFD600";
    statusDiv.style.margin = "4px 0 8px 0";
    Footer.appendChild(statusDiv);

    function showStatus(msg, duration = 2000)
    {
        statusDiv.textContent = msg;
        if (duration > 0) setTimeout(() => { statusDiv.textContent = ""; }, duration);
        LogDev("Sidebar footer status: " + msg, "event");
    }

    const actions = [
        { text: "+ Timestamp", id: "sidebarAddTimestamp", aria: "Add timestamped note" },
        { text: "+ Note", id: "sidebarAddNote", aria: "Add note" },
        { text: Locked ? "Unlock" : "Lock", id: "sidebarLock", aria: Locked ? "Unlock notes" : "Lock notes" }
    ];
    actions.forEach(action =>
    {
        const btn = document.createElement("button");
        btn.textContent = action.text;
        btn.id = action.id;
        btn.className = "sidebar-action-btn";
        btn.setAttribute('aria-label', action.aria);
        btn.disabled = (action.id !== "sidebarLock" && Locked);
        switch (action.id)
        {
            case "sidebarAddTimestamp":
                btn.onclick = () =>
                {
                    LogDev("Sidebar footer button clicked: Add Timestamp", "interaction");
                    if (Locked) return;
                    const v = document.querySelector("video");
                    let defaultTime = v ? GetTimecode(v.currentTime) : "";
                    let inputTime = prompt("Timestamp? (leave blank for current)", defaultTime);
                    LogDev("Prompt for timestamp: " + (inputTime ? "User entered: " + inputTime : "User cancelled"), "interaction");
                    if (inputTime === null) return; // Added null check
                    let time = inputTime && inputTime.trim() !== "" ? inputTime.trim() : defaultTime;
                    const text = prompt("Note:");
                    LogDev("Prompt for note text: " + (text ? "User entered text" : "User cancelled"), "interaction");
                    if (text === null || !text.trim())
                    {
                        showStatus("Note text cannot be empty.");
                        LogDev("Add Timestamp cancelled: empty note", "event");
                        return;
                    }
                    AddNote({
                        id: GenerateNoteId(),
                        group: "Ungrouped",
                        text: text.trim(),
                        time: time,
                        tags: [],
                        created: Date.now()
                    }, (err) =>
                    {
                        if (err)
                        {
                            LogDev("Sidebar footer error: " + err, "error");
                            showStatus("Failed to add note.");
                        } else
                        {
                            LogDev("Note with timestamp added", "event");
                            RenderSidebar(Container);
                        }
                    });
                };
                break;
            case "sidebarAddNote":
                btn.onclick = () =>
                {
                    LogDev("Sidebar footer button clicked: Add Note", "interaction");
                    if (Locked) return;
                    const text = prompt("Enter note text:");
                    LogDev("Prompt for note text: " + (text ? "User entered text" : "User cancelled"), "interaction");
                    if (!text || !text.trim())
                    {
                        showStatus("Note text cannot be empty.");
                        LogDev("Add Note cancelled: empty note", "event");
                        return;
                    }

                    AddNote({
                        id: GenerateNoteId(),
                        group: "Ungrouped",
                        text: text.trim(),
                        time: "",
                        tags: [],
                        created: Date.now()
                    }, (err) =>
                    {
                        if (err)
                        {
                            LogDev("Sidebar footer error: " + err, "error");
                            showStatus("Failed to add note.");
                        } else
                        {
                            LogDev("Note added", "event");
                            LogDev("Note added: " + note.id, "interaction");
                            RenderSidebar(Container);
                        }
                    });
                };
                break;
            case "sidebarLock":
                btn.onclick = () =>
                {
                    LogDev("Sidebar footer button clicked: Lock/Unlock", "interaction");
                    // Toggle lock state
                    import('./storage.js').then(({ SetLocked }) =>
                    {
                        SetLocked(!Locked, (err) =>
                        {
                            if (err)
                            {
                                LogDev("Sidebar footer error: " + err, "error");
                                showStatus("Failed to toggle lock.");
                            } else
                            {
                                LogDev("Sidebar lock toggled", "event");
                                RenderSidebar(Container);
                            }
                        });
                    });
                };
                break;
        }
        Footer.appendChild(btn);
    });

    // Add Visit PodAwful link to the footer
    const visitLink = document.createElement("a");
    visitLink.href = "https://podawful.com/";
    visitLink.target = "_blank";
    visitLink.rel = "noopener noreferrer";
    visitLink.textContent = "Visit PodAwful";
    visitLink.className = "sidebar-visit-link";
    visitLink.setAttribute('aria-label', 'Visit PodAwful website');
    visitLink.onclick = () =>
    {
        LogDev("Sidebar footer link clicked: Visit PodAwful", "interaction");
    };
    Footer.appendChild(visitLink);

    return Footer;
}