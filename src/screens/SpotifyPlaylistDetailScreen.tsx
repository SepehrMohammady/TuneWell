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
import { spotifyService } from '../services/streaming';
import { audioService } from '../services/audio/AudioService';
import type { SpotifyTrack, QueueItem, RootStackParamList } from '../types';

type SpotifyPlaylistDetailRoute = RouteProp<RootStackParamList, 'SpotifyPlaylistDetail'>;

export default function SpotifyPlaylistDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SpotifyPlaylistDetailRoute>();
  const { playlistId } = route.params;
  const { colors, mode: themeMode } = useThemeStore();
  const { spotifyPlaylists, importedPlaylists } = useStreamingStore();
  
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistImage, setPlaylistImage] = useState<string | undefined>();
  const [playlistOwner, setPlaylistOwner] = useState('');

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
      
      try {
        const fetchedTracks = await spotifyService.fetchPlaylistTracks(playlistId);
        setTracks(fetchedTracks);
      } catch (error) {
        Alert.alert('Error', 'Failed to load playlist tracks');
      }
    } else {
      // Check imported playlists
      const imported = importedPlaylists.find(p => p.id === playlistId);
      if (imported) {
        setPlaylistName(imported.name);
        setPlaylistImage(imported.imageUrl);
        setPlaylistOwner(imported.source);
        setTracks(imported.tracks);
      }
    }
    
    setLoading(false);
  };

  const handlePlayTrack = useCallback(async (track: SpotifyTrack, index: number) => {
    try {
      // Convert all tracks to queue items
      const queueItems: QueueItem[] = tracks.map((t, i) => ({
        id: `streaming_${t.id}_${Date.now()}_${i}`,
        track: spotifyService.spotifyTrackToTrack(t),
        addedAt: Date.now(),
        source: 'streaming' as const,
        sourceId: playlistId,
      }));

      await audioService.playQueue(queueItems, index);
      navigation.navigate(ROUTES.PLAYER);
    } catch (error: any) {
      Alert.alert('Playback Error', error.message || 'Failed to play track');
    }
  }, [tracks, playlistId, navigation]);

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

  const renderTrack = useCallback(({ item, index }: { item: SpotifyTrack; index: number }) => (
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
            {tracks.length} tracks · {playlistOwner}
          </Text>
          <View style={styles.playlistActions}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: colors.primary }]}
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
