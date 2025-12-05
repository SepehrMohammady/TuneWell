#!/usr/bin/env node
/**
 * TuneWell Version Sync Script
 * 
 * This script synchronizes the version across all configuration files:
 * - package.json
 * - app.json
 * - android/app/build.gradle
 * - ios/TuneWell/Info.plist
 * 
 * Usage: node scripts/sync-version.js [major|minor|patch|build]
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Current version - single source of truth
const VERSION = {
  major: 0,
  minor: 1,
  patch: 0,
  build: 22,
};

const versionString = `${VERSION.major}.${VERSION.minor}.${VERSION.patch}`;

function updatePackageJson() {
  const packagePath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.version = versionString;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ Updated package.json to version ${versionString}`);
}

function updatePackageLockJson() {
  const lockPath = path.join(ROOT_DIR, 'package-lock.json');
  if (!fs.existsSync(lockPath)) {
    console.log('⚠ package-lock.json not found, skipping');
    return;
  }
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.version = versionString;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = versionString;
  }
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  console.log(`✓ Updated package-lock.json to version ${versionString}`);
}

function updateAppJson() {
  const appJsonPath = path.join(ROOT_DIR, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  appJson.version = versionString;
  appJson.buildNumber = VERSION.build;
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  console.log(`✓ Updated app.json to version ${versionString} (build ${VERSION.build})`);
}

function updateAndroidBuildGradle() {
  const gradlePath = path.join(ROOT_DIR, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(gradlePath)) {
    console.log('⚠ android/app/build.gradle not found, skipping');
    return;
  }
  
  let content = fs.readFileSync(gradlePath, 'utf8');
  
  // Update versionCode
  content = content.replace(
    /versionCode\s+\d+/,
    `versionCode ${VERSION.build}`
  );
  
  // Update versionName
  content = content.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${versionString}"`
  );
  
  fs.writeFileSync(gradlePath, content);
  console.log(`✓ Updated android/app/build.gradle to version ${versionString} (code ${VERSION.build})`);
}

function updateIosPlist() {
  const plistPath = path.join(ROOT_DIR, 'ios', 'TuneWell', 'Info.plist');
  if (!fs.existsSync(plistPath)) {
    console.log('⚠ ios/TuneWell/Info.plist not found, skipping');
    return;
  }
  
  let content = fs.readFileSync(plistPath, 'utf8');
  
  // Update CFBundleShortVersionString
  content = content.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${versionString}$2`
  );
  
  // Update CFBundleVersion
  content = content.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${VERSION.build}$2`
  );
  
  fs.writeFileSync(plistPath, content);
  console.log(`✓ Updated ios/TuneWell/Info.plist to version ${versionString} (build ${VERSION.build})`);
}

function updateVersionConfig() {
  const configPath = path.join(ROOT_DIR, 'src', 'config', 'version.config.ts');
  if (!fs.existsSync(configPath)) {
    console.log('⚠ src/config/version.config.ts not found, skipping');
    return;
  }
  
  let content = fs.readFileSync(configPath, 'utf8');
  
  content = content.replace(
    /const VERSION_MAJOR = \d+;/,
    `const VERSION_MAJOR = ${VERSION.major};`
  );
  content = content.replace(
    /const VERSION_MINOR = \d+;/,
    `const VERSION_MINOR = ${VERSION.minor};`
  );
  content = content.replace(
    /const VERSION_PATCH = \d+;/,
    `const VERSION_PATCH = ${VERSION.patch};`
  );
  content = content.replace(
    /const BUILD_NUMBER = \d+;/,
    `const BUILD_NUMBER = ${VERSION.build};`
  );
  
  const today = new Date().toISOString().split('T')[0];
  content = content.replace(
    /const RELEASE_DATE = '[^']+';/,
    `const RELEASE_DATE = '${today}';`
  );
  
  fs.writeFileSync(configPath, content);
  console.log(`✓ Updated src/config/version.config.ts to version ${versionString}`);
}

function bumpVersion(type) {
  switch (type) {
    case 'major':
      VERSION.major++;
      VERSION.minor = 0;
      VERSION.patch = 0;
      VERSION.build++;
      break;
    case 'minor':
      VERSION.minor++;
      VERSION.patch = 0;
      VERSION.build++;
      break;
    case 'patch':
      VERSION.patch++;
      VERSION.build++;
      break;
    case 'build':
      VERSION.build++;
      break;
    default:
      // No bump, just sync
      break;
  }
}

function main() {
  const args = process.argv.slice(2);
  const bumpType = args[0];
  
  console.log('\n🎵 TuneWell Version Sync\n');
  
  if (bumpType) {
    console.log(`Bumping ${bumpType} version...`);
    bumpVersion(bumpType);
  }
  
  console.log(`Syncing version ${versionString} (build ${VERSION.build})...\n`);
  
  updatePackageJson();
  updatePackageLockJson();
  updateAppJson();
  updateVersionConfig();
  updateAndroidBuildGradle();
  updateIosPlist();
  
  console.log(`\n✅ All files synced to version ${versionString}\n`);
}

main();
