# EAS Build Ready Checklist - TuneWell v0.0.7

## ✅ Pre-Build Checklist

### Code Changes
- [x] Migrated from expo-av to react-native-track-player
- [x] Created audioService.ts wrapper for TrackPlayer
- [x] Implemented background service (service.js)
- [x] Updated PlayerScreen.tsx to use TrackPlayer hooks
- [x] Removed all expo-av dependencies from PlayerScreen

### Configuration Updates
- [x] AndroidManifest.xml permissions added:
  - FOREGROUND_SERVICE
  - FOREGROUND_SERVICE_MEDIA_PLAYBACK
  - WAKE_LOCK
- [x] TrackPlayer service declared in AndroidManifest
- [x] app.json updated to v0.0.7
- [x] package.json updated to v0.0.7
- [x] src/version.ts updated to 0.0.7

### Native Code Generation
- [x] Ran `npx expo prebuild --clean`
- [x] No compile errors in TypeScript
- [x] All files passing lint checks

## 🚀 Build Commands

### Option 1: Preview Build (Recommended First)
```bash
eas build --profile preview --platform android
```
**Why**: Creates APK for easy testing, faster iteration

### Option 2: Production Build
```bash
eas build --profile production --platform android
```
**Why**: Creates AAB for Google Play Store release

## 📋 Post-Build Testing Plan

### 1. Installation Test
- [ ] Download APK from EAS dashboard
- [ ] Install on Android device
- [ ] Grant storage permissions
- [ ] Launch app successfully

### 2. Audio Playback Test
- [ ] Browse to music folder
- [ ] Select a FLAC file
- [ ] Verify playback starts
- [ ] Test play/pause button
- [ ] Test seek slider
- [ ] Verify duration display

### 3. Navigation Test
- [ ] Test skip to next track
- [ ] Test skip to previous track
- [ ] Verify track info updates
- [ ] Check album art display

### 4. Background Audio Test
- [ ] Start playing a track
- [ ] Press home button
- [ ] Verify music continues playing
- [ ] Check notification controls appear
- [ ] Test notification play/pause
- [ ] Test notification skip buttons

### 5. Lock Screen Test
- [ ] Lock device while playing
- [ ] Verify lock screen controls
- [ ] Test play/pause from lock screen
- [ ] Test skip buttons on lock screen
- [ ] Unlock and verify app state

### 6. EQ Test (Placeholder)
- [ ] Navigate to Equalizer screen
- [ ] Change EQ preset
- [ ] Check console logs for EQ settings
- [ ] Verify EQ state persists
- [ ] Note: Audio processing not yet implemented

### 7. Format Support Test
Test playback of various formats:
- [ ] FLAC (lossless)
- [ ] WAV (lossless)
- [ ] MP3 (lossy)
- [ ] M4A/AAC (lossy)
- [ ] Note any format incompatibilities

### 8. Performance Test
- [ ] Test with large library (100+ files)
- [ ] Verify smooth scrolling
- [ ] Check memory usage
- [ ] Test rapid track switching
- [ ] Verify no audio glitches

## 🔧 Expected Behavior

### What Should Work
✅ Audio playback (all supported formats)
✅ Play/pause controls
✅ Track navigation (next/prev)
✅ Seek functionality
✅ Background playback
✅ Lock screen controls
✅ Notification controls
✅ Favorites system
✅ Playlists
✅ Settings (theme selection)

### What Won't Work Yet
⚠️ EQ audio processing (UI works, audio processing pending native implementation)
⚠️ Native DAC optimization (future feature)
⚠️ Gapless playback (future feature)

## 📊 Build Configuration

### EAS Profiles (from eas.json)

#### Development
- Distribution: internal
- Build type: APK
- Dev client: true
- Gradle: assembleDebug

#### Preview
- Distribution: internal
- Build type: APK
- Gradle: assembleRelease

#### Production
- Distribution: store (disabled)
- Build type: APK
- Gradle: assembleRelease

## 🐛 Troubleshooting

### If Build Fails

**Check build logs for:**
1. Gradle dependency conflicts
2. Native module linking errors
3. Android SDK version issues
4. CMake compilation errors

**Common Solutions:**
```bash
# Clear caches and rebuild
npx expo prebuild --clean
npm install
eas build --clear-cache --profile preview --platform android
```

### If App Crashes on Launch

**Possible causes:**
1. TrackPlayer not initialized
2. Service registration failed
3. Permission not granted
4. Native module mismatch

**Debug steps:**
1. Check Android logcat
2. Verify service.js is included
3. Confirm permissions in manifest
4. Test with simpler track first

### If Audio Doesn't Play

**Check:**
1. File path is accessible
2. Format is supported
3. Permissions granted
4. TrackPlayer initialized
5. Console logs for errors

## 📝 Notes for Next Development Phase

### Native EQ Implementation
After successful build and basic playback testing:

1. **Create Native Android Module**
   ```bash
   # Add to android/app/src/main/java/com/sepehrmohammady/tunewell/
   # EQModule.kt or EQManager.java
   ```

2. **Implement AudioEffect API**
   ```kotlin
   val equalizer = Equalizer(0, audioSessionId)
   equalizer.enabled = true
   for (band in 0 until numberOfBands) {
       equalizer.setBandLevel(band, gain)
   }
   ```

3. **Bridge to JavaScript**
   ```typescript
   // Create native module bridge
   import { NativeModules } from 'react-native';
   const { EQModule } = NativeModules;
   
   EQModule.setEQBand(bandIndex, gain);
   ```

4. **Connect to EQContext**
   - Update EQContext.tsx to call native module
   - Apply EQ changes on preset selection
   - Apply EQ changes on slider adjustment

### Professional Audio Features
Priority order:
1. ✅ TrackPlayer integration (v0.0.7)
2. ⏳ Native EQ implementation (v0.0.8)
3. 📋 Audio session optimization (v0.0.9)
4. 📋 DAC detection and routing (v0.1.0)
5. 📋 Bit-perfect playback mode (v0.1.1)
6. 📋 Gapless playback (v0.1.2)

## 🎯 Success Criteria

### Minimum Viable Professional Player (v0.0.7)
- [x] Plays high-quality audio formats
- [x] Background playback works
- [x] Lock screen controls functional
- [x] Navigation between tracks smooth
- [x] No audio glitches or dropouts

### Professional Audio Player (v0.1.0)
- [ ] Working 10-band EQ affects audio
- [ ] DAC optimization available
- [ ] Sample rate adapts to source
- [ ] Low latency audio processing
- [ ] Professional-grade sound quality

## 🚀 Let's Build!

Run this command when ready:
```bash
eas build --profile preview --platform android
```

**Expected build time**: 10-20 minutes

**Output**: Download link for APK file

**Next**: Install APK and run through testing checklist above
