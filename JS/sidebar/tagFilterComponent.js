import { GetAllTags } from './logic.js';
import { SetTagFilter } from './storage.js';
import { LogDev } from '../log.js';

/**
 * Renders the tag filter row.
 * @param {Array} Notes - The notes array.
 * @param {Array} SelectedTags - The currently selected tags.
 * @param {boolean} Locked - Whether the UI is locked.
 * @param {Function} rerenderSidebar - Function to call to re-render the sidebar.
 * @returns {HTMLElement}
 */
export function renderTagFilter(Notes, SelectedTags, Locked, rerenderSidebar)
{
    LogDev("renderTagFilter called", "render");
    const TagRow = document.createElement('div');
    TagRow.className = 'sidebar-tag-filter';
    const Tags = GetAllTags(Notes);

    TagRow.innerHTML = "<b>Filter tags:</b> ";

    if (!Tags.length)
    {
        const noTags = document.createElement('span');
        noTags.textContent = "No tags available";
        noTags.style.opacity = "0.7";
        TagRow.appendChild(noTags);
        LogDev("Tag filter rendered (no tags)", "render");
        return TagRow;
    }

    Tags.forEach(Tag =>
    {
        const Label = document.createElement("label");
        Label.className = "sidebar-tag-filter-label";
        const Cb = document.createElement("input");
        Cb.type = "checkbox";
        Cb.value = Tag;
        Cb.checked = SelectedTags.includes(Tag);
        Cb.disabled = Locked;
        Cb.setAttribute('aria-label', `Filter by tag ${Tag}`);
        Cb.onchange = () =>
        {
            LogDev("Tag filter checkbox changed: " + Tag + " " + (Cb.checked ? "checked" : "unchecked"), "interaction");
            let NewTags = SelectedTags.slice();
            if (Cb.checked)
            {
                if (!NewTags.includes(Tag)) NewTags.push(Tag);
            } else
            {
                NewTags = NewTags.filter(T => T !== Tag);
            }
            SetTagFilter(NewTags, () =>
            {
                LogDev("SetTagFilter completed for tags: " + JSON.stringify(NewTags), "system");
                if (typeof rerenderSidebar === "function") rerenderSidebar();
            });
        };
        Label.appendChild(Cb);
        Label.appendChild(document.createTextNode(" " + Tag));
        TagRow.appendChild(Label);
    });

    LogDev("Tag filter rendered", "render");

    return TagRow;
}