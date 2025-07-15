// Version: 1.1.0

import { LogDev } from '../log.js';

const DEFAULT_TIME_THRESHOLD = 5;

/**
 * Generates a unique note ID.
 * @returns {string} The generated note ID.
 */
export function generateNoteId()
{
    LogDev("GenerateNoteId called", "event");
    // Sufficiently unique for most UI use-cases
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    LogDev("Generated note ID: " + id, "event");
    return id;
}

/**
 * Converts seconds to a timecode string (h:mm:ss or mm:ss).
 * @param {number} Seconds - The number of seconds.
 * @returns {string} The formatted timecode.
 */
export function getTimecode(Seconds)
{
    LogDev("GetTimecode called with seconds: " + Seconds, "event");
    try
    {
        const H = Math.floor(Seconds / 3600);
        const M = Math.floor((Seconds % 3600) / 60);
        const S = Math.floor(Seconds % 60);
        const timecode = H > 0
            ? `${H}:${M.toString().padStart(2, "0")}:${S.toString().padStart(2, "0")}`
            : `${M}:${S.toString().padStart(2, "0")}`;
        LogDev("Generated timecode: " + timecode, "event");
        return timecode;
    } catch (err)
    {
        LogDev("GetTimecode error: " + err, "error");
        return "";
    }
}

/**
 * Parses a timecode string into seconds.
 * @param {string} Str - The timecode string.
 * @returns {number} The number of seconds.
 */
export function parseTime(Str)
{
    LogDev("ParseTime called with: " + Str, "event");
    try
    {
        if (!Str || typeof Str !== "string")
        {
            LogDev("ParseTime: input is not a string or is empty", "event");
            return 0;
        }
        const parts = Str.trim().split(":").map(Number);
        if (parts.some(isNaN))
        {
            LogDev("ParseTime error: NaN in parts for input: " + Str, "error");
            return 0;
        }
        let seconds = 0;
        if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
        else seconds = Number(Str) || 0;
        LogDev("Parsed time: " + Str + " -> " + seconds, "data");
        return seconds;
    } catch (err)
    {
        LogDev("ParseTime error: " + err, "error");
        return 0;
    }
}

/**
 * Gets all unique tags from a notes array.
 * @param {Array} Notes - The notes array.
 * @returns {Array} Array of unique tag strings.
 */
export function getAllTags(Notes)
{
    LogDev("GetAllTags called", "event");
    try
    {
        if (!Array.isArray(Notes))
        {
            LogDev("GetAllTags: Notes is not an array", "event");
            return [];
        }
        const Tags = new Set();
        Notes.forEach(N => (N.tags || []).forEach(T => Tags.add(T)));
        const tagArr = Array.from(Tags);
        LogDev("Collected tags: " + tagArr.join(", "), "data");
        return tagArr;
    } catch (err)
    {
        LogDev("GetAllTags error: " + err, "error");
        return [];
    }
}

/**
 * Checks if two times are close within a threshold.
 * @param {number} current - The current time in seconds.
 * @param {number} t - The time to compare.
 * @param {number} [threshold=DEFAULT_TIME_THRESHOLD] - The threshold in seconds.
 * @returns {boolean} True if times are close, else false.
 */
export function isTimeClose(current, t, threshold = DEFAULT_TIME_THRESHOLD)
{
    LogDev(`IsTimeClose called: current=${current}, t=${t}, threshold=${threshold}`, "miscellaneous");
    const close = Math.abs(current - t) < threshold;
    LogDev(`IsTimeClose result: ${close}`, "miscellaneous");
    return close;
}