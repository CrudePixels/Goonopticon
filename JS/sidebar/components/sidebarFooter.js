// Sidebar Footer Component
import { LogDev } from '../../log.js';
import quotesRaw from '../../../Resources/Quotes.txt';

/**
 * Renders the sidebar footer.
 * @param {Object} props - Footer properties and handlers.
 * @returns {HTMLElement} The sidebar footer DOM element.
 */
export function renderSidebarFooter(props) {
    const {
        onAddNote,
        onClearAll,
        onAddGroup,
        onAddTimestamp,
        onLockToggle,
        locked,
        groups,
        stats
    } = props;

    try {
        const footer = document.createElement('div');
        footer.className = 'sidebar__footer';
        footer.style.display = 'flex';
        footer.style.flexDirection = 'column';
        footer.style.height = '100%';
        footer.style.position = 'relative';

        // --- Main Action Buttons ---
        const actionsContainer = document.createElement('div');
        actionsContainer.style.display = 'flex';
        actionsContainer.style.flexDirection = 'column';
        actionsContainer.style.gap = '8px';
        actionsContainer.style.margin = '0 0 12px 0';
        actionsContainer.style.alignItems = 'center';
        actionsContainer.style.width = '100%';

        // + Group button
        const groupBtn = document.createElement('button');
        groupBtn.className = 'sidebar__action-btn';
        groupBtn.textContent = '+ Group';
        groupBtn.style.width = '90%';
        groupBtn.style.maxWidth = '280px';
        groupBtn.onclick = () => { if (typeof onAddGroup === 'function') onAddGroup(); };
        actionsContainer.appendChild(groupBtn);

        // + Note button (combined)
        const noteBtn = document.createElement('button');
        noteBtn.className = 'sidebar__action-btn';
        noteBtn.textContent = '+ Note';
        noteBtn.style.width = '90%';
        noteBtn.style.maxWidth = '280px';
        noteBtn.onclick = async () => {
            if (typeof window.showConfirmModal === 'function') {
                const isTimestamp = await window.showConfirmModal({
                    title: 'Add Note',
                    message: 'Do you want to add a timestamp to this note?',
                    okText: 'Add Timestamp',
                    cancelText: 'Just Note',
                    okButtonStyle: 'background:var(--accent, #FFD600);color:var(--button-fg, #111);border-color:var(--accent, #FFD600);',
                    cancelButtonStyle: 'background:var(--accent, #FFD600);color:var(--button-fg, #111);border-color:var(--accent, #FFD600);'
                });
                if (isTimestamp && typeof onAddTimestamp === 'function') {
                    onAddTimestamp();
                } else if (!isTimestamp && typeof onAddNote === 'function') {
                    onAddNote();
                }
            } else {
                // Fallback for when modal is not available
                if (typeof onAddNote === 'function') onAddNote();
            }
        };
        actionsContainer.appendChild(noteBtn);

        // Lock/Unlock button
        const lockBtn = document.createElement('button');
        lockBtn.className = 'sidebar__action-btn';
        lockBtn.textContent = locked ? 'Unlock' : 'Lock';
        lockBtn.style.width = '90%';
        lockBtn.style.maxWidth = '280px';
        lockBtn.onclick = () => { if (typeof onLockToggle === 'function') onLockToggle(); };
        actionsContainer.appendChild(lockBtn);

        footer.appendChild(actionsContainer);

        // --- Divider ---
        const divider = document.createElement('div');
        divider.className = 'sidebar-divider';
        footer.appendChild(divider);

        // Stats display
        if (stats) {
            const statsDiv = document.createElement('div');
            statsDiv.className = 'sidebar__stats';
            statsDiv.textContent = stats;
            footer.appendChild(statsDiv);
        }

        // Website selection button with random quote as text - ABSOLUTE POSITIONED AT BOTTOM
        const quotes = quotesRaw.split('\n').map(q => q.trim()).filter(Boolean);
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        const websiteButton = document.createElement('button');
        websiteButton.className = 'sidebar__podawful-link';
        websiteButton.textContent = randomQuote;
        websiteButton.title = 'Choose Website';
        // Let CSS handle positioning and styling
        websiteButton.style.textAlign = 'center';
        websiteButton.style.padding = '10px 16px';
        websiteButton.style.color = 'var(--accent, #FFD600)';
        websiteButton.style.fontSize = '1.1em';
        websiteButton.style.fontWeight = '600';
        websiteButton.style.borderRadius = '8px';
        websiteButton.style.backgroundColor = 'rgba(255,214,0,0.08)';
        websiteButton.style.border = '1.5px solid var(--accent, #FFD600)';
        websiteButton.style.userSelect = 'text';
        websiteButton.style.textDecoration = 'none';
        websiteButton.style.transition = 'all 0.2s ease';
        websiteButton.style.cursor = 'pointer';
        websiteButton.style.width = '100%';
        websiteButton.addEventListener('mouseenter', () => {
            websiteButton.style.backgroundColor = 'var(--accent, #FFD600)';
            websiteButton.style.color = 'var(--sidebar-bg, #1a1a1a)';
        });
        websiteButton.addEventListener('mouseleave', () => {
            websiteButton.style.backgroundColor = 'rgba(255,214,0,0.08)';
            websiteButton.style.color = 'var(--accent, #FFD600)';
        });
        
        // Add click handler to show website selection modal
        websiteButton.onclick = async () => {
            if (typeof window.showTwoChoiceModal === 'function') {
                const choice = await window.showTwoChoiceModal({
                    title: 'Choose Website',
                    message: 'Which website would you like to visit?',
                    option1: '🌐 Visit Podawful.com',
                    option2: '⚡ Visit Awful.tech'
                });
                
                if (choice === '🌐 Visit Podawful.com') {
                    window.open('https://podawful.com', '_blank', 'noopener,noreferrer');
                } else if (choice === '⚡ Visit Awful.tech') {
                    window.open('https://awful.tech', '_blank', 'noopener,noreferrer');
                }
                // If choice is 'Cancel' or null, do nothing
            } else {
                // Fallback: open podawful.com directly
                window.open('https://podawful.com', '_blank', 'noopener,noreferrer');
            }
        };
        
        footer.appendChild(websiteButton);

        return footer;
    } catch (e) {
        LogDev('renderSidebarFooter error: ' + e, 'error');
        const errorDiv = document.createElement('div');
        errorDiv.textContent = 'Footer failed to render';
        errorDiv.style.color = 'var(--error, #c00)';
        return errorDiv;
    }
}