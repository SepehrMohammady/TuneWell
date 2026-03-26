/**
 * TuneWell Telegram Channel Detail Screen
 * 
 * Browse and play audio files from a Telegram channel/group.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '../store/themeStore';
import { useTelegramStore } from '../store/telegramStore';
import { telegramService, TelegramAudioItem } from '../services/telegram';
import { audioService } from '../services/audio';
import { showAlert } from '../store/alertStore';
import { usePlayerStore } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';
import RNFS from 'react-native-fs';

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/telegram_audio`;

function formatDuration(seconds: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TelegramChannelDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { chatId, title } = route.params;
  const { colors } = useThemeStore();
  const { currentTrack } = usePlayerStore();
  const { audioFiles } = useTelegramStore();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const items = useMemo(() => {
    const files = audioFiles[chatId] || [];
    // Sort by date descending (newest first)
    return [...files].sort((a, b) => b.date - a.date);
  }, [audioFiles, chatId]);

  // Convert Telegram audio to a Track-like object and play
  const handlePlay = useCallback(async (item: TelegramAudioItem) => {
    try {
      setDownloadingId(item.fileId);

      // Download to cache
      const localPath = await telegramService.downloadAudio(
        item.fileId,
        CACHE_DIR,
        item.fileName.replace(/[<>:"/\\|?*]/g, '_'),
      );

      const track = {
        id: `tg_${item.fileUniqueId}`,
        uri: `file://${localPath}`,
        filePath: localPath,
        fileName: item.fileName,
        folderPath: CACHE_DIR,
        folderName: 'Telegram',
        title: item.title,
        artist: item.performer,
        album: title || 'Telegram',
        duration: item.duration,
        sampleRate: 44100,
        bitDepth: 16,
        channels: 2,
        format: item.mimeType.includes('flac') ? 'flac' : 'mp3',
        isLossless: item.mimeType.includes('flac'),
        isHighRes: false,
        isDSD: false,
        playCount: 0,
        isFavorite: false,
        moods: [] as any[],
        dateAdded: Date.now(),
        dateModified: item.date * 1000,
      };

      const queueItem = {
        id: track.id,
        track,
        addedAt: Date.now(),
        source: 'streaming' as const,
      };

      await audioService.playQueue([queueItem], 0);
    } catch (err: any) {
      showAlert('Playback Error', err.message || 'Failed to play track');
    } finally {
      setDownloadingId(null);
    }
  }, [title]);

  // Play All
  const handlePlayAll = useCallback(async () => {
    if (items.length === 0) {
      showAlert('No Audio', 'No audio files in this channel.');
      return;
    }

    try {
      setDownloadingId('__all__');

      // Download all tracks first
      const queueItems = [];
      for (const item of items) {
        const localPath = await telegramService.downloadAudio(
          item.fileId,
          CACHE_DIR,
          item.fileName.replace(/[<>:"/\\|?*]/g, '_'),
        );

        queueItems.push({
          id: `tg_${item.fileUniqueId}`,
          track: {
            id: `tg_${item.fileUniqueId}`,
            uri: `file://${localPath}`,
            filePath: localPath,
            fileName: item.fileName,
            folderPath: CACHE_DIR,
            folderName: 'Telegram',
            title: item.title,
            artist: item.performer,
            album: title || 'Telegram',
            duration: item.duration,
            sampleRate: 44100,
            bitDepth: 16,
            channels: 2,
            format: item.mimeType.includes('flac') ? 'flac' : 'mp3',
            isLossless: item.mimeType.includes('flac'),
            isHighRes: false,
            isDSD: false,
            playCount: 0,
            isFavorite: false,
            moods: [] as any[],
            dateAdded: Date.now(),
            dateModified: item.date * 1000,
          },
          addedAt: Date.now(),
          source: 'streaming' as const,
        });
      }

      await audioService.playQueue(queueItems, 0);
    } catch (err: any) {
      showAlert('Playback Error', err.message || 'Failed to play');
    } finally {
      setDownloadingId(null);
    }
  }, [items, title]);

  const renderItem = useCallback(
    ({ item }: { item: TelegramAudioItem }) => {
      const isDownloading = downloadingId === item.fileId;
      return (
        <TouchableOpacity
          style={[styles.trackRow, { borderBottomColor: colors.border }]}
          onPress={() => handlePlay(item)}
          disabled={!!downloadingId}
          activeOpacity={0.7}
        >
          <View style={[styles.playIcon, { backgroundColor: colors.surfaceLight }]}>
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="play-arrow" size={22} color={colors.primary} />
            )}
          </View>
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.trackMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {item.performer}{item.duration ? ` · ${formatDuration(item.duration)}` : ''}
              {item.fileSize ? ` · ${formatSize(item.fileSize)}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, downloadingId, handlePlay],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {items.length} audio file{items.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      {items.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0088cc' }]}
            onPress={handlePlayAll}
            disabled={!!downloadingId}
          >
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
            <Text style={styles.actionText}>Play All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.fileUniqueId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="music-note-off" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No audio files synced yet.{'\n'}Send audio to this channel and tap Sync.
            </Text>
          </View>
        }
      />

      {currentTrack && <MiniPlayer />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { paddingBottom: 100 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: { flex: 1 },
  trackTitle: { fontSize: 15, fontWeight: '500' },
  trackMeta: { fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
});
