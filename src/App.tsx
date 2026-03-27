/**
 * TuneWell - Professional Audiophile Music Player
 * 
 * @version 0.0.1
 * @author SMohammady@outlook.com
 * @repository https://github.com/SepehrMohammady/TuneWell
 */

import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, LogBox, View, Text, StyleSheet, ActivityIndicator, Linking, AppState } from 'react-native';
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

  // Background sync: rescan library + sync Telegram when app returns to foreground
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        try {
          // Rescan library folders
          const storeModule = await import('./store');
          const { scanFolders, isScanning, startScan } = storeModule.useLibraryStore.getState();
          if (scanFolders.length > 0 && !isScanning) {
            startScan();
          }

          // Sync Telegram
          const { useTelegramStore } = await import('./store/telegramStore');
          const { telegramService, TUNEWELL_BOT_TOKEN } = await import('./services/telegram');
          const tgState = useTelegramStore.getState();
          if (tgState.isConnected && !tgState.isSyncing) {
            const token = tgState.botMode === 'custom' && tgState.botToken ? tgState.botToken : TUNEWELL_BOT_TOKEN;
            telegramService.setBotToken(token);
            tgState.setSyncing(true);
            try {
              let offset = tgState.lastUpdateOffset || undefined;
              let hasMore = true;
              while (hasMore) {
                const { updates, nextOffset } = await telegramService.getUpdates(offset);
                offset = nextOffset;
                tgState.setLastUpdateOffset(nextOffset);
                if (updates.length === 0) break;

                const dismissed = new Set(useTelegramStore.getState().dismissedChannelIds);

                // Auto-discover chats from updates
                const discoveredChats = telegramService.extractChatsFromUpdates(updates);
                const knownDiscover = new Set(useTelegramStore.getState().channels.map((c) => c.id));
                for (const chat of discoveredChats) {
                  if (!knownDiscover.has(chat.id) && !dismissed.has(chat.id) && chat.type !== 'private') {
                    tgState.addChannel({
                      id: chat.id,
                      title: chat.title || `Chat ${chat.id}`,
                      username: chat.username,
                      type: chat.type as 'channel' | 'group' | 'supergroup',
                      audioCount: 0,
                      lastSyncAt: 0,
                    });
                  }
                }

                const audioItems = telegramService.extractAudioFromUpdates(updates);
                const byChat: Record<number, typeof audioItems> = {};
                for (const item of audioItems) {
                  if (!byChat[item.chatId]) byChat[item.chatId] = [];
                  byChat[item.chatId].push(item);
                }
                // Auto-add unknown channels
                const known = new Set(useTelegramStore.getState().channels.map((c) => c.id));
                for (const chatIdStr of Object.keys(byChat)) {
                  const cid = parseInt(chatIdStr, 10);
                  if (!known.has(cid) && !dismissed.has(cid)) {
                    try {
                      const chat = await telegramService.getChat(cid);
                      if (chat.type !== 'private') {
                        tgState.addChannel({
                          id: chat.id,
                          title: chat.title || `Chat ${chat.id}`,
                          username: chat.username,
                          type: chat.type as 'channel' | 'group' | 'supergroup',
                          audioCount: 0,
                          lastSyncAt: 0,
                        });
                      }
                    } catch { /* ignore */ }
                  }
                }
                for (const [chatIdStr, items] of Object.entries(byChat)) {
                  const chatId = parseInt(chatIdStr, 10);
                  tgState.addAudioFiles(chatId, items);
                  const actualCount = useTelegramStore.getState().audioFiles[chatId]?.length || 0;
                  tgState.updateChannelSync(chatId, actualCount);
                }
                if (updates.length < 100) hasMore = false;
              }
            } catch { /* silent */ }
            finally { tgState.setSyncing(false); }
          }
        } catch { /* silent */ }
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Lazy-load CustomAlert to avoid eager import
  const [CustomAlert, setCustomAlert] = useState<React.ComponentType | null>(null);
  useEffect(() => {
    import('./components/common/CustomAlert').then(mod => {
      setCustomAlert(() => mod.default);
    });
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
        {CustomAlert && <CustomAlert />}
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
