/**
 * TuneWell - Professional Audiophile Music Player
 * 
 * @version 0.0.1
 * @author SMohammady@outlook.com
 * @repository https://github.com/SepehrMohammady/TuneWell
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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
        const [navModule, audioModule, configModule] = await Promise.all([
          import('./navigation'),
          import('./services/audio'),
          import('./config'),
        ]);
        
        // Setup track player
        try {
          await audioModule.setupTrackPlayer();
          console.log(`[TuneWell] Player ready - v${configModule.VERSION.versionString}`);
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
