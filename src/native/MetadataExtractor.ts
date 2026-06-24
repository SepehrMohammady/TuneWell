import { NativeModules, Platform } from 'react-native';

export interface AudioMetadata {
  title: string | null;
  artist: string | null;
  album: string | null;
  albumArtist: string | null;
  genre: string | null;
  year: string | null;
  trackNumber: string | null;
  duration: number;
  bitrate: string | null;
  sampleRate: string | null;
  artwork: string | null; // Base64 encoded image
}

export interface AudioFormatInfo {
  sampleRate: number; // Hz, 0 if unknown
  channels: number; // 0 if unknown
  bitsPerSample: number; // 0 if unknown (e.g. encoded/lossy or undeterminable)
  mimeType: string;
}

interface MetadataExtractorModule {
  extractMetadata(filePath: string): Promise<AudioMetadata>;
  getAudioFormat(uriOrPath: string): Promise<AudioFormatInfo>;
}

const { MetadataExtractor } = NativeModules;

/**
 * Read the REAL audio format (sample rate, channels, bit depth) for one track.
 * Returns zeros for fields that can't be determined — callers must treat 0 as
 * "unknown" and not display a fabricated value.
 */
export async function getAudioFormat(uriOrPath: string): Promise<AudioFormatInfo | null> {
  if (Platform.OS !== 'android' || !MetadataExtractor?.getAudioFormat) {
    return null;
  }
  try {
    return await (MetadataExtractor as MetadataExtractorModule).getAudioFormat(uriOrPath);
  } catch (error) {
    console.error('Failed to read audio format:', error);
    return null;
  }
}

/**
 * Extract metadata from an audio file using native APIs
 * Currently only supported on Android
 */
export async function extractMetadata(filePath: string): Promise<AudioMetadata> {
  if (Platform.OS !== 'android') {
    // Return empty metadata for non-Android platforms
    return {
      title: null,
      artist: null,
      album: null,
      albumArtist: null,
      genre: null,
      year: null,
      trackNumber: null,
      duration: 0,
      bitrate: null,
      sampleRate: null,
      artwork: null,
    };
  }

  if (!MetadataExtractor) {
    console.warn('MetadataExtractor native module not available');
    return {
      title: null,
      artist: null,
      album: null,
      albumArtist: null,
      genre: null,
      year: null,
      trackNumber: null,
      duration: 0,
      bitrate: null,
      sampleRate: null,
      artwork: null,
    };
  }

  try {
    return await (MetadataExtractor as MetadataExtractorModule).extractMetadata(filePath);
  } catch (error) {
    console.error('Failed to extract metadata:', error);
    return {
      title: null,
      artist: null,
      album: null,
      albumArtist: null,
      genre: null,
      year: null,
      trackNumber: null,
      duration: 0,
      bitrate: null,
      sampleRate: null,
      artwork: null,
    };
  }
}

export default {
  extractMetadata,
};
