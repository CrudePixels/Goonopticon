import { LogDev } from '../../log.js';
import { renderMainMenu } from './popup-main-menu.js';
import { getNotes, setNotes } from '../../sidebar/storage-new.js';
import browser from 'webextension-polyfill';

/**
 * Renders the import/export panel
 */
export function renderImportExport() {
    LogDev("Navigated to Import/Export panel", "interaction");
    LogDev("renderImportExport called", "render");
    const MenuContent = document.getElementById("menuContent");
    const MenuTitle = document.getElementById("menuTitle");
    if (!MenuContent || !MenuTitle) return;

    MenuTitle.textContent = "Import/Export";
    MenuContent.innerHTML = `
        <button class="podawful-btn" id="importBtn">Import Notes</button>
        <button class="podawful-btn" id="exportBtn">Export Notes</button>
        <input type="file" id="importFile" style="display:none" accept=".json"/>
        <div id="importExportStatus" style="margin-top:10px;"></div>
        <button class="podawful-btn" id="backBtn">Back</button>
    `;

    // Accessibility: Add aria-labels to all menu buttons
    const menuButtons = MenuContent.querySelectorAll('button');
    menuButtons.forEach(btn => {
        if (!btn.hasAttribute('aria-label')) {
            btn.setAttribute('aria-label', btn.textContent.trim());
        }
    });

    // Event listeners
    document.getElementById("importBtn")?.addEventListener("click", () => {
        LogDev("Import button clicked", "interaction");
        document.getElementById("importFile").click();
    });

    document.getElementById("exportBtn")?.addEventListener("click", () => {
        LogDev("Export button clicked", "interaction");
        exportNotes();
    });

    document.getElementById("backBtn")?.addEventListener("click", () => {
        LogDev("Back to Main Menu from Import/Export panel", "interaction");
        renderMainMenu();
    });

    document.getElementById("importFile")?.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            importNotes(e.target.files[0]);
        }
    });
}

// Export notes function
function exportNotes() {
    const StatusDiv = document.getElementById("importExportStatus");
    StatusDiv.textContent = "Exporting notes...";
    
    getNotes(location.href, (err, notes) => {
        if (err) {
            LogDev("Error getting notes for export: " + err, "error");
            StatusDiv.textContent = "Error exporting notes.";
            return;
        }
        
        if (!notes || notes.length === 0) {
            StatusDiv.textContent = "No notes to export.";
            return;
        }
        
        const dataStr = JSON.stringify(notes, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `podawful-notes-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        StatusDiv.textContent = "Notes exported successfully!";
    });
}

// Import notes function
function importNotes(file) {
    const StatusDiv = document.getElementById("importExportStatus");
    StatusDiv.textContent = "Importing notes...";
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedNotes = JSON.parse(e.target.result);
            if (Array.isArray(importedNotes)) {
                setNotes(location.href, importedNotes, (err) => {
                    if (err) {
                        LogDev("Error importing notes: " + err, "error");
                        StatusDiv.textContent = "Error importing notes.";
                    } else {
                        LogDev("Notes imported successfully", "system");
                        StatusDiv.textContent = "Notes imported successfully!";
                    }
                });
            } else {
                StatusDiv.textContent = "Invalid file format.";
            }
        } catch (err) {
            LogDev("Error parsing imported file: " + err, "error");
            StatusDiv.textContent = "Error parsing file.";
        }
    };
    reader.readAsText(file);
}
