# TuneWell Assets

This folder contains all static assets used in the TuneWell application.

## Directory Structure

```
assets/
├── images/
│   ├── logo-full.png      # Full TuneWell logo with text
│   └── splash-icon.png    # Splash screen icon
├── icons/
│   ├── app-icon.png       # Main app icon (square)
│   ├── adaptive-icon.png  # Android adaptive icon
│   └── favicon.png        # Small icon for web/shortcuts
└── README.md
```

## Logo Design

The TuneWell logo features:
- **Equalizer bars** forming the letters "H" and "M" (representing High-fidelity Music)
- **Audio waveform** connecting the bars (representing sound engineering)
- **Typography**: Bold, modern font conveying professionalism
- **Tagline**: "Engineering-Ready Music Player"
- **Color**: Monochrome design for flexibility

## Usage

### iOS
App icons are managed in `ios/TuneWell/Images.xcassets/AppIcon.appiconset/`

### Android
App icons are in `android/app/src/main/res/mipmap-*/`

### In-App Usage

Import assets in React Native:
```typescript
import Logo from '@assets/images/logo-full.png';
import Icon from '@assets/icons/app-icon.png';
```

## Icon Sizes

When replacing icons, use these sizes:

### iOS
- App Icon: 1024x1024 (for all sizes)
- Splash: 2048x2048

### Android
- mdpi: 48x48
- hdpi: 72x72
- xhdpi: 96x96
- xxhdpi: 144x144
- xxxhdpi: 192x192

## Design Philosophy

The TuneWell visual identity emphasizes:
- **Professionalism**: Clean, technical aesthetic
- **Audio Focus**: Waveform and equalizer motifs
- **Minimalism**: No clutter, focused on music
- **Engineering**: Precision and quality

---

*For logo updates or design guidelines, contact SMohammady@outlook.com*
