/**
 * TuneWell Metadata Service
 * 
 * Service for reading audio file metadata including:
 * - ID3 tags (MP3)
 * - Vorbis comments (OGG, FLAC)
 * - APE tags
 * - FLAC metadata
 * - DSD metadata (DSF, DFF)
 */

import type { Track } from '../../types';
import type { ScannedTrack } from '../libraryScanner';
import {
  SUPPORTED_AUDIO_FORMATS,
  LOSSLESS_FORMATS,
  DSD_FORMATS,
  SAMPLE_RATES,
} from '../../config/constants';

// Type for metadata parsing result
export interface AudioMetadata {
  // Basic info
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  composer?: string;
  
  // Audio properties
  duration: number;
  sampleRate: number;
  bitDepth: number;
  bitRate?: number;
  channels: number;
  format: string;
  codec?: string;
  
  // Artwork
  artworkData?: string; // Base64 encoded
  artworkMimeType?: string;
  
  // ReplayGain
  replayGainTrack?: number;
  replayGainAlbum?: number;
}

/**
 * Extract file extension from path
 */
function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filePath.slice(lastDot).toLowerCase();
}

/**
 * Get file name from path
 */
function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Get folder path from file path
 */
function getFolderPath(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const lastSlash = normalizedPath.lastIndexOf('/');
  return lastSlash !== -1 ? normalizedPath.slice(0, lastSlash) : '';
}

/**
 * Get folder name from file path
 */
function getFolderName(filePath: string): string {
  const folderPath = getFolderPath(filePath);
  const parts = folderPath.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Check if format is lossless
 */
function isLosslessFormat(format: string): boolean {
  return LOSSLESS_FORMATS.includes(format.toLowerCase() as any);
}

/**
 * Check if format is DSD
 */
function isDSDFormat(format: string): boolean {
  return DSD_FORMATS.includes(format.toLowerCase() as any);
}

/**
 * Check if audio is high-resolution (>= 48kHz and >= 24-bit for PCM, or DSD)
 */
function isHighResAudio(sampleRate: number, bitDepth: number, isDSD: boolean): boolean {
  if (isDSD) return true;
  return sampleRate >= SAMPLE_RATES.DVD_AUDIO && bitDepth >= 24;
}

/**
 * Check if file is a supported audio format
 */
export function isSupportedAudioFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return SUPPORTED_AUDIO_FORMATS.includes(ext as any);
}

/**
 * Parse audio metadata from file
 * 
 * Note: In a real implementation, this would use a native module
 * like music-metadata or FFmpeg to parse the actual file metadata.
 * This is a placeholder that returns default values.
 */
export async function parseAudioMetadata(
  filePath: string,
  fileUri: string
): Promise<AudioMetadata | null> {
  if (!isSupportedAudioFile(filePath)) {
    return null;
  }

  const ext = getFileExtension(filePath);
  const fileName = getFileName(filePath);
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  const isDSD = isDSDFormat(ext);
  
  // Default metadata - in real implementation, this would be parsed from file
  const metadata: AudioMetadata = {
    title: nameWithoutExt,
    artist: undefined,
    album: undefined,
    albumArtist: undefined,
    genre: undefined,
    year: undefined,
    trackNumber: undefined,
    discNumber: undefined,
    composer: undefined,
    
    // Audio properties - defaults that would be parsed
    duration: 0,
    sampleRate: isDSD ? SAMPLE_RATES.DSD64 : SAMPLE_RATES.CD_QUALITY,
    bitDepth: isDSD ? 1 : 16,
    bitRate: undefined,
    channels: 2,
    format: ext.replace('.', '').toUpperCase(),
    codec: undefined,
    
    // ReplayGain
    replayGainTrack: undefined,
    replayGainAlbum: undefined,
  };

  return metadata;
}

/**
 * Create a Track object from file path and metadata
 */
export function createTrackFromMetadata(
  filePath: string,
  fileUri: string,
  metadata: AudioMetadata
): Track {
  const ext = getFileExtension(filePath);
  const fileName = getFileName(filePath);
  const folderPath = getFolderPath(filePath);
  const folderName = getFolderName(filePath);
  
  const isDSD = isDSDFormat(ext);
  const isLossless = isLosslessFormat(ext);
  const isHighRes = isHighResAudio(metadata.sampleRate, metadata.bitDepth, isDSD);

  return {
    id: `track_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    uri: fileUri,
    filePath,
    fileName,
    folderPath,
    folderName,
    
    // Metadata
    title: metadata.title || fileName.replace(/\.[^/.]+$/, ''),
    artist: metadata.artist || 'Unknown Artist',
    album: metadata.album || 'Unknown Album',
    albumArtist: metadata.albumArtist,
    genre: metadata.genre,
    year: metadata.year,
    trackNumber: metadata.trackNumber,
    discNumber: metadata.discNumber,
    composer: metadata.composer,
    
    // Audio Properties
    duration: metadata.duration,
    sampleRate: metadata.sampleRate,
    bitDepth: metadata.bitDepth,
    bitRate: metadata.bitRate,
    channels: metadata.channels,
    format: metadata.format,
    codec: metadata.codec,
    isLossless,
    isHighRes,
    isDSD,
    
    // Artwork
    artworkUri: undefined,
    artworkColor: undefined,
    
    // User Data
    playCount: 0,
    lastPlayedAt: undefined,
    rating: undefined,
    isFavorite: false,
    moods: [],
    
    // Timestamps
    dateAdded: Date.now(),
    dateModified: Date.now(),
    
    // ReplayGain
    replayGainTrack: metadata.replayGainTrack,
    replayGainAlbum: metadata.replayGainAlbum,
  };
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format sample rate to readable string
 */
export function formatSampleRate(sampleRate: number): string {
  if (sampleRate >= 1000000) {
    // DSD rates
    const dsdMultiplier = Math.round(sampleRate / 44100);
    return `DSD${dsdMultiplier}`;
  }
  return `${(sampleRate / 1000).toFixed(sampleRate % 1000 === 0 ? 0 : 1)} kHz`;
}

/**
 * Format bit depth to readable string
 */
export function formatBitDepth(bitDepth: number, isDSD: boolean): string {
  if (isDSD) return '1-bit';
  return `${bitDepth}-bit`;
}

/**
 * Format bit rate to readable string
 */
export function formatBitRate(bitRate: number): string {
  if (bitRate >= 1000) {
    return `${Math.round(bitRate / 1000)} kbps`;
  }
  return `${bitRate} bps`;
}

/**
 * Get audio quality label
 */
export function getQualityLabel(track: Track): string {
  if (track.isDSD) {
    return formatSampleRate(track.sampleRate);
  }
  if (track.isHighRes) {
    return `Hi-Res ${formatSampleRate(track.sampleRate)}/${formatBitDepth(track.bitDepth, false)}`;
  }
  if (track.isLossless) {
    return 'Lossless';
  }
  return track.format.toUpperCase();
}

/**
 * Convert ScannedTrack to Track format for playback
 */
export function scannedTrackToTrack(scannedTrack: ScannedTrack): Track {
  return {
    id: scannedTrack.id,
    uri: scannedTrack.uri,
    filePath: scannedTrack.path,
    fileName: scannedTrack.filename,
    folderPath: scannedTrack.folder,
    folderName: scannedTrack.folder.split('/').pop() || 'Music',
    title: scannedTrack.title || scannedTrack.filename.replace(/\.[^/.]+$/, ''),
    artist: scannedTrack.artist || 'Unknown Artist',
    album: scannedTrack.album || 'Unknown Album',
    albumArtist: scannedTrack.albumArtist,
    genre: scannedTrack.genre,
    year: scannedTrack.year ? parseInt(scannedTrack.year, 10) : undefined,
    trackNumber: scannedTrack.trackNumber ? parseInt(scannedTrack.trackNumber, 10) : undefined,
    duration: scannedTrack.duration || 0,
    sampleRate: scannedTrack.sampleRate ? parseInt(scannedTrack.sampleRate, 10) : 44100,
    bitDepth: 16,
    bitRate: scannedTrack.bitrate ? parseInt(scannedTrack.bitrate, 10) : undefined,
    channels: 2,
    format: scannedTrack.extension.replace('.', '').toUpperCase(),
    isLossless: ['.flac', '.wav', '.aiff', '.alac', '.ape'].includes(scannedTrack.extension.toLowerCase()),
    isHighRes: scannedTrack.sampleRate ? parseInt(scannedTrack.sampleRate, 10) > 48000 : false,
    isDSD: ['.dff', '.dsf', '.dsd'].includes(scannedTrack.extension.toLowerCase()),
    artworkUri: scannedTrack.albumArtUri || scannedTrack.artwork || undefined,
    playCount: 0,
    isFavorite: false,
    moods: [],
    dateAdded: scannedTrack.modifiedAt,
    dateModified: scannedTrack.modifiedAt,
  };
}

export default {
  isSupportedAudioFile,
  parseAudioMetadata,
  createTrackFromMetadata,
  formatDuration,
  formatSampleRate,
  formatBitDepth,
  formatBitRate,
  getQualityLabel,
  scannedTrackToTrack,
};
