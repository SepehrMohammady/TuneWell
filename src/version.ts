/**
 * Centralized version management for TuneWell
 * This file should be updated whenever the app version changes
 */

export const APP_VERSION = {
  major: 0,
  minor: 0,
  patch: 2,
  get full(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  get build(): string {
    return `${this.full}-${new Date().toISOString().split('T')[0]}`;
  }
};

export const VERSION_HISTORY = [
  {
    version: '0.0.2',
    date: '2025-10-11',
    changes: [
      'Enhanced metadata extraction system',
      'Advanced filename pattern matching for collaborations',
      'Support for "Artist1, Artist2 - Title" format',
      'Comprehensive quality information extraction',
      'Jacob\'s Note specific implementation',
      'MX Player-level metadata accuracy',
      'Multi-source extraction with fallbacks',
      'Console logging for debugging metadata',
      'Realistic demo tracks with proper metadata',
      'Test suite for collaboration formats'
    ]
  },
  {
    version: '0.0.1',
    date: '2025-10-11',
    changes: [
      'Initial project setup with Expo TypeScript template',
      'Basic project structure for professional music player',
      'Centralized version management system',
      'Initial dependencies for audio playback and UI'
    ]
  }
];

export const updateVersion = (type: 'patch' | 'minor' | 'major') => {
  switch (type) {
    case 'patch':
      APP_VERSION.patch += 1;
      break;
    case 'minor':
      APP_VERSION.minor += 1;
      APP_VERSION.patch = 0;
      break;
    case 'major':
      APP_VERSION.major += 1;
      APP_VERSION.minor = 0;
      APP_VERSION.patch = 0;
      break;
  }
};