import { AddNote } from './storage.js';
import { GenerateNoteId, GetTimecode } from './logic.js';

export function renderSidebarFooter({ Locked, Container, RenderSidebar })
{
    const Footer = document.createElement("div");
    Footer.className = "sidebar-footer";
    const actions = [
        { text: "+ Timestamp", id: "sidebarAddTimestamp" },
        { text: "+ Note", id: "sidebarAddNote" },
        { text: Locked ? "Unlock" : "Lock", id: "sidebarLock" }
    ];
    actions.forEach(action =>
    {
        const btn = document.createElement("button");
        btn.textContent = action.text;
        btn.id = action.id;
        btn.className = "sidebar-action-btn";
        btn.disabled = (action.id !== "sidebarLock" && Locked);
        switch (action.id)
        {
            case "sidebarAddTimestamp":
                btn.onclick = () =>
                {
                    if (Locked) return;
                    const v = document.querySelector("video");
                    let defaultTime = v ? GetTimecode(v.currentTime) : "";
                    let inputTime = prompt("Timestamp? (leave blank for current)", defaultTime);
                    let time = inputTime && inputTime.trim() !== "" ? inputTime.trim() : defaultTime;
                    const text = prompt("Note:");
                    if (!text) return;
                    AddNote({
                        id: GenerateNoteId(),
                        group: "Ungrouped",
                        text: text,
                        time: time,
                        tags: [],
                        created: Date.now()
                    }, () => RenderSidebar(Container));
                };
                break;
            case "sidebarAddNote":
                btn.onclick = () =>
                {
                    if (Locked) return;
                    const text = prompt("Enter note text:");
                    if (!text) return;
                    AddNote({
                        id: GenerateNoteId(),
                        group: "Ungrouped",
                        text: text,
                        time: "",
                        tags: [],
                        created: Date.now()
                    }, () => RenderSidebar(Container));
                };
                break;
            case "sidebarLock":
                btn.onclick = () =>
                {
                    // Toggle lock state
                    import('./storage.js').then(({ SetLocked }) =>
                    {
                        SetLocked(!Locked, () => RenderSidebar(Container));
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
    Footer.appendChild(visitLink);

    return Footer;
}