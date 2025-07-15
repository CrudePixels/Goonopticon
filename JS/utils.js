import browser from 'webextension-polyfill';
export default browser;
export { browser };

/**
 * Safely parses a JSON string, returning a fallback value on error.
 * @param {string} value - The JSON string to parse.
 * @param {*} fallback - The value to return if parsing fails.
 * @returns {*} The parsed value or the fallback.
 */
export function safeParse(value, fallback)
{
    LogDev("SafeParse called", "data");
    try
    {
        if (typeof value !== "string")
        {
            LogDev("SafeParse: value is not a string, returning as-is", "data");
            return value;
        }
        if (!value.trim().startsWith("{") && !value.trim().startsWith("[") && value.trim()[0] !== '"')
        {
            LogDev("SafeParse: value looks like a primitive, returning as-is", "data");
            return value;
        }
        const parsed = JSON.parse(value);
        LogDev("SafeParse success", "data");
        return parsed;
    } catch (err)
    {
        LogDev("SafeParse error: " + err, "error");
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
    NOTES: (url) =>
    {
        LogDev("STORAGE_KEYS.NOTES called for url: " + url, "data");
        return `PodAwful::Notes::${encodeURIComponent(url)}`;
    },
    GROUPS: (url) =>
    {
        LogDev("STORAGE_KEYS.GROUPS called for url: " + url, "data");
        return `PodAwful::Groups::${encodeURIComponent(url)}`;
    },
    PINNED_GROUPS: "PodAwful::PinnedGroups",
    LOCKED: "PodAwful::Locked",
    DEVLOG: "PodAwful::DevLog"
};