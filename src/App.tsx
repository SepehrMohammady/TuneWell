/**
 * TuneWell - Professional Audiophile Music Player
 * 
 * High-resolution audio player with support for FLAC, DSD, WAV,
 * and other professional audio formats. Features include:
 * 
 * - 10-band parametric EQ with presets
 * - USB DAC and external audio device support
 * - Gapless playback
 * - Smart and mood-based playlists
 * - High-resolution audio decoding
 * 
 * @version 0.0.1
 * @author SMohammady@outlook.com
 * @repository https://github.com/SepehrMohammady/TuneWell
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation';
import { setupTrackPlayer } from './services/audio';
import { VERSION, THEME } from './config';

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Note: PlaybackService is registered in index.js

export default function App() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      try {
        // Initialize Track Player
        await setupTrackPlayer();
        setIsPlayerReady(true);
        
        console.log(`[TuneWell] App initialized - v${VERSION.versionString}`);
      } catch (error) {
        console.error('[TuneWell] Failed to initialize:', error);
        // Continue even if track player fails - basic UI should still work
        setIsPlayerReady(true);
      }
    }

    initializeApp();

    return () => {
      // Cleanup on unmount
    };
  }, []);

  // Could show splash screen while initializing
  // For now, just render the app

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={THEME.colors.background}
          translucent={false}
        />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
