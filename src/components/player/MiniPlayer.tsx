/**
 * TuneWell Mini Player Component
 * 
 * Compact now-playing bar shown at the bottom of screens.
 * Swipe down to dismiss, tap to open full player.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { THEME, ROUTES } from '../../config';
import { usePlayerStore } from '../../store';
import { audioService } from '../../services/audio';

export default function MiniPlayer() {
  const navigation = useNavigation();
  const { currentTrack, state, progress, setCurrentTrack } = usePlayerStore();
  const [isDismissed, setIsDismissed] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  
  const isPlaying = state === 'playing';

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          // Dismiss
          Animated.timing(translateY, {
            toValue: 150,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setIsDismissed(true);
            // Stop playback
            audioService.stop();
          });
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!currentTrack || isDismissed) {
    return null;
  }

  const progressPercent = progress.duration > 0
    ? (progress.position / progress.duration) * 100
    : 0;

  // Fire-and-forget handlers for immediate UI response
  // The store state will be updated by TrackPlayer event listeners
  const handlePlayPause = () => {
    audioService.togglePlayPause().catch(error => {
      console.error('Play/pause error:', error);
    });
  };

  const handlePrevious = () => {
    audioService.skipToPrevious().catch(error => {
      console.error('Previous error:', error);
    });
  };

  const handleNext = () => {
    audioService.skipToNext().catch(error => {
      console.error('Next error:', error);
    });
  };

  return (
    <Animated.View 
      style={[styles.container, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.touchable}
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
              <MaterialIcons name="music-note" size={24} color={THEME.colors.textMuted} />
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
            <TouchableOpacity style={styles.controlButton} onPress={handlePrevious}>
              <MaterialIcons name="skip-previous" size={28} color={THEME.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
              <MaterialIcons 
                name={isPlaying ? 'pause' : 'play-arrow'} 
                size={32} 
                color={THEME.colors.text} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleNext}>
              <MaterialIcons name="skip-next" size={28} color={THEME.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
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
  touchable: {
    flex: 1,
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
