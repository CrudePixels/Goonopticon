# Goonopticon - Pod Awful Timestamps

A powerful browser extension for timestamping YouTube videos with advanced group, tag, and note management capabilities. Built for the PodAwful and the cult.

## Features

### Core Functionality
- **📝 Timestamped Notes**: Create detailed notes at specific video timestamps
- **🏷️ Advanced Tagging**: Organize content with a comprehensive tag system
- **📁 Group Management**: Organize notes into logical groups for better content management
- **🔍 Search & Filter**: Find notes quickly with real-time search and tag filtering
- **📊 Bulk Actions**: Efficiently manage multiple notes and groups with bulk operations

### User Experience
- **🎨 Multiple Themes**: Choose from Default, Light, Dark, and Compact themes
- **⌨️ Customizable Hotkeys**: Set up keyboard shortcuts for quick actions
- **↩️ Undo/Redo**: Safe editing with comprehensive undo/redo functionality
- **♿ Accessibility**: Full ARIA support and keyboard navigation

### Data Management
- **📤 Import/Export**: Support for JSON, CSV, and Markdown formats
- **🔄 Cross-Browser Sync**: Works seamlessly across Chrome, Firefox, and Edge
- **💾 Robust Storage**: Schema versioning and migration for data integrity
- **🛡️ Error Recovery**: User-friendly error handling and recovery mechanisms

### Developer Features
- **📋 Dev Logging**: Comprehensive logging system with filtering and export
- **🔧 Debug Tools**: Access detailed debugging information
- **📈 Performance**: Optimized for smooth performance on all devices

## Installation

### Development Setup
1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd Goonopticon-Refactor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   # For development (auto-rebuilds on changes)
   npm run dev
   
   # For production
   npm run build
   ```

### Browser Installation

#### Chrome/Edge
1. Open `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the project root directory
4. The extension will appear in your browser toolbar

#### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on" and select the `manifest.json` file
3. The extension will be available for the current session

## Usage

### Getting Started
1. Navigate to any YouTube video page
2. Click the Goonopticon extension icon in your browser toolbar
3. Use "Show Sidebar" to toggle the timestamping interface
4. Start creating timestamped notes!

### Creating Notes
- Use the video player controls or hotkeys to navigate to desired timestamps
- Click "Add Note" or use the configured hotkey
- Enter your note text and optionally add tags
- Organize notes into groups for better management

### Managing Content
- **Tags**: Use the tag manager to create, edit, and organize tags
- **Groups**: Create groups to organize related notes
- **Bulk Actions**: Select multiple items for efficient management
- **Search**: Use the search bar to find specific notes quickly
- **Filter**: Filter notes by tags or groups

### Import/Export
- **Export**: Save your notes in JSON, CSV, or Markdown format
- **Import**: Restore notes from previously exported files
- **Backup**: Regularly export your data for safekeeping

## Credits

Created by Henchman CrudePixels.
