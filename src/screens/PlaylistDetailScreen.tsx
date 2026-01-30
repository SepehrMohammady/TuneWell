/**
 * TuneWell Playlist Detail Screen
 * 
 * Shows tracks in a playlist with ability to:
 * - Play individual tracks
 * - Remove tracks from playlist
 * - Play all / Shuffle all
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { THEME, MOOD_CATEGORIES, MoodId } from '../config';
import { usePlayerStore, usePlaylistStore, useLibraryStore, useThemeStore } from '../store';
import { audioService } from '../services/audio';
import { scannedTrackToTrack } from '../services/metadata';
import MiniPlayer from '../components/player/MiniPlayer';
import { PlaylistsStackParamList } from '../types';

type PlaylistDetailRouteProp = RouteProp<PlaylistsStackParamList, 'MoodPlaylistDetail'>;

export default function PlaylistDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<PlaylistDetailRouteProp>();
  const { mood } = route.params;
  
  const { currentTrack } = usePlayerStore();
  const { colors, mode: themeMode } = useThemeStore();
  const { tracks } = useLibraryStore();
  const { getTracksByMood, removeMoodFromTrack, trackMeta } = usePlaylistStore();
  
  // Get mood info
  const moodInfo = MOOD_CATEGORIES.find(m => m.id === mood);
  const moodName = moodInfo?.name || mood;
  const moodIcon = moodInfo?.icon || 'music-note';
  
  // Get tracks for this mood - use trackMeta as dependency to update when moods change
  const playlistTracks = useMemo(() => {
    const trackIds = getTracksByMood(mood);
    return trackIds
      .map(id => tracks.find(t => t.id === id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
  }, [mood, getTracksByMood, tracks, trackMeta]);
  
  // Play all tracks
  const handlePlayAll = useCallback(async (shuffle = false) => {
    if (playlistTracks.length === 0) {
      Alert.alert('Empty Playlist', 'No tracks in this playlist.');
      return;
    }
    
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
  
  // Play single track
  const handlePlayTrack = useCallback(async (index: number) => {
    const queueItems = playlistTracks.map(track => ({
      id: `queue_${track.id}_${Date.now()}`,
      track: scannedTrackToTrack(track),
      addedAt: Date.now(),
      source: 'playlist' as const,
    }));
    
    await audioService.playQueue(queueItems, index);
  }, [playlistTracks]);
  
  // Remove track from playlist
  const handleRemoveTrack = useCallback((trackId: string, trackTitle: string) => {
    Alert.alert(
      'Remove from Playlist',
      `Remove "${trackTitle}" from ${moodName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeMoodFromTrack(trackId, mood);
          },
        },
      ]
    );
  }, [mood, moodName, removeMoodFromTrack]);
  
  // Format duration
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Render track item
  const renderTrackItem = ({ item, index }: { item: typeof playlistTracks[0], index: number }) => (
    <TouchableOpacity 
      style={[styles.trackItem, { backgroundColor: colors.surface }]}
      onPress={() => handlePlayTrack(index)}
      activeOpacity={0.7}
    >
      {/* Artwork */}
      {item.artwork ? (
        <Image source={{ uri: item.artwork }} style={styles.trackArtwork} />
      ) : (
        <View style={[styles.trackArtwork, styles.trackArtworkPlaceholder, { backgroundColor: colors.surfaceLight }]}>
          <MaterialIcons name="music-note" size={20} color={colors.textMuted} />
        </View>
      )}
      
      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title || 'Unknown'}
        </Text>
        <Text style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.artist || 'Unknown'} • {formatDuration(item.duration || 0)}
        </Text>
      </View>
      
      {/* Remove Button */}
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => handleRemoveTrack(item.id, item.title || 'Unknown')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="remove-circle-outline" size={24} color={colors.error || '#FF6B6B'} />
      </TouchableOpacity>
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
          <MaterialCommunityIcons name={moodIcon} size={24} color={colors.text} style={styles.headerIcon} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{moodName}</Text>
        </View>
        <Text style={[styles.trackCount, { color: colors.textSecondary }]}>
          {playlistTracks.length} tracks
        </Text>
      </View>
      
      {/* Action Buttons */}
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
      
      {/* Track List */}
      {playlistTracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name={moodIcon} size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No tracks in this playlist yet
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Add tracks from the player screen
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
  headerIcon: {
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
  removeButton: {
    padding: THEME.spacing.sm,
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
