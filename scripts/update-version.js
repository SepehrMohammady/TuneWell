/**
 * Centralized Version Update Script
 * Keeps package.json, app.json, and other version-dependent files in sync
 * 
 * Usage: node scripts/update-version.js <new-version>
 * Example: node scripts/update-version.js 0.0.2
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// Files to update
const FILES_TO_UPDATE = {
  PACKAGE_JSON: path.join(ROOT_DIR, 'package.json'),
  APP_JSON: path.join(ROOT_DIR, 'app.json'),
  IOS_PROJECT: path.join(ROOT_DIR, 'ios', 'TuneWell', 'Info.plist'),
  ANDROID_GRADLE: path.join(ROOT_DIR, 'android', 'app', 'build.gradle'),
};

function validateVersion(version) {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(version)) {
    throw new Error(
      'Invalid version format. Use semantic versioning: MAJOR.MINOR.PATCH (e.g., 0.0.1)'
    );
  }
  return version;
}

function updatePackageJson(version) {
  const packagePath = FILES_TO_UPDATE.PACKAGE_JSON;
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageData.version = version;
  fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
  console.log(`✓ Updated package.json to version ${version}`);
}

function updateAppJson(version) {
  const appPath = FILES_TO_UPDATE.APP_JSON;
  const appData = JSON.parse(fs.readFileSync(appPath, 'utf8'));
  appData.version = version;
  fs.writeFileSync(appPath, JSON.stringify(appData, null, 2) + '\n');
  console.log(`✓ Updated app.json to version ${version}`);
}

function updateInfoPlist(version) {
  const plistPath = FILES_TO_UPDATE.IOS_PROJECT;
  if (!fs.existsSync(plistPath)) {
    console.log('⚠ iOS Info.plist not found, skipping...');
    return;
  }

  let plistContent = fs.readFileSync(plistPath, 'utf8');
  const versionParts = version.split('.');
  const buildNumber = `${versionParts[0]}${versionParts[1].padStart(2, '0')}${versionParts[2].padStart(2, '0')}`;

  // Update CFBundleShortVersionString
  plistContent = plistContent.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*/,
    `$1${version}`
  );

  // Update CFBundleVersion
  plistContent = plistContent.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*/,
    `$1${buildNumber}`
  );

  fs.writeFileSync(plistPath, plistContent);
  console.log(`✓ Updated iOS Info.plist to version ${version} (build ${buildNumber})`);
}

function updateAndroidGradle(version) {
  const gradlePath = FILES_TO_UPDATE.ANDROID_GRADLE;
  if (!fs.existsSync(gradlePath)) {
    console.log('⚠ Android build.gradle not found, skipping...');
    return;
  }

  let gradleContent = fs.readFileSync(gradlePath, 'utf8');
  const versionParts = version.split('.').map(Number);
  const versionCode = versionParts[0] * 10000 + versionParts[1] * 100 + versionParts[2];

  // Update versionCode
  gradleContent = gradleContent.replace(
    /versionCode\s+\d+/,
    `versionCode ${versionCode}`
  );

  // Update versionName
  gradleContent = gradleContent.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${version}"`
  );

  fs.writeFileSync(gradlePath, gradleContent);
  console.log(`✓ Updated Android build.gradle to version ${version} (versionCode ${versionCode})`);
}

function getCurrentVersion() {
  const packagePath = FILES_TO_UPDATE.PACKAGE_JSON;
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageData.version;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    const currentVersion = getCurrentVersion();
    console.log(`Current version: ${currentVersion}`);
    console.log('\nUsage: node scripts/update-version.js <new-version>');
    console.log('Example: node scripts/update-version.js 0.0.2');
    process.exit(0);
  }

  const newVersion = args[0];

  try {
    validateVersion(newVersion);
    const currentVersion = getCurrentVersion();

    console.log(`\nUpdating TuneWell version from ${currentVersion} to ${newVersion}\n`);

    updatePackageJson(newVersion);
    updateAppJson(newVersion);
    updateInfoPlist(newVersion);
    updateAndroidGradle(newVersion);

    console.log(`\n✓ Successfully updated all version files to ${newVersion}`);
    console.log('\nNext steps:');
    console.log('1. Review the changes');
    console.log('2. Run: npm install (to update package-lock.json)');
    console.log('3. Test the build');
    console.log('4. Commit the changes when ready');
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
