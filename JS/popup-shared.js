// Version: 1.0.0

import { LogDev } from './log.js';

export function OpenSubMenu(Panel)
{
    window.location.href = `extensionMenu.html?panel=${encodeURIComponent(Panel.toLowerCase())}`;
}