# Metadata Extraction Feature - Testing Guide

## What Was Implemented

The metadata extraction feature has been successfully implemented to display real artist names and album artwork from your audio files' ID3 tags.

### Changes Made

#### 1. Added Metadata Library
- **Package**: `@missingcore/audio-metadata` v1.3.0
- Extracts ID3 tags from audio files including artist, album, title, year, track number, and embedded artwork

#### 2. Created MetadataService ([src/services/MetadataService.ts](file:///c:/Users/SMoha/Desktop/Temporary/ProjectWell/TuneWell/src/services/MetadataService.ts))
- Extracts metadata from audio files
- Caches results to avoid re-extracting
- Handles errors gracefully with fallbacks
- Supports batch processing

#### 3. Updated FileSystemService ([src/services/FileSystemService.ts](file:///c:/Users/SMoha/Desktop/Temporary/ProjectWell/TuneWell/src/services/FileSystemService.ts))
- Replaced hardcoded `'Unknown Artist'` with actual artist from metadata
- Uses metadata title if available, otherwise falls back to filename
- Extracts album names
- Retrieves embedded album artwork as base64

#### 4. Updated UI Components

**TrackItem** ([src/components/TrackItem.tsx](file:///c:/Users/SMoha/Desktop/Temporary/ProjectWell/TuneWell/src/components/TrackItem.tsx)):
- Displays album artwork (50x50px) from base64 data
- Shows placeholder music note icon when artwork is missing
- Proper rounded corners and styling

**NowPlayingBar** ([src/components/NowPlayingBar.tsx](file:///c:/Users/SMoha/Desktop/Temporary/ProjectWell/TuneWell/src/components/NowPlayingBar.tsx)):
- Displays artwork in the now playing bar
- Same base64 format support
- Graceful fallback to placeholder

---

## How to Test

### Option 1: Quick Test (Expo Go)
1. Open the terminal in project directory
2. Run: `npm start`
3. Scan QR code with Expo Go app on your phone
4. App will rebuild with new metadata extraction

### Option 2: Build New APK
Since metadata extraction adds new functionality, you may want to build a fresh APK:

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

The new APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

---

## Expected Results

### ✅ What You Should See

1. **Artist Names**: Instead of "Unknown Artist" for all tracks, you should see:
   - Actual artist names from ID3 tags
   - "Unknown Artist" only for tracks without metadata

2. **Album Artwork**:
   - Small square album covers (50x50px) next to each track
   - Artwork in the now playing bar at the bottom
   - Music note (♪) placeholder for tracks without artwork

3. **Better Track Titles**:
   - Proper track names from metadata when available
   - Filename (without extension) as fallback

### Example Display

**Before**:
```
🎵  01 - Song Title.mp3
   Unknown Artist                   3:24
```

**After**:
```
🖼️  Song Title
   The Beatles                     3:24
```
(With actual album cover image showing)

---

## Performance Notes

### First Load
The first time you open the app after this update:
- It will take longer to load (extracting metadata from all tracks)
- Progress will be shown during library scan
- Subsequent loads will be faster due to caching

### Metadata Cache
- Extracted metadata is cached in memory
- Cache persists for the app session
- Cleared when app is fully closed and restarted

---

## Troubleshooting

### Issue: Still seeing "Unknown Artist"

**Possible causes**:
1. Audio file has no embedded metadata
2. Metadata format not supported by the library
3. File is corrupted

**What to do**:
- Check the audio file in a tag editor (like Mp3tag)
- Ensure file has ID3v2 tags
- Re-tag the file if necessary

### Issue: No artwork displaying

**Possible causes**:
1.  Audio file has no embedded artwork
2. Artwork format not supported (should work with JPEG/PNG)
3. Artwork might be too large

**What to do**:
- Check if artwork exists in the audio file
- Some files may have artwork in APE tags instead of ID3v2
- Consider re-embedding artwork in ID3v2 format

### Issue: App is slow/laggy

**Possible causes**:
- Large music library (thousands of tracks)
- Many high-resolution artworks

**Future optimization** (not yet implemented):
- Progressive loading
- Artwork size limits
- Background processing

---

## Testing Checklist

Run through these tests after installing the updated app:

- [ ] Open app and grant media permissions
- [ ] Check if tracks display with artist names instead of "Unknown Artist"
- [ ] Verify artwork appears next to tracks that have embedded artwork
- [ ] Tap on a track to play it
- [ ] Check if now playing bar shows artwork
- [ ] Search for a track by artist name
- [ ] Try tracks with different audio formats (MP3, M4A, FLAC)
- [ ] Verify tracks without metadata show appropriate fallbacks
- [ ] Check performance with full library loaded

---

## Next Steps for Optimization

Future improvements that can be made:

1. **Progressive Loading**: Load metadata in batches to avoid blocking UI
2. **Persistent Cache**: Save metadata to AsyncStorage for faster subsequent loads
3. **Background Processing**: Extract metadata in background thread
4. **Artwork Optimization**: Resize/compress large artworks
5. **Loading States**: Show skeleton loaders while extracting metadata

---

## Commit Information

- **Commit**: ea67184
- **Branch**: master
- **Pushed to GitHub**: ✅

All changes are now live in the repository!
