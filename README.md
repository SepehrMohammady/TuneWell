# TuneWell

<div align="center">

![TuneWell Logo](assets/logo.png)

**Professional Audiophile Music Player**

A minimal design but expert functionality music player for iOS and Android, built for audiophiles and music enthusiasts who demand the highest quality audio playback.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/SepehrMohammady/TuneWell)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.73-blue.svg)](https://reactnative.dev/)

</div>

## 🎵 Features

### Audio Playback
- **High-Fidelity Audio Engine**: Native audio processing with react-native-track-player
- **Professional Format Support**: FLAC, DSF/DFF (DSD), WAV, ALAC, APE, WV, MP3, AAC, OGG, OPUS
- **Bit-Perfect Output**: Optional bypass of all DSP for pure signal path
- **Gapless Playback**: Seamless transitions between tracks
- **Background Playback**: Continuous playback even when app is in background

### DSP & Equalization
- **10-Band Parametric EQ**: Professional-grade equalizer with customizable bands
- **EQ Presets**: Flat, Bass Boost, Treble Boost, Vocal Boost, and more
- **Custom Presets**: Create, save, and share your own EQ settings
- **DSP Effects**: Bass boost, virtualizer, and spatial audio

### Hardware Support
- **External DAC Support**: USB and Bluetooth DAC compatibility
- **Exclusive Mode** (Android): Direct hardware access for minimal latency
- **Sample Rate Control**: Configure output sample rate (44.1kHz, 48kHz, 88.2kHz, 96kHz, 192kHz)
- **Bit Depth Selection**: 16-bit, 24-bit, 32-bit output options

### Library Management
- **Folder-Based Organization**: Scan and organize music by folders
- **Smart Sorting**: Sort by folder name, file name, date added, artist, album, title, duration, play count
- **Rich Metadata**: Full ID3, Vorbis comment, and FLAC metadata support
- **Album Artwork**: Display embedded and external artwork

### Playlists
- **Favorites**: Quick access to your favorite tracks
- **Most Played**: Auto-generated based on play count
- **Recently Added**: Latest additions to your library
- **Mood Playlists**: Sad, Energetic, Relaxation, Focus, Workout, Sleep, Party, Chill
- **Custom Playlists**: Create unlimited personalized playlists

### User Interface
- **Minimal Design**: Clean, distraction-free interface focused on music
- **Dark Theme**: Easy on the eyes during extended listening sessions
- **Responsive Controls**: Smooth animations and gesture support
- **Now Playing Screen**: Large album artwork and intuitive playback controls

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **React Native CLI**: `npm install -g react-native-cli`
- **Xcode**: Latest version (for iOS development)
- **Android Studio**: Latest version (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SepehrMohammady/TuneWell.git
   cd TuneWell
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **iOS Setup**
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Android Setup**
   - Open Android Studio
   - Import the `android` folder
   - Sync Gradle files

### Running the App

#### iOS
```bash
npm run ios
```

#### Android
```bash
npm run android
```

#### Development Server
```bash
npm start
```

## 📱 Supported Platforms

- **iOS**: 13.0+
- **Android**: 6.0+ (API level 23+)

## 🎼 Supported Audio Formats

| Format | Extension | Bit Depth | Sample Rate | Notes |
|--------|-----------|-----------|-------------|-------|
| FLAC | .flac | 16/24/32-bit | Up to 384kHz | Lossless compression |
| DSD | .dsf, .dff | 1-bit | 2.8MHz, 5.6MHz, 11.2MHz | Direct Stream Digital |
| WAV | .wav | 16/24/32-bit | Up to 384kHz | Uncompressed PCM |
| ALAC | .m4a | 16/24-bit | Up to 384kHz | Apple Lossless |
| APE | .ape | 16/24-bit | Up to 384kHz | Monkey's Audio |
| WavPack | .wv | 16/24/32-bit | Up to 384kHz | Lossless/Hybrid |
| MP3 | .mp3 | N/A | Up to 48kHz | Lossy compression |
| AAC | .aac, .m4a | N/A | Up to 48kHz | Advanced Audio Coding |
| OGG Vorbis | .ogg | N/A | Up to 48kHz | Open-source lossy |
| OPUS | .opus | N/A | Up to 48kHz | Modern codec |

## 🔧 Configuration

### Version Management

TuneWell uses a centralized version management system to keep all version numbers in sync.

```bash
# Update version across all files (package.json, app.json, iOS, Android)
npm run version:update 0.0.2
```

This will update:
- `package.json` - version field
- `app.json` - version field
- `ios/TuneWell/Info.plist` - CFBundleShortVersionString and CFBundleVersion
- `android/app/build.gradle` - versionName and versionCode

### Audio Settings

Configure audio output in the Settings screen:
- **Sample Rate**: Match your DAC's capabilities
- **Bit Depth**: Higher bit depth for better dynamic range
- **Exclusive Mode**: Enable for Android exclusive audio access
- **Bit-Perfect**: Bypass all processing for purist playback

## 🏗️ Architecture

TuneWell is built with a focus on performance, modularity, and maintainability.

### Technology Stack
- **Framework**: React Native 0.73
- **Language**: TypeScript
- **Navigation**: React Navigation 6
- **State Management**: Zustand
- **Database**: SQLite (react-native-sqlite-storage)
- **Audio Engine**: react-native-track-player
- **Icons**: react-native-vector-icons

### Project Structure
```
TuneWell/
├── android/              # Android native code
├── ios/                  # iOS native code
├── src/
│   ├── components/       # Reusable UI components
│   ├── navigation/       # Navigation configuration
│   ├── screens/          # Screen components
│   ├── services/         # Business logic services
│   │   ├── audio/        # Audio playback services
│   │   └── database/     # Database operations
│   ├── store/            # State management
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── native/           # Native module bridges
├── scripts/              # Build and utility scripts
└── assets/               # Static assets

```

### Native Modules

For optimal audio quality, TuneWell uses native modules:
- **iOS**: AVAudioEngine, AVAudioUnitEQ, Core Audio
- **Android**: Oboe, AAudio, ExoPlayer

## 🛠️ Development

### Code Style

TuneWell follows strict TypeScript and React Native best practices:
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety

```bash
# Lint code
npm run lint

# Format code (automatically applied via Prettier)
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 📦 Building for Production

### iOS

1. Open `ios/TuneWell.xcworkspace` in Xcode
2. Select your development team
3. Archive the build (Product > Archive)
4. Distribute to App Store or TestFlight

### Android

```bash
cd android
./gradlew assembleRelease
```

APK will be generated in `android/app/build/outputs/apk/release/`

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Sepehr Mohammady**
- Email: SMohammady@outlook.com
- GitHub: [@SepehrMohammady](https://github.com/SepehrMohammady)

## 🙏 Acknowledgments

- Inspired by audiophile players like Symfonium and Flacbox
- Built with [React Native](https://reactnative.dev/)
- Audio playback powered by [react-native-track-player](https://github.com/doublesymmetry/react-native-track-player)

## 📮 Support

For bug reports, feature requests, or questions:
- Open an issue on [GitHub](https://github.com/SepehrMohammady/TuneWell/issues)
- Email: SMohammady@outlook.com

---

<div align="center">

**Made with ❤️ for audiophiles and music lovers**

</div>
