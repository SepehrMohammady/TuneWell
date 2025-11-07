# Installation Guide

## Prerequisites

Before installing TuneWell, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **npm** (v9 or higher)
   - Comes with Node.js
   - Verify: `npm --version`

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify: `git --version`

### iOS Development (macOS only)

4. **Xcode** (latest version)
   - Download from Mac App Store
   - Install Command Line Tools: `xcode-select --install`

5. **CocoaPods**
   - Install: `sudo gem install cocoapods`
   - Verify: `pod --version`

### Android Development

6. **Android Studio** (latest version)
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Install Android SDK (API level 23+)

7. **Java Development Kit (JDK)** (v11 or higher)
   - OpenJDK recommended
   - Verify: `java -version`

8. **Android Environment Variables**
   
   Add to your `~/.bashrc`, `~/.zshrc`, or Windows Environment Variables:
   
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/SepehrMohammady/TuneWell.git
cd TuneWell
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required Node.js packages defined in `package.json`.

### 3. iOS Setup (macOS only)

```bash
cd ios
pod install
cd ..
```

This installs native iOS dependencies via CocoaPods.

### 4. Android Setup

Open Android Studio and:
1. Go to **File → Open**
2. Navigate to `TuneWell/android`
3. Click **OK**
4. Wait for Gradle sync to complete
5. Download any missing SDK components

## Running the App

### iOS Simulator

```bash
npm run ios
```

Or specify a device:
```bash
npm run ios -- --simulator="iPhone 15 Pro"
```

### iOS Physical Device

1. Open `ios/TuneWell.xcworkspace` in Xcode
2. Select your device
3. Configure signing with your Apple Developer account
4. Click **Run** (▶)

### Android Emulator

Start an emulator first:
```bash
emulator -avd Pixel_6_API_33
```

Then run:
```bash
npm run android
```

### Android Physical Device

1. Enable **Developer Options** on your device
2. Enable **USB Debugging**
3. Connect via USB
4. Verify connection: `adb devices`
5. Run: `npm run android`

## Development Server

Start the Metro bundler:
```bash
npm start
```

Or with cache clearing:
```bash
npm start -- --reset-cache
```

## Troubleshooting

### iOS Issues

**CocoaPods not found:**
```bash
sudo gem install cocoapods
pod --version
```

**Xcode build fails:**
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

**Clear derived data:**
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### Android Issues

**Gradle build fails:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

**SDK not found:**
- Open Android Studio
- Go to **Preferences → Appearance & Behavior → System Settings → Android SDK**
- Install required SDK versions

**Device not detected:**
```bash
adb kill-server
adb start-server
adb devices
```

### Metro Bundler Issues

**Port already in use:**
```bash
npx react-native start --port=8082
```

**Cache issues:**
```bash
npm start -- --reset-cache
rm -rf $TMPDIR/react-*
```

### Module not found errors

Clear caches and reinstall:
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

For iOS:
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

## Building for Production

### iOS Production Build

1. Open `ios/TuneWell.xcworkspace` in Xcode
2. Select **Any iOS Device** or your device
3. **Product → Archive**
4. **Distribute App**
5. Follow App Store Connect guidelines

### Android Production Build

Generate release APK:
```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

Generate AAB for Play Store:
```bash
./gradlew bundleRelease
```

AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

## Next Steps

After successful installation:
1. Review the [README.md](README.md) for feature overview
2. Check [ROADMAP.md](ROADMAP.md) for upcoming features
3. Read [CONTRIBUTING.md](CONTRIBUTING.md) if you want to contribute
4. Explore [NATIVE_MODULES.md](NATIVE_MODULES.md) for native audio details

## Support

If you encounter issues:
1. Check existing [GitHub Issues](https://github.com/SepehrMohammady/TuneWell/issues)
2. Create a new issue with:
   - Your OS and version
   - Node.js, npm, Xcode/Android Studio versions
   - Complete error message
   - Steps to reproduce
3. Email: SMohammady@outlook.com

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Native Track Player](https://react-native-track-player.js.org/)
- [Xcode Documentation](https://developer.apple.com/xcode/)
- [Android Studio Guide](https://developer.android.com/studio/intro)
