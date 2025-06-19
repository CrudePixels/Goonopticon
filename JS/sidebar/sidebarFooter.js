import { AddNote, AddGroup } from './storage.js';
import { GenerateNoteId, GetTimecode } from './logic.js';
import { RenderSidebar } from './render.js';
import { LogDev } from '../log.js';

export function renderSidebarFooter({ Locked, Container, RenderSidebar, ShowTagManager }) {
    LogDev("Sidebar footer rendered", "render");

    const Footer = document.createElement("div");
    Footer.className = "sidebar-footer";

    // Status message area
    const statusDiv = document.createElement("div");
    statusDiv.className = "sidebar-footer-status";
    statusDiv.style.color = "#FFD600";
    statusDiv.style.margin = "4px 0 8px 0";
    Footer.appendChild(statusDiv);

    function showStatus(msg, duration = 2000) {
        statusDiv.textContent = msg;
        if (duration > 0) setTimeout(() => { statusDiv.textContent = ""; }, duration);
        LogDev("Sidebar footer status: " + msg, "event");
    }

    // --- Action buttons container ---
    const actionsContainer = document.createElement("div");
    actionsContainer.className = "sidebar-footer-actions";
    actionsContainer.style.display = "flex";
    actionsContainer.style.flexDirection = "column";
    actionsContainer.style.alignItems = "stretch";
    actionsContainer.style.gap = "10px";

    // --- New: Group + Tags row ---
    const groupTagsRow = document.createElement("div");
    groupTagsRow.className = "sidebar-group-tags-row";

    // + Group button
    const groupBtn = document.createElement("button");
    groupBtn.textContent = "+ Group";
    groupBtn.id = "sidebarAddGroup";
    groupBtn.className = "sidebar-action-btn";
    groupBtn.setAttribute('aria-label', 'Add group');
    groupBtn.disabled = Locked;
    groupBtn.onclick = () => {
        if (Locked) return;
        const Name = prompt("New group name:");
        if (!Name || !Name.trim()) {
            showStatus("Group name cannot be empty.");
            return;
        }
        AddGroup(Name.trim(), () => {
            RenderSidebar(Container);
        });
    };
    groupTagsRow.appendChild(groupBtn);

    // Tags button
    const tagsBtn = document.createElement("button");
    tagsBtn.textContent = "Tags";
    tagsBtn.id = "sidebarTags";
    tagsBtn.className = "sidebar-action-btn";
    tagsBtn.setAttribute('aria-label', 'Manage tags');
    tagsBtn.onclick = () => {
        ShowTagManager && ShowTagManager();
    };
    groupTagsRow.appendChild(tagsBtn);

    actionsContainer.appendChild(groupTagsRow);

    // + Timestamp button
    const timestampBtn = document.createElement("button");
    timestampBtn.textContent = "+ Timestamp";
    timestampBtn.id = "sidebarAddTimestamp";
    timestampBtn.className = "sidebar-action-btn";
    timestampBtn.setAttribute('aria-label', 'Add timestamped note');
    timestampBtn.disabled = Locked;
    timestampBtn.onclick = () => {
        LogDev("Sidebar footer button clicked: Add Timestamp", "interaction");
        if (Locked) return;
        const v = document.querySelector("video");
        let defaultTime = v ? GetTimecode(v.currentTime) : "";
        let inputTime = prompt("Timestamp? (leave blank for current)", defaultTime);
        LogDev("Prompt for timestamp: " + (inputTime ? "User entered: " + inputTime : "User cancelled"), "interaction");
        if (inputTime === null) return;
        let time = inputTime && inputTime.trim() !== "" ? inputTime.trim() : defaultTime;
        const text = prompt("Note:");
        LogDev("Prompt for note text: " + (text ? "User entered text" : "User cancelled"), "interaction");
        if (text === null || !text.trim()) {
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
        }, (err) => {
            if (err) {
                LogDev("Sidebar footer error: " + err, "error");
                showStatus("Failed to add note.");
            } else {
                LogDev("Note with timestamp added", "event");
                RenderSidebar(Container);
            }
        });
    };
    actionsContainer.appendChild(timestampBtn);

    // + Note button
    const noteBtn = document.createElement("button");
    noteBtn.textContent = "+ Note";
    noteBtn.id = "sidebarAddNote";
    noteBtn.className = "sidebar-action-btn";
    noteBtn.setAttribute('aria-label', 'Add note');
    noteBtn.disabled = Locked;
    noteBtn.onclick = () => {
        LogDev("Sidebar footer button clicked: Add Note", "interaction");
        if (Locked) return;
        const text = prompt("Enter note text:");
        LogDev("Prompt for note text: " + (text ? "User entered text" : "User cancelled"), "interaction");
        if (!text || !text.trim()) {
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
        }, (err) => {
            if (err) {
                LogDev("Sidebar footer error: " + err, "error");
                showStatus("Failed to add note.");
            } else {
                LogDev("Note added", "event");
                RenderSidebar(Container);
            }
        });
    };
    actionsContainer.appendChild(noteBtn);

    // Lock/Unlock button
    const lockBtn = document.createElement("button");
    lockBtn.textContent = Locked ? "Unlock" : "Lock";
    lockBtn.id = "sidebarLock";
    lockBtn.className = "sidebar-action-btn";
    lockBtn.setAttribute('aria-label', Locked ? "Unlock notes" : "Lock notes");
    lockBtn.onclick = () => {
        LogDev("Sidebar footer button clicked: Lock/Unlock", "interaction");
        import('./storage.js').then(({ SetLocked }) => {
            SetLocked(!Locked, (err) => {
                if (err) {
                    LogDev("Sidebar footer error: " + err, "error");
                    showStatus("Failed to toggle lock.");
                } else {
                    LogDev("Sidebar lock toggled", "event");
                    RenderSidebar(Container);
                }
            });
        });
    };
    actionsContainer.appendChild(lockBtn);

    Footer.appendChild(actionsContainer);

    // Add Visit PodAwful link to the footer
    const visitLink = document.createElement("a");
    visitLink.href = "https://podawful.com/";
    visitLink.target = "_blank";
    visitLink.rel = "noopener noreferrer";
    visitLink.textContent = "PodAwful's Watching YOU!";
    visitLink.className = "sidebar-visit-link";
    visitLink.setAttribute('aria-label', 'Visit PodAwful website');
    visitLink.onclick = () => {
        LogDev("Sidebar footer link clicked: Visit PodAwful", "interaction");
    };
    Footer.appendChild(visitLink);

    return Footer;
}