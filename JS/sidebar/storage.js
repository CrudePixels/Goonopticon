// Version: 1.0.1

import { LogDev } from '../log.js';
import { SafeParse, STORAGE_KEYS } from '../utils.js';

// Generic storage getters/setters
export function GetFromStorage(Key, Fallback = null, Cb)
{
    chrome.storage.local.get([Key], Result =>
    {
        const Raw = Result[Key];
        const Value = Raw !== undefined ? SafeParse(Raw, Fallback) : Fallback;
        Cb(Value);
    });
}

export function SetInStorage(Key, Value, Cb)
{
    const Obj = {};
    Obj[Key] = JSON.stringify(Value);
    chrome.storage.local.set(Obj, Cb);
}

const groupsKey = STORAGE_KEYS.GROUPS(location.href);

// Group management
export function GetGroups(cb)
{
    chrome.storage.local.get([groupsKey], (result) =>
    {
        cb(result[groupsKey] ? JSON.parse(result[groupsKey]) : []);
    });
}
export function SetGroups(groups, cb)
{
    const obj = {};
    obj[groupsKey] = JSON.stringify(groups);
    chrome.storage.local.set(obj, cb);
}

// Convenience wrappers
export function GetNotes(Url, Cb)
{
    GetFromStorage(STORAGE_KEYS.NOTES(Url), [], Cb);
}

export function SetNotes(Url, Notes, Cb)
{
    SetInStorage(STORAGE_KEYS.NOTES(Url), Notes, Cb);
}

export function SaveUndo(Url, Notes, Cb)
{
    SetInStorage(`PodAwful::Undo::${Url}`, Notes, Cb);
}

export function GetUndo(Url, Cb)
{
    GetFromStorage(`PodAwful::Undo::${Url}`, [], Cb);
}

export function GetLocked(Cb)
{
    GetFromStorage(STORAGE_KEYS.LOCKED, false, Cb);
}

// Promise-based version for use in Promise.all
export function GetLockedPromise()
{
    return new Promise(Resolve =>
    {
        GetLocked(Resolve);
    });
}

export function SetLocked(Val, Cb)
{
    SetInStorage(STORAGE_KEYS.LOCKED, !!Val, Cb);
}

export function GetPinnedGroups(Cb)
{
    GetFromStorage(STORAGE_KEYS.PINNED_GROUPS, [], Cb);
}

export function SetPinnedGroups(Groups, Cb)
{
    SetInStorage(STORAGE_KEYS.PINNED_GROUPS, Groups, Cb);
}

export function GetSidebarVisible(cb)
{
    chrome.storage.local.get([STORAGE_KEYS.SIDEBAR_VISIBLE], (result) =>
    {
        // Default to true if not set
        cb(result[STORAGE_KEYS.SIDEBAR_VISIBLE] !== "false");
    });
}

export function SetSidebarVisible(Val, Cb)
{
    SetInStorage(STORAGE_KEYS.SIDEBAR_VISIBLE, !!Val, Cb);
}

export function GetCompact(Cb)
{
    GetFromStorage(STORAGE_KEYS.COMPACT, false, Cb);
}

export function GetTheme(Cb)
{
    GetFromStorage(STORAGE_KEYS.THEME, "dark", Cb);
}

export function SetTheme(Theme, Cb)
{
    SetInStorage(STORAGE_KEYS.THEME, Theme, Cb);
}

export function GetTagFilter(Cb)
{
    GetFromStorage(STORAGE_KEYS.TAG_FILTER, [], Cb);
}

export function SetTagFilter(Tags, Cb)
{
    SetInStorage(STORAGE_KEYS.TAG_FILTER, Tags, Cb);
}

export function GetNoteSearch(Cb)
{
    GetFromStorage(STORAGE_KEYS.NOTE_SEARCH, "", Cb);
}

export function SetNoteSearch(Val, Cb)
{
    SetInStorage(STORAGE_KEYS.NOTE_SEARCH, Val, Cb);
}

export function GetDevLog(Cb)
{
    GetFromStorage(STORAGE_KEYS.DEVLOG, [], Cb);
}

// When adding a note, ensure its group exists in the group list
export function AddNote(note, cb)
{
    GetGroups((groups) =>
    {
        if (note.group && !groups.includes(note.group))
        {
            groups.push(note.group);
            SetGroups(groups); // No callback!
            GetNotes(location.href, (notes) =>
            {
                notes.push(note);
                SetNotes(location.href, notes); // No callback!
                cb();
            });
        } else
        {
            GetNotes(location.href, (notes) =>
            {
                notes.push(note);
                SetNotes(location.href, notes); // No callback!
                cb();
            });
        }
    });
}

// When renaming or deleting a group, update the group list accordingly
export function RenameGroup(oldName, newName, cb)
{
    GetGroups((groups) =>
    {
        const idx = groups.indexOf(oldName);
        if (idx !== -1)
        {
            groups[idx] = newName;
            SetGroups(groups, cb);
        } else
        {
            cb();
        }
    });
}
export function DeleteGroup(groupName, cb)
{
    GetGroups((groups) =>
    {
        const newGroups = groups.filter(g => g !== groupName);
        SetGroups(newGroups, cb);
    });
}

// When adding a group, just add its name to the group list
export function AddGroup(groupName, cb)
{
    GetGroups((groups) =>
    {
        if (!groups.includes(groupName))
        {
            groups.push(groupName);
            SetGroups(groups, cb);
        } else
        {
            cb();
        }
    });
}