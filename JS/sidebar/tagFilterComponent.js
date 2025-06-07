import { GetAllTags } from './logic.js';
import { SetTagFilter } from './storage.js';

export function renderTagFilter(Notes, SelectedTags, Locked, Container)
{
    const TagRow = document.createElement('div');
    TagRow.className = 'sidebar-tag-filter';
    const Tags = GetAllTags(Notes);
    TagRow.innerHTML = "<b>Filter tags:</b> ";
    Tags.forEach(Tag =>
    {
        const Label = document.createElement("label");
        Label.style.marginRight = "8px";
        const Cb = document.createElement("input");
        Cb.type = "checkbox";
        Cb.value = Tag;
        Cb.checked = SelectedTags.includes(Tag);
        Cb.disabled = Locked;
        Cb.onchange = () =>
        {
            let NewTags = SelectedTags.slice();
            if (Cb.checked) NewTags.push(Tag);
            else NewTags = NewTags.filter(T => T !== Tag);
            SetTagFilter(NewTags, () =>
            {
                // Re-render sidebar
                if (typeof Container === "function") Container();
                else if (Container && Container.id === 'podawful-sidebar') window.RenderSidebar(Container);
            });
        };
        Label.appendChild(Cb);
        Label.appendChild(document.createTextNode(" " + Tag));
        TagRow.appendChild(Label);
    });
    return TagRow;
}