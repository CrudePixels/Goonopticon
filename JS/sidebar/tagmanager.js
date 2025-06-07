// Version: 1.0.0
import { GetNotes, SetNotes } from './storage.js';
import { GetAllTags } from './logic.js';
import { RenderSidebar } from './render.js';
import { LogDev } from '../log.js';

export function ShowTagManager(Notes, Container)
{
    // Remove any existing modal
    document.getElementById("podawful-tag-modal")?.remove();

    // Create modal overlay
    const Modal = document.createElement("div");
    Modal.id = "podawful-tag-modal";
    Modal.className = "tag-manager-modal";

    // Modal content box
    const Box = document.createElement("div");
    Box.className = "tag-manager-box";
    Box.innerHTML = `<h3>Tag Manager</h3>`;

    // Get all tags from notes
    const Tags = GetAllTags(Notes);

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
        RenameBtn.onclick = () =>
        {
            LogDev("Clicked Rename Tag: " + Tag);
            const NewTag = prompt("Rename tag:", Tag);
            if (!NewTag || NewTag === Tag) return;

            Notes.forEach(N =>
            {
                if (N.tags && N.tags.includes(Tag))
                {
                    N.tags = N.tags.map(T => T === Tag ? NewTag : T);
                }
            });
            SetNotes(location.href, Notes, () =>
            {
                LogDev(`Renamed tag: ${Tag} to ${NewTag}`);
                ShowTagManager(Notes, Container);
                RenderSidebar(Container);
            });
        };
        Row.appendChild(RenameBtn);

        // Delete button
        const DeleteBtn = document.createElement("button");
        DeleteBtn.textContent = "Delete";
        DeleteBtn.title = "Delete this tag from all notes";
        DeleteBtn.onclick = () =>
        {
            LogDev("Clicked Delete Tag: " + Tag);
            if (!confirm(`Delete tag "${Tag}" from all notes?`)) return;

            Notes.forEach(N =>
            {
                if (N.tags) N.tags = N.tags.filter(T => T !== Tag);
            });
            SetNotes(location.href, Notes, () =>
            {
                LogDev(`Deleted tag: ${Tag}`);
                ShowTagManager(Notes, Container);
                RenderSidebar(Container);
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

        const MergeBtn = document.createElement("button");
        MergeBtn.textContent = "Merge";
        MergeBtn.title = "Merge selected tag into new tag";
        MergeBtn.onclick = () =>
        {
            const From = MergeFrom.value;
            const To = MergeTo.value.trim();
            if (!From || !To || From === To) return;

            Notes.forEach(N =>
            {
                if (N.tags && N.tags.includes(From))
                {
                    N.tags = Array.from(new Set(N.tags.map(T => T === From ? To : T)));
                }
            });
            SetNotes(location.href, Notes, () =>
            {
                LogDev(`Merged tag: ${From} → ${To}`);
                ShowTagManager(Notes, Container);
                RenderSidebar(Container);
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
    CloseBtn.onclick = () =>
    {
        LogDev("Closed Tag Manager");
        Modal.remove();
    };
    Box.appendChild(CloseBtn);

    Modal.appendChild(Box);
    document.body.appendChild(Modal);
}