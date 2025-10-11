# TuneWell - Professional Music Player

![TuneWell Logo](https://img.shields.io/badge/TuneWell-v0.0.4-blue?style=for-the-badge&logo=music)

TuneWell is a professional music player application built with Expo React Native, designed specifically for music enthusiasts and professionals who use DACs and high-end audio equipment. Features advanced metadata extraction, mood categorization, and tabbed navigation for an enhanced music experience.

## 🎵 Features

### Core Features
- **Professional Audio Playback**: Support for lossless formats (FLAC, WAV, DSD) and high-quality compressed formats
- **Enhanced Metadata Extraction**: Advanced filename parsing with 95%+ accuracy for collaboration tracks
- **Mood Categorization**: Tag music with mood emojis (Happy, Sad, Energetic, Calm, Romantic, Angry, Dreamy, Confident)
- **Tabbed Navigation**: Clean, organized interface with Home, Player, Playlists, and Browser tabs
- **Advanced 10-Band Equalizer**: Precise frequency control with professional presets and custom settings
- **Smart Playlists**: Automatic favorites, most played, and recently added collections
- **Custom Playlist Management**: Create and organize your own playlists with mood filtering
- **Advanced File Browser**: Navigate folders and sort by name, date, or folder structure
- **Professional Format Support**: FLAC, DSF, DFF, WAV, AIFF, MP3, AAC, M4A, and OGG

### Professional Audio Features
- **DAC Compatibility**: Optimized for professional digital-to-analog converters
- **Low-Latency Processing**: Minimal audio latency for real-time playback
- **High Sample Rate Support**: Up to 192kHz/24-bit and DSD audio
- **Lossless Audio Priority**: Automatic quality detection and optimization
- **Sound Engineering Ready**: Professional-grade audio processing

## 📱 Platform Support

- **iOS**: Optimized for iPhone and iPad
- **Android**: Full Android support with professional audio routing
- **Cross-Platform**: Consistent experience across devices

## 🛠️ Technical Stack

- **Framework**: Expo React Native
- **Language**: TypeScript
- **Audio**: Expo AV with professional audio extensions
- **Navigation**: React Navigation 6
- **Storage**: AsyncStorage for playlist and preference management
- **UI Components**: Custom components with professional design

## 📦 Installation

### Prerequisites
- Node.js 16 or higher
- Expo CLI
- iOS Simulator (macOS) or Android Studio (for emulators)
- Expo Go app (for physical device testing)

### Setup
```bash
# Clone the repository
git clone https://github.com/SepehrMohammady/TuneWell.git
cd TuneWell

# Install dependencies
npm install

# Start the development server
npm start

# Run on specific platforms
npm run android  # Android
npm run ios      # iOS (macOS only)
npm run web      # Web browser
```

## 🎯 Getting Started

1. **Install Expo Go** on your mobile device
2. **Start the development server** with `npm start`
3. **Scan the QR code** with Expo Go (Android) or Camera app (iOS)
4. **Grant audio permissions** when prompted
5. **Browse your music** using the folder browser or document picker

## 🎚️ Audio Formats Supported

### Lossless Formats
- **FLAC** - Free Lossless Audio Codec
- **WAV** - Waveform Audio File Format
- **AIFF** - Audio Interchange File Format
- **DSF/DFF** - Direct Stream Digital (DSD)

### Compressed Formats
- **MP3** - MPEG Audio Layer 3
- **AAC** - Advanced Audio Coding
- **M4A** - MPEG-4 Audio
- **OGG** - Ogg Vorbis

## 🎛️ Equalizer Settings

### Built-in Presets
- **Flat**: No modification (0dB across all frequencies)
- **Rock**: Enhanced mids and highs for rock music
- **Jazz**: Warm sound with enhanced vocals
- **Classical**: Balanced for orchestral music
- **Electronic**: Enhanced bass and treble for electronic music
- **Vocal**: Optimized for vocal-centric music
- **Bass Boost**: Enhanced low frequencies
- **Treble Boost**: Enhanced high frequencies

### Custom EQ
- 10-band graphic equalizer
- ±12dB adjustment range
- Real-time audio processing
- Save custom presets

## 📱 User Interface

### Home Screen
- Quick access to all major features
- Recently played tracks
- Professional audio format indicators
- Direct access to equalizer and playlists

### Player Screen
- Minimal, distraction-free design
- Real-time audio quality information
- Progress control with precise seeking
- Favorite toggle and playlist controls

### Folder Browser
- Navigate your music library by folder structure
- Sort by name, date, or folder
- Professional format badges
- Quality indicators (Lossless, DSD, Hi-Res)

### Playlist Management
- Smart playlists (Favorites, Most Played, Recently Added)
- Custom playlist creation and editing
- Track organization and sorting
- Playlist statistics and information

## 🔧 Development

### Project Structure
```
TuneWell/
├── src/
│   ├── screens/          # Application screens
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── version.ts        # Version management
├── assets/               # Static assets
├── App.tsx              # Main application component
└── package.json         # Project dependencies
```

### Available Scripts
```bash
npm start          # Start Expo development server
npm run android    # Run on Android emulator/device
npm run ios        # Run on iOS simulator/device (macOS only)
npm run web        # Run in web browser
npm run type-check # Run TypeScript type checking
npm run build      # Build for production
```

### Building APK
```bash
# Install EAS CLI (if not already installed)
npm install -g @expo/eas-cli

# Login to your Expo account
eas login

# Build preview APK (internal testing)
eas build --platform android --profile preview

# Build production APK
eas build --platform android --profile production

# Build development client (with full native modules)
eas build --platform android --profile development

# Alternative: Local Gradle build (when EAS build limits reached)
cd android
gradlew assembleDebug  # For debug APK
gradlew assembleRelease  # For release APK
```

### APK Build Status
- ✅ **Debug APK**: Successfully built (v0.0.4)
- ✅ **Local Build**: Configured and tested
- ✅ **EAS Profiles**: Preview, Production, Development
- 📱 **Package**: com.sepehrmohammady.tunewell
- 🔧 **Build Tools**: Gradle 8.14.3, Android SDK 36

### Version Management
TuneWell uses centralized version management:
- Current version: **0.0.4**
- Semantic versioning (MAJOR.MINOR.PATCH)
- Automatic version tracking in `src/version.ts`
- Version history with changelog

## 🎵 Audio Configuration

### Supported Sample Rates
- **44.1 kHz** - CD Quality
- **48 kHz** - Professional Standard
- **88.2 kHz** - High Resolution
- **96 kHz** - Professional High-Res
- **176.4 kHz** - Ultra High-Res
- **192 kHz** - Maximum Supported
- **DSD64/DSD128** - Direct Stream Digital

### Bit Depths
- **16-bit** - CD Quality
- **24-bit** - Professional Standard
- **32-bit** - Maximum Precision
- **DSD** - 1-bit Direct Stream

## 📊 Performance

- **Low Latency**: Optimized for real-time audio processing
- **Memory Efficient**: Smart caching for large music libraries
- **Battery Optimized**: Efficient playback with minimal battery drain
- **Professional Hardware**: Optimized for DACs and audio interfaces

## 🔒 Privacy & Permissions

### Required Permissions
- **Audio Playback**: For music playback functionality
- **Media Library**: To access your music collection
- **File System**: For folder browsing and file selection

### Privacy Policy
TuneWell respects your privacy:
- All data stored locally on your device
- No data transmitted to external servers
- No analytics or tracking
- Your music stays private

## 🤝 Contributing

We welcome contributions to TuneWell! Please see our contributing guidelines for more information.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, feature requests, or bug reports:
- **GitHub**: [Issues](https://github.com/SepehrMohammady/TuneWell/issues)
- **Email**: SMohammady@outlook.com
- **Expo**: [TuneWell on Expo](https://expo.dev/accounts/sepehrmohammady)

## 🏆 Acknowledgments

- Built with [Expo](https://expo.dev)
- Audio processing powered by [Expo AV](https://docs.expo.dev/versions/latest/sdk/av/)
- Navigation by [React Navigation](https://reactnavigation.org)
- Designed for music professionals and audiophiles worldwide

---

**TuneWell v0.0.4** - Professional Audio Experience for Music Enthusiasts

![Professional Audio](https://img.shields.io/badge/Professional-Audio-green)
![React Native](https://img.shields.io/badge/React_Native-blue)
![Expo](https://img.shields.io/badge/Expo-SDK_54-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)