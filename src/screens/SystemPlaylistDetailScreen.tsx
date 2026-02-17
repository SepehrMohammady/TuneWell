/**
 * TuneWell System Playlist Detail Screen
 * 
 * Shows tracks in system playlists (Favorites, Most Played, Recently Added, Recently Played).
 * Allows viewing track list, playing all, shuffling, and playing individual tracks.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { THEME } from '../config';
import { usePlayerStore, usePlaylistStore, useLibraryStore, useThemeStore } from '../store';
import { audioService } from '../services/audio';
import { scannedTrackToTrack } from '../services/metadata';
import MiniPlayer from '../components/player/MiniPlayer';

export type SystemPlaylistType = 'favorites' | 'mostPlayed' | 'recentlyAdded' | 'recentlyPlayed';

type SystemPlaylistDetailRoute = RouteProp<
  { SystemPlaylistDetail: { type: SystemPlaylistType } },
  'SystemPlaylistDetail'
>;

const PLAYLIST_INFO: Record<SystemPlaylistType, { name: string; icon: string; color: string; emptyHint: string }> = {
  favorites: {
    name: 'Favorites',
    icon: 'favorite',
    color: '#FF6B6B',
    emptyHint: 'Tap the heart icon on the player screen to add favorites.',
  },
  mostPlayed: {
    name: 'Most Played',
    icon: 'bolt',
    color: '#4ECDC4',
    emptyHint: 'Play some tracks and they will appear here.',
  },
  recentlyAdded: {
    name: 'Recently Added',
    icon: 'star',
    color: '#45B7D1',
    emptyHint: 'Scan your music library to add tracks.',
  },
  recentlyPlayed: {
    name: 'Recently Played',
    icon: 'history',
    color: '#96CEB4',
    emptyHint: 'Play some tracks and they will appear here.',
  },
};

export default function SystemPlaylistDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<SystemPlaylistDetailRoute>();
  const { type } = route.params;

  const { currentTrack } = usePlayerStore();
  const { colors, mode: themeMode } = useThemeStore();
  const { tracks } = useLibraryStore();
  const {
    getFavoriteIds,
    getRecentlyPlayedIds,
    getMostPlayedIds,
    trackMeta,
  } = usePlaylistStore();

  const info = PLAYLIST_INFO[type];

  // Get track IDs based on playlist type
  const trackIds = useMemo(() => {
    switch (type) {
      case 'favorites':
        return getFavoriteIds();
      case 'mostPlayed':
        return getMostPlayedIds(50);
      case 'recentlyAdded':
        // Sort by modifiedAt descending (most recent first)
        return [...tracks]
          .sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0))
          .slice(0, 50)
          .map(t => t.id);
      case 'recentlyPlayed':
        return getRecentlyPlayedIds(50);
      default:
        return [];
    }
  }, [type, getFavoriteIds, getMostPlayedIds, getRecentlyPlayedIds, tracks, trackMeta]);

  // Resolve track IDs to full track objects
  const playlistTracks = useMemo(() => {
    return trackIds
      .map(id => tracks.find(t => t.id === id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
  }, [trackIds, tracks]);

  // Play all tracks
  const handlePlayAll = useCallback(async (shuffle = false) => {
    if (playlistTracks.length === 0) return;

    let tracksToPlay = [...playlistTracks];
    if (shuffle) {
      tracksToPlay = tracksToPlay.sort(() => Math.random() - 0.5);
    }

    const queueItems = tracksToPlay.map(track => ({
      id: `queue_${track.id}_${Date.now()}`,
      track: scannedTrackToTrack(track),
      addedAt: Date.now(),
      source: 'playlist' as const,
    }));

    await audioService.playQueue(queueItems, 0);
  }, [playlistTracks]);

  // Play single track (with full queue context)
  const handlePlayTrack = useCallback(async (index: number) => {
    const queueItems = playlistTracks.map(track => ({
      id: `queue_${track.id}_${Date.now()}`,
      track: scannedTrackToTrack(track),
      addedAt: Date.now(),
      source: 'playlist' as const,
    }));

    await audioService.playQueue(queueItems, index);
  }, [playlistTracks]);

  // Format duration
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Render track item
  const renderTrackItem = ({ item, index }: { item: typeof playlistTracks[0]; index: number }) => (
    <TouchableOpacity
      style={[styles.trackItem, { backgroundColor: colors.surface }]}
      onPress={() => handlePlayTrack(index)}
      activeOpacity={0.7}
    >
      {item.artwork ? (
        <Image source={{ uri: item.artwork }} style={styles.trackArtwork} />
      ) : (
        <View style={[styles.trackArtwork, styles.trackArtworkPlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="music-note" size={20} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.trackInfo}>
        <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title || 'Unknown'}
        </Text>
        <Text style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.artist || 'Unknown'} • {formatDuration(item.duration || 0)}
        </Text>
      </View>

      <MaterialIcons name="play-arrow" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={[styles.headerIconBg, { backgroundColor: info.color }]}>
            <MaterialIcons name={info.icon} size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{info.name}</Text>
        </View>
        <Text style={[styles.trackCount, { color: colors.textSecondary }]}>
          {playlistTracks.length} tracks
        </Text>
      </View>

      {/* Action Buttons */}
      {playlistTracks.length > 0 && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => handlePlayAll(false)}
          >
            <MaterialIcons name="play-arrow" size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Play All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => handlePlayAll(true)}
          >
            <MaterialIcons name="shuffle" size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Shuffle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Track List */}
      {playlistTracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name={info.icon} size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No tracks yet
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            {info.emptyHint}
          </Text>
        </View>
      ) : (
        <FlatList
          data={playlistTracks}
          renderItem={renderTrackItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Mini Player */}
      {currentTrack && <MiniPlayer />}
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
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: THEME.spacing.md,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  trackCount: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    gap: THEME.spacing.xs,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: THEME.spacing.md,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.xs,
  },
  trackArtwork: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.sm,
  },
  trackArtworkPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: THEME.spacing.sm,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: THEME.spacing.sm,
    marginTop: THEME.spacing.md,
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
  },
});
