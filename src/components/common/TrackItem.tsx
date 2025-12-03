/**
 * TuneWell TrackItem Component
 * Displays a single track in a list with artwork, metadata, and actions
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Track } from '../../types';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { getQualityColor } from '../../theme';
import { formatDuration, getQualityLabel } from '../../utils/formatters';

interface TrackItemProps {
  track: Track;
  onPress: () => void;
  onLongPress?: () => void;
  isPlaying?: boolean;
  showArtwork?: boolean;
  showQuality?: boolean;
  showIndex?: boolean;
  index?: number;
  rightAction?: React.ReactNode;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
  onPress,
  onLongPress,
  isPlaying = false,
  showArtwork = true,
  showQuality = true,
  showIndex = false,
  index,
  rightAction,
}) => {
  const qualityLabel = getQualityLabel(track.bitDepth, track.sampleRate, track.format);
  const qualityColor = getQualityColor(track.bitDepth, track.sampleRate, track.format);

  return (
    <TouchableOpacity
      style={[styles.container, isPlaying && styles.containerPlaying]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {showIndex && index !== undefined && (
        <View style={styles.indexContainer}>
          <Text style={[styles.index, isPlaying && styles.indexPlaying]}>
            {index + 1}
          </Text>
        </View>
      )}

      {showArtwork && (
        <View style={styles.artworkContainer}>
          {track.artworkUri ? (
            <Image source={{ uri: track.artworkUri }} style={styles.artwork} />
          ) : (
            <View style={styles.artworkPlaceholder}>
              <Text style={styles.artworkPlaceholderText}>♪</Text>
            </View>
          )}
          {isPlaying && (
            <View style={styles.playingOverlay}>
              <View style={styles.playingIndicator}>
                <View style={[styles.bar, styles.bar1]} />
                <View style={[styles.bar, styles.bar2]} />
                <View style={[styles.bar, styles.bar3]} />
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.info}>
        <Text
          style={[styles.title, isPlaying && styles.titlePlaying]}
          numberOfLines={1}
        >
          {track.title || track.fileName}
        </Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist || 'Unknown Artist'}
          </Text>
          {track.album && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.album} numberOfLines={1}>
                {track.album}
              </Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {showQuality && qualityLabel && (
          <View style={[styles.qualityBadge, { borderColor: qualityColor }]}>
            <Text style={[styles.qualityText, { color: qualityColor }]}>
              {qualityLabel}
            </Text>
          </View>
        )}
        <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
        {rightAction && <View style={styles.action}>{rightAction}</View>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
  },
  containerPlaying: {
    backgroundColor: Colors.background.secondary,
  },

  // Index
  indexContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  index: {
    ...Typography.bodyMedium,
    color: Colors.text.tertiary,
  },
  indexPlaying: {
    color: Colors.primary,
  },

  // Artwork
  artworkContainer: {
    width: 48,
    height: 48,
    marginRight: Spacing.md,
    position: 'relative',
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.artwork,
  },
  artworkPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.artwork,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 20,
    color: Colors.text.tertiary,
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay.medium,
    borderRadius: BorderRadius.artwork,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 16,
    gap: 2,
  },
  bar: {
    width: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  bar1: {
    height: 8,
  },
  bar2: {
    height: 14,
  },
  bar3: {
    height: 10,
  },

  // Info
  info: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    ...Typography.titleSmall,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  titlePlaying: {
    color: Colors.primary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artist: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    flexShrink: 1,
  },
  separator: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginHorizontal: Spacing.xs,
  },
  album: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    flexShrink: 1,
  },

  // Right section
  rightSection: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  qualityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  qualityText: {
    ...Typography.technical,
    fontSize: 8,
  },
  duration: {
    ...Typography.mono,
    color: Colors.text.tertiary,
  },
  action: {
    marginTop: Spacing.xs,
  },
});
