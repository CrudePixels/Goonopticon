import browser from 'webextension-polyfill';
import { LogDev } from './log.js';

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

/**
 * Normalizes a YouTube URL by removing timestamp parameters.
 * This ensures that URLs with different timestamps point to the same video.
 * @param {string} url - The YouTube URL to normalize.
 * @returns {string} - The normalized URL without timestamp parameters.
 */
export function normalizeYouTubeUrl(url) {
    if (!url || typeof url !== 'string') return url;
    
    try {
        const urlObj = new URL(url);
        
        // Only normalize YouTube URLs
        if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
            return url;
        }
        
        // Remove timestamp parameters
        urlObj.searchParams.delete('t');
        urlObj.searchParams.delete('start');
        urlObj.searchParams.delete('time_continue');
        
        return urlObj.toString();
    } catch (error) {
        LogDev("Error normalizing URL: " + error, "error");
        return url;
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
        const normalizedUrl = normalizeYouTubeUrl(url);
        LogDev("STORAGE_KEYS.NOTES called for url: " + url + " (normalized: " + normalizedUrl + ")", "data");
        return `PodAwful::Notes::${encodeURIComponent(normalizedUrl)}`;
    },
    GROUPS: (url) =>
    {
        const normalizedUrl = normalizeYouTubeUrl(url);
        LogDev("STORAGE_KEYS.GROUPS called for url: " + url + " (normalized: " + normalizedUrl + ")", "data");
        return `PodAwful::Groups::${encodeURIComponent(normalizedUrl)}`;
    },
    PINNED_GROUPS: "PodAwful::PinnedGroups",
    LOCKED: "PodAwful::Locked",
    DEVLOG: "PodAwful::DevLog"
};