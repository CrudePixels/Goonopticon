import { AddNote, AddGroup } from './storage.js';
import { GenerateNoteId, GetTimecode } from './logic.js';
import { showInputModal } from './modal.js';

export function renderSidebarFooter({ Locked, Container, RenderSidebar })
{
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
    }

    // --- Action buttons container ---
    const actionsContainer = document.createElement("div");
    actionsContainer.className = "sidebar-footer-actions";
    actionsContainer.style.display = "flex";
    actionsContainer.style.flexDirection = "column";
    actionsContainer.style.alignItems = "stretch";
    actionsContainer.style.gap = "10px";

    // + Group button (full width)
    const groupBtn = document.createElement("button");
    groupBtn.textContent = "+ Group";
    groupBtn.id = "sidebarAddGroup";
    groupBtn.className = "sidebar-action-btn";
    groupBtn.setAttribute('aria-label', 'Add group');
    groupBtn.disabled = Locked;
    groupBtn.style.width = "100%";
    groupBtn.onclick = async () =>
    {
        if (Locked) return;
        const Name = await showInputModal({
            title: "Add Group",
            label: "Group name:",
            placeholder: "Enter group name"
        });
        if (!Name || !Name.trim())
        {
            showStatus("Group name cannot be empty.");
            return;
        }
        AddGroup(Name.trim(), () =>
        {
            RenderSidebar(Container, undefined, true);
        });
    };
    actionsContainer.appendChild(groupBtn);

    // + Timestamp button
    const timestampBtn = document.createElement("button");
    timestampBtn.textContent = "+ Timestamp";
    timestampBtn.id = "sidebarAddTimestamp";
    timestampBtn.className = "sidebar-action-btn";
    timestampBtn.setAttribute('aria-label', 'Add timestamped note');
    timestampBtn.disabled = Locked;
    timestampBtn.style.width = "100%";
    timestampBtn.onclick = async () =>
    {
        if (Locked) return;
        const v = document.querySelector("video");
        let defaultTime = v ? GetTimecode(v.currentTime) : "";
        const inputTime = await showInputModal({ title: "Add Timestamp", label: "Timestamp (leave blank for current):", value: defaultTime });
        if (inputTime === null) return;
        let time = inputTime && inputTime.trim() !== "" ? inputTime.trim() : defaultTime;
        const text = await showInputModal({ title: "Add Timestamp", label: "Note text:" });
        if (text === null || !text.trim())
        {
            showStatus("Note text cannot be empty.");
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
                showStatus("Failed to add note.");
            } else
            {
                RenderSidebar(Container, undefined, true);
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
    noteBtn.style.width = "100%";
    noteBtn.onclick = async () =>
    {
        if (Locked) return;
        const text = await showInputModal({ title: "Add Note", label: "Note text:" });
        if (!text || !text.trim())
        {
            showStatus("Note text cannot be empty.");
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
                showStatus("Failed to add note.");
            } else
            {
                RenderSidebar(Container, undefined, true);
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
    lockBtn.style.width = "100%";
    lockBtn.onclick = () =>
    {
        import('./storage.js').then(({ SetLocked }) =>
        {
            SetLocked(!Locked, (err) =>
            {
                if (err)
                {
                    showStatus("Failed to toggle lock.");
                } else
                {
                    RenderSidebar(Container, undefined, true);
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
    Footer.appendChild(visitLink);

    return Footer;
}