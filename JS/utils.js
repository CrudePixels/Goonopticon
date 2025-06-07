// Shared utilities and constants

export function SafeParse(value, fallback)
{
    try
    {
        return JSON.parse(value) || fallback;
    } catch {
        return fallback;
    }
}

// Storage keys
export const STORAGE_KEYS = {
    SIDEBAR_VISIBLE: "PodAwful::SidebarVisible",
    THEME: "PodAwful::Theme",
    COMPACT: "PodAwful::Compact",
    TAG_FILTER: "PodAwful::TagFilterMulti",
    NOTE_SEARCH: "PodAwful::NoteSearch",
    NOTES: (url) => `PodAwful::Notes::${url}`,
    GROUPS: (url) => `PodAwful::Groups::${url}`,
    PINNED_GROUPS: "PodAwful::PinnedGroups",
    LOCKED: "PodAwful::Locked",
    DEVLOG: "PodAwful::DevLog"
};