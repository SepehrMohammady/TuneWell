/**
 * TuneWell Mini Player Component
 * 
 * Compact now-playing bar shown at the bottom of screens.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME, ROUTES } from '../../config';
import { usePlayerStore } from '../../store';

export default function MiniPlayer() {
  const navigation = useNavigation();
  const { currentTrack, state, progress } = usePlayerStore();
  
  const isPlaying = state === 'playing';

  if (!currentTrack) {
    return null;
  }

  const progressPercent = progress.duration > 0
    ? (progress.position / progress.duration) * 100
    : 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate(ROUTES.PLAYER as never)}
      activeOpacity={0.95}
    >
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Artwork */}
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

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>

        {/* Quality Badge */}
        {currentTrack.isHighRes && (
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityBadgeText}>HR</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton}>
            <Text style={styles.controlButtonText}>⏮</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton}>
            <Text style={styles.playButtonText}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Text style={styles.controlButtonText}>⏭</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60, // Above tab bar
    left: 0,
    right: 0,
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  progressContainer: {
    height: 2,
    backgroundColor: THEME.colors.surfaceLight,
  },
  progressBar: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.md,
  },
  artworkPlaceholder: {
    backgroundColor: THEME.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 24,
  },
  trackInfo: {
    flex: 1,
    marginLeft: THEME.spacing.md,
    marginRight: THEME.spacing.sm,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  trackArtist: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  qualityBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    marginRight: THEME.spacing.sm,
  },
  qualityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: 20,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  playButtonText: {
    fontSize: 18,
    color: THEME.colors.text,
  },
});
