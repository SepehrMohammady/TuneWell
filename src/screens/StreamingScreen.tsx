/**
 * TuneWell Streaming Screen
 * 
 * Main tab for Spotify integration and playlist imports.
 * Shows:
 * - Spotify connection status & login
 * - Spotify playlists (when connected)
 * - Imported playlists from other platforms
 * - Import from URL action
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { THEME, ROUTES } from '../config';
import { useStreamingStore, useThemeStore } from '../store';
import { spotifyService, deezerService, qobuzService, playlistImportService } from '../services/streaming';
import type { SpotifyPlaylist, DeezerPlaylist, QobuzPlaylist, ImportedPlaylist } from '../types';
import MiniPlayer from '../components/player/MiniPlayer';

// ============================================================================
// Sub-Components
// ============================================================================

function SpotifyLoginCard({ colors }: { colors: any }) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await spotifyService.startAuth();
    } catch (error) {
      Alert.alert('Error', 'Failed to open Spotify login');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={[styles.loginCard, { backgroundColor: colors.surface }]}>
      <MaterialCommunityIcons name="spotify" size={48} color="#1DB954" />
      <Text style={[styles.loginTitle, { color: colors.text }]}>Connect Spotify</Text>
      <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>
        Link your Spotify account to browse playlists and play tracks directly in TuneWell
      </Text>
      <TouchableOpacity
        style={[styles.connectButton, { backgroundColor: '#1DB954' }]}
        onPress={handleConnect}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <MaterialCommunityIcons name="spotify" size={20} color="#FFFFFF" />
            <Text style={styles.connectButtonText}>Connect with Spotify</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SpotifyUserHeader({ colors }: { colors: any }) {
  const { spotifyUser } = useStreamingStore();

  if (!spotifyUser) return null;

  return (
    <View style={[styles.userHeader, { backgroundColor: colors.surface }]}>
      {spotifyUser.imageUrl ? (
        <Image source={{ uri: spotifyUser.imageUrl }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="person" size={24} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{spotifyUser.displayName}</Text>
        <View style={styles.userBadge}>
          <MaterialCommunityIcons name="spotify" size={14} color="#1DB954" />
          <Text style={[styles.userPlan, { color: '#1DB954' }]}>
            {spotifyUser.product === 'premium' ? 'Premium' : 'Connected'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Disconnect Spotify',
            'This will remove your Spotify connection. Imported playlists will be kept.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Disconnect', style: 'destructive', onPress: () => spotifyService.disconnect() },
            ]
          );
        }}
      >
        <MaterialIcons name="logout" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function SpotifyPlaylistCard({ 
  playlist, 
  colors, 
  onPress 
}: { 
  playlist: SpotifyPlaylist; 
  colors: any; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      style={[styles.playlistCard, { backgroundColor: colors.surface }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {playlist.imageUrl ? (
        <Image source={{ uri: playlist.imageUrl }} style={styles.playlistImage} />
      ) : (
        <View style={[styles.playlistImagePlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="playlist-play" size={28} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={[styles.playlistMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {playlist.trackCount} tracks · {playlist.ownerName}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function ImportedPlaylistCard({ 
  playlist, 
  colors, 
  onPress 
}: { 
  playlist: ImportedPlaylist; 
  colors: any; 
  onPress: () => void;
}) {
  const sourceIcon = {
    spotify: 'spotify',
    youtube_music: 'youtube',
    apple_music: 'apple',
    url: 'link-variant',
  }[playlist.source] || 'link-variant';

  const sourceColor = {
    spotify: '#1DB954',
    youtube_music: '#FF0000',
    apple_music: '#FC3C44',
    url: THEME.colors.textSecondary,
  }[playlist.source];

  return (
    <TouchableOpacity 
      style={[styles.playlistCard, { backgroundColor: colors.surface }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {playlist.imageUrl ? (
        <Image source={{ uri: playlist.imageUrl }} style={styles.playlistImage} />
      ) : (
        <View style={[styles.playlistImagePlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <MaterialCommunityIcons name={sourceIcon} size={28} color={sourceColor} />
        </View>
      )}
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>
          {playlist.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name={sourceIcon} size={14} color={sourceColor} />
          <Text style={[styles.playlistMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {playlist.trackCount} tracks
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Remove Playlist',
            `Remove "${playlist.name}" from imports?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Remove', 
                style: 'destructive', 
                onPress: () => useStreamingStore.getState().removeImportedPlaylist(playlist.id) 
              },
            ]
          );
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="close" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// --------------------------------------------------------------------------
// Deezer Components
// --------------------------------------------------------------------------

function DeezerLoginCard({ colors }: { colors: any }) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await deezerService.startAuth();
    } catch (error) {
      Alert.alert('Error', 'Failed to open Deezer login');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={[styles.loginCard, { backgroundColor: colors.surface }]}>
      <MaterialCommunityIcons name="music-circle" size={48} color="#A238FF" />
      <Text style={[styles.loginTitle, { color: colors.text }]}>Connect Deezer</Text>
      <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>
        Link your Deezer account to browse playlists and play tracks directly in TuneWell
      </Text>
      <TouchableOpacity
        style={[styles.connectButton, { backgroundColor: '#A238FF' }]}
        onPress={handleConnect}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <MaterialCommunityIcons name="music-circle" size={20} color="#FFFFFF" />
            <Text style={styles.connectButtonText}>Connect with Deezer</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function DeezerUserHeader({ colors }: { colors: any }) {
  const { deezerUser } = useStreamingStore();

  if (!deezerUser) return null;

  return (
    <View style={[styles.userHeader, { backgroundColor: colors.surface }]}>
      {deezerUser.imageUrl ? (
        <Image source={{ uri: deezerUser.imageUrl }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="person" size={24} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{deezerUser.displayName}</Text>
        <View style={styles.userBadge}>
          <MaterialCommunityIcons name="music-circle" size={14} color="#A238FF" />
          <Text style={[styles.userPlan, { color: '#A238FF' }]}>Deezer Connected</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Disconnect Deezer',
            'This will remove your Deezer connection. Imported playlists will be kept.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Disconnect', style: 'destructive', onPress: () => deezerService.disconnect() },
            ]
          );
        }}
      >
        <MaterialIcons name="logout" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function DeezerPlaylistCard({ 
  playlist, 
  colors, 
  onPress 
}: { 
  playlist: DeezerPlaylist; 
  colors: any; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      style={[styles.playlistCard, { backgroundColor: colors.surface }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {playlist.imageUrl ? (
        <Image source={{ uri: playlist.imageUrl }} style={styles.playlistImage} />
      ) : (
        <View style={[styles.playlistImagePlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="playlist-play" size={28} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={[styles.playlistMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {playlist.trackCount} tracks · {playlist.creatorName}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// --------------------------------------------------------------------------
// Qobuz Components
// --------------------------------------------------------------------------

function QobuzLoginCard({ colors }: { colors: any }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your Qobuz email and password');
      return;
    }
    setConnecting(true);
    try {
      const success = await qobuzService.login(email.trim(), password.trim());
      if (success) {
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to log in to Qobuz');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={[styles.loginCard, { backgroundColor: colors.surface }]}>
      <MaterialCommunityIcons name="music-box" size={48} color="#0170EA" />
      <Text style={[styles.loginTitle, { color: colors.text }]}>Connect Qobuz</Text>
      <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>
        Sign in with your Qobuz account for lossless & hi-res audio streaming
      </Text>
      <TextInput
        style={[styles.qobuzInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
      />
      <TextInput
        style={[styles.qobuzInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={[styles.connectButton, { backgroundColor: '#0170EA', marginTop: THEME.spacing.sm }]}
        onPress={handleConnect}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <MaterialCommunityIcons name="music-box" size={20} color="#FFFFFF" />
            <Text style={styles.connectButtonText}>Sign in to Qobuz</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function QobuzUserHeader({ colors }: { colors: any }) {
  const { qobuzUser } = useStreamingStore();

  if (!qobuzUser) return null;

  return (
    <View style={[styles.userHeader, { backgroundColor: colors.surface }]}>
      {qobuzUser.imageUrl ? (
        <Image source={{ uri: qobuzUser.imageUrl }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="person" size={24} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{qobuzUser.displayName}</Text>
        <View style={styles.userBadge}>
          <MaterialCommunityIcons name="music-box" size={14} color="#0170EA" />
          <Text style={[styles.userPlan, { color: '#0170EA' }]}>
            {qobuzUser.subscription || 'Connected'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Disconnect Qobuz',
            'This will remove your Qobuz connection. Imported playlists will be kept.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Disconnect', style: 'destructive', onPress: () => qobuzService.disconnect() },
            ]
          );
        }}
      >
        <MaterialIcons name="logout" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function QobuzPlaylistCard({ 
  playlist, 
  colors, 
  onPress 
}: { 
  playlist: QobuzPlaylist; 
  colors: any; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      style={[styles.playlistCard, { backgroundColor: colors.surface }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {playlist.imageUrl ? (
        <Image source={{ uri: playlist.imageUrl }} style={styles.playlistImage} />
      ) : (
        <View style={[styles.playlistImagePlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="playlist-play" size={28} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={[styles.playlistMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {playlist.trackCount} tracks · {playlist.ownerName}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export default function StreamingScreen() {
  const navigation = useNavigation<any>();
  const { colors, mode: themeMode } = useThemeStore();
  const { 
    spotifyConnected, 
    spotifyPlaylists,
    deezerConnected,
    deezerPlaylists,
    qobuzConnected,
    qobuzPlaylists,
    importedPlaylists,
    isLoading, 
    error,
  } = useStreamingStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [showImportInput, setShowImportInput] = useState(false);

  // Fetch playlists on mount if connected
  useEffect(() => {
    if (spotifyConnected) {
      spotifyService.fetchPlaylists();
    }
    if (deezerConnected) {
      deezerService.fetchPlaylists();
    }
    if (qobuzConnected) {
      qobuzService.fetchPlaylists();
    }
  }, [spotifyConnected, deezerConnected, qobuzConnected]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const promises: Promise<any>[] = [];
    if (spotifyConnected) promises.push(spotifyService.fetchPlaylists());
    if (deezerConnected) promises.push(deezerService.fetchPlaylists());
    if (qobuzConnected) promises.push(qobuzService.fetchPlaylists());
    await Promise.all(promises);
    setRefreshing(false);
  }, [spotifyConnected, deezerConnected, qobuzConnected]);

  const handleSpotifyPlaylistPress = (playlist: SpotifyPlaylist) => {
    navigation.navigate(ROUTES.SPOTIFY_PLAYLIST_DETAIL, { playlistId: playlist.id });
  };

  const handleDeezerPlaylistPress = (playlist: DeezerPlaylist) => {
    navigation.navigate(ROUTES.SPOTIFY_PLAYLIST_DETAIL, { playlistId: `deezer_${playlist.id}` });
  };

  const handleQobuzPlaylistPress = (playlist: QobuzPlaylist) => {
    navigation.navigate(ROUTES.SPOTIFY_PLAYLIST_DETAIL, { playlistId: `qobuz_${playlist.id}` });
  };

  const handleImportedPlaylistPress = (playlist: ImportedPlaylist) => {
    // Navigate to a detail view showing imported tracks
    navigation.navigate(ROUTES.SPOTIFY_PLAYLIST_DETAIL, { playlistId: playlist.id });
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) return;
    
    const result = await playlistImportService.importFromUrl(importUrl.trim());
    if (result) {
      setImportUrl('');
      setShowImportInput(false);
      Alert.alert('Success', `Imported "${result.name}" with ${result.trackCount} tracks`);
    } else {
      const errorMsg = useStreamingStore.getState().error;
      Alert.alert('Import Failed', errorMsg || 'Could not import playlist from this URL');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} 
        backgroundColor={colors.background} 
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Streaming</Text>
          <TouchableOpacity
            onPress={() => setShowImportInput(!showImportInput)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons 
              name={showImportInput ? 'close' : 'add-link'} 
              size={26} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>

        {/* Import URL Input */}
        {showImportInput && (
          <View style={[styles.importSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.importLabel, { color: colors.text }]}>Import from URL</Text>
            <Text style={[styles.importHint, { color: colors.textSecondary }]}>
              Paste a playlist link from <Text style={{ fontWeight: '700', color: colors.text }}>Spotify</Text>, <Text style={{ fontWeight: '700', color: colors.text }}>Deezer</Text>, <Text style={{ fontWeight: '700', color: colors.text }}>Qobuz</Text>, <Text style={{ fontWeight: '700', color: colors.text }}>YouTube Music</Text>, or <Text style={{ fontWeight: '700', color: colors.text }}>Apple Music</Text>
            </Text>
            <View style={styles.importRow}>
              <TextInput
                style={[styles.importInput, { 
                  backgroundColor: colors.surfaceLight, 
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                placeholder="https://open.spotify.com/playlist/..."
                placeholderTextColor={colors.textMuted}
                value={importUrl}
                onChangeText={setImportUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.importButton, { 
                  backgroundColor: importUrl.trim() ? colors.primary : colors.surfaceLight 
                }]}
                onPress={handleImportFromUrl}
                disabled={!importUrl.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <MaterialIcons name="download" size={22} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Error Banner */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: '#DC262620' }]}>
            <MaterialIcons name="error-outline" size={18} color="#DC2626" />
            <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
            <TouchableOpacity onPress={() => useStreamingStore.getState().setError(null)}>
              <MaterialIcons name="close" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {/* Spotify Section */}
        {!spotifyConnected ? (
          <SpotifyLoginCard colors={colors} />
        ) : (
          <>
            <SpotifyUserHeader colors={colors} />

            {/* Spotify Playlists */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="spotify" size={20} color="#1DB954" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Playlists</Text>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                  {spotifyPlaylists.length}
                </Text>
              </View>

              {isLoading && spotifyPlaylists.length === 0 ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              ) : spotifyPlaylists.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                  <MaterialIcons name="playlist-play" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No playlists found. Create some on Spotify!
                  </Text>
                </View>
              ) : (
                spotifyPlaylists.map((playlist) => (
                  <SpotifyPlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    colors={colors}
                    onPress={() => handleSpotifyPlaylistPress(playlist)}
                  />
                ))
              )}
            </View>
          </>
        )}

        {/* Deezer Section */}
        {!deezerConnected ? (
          <DeezerLoginCard colors={colors} />
        ) : (
          <>
            <DeezerUserHeader colors={colors} />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="music-circle" size={20} color="#A238FF" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Deezer Playlists</Text>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                  {deezerPlaylists.length}
                </Text>
              </View>

              {isLoading && deezerPlaylists.length === 0 ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              ) : deezerPlaylists.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                  <MaterialIcons name="playlist-play" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No playlists found. Create some on Deezer!
                  </Text>
                </View>
              ) : (
                deezerPlaylists.map((playlist) => (
                  <DeezerPlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    colors={colors}
                    onPress={() => handleDeezerPlaylistPress(playlist)}
                  />
                ))
              )}
            </View>
          </>
        )}

        {/* Qobuz Section */}
        {!qobuzConnected ? (
          <QobuzLoginCard colors={colors} />
        ) : (
          <>
            <QobuzUserHeader colors={colors} />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="music-box" size={20} color="#0170EA" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Qobuz Playlists</Text>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                  {qobuzPlaylists.length}
                </Text>
              </View>

              {isLoading && qobuzPlaylists.length === 0 ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              ) : qobuzPlaylists.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                  <MaterialIcons name="playlist-play" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No playlists found. Create some on Qobuz!
                  </Text>
                </View>
              ) : (
                qobuzPlaylists.map((playlist) => (
                  <QobuzPlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    colors={colors}
                    onPress={() => handleQobuzPlaylistPress(playlist)}
                  />
                ))
              )}
            </View>
          </>
        )}

        {/* Imported Playlists */}
        {importedPlaylists.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="cloud-download" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Imported</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {importedPlaylists.length}
              </Text>
            </View>

            {importedPlaylists.map((playlist) => (
              <ImportedPlaylistCard
                key={playlist.id}
                playlist={playlist}
                colors={colors}
                onPress={() => handleImportedPlaylistPress(playlist)}
              />
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            onPress={() => setShowImportInput(true)}
          >
            <MaterialIcons name="add-link" size={24} color={colors.primary} />
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Import from URL</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                Paste a link from <Text style={{ fontWeight: '700', color: colors.text }}>Spotify</Text>, <Text style={{ fontWeight: '700', color: colors.text }}>Deezer</Text>, <Text style={{ fontWeight: '700', color: colors.text }}>Qobuz</Text>, <Text style={{ fontWeight: '700', color: colors.text }}>YouTube Music</Text>, or <Text style={{ fontWeight: '700', color: colors.text }}>Apple Music</Text>
              </Text>
            </View>
          </TouchableOpacity>

          {!spotifyConnected && (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={async () => {
                try { await spotifyService.startAuth(); } catch { /* handled */ }
              }}
            >
              <MaterialCommunityIcons name="spotify" size={24} color="#1DB954" />
              <View style={styles.actionInfo}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Connect Spotify</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  Browse your playlists and play music in-app
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {!deezerConnected && (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={async () => {
                try { await deezerService.startAuth(); } catch { /* handled */ }
              }}
            >
              <MaterialCommunityIcons name="music-circle" size={24} color="#A238FF" />
              <View style={styles.actionInfo}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Connect Deezer</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  Stream music from your Deezer library
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom spacing for mini player */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mini Player */}
      <MiniPlayer />
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },

  // Login Card
  loginCard: {
    padding: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: THEME.spacing.md,
  },
  loginSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.lg,
    lineHeight: 20,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.full,
    gap: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Qobuz Login Inputs
  qobuzInput: {
    width: '100%',
    height: 44,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    fontSize: 14,
    borderWidth: 1,
    marginTop: THEME.spacing.sm,
  },

  // User Header
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.lg,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  userPlan: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Sections
  section: {
    marginBottom: THEME.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Playlist Cards
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
  },
  playlistImage: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.sm,
  },
  playlistImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '500',
  },
  playlistMeta: {
    fontSize: 13,
    marginTop: 2,
  },

  // Empty State
  emptyCard: {
    padding: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: THEME.spacing.sm,
    textAlign: 'center',
  },

  // Import Section
  importSection: {
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.lg,
  },
  importLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  importHint: {
    fontSize: 13,
    marginBottom: THEME.spacing.md,
  },
  importRow: {
    flexDirection: 'row',
    gap: 8,
  },
  importInput: {
    flex: 1,
    height: 44,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    fontSize: 14,
    borderWidth: 1,
  },
  importButton: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },

  // Action Cards
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
    gap: THEME.spacing.md,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
