import RNFS from 'react-native-fs';
import type { ScannedTrack } from '../services/libraryScanner';
import type { TelegramAudioItem } from '../services/telegram';

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/telegram_audio`;

export function telegramItemToScannedTrack(
  item: TelegramAudioItem,
  channelTitle?: string,
): ScannedTrack {
  const sanitizedName = item.fileName.replace(/[<>:"/\\|?*]/g, '_');
  const ext = item.fileName.match(/\.[^/.]+$/)?.[0] || '.mp3';

  return {
    id: `tg_${item.fileUniqueId}`,
    uri: `file://${CACHE_DIR}/${sanitizedName}`,
    filename: item.fileName,
    path: `${CACHE_DIR}/${sanitizedName}`,
    folder: CACHE_DIR,
    extension: ext,
    size: item.fileSize,
    modifiedAt: item.date * 1000,
    title: item.title || item.fileName.replace(/\.[^/.]+$/, ''),
    artist: item.performer || 'Unknown Artist',
    album: channelTitle || 'Telegram',
    duration: item.duration,
    mimeType: item.mimeType,
  };
}

export function resolveTrackId(
  trackId: string,
  libraryTracks: ScannedTrack[],
  telegramAudioFiles: Record<number, TelegramAudioItem[]>,
  telegramChannels?: { id: number; title: string }[],
): ScannedTrack | undefined {
  // Try library first
  const libTrack = libraryTracks.find(t => t.id === trackId);
  if (libTrack) return libTrack;

  // Try Telegram
  if (trackId.startsWith('tg_')) {
    const fileUniqueId = trackId.slice(3);
    for (const [chatIdStr, chatFiles] of Object.entries(telegramAudioFiles)) {
      const item = chatFiles.find(f => f.fileUniqueId === fileUniqueId);
      if (item) {
        const channelTitle = telegramChannels?.find(
          c => c.id === parseInt(chatIdStr, 10),
        )?.title;
        return telegramItemToScannedTrack(item, channelTitle);
      }
    }
  }

  return undefined;
}
