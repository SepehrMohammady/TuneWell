<p align="center">
  <img src="assets/logo.png" alt="TuneWell Logo" width="200" />
</p>

<h1 align="center">TuneWell</h1>

<p align="center">
  <strong>Engineering-Ready Music Player</strong>
</p>

<p align="center">
  A professional audiophile music player for Android, built with React Native.<br/>
  Designed for sound engineers, audiophiles, and music enthusiasts who demand the best audio quality.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.5-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/platform-Android-green.svg" alt="Platform" />
  <img src="https://img.shields.io/badge/React%20Native-0.82.1-61dafb.svg" alt="React Native" />
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License" />
</p>

---

## 🎵 Overview

**TuneWell** is a professional-grade music player designed for audiophiles and sound engineers. It supports high-resolution audio formats and provides advanced audio processing capabilities, making it the perfect companion for critical listening sessions.

### Key Features

- **🎛️ 10-Band Parametric Equalizer** - Fine-tune your audio with professional-grade EQ controls and customizable presets
- **📀 High-Resolution Audio Support** - Native playback of FLAC, DSD (DFF/DSF), WAV, and other lossless formats
- **🔊 USB DAC Ready** - External audio device support for the highest quality output
- **📋 Smart Playlists** - Favorites, most played, recently added, and mood-based playlists
- **🎨 Minimal Design** - Clean, distraction-free interface focused on the listening experience
- **⏭️ Gapless Playback** - Seamless transitions between tracks for uninterrupted listening
- **🔄 Background Playback** - Keep the music playing with full lock screen and notification controls

## 🎧 Supported Audio Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| FLAC | `.flac` | Free Lossless Audio Codec |
| DSD | `.dff`, `.dsf` | Direct Stream Digital |
| WAV | `.wav` | Waveform Audio |
| AIFF | `.aiff`, `.aif` | Audio Interchange File Format |
| ALAC | `.m4a` | Apple Lossless Audio Codec |
| MP3 | `.mp3` | MPEG Audio Layer III |
| AAC | `.aac`, `.m4a` | Advanced Audio Coding |
| OGG | `.ogg` | Ogg Vorbis |
| OPUS | `.opus` | Opus Interactive Audio Codec |
| WMA | `.wma` | Windows Media Audio |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- React Native CLI
- Android Studio with SDK 24+
- JDK 17+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SepehrMohammady/TuneWell.git
   cd TuneWell
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start Metro bundler**
   ```bash
   npm start
   ```

4. **Build and run on Android**
   ```bash
   npm run android
   ```

### Building Release APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be available at `android/app/build/outputs/apk/release/app-release.apk`

## 📱 Screenshots

*Coming soon*

## 🏗️ Architecture

TuneWell is built with a modern tech stack:

- **React Native 0.82** - Cross-platform mobile framework
- **TypeScript** - Type-safe JavaScript
- **Zustand** - Lightweight state management with MMKV persistence
- **React Navigation 6** - Native navigation
- **react-native-track-player** - Background audio playback
- **WatermelonDB** - High-performance SQLite database

### Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── common/       # Buttons, sliders, cards
│   └── player/       # Mini player, EQ visualizer
├── config/           # App configuration and constants
├── database/         # WatermelonDB schema and models
├── hooks/            # Custom React hooks
├── navigation/       # React Navigation setup
├── screens/          # App screens
├── services/         # Audio, metadata, and scanner services
├── store/            # Zustand state stores
├── theme/            # Colors, typography, spacing
├── types/            # TypeScript type definitions
└── utils/            # Helper utilities
```

## 🎛️ EQ Presets

TuneWell includes professionally tuned EQ presets:

- **Flat** - Neutral response
- **Bass Boost** - Enhanced low frequencies
- **Treble Boost** - Enhanced high frequencies
- **Vocal** - Optimized for vocals
- **Rock** - Classic rock sound
- **Pop** - Modern pop sound
- **Jazz** - Warm jazz tones
- **Classical** - Concert hall clarity
- **Electronic** - Deep bass and crisp highs
- **Acoustic** - Natural instrument tones

## 🧠 Neuro-Mood Playlists

Organize your music by neuropsychology-based mood categories:

| Mood | Brain System | Best For |
|------|-------------|----------|
| 😊 Happy/Joyful | Dopamine/Reward System | Mood boosting, driving, parties |
| 😢 Sad/Melancholic | Amygdala/Emotional Processing | Grieving, rainy days, reflection |
| ⚡ Energetic/Pumped | Sympathetic Nervous System | Gym, running, waking up |
| 🧘 Calm/Relaxed | Parasympathetic System | Meditation, sleeping, anxiety relief |
| 🎯 Focus/Flow | Prefrontal Cortex | Deep work, coding, studying |
| 🔥 Angry/Intense | Fight Response | Heavy lifting, venting, gaming |
| 💜 Romantic/Loving | Oxytocin/Bonding | Date night, intimate moments |
| ☁️ Dreamy/Ethereal | Default Mode Network | Daydreaming, creative thinking |
| 📷 Nostalgic/Retro | Hippocampus/Memory | Reminiscing, connecting with past |

*Select up to 3 moods per track with detailed science info for each category.*

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 🙏 Acknowledgments

- [react-native-track-player](https://github.com/doublesymmetry/react-native-track-player) for audio playback
- [WatermelonDB](https://github.com/Nozbe/WatermelonDB) for database management
- [Zustand](https://github.com/pmndrs/zustand) for state management

---

<p align="center">
  Made with ❤️ for audiophiles
</p>
