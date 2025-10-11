// Audio metadata extraction utilities
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import { AudioTrack } from '../types/navigation';

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  albumArt?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
}

/**
 * Extract metadata from MediaLibrary Asset
 */
export const extractMetadataFromAsset = async (asset: MediaLibrary.Asset): Promise<AudioMetadata> => {
  try {
    // Get additional info from MediaLibrary
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
    
    return {
      title: asset.filename.replace(/\.[^/.]+$/, '') || 'Unknown Title',
      artist: (assetInfo as any).artist || 'Unknown Artist',
      album: (assetInfo as any).album || 'Unknown Album', 
      duration: asset.duration * 1000, // Convert to milliseconds
      genre: (assetInfo as any).genre,
      year: asset.creationTime ? new Date(asset.creationTime).getFullYear() : undefined,
      // Note: Album art extraction requires native modules not available in Expo Go
      albumArt: undefined,
    };
  } catch (error) {
    console.warn('Failed to extract metadata from asset:', error);
    return {
      title: asset.filename.replace(/\.[^/.]+$/, '') || 'Unknown Title',
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      duration: asset.duration ? asset.duration * 1000 : 0,
    };
  }
};

/**
 * Extract basic metadata from file using Audio.Sound
 */
export const extractMetadataFromUri = async (uri: string, filename: string): Promise<AudioMetadata> => {
  try {
    // Load the audio file to get duration
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );
    
    const status = await sound.getStatusAsync();
    const duration = status.isLoaded ? status.durationMillis || 0 : 0;
    
    // Clean up
    await sound.unloadAsync();
    
    // Parse filename for basic info
    const cleanTitle = filename.replace(/\.[^/.]+$/, '');
    let title = cleanTitle;
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';
    
    // Try to parse common filename patterns
    // Pattern: "Artist - Title"
    if (cleanTitle.includes(' - ')) {
      const parts = cleanTitle.split(' - ');
      if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }
    }
    
    // Pattern: "Artist - Album - Title"
    if (cleanTitle.includes(' - ') && cleanTitle.split(' - ').length >= 3) {
      const parts = cleanTitle.split(' - ');
      artist = parts[0].trim();
      album = parts[1].trim();
      title = parts.slice(2).join(' - ').trim();
    }
    
    return {
      title,
      artist,
      album,
      duration,
      albumArt: undefined, // Not available in Expo Go
    };
    
  } catch (error) {
    console.warn('Failed to extract metadata from URI:', error);
    
    // Fallback: just parse filename
    const cleanTitle = filename.replace(/\.[^/.]+$/, '');
    return {
      title: cleanTitle || 'Unknown Title',
      artist: 'Unknown Artist', 
      album: 'Unknown Album',
      duration: 0,
    };
  }
};

/**
 * Create AudioTrack with extracted metadata
 */
export const createAudioTrackWithMetadata = async (
  id: string,
  uri: string, 
  filename: string,
  fileSize?: number,
  asset?: MediaLibrary.Asset
): Promise<AudioTrack> => {
  let metadata: AudioMetadata;
  
  if (asset) {
    // Use MediaLibrary asset if available
    metadata = await extractMetadataFromAsset(asset);
  } else {
    // Extract from URI
    metadata = await extractMetadataFromUri(uri, filename);
  }
  
  const format = filename.split('.').pop()?.toLowerCase() || 'unknown';
  
  return {
    id,
    title: metadata.title || 'Unknown Title',
    artist: metadata.artist || 'Unknown Artist', 
    album: metadata.album || 'Unknown Album',
    duration: metadata.duration || 0,
    uri,
    format,
    bitrate: getBitrateForFormat(format),
    sampleRate: 44100, // Default
    bitDepth: format === 'flac' ? 16 : undefined,
    filePath: uri,
    fileSize: fileSize || 0,
    dateAdded: new Date().toISOString(),
    playCount: 0,
    isFavorite: false,
    albumArt: metadata.albumArt,
  };
};

/**
 * Get estimated bitrate for audio format
 */
const getBitrateForFormat = (format: string): number | undefined => {
  switch (format.toLowerCase()) {
    case 'flac':
      return 1411200; // ~1411 kbps
    case 'wav':
      return 1411200; // ~1411 kbps
    case 'mp3':
      return 320000; // Assume high quality MP3
    case 'aac':
    case 'm4a':
      return 256000; // ~256 kbps
    case 'ogg':
      return 320000; // ~320 kbps
    default:
      return undefined;
  }
};

/**
 * Enhanced filename parsing for better metadata extraction
 */
export const parseFilenameForMetadata = (filename: string): Partial<AudioMetadata> => {
  const cleanName = filename.replace(/\.[^/.]+$/, '');
  
  // Common patterns to try
  const patterns = [
    // "01. Artist - Title.mp3"
    /^(\d+\.?\s*)?(.+?)\s*-\s*(.+)$/,
    // "Artist - Album - Title.mp3"  
    /^(.+?)\s*-\s*(.+?)\s*-\s*(.+)$/,
    // "Title (Artist).mp3"
    /^(.+?)\s*\((.+?)\)$/,
    // Just the title
    /^(.+)$/
  ];
  
  for (const pattern of patterns) {
    const match = cleanName.match(pattern);
    if (match) {
      if (pattern.source.includes('(.+?)\\s*-\\s*(.+?)\\s*-\\s*(.+)')) {
        // Artist - Album - Title
        return {
          artist: match[1].trim(),
          album: match[2].trim(), 
          title: match[3].trim(),
        };
      } else if (pattern.source.includes('(.+?)\\s*-\\s*(.+)')) {
        // Artist - Title (or Track - Title)
        const part1 = match[2]?.trim();
        const part2 = match[3]?.trim();
        
        // Check if first part is a track number
        if (match[1] && /^\d+\.?\s*$/.test(match[1])) {
          return {
            title: part2 || part1,
            artist: part1 && part2 ? part1 : 'Unknown Artist',
          };
        } else {
          return {
            artist: part1,
            title: part2,
          };
        }
      } else if (pattern.source.includes('(.+?)\\s*\\((.+?)\\)')) {
        // Title (Artist)
        return {
          title: match[1].trim(),
          artist: match[2].trim(),
        };
      } else {
        // Just title
        return {
          title: match[1].trim(),
        };
      }
    }
  }
  
  return {
    title: cleanName || 'Unknown Title',
  };
};