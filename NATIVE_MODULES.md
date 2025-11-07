# TuneWell Native Audio Modules

This document describes the native audio modules required for TuneWell to achieve professional audio quality.

## Overview

TuneWell uses native modules for performance-critical audio operations to ensure bit-perfect playback and low-latency DSP processing.

## iOS Native Modules

### AVAudioEngine Integration

**File**: `ios/TuneWell/Audio/TWAudioEngine.swift`

```swift
import AVFoundation
import React

@objc(TWAudioEngine)
class TWAudioEngine: NSObject {
  
  private let audioEngine = AVAudioEngine()
  private let eq = AVAudioUnitEQ(numberOfBands: 10)
  
  @objc
  func setupAudioEngine() {
    let mainMixer = audioEngine.mainMixerNode
    let output = audioEngine.outputNode
    let format = output.inputFormat(forBus: 0)
    
    audioEngine.attach(eq)
    audioEngine.connect(eq, to: mainMixer, format: format)
    
    try? audioEngine.start()
  }
  
  @objc
  func setEQBand(_ index: Int, frequency: Float, gain: Float, q: Float) {
    guard index < eq.bands.count else { return }
    
    let band = eq.bands[index]
    band.filterType = .parametric
    band.frequency = frequency
    band.gain = gain
    band.bandwidth = q
    band.bypass = false
  }
}
```

### Audio Session Configuration

**File**: `ios/TuneWell/Audio/TWAudioSession.swift`

```swift
import AVFoundation
import React

@objc(TWAudioSession)
class TWAudioSession: NSObject {
  
  @objc
  func configureAudioSession(_ sampleRate: Double, bitDepth: Int) {
    let session = AVAudioSession.sharedInstance()
    
    do {
      try session.setCategory(.playback, mode: .default, options: [.allowBluetooth, .allowBluetoothA2DP])
      try session.setPreferredSampleRate(sampleRate)
      try session.setActive(true)
    } catch {
      print("Failed to configure audio session: \(error)")
    }
  }
  
  @objc
  func enableBitPerfectMode(_ enable: Bool) {
    // Configure audio session for bit-perfect output
    let session = AVAudioSession.sharedInstance()
    
    if enable {
      try? session.setCategory(.playback, mode: .default, options: [])
    }
  }
}
```

## Android Native Modules

### Oboe Audio Engine

**File**: `android/app/src/main/cpp/TWAudioEngine.cpp`

```cpp
#include <jni.h>
#include <oboe/Oboe.h>
#include <android/log.h>

using namespace oboe;

class TWAudioEngine : public AudioStreamDataCallback {
private:
    std::shared_ptr<AudioStream> audioStream;
    
public:
    bool initializeAudioEngine(int sampleRate, int channelCount, bool exclusiveMode) {
        AudioStreamBuilder builder;
        builder.setDataCallback(this)
               ->setFormat(AudioFormat::Float)
               ->setSampleRate(sampleRate)
               ->setChannelCount(channelCount)
               ->setPerformanceMode(PerformanceMode::LowLatency);
        
        if (exclusiveMode) {
            builder.setSharingMode(SharingMode::Exclusive);
        }
        
        Result result = builder.openStream(audioStream);
        
        if (result == Result::OK) {
            audioStream->start();
            return true;
        }
        
        return false;
    }
    
    DataCallbackResult onAudioReady(
            AudioStream *oboeStream,
            void *audioData,
            int32_t numFrames) override {
        
        // Audio processing callback
        return DataCallbackResult::Continue;
    }
    
    void setExclusiveMode(bool enable) {
        if (audioStream) {
            audioStream->close();
            initializeAudioEngine(48000, 2, enable);
        }
    }
};
```

### EQ Processing

**File**: `android/app/src/main/cpp/TWEQ.cpp`

```cpp
#include <jni.h>
#include <vector>
#include <cmath>

class TWEqualizerBand {
private:
    float frequency;
    float gain;
    float q;
    float a0, a1, a2, b1, b2;
    float x1, x2, y1, y2;
    
public:
    void configure(float freq, float gainDb, float qFactor, float sampleRate) {
        frequency = freq;
        gain = gainDb;
        q = qFactor;
        
        // Biquad filter coefficients calculation
        float A = pow(10.0f, gainDb / 40.0f);
        float omega = 2.0f * M_PI * freq / sampleRate;
        float sn = sin(omega);
        float cs = cos(omega);
        float alpha = sn / (2.0f * qFactor);
        
        b1 = -2.0f * cs;
        b2 = 1.0f - alpha * A;
        a0 = 1.0f + alpha * A;
        a1 = -2.0f * cs;
        a2 = 1.0f - alpha / A;
        
        // Normalize
        a1 /= a0;
        a2 /= a0;
        b1 /= a0;
        b2 /= a0;
        a0 = 1.0f;
        
        // Reset state
        x1 = x2 = y1 = y2 = 0.0f;
    }
    
    float process(float input) {
        float output = a0 * input + a1 * x1 + a2 * x2 - b1 * y1 - b2 * y2;
        
        x2 = x1;
        x1 = input;
        y2 = y1;
        y1 = output;
        
        return output;
    }
};

class TWEqualizer {
private:
    std::vector<TWEqualizerBand> bands;
    float sampleRate;
    
public:
    TWEqualizer(int numBands, float sr) : sampleRate(sr) {
        bands.resize(numBands);
    }
    
    void setBand(int index, float frequency, float gain, float q) {
        if (index < bands.size()) {
            bands[index].configure(frequency, gain, q, sampleRate);
        }
    }
    
    float process(float input) {
        float output = input;
        for (auto& band : bands) {
            output = band.process(output);
        }
        return output;
    }
};
```

## React Native Bridge

### iOS Bridge

**File**: `ios/TuneWell/Audio/TWAudioBridge.m`

```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TWAudioEngine, NSObject)

RCT_EXTERN_METHOD(setupAudioEngine)
RCT_EXTERN_METHOD(setEQBand:(NSInteger)index 
                  frequency:(float)frequency 
                  gain:(float)gain 
                  q:(float)q)

@end

@interface RCT_EXTERN_MODULE(TWAudioSession, NSObject)

RCT_EXTERN_METHOD(configureAudioSession:(double)sampleRate 
                  bitDepth:(NSInteger)bitDepth)
RCT_EXTERN_METHOD(enableBitPerfectMode:(BOOL)enable)

@end
```

### Android Bridge

**File**: `android/app/src/main/java/com/tunewell/audio/TWAudioModule.java`

```java
package com.tunewell.audio;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class TWAudioModule extends ReactContextBaseJavaModule {
    
    static {
        System.loadLibrary("tunewell-audio");
    }
    
    public TWAudioModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }
    
    @Override
    public String getName() {
        return "TWAudioEngine";
    }
    
    @ReactMethod
    public void initializeAudioEngine(int sampleRate, int channelCount, boolean exclusiveMode) {
        nativeInitAudioEngine(sampleRate, channelCount, exclusiveMode);
    }
    
    @ReactMethod
    public void setEQBand(int index, float frequency, float gain, float q) {
        nativeSetEQBand(index, frequency, gain, q);
    }
    
    private native boolean nativeInitAudioEngine(int sampleRate, int channelCount, boolean exclusiveMode);
    private native void nativeSetEQBand(int index, float frequency, float gain, float q);
}
```

## TypeScript Interface

**File**: `src/native/AudioEngine.ts`

```typescript
import { NativeModules } from 'react-native';

const { TWAudioEngine, TWAudioSession } = NativeModules;

export interface AudioEngineConfig {
  sampleRate: number;
  channelCount: number;
  exclusiveMode: boolean;
  bitDepth: number;
}

export const AudioEngine = {
  initialize: async (config: AudioEngineConfig): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      await TWAudioSession.configureAudioSession(config.sampleRate, config.bitDepth);
      await TWAudioEngine.setupAudioEngine();
    } else {
      await TWAudioEngine.initializeAudioEngine(
        config.sampleRate,
        config.channelCount,
        config.exclusiveMode
      );
    }
    return true;
  },
  
  setEQBand: (index: number, frequency: number, gain: number, q: number): void => {
    TWAudioEngine.setEQBand(index, frequency, gain, q);
  },
  
  enableBitPerfectMode: (enable: boolean): void => {
    if (Platform.OS === 'ios') {
      TWAudioSession.enableBitPerfectMode(enable);
    }
  },
};
```

## Building Native Modules

### iOS

1. Add Swift files to Xcode project
2. Create bridging header if needed
3. Link frameworks: AVFoundation, CoreAudio
4. Build and archive

### Android

1. Create CMakeLists.txt for C++ code
2. Add to build.gradle:
   ```gradle
   externalNativeBuild {
       cmake {
           path "src/main/cpp/CMakeLists.txt"
       }
   }
   ```
3. Link Oboe library
4. Build native library

## Testing Native Modules

Test native modules independently before integration:

```bash
# iOS
cd ios
xcodebuild test -workspace TuneWell.xcworkspace -scheme TuneWell

# Android
cd android
./gradlew test
```

## Performance Optimization

- Use native buffers for audio data
- Minimize GC pressure in audio callback
- Profile with Instruments (iOS) and Android Profiler
- Test on low-end devices

## Troubleshooting

### iOS
- Check audio session category
- Verify AVAudioEngine state
- Monitor sample rate changes

### Android
- Check Oboe stream state
- Verify exclusive mode availability
- Monitor buffer underruns

## Resources

- [AVAudioEngine Documentation](https://developer.apple.com/documentation/avfaudio/avaudioengine)
- [Oboe Library](https://github.com/google/oboe)
- [AAudio Documentation](https://developer.android.com/ndk/guides/audio/aaudio/aaudio)
