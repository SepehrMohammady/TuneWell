#!/usr/bin/env node
/**
 * TuneWell Version Sync Script
 * 
 * This script reads the version from src/config/version.config.ts (the single source of truth)
 * and synchronizes it across all configuration files:
 * - package.json
 * - package-lock.json
 * - app.json
 * - android/app/build.gradle
 * - ios/TuneWell/Info.plist
 * 
 * Usage: 
 *   node scripts/sync-version.js           - Sync current version to all files
 *   node scripts/sync-version.js bump      - Bump patch version and sync
 *   node scripts/sync-version.js major     - Bump major version and sync
 *   node scripts/sync-version.js minor     - Bump minor version and sync
 *   node scripts/sync-version.js patch     - Bump patch version and sync
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const VERSION_CONFIG_PATH = path.join(ROOT_DIR, 'src', 'config', 'version.config.ts');

/**
 * Read version from version.config.ts
 */
function readVersionFromConfig() {
  if (!fs.existsSync(VERSION_CONFIG_PATH)) {
    console.error('❌ src/config/version.config.ts not found!');
    process.exit(1);
  }
  
  const content = fs.readFileSync(VERSION_CONFIG_PATH, 'utf8');
  
  const majorMatch = content.match(/const VERSION_MAJOR = (\d+);/);
  const minorMatch = content.match(/const VERSION_MINOR = (\d+);/);
  const patchMatch = content.match(/const VERSION_PATCH = (\d+);/);
  const buildMatch = content.match(/const BUILD_NUMBER = (\d+);/);
  
  if (!majorMatch || !minorMatch || !patchMatch || !buildMatch) {
    console.error('❌ Could not parse version from version.config.ts');
    process.exit(1);
  }
  
  return {
    major: parseInt(majorMatch[1], 10),
    minor: parseInt(minorMatch[1], 10),
    patch: parseInt(patchMatch[1], 10),
    build: parseInt(buildMatch[1], 10),
  };
}

/**
 * Write version to version.config.ts
 */
function writeVersionToConfig(version) {
  let content = fs.readFileSync(VERSION_CONFIG_PATH, 'utf8');
  
  content = content.replace(
    /const VERSION_MAJOR = \d+;/,
    `const VERSION_MAJOR = ${version.major};`
  );
  content = content.replace(
    /const VERSION_MINOR = \d+;/,
    `const VERSION_MINOR = ${version.minor};`
  );
  content = content.replace(
    /const VERSION_PATCH = \d+;/,
    `const VERSION_PATCH = ${version.patch};`
  );
  content = content.replace(
    /const BUILD_NUMBER = \d+;/,
    `const BUILD_NUMBER = ${version.build};`
  );
  
  const today = new Date().toISOString().split('T')[0];
  content = content.replace(
    /const RELEASE_DATE = '[^']+';/,
    `const RELEASE_DATE = '${today}';`
  );
  
  fs.writeFileSync(VERSION_CONFIG_PATH, content);
}

function updatePackageJson(versionString) {
  const packagePath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.version = versionString;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ Updated package.json to version ${versionString}`);
}

function updatePackageLockJson(versionString) {
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

function updateAppJson(versionString, buildNumber) {
  const appJsonPath = path.join(ROOT_DIR, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  appJson.version = versionString;
  appJson.buildNumber = buildNumber;
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  console.log(`✓ Updated app.json to version ${versionString} (build ${buildNumber})`);
}

function updateAndroidBuildGradle(versionString, buildNumber) {
  const gradlePath = path.join(ROOT_DIR, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(gradlePath)) {
    console.log('⚠ android/app/build.gradle not found, skipping');
    return;
  }
  
  let content = fs.readFileSync(gradlePath, 'utf8');
  
  // Update versionCode
  content = content.replace(
    /versionCode\s+\d+/,
    `versionCode ${buildNumber}`
  );
  
  // Update versionName
  content = content.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${versionString}"`
  );
  
  fs.writeFileSync(gradlePath, content);
  console.log(`✓ Updated android/app/build.gradle to version ${versionString} (code ${buildNumber})`);
}

function updateIosPlist(versionString, buildNumber) {
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
    `$1${buildNumber}$2`
  );
  
  fs.writeFileSync(plistPath, content);
  console.log(`✓ Updated ios/TuneWell/Info.plist to version ${versionString} (build ${buildNumber})`);
}

function bumpVersion(version, type) {
  const newVersion = { ...version };
  
  switch (type) {
    case 'major':
      newVersion.major++;
      newVersion.minor = 0;
      newVersion.patch = 0;
      newVersion.build++;
      break;
    case 'minor':
      newVersion.minor++;
      newVersion.patch = 0;
      newVersion.build++;
      break;
    case 'patch':
    case 'bump':
      newVersion.patch++;
      newVersion.build++;
      break;
    case 'build':
      newVersion.build++;
      break;
    default:
      // No bump, just sync
      break;
  }
  
  return newVersion;
}

function main() {
  const args = process.argv.slice(2);
  const bumpType = args[0];
  
  console.log('\n🎵 TuneWell Version Sync\n');
  console.log('Reading version from src/config/version.config.ts...\n');
  
  let version = readVersionFromConfig();
  
  if (bumpType && ['major', 'minor', 'patch', 'bump', 'build'].includes(bumpType)) {
    console.log(`Bumping ${bumpType} version...`);
    version = bumpVersion(version, bumpType);
    writeVersionToConfig(version);
    console.log(`✓ Updated src/config/version.config.ts\n`);
  }
  
  const versionString = `${version.major}.${version.minor}.${version.patch}`;
  
  console.log(`Syncing version ${versionString} (build ${version.build}) to all files...\n`);
  
  updatePackageJson(versionString);
  updatePackageLockJson(versionString);
  updateAppJson(versionString, version.build);
  updateAndroidBuildGradle(versionString, version.build);
  updateIosPlist(versionString, version.build);
  
  console.log(`\n✅ All files synced to version ${versionString} (build ${version.build})`);
  console.log('\n📋 Files updated:');
  console.log('   - src/config/version.config.ts (source of truth)');
  console.log('   - package.json');
  console.log('   - package-lock.json');
  console.log('   - app.json');
  console.log('   - android/app/build.gradle');
  console.log('   - ios/TuneWell/Info.plist (if exists)');
  console.log('');
}

main();
