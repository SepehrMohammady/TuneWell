# TuneWell Android APK Build Guide

## Build Information

**Build Date**: 2025-11-21  
**Version**: 0.0.1  
**Build Type**: Release (Unsigned)  
**Platform**: Android

---

## APK Location

The Android APK has been successfully built and is located at:

```
android/app/build/outputs/apk/release/app-release.apk
```

**Full Path**:
```
C:\Users\SMoha\Desktop\Temporary\ProjectWell\TuneWell\android\app\build\outputs\apk\release\app-release.apk
```

---

## Build Process Summary

### 1. EAS Configuration
Created `eas.json` with build profiles for development, preview, and production builds.

### 2. Native Project Generation
```bash
npx expo prebuild --platform android
```
- Generated native Android project in `./android` directory
- Configured Gradle build files
- Set up React Native and Expo modules

### 3. Gradle Build
```bash
cd android
./gradlew assembleRelease
```
- Compiled TypeScript to JavaScript
- Bundled React Native code
- Compiled Java/Kotlin native code
- Built APK package

---

## Installation Instructions

### Prerequisites
- Android device running Android 5.0 (Lollipop) or higher
- "Install from Unknown Sources" enabled in device settings

### Steps to Install

#### Method 1: Direct Transfer
1. Connect your Android device to your computer via USB
2. Copy the APK file to your device:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```
3. On your device, navigate to the APK file using a file manager
4. Tap the APK file to install
5. Grant necessary permissions when prompted

#### Method 2: Cloud Transfer
1. Upload the APK to Google Drive, Dropbox, or similar
2. Download the APK on your Android device
3. Open the downloaded APK to install
4. Grant necessary permissions when prompted

### Required Permissions
When you first launch TuneWell, it will request:
- **Storage/Media Access**: To scan and play your music files
- **Notifications**: For playback controls and notifications

---

## Testing Checklist

After installing the APK on your device, verify the following:

- [ ] App launches successfully
- [ ] Permission dialog for media access appears
- [ ] Music files from device are loaded and displayed
- [ ] Search/filter functionality works
- [ ] Tapping a track starts playback
- [ ] Play/pause button works
- [ ] Next/Previous track buttons work
- [ ] Progress bar updates during playback
- [ ] Music continues playing when app is minimized
- [ ] Lock screen controls appear and function
- [ ] Notification controls work
- [ ] Shuffle mode works
- [ ] Repeat modes work (off, one, all)
- [ ] Volume controls work
- [ ] App doesn't crash during normal usage

---

## Known Limitations

### This is an UNSIGNED APK
- The APK is not signed with a release keystore
- Google Play won't accept unsigned APKs
- Some devices may show security warnings
- This is fine for personal testing

### To create a SIGNED APK for distribution:

1. **Generate a Keystore**:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore tunewell-release-key.keystore -alias tunewell -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure Signing in `android/app/build.gradle`**:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('tunewell-release-key.keystore')
            storePassword 'YOUR_PASSWORD'
            keyAlias 'tunewell'
            keyPassword 'YOUR_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...
        }
    }
}
```

3. **Build Signed APK**:
```bash
cd android
./gradlew assembleRelease
```

---

## APK Size Optimization

Current APK includes all architectures. To reduce size:

### Enable App Bundles (AAB)
For Google Play Store, use AAB instead of APK:
```bash
cd android
./gradlew bundleRelease
```

### Split APKs by Architecture
Edit `android/app/build.gradle`:
```gradle
splits {
    abi {
        enable true
        reset()
        include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
        universalApk false
    }
}
```

This creates separate APKs for each CPU architecture, reducing individual APK sizes by ~60%.

---

## Troubleshooting

### "App not installed" error
- Make sure "Install from Unknown Sources" is enabled
- Delete any previous installation of TuneWell
- Restart your device and try again

### "Parse error: There is a problem parsing the package"
- APK may be corrupted during transfer
- Re-download or re-transfer the APK
- Ensure your device meets the minimum Android version

### App crashes on launch
- Check device logs using `adb logcat`
- Ensure all required permissions are granted
- Clear app data and cache, then restart

### No music files showing
- Grant storage/media permissions
- Ensure you have audio files on your device
- Check that files are in supported formats (MP3, M4A, FLAC, WAV, etc.)

---

## Build Scripts (for future builds)

Add these to `package.json` for convenience:

```json
{
  "scripts": {
    "android:build": "cd android && gradlew assembleRelease",
    "android:install": "cd android && gradlew installRelease",
    "android:bundle": "cd android && gradlew bundleRelease"
  }
}
```

Then you can build with:
```bash
npm run android:build
```

---

## Next Steps

1. **Test the APK** on multiple Android devices
2. **Create a signed version** for distribution
3. **Optimize APK size** using the methods above
4. **Prepare for Play Store** by creating an AAB file
5. **Set up CI/CD** for automated builds

---

## Questions?

If you encounter any issues during installation or testing, please check the troubleshooting section above or refer to the main README.md file in the project root.
