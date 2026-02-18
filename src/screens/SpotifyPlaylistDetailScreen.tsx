/**
 * TuneWell Spotify Playlist Detail Screen
 * 
 * Shows tracks from a Spotify playlist or imported playlist.
 * Allows playing individual tracks or the whole playlist.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { THEME, ROUTES } from '../config';
import { useStreamingStore, usePlayerStore, useThemeStore } from '../store';
import { spotifyService, deezerService, qobuzService } from '../services/streaming';
import { audioService } from '../services/audio/AudioService';
import type { StreamingTrack, QueueItem, RootStackParamList } from '../types';

type SpotifyPlaylistDetailRoute = RouteProp<RootStackParamList, 'SpotifyPlaylistDetail'>;

export default function SpotifyPlaylistDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SpotifyPlaylistDetailRoute>();
  const { playlistId } = route.params;
  const { colors, mode: themeMode } = useThemeStore();
  const { spotifyPlaylists, importedPlaylists, getSpotifyPlaylistTracks, setSpotifyPlaylistTracks } = useStreamingStore();
  
  const [tracks, setTracks] = useState<StreamingTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistImage, setPlaylistImage] = useState<string | undefined>();
  const [playlistOwner, setPlaylistOwner] = useState('');
  const [playlistSource, setPlaylistSource] = useState<'spotify' | 'deezer' | 'qobuz' | 'imported'>('spotify');
  const [expectedTrackCount, setExpectedTrackCount] = useState<number>(0);

  useEffect(() => {
    loadPlaylistTracks();
  }, [playlistId]);

  const loadPlaylistTracks = async () => {
    setLoading(true);
    
    // Check if it's a Spotify playlist
    const spotifyPlaylist = spotifyPlaylists.find(p => p.id === playlistId);
    if (spotifyPlaylist) {
      setPlaylistName(spotifyPlaylist.name);
      setPlaylistImage(spotifyPlaylist.imageUrl);
      setPlaylistOwner(spotifyPlaylist.ownerName);
      setPlaylistSource('spotify');
      setExpectedTrackCount(spotifyPlaylist.trackCount);
      
      // Show cached tracks immediately if available
      const cachedTracks = getSpotifyPlaylistTracks(playlistId);
      if (cachedTracks.length > 0) {
        setTracks(cachedTracks);
        setLoading(false);
      }
      
      try {
        const fetchedTracks = await spotifyService.fetchPlaylistTracks(playlistId);
        
        if (fetchedTracks.length > 0) {
          setTracks(fetchedTracks);
          // Cache tracks for future use
          setSpotifyPlaylistTracks(playlistId, fetchedTracks);
        } else if (cachedTracks.length === 0) {
          // Only show empty-tracks alert if we had no cached data either
          setTracks([]);
          try {
            const meta = await spotifyService.fetchPlaylistMetadata(playlistId);
            if (meta && meta.trackCount > 0) {
              Alert.alert(
                'Tracks Unavailable',
                `This playlist has ${meta.trackCount} tracks but they could not be loaded.\n\n` +
                'This usually happens when your Spotify app is in Development Mode.\n\n' +
                'To fix this:\n' +
                '1. Disconnect and reconnect your Spotify account\n' +
                '2. Make sure you are added as a user in the Spotify Developer Dashboard',
              );
            }
          } catch (metaErr) {
            Alert.alert(
              'Tracks Unavailable',
              'Could not load tracks for this playlist. Try disconnecting and reconnecting your Spotify account.',
            );
          }
        }
        // If fetchedTracks is empty but cachedTracks had data, keep showing cached data
      } catch (error: any) {
        console.error('[PlaylistDetail] Failed to load tracks:', error);
        // If we already have cached tracks showing, don't clear them
        if (cachedTracks.length === 0) {
          const msg = error?.message || 'Failed to load playlist tracks';
          if (msg.includes('Access denied') || msg.includes('FORBIDDEN')) {
            Alert.alert(
              'Spotify Access Restricted',
              'This playlist cannot be loaded. Your Spotify app may be in Development Mode which restricts access to playlists owned by other users.\n\n' +
              'To fix this:\n' +
              '1. Disconnect and reconnect your Spotify account\n' +
              '2. Make sure you are added as a user in the Spotify Developer Dashboard',
            );
          } else if (!msg.includes('rate limit')) {
            // Don't show error alert for rate limits if we have cached data
            Alert.alert('Error', msg);
          }
        }
      }
    } else {
      // Check imported playlists
      const imported = importedPlaylists.find(p => p.id === playlistId);
      if (imported) {
        setPlaylistName(imported.name);
        setPlaylistImage(imported.imageUrl);
        setPlaylistOwner(imported.source);
        setPlaylistSource(imported.source === 'deezer' ? 'deezer' : imported.source === 'qobuz' ? 'qobuz' : 'imported');
        setTracks(imported.tracks);
        setExpectedTrackCount(imported.trackCount);
      }
    }
    
    setLoading(false);
  };

  const handlePlayTrack = useCallback(async (track: StreamingTrack, index: number) => {
    try {
      // Convert track using the appropriate service
      const convertTrack = (t: StreamingTrack) => {
        switch (playlistSource) {
          case 'deezer': return deezerService.deezerTrackToTrack(t);
          case 'qobuz': return qobuzService.qobuzTrackToTrack(t);
          default: return spotifyService.spotifyTrackToTrack(t);
        }
      };

      // Convert all tracks to queue items
      const queueItems: QueueItem[] = tracks.map((t, i) => ({
        id: `streaming_${t.id}_${Date.now()}_${i}`,
        track: convertTrack(t),
        addedAt: Date.now(),
        source: 'streaming' as const,
        sourceId: playlistId,
      }));

      await audioService.playQueue(queueItems, index);
      navigation.navigate(ROUTES.PLAYER);
    } catch (error: any) {
      Alert.alert('Playback Error', error.message || 'Failed to play track');
    }
  }, [tracks, playlistId, playlistSource, navigation]);

  const handlePlayAll = useCallback(async () => {
    if (tracks.length === 0) return;
    await handlePlayTrack(tracks[0], 0);
  }, [tracks, handlePlayTrack]);

  const handleShuffleAll = useCallback(async () => {
    if (tracks.length === 0) return;
    const randomIndex = Math.floor(Math.random() * tracks.length);
    await handlePlayTrack(tracks[randomIndex], randomIndex);
  }, [tracks, handlePlayTrack]);

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderTrack = useCallback(({ item, index }: { item: StreamingTrack; index: number }) => (
    <TouchableOpacity
      style={[styles.trackItem, { backgroundColor: colors.surface }]}
      onPress={() => handlePlayTrack(item, index)}
      activeOpacity={0.7}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.trackImage} />
      ) : (
        <View style={[styles.trackImagePlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="music-note" size={20} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.trackInfo}>
        <Text style={[styles.trackName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.artist} · {item.album}
        </Text>
      </View>
      <Text style={[styles.trackDuration, { color: colors.textMuted }]}>
        {formatDuration(item.duration)}
      </Text>
    </TouchableOpacity>
  ), [colors, handlePlayTrack]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} 
        backgroundColor={colors.background} 
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {playlistName || 'Playlist'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Playlist Info */}
      <View style={styles.playlistHeader}>
        {playlistImage ? (
          <Image source={{ uri: playlistImage }} style={styles.playlistCover} />
        ) : (
          <View style={[styles.playlistCoverPlaceholder, { backgroundColor: colors.surfaceLight }]}>
            <MaterialIcons name="playlist-play" size={48} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.playlistDetails}>
          <Text style={[styles.playlistTitle, { color: colors.text }]} numberOfLines={2}>
            {playlistName}
          </Text>
          <Text style={[styles.playlistSubtitle, { color: colors.textSecondary }]}>
            {tracks.length > 0 ? tracks.length : expectedTrackCount} tracks · {playlistOwner}
          </Text>
          <View style={styles.playlistActions}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: '#1DB954' }]}
              onPress={handlePlayAll}
            >
              <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
              <Text style={styles.playButtonText}>Play</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shuffleButton, { backgroundColor: colors.surfaceLight }]}
              onPress={handleShuffleAll}
            >
              <MaterialIcons name="shuffle" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Track List */}
      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={renderTrack}
          contentContainerStyle={styles.trackList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="music-off" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No tracks in this playlist
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: THEME.spacing.md,
  },

  // Playlist Header
  playlistHeader: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  playlistCover: {
    width: 120,
    height: 120,
    borderRadius: THEME.borderRadius.md,
  },
  playlistCoverPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: THEME.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistDetails: {
    flex: 1,
    marginLeft: THEME.spacing.md,
    justifyContent: 'center',
  },
  playlistTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  playlistSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  playlistActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: THEME.spacing.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.full,
    gap: 4,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  shuffleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Track List
  trackList: {
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  trackImage: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.sm,
  },
  trackImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  trackName: {
    fontSize: 15,
    fontWeight: '500',
  },
  trackArtist: {
    fontSize: 13,
    marginTop: 2,
  },
  trackDuration: {
    fontSize: 13,
    marginLeft: THEME.spacing.sm,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 15,
    marginTop: THEME.spacing.md,
  },
});
