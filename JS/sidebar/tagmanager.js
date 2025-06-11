// Version: 1.1.0
import { GetNotes, SetNotes } from './storage.js';
import { GetAllTags } from './logic.js';
import { RenderSidebar } from './render.js';
import { LogDev } from '../log.js';

export function ShowTagManager(Notes, Container)
{
    LogDev("ShowTagManager called", "render");
    // Remove any existing modal
    document.getElementById("podawful-tag-modal")?.remove();

    // Create modal overlay
    const Modal = document.createElement("div");
    Modal.id = "podawful-tag-modal";
    Modal.className = "tag-manager-modal";
    Modal.tabIndex = -1;
    Modal.setAttribute('aria-modal', 'true');
    Modal.setAttribute('role', 'dialog');

    // Modal content box
    const Box = document.createElement("div");
    Box.className = "tag-manager-box";
    Box.innerHTML = `<h3>Tag Manager</h3>`;

    // Status message
    const statusDiv = document.createElement("div");
    statusDiv.className = "tagmanager-status";
    statusDiv.style.color = "#FFD600";
    statusDiv.style.margin = "4px 0 8px 0";
    Box.appendChild(statusDiv);

    // Get all tags from notes
    const Tags = GetAllTags(Notes);
    LogDev("Tags loaded: " + JSON.stringify(Tags), "data");

    // Helper for status feedback
    function showStatus(msg, duration = 2000)
    {
        statusDiv.textContent = msg;
        LogDev("TagManager status: " + msg, "system");
        if (duration > 0) setTimeout(() => { statusDiv.textContent = ""; }, duration);
    }

    // List tags with rename and delete options
    Tags.forEach(Tag =>
    {
        const Row = document.createElement("div");
        Row.className = "tag-row";

        const TagLabel = document.createElement("span");
        TagLabel.textContent = Tag;
        TagLabel.className = "tag-label";
        Row.appendChild(TagLabel);

        // Rename button
        const RenameBtn = document.createElement("button");
        RenameBtn.textContent = "Rename";
        RenameBtn.title = "Rename this tag";
        RenameBtn.setAttribute('aria-label', `Rename tag ${Tag}`);
        RenameBtn.onclick = () =>
        {
            LogDev("Rename Tag button clicked: " + Tag, "interaction");
            const NewTag = prompt("Rename tag:", Tag);
            LogDev("Prompt for rename tag: " + (NewTag ? "User entered: " + NewTag : "User cancelled"), "interaction");
            if (!NewTag || NewTag === Tag) return;
            if (Tags.includes(NewTag))
            {
                showStatus("A tag with that name already exists.");
                return;
            }
            if (!NewTag.trim())
            {
                showStatus("Tag name cannot be empty.");
                return;
            }
            Notes.forEach(N =>
            {
                if (N.tags && N.tags.includes(Tag))
                {
                    N.tags = N.tags.map(T => T === Tag ? NewTag : T);
                }
            });
            LogDev(`Renaming tag: ${Tag} to ${NewTag}`, "data");
            SetNotes(location.href, Notes, (err) =>
            {
                if (err)
                {
                    LogDev("Failed to rename tag: " + err, "error");
                    showStatus("Failed to rename tag.");
                } else
                {
                    LogDev(`Renamed tag: ${Tag} to ${NewTag}`, "system");
                    showStatus("Tag renamed.");
                    ShowTagManager(Notes, Container);
                    RenderSidebar(Container);
                }
            });
        };
        Row.appendChild(RenameBtn);

        // Delete button
        const DeleteBtn = document.createElement("button");
        DeleteBtn.textContent = "Delete";
        DeleteBtn.title = "Delete this tag from all notes";
        DeleteBtn.setAttribute('aria-label', `Delete tag ${Tag}`);
        DeleteBtn.onclick = () =>
        {
            LogDev("Delete Tag button clicked: " + Tag, "interaction");
            const confirmed = confirm(`Delete tag "${Tag}" from all notes?`);
            LogDev("Prompt for delete tag: " + (confirmed ? "User confirmed" : "User cancelled"), "interaction");
            if (!confirmed) return;
            Notes.forEach(N =>
            {
                if (N.tags) N.tags = N.tags.filter(T => T !== Tag);
            });
            LogDev(`Deleting tag: ${Tag}`, "data");
            SetNotes(location.href, Notes, (err) =>
            {
                if (err)
                {
                    LogDev("Failed to delete tag: " + err, "error");
                    showStatus("Failed to delete tag.");
                } else
                {
                    LogDev(`Deleted tag: ${Tag}`, "system");
                    showStatus("Tag deleted.");
                    ShowTagManager(Notes, Container);
                    RenderSidebar(Container);
                }
            });
        };
        Row.appendChild(DeleteBtn);

        Box.appendChild(Row);
    });

    // Merge tags UI
    if (Tags.length > 1)
    {
        const MergeRow = document.createElement("div");
        MergeRow.className = "tag-merge-row";

        const MergeFrom = document.createElement("select");
        Tags.forEach(Tag =>
        {
            const Opt = document.createElement("option");
            Opt.value = Tag;
            Opt.textContent = Tag;
            MergeFrom.appendChild(Opt);
        });

        const MergeTo = document.createElement("input");
        MergeTo.placeholder = "New tag name";
        MergeTo.title = "Enter the tag to merge into";
        MergeTo.setAttribute('aria-label', 'Merge into tag');

        const MergeBtn = document.createElement("button");
        MergeBtn.textContent = "Merge";
        MergeBtn.title = "Merge selected tag into new tag";
        MergeBtn.setAttribute('aria-label', 'Merge tags');
        MergeBtn.onclick = () =>
        {
            LogDev("Merge Tag button clicked", "interaction");
            const From = MergeFrom.value;
            const To = MergeTo.value.trim();
            LogDev("Prompt for merge tags: From=" + From + ", To=" + To, "interaction");
            if (!From || !To || From === To)
            {
                showStatus("Choose two different tags.");
                return;
            }
            if (Tags.includes(To))
            {
                showStatus("A tag with that name already exists.");
                return;
            }
            Notes.forEach(N =>
            {
                if (N.tags && N.tags.includes(From))
                {
                    N.tags = Array.from(new Set(N.tags.map(T => T === From ? To : T)));
                }
            });
            LogDev(`Merging tag: ${From} → ${To}`, "data");
            SetNotes(location.href, Notes, (err) =>
            {
                if (err)
                {
                    LogDev("Failed to merge tags: " + err, "error");
                    showStatus("Failed to merge tags.");
                } else
                {
                    LogDev(`Merged tag: ${From} → ${To}`, "system");
                    showStatus("Tags merged.");
                    ShowTagManager(Notes, Container);
                    RenderSidebar(Container);
                }
            });
        };

        MergeRow.appendChild(MergeFrom);
        MergeRow.appendChild(MergeTo);
        MergeRow.appendChild(MergeBtn);
        Box.appendChild(MergeRow);
    }

    // Close button
    const CloseBtn = document.createElement("button");
    CloseBtn.textContent = "Close";
    CloseBtn.title = "Close tag manager";
    CloseBtn.setAttribute('aria-label', 'Close tag manager');
    CloseBtn.onclick = () =>
    {
        LogDev("Closed Tag Manager", "interaction");
        Modal.remove();
    };
    Box.appendChild(CloseBtn);

    // Allow closing modal with Escape key or clicking outside
    Modal.addEventListener('keydown', (e) =>
    {
        if (e.key === "Escape")
        {
            LogDev("Tag Manager closed with Escape", "event");
            Modal.remove();
        }
    });
    Modal.addEventListener('click', (e) =>
    {
        if (e.target === Modal)
        {
            LogDev("Tag Manager closed by clicking outside", "event");
            Modal.remove();
        }
    });

    Modal.appendChild(Box);
    document.body.appendChild(Modal);

    // Focus modal for accessibility
    setTimeout(() => Modal.focus(), 0);

    LogDev("Tag manager opened", "render");
}