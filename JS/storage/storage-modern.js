import { LogDev } from '../log.js';
import { normalizeYouTubeUrl } from '../utils.js';
import * as browser from 'webextension-polyfill';

/**
 * Modern Storage Layer
 * Uses async/await and provides consistent error handling
 */

// Storage keys
export const STORAGE_KEYS = {
    SIDEBAR_VISIBLE: "PodAwful::SidebarVisible",
    THEME: "PodAwful::Theme",
    COMPACT: "PodAwful::Compact",
    TAG_FILTER: "PodAwful::TagFilterMulti",
    NOTE_SEARCH: "PodAwful::NoteSearch",
    PINNED_GROUPS: "PodAwful::PinnedGroups",
    LOCKED: "PodAwful::Locked",
    DEVLOG: "PodAwful::DevLog",
    UNDO: "PodAwful::Undo",
    SCHEMA_VERSION: "PodAwful::SchemaVersion",
    NOTES: (url) => `PodAwful::Notes::${encodeURIComponent(normalizeYouTubeUrl(url))}`,
    GROUPS: (url) => `PodAwful::Groups::${encodeURIComponent(normalizeYouTubeUrl(url))}`
};

/**
 * Generic storage getter with error handling
 * @param {string|string[]} keys - Key(s) to get
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {Promise<*>} - The stored value or default
 */
export async function getStorage(keys, defaultValue = null) {
    try {
        const result = await browser.storage.local.get(keys);
        if (browser.runtime.lastError) {
            throw new Error(browser.runtime.lastError.message);
        }
        
        if (Array.isArray(keys)) {
            return result;
        } else {
            return result[keys] !== undefined ? result[keys] : defaultValue;
        }
    } catch (error) {
        LogDev(`Error getting storage for keys ${keys}: ${error.message}`, 'error');
        return defaultValue;
    }
}

/**
 * Generic storage setter with error handling
 * @param {Object} data - Data to store
 * @returns {Promise<void>}
 */
export async function setStorage(data) {
    try {
        await browser.storage.local.set(data);
        if (browser.runtime.lastError) {
            throw new Error(browser.runtime.lastError.message);
        }
        LogDev(`Storage set successfully for keys: ${Object.keys(data).join(', ')}`, 'data');
    } catch (error) {
        LogDev(`Error setting storage: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Generic storage remover with error handling
 * @param {string|string[]} keys - Key(s) to remove
 * @returns {Promise<void>}
 */
export async function removeStorage(keys) {
    try {
        await browser.storage.local.remove(keys);
        if (browser.runtime.lastError) {
            throw new Error(browser.runtime.lastError.message);
        }
        LogDev(`Storage removed successfully for keys: ${Array.isArray(keys) ? keys.join(', ') : keys}`, 'data');
    } catch (error) {
        LogDev(`Error removing storage: ${error.message}`, 'error');
        throw error;
    }
}

// Notes operations
export async function getNotes(url) {
    const key = STORAGE_KEYS.NOTES(url);
    const notes = await getStorage(key, []);
    LogDev(`Retrieved ${notes.length} notes for URL: ${url}`, 'data');
    return notes;
}

export async function setNotes(url, notes) {
    const key = STORAGE_KEYS.NOTES(url);
    await setStorage({ [key]: notes });
    LogDev(`Stored ${notes.length} notes for URL: ${url}`, 'data');
}

export async function addNote(url, note) {
    const notes = await getNotes(url);
    notes.push(note);
    await setNotes(url, notes);
    LogDev(`Added note to URL: ${url}`, 'data');
}

export async function updateNote(url, noteId, updatedNote) {
    const notes = await getNotes(url);
    const index = notes.findIndex(note => note.id === noteId);
    if (index !== -1) {
        notes[index] = { ...notes[index], ...updatedNote };
        await setNotes(url, notes);
        LogDev(`Updated note ${noteId} for URL: ${url}`, 'data');
    } else {
        throw new Error(`Note with ID ${noteId} not found`);
    }
}

export async function deleteNote(url, noteId) {
    const notes = await getNotes(url);
    const filteredNotes = notes.filter(note => note.id !== noteId);
    await setNotes(url, filteredNotes);
    LogDev(`Deleted note ${noteId} for URL: ${url}`, 'data');
}

// Groups operations
export async function getGroups(url) {
    const key = STORAGE_KEYS.GROUPS(url);
    const groups = await getStorage(key, []);
    LogDev(`Retrieved ${groups.length} groups for URL: ${url}`, 'data');
    return groups;
}

export async function setGroups(url, groups) {
    const key = STORAGE_KEYS.GROUPS(url);
    await setStorage({ [key]: groups });
    LogDev(`Stored ${groups.length} groups for URL: ${url}`, 'data');
}

export async function addGroup(url, groupName) {
    const groups = await getGroups(url);
    if (!groups.includes(groupName)) {
        groups.push(groupName);
        await setGroups(url, groups);
        LogDev(`Added group "${groupName}" for URL: ${url}`, 'data');
    }
}

export async function deleteGroup(url, groupName) {
    const groups = await getGroups(url);
    const filteredGroups = groups.filter(group => group !== groupName);
    await setGroups(url, filteredGroups);
    LogDev(`Deleted group "${groupName}" for URL: ${url}`, 'data');
}

export async function renameGroup(url, oldName, newName) {
    const groups = await getGroups(url);
    const index = groups.indexOf(oldName);
    if (index !== -1) {
        groups[index] = newName;
        await setGroups(url, groups);
        LogDev(`Renamed group "${oldName}" to "${newName}" for URL: ${url}`, 'data');
    } else {
        throw new Error(`Group "${oldName}" not found`);
    }
}

// Settings operations
export async function getSidebarVisible() {
    return await getStorage(STORAGE_KEYS.SIDEBAR_VISIBLE, false);
}

export async function setSidebarVisible(visible) {
    await setStorage({ [STORAGE_KEYS.SIDEBAR_VISIBLE]: visible });
    LogDev(`Sidebar visibility set to: ${visible}`, 'data');
}

export async function getTheme() {
    return await getStorage(STORAGE_KEYS.THEME, 'default');
}

export async function setTheme(theme) {
    await setStorage({ [STORAGE_KEYS.THEME]: theme });
    LogDev(`Theme set to: ${theme}`, 'data');
}

export async function getCompact() {
    return await getStorage(STORAGE_KEYS.COMPACT, false);
}

export async function setCompact(compact) {
    await setStorage({ [STORAGE_KEYS.COMPACT]: compact });
    LogDev(`Compact mode set to: ${compact}`, 'data');
}

export async function getTagFilter() {
    return await getStorage(STORAGE_KEYS.TAG_FILTER, []);
}

export async function setTagFilter(tags) {
    await setStorage({ [STORAGE_KEYS.TAG_FILTER]: tags });
    LogDev(`Tag filter set to: ${tags.join(', ')}`, 'data');
}

export async function getNoteSearch() {
    return await getStorage(STORAGE_KEYS.NOTE_SEARCH, '');
}

export async function setNoteSearch(search) {
    await setStorage({ [STORAGE_KEYS.NOTE_SEARCH]: search });
    LogDev(`Note search set to: ${search}`, 'data');
}

export async function getPinnedGroups() {
    return await getStorage(STORAGE_KEYS.PINNED_GROUPS, []);
}

export async function setPinnedGroups(groups) {
    await setStorage({ [STORAGE_KEYS.PINNED_GROUPS]: groups });
    LogDev(`Pinned groups set to: ${groups.join(', ')}`, 'data');
}

export async function getLocked() {
    return await getStorage(STORAGE_KEYS.LOCKED, false);
}

export async function setLocked(locked) {
    await setStorage({ [STORAGE_KEYS.LOCKED]: locked });
    LogDev(`Locked state set to: ${locked}`, 'data');
}

export async function getDevLog() {
    return await getStorage(STORAGE_KEYS.DEVLOG, '');
}

export async function setDevLog(log) {
    await setStorage({ [STORAGE_KEYS.DEVLOG]: log });
    LogDev(`Dev log updated`, 'data');
}

export async function getUndo(url) {
    const key = `${STORAGE_KEYS.UNDO}::${encodeURIComponent(normalizeYouTubeUrl(url))}`;
    return await getStorage(key, null);
}

export async function setUndo(url, data) {
    const key = `${STORAGE_KEYS.UNDO}::${encodeURIComponent(normalizeYouTubeUrl(url))}`;
    await setStorage({ [key]: data });
    LogDev(`Undo data set for URL: ${url}`, 'data');
}

// Bulk operations
export async function getAllNotes() {
    const result = await getStorage(null);
    const allNotes = {};
    
    Object.keys(result).forEach(key => {
        if (key.startsWith('PodAwful::Notes::')) {
            const url = decodeURIComponent(key.replace('PodAwful::Notes::', ''));
            allNotes[url] = result[key];
        }
    });
    
    LogDev(`Retrieved notes for ${Object.keys(allNotes).length} URLs`, 'data');
    return allNotes;
}

export async function setAllNotes(allNotes) {
    const storageData = {};
    Object.keys(allNotes).forEach(url => {
        const key = STORAGE_KEYS.NOTES(url);
        storageData[key] = allNotes[url];
    });
    
    await setStorage(storageData);
    LogDev(`Stored notes for ${Object.keys(allNotes).length} URLs`, 'data');
}

// Schema version management
export async function getSchemaVersion() {
    return await getStorage(STORAGE_KEYS.SCHEMA_VERSION, 1);
}

export async function setSchemaVersion(version) {
    await setStorage({ [STORAGE_KEYS.SCHEMA_VERSION]: version });
    LogDev(`Schema version set to: ${version}`, 'data');
}
