/**
 * TuneWell Player Screen
 * 
 * Full-screen now playing view with:
 * - Album artwork
 * - Track info and audio quality badges
 * - Playback controls
 * - Progress bar
 * - Queue access
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { THEME, ROUTES, MOOD_CATEGORIES } from '../config';
import { usePlayerStore, useEQStore, usePlaylistStore, useThemeStore } from '../store';
import { audioService } from '../services/audio';
import { formatDuration } from '../services/metadata';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH - 80;

export default function PlayerScreen() {
  const navigation = useNavigation();
  const { colors, mode: themeMode } = useThemeStore();
  const {
    currentTrack,
    state,
    progress,
    repeatMode,
    isShuffled,
    cycleRepeatMode,
    toggleShuffle,
  } = usePlayerStore();
  
  const { isEnabled: eqEnabled } = useEQStore();
  const { 
    toggleFavorite, 
    isFavorite, 
    getTrackMoods, 
    addMoodToTrack, 
    removeMoodFromTrack,
    customPlaylists,
    addToPlaylist,
  } = usePlaylistStore();

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const isPlaying = state === 'playing';
  const trackIsFavorite = currentTrack ? isFavorite(currentTrack.id) : false;
  const trackMoods = currentTrack ? getTrackMoods(currentTrack.id) : [];

  const handleToggleFavorite = useCallback(() => {
    if (!currentTrack) return;
    const newState = toggleFavorite(currentTrack.id);
    // Could show a toast here
  }, [currentTrack, toggleFavorite]);

  const handleMoodToggle = useCallback((moodId: string) => {
    if (!currentTrack) return;
    if (trackMoods.includes(moodId as any)) {
      removeMoodFromTrack(currentTrack.id, moodId as any);
    } else {
      addMoodToTrack(currentTrack.id, moodId as any);
    }
  }, [currentTrack, trackMoods, addMoodToTrack, removeMoodFromTrack]);

  const handleAddToPlaylist = useCallback((playlistId: string) => {
    if (!currentTrack) return;
    addToPlaylist(playlistId, [currentTrack.id]);
    setShowPlaylistModal(false);
    Alert.alert('Added', 'Track added to playlist');
  }, [currentTrack, addToPlaylist]);

  if (!currentTrack) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <MaterialIcons name="music-off" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyStateText, { color: colors.text }]}>No track playing</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <MaterialIcons name="keyboard-arrow-down" size={32} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Now Playing</Text>
          {currentTrack.isHighRes && (
            <View style={[styles.qualityBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.qualityBadgeText, { color: colors.background }]}>Hi-Res</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.QUEUE as never)}
          style={styles.headerButton}
        >
          <MaterialIcons name="queue-music" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Artwork */}
      <View style={styles.artworkContainer}>
        {currentTrack.artworkUri ? (
          <Image
            source={{ uri: currentTrack.artworkUri }}
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="music-note" size={80} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
          {currentTrack.artist} • {currentTrack.album}
        </Text>
        
        {/* Audio Quality Info */}
        <View style={styles.audioInfo}>
          <Text style={[styles.audioInfoText, { color: colors.textMuted }]}>
            {currentTrack.format.toUpperCase()} • {currentTrack.sampleRate / 1000}kHz • {currentTrack.bitDepth}-bit
          </Text>
          {eqEnabled && (
            <View style={[styles.eqBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.eqBadgeText, { color: colors.background }]}>EQ</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary },
              {
                width: progress.duration > 0
                  ? `${(progress.position / progress.duration) * 100}%`
                  : '0%',
              },
            ]}
          />
        </View>
        <View style={styles.progressTime}>
          <Text style={styles.timeText}>{formatDuration(progress.position)}</Text>
          <Text style={styles.timeText}>{formatDuration(progress.duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Shuffle */}
        <TouchableOpacity
          style={[styles.secondaryControl, isShuffled && styles.secondaryControlActive]}
          onPress={toggleShuffle}
        >
          <MaterialIcons 
            name="shuffle" 
            size={24} 
            color={isShuffled ? colors.primary : colors.textMuted} 
          />
        </TouchableOpacity>

        {/* Previous */}
        <TouchableOpacity style={styles.controlButton} onPress={() => audioService.skipToPrevious()}>
          <MaterialIcons name="skip-previous" size={40} color={colors.text} />
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.primary }]} onPress={() => audioService.togglePlayPause()}>
          <MaterialIcons 
            name={isPlaying ? 'pause' : 'play-arrow'} 
            size={48} 
            color={colors.background} 
          />
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity style={styles.controlButton} onPress={() => audioService.skipToNext()}>
          <MaterialIcons name="skip-next" size={40} color={colors.text} />
        </TouchableOpacity>

        {/* Repeat */}
        <TouchableOpacity
          style={[styles.secondaryControl, repeatMode !== 'off' && styles.secondaryControlActive]}
          onPress={cycleRepeatMode}
        >
          <MaterialIcons 
            name={repeatMode === 'track' ? 'repeat-one' : 'repeat'} 
            size={24} 
            color={repeatMode !== 'off' ? colors.primary : colors.textMuted} 
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {/* Favorite */}
        <TouchableOpacity style={styles.bottomAction} onPress={handleToggleFavorite}>
          <MaterialIcons 
            name={trackIsFavorite ? 'favorite' : 'favorite-outline'} 
            size={28} 
            color={trackIsFavorite ? colors.primary : colors.text} 
          />
        </TouchableOpacity>
        
        {/* EQ */}
        <TouchableOpacity
          style={[styles.bottomAction, eqEnabled && styles.activeAction]}
          onPress={() => navigation.navigate(ROUTES.EQUALIZER as never)}
        >
          <MaterialIcons 
            name="tune" 
            size={28} 
            color={eqEnabled ? colors.primary : colors.text} 
          />
        </TouchableOpacity>
        
        {/* Mood */}
        <TouchableOpacity style={styles.bottomAction} onPress={() => setShowMoodModal(true)}>
          <MaterialIcons 
            name="mood" 
            size={28} 
            color={trackMoods.length > 0 ? colors.primary : colors.text} 
          />
        </TouchableOpacity>
        
        {/* Add to Playlist */}
        <TouchableOpacity style={styles.bottomAction} onPress={() => setShowPlaylistModal(true)}>
          <MaterialIcons name="playlist-add" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Mood Selection Modal */}
      <Modal visible={showMoodModal} transparent animationType="slide" onRequestClose={() => setShowMoodModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Mood</Text>
            <Text style={styles.modalSubtitle}>Tap to toggle moods for this track</Text>
            <ScrollView style={styles.moodGrid} contentContainerStyle={styles.moodGridContent}>
              {MOOD_CATEGORIES.map((mood) => {
                const isSelected = trackMoods.includes(mood.id as any);
                return (
                  <TouchableOpacity
                    key={mood.id}
                    style={[styles.moodItem, isSelected && styles.moodItemSelected]}
                    onPress={() => handleMoodToggle(mood.id)}
                  >
                    <Text style={styles.moodItemIcon}>{mood.icon}</Text>
                    <Text style={[styles.moodItemText, isSelected && styles.moodItemTextSelected]}>
                      {mood.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowMoodModal(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add to Playlist Modal */}
      <Modal visible={showPlaylistModal} transparent animationType="slide" onRequestClose={() => setShowPlaylistModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add to Playlist</Text>
            {customPlaylists.length === 0 ? (
              <View style={styles.emptyPlaylists}>
                <Text style={styles.emptyPlaylistsText}>No playlists yet</Text>
                <Text style={styles.emptyPlaylistsSubtext}>Create a playlist in the Playlists tab first</Text>
              </View>
            ) : (
              <ScrollView style={styles.playlistList}>
                {customPlaylists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.playlistItem}
                    onPress={() => handleAddToPlaylist(playlist.id)}
                  >
                    <Text style={styles.playlistItemText}>{playlist.name}</Text>
                    <Text style={styles.playlistItemCount}>{playlist.trackIds.length} tracks</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowPlaylistModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 24,
    color: THEME.colors.text,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  qualityBadge: {
    backgroundColor: THEME.colors.surfaceLight,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    marginLeft: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  qualityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  artworkContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: THEME.spacing.md,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: THEME.borderRadius.lg,
  },
  artworkPlaceholder: {
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  artworkPlaceholderText: {
    fontSize: 80,
    color: THEME.colors.textMuted,
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.xl,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  trackArtist: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  audioInfoText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  eqBadge: {
    backgroundColor: THEME.colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    marginLeft: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  eqBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  progressContainer: {
    paddingHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: THEME.colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.text,
    borderRadius: 2,
  },
  progressTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.sm,
  },
  timeText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.xl,
    paddingHorizontal: THEME.spacing.lg,
  },
  secondaryControl: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryControlActive: {},
  secondaryControlText: {
    fontSize: 20,
    color: THEME.colors.textMuted,
  },
  secondaryControlTextActive: {
    color: THEME.colors.text,
  },
  controlButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: THEME.spacing.sm,
  },
  controlButtonText: {
    fontSize: 36,
    color: THEME.colors.text,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: THEME.spacing.md,
  },
  playButtonText: {
    fontSize: 36,
    color: THEME.colors.background,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: THEME.spacing.xl,
    gap: THEME.spacing.xl,
  },
  bottomAction: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionText: {
    fontSize: 24,
    color: THEME.colors.text,
  },
  bottomActionActive: {
    color: '#FF4444',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
    color: THEME.colors.textMuted,
  },
  emptyStateText: {
    fontSize: 18,
    color: THEME.colors.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
  },
  moodGrid: {
    maxHeight: 300,
  },
  moodGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: THEME.spacing.md,
    justifyContent: 'center',
  },
  moodItem: {
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    margin: THEME.spacing.xs,
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  moodItemSelected: {
    backgroundColor: THEME.colors.text,
    borderColor: THEME.colors.text,
  },
  moodItemIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
  },
  moodItemText: {
    fontSize: 14,
    color: THEME.colors.text,
    flex: 1,
  },
  moodItemTextSelected: {
    color: THEME.colors.background,
    fontWeight: '600',
  },
  modalClose: {
    marginTop: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    marginHorizontal: THEME.spacing.lg,
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  emptyPlaylists: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  emptyPlaylistsText: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  emptyPlaylistsSubtext: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  playlistList: {
    maxHeight: 300,
    paddingHorizontal: THEME.spacing.md,
  },
  playlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
  },
  playlistItemText: {
    fontSize: 16,
    color: THEME.colors.text,
  },
  playlistItemCount: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
});
