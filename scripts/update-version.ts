import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

type VersionType = 'major' | 'minor' | 'patch';

interface VersionData {
    version: string;
}

function readVersion(): string {
    const versionPath = path.join(__dirname, '..', 'version.json');
    const versionData: VersionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    return versionData.version;
}

function writeVersion(version: string): void {
    const versionPath = path.join(__dirname, '..', 'version.json');
    fs.writeFileSync(versionPath, JSON.stringify({ version }, null, 2) + '\n');
}

function incrementVersion(version: string, type: VersionType): string {
    const parts = version.split('.').map(Number);

    switch (type) {
        case 'major':
            parts[0]++;
            parts[1] = 0;
            parts[2] = 0;
            break;
        case 'minor':
            parts[1]++;
            parts[2] = 0;
            break;
        case 'patch':
            parts[2]++;
            break;
    }

    return parts.join('.');
}

function updatePackageJson(version: string): void {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageData.version = version;
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
}

function updatePackageLockJson(version: string): void {
    const lockPath = path.join(__dirname, '..', 'package-lock.json');

    if (fs.existsSync(lockPath)) {
        const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        lockData.version = version;

        // Update the root package version
        if (lockData.packages && lockData.packages['']) {
            lockData.packages[''].version = version;
        }

        fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2) + '\n');
    }
}

function updateAppJson(version: string): void {
    const appPath = path.join(__dirname, '..', 'app.json');
    const appData = JSON.parse(fs.readFileSync(appPath, 'utf8'));

    if (appData.expo) {
        appData.expo.version = version;
    } else {
        appData.version = version;
    }

    fs.writeFileSync(appPath, JSON.stringify(appData, null, 2) + '\n');
}

function main() {
    const versionType = (process.argv[2] || 'patch') as VersionType;

    if (!['major', 'minor', 'patch'].includes(versionType)) {
        console.error('Invalid version type. Use: major, minor, or patch');
        process.exit(1);
    }

    const currentVersion = readVersion();
    const newVersion = incrementVersion(currentVersion, versionType);

    console.log(`Updating version from ${currentVersion} to ${newVersion}...`);

    // Update all version files
    writeVersion(newVersion);
    updatePackageJson(newVersion);
    updatePackageLockJson(newVersion);
    updateAppJson(newVersion);

    console.log('✓ version.json updated');
    console.log('✓ package.json updated');
    console.log('✓ package-lock.json updated');
    console.log('✓ app.json updated');

    // Git commit and tag
    try {
        execSync('git add version.json package.json package-lock.json app.json', { stdio: 'inherit' });
        execSync(`git commit -m "Bump version to ${newVersion}"`, { stdio: 'inherit' });
        execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
        console.log(`✓ Git commit and tag v${newVersion} created`);
    } catch (error) {
        console.error('Git operations failed. Please commit manually.');
    }

    console.log(`\nVersion successfully updated to ${newVersion}!`);
}

main();
