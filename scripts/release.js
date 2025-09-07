#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read current version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;

console.log(`Current version: ${currentVersion}`);

// Parse version number
const versionParts = currentVersion.split('.').map(Number);
const [major, minor, patch] = versionParts;

// Ask user what type of release
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\nWhat type of release?');
console.log('1. Patch (bug fixes) - v' + major + '.' + minor + '.' + (patch + 1));
console.log('2. Minor (new features) - v' + major + '.' + (minor + 1) + '.0');
console.log('3. Major (breaking changes) - v' + (major + 1) + '.0.0');
console.log('4. Custom version');

rl.question('Enter choice (1-4): ', (choice) => {
  let newVersion;
  
  switch(choice) {
    case '1':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    case '2':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case '3':
      newVersion = `${major + 1}.0.0`;
      break;
    case '4':
      rl.question('Enter custom version (e.g., 1.5.0): ', (customVersion) => {
        newVersion = customVersion;
        createRelease(newVersion);
      });
      return;
    default:
      console.log('Invalid choice');
      rl.close();
      return;
  }
  
  createRelease(newVersion);
});

function createRelease(newVersion) {
  console.log(`\nCreating release v${newVersion}...`);
  
  try {
    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('✓ Updated package.json');
    
    // Update manifest.json
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    manifest.version = newVersion;
    fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
    console.log('✓ Updated manifest.json');
    
    // Build the extension
    console.log('Building extension...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✓ Extension built');
    
    // Commit changes
    execSync(`git add package.json manifest.json`, { stdio: 'inherit' });
    execSync(`git commit -m "Bump version to v${newVersion}"`, { stdio: 'inherit' });
    console.log('✓ Changes committed');
    
    // Create and push tag
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    execSync(`git push origin v${newVersion}`, { stdio: 'inherit' });
    console.log('✓ Tag created and pushed');
    
    console.log(`\n🎉 Release v${newVersion} created successfully!`);
    console.log('GitHub Actions will now build and publish the release automatically.');
    console.log(`Check: https://github.com/CrudePixels/Goonopticon/releases`);
    
  } catch (error) {
    console.error('Error creating release:', error.message);
  }
  
  rl.close();
}
