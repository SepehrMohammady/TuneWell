/**
 * TuneWell — shareTrack
 *
 * Reusable helper to share an audio track via the OS share sheet.
 * Copies the file to the cache dir with a clean name, then shares it.
 * Falls back to sharing track text when no local file is available.
 */

import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { showAlert } from '../store/alertStore';

export interface ShareableTrack {
  title?: string;
  artist?: string;
  album?: string;
  filePath?: string; // absolute path, e.g. /storage/emulated/0/Music/song.mp3
  format?: string; // e.g. 'mp3' or '.mp3'
}

let sharing = false; // guard against double-taps

function mimeForExt(ext: string): string {
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg';
    case 'flac':
      return 'audio/flac';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    case 'aac':
      return 'audio/aac';
    case 'ogg':
      return 'audio/ogg';
    case 'opus':
      return 'audio/opus';
    default:
      return `audio/${ext}`;
  }
}

function buildMessage(track: ShareableTrack): string {
  return [
    `🎵 ${track.title || 'audio'}`,
    `🎤 ${track.artist || 'Unknown'}`,
    track.album ? `💿 ${track.album}` : null,
    '',
    '🎧 Shared via TuneWell',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function shareTrack(track: ShareableTrack): Promise<void> {
  if (sharing) return;
  sharing = true;

  try {
    const title = track.title || 'audio';
    const artist = track.artist || 'Unknown';
    const filePath = track.filePath;

    // No usable local file — share text instead.
    if (!filePath || !filePath.startsWith('/')) {
      await Share.open({
        message: buildMessage(track),
        title: `${title} - ${artist}`,
        failOnCancel: false,
      });
      return;
    }

    const ext = (track.format || filePath.split('.').pop() || 'mp3')
      .toLowerCase()
      .replace('.', '');
    const safeTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    const safeArtist = artist.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    const shareFileName = `${safeArtist} - ${safeTitle}.${ext}`;
    const cachePath = `${RNFS.CachesDirectoryPath}/${shareFileName}`;

    // File no longer on disk (e.g. an uncached stream) — share text instead.
    if (!(await RNFS.exists(filePath))) {
      await Share.open({
        message: buildMessage(track),
        title: `${title} - ${artist}`,
        failOnCancel: false,
      });
      return;
    }

    await RNFS.copyFile(filePath, cachePath);

    await Share.open({
      url: `file://${cachePath}`,
      type: mimeForExt(ext),
      filename: shareFileName,
      message: buildMessage(track),
      title: `${title} - ${artist}`,
      subject: `${title} - ${artist}`,
      failOnCancel: false,
    });

    // Clean up the cached copy after the share sheet has had time to use it.
    setTimeout(() => {
      RNFS.unlink(cachePath).catch(() => {});
    }, 30000);
  } catch (err: any) {
    const msg = err?.message || '';
    if (!msg.includes('cancel') && !msg.includes('dismiss')) {
      showAlert('Share Error', 'Could not share this track');
    }
  } finally {
    sharing = false;
  }
}
