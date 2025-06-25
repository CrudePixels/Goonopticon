import { GetAllTags } from './logic.js';
import { SetTagFilter } from './storage.js';

export function renderTagFilter(Notes, SelectedTags, Locked, rerenderSidebar)
{
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
            let NewTags = SelectedTags.slice();
            if (Cb.checked)
            {
                if (!NewTags.includes(Tag)) NewTags.push(Tag);
            } else
            {
                NewTags = NewTags.filter(T => T !== Tag);
            }
            if (typeof rerenderSidebar === "function") rerenderSidebar(NewTags);
            SetTagFilter(NewTags);
        };
        Label.appendChild(Cb);
        Label.appendChild(document.createTextNode(" " + Tag));
        TagRow.appendChild(Label);
    });

    return TagRow;
}