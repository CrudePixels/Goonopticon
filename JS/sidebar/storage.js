// Version: 1.1.0

import * as browser from 'webextension-polyfill';
import { LogDev } from '../log.js';
import { safeParse, STORAGE_KEYS } from '../utils.js';

/**
 * Gets a value from browser.storage.local.
 * @param {string} Key - The storage key.
 * @param {*} [Fallback=null] - The fallback value if not found.
 * @param {function} Cb - Callback with (err, value).
 */
export function getFromStorage(Key, Fallback = null, Cb)
{
    LogDev("GetFromStorage called for key: " + Key, "data");
    browser.storage.local.get([Key])
        .then(Result => {
            try {
                const Raw = Result[Key];
                const Value = Raw !== undefined ? safeParse(Raw, Fallback) : Fallback;
                LogDev("GetFromStorage success for key: " + Key, "data");
                Cb(null, Value);
            } catch (err) {
                LogDev("GetFromStorage error: " + err, "error");
                Cb(err, Fallback);
            }
        });
}

/**
 * Sets a value in browser.storage.local.
 * @param {string} Key - The storage key.
 * @param {*} Value - The value to store.
 * @param {function} Cb - Callback with (err).
 */
export function setInStorage(Key, Value, Cb)
{
    LogDev("SetInStorage called for key: " + Key, "data");
    const Obj = {};
    Obj[Key] = JSON.stringify(Value);
    browser.storage.local.set(Obj)
        .then(() => {
            if (browser.runtime.lastError) {
                LogDev("SetInStorage error: " + browser.runtime.lastError.message, "error");
                if (Cb) Cb(browser.runtime.lastError);
            } else if (Cb) {
                LogDev("SetInStorage success for key: " + Key, "data");
                Cb(null);
            }
        });
}

// Don't cache the groups key - it needs to be dynamic based on current URL
function getGroupsKey() {
    return STORAGE_KEYS.GROUPS(location.href);
}
const NOTE_SCHEMA_VERSION = 1;
const GROUP_SCHEMA_VERSION = 1;

// === SCHEMA VERSIONING ===
export const SCHEMA_VERSION = {
    NOTES: 1,
    GROUPS: 1
};

// Migration pipeline for notes
function migrateNotes(notes) {
    let migrated = Array.isArray(notes) ? notes.slice() : [];
    let currentVersion = SCHEMA_VERSION.NOTES;
    // Find the minimum version in the array (default to 1 if missing)
    let minVersion = Math.min(...migrated.map(n => n._schemaVersion || 1), currentVersion);
    // Apply migrations in order
    for (let v = minVersion; v < currentVersion; v++) {
        const migrator = noteMigrations[v];
        if (typeof migrator === 'function') {
            migrated = migrator(migrated);
        }
    }
    // Ensure all notes have the latest version
    migrated = migrated.map(n => ({ ...n, _schemaVersion: currentVersion }));
    return migrated;
}

// Migration pipeline for groups
function migrateGroups(groups) {
    let migrated = Array.isArray(groups) ? groups.slice() : [];
    // Convert any group objects to strings (use .name, .groupName, .title, or fallback to String)
    migrated = migrated.map(g => {
        if (typeof g === 'string') return g;
        if (g && typeof g === 'object') {
            return g.name || g.groupName || g.title || String(g);
        }
        return String(g);
    });
    return migrated;
}

// Migration functions for notes (add new versions as needed)
const noteMigrations = {
    // 1: (notes) => { /* v1 to v2 migration */ return notes; },
    // 2: (notes) => { /* v2 to v3 migration */ return notes; },
};

// Migration functions for groups (add new versions as needed)
const groupMigrations = {
    // 1: (groups) => { /* v1 to v2 migration */ return groups; },
    // 2: (groups) => { /* v2 to v3 migration */ return groups; },
};

/**
 * Gets all groups from storage, migrating if needed.
 * @param {function} cb - Callback with (err, groups[]).
 */
export function getGroups(cb)
{
    LogDev("GetGroups called", "data");
    const currentGroupsKey = getGroupsKey();
    browser.storage.local.get([currentGroupsKey])
        .then(result => {
            try {
                LogDev("GetGroups success", "data");
                const groups = result[currentGroupsKey] ? JSON.parse(result[currentGroupsKey]) : [];
                // MIGRATION: Handle migration if groups have an older schema version
                const migratedGroups = migrateGroups(groups);
                cb(null, Array.isArray(migratedGroups) ? migratedGroups : []);
            } catch (err) {
                LogDev("GetGroups error: " + err, "error");
                cb(err, []);
            }
        });
}

/**
 * Sets all groups in storage as an array of strings.
 * @param {Array} groups - Array of group names (strings).
 * @param {function} cb - Callback with (err).
 */
export function setGroups(groups, cb)
{
    LogDev("SetGroups called", "system");
    // Only store as array of strings
    const groupsSanitized = Array.isArray(groups) ? groups.map(g => typeof g === 'string' ? g : (g.name || g.groupName || g.title || String(g))) : [];
    const obj = {};
    const currentGroupsKey = getGroupsKey();
    obj[currentGroupsKey] = JSON.stringify(groupsSanitized);
    browser.storage.local.set(obj)
        .then(() => {
            if (browser.runtime.lastError) {
                LogDev("SetGroups error: " + browser.runtime.lastError.message, "error");
                if (cb) cb(browser.runtime.lastError);
            } else if (cb) {
                LogDev("SetGroups success", "system");
                cb(null);
            }
        });
}

/**
 * Gets all notes for a URL, migrating if needed.
 * @param {string} Url - The page URL.
 * @param {function} Cb - Callback with notes[].
 */
export function getNotes(Url, Cb)
{
    LogDev("GetNotes called for url: " + Url, "data");
    getFromStorage(STORAGE_KEYS.NOTES(Url), [], (err, notes) => {
        // MIGRATION: Handle migration if notes have an older schema version
        const migratedNotes = migrateNotes(notes);
        Cb(Array.isArray(migratedNotes) ? migratedNotes : []);
    });
}

/**
 * Sets all notes for a URL, applying schema version.
 * @param {string} Url - The page URL.
 * @param {Array} Notes - Array of note objects.
 * @param {function} Cb - Callback with (err).
 */
export function setNotes(Url, Notes, Cb)
{
    LogDev("SetNotes called for url: " + Url, "system");
    const notesWithVersion = Array.isArray(Notes) ? Notes.map(n => ({ ...n, _schemaVersion: SCHEMA_VERSION.NOTES })) : [];
    setInStorage(STORAGE_KEYS.NOTES(Url), notesWithVersion, Cb);
}

/**
 * Saves undo state for a URL.
 * @param {string} Url - The page URL.
 * @param {Array} Notes - Notes to save for undo.
 * @param {function} Cb - Callback with (err).
 */
export function saveUndo(Url, Notes, Cb)
{
    LogDev("SaveUndo called for url: " + Url, "system");
    setInStorage(`PodAwful::Undo::${Url}`, Notes, Cb);
}

/**
 * Gets undo state for a URL.
 * @param {string} Url - The page URL.
 * @param {function} Cb - Callback with notes[].
 */
export function getUndo(Url, Cb)
{
    LogDev("GetUndo called for url: " + Url, "data");
    getFromStorage(`PodAwful::Undo::${Url}`, [], Cb);
}

/**
 * Gets the locked state of the sidebar.
 * @param {function} Cb - Callback with (err, locked:boolean).
 */
export function getLocked(Cb)
{
    LogDev("GetLocked called", "data");
    getFromStorage(STORAGE_KEYS.LOCKED, false, (err, val) =>
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

/**
 * Gets the locked state as a Promise.
 * @returns {Promise<boolean>} Promise resolving to locked state.
 */
export function getLockedPromise()
{
    LogDev("GetLockedPromise called", "data");
    return new Promise(Resolve =>
    {
        getLocked((err, val) =>
        {
            if (err) LogDev("GetLockedPromise error: " + err, "error");
            else LogDev("GetLockedPromise success", "data");
            Resolve(val);
        });
    });
}

/**
 * Sets the locked state of the sidebar.
 * @param {boolean} Val - Locked state.
 * @param {function} Cb - Callback with (err).
 */
export function setLocked(Val, Cb)
{
    LogDev("SetLocked called with value: " + Val, "system");
    setInStorage(STORAGE_KEYS.LOCKED, !!Val, Cb);
}

/**
 * Gets pinned groups from storage.
 * @param {function} Cb - Callback with pinned group names[].
 */
export function getPinnedGroups(Cb)
{
    LogDev("GetPinnedGroups called", "data");
    getFromStorage(STORAGE_KEYS.PINNED_GROUPS, [], (err, pins) =>
    {
        Cb(Array.isArray(pins) ? pins : []);
    });
}

/**
 * Sets pinned groups in storage.
 * @param {Array} Groups - Array of group names.
 * @param {function} Cb - Callback with (err).
 */
export function setPinnedGroups(Groups, Cb)
{
    LogDev("SetPinnedGroups called", "system");
    setInStorage(STORAGE_KEYS.PINNED_GROUPS, Groups, Cb);
}

/**
 * Gets sidebar visibility state.
 * @param {function} cb - Callback with (err, visible:boolean).
 */
export function getSidebarVisible(cb)
{
    LogDev("GetSidebarVisible called", "data");
    browser.storage.local.get([STORAGE_KEYS.SIDEBAR_VISIBLE])
        .then(result => {
            const val = result[STORAGE_KEYS.SIDEBAR_VISIBLE];
            LogDev("GetSidebarVisible result: " + val, "data");
            cb(null, val === undefined ? false : val === true || val === "true");
        });
}

/**
 * Sets sidebar visibility state.
 * @param {boolean} Val - Visible state.
 * @param {function} Cb - Callback with (err).
 */
export function setSidebarVisible(Val, Cb)
{
    LogDev("SetSidebarVisible called with value: " + Val, "system");
    setInStorage(STORAGE_KEYS.SIDEBAR_VISIBLE, !!Val, Cb);
}

/**
 * Gets compact mode state.
 * @param {function} Cb - Callback with (err, compact:boolean).
 */
export function getCompact(Cb)
{
    LogDev("GetCompact called", "data");
    getFromStorage(STORAGE_KEYS.COMPACT, false, Cb);
}

/**
 * Gets the current theme.
 * @param {function} Cb - Callback with (err, theme:string).
 */
export function getTheme(Cb)
{
    LogDev("GetTheme called", "data");
    getFromStorage(STORAGE_KEYS.THEME, "dark", Cb);
}

/**
 * Sets the current theme.
 * @param {string} Theme - Theme name.
 * @param {function} Cb - Callback with (err).
 */
export function setTheme(Theme, Cb)
{
    LogDev("SetTheme called with theme: " + Theme, "system");
    setInStorage(STORAGE_KEYS.THEME, Theme, Cb);
}

/**
 * Gets the tag filter state.
 * @param {function} Cb - Callback with (err, tags[]).
 */
export function getTagFilter(Cb)
{
    LogDev("GetTagFilter called", "data");
    getFromStorage(STORAGE_KEYS.TAG_FILTER, [], (err, tags) =>
    {
        Cb(Array.isArray(tags) ? tags : []);
    });
}

/**
 * Sets the tag filter state.
 * @param {Array} Tags - Array of tag names.
 * @param {function} Cb - Callback with (err).
 */
export function setTagFilter(Tags, Cb)
{
    LogDev("SetTagFilter called", "system");
    setInStorage(STORAGE_KEYS.TAG_FILTER, Tags, Cb);
}

/**
 * Gets the note search state.
 * @param {function} Cb - Callback with (err, search:string).
 */
export function getNoteSearch(Cb)
{
    LogDev("GetNoteSearch called", "data");
    getFromStorage(STORAGE_KEYS.NOTE_SEARCH, "", Cb);
}

/**
 * Sets the note search state.
 * @param {string} Val - Search string.
 * @param {function} Cb - Callback with (err).
 */
export function setNoteSearch(Val, Cb)
{
    LogDev("SetNoteSearch called", "system");
    setInStorage(STORAGE_KEYS.NOTE_SEARCH, Val, Cb);
}

/**
 * Gets the dev log from storage.
 * @param {function} Cb - Callback with dev log array.
 */
export function getDevLog(Cb)
{
    LogDev("GetDevLog called", "data");
    getFromStorage(STORAGE_KEYS.DEVLOG, [], Cb);
}

/**
 * Adds a note to storage.
 * @param {Object} note - Note object to add.
 * @param {function} cb - Callback with (err).
 */
export function addNote(note, cb)
{
    LogDev("AddNote called", "event");
    if (!note || !note.group || !note.text)
    {
        LogDev("AddNote error: Invalid note object", "error");
        if (cb) cb(new Error("Invalid note object"));
        return;
    }
    getGroups((err, groups) =>
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
            setGroups(groups, (err2) =>
            {
                if (err2)
                {
                    LogDev("AddNote error in SetGroups: " + err2, "error");
                    return cb && cb(err2);
                }
                getNotes(location.href, (notes) =>
                {
                    notes = Array.isArray(notes) ? notes : [];
                    notes.push(note);
                    setNotes(location.href, notes, cb);
                });
            });
        } else
        {
            getNotes(location.href, (notes) =>
            {
                notes = Array.isArray(notes) ? notes : [];
                notes.push(note);
                setNotes(location.href, notes, cb);
            });
        }
    });
}

/**
 * Renames a group in storage.
 * @param {string} oldName - Old group name.
 * @param {string} newName - New group name.
 * @param {function} cb - Callback with (err).
 */
export function renameGroup(oldName, newName, cb)
{
    LogDev("RenameGroup called from " + oldName + " to " + newName, "event");
    getGroups((err, groups) =>
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
            setGroups(groups, cb);
        } else
        {
            cb && cb(null);
        }
    });
}
export function deleteGroup(groupName, cb)
{
    LogDev("DeleteGroup called for group: " + groupName, "event");
    getGroups((err, groups) =>
    {
        groups = Array.isArray(groups) ? groups : [];
        if (err)
        {
            LogDev("DeleteGroup error in GetGroups: " + err, "error");
            return cb && cb(err);
        }
        const newGroups = groups.filter(g => g !== groupName);
        setGroups(newGroups, cb);
    });
}

/**
 * Adds a group to storage.
 * @param {string} groupName - Group name to add.
 * @param {function} cb - Callback with (err).
 */
export function addGroup(groupName, cb)
{
    LogDev("AddGroup called for group: " + groupName, "event");
    if (!groupName || !groupName.trim())
    {
        LogDev("AddGroup error: Invalid group name", "error");
        if (cb) cb(new Error("Invalid group name"));
        return;
    }
    getGroups((err, groups) =>
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
            setGroups(groups, cb);
        } else
        {
            cb && cb(null);
        }
    });
}