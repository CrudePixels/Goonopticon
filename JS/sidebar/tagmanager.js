// Version: 1.1.0
import { getNotes, setNotes } from './storage.js';
import { getAllTags } from './logic.js';
import { LogDev } from '../log.js';
import { showInputModal, showConfirmModal } from './modal.js';

/**
 * Shows the tag manager modal for editing tags.
 * @param {HTMLElement} Container - The sidebar container element.
 * @param {function} RenderSidebar - Function to rerender the sidebar.
 */
export function showTagManager(Container, RenderSidebar) {
    LogDev("ShowTagManager called", "render");
    // Remove any existing tag manager modal and generic modal
    document.getElementById("podawful-tag-modal")?.remove();
    document.getElementById("podawful-generic-modal")?.remove();

    // Get notes
    getNotes(location.href, (Notes) => {
        // Create modal overlay
        const Modal = document.createElement("div");
        Modal.id = "podawful-tag-modal";
        Modal.className = "sidebar__tag-manager-modal";
        Modal.tabIndex = -1;
        Modal.setAttribute('aria-modal', 'true');
        Modal.setAttribute('role', 'dialog');
        Modal.style.zIndex = '99999'; // Ensure always on top

        // Modal content box
        const Box = document.createElement("div");
        Box.className = "sidebar__tag-manager-box";
        Box.innerHTML = `<h3>Tag Manager</h3>`;

        // Status message
        const statusDiv = document.createElement("div");
        statusDiv.className = "tagmanager-status";
        statusDiv.style.color = "var(--accent)";
        statusDiv.style.margin = "4px 0 8px 0";
        Box.appendChild(statusDiv);

        // Helper for status feedback
        function showStatus(msg, duration = 2000) {
            statusDiv.textContent = msg;
            LogDev("TagManager status: " + msg, "system");
            if (duration > 0) setTimeout(() => { statusDiv.textContent = ""; }, duration);
        }

        // Get all tags from notes
        const Tags = getAllTags(Notes);
        LogDev("Tags loaded: " + JSON.stringify(Tags), "data");

        // List tags with rename and delete options
        Tags.forEach(Tag => {
            const Row = document.createElement("div");
            Row.className = "sidebar__tag-row";

            const TagLabel = document.createElement("span");
            TagLabel.textContent = Tag;
            TagLabel.className = "sidebar__tag-label";
            Row.appendChild(TagLabel);

            // Rename button
            const RenameBtn = document.createElement("button");
            RenameBtn.textContent = "Rename";
            RenameBtn.title = "Rename this tag";
            RenameBtn.setAttribute('aria-label', `Rename tag ${Tag}`);
            RenameBtn.onclick = async () => {
                LogDev("Rename Tag button clicked: " + Tag, "interaction");
                const NewTag = await showInputModal({
                    title: "Rename Tag",
                    label: "New tag name:",
                    value: Tag,
                    validate: (val) => val.trim() ? true : "Tag name cannot be empty."
                });
                if (!NewTag || NewTag === Tag) return;
                if (Tags.includes(NewTag)) {
                    showStatus("A tag with that name already exists.");
                    return;
                }
                Notes.forEach(N => {
                    if (N.tags && N.tags.includes(Tag)) {
                        N.tags = N.tags.map(T => T === Tag ? NewTag : T);
                    }
                });
                LogDev(`Renaming tag: ${Tag} to ${NewTag}`, "data");
                setNotes(location.href, Notes, (err) => {
                    if (err) {
                        LogDev("Failed to rename tag: " + err, "error");
                        showStatus("Failed to rename tag.");
                    } else {
                        LogDev(`Renamed tag: ${Tag} to ${NewTag}`, "system");
                        showStatus("Tag renamed.");
                        showTagManager(Container, RenderSidebar);
                        if (RenderSidebar) RenderSidebar(Container);
                    }
                });
            };
            Row.appendChild(RenameBtn);

            // Delete button
            const DeleteBtn = document.createElement("button");
            DeleteBtn.textContent = "Delete";
            DeleteBtn.title = "Delete this tag from all notes";
            DeleteBtn.setAttribute('aria-label', `Delete tag ${Tag}`);
            DeleteBtn.onclick = async () => {
                LogDev("Delete Tag button clicked: " + Tag, "interaction");
                const confirmed = await showConfirmModal({
                    title: "Delete Tag",
                    message: `Delete tag \"${Tag}\" from all notes?`,
                    okText: "Delete",
                    cancelText: "Cancel"
                });
                if (!confirmed) return;
                Notes.forEach(N => {
                    if (N.tags) N.tags = N.tags.filter(T => T !== Tag);
                });
                LogDev(`Deleting tag: ${Tag}`, "data");
                setNotes(location.href, Notes, (err) => {
                    if (err) {
                        LogDev("Failed to delete tag: " + err, "error");
                        showStatus("Failed to delete tag.");
                    } else {
                        LogDev(`Deleted tag: ${Tag}`, "system");
                        showStatus("Tag deleted.");
                        showTagManager(Container, RenderSidebar);
                        if (RenderSidebar) RenderSidebar(Container);
                    }
                });
            };
            Row.appendChild(DeleteBtn);

            Box.appendChild(Row);
        });

        // Merge tags UI
        if (Tags.length > 1) {
            const MergeRow = document.createElement("div");
            MergeRow.className = "sidebar__tag-merge-row";

            const MergeFrom = document.createElement("select");
            Tags.forEach(Tag => {
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
            MergeBtn.onclick = async () => {
                LogDev("Merge Tag button clicked", "interaction");
                const From = MergeFrom.value;
                const To = await showInputModal({
                    title: "Merge Tags",
                    label: "Merge into tag:",
                    placeholder: "New tag name",
                    validate: (val) => val.trim() ? true : "Tag name cannot be empty."
                });
                if (!From || !To || From === To) {
                    showStatus("Choose two different tags.");
                    return;
                }
                if (Tags.includes(To)) {
                    showStatus("A tag with that name already exists.");
                    return;
                }
                Notes.forEach(N => {
                    if (N.tags && N.tags.includes(From)) {
                        N.tags = Array.from(new Set(N.tags.map(T => T === From ? To : T)));
                    }
                });
                LogDev(`Merging tag: ${From} → ${To}`, "data");
                setNotes(location.href, Notes, (err) => {
                    if (err) {
                        LogDev("Failed to merge tags: " + err, "error");
                        showStatus("Failed to merge tags.");
                    } else {
                        LogDev(`Merged tag: ${From} → ${To}`, "system");
                        showStatus("Tags merged.");
                        showTagManager(Container, RenderSidebar);
                        if (RenderSidebar) RenderSidebar(Container);
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
        CloseBtn.className = "sidebar__tag-row-btn sidebar__tag-manager-close-btn";
        CloseBtn.onclick = () => {
            LogDev("Closed Tag Manager", "interaction");
            Modal.remove();
        };
        Box.appendChild(CloseBtn);

        // Allow closing modal with Escape key or clicking outside
        Modal.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                LogDev("Tag Manager closed with Escape", "event");
                Modal.remove();
            }
        });
        Modal.addEventListener('click', (e) => {
            if (e.target === Modal) {
                LogDev("Tag Manager closed by clicking outside", "event");
                Modal.remove();
            }
        });

        Modal.appendChild(Box);
        document.body.appendChild(Modal);

        // Focus modal for accessibility
        setTimeout(() => Modal.focus(), 0);

        LogDev("Tag manager opened", "render");
    });
}