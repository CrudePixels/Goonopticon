// Version: 1.1.0

import { LogDev } from '../log.js';

export function GenerateNoteId()
{
    LogDev("GenerateNoteId called", "event");
    // Sufficiently unique for most UI use-cases
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    LogDev("Generated note ID: " + id, "event");
    return id;
}

export function GetTimecode(Seconds)
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

export function ParseTime(Str)
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

export function GetAllTags(Notes)
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

export function IsTimeClose(current, t, threshold = 5)
{
    LogDev(`IsTimeClose called: current=${current}, t=${t}, threshold=${threshold}`, "miscellaneous");
    const close = Math.abs(current - t) < threshold;
    LogDev(`IsTimeClose result: ${close}`, "miscellaneous");
    return close;
}