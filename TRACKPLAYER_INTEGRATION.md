# TrackPlayer Integration - TuneWell v0.0.7

## Overview
This document describes the migration from expo-av to react-native-track-player for professional audio processing with native equalizer support.

## Changes Made

### 1. Package Installation
- **Installed**: `react-native-track-player` - Professional audio playback library with native EQ support
- **Status**: Will replace expo-av (which lacks EQ and audio effects capabilities)

### 2. Core Audio Service (`src/services/audioService.ts`)
Created a wrapper service for TrackPlayer with the following functions:
```typescript
- setupPlayer(): Initialize TrackPlayer with capabilities (play, pause, skip, seek)
- playTrack(track): Load and play an audio track
- pauseTrack(): Pause playback
- skipToNext(): Skip to next track in queue
- skipToPrevious(): Skip to previous track
- seekTo(position): Seek to specific position in track
```

### 3. Background Service (`service.js`)
Implemented background service for audio playback with remote controls:
- Play/Pause from lock screen
- Next/Previous track
- Seek control
- Stop command
- Handles headphone button controls

### 4. Player Screen Migration (`src/screens/PlayerScreen.tsx`)
**Before**: Used expo-av Audio.Sound
**After**: Uses TrackPlayer with hooks
- `useProgress()`: Real-time playback position
- `usePlaybackState()`: Playback state (playing, paused, stopped, etc.)
- Removed expo-av dependencies
- Integrated TrackPlayer initialization
- Added EQ settings logging (placeholder for native implementation)

### 5. Android Configuration

#### AndroidManifest.xml
Added permissions for background audio:
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
```

Added service declaration:
```xml
<service 
  android:name="com.doublesymmetry.trackplayer.service.MusicService" 
  android:foregroundServiceType="mediaPlayback" 
  android:exported="false">
  <intent-filter>
    <action android:name="androidx.media3.session.MediaSessionService"/>
  </intent-filter>
</service>
```

#### app.json
- Updated version to 0.0.7
- Added foreground service permissions

### 6. Entry Point (`index.ts`)
Registered the playback service at app initialization:
```typescript
TrackPlayer.registerPlaybackService(() => require('./service'));
```

## Next Steps

### 1. Build with EAS Build (REQUIRED)
TrackPlayer requires native compilation. Local Windows builds fail due to path length issues.

**Command to build**:
```bash
eas build --profile preview --platform android
```

This will:
- Compile native modules in the cloud
- Link TrackPlayer's native Android code
- Create a production-ready APK with audio capabilities

### 2. Native EQ Implementation (TODO)
Currently, EQ settings are logged but not applied. Need to implement native bridge:

**Android**: Use AudioEffect API
```kotlin
// In native Android module
val equalizer = Equalizer(0, audioSessionId)
equalizer.enabled = true
equalizer.setBandLevel(band, gain)
```

**iOS**: Use AVAudioUnitEQ
```swift
// In native iOS module  
let eq = AVAudioUnitEQ(numberOfBands: 10)
eq.bands[band].gain = gain
eq.bands[band].frequency = frequency
```

### 3. Test on Real Device
After EAS Build completes:
1. Download APK from EAS dashboard
2. Install on Android device
3. Test audio playback
4. Test EQ controls (verify logs show settings)
5. Test background playback
6. Test lock screen controls

### 4. Full EQ Implementation
Once basic playback works:
1. Create native module bridge for Android AudioEffect
2. Connect EQ sliders to native audio processor
3. Test frequency bands (32Hz - 16kHz)
4. Verify gain changes (-12dB to +12dB)
5. Test EQ presets (Rock, Pop, Classical, etc.)

## Technical Details

### TrackPlayer Capabilities
The player is configured with:
- Play/Pause
- Skip Forward/Backward
- Seek
- Remote controls (lock screen, notification, headphones)

### Audio Formats Supported
- FLAC (lossless)
- WAV (lossless)
- MP3 (lossy)
- AAC/M4A (lossy)
- OGG (lossy)

### Native Modules Required
- `react-native-track-player`: Audio playback
- Custom native module (future): Direct EQ control via AudioEffect/AVAudioUnitEQ

## Professional Audio Features (Roadmap)

### Phase 1: Basic Professional Playback ✅
- [x] Install TrackPlayer
- [x] Migrate from expo-av
- [x] Background audio service
- [x] Lock screen controls

### Phase 2: Native EQ Implementation 🔄
- [ ] Create native Android module
- [ ] Implement AudioEffect integration
- [ ] Connect EQ context to native code
- [ ] Test 10-band equalizer

### Phase 3: Advanced Features 📋
- [ ] Audio session management
- [ ] DAC detection and optimization
- [ ] Sample rate switching
- [ ] Bit-perfect playback mode
- [ ] Gapless playback
- [ ] Audio buffer optimization
- [ ] Professional audio routing

## Build Instructions

### Development Build
```bash
# Generate native code
npx expo prebuild --clean

# Start dev server
npm start

# Note: expo-dev-client required for native modules
```

### Production Build (Cloud)
```bash
# Preview APK (recommended)
eas build --profile preview --platform android

# Production release
eas build --profile production --platform android
```

## Known Issues

1. **Local Windows builds fail**: Use EAS Build cloud service instead
2. **EQ not yet functional**: Requires native module implementation
3. **expo-av still in dependencies**: Will be removed once TrackPlayer fully tested

## Version History

- **v0.0.7**: TrackPlayer integration, native audio foundation
- **v0.0.6**: Settings screen, themes, UI fixes
- **v0.0.5**: Playlist management, favorites, recently added
- **v0.0.4**: EQ interface (UI only)
- **v0.0.3**: Folder browser, file selection
- **v0.0.2**: Basic playback with expo-av
- **v0.0.1**: Initial project setup
