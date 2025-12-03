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

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { THEME, ROUTES } from '../config';
import { usePlayerStore, useEQStore } from '../store';
import { formatDuration } from '../services/metadata';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH - 80;

export default function PlayerScreen() {
  const navigation = useNavigation();
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

  const isPlaying = state === 'playing';

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🎵</Text>
          <Text style={styles.emptyStateText}>No track playing</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>↓</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Now Playing</Text>
          {currentTrack.isHighRes && (
            <View style={styles.qualityBadge}>
              <Text style={styles.qualityBadgeText}>Hi-Res</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.QUEUE as never)}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>≡</Text>
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
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Text style={styles.artworkPlaceholderText}>🎵</Text>
          </View>
        )}
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {currentTrack.artist} • {currentTrack.album}
        </Text>
        
        {/* Audio Quality Info */}
        <View style={styles.audioInfo}>
          <Text style={styles.audioInfoText}>
            {currentTrack.format.toUpperCase()} • {currentTrack.sampleRate / 1000}kHz • {currentTrack.bitDepth}-bit
          </Text>
          {eqEnabled && (
            <View style={styles.eqBadge}>
              <Text style={styles.eqBadgeText}>EQ</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
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
          <Text style={[styles.secondaryControlText, isShuffled && styles.secondaryControlTextActive]}>
            🔀
          </Text>
        </TouchableOpacity>

        {/* Previous */}
        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.controlButtonText}>⏮</Text>
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity style={styles.playButton}>
          <Text style={styles.playButtonText}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.controlButtonText}>⏭</Text>
        </TouchableOpacity>

        {/* Repeat */}
        <TouchableOpacity
          style={[styles.secondaryControl, repeatMode !== 'off' && styles.secondaryControlActive]}
          onPress={cycleRepeatMode}
        >
          <Text style={[styles.secondaryControlText, repeatMode !== 'off' && styles.secondaryControlTextActive]}>
            {repeatMode === 'track' ? '🔂' : '🔁'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.bottomAction}>
          <Text style={styles.bottomActionText}>❤️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomAction}
          onPress={() => navigation.navigate(ROUTES.EQUALIZER as never)}
        >
          <Text style={styles.bottomActionText}>🎛️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomAction}>
          <Text style={styles.bottomActionText}>📋</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomAction}>
          <Text style={styles.bottomActionText}>⋮</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    marginLeft: THEME.spacing.sm,
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
  },
  artworkPlaceholderText: {
    fontSize: 80,
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
    color: THEME.colors.textMuted,
  },
  eqBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    marginLeft: THEME.spacing.sm,
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
    backgroundColor: THEME.colors.primary,
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
  secondaryControlActive: {
    // Active state
  },
  secondaryControlText: {
    fontSize: 20,
    opacity: 0.5,
  },
  secondaryControlTextActive: {
    opacity: 1,
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
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: THEME.spacing.md,
  },
  playButtonText: {
    fontSize: 36,
    color: THEME.colors.text,
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
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
  },
  emptyStateText: {
    fontSize: 18,
    color: THEME.colors.textSecondary,
  },
});
