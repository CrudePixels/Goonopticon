import { LogDev } from '../log.js';
import { getFromStorage as safeGetFromStorage, setInStorage as safeSetInStorage, removeFromStorage as safeRemoveFromStorage, clearStorage as safeClearStorage } from './storage-wrapper.js';

/**
 * Storage Migration Layer
 * Provides backward compatibility between old callback-based and new async/await storage
 */

/**
 * Wraps async function to provide callback compatibility
 * @param {Function} asyncFn - Async function to wrap
 * @param {Function} callback - Callback function
 */
export function wrapAsyncWithCallback(asyncFn, callback) {
    if (typeof callback === 'function') {
        asyncFn()
            .then(result => callback(null, result))
            .catch(error => callback(error));
    } else {
        return asyncFn();
    }
}

/**
 * Legacy storage functions with callback support
 * These maintain backward compatibility with existing code
 */

export function getFromStorage(Key, Fallback = null, Cb) {
    LogDev(`getFromStorage called for key: ${Key}`, "data");
    
    if (typeof browser === 'undefined' || !browser || !browser.storage || !browser.storage.local) {
        LogDev(`Browser storage not available, using fallback for ${Key}`, "warning");
        return Cb && Cb(null, Fallback);
    }
    
    try {
        // Check if the storage API supports callbacks or promises
        const getMethod = browser.storage.local.get;
        
        if (typeof getMethod === 'function') {
            // Try callback approach first
            try {
                getMethod([Key], (result) => {
                    if (browser.runtime.lastError) {
                        LogDev(`Error getting storage for key ${Key}: ${browser.runtime.lastError}`, "error");
                        return Cb && Cb(browser.runtime.lastError);
                    }
                    const value = result[Key] !== undefined ? result[Key] : Fallback;
                    LogDev(`Storage value for ${Key}: ${value}`, "data");
                    Cb && Cb(null, value);
                });
            } catch (callbackError) {
                // If callback fails, try promise approach
                LogDev(`Callback approach failed, trying promise approach: ${callbackError.message}`, "warning");
                getMethod([Key]).then((result) => {
                    const value = result[Key] !== undefined ? result[Key] : Fallback;
                    LogDev(`Storage value for ${Key}: ${value}`, "data");
                    Cb && Cb(null, value);
                }).catch((promiseError) => {
                    LogDev(`Promise approach also failed: ${promiseError.message}`, "error");
                    Cb && Cb(promiseError);
                });
            }
        } else {
            LogDev(`Storage get method not available`, "error");
            Cb && Cb(new Error("Storage get method not available"));
        }
    } catch (error) {
        LogDev(`Error in getFromStorage: ${error.message}`, "error");
        Cb && Cb(error);
    }
}

export function setInStorage(Key, Value, Cb) {
    LogDev(`setInStorage called for key: ${Key}`, "data");
    
    if (typeof browser === 'undefined' || !browser || !browser.storage || !browser.storage.local) {
        LogDev(`Browser storage not available for key ${Key}`, "warning");
        return Cb && Cb(new Error("Browser storage not available"));
    }
    
    try {
        // Check if the storage API supports callbacks or promises
        const setMethod = browser.storage.local.set;
        
        if (typeof setMethod === 'function') {
            // Try callback approach first
            try {
                setMethod({ [Key]: Value }, () => {
                    if (browser.runtime.lastError) {
                        LogDev(`Error setting storage for key ${Key}: ${browser.runtime.lastError}`, "error");
                        return Cb && Cb(browser.runtime.lastError);
                    }
                    LogDev(`Storage set successfully for key: ${Key}`, "data");
                    Cb && Cb(null);
                });
            } catch (callbackError) {
                // If callback fails, try promise approach
                LogDev(`Callback approach failed, trying promise approach: ${callbackError.message}`, "warning");
                setMethod({ [Key]: Value }).then(() => {
                    LogDev(`Storage set successfully for key: ${Key}`, "data");
                    Cb && Cb(null);
                }).catch((promiseError) => {
                    LogDev(`Promise approach also failed: ${promiseError.message}`, "error");
                    Cb && Cb(promiseError);
                });
            }
        } else {
            LogDev(`Storage set method not available`, "error");
            Cb && Cb(new Error("Storage set method not available"));
        }
    } catch (error) {
        LogDev(`Error in setInStorage: ${error.message}`, "error");
        Cb && Cb(error);
    }
}

// Legacy function wrappers for backward compatibility
export function getNotes(Url, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getNotes: getNotesAsync } = await import('./storage-modern.js');
        return await getNotesAsync(Url);
    }, Cb);
}

export function setNotes(Url, Notes, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { setNotes: setNotesAsync } = await import('./storage-modern.js');
        return await setNotesAsync(Url, Notes);
    }, Cb);
}

export function getGroups(url, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getGroups: getGroupsAsync } = await import('./storage-modern.js');
        return await getGroupsAsync(url);
    }, Cb);
}

export function setGroups(groups, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { setGroups: setGroupsAsync } = await import('./storage-modern.js');
        return await setGroupsAsync(location.href, groups);
    }, Cb);
}

export function addNote(note, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { addNote: addNoteAsync } = await import('./storage-modern.js');
        return await addNoteAsync(location.href, note);
    }, Cb);
}

export function addGroup(groupName, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { addGroup: addGroupAsync } = await import('./storage-modern.js');
        return await addGroupAsync(location.href, groupName);
    }, Cb);
}

export function deleteGroup(groupName, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { deleteGroup: deleteGroupAsync } = await import('./storage-modern.js');
        return await deleteGroupAsync(location.href, groupName);
    }, Cb);
}

export function renameGroup(oldName, newName, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { renameGroup: renameGroupAsync } = await import('./storage-modern.js');
        return await renameGroupAsync(location.href, oldName, newName);
    }, Cb);
}

export function getSidebarVisible(Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getSidebarVisible: getSidebarVisibleAsync } = await import('./storage-modern.js');
        return await getSidebarVisibleAsync();
    }, Cb);
}

export function setSidebarVisible(Val, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { setSidebarVisible: setSidebarVisibleAsync } = await import('./storage-modern.js');
        return await setSidebarVisibleAsync(Val);
    }, Cb);
}

export function getTheme(Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getTheme: getThemeAsync } = await import('./storage-modern.js');
        return await getThemeAsync();
    }, Cb);
}

export function setTheme(Theme, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { setTheme: setThemeAsync } = await import('./storage-modern.js');
        return await setThemeAsync(Theme);
    }, Cb);
}

export function getCompact(Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getCompact: getCompactAsync } = await import('./storage-modern.js');
        return await getCompactAsync();
    }, Cb);
}

export function getTagFilter(Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getTagFilter: getTagFilterAsync } = await import('./storage-modern.js');
        return await getTagFilterAsync();
    }, Cb);
}

export function setTagFilter(Tags, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { setTagFilter: setTagFilterAsync } = await import('./storage-modern.js');
        return await setTagFilterAsync(Tags);
    }, Cb);
}

export function getNoteSearch(Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getNoteSearch: getNoteSearchAsync } = await import('./storage-modern.js');
        return await getNoteSearchAsync();
    }, Cb);
}

export function setNoteSearch(Val, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { setNoteSearch: setNoteSearchAsync } = await import('./storage-modern.js');
        return await setNoteSearchAsync(Val);
    }, Cb);
}

export function getPinnedGroups(Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getPinnedGroups: getPinnedGroupsAsync } = await import('./storage-modern.js');
        return await getPinnedGroupsAsync();
    }, Cb);
}

export function setPinnedGroups(Groups, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { setPinnedGroups: setPinnedGroupsAsync } = await import('./storage-modern.js');
        return await setPinnedGroupsAsync(Groups);
    }, Cb);
}

export function getLocked(Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getLocked: getLockedAsync } = await import('./storage-modern.js');
        return await getLockedAsync();
    }, Cb);
}

export function setLocked(Val, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { setLocked: setLockedAsync } = await import('./storage-modern.js');
        return await setLockedAsync(Val);
    }, Cb);
}

export function getDevLog(Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getDevLog: getDevLogAsync } = await import('./storage-modern.js');
        return await getDevLogAsync();
    }, Cb);
}

export function saveUndo(Url, Notes, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { setUndo: setUndoAsync } = await import('./storage-modern.js');
        return await setUndoAsync(Url, Notes);
    }, Cb);
}

export function getUndo(Url, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getUndo: getUndoAsync } = await import('./storage-modern.js');
        return await getUndoAsync(Url);
    }, Cb);
}

export function getAllNotes(Cb) {
    return wrapAsyncWithCallback(async () => {
        const { getAllNotes: getAllNotesAsync } = await import('./storage-modern.js');
        return await getAllNotesAsync();
    }, Cb);
}

export function setAllNotes(allNotes, Cb) {
    return wrapAsyncWithCallback(async () => {
        const { setAllNotes: setAllNotesAsync } = await import('./storage-modern.js');
        return await setAllNotesAsync(allNotes);
    }, Cb);
}

// Legacy promise-based functions
export function getLockedPromise() {
    return new Promise((resolve, reject) => {
        getLocked((err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

// Schema version constant
export const SCHEMA_VERSION = 2;
