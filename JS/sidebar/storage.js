// Version: 1.1.0

import { LogDev } from '../log.js';
import { SafeParse, STORAGE_KEYS } from '../utils.js';

// Generic storage getters/setters
export function GetFromStorage(Key, Fallback = null, Cb)
{
    LogDev("GetFromStorage called for key: " + Key, "data");
    chrome.storage.local.get([Key], Result =>
    {
        try
        {
            const Raw = Result[Key];
            const Value = Raw !== undefined ? SafeParse(Raw, Fallback) : Fallback;
            LogDev("GetFromStorage success for key: " + Key, "data");
            Cb(null, Value);
        } catch (err)
        {
            LogDev("GetFromStorage error: " + err, "error");
            Cb(err, Fallback);
        }
    });
}

export function SetInStorage(Key, Value, Cb)
{
    LogDev("SetInStorage called for key: " + Key, "data");
    const Obj = {};
    Obj[Key] = JSON.stringify(Value);
    chrome.storage.local.set(Obj, () =>
    {
        if (chrome.runtime.lastError)
        {
            LogDev("SetInStorage error: " + chrome.runtime.lastError.message, "error");
            if (Cb) Cb(chrome.runtime.lastError);
        } else if (Cb)
        {
            LogDev("SetInStorage success for key: " + Key, "data");
            Cb(null);
        }
    });
}

const groupsKey = STORAGE_KEYS.GROUPS(location.href);

// Group management
export function GetGroups(cb)
{
    LogDev("GetGroups called", "data");
    chrome.storage.local.get([groupsKey], (result) =>
    {
        try
        {
            LogDev("GetGroups success", "data");
            // Always return an array, never undefined
            const groups = result[groupsKey] ? JSON.parse(result[groupsKey]) : [];
            cb(null, Array.isArray(groups) ? groups : []);
        } catch (err)
        {
            LogDev("GetGroups error: " + err, "error");
            cb(err, []);
        }
    });
}
export function SetGroups(groups, cb)
{
    LogDev("SetGroups called", "system");
    const obj = {};
    obj[groupsKey] = JSON.stringify(groups);
    chrome.storage.local.set(obj, () =>
    {
        if (chrome.runtime.lastError)
        {
            LogDev("SetGroups error: " + chrome.runtime.lastError.message, "error");
            if (cb) cb(chrome.runtime.lastError);
        } else if (cb)
        {
            LogDev("SetGroups success", "system");
            cb(null);
        }
    });
}

// Convenience wrappers
export function GetNotes(Url, Cb)
{
    LogDev("GetNotes called for url: " + Url, "data");
    GetFromStorage(STORAGE_KEYS.NOTES(Url), [], (err, notes) =>
    {
        Cb(Array.isArray(notes) ? notes : []);
    });
}

export function SetNotes(Url, Notes, Cb)
{
    LogDev("SetNotes called for url: " + Url, "system");
    SetInStorage(STORAGE_KEYS.NOTES(Url), Notes, Cb);
}

export function SaveUndo(Url, Notes, Cb)
{
    LogDev("SaveUndo called for url: " + Url, "system");
    SetInStorage(`PodAwful::Undo::${Url}`, Notes, Cb);
}

export function GetUndo(Url, Cb)
{
    LogDev("GetUndo called for url: " + Url, "data");
    GetFromStorage(`PodAwful::Undo::${Url}`, [], Cb);
}

export function GetLocked(Cb)
{
    LogDev("GetLocked called", "data");
    GetFromStorage(STORAGE_KEYS.LOCKED, false, (err, val) =>
    {
        // Convert string "true"/"false" to boolean
        let locked = val;
        if (typeof locked === "string")
        {
            locked = locked === "true";
        }
        Cb(err, !!locked);
    });
}

// Promise-based version for use in Promise.all
export function GetLockedPromise()
{
    LogDev("GetLockedPromise called", "data");
    return new Promise(Resolve =>
    {
        GetLocked((err, val) =>
        {
            if (err) LogDev("GetLockedPromise error: " + err, "error");
            else LogDev("GetLockedPromise success", "data");
            Resolve(val);
        });
    });
}

export function SetLocked(Val, Cb)
{
    LogDev("SetLocked called with value: " + Val, "system");
    SetInStorage(STORAGE_KEYS.LOCKED, !!Val, Cb);
}

export function GetPinnedGroups(Cb)
{
    LogDev("GetPinnedGroups called", "data");
    GetFromStorage(STORAGE_KEYS.PINNED_GROUPS, [], (err, pins) =>
    {
        Cb(Array.isArray(pins) ? pins : []);
    });
}

export function SetPinnedGroups(Groups, Cb)
{
    LogDev("SetPinnedGroups called", "system");
    SetInStorage(STORAGE_KEYS.PINNED_GROUPS, Groups, Cb);
}

export function GetSidebarVisible(cb)
{
    LogDev("GetSidebarVisible called", "data");
    chrome.storage.local.get([STORAGE_KEYS.SIDEBAR_VISIBLE], (result) =>
    {
        const val = result[STORAGE_KEYS.SIDEBAR_VISIBLE];
        LogDev("GetSidebarVisible result: " + val, "data");
        cb(null, val === undefined ? true : val === true || val === "true");
    });
}

export function SetSidebarVisible(Val, Cb)
{
    LogDev("SetSidebarVisible called with value: " + Val, "system");
    SetInStorage(STORAGE_KEYS.SIDEBAR_VISIBLE, !!Val, Cb);
}

export function GetCompact(Cb)
{
    LogDev("GetCompact called", "data");
    GetFromStorage(STORAGE_KEYS.COMPACT, false, Cb);
}

export function GetTheme(Cb)
{
    LogDev("GetTheme called", "data");
    GetFromStorage(STORAGE_KEYS.THEME, "dark", Cb);
}

export function SetTheme(Theme, Cb)
{
    LogDev("SetTheme called with theme: " + Theme, "system");
    SetInStorage(STORAGE_KEYS.THEME, Theme, Cb);
}

export function GetTagFilter(Cb)
{
    LogDev("GetTagFilter called", "data");
    GetFromStorage(STORAGE_KEYS.TAG_FILTER, [], (err, tags) =>
    {
        Cb(Array.isArray(tags) ? tags : []);
    });
}

export function SetTagFilter(Tags, Cb)
{
    LogDev("SetTagFilter called", "system");
    SetInStorage(STORAGE_KEYS.TAG_FILTER, Tags, Cb);
}

export function GetNoteSearch(Cb)
{
    LogDev("GetNoteSearch called", "data");
    GetFromStorage(STORAGE_KEYS.NOTE_SEARCH, "", Cb);
}

export function SetNoteSearch(Val, Cb)
{
    LogDev("SetNoteSearch called", "system");
    SetInStorage(STORAGE_KEYS.NOTE_SEARCH, Val, Cb);
}

export function GetDevLog(Cb)
{
    LogDev("GetDevLog called", "data");
    GetFromStorage(STORAGE_KEYS.DEVLOG, [], Cb);
}

// When adding a note, ensure its group exists in the group list
export function AddNote(note, cb)
{
    LogDev("AddNote called", "event");
    if (!note || !note.group || !note.text)
    {
        LogDev("AddNote error: Invalid note object", "error");
        if (cb) cb(new Error("Invalid note object"));
        return;
    }
    GetGroups((err, groups) =>
    {
        groups = Array.isArray(groups) ? groups : [];
        if (err)
        {
            LogDev("AddNote error in GetGroups: " + err, "error");
            return cb && cb(err);
        }
        if (!groups.includes(note.group))
        {
            groups.push(note.group);
            SetGroups(groups, (err2) =>
            {
                if (err2)
                {
                    LogDev("AddNote error in SetGroups: " + err2, "error");
                    return cb && cb(err2);
                }
                GetNotes(location.href, (notes) =>
                {
                    notes = Array.isArray(notes) ? notes : [];
                    notes.push(note);
                    SetNotes(location.href, notes, cb);
                });
            });
        } else
        {
            GetNotes(location.href, (notes) =>
            {
                notes = Array.isArray(notes) ? notes : [];
                notes.push(note);
                SetNotes(location.href, notes, cb);
            });
        }
    });
}

// When renaming or deleting a group, update the group list accordingly
export function RenameGroup(oldName, newName, cb)
{
    LogDev("RenameGroup called from " + oldName + " to " + newName, "event");
    GetGroups((err, groups) =>
    {
        groups = Array.isArray(groups) ? groups : [];
        if (err)
        {
            LogDev("RenameGroup error in GetGroups: " + err, "error");
            return cb && cb(err);
        }
        const idx = groups.indexOf(oldName);
        if (idx !== -1)
        {
            groups[idx] = newName;
            SetGroups(groups, cb);
        } else
        {
            cb && cb(null);
        }
    });
}
export function DeleteGroup(groupName, cb)
{
    LogDev("DeleteGroup called for group: " + groupName, "event");
    GetGroups((err, groups) =>
    {
        groups = Array.isArray(groups) ? groups : [];
        if (err)
        {
            LogDev("DeleteGroup error in GetGroups: " + err, "error");
            return cb && cb(err);
        }
        const newGroups = groups.filter(g => g !== groupName);
        SetGroups(newGroups, cb);
    });
}

// When adding a group, just add its name to the group list
export function AddGroup(groupName, cb)
{
    LogDev("AddGroup called for group: " + groupName, "event");
    if (!groupName || !groupName.trim())
    {
        LogDev("AddGroup error: Invalid group name", "error");
        if (cb) cb(new Error("Invalid group name"));
        return;
    }
    GetGroups((err, groups) =>
    {
        groups = Array.isArray(groups) ? groups : [];
        if (err)
        {
            LogDev("AddGroup error in GetGroups: " + err, "error");
            return cb && cb(err);
        }
        if (!groups.includes(groupName))
        {
            groups.push(groupName);
            SetGroups(groups, cb);
        } else
        {
            cb && cb(null);
        }
    });
}