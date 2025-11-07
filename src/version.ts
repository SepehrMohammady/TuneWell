/**
 * Centralized version management for TuneWell
 * This file should be updated whenever the app version changes
 */

export const APP_VERSION = {
  major: 0,
  minor: 0,
  patch: 7,
  get full(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  get build(): string {
    return `${this.full}-${new Date().toISOString().split('T')[0]}`;
  }
};

export const VERSION_HISTORY = [
  {
    version: '0.0.6',
    date: '2025-11-06',
    changes: [
      'Cleaned up project structure - removed unnecessary files',
      'Removed kotlin/, dist/, .idea/ folders',
      'Removed backup and test files',
      'Updated .gitignore with IDE and backup patterns',
      'Made copilot-instructions.md local only (not tracked in git)',
      'Cleaned Android build intermediates while preserving APK output',
      'Project structure now cleaner and production-ready'
    ]
  },
  {
    version: '0.0.5',
    date: '2025-11-06',
    changes: [
      'Fixed favorite button visual feedback - heart icon now turns red',
      'Implemented Previous/Next track navigation with playlist support',
      'Fixed Recently Added to show actual recent files (not most played)',
      'Added Settings screen with theme selection (Light/Dark/Auto)',
      'Added library scan settings (scan all storage, auto-scan options)',
      'Added clear library function in settings',
      'Fixed favorite state persistence and immediate UI updates',
      'Added Settings tab to bottom navigation',
      'Improved track metadata with modification time tracking',
      'Added auto-advance to next track on playback completion',
      'Documented EQ limitations (requires native audio processing)',
      'Updated UPDATES.md with comprehensive changelog'
    ]
  },
  {
    version: '0.0.4',
    date: '2025-10-12',
    changes: [
      'Successfully built first Android APK (debug build)',
      'Configured EAS Build profiles for APK generation',
      'Removed problematic react-native-track-player dependency',
      'Fixed Android build configuration and SDK setup',
      'Added local.properties for Android SDK location',
      'Increased Gradle memory allocation (4GB heap, 1GB metaspace)',
      'Updated Android package configuration (com.sepehrmohammady.tunewell)',
      'Added comprehensive APK build instructions to README',
      'Version management and GitHub synchronization'
    ]
  },
  {
    version: '0.0.3',
    date: '2025-10-11',
    changes: [
      'Redesigned Home screen with tabbed navigation',
      'Removed Test Metadata functionality',
      'Added mood categorization system with 8 mood types',
      'Implemented mood selector in Now Playing screen',
      'Added mood chips display for tagged tracks',
      'Created bottom tab navigation with Home, Player, Playlists, Browse, Equalizer',
      'Simplified Home screen with clean stats and recent tracks',
      'Enhanced PlayerScreen with emoji mood selection',
      'Added mood filtering and categorization for future playlist features',
      'Consolidated documentation to single README.md'
    ]
  },
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