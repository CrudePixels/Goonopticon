// Version: 1.0.1

import { LogDev } from '../log.js';

export function SafeParse(Value, Fallback)
{
    try
    {
        return JSON.parse(Value) || Fallback;
    }
    catch
    {
        return Fallback;
    }
}

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

const groupsKey = "PodAwful::Groups::" + location.href;

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
    GetFromStorage(`PodAwful::Notes::${Url}`, [], Cb);
}

export function SetNotes(Url, Notes, Cb)
{
    SetInStorage(`PodAwful::Notes::${Url}`, Notes, Cb);
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
    GetFromStorage("PodAwful::Locked", false, Cb);
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
    SetInStorage("PodAwful::Locked", !!Val, Cb);
}

export function GetPinnedGroups(Cb)
{
    GetFromStorage("PodAwful::PinnedGroups", [], Cb);
}

export function SetPinnedGroups(Groups, Cb)
{
    SetInStorage("PodAwful::PinnedGroups", Groups, Cb);
}

export function GetSidebarVisible(callback)
{
    // If using chrome.storage
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)
    {
        chrome.storage.local.get(["PodAwful::SidebarVisible"], result =>
        {
            // Default to true if not set
            const visible = result["PodAwful::SidebarVisible"];
            callback(visible !== "false");
        });
    } else if (typeof localStorage !== "undefined")
    {
        // Fallback to localStorage
        const visible = localStorage.getItem("PodAwful::SidebarVisible");
        callback(visible !== "false");
    } else
    {
        // Default fallback
        callback(true);
    }
}
export function SetSidebarVisible(Val, Cb)
{
    SetInStorage("PodAwful::SidebarVisible", !!Val, Cb);
}

export function GetCompact(Cb)
{
    GetFromStorage("PodAwful::Compact", false, Cb);
}

export function GetTheme(Cb)
{
    GetFromStorage("PodAwful::Theme", "dark", Cb);
}

export function SetTheme(Theme, Cb)
{
    SetInStorage("PodAwful::Theme", Theme, Cb);
}

export function GetTagFilter(Cb)
{
    GetFromStorage("PodAwful::TagFilterMulti", [], Cb);
}

export function SetTagFilter(Tags, Cb)
{
    SetInStorage("PodAwful::TagFilterMulti", Tags, Cb);
}

export function GetNoteSearch(Cb)
{
    GetFromStorage("PodAwful::NoteSearch", "", Cb);
}

export function SetNoteSearch(Val, Cb)
{
    SetInStorage("PodAwful::NoteSearch", Val, Cb);
}

export function GetDevLog(Cb)
{
    GetFromStorage("PodAwful::DevLog", [], Cb);
}

// When adding a note, ensure its group exists in the group list
export function AddNote(note, cb)
{
    GetGroups((groups) =>
    {
        if (note.group && !groups.includes(note.group))
        {
            groups.push(note.group);
            SetGroups(groups, () =>
            {
                GetNotes(location.href, (notes) =>
                {
                    notes.push(note);
                    SetNotes(location.href, notes, cb);
                });
            });
        } else
        {
            GetNotes(location.href, (notes) =>
            {
                notes.push(note);
                SetNotes(location.href, notes, cb);
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