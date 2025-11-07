# Changelog

All notable changes to TuneWell will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Complete native audio module implementation
- FLAC and DSD file format support
- Functional library scanning
- Playlist management
- Full EQ implementation

## [0.0.1] - 2025-11-07

### Added
- Initial project setup and structure
- React Native 0.73 with TypeScript configuration
- Navigation system (React Navigation)
- Screen layouts:
  - Library screen with sorting options
  - Playlists screen with smart and mood playlists
  - Player screen with playback controls
  - EQ screen with 10-band visualization
  - Settings screen with audio configuration
  - Folder browser screen
- Database schema (SQLite):
  - Tracks table with comprehensive metadata
  - Playlists table with type and mood support
  - Playlist-tracks junction table
  - Folders table for library organization
  - EQ presets table with default presets
- Audio service foundation:
  - TrackPlayer initialization
  - Background playback service setup
  - Playback event handlers
- Type definitions:
  - Track, Playlist, Folder, EQPreset interfaces
  - Audio format enums
  - Playback state types
  - Sort options and directions
- Utility functions:
  - Permission handling for iOS and Android
  - Storage access for scoped storage (Android 13+)
- Version management system:
  - Centralized version update script
  - Sync across package.json, app.json, iOS, Android
- Documentation:
  - Comprehensive README with feature list
  - Installation guide
  - Contributing guidelines
  - Native modules specification
  - Development roadmap
  - MIT License
- Configuration files:
  - TypeScript configuration with path aliases
  - Babel configuration with module resolver
  - ESLint and Prettier setup
  - Metro bundler configuration
  - Git ignore rules

### Development Setup
- npm scripts for iOS, Android, testing
- Git repository initialization
- GitHub remote configuration
- Project structure with organized directories

### UI/UX
- Dark theme design system
- Minimal, audiophile-focused interface
- Spotify-inspired color scheme (#1DB954 accent)
- Tab navigation with icons
- Stack navigation for detail screens

### Notes
- This is the initial scaffolding release
- UI is static and non-functional
- Database is initialized but not populated
- Audio playback is not yet implemented
- Native modules are documented but not implemented

---

## Version History

### Version Numbering

TuneWell follows semantic versioning (SemVer):

- **MAJOR** version: Incompatible API changes or major feature overhauls
- **MINOR** version: New functionality in a backwards-compatible manner
- **PATCH** version: Backwards-compatible bug fixes

### Update Instructions

To update your version:

```bash
npm run version:update <new-version>
npm install
```

Example:
```bash
npm run version:update 0.0.2
npm install
```

This will update:
- package.json
- app.json
- iOS Info.plist (CFBundleShortVersionString and CFBundleVersion)
- Android build.gradle (versionName and versionCode)

### Release Process

1. Update version: `npm run version:update X.Y.Z`
2. Update CHANGELOG.md with changes
3. Test thoroughly on iOS and Android
4. Commit changes
5. Create git tag: `git tag vX.Y.Z`
6. Push to GitHub: `git push origin main --tags`
7. Create GitHub release with changelog
8. Build production releases

---

[Unreleased]: https://github.com/SepehrMohammady/TuneWell/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/SepehrMohammady/TuneWell/releases/tag/v0.0.1
