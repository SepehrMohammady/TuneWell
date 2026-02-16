/**
 * TuneWell - Professional Audiophile Music Player
 * 
 * @version 0.0.1
 * @author SMohammady@outlook.com
 * @repository https://github.com/SepehrMohammady/TuneWell
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox, View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'new NativeEventEmitter',
]);

// Loading screen shown during initialization
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingTitle}>TuneWell</Text>
      <Text style={styles.loadingSubtitle}>Engineering-Ready Music Player</Text>
      <ActivityIndicator size="large" color="#6366F1" style={styles.spinner} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

// Error screen
function ErrorScreen({ message }: { message: string }) {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingTitle}>TuneWell</Text>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [RootNavigator, setRootNavigator] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        // Delay to allow native modules to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Dynamically import navigation and audio services
        const [navModule, audioModule, configModule, storeModule] = await Promise.all([
          import('./navigation'),
          import('./services/audio'),
          import('./config'),
          import('./store'),
        ]);
        
        // Setup track player
        try {
          await audioModule.setupTrackPlayer();
          console.log(`[TuneWell] Player ready - v${configModule.VERSION.versionString}`);
          
          // Initialize audio service (sets up EQ and event listeners)
          await audioModule.audioService.initialize();
          console.log('[TuneWell] Audio service initialized');
          
          // Resume on startup: restore last queue if setting is enabled
          const { resumeOnStartup } = storeModule.useSettingsStore.getState();
          console.log('[TuneWell] Resume on startup:', resumeOnStartup);
          
          if (resumeOnStartup) {
            const { queue, queueIndex, lastPosition } = storeModule.usePlayerStore.getState();
            console.log('[TuneWell] Stored queue length:', queue.length, 'index:', queueIndex, 'lastPosition:', lastPosition);
            
            if (queue.length > 0) {
              console.log('[TuneWell] Restoring queue in paused state...');
              // Load queue but start paused (third parameter = startPaused)
              await audioModule.audioService.playQueue(queue, queueIndex, true);
              
              // Seek to last position if available
              if (lastPosition && lastPosition > 0) {
                console.log('[TuneWell] Seeking to last position:', lastPosition);
                await audioModule.audioService.seekTo(lastPosition);
              }
              
              console.log('[TuneWell] Queue restored (paused, ready to play)');
            }
          }
        } catch (playerError) {
          console.warn('[TuneWell] Player setup failed, continuing:', playerError);
        }
        
        setRootNavigator(() => navModule.RootNavigator);
        setIsReady(true);
      } catch (err) {
        console.error('[TuneWell] Init error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      }
    }

    initialize();
  }, []);

  // Deep link handler for Spotify OAuth callback
  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (url && url.startsWith('tunewell://spotify-callback')) {
        console.log('[TuneWell] Spotify callback received');
        try {
          const { spotifyService } = await import('./services/streaming');
          await spotifyService.handleAuthCallback(url);
        } catch (err) {
          console.error('[TuneWell] Spotify callback error:', err);
        }
      }
    };

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Also check if app was opened via deep link (cold start)
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => subscription.remove();
  }, []);

  if (error) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorScreen message={error} />
      </GestureHandlerRootView>
    );
  }

  if (!isReady || !RootNavigator) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LoadingScreen />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0F0F0F"
          translucent={false}
        />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    marginBottom: 40,
  },
  spinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 20,
  },
});
