// Version: 2.0.0 - Modernized storage layer

// Re-export from migration layer for backward compatibility
export * from '../storage/storage-migration.js';

// Additional legacy functions that need to be maintained
import { LogDev } from '../log.js';
import { normalizeYouTubeUrl } from '../utils.js';

/**
 * Legacy function for getting notes with URL normalization
 * @param {string} Url - The URL to get notes for
 * @param {Function} Cb - Callback function
 */
export function GetNotes(Url, Cb) {
    LogDev("GetNotes called for URL: " + Url, "data");
    const normalizedUrl = normalizeYouTubeUrl(Url);
    LogDev("Normalized URL: " + normalizedUrl, "data");
    
    // Use the modern storage layer
    getNotes(normalizedUrl, Cb);
}
