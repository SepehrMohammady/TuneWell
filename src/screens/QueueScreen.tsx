/**
 * TuneWell Queue Screen
 * 
 * View and manage the current playback queue.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { THEME } from '../config';
import { usePlayerStore } from '../store';
import { formatDuration } from '../services/metadata';
import { audioService } from '../services/audio';
import type { QueueItem } from '../types';

export default function QueueScreen() {
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const {
    queue,
    queueIndex,
    currentTrack,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  // Auto-scroll to current playing track when screen opens
  useEffect(() => {
    if (queue.length > 0 && queueIndex >= 0 && flatListRef.current) {
      // Use scrollToOffset for more reliable scrolling with large lists
      const ITEM_HEIGHT = 72; // paddingVertical(16)*2 + content(~40)
      const timer = setTimeout(() => {
        const offset = Math.max(0, (queueIndex * ITEM_HEIGHT) - 150); // Position 150px from top
        flatListRef.current?.scrollToOffset({
          offset,
          animated: true,
        });
      }, 300); // Longer delay to ensure list is fully rendered
      return () => clearTimeout(timer);
    }
  }, []); // Only run on mount

  // Handle scroll failures (item not rendered yet)
  const onScrollToIndexFailed = useCallback((info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
    const ITEM_HEIGHT = 72;
    const offset = Math.max(0, (info.index * ITEM_HEIGHT) - 150);
    flatListRef.current?.scrollToOffset({
      offset,
      animated: true,
    });
  }, []);

  const handleSkipToIndex = async (index: number) => {
    // Use audioService to properly skip to the track (updates both TrackPlayer and store)
    await audioService.skipToIndex(index);
  };

  const renderQueueItem = ({ item, index }: { item: QueueItem; index: number }) => {
    const isCurrentTrack = index === queueIndex;
    
    return (
      <TouchableOpacity
        style={[styles.queueItem, isCurrentTrack && styles.queueItemActive]}
        onPress={() => handleSkipToIndex(index)}
      >
        <View style={styles.queueItemIndex}>
          {isCurrentTrack ? (
            <MaterialIcons name="play-arrow" size={20} color={THEME.colors.primary} />
          ) : (
            <Text style={styles.queueItemIndexText}>{index + 1}</Text>
          )}
        </View>
        <View style={styles.queueItemInfo}>
          <Text
            style={[styles.queueItemTitle, isCurrentTrack && styles.queueItemTitleActive]}
            numberOfLines={1}
          >
            {item.track.title}
          </Text>
          <Text style={styles.queueItemArtist} numberOfLines={1}>
            {item.track.artist}
          </Text>
        </View>
        <Text style={styles.queueItemDuration}>
          {formatDuration(item.track.duration)}
        </Text>
        <TouchableOpacity
          style={styles.queueItemRemove}
          onPress={() => removeFromQueue(index)}
        >
          <MaterialIcons name="close" size={20} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const totalDuration = queue.reduce((sum, item) => sum + item.track.duration, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Queue</Text>
          <Text style={styles.headerSubtitle}>
            {queue.length} tracks • {formatDuration(totalDuration)}
          </Text>
        </View>
        <TouchableOpacity onPress={clearQueue} style={styles.headerButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Queue List */}
      {queue.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={queue}
          keyExtractor={(item) => item.id}
          renderItem={renderQueueItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={onScrollToIndexFailed}
          getItemLayout={(data, index) => ({
            length: 72, // paddingVertical(16)*2 + content(~40)
            offset: 72 * index,
            index,
          })}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={21}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📋</Text>
          <Text style={styles.emptyStateText}>Queue is empty</Text>
          <Text style={styles.emptyStateSubtext}>
            Add some tracks to start playing
          </Text>
        </View>
      )}

      {/* Up Next Label */}
      {queue.length > 0 && queueIndex < queue.length - 1 && (
        <View style={styles.upNextContainer}>
          <Text style={styles.upNextLabel}>
            Up Next: {queue[queueIndex + 1]?.track.title}
          </Text>
        </View>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerButton: {
    width: 60,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 24,
    color: THEME.colors.text,
  },
  clearButtonText: {
    fontSize: 14,
    color: THEME.colors.primary,
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingVertical: THEME.spacing.sm,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  queueItemActive: {
    backgroundColor: THEME.colors.surface,
  },
  queueItemIndex: {
    width: 32,
    alignItems: 'center',
  },
  queueItemIndexText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  queueItemIndexTextActive: {
    color: THEME.colors.primary,
  },
  queueItemInfo: {
    flex: 1,
    marginLeft: THEME.spacing.sm,
  },
  queueItemTitle: {
    fontSize: 15,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  queueItemTitleActive: {
    color: THEME.colors.primary,
  },
  queueItemArtist: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  queueItemDuration: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginHorizontal: THEME.spacing.sm,
  },
  queueItemRemove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueItemRemoveText: {
    fontSize: 16,
    color: THEME.colors.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: THEME.colors.text,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  upNextContainer: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  upNextLabel: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
});
