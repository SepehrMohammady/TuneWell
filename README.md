# TuneWell

A minimal design, expert functionality cross-platform music player built with React Native and TypeScript.

![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Windows-brightgreen.svg)

## Features

- ✨ **Minimal, Clean UI** - Dark theme with focus on your music
- 🎵 **Gapless Playback** - Seamless transitions between tracks
- 📱 **Cross-Platform** - Works on Android, iOS, and Windows
- 🔄 **Queue Management** - Full control over your playback queue
- 🎨 **Metadata Support** - Displays artist, album, artwork, and more
- 📻 **Background Playback** - Music continues when app is minimized
- 🎯 **Expert Controls** - Shuffle, repeat modes, seeking, volume control

## Prerequisites

- **Node.js** (v18 or later)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- For Android: Android Studio with Android SDK
- For iOS: Xcode (macOS only)
- For Windows: Visual Studio with "Universal Windows Platform development" and "Desktop development with C++" workloads

## Installation

1. Clone the repository:
```bash
git clone https://github.com/SepehrMohammady/TuneWell.git
cd TuneWell
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) For Windows desktop support:
```bash
npm run init-windows
```

## Development

### Running on Android/iOS

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios
```

### Running on Windows Desktop

```bash
npm run windows
```

## Building

### Android APK

```bash
# Using Expo EAS Build
eas build --platform android

# Or using Expo build service
expo build:android
```

### iOS IPA

```bash
eas build --platform ios
```

### Windows Desktop

```bash
cd windows
msbuild TuneWell.sln /p:Configuration=Release
```

## Version Management

TuneWell uses a centralized version management system that keeps all version numbers synchronized across `package.json`, `package-lock.json`, and `app.json`.

### Updating Version

```bash
# Increment patch version (0.0.1 -> 0.0.2)
npm run version:patch

# Increment minor version (0.0.1 -> 0.1.0)
npm run version:minor

# Increment major version (0.0.1 -> 1.0.0)
npm run version:major
```

### Testing Version Sync

```bash
npm run test:version
```

This will verify that all version files are synchronized.

## Project Structure

```
TuneWell/
├── assets/              # App icons, splash screens, logos
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── NowPlayingBar.tsx
│   │   ├── PlayerControls.tsx
│   │   └── TrackItem.tsx
│   ├── screens/         # App screens
│   │   ├── MainScreen.tsx
│   │   └── LibraryScreen.tsx
│   ├── services/        # Business logic services
│   │   ├── AudioService.ts
│   │   └── FileSystemService.ts
│   ├── store/           # State management (Zustand)
│   │   ├── PlayerStore.ts
│   │   └── LibraryStore.ts
│   ├── styles/          # Theme and styling
│   │   └── theme.ts
│   └── types/           # TypeScript type definitions
│       └── index.ts
├── scripts/             # Build and utility scripts
│   ├── update-version.ts
│   └── test-version.ts
├── App.tsx              # Main app component
├── index.js             # Entry point
├── package.json         # Dependencies and scripts
├── app.json             # Expo configuration
├── tsconfig.json        # TypeScript configuration
└── version.json         # Centralized version source of truth
```

## Technology Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Development and build toolchain
- **TypeScript** - Type-safe development
- **react-native-track-player** - Audio playback with gapless support
- **Zustand** - Lightweight state management
- **Expo Media Library** - Access to device music files
- **React Native Windows** - Windows desktop support

## Permissions

TuneWell requires the following permissions:

### Android
- `READ_EXTERNAL_STORAGE` - Access music files
- `READ_MEDIA_AUDIO` - Read audio files (Android 13+)
- `FOREGROUND_SERVICE` - Background playback
- `WAKE_LOCK` - Keep device awake during playback

### iOS
- `NSAppleMusicUsageDescription` - Access to music library

## Features Breakdown

### Gapless Playback
Powered by `react-native-track-player`, TuneWell provides true gapless playback by pre-buffering the next track in the queue.

### Background Playback
Music continues playing when the app is minimized, and you can control playback from lock screen and notification controls.

### Queue Management
- Add single or multiple tracks to queue
- Reorder tracks
- Remove tracks from queue
- Shuffle mode
- Repeat modes (off, one track, all tracks)

### Minimal UI Design
- Dark theme focused on music
- Clean typography
- Smooth animations
- Distraction-free interface

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

- **Developer**: Sepehr Mohammady
- **Email**: SMohammady@outlook.com
- **GitHub**: [@SepehrMohammady](https://github.com/SepehrMohammady)
- **Expo Project**: [TuneWell on Expo](https://expo.dev/accounts/sepehrmohammady/projects/tunewell)

## Acknowledgments

- [react-native-track-player](https://github.com/doublesymmetry/react-native-track-player) for excellent audio playback
- [Expo](https://expo.dev) for amazing development experience
- All contributors and users of TuneWell

---

Made with ♥ by Sepehr Mohammady
