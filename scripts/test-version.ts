import * as fs from 'fs';
import * as path from 'path';

interface VersionData {
    version: string;
}

interface PackageData {
    version: string;
    packages?: {
        ''?: {
            version: string;
        };
    };
}

interface AppData {
    expo?: {
        version: string;
    };
    version?: string;
}

function readJsonFile(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function testVersionSync(): boolean {
    const rootDir = path.join(__dirname, '..');

    // Read all version files
    const versionData: VersionData = readJsonFile(path.join(rootDir, 'version.json'));
    const packageData: PackageData = readJsonFile(path.join(rootDir, 'package.json'));
    const appData: AppData = readJsonFile(path.join(rootDir, 'app.json'));

    const versionJsonVersion = versionData.version;
    const packageJsonVersion = packageData.version;
    const appJsonVersion = appData.expo?.version || appData.version;

    console.log('Version Check:');
    console.log(`  version.json:     ${versionJsonVersion}`);
    console.log(`  package.json:     ${packageJsonVersion}`);
    console.log(`  app.json:         ${appJsonVersion}`);

    // Check package-lock.json if it exists
    const lockPath = path.join(rootDir, 'package-lock.json');
    if (fs.existsSync(lockPath)) {
        const lockData: PackageData = readJsonFile(lockPath);
        const lockVersion = lockData.version;
        console.log(`  package-lock.json: ${lockVersion}`);

        if (lockVersion !== versionJsonVersion) {
            console.error('\n✗ FAIL: package-lock.json version does not match version.json');
            return false;
        }
    }

    // Check if all versions match
    if (
        versionJsonVersion === packageJsonVersion &&
        versionJsonVersion === appJsonVersion
    ) {
        console.log('\n✓ PASS: All versions are synchronized');
        return true;
    } else {
        console.error('\n✗ FAIL: Versions are not synchronized');
        return false;
    }
}

const success = testVersionSync();
process.exit(success ? 0 : 1);
