# Quick Fix: Revert to expo-av for Successful Build

## Problem
- EAS Build failures consuming free tier build limits
- TrackPlayer integration causing Gradle build failures
- Need a working APK quickly

## Solution: Temporary Rollback to expo-av

### Step 1: Remove TrackPlayer Plugin
Edit `app.json` and remove the TrackPlayer plugin line:
```json
"plugins": [
  "./plugins/withTrackPlayer",  // <-- REMOVE THIS LINE
  [
    "expo-media-library",
```

### Step 2: Create expo-av Version of PlayerScreen

Save current PlayerScreen.tsx as PlayerScreen.trackplayer.tsx (backup)

Then use a simpler expo-av version that we know works.

### Step 3: Update index.ts
Remove TrackPlayer service registration:
```typescript
// REMOVE THESE LINES:
import TrackPlayer from 'react-native-track-player';
TrackPlayer.registerPlaybackService(() => require('./service'));
```

### Step 4: Run Prebuild
```bash
npx expo prebuild --clean --platform android
```

### Step 5: Build with EAS
```bash
eas build --profile preview --platform android
```

## Why This Approach?

1. **Saves Build Credits**: Get a working APK first
2. **Incremental Progress**: Add TrackPlayer later when you can test locally
3. **User Value**: You'll have a functional music player now
4. **Future-Proof**: Keep TrackPlayer code for v0.0.8

## What You'll Have

✅ Working music player
✅ All UI features  
✅ Playlists, favorites, settings
✅ Basic audio playback
❌ No EQ audio processing (but UI works)
❌ No background audio (will close when minimized)

## Add TrackPlayer Later (v0.0.8)

When you have:
- More build credits
- Local Android build working
- Ability to test thoroughly

Then we can add TrackPlayer back.

## Alternative: Try Local Build

If you want to try TrackPlayer now, we need to fix the local Gradle build first.
But this requires:
- Stable internet for Gradle downloads
- Time for full compilation (20-30 minutes)
- Debugging potential path length issues on Windows

**Your Choice:** Quick working app now (expo-av) OR keep trying TrackPlayer?
