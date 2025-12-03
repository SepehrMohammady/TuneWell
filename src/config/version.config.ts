/**
 * TuneWell Centralized Version Configuration
 * 
 * This file serves as the single source of truth for the application version.
 * All version references throughout the app should derive from this configuration.
 * 
 * Version format: MAJOR.MINOR.PATCH (Semantic Versioning)
 * - MAJOR: Breaking changes, major feature releases
 * - MINOR: New features, backward-compatible changes
 * - PATCH: Bug fixes, minor improvements
 */

export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  buildNumber: number;
  versionString: string;
  fullVersion: string;
  releaseDate: string;
  codename: string;
}

// Version components - UPDATE THESE VALUES FOR VERSION CHANGES
const VERSION_MAJOR = 0;
const VERSION_MINOR = 0;
const VERSION_PATCH = 7;
const BUILD_NUMBER = 7;

// Version metadata
const RELEASE_DATE = '2025-12-03';
const CODENAME = 'Overture';

// Computed version strings
const VERSION_STRING = `${VERSION_MAJOR}.${VERSION_MINOR}.${VERSION_PATCH}`;
const FULL_VERSION = `${VERSION_STRING} (${BUILD_NUMBER})`;

export const VERSION: VersionInfo = {
  major: VERSION_MAJOR,
  minor: VERSION_MINOR,
  patch: VERSION_PATCH,
  buildNumber: BUILD_NUMBER,
  versionString: VERSION_STRING,
  fullVersion: FULL_VERSION,
  releaseDate: RELEASE_DATE,
  codename: CODENAME,
};

/**
 * Version history for changelog purposes
 */
export const VERSION_HISTORY: Array<{
  version: string;
  date: string;
  changes: string[];
}> = [
  {
    version: '0.0.1',
    date: '2025-12-03',
    changes: [
      'Initial project setup',
      'Core architecture implementation',
      'Audio playback foundation',
      'Database schema design',
      'Navigation structure',
    ],
  },
];

/**
 * App metadata
 */
export const APP_INFO = {
  name: 'TuneWell',
  displayName: 'TuneWell',
  description: 'Professional audiophile music player with high-resolution audio support',
  author: 'SMohammady@outlook.com',
  repository: 'https://github.com/SepehrMohammady/TuneWell',
  license: 'MIT',
  supportedPlatforms: ['iOS', 'Android'] as const,
  minAndroidSdk: 24,
  minIosVersion: '14.0',
};

export default VERSION;
