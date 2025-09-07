# Release Process

This document explains how to create new releases of the Goonopticon extension.

## Automatic Releases

The extension uses GitHub Actions to automatically build and release new versions when you push version tags.

## Creating a New Release

### Method 1: Using the Release Script (Recommended)

1. **Run the release script**:
   ```bash
   npm run release
   ```

2. **Choose the release type**:
   - **Patch** (1): Bug fixes - v1.4.0 → v1.4.1
   - **Minor** (2): New features - v1.4.0 → v1.5.0
   - **Major** (3): Breaking changes - v1.4.0 → v2.0.0
   - **Custom** (4): Enter your own version

3. **The script will**:
   - Update `package.json` and `manifest.json`
   - Build the extension
   - Commit changes
   - Create and push a Git tag
   - Trigger GitHub Actions to build and release

### Method 2: Manual Process

1. **Update version numbers**:
   - Edit `package.json` version
   - Edit `manifest.json` version

2. **Build the extension**:
   ```bash
   npm run build
   ```

3. **Commit and tag**:
   ```bash
   git add package.json manifest.json
   git commit -m "Bump version to v1.5.0"
   git tag v1.5.0
   git push origin main
   git push origin v1.5.0
   ```

## What Happens Automatically

When you push a version tag (like `v1.5.0`):

1. **GitHub Actions triggers** the build workflow
2. **Extension gets built** with the new version
3. **Release is created** on GitHub with:
   - Release notes
   - Downloadable zip file
   - Version tag

## User Experience

- **Users get notified** when new versions are available
- **Update indicator** appears in the extension popup
- **One-click update** opens the GitHub release page
- **Automatic checks** happen daily in the background

## Release Notes

When creating releases, consider including:

- New features added
- Bug fixes
- Performance improvements
- Breaking changes (if any)
- Installation instructions

## Troubleshooting

- **Workflow fails**: Check the Actions tab in GitHub
- **Version conflicts**: Ensure version numbers match in both files
- **Build errors**: Run `npm run build` locally first
- **Tag issues**: Make sure you're pushing to the correct branch

## Files Updated During Release

- `package.json` - Version number
- `manifest.json` - Extension version
- `JS/bundle/` - Built JavaScript files
- `CSS/` - Compiled stylesheets
- `Resources/` - Extension assets
