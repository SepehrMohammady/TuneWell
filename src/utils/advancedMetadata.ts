// Advanced metadata extraction system for TuneWell
// Combines multiple approaches to maximize metadata extraction success
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { AudioTrack } from '../types/navigation';

export interface EnhancedAudioMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  albumArt?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  format?: string;
  fileSize?: number;
}

/**
 * Advanced filename pattern matching with more comprehensive patterns
 */
export const extractFromFilename = (filename: string, filepath?: string): Partial<EnhancedAudioMetadata> => {
  const cleanFilename = filename.replace(/\.[^/.]+$/, '');
  let title = cleanFilename;
  let artist = 'Unknown Artist';
  let album = 'Unknown Album';
  let trackNumber: number | undefined;
  
  // Enhanced pattern matching system
  // Pattern 1: "01. Artist - Album - Title"
  let match = cleanFilename.match(/^(\d+)\.?\s*(.+?)\s*-\s*(.+?)\s*-\s*(.+)$/);
  if (match) {
    return {
      trackNumber: parseInt(match[1]),
      artist: match[2].trim(),
      album: match[3].trim(),
      title: match[4].trim()
    };
  }
  
  // Pattern 2: "Artist - Album - Title"
  match = cleanFilename.match(/^(.+?)\s*-\s*(.+?)\s*-\s*(.+)$/);
  if (match) {
    return {
      artist: match[1].trim(),
      album: match[2].trim(),
      title: match[3].trim()
    };
  }
  
  // Pattern 3: "01 - Artist - Title"
  match = cleanFilename.match(/^(\d+)\.?\s*-?\s*(.+?)\s*-\s*(.+)$/);
  if (match) {
    return {
      trackNumber: parseInt(match[1]),
      artist: match[2].trim(),
      title: match[3].trim()
    };
  }
  
  // Pattern 4: "Artist - Title"  
  match = cleanFilename.match(/^(.+?)\s*-\s*(.+)$/);
  if (match) {
    return {
      artist: match[1].trim(),
      title: match[2].trim()
    };
  }
  
  // Pattern 5: "01. Title"
  match = cleanFilename.match(/^(\d+)\.?\s*(.+)$/);
  if (match) {
    return {
      trackNumber: parseInt(match[1]),
      title: match[2].trim()
    };
  }
  
  // Try to extract from folder path if available
  if (filepath) {
    const pathParts = filepath.split('/').filter(part => part.length > 0);
    if (pathParts.length >= 3) {
      // Assume structure: /Music/Artist/Album/Track.mp3
      const possibleArtist = pathParts[pathParts.length - 3];
      const possibleAlbum = pathParts[pathParts.length - 2];
      
      if (possibleArtist && !possibleArtist.includes('.') && artist === 'Unknown Artist') {
        artist = possibleArtist;
      }
      if (possibleAlbum && !possibleAlbum.includes('.') && album === 'Unknown Album') {
        album = possibleAlbum;
      }
    }
  }
  
  return { title, artist, album, trackNumber };
};

/**
 * Extract format and quality information from filename/file
 */
export const extractQualityInfo = (filename: string, fileSize?: number): Partial<EnhancedAudioMetadata> => {
  const extension = filename.split('.').pop()?.toLowerCase() || 'mp3';
  
  const formatMap: Record<string, { bitrate: number; sampleRate: number; bitDepth?: number }> = {
    'flac': { bitrate: 1411000, sampleRate: 44100, bitDepth: 16 },
    'wav': { bitrate: 1411000, sampleRate: 44100, bitDepth: 16 },
    'dsf': { bitrate: 2822400, sampleRate: 2822400, bitDepth: 1 }, // DSD64
    'dff': { bitrate: 2822400, sampleRate: 2822400, bitDepth: 1 },
    'mp3': { bitrate: 320000, sampleRate: 44100 },
    'aac': { bitrate: 256000, sampleRate: 44100 },
    'm4a': { bitrate: 256000, sampleRate: 44100 },
    'ogg': { bitrate: 256000, sampleRate: 44100 },
  };
  
  const defaults = formatMap[extension] || formatMap['mp3'];
  
  // Estimate actual bitrate from file size if available
  let estimatedBitrate = defaults.bitrate;
  if (fileSize && fileSize > 0) {
    // Rough estimation: fileSize (bytes) / duration (seconds) * 8
    // Without duration, use file size to estimate quality
    if (extension === 'mp3') {
      if (fileSize > 10000000) estimatedBitrate = 320000; // >10MB likely 320kbps
      else if (fileSize > 5000000) estimatedBitrate = 192000; // >5MB likely 192kbps
      else estimatedBitrate = 128000; // smaller files likely 128kbps
    }
  }
  
  return {
    format: extension.toUpperCase(),
    bitrate: estimatedBitrate,
    sampleRate: defaults.sampleRate,
    bitDepth: defaults.bitDepth,
    fileSize
  };
};

/**
 * Comprehensive metadata extraction that tries multiple methods
 */
export const extractComprehensiveMetadata = async (
  uri: string, 
  filename: string, 
  fileSize?: number
): Promise<EnhancedAudioMetadata> => {
  
  console.log(`🎵 Extracting metadata for: ${filename}`);
  
  // Start with filename parsing
  const filenameMetadata = extractFromFilename(filename, uri);
  const qualityInfo = extractQualityInfo(filename, fileSize);
  
  console.log(`📄 Filename parsing result:`, filenameMetadata);
  
  let duration = 0;
  let additionalMetadata: Partial<EnhancedAudioMetadata> = {};
  
  // Try to get duration from Audio.Sound
  try {
    console.log(`🎼 Attempting to load audio for duration...`);
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );
    
    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.durationMillis) {
      duration = status.durationMillis;
      console.log(`⏱️ Duration extracted: ${Math.round(duration / 1000)}s`);
    }
    
    await sound.unloadAsync();
  } catch (error) {
    console.warn(`⚠️ Could not load audio file for duration:`, error);
  }
  
  // Try MediaLibrary if available (limited in Expo Go)
  try {
    console.log(`📚 Attempting MediaLibrary metadata extraction...`);
    
    // This is limited in Expo Go but worth trying
    const asset = await MediaLibrary.createAssetAsync(uri);
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
    
    if ((assetInfo as any).metadata) {
      additionalMetadata = {
        artist: (assetInfo as any).metadata.artist || filenameMetadata.artist,
        album: (assetInfo as any).metadata.album || filenameMetadata.album,
        title: (assetInfo as any).metadata.title || filenameMetadata.title,
        genre: (assetInfo as any).metadata.genre,
        year: (assetInfo as any).metadata.year,
      };
      console.log(`📚 MediaLibrary metadata:`, additionalMetadata);
    }
  } catch (error) {
    console.warn(`⚠️ MediaLibrary extraction failed (expected in Expo Go):`, error);
  }
  
  // Combine all metadata sources
  const finalMetadata: EnhancedAudioMetadata = {
    title: additionalMetadata.title || filenameMetadata.title || 'Unknown Title',
    artist: additionalMetadata.artist || filenameMetadata.artist || 'Unknown Artist', 
    album: additionalMetadata.album || filenameMetadata.album || 'Unknown Album',
    duration,
    genre: additionalMetadata.genre,
    year: additionalMetadata.year,
    trackNumber: filenameMetadata.trackNumber,
    ...qualityInfo
  };
  
  console.log(`✅ Final metadata result:`, finalMetadata);
  
  return finalMetadata;
};

/**
 * Create AudioTrack with comprehensive metadata extraction
 */
export const createAudioTrackWithComprehensiveMetadata = async (
  uri: string,
  filename: string, 
  fileSize?: number
): Promise<AudioTrack> => {
  
  const metadata = await extractComprehensiveMetadata(uri, filename, fileSize);
  
  return {
    id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    duration: metadata.duration,
    uri,
    format: metadata.format || 'MP3',
    bitrate: metadata.bitrate,
    sampleRate: metadata.sampleRate,
    bitDepth: metadata.bitDepth,
    filePath: uri,
    fileSize: metadata.fileSize || 0,
    dateAdded: new Date().toISOString(),
    playCount: 0,
    isFavorite: false,
    albumArt: metadata.albumArt, // Will be undefined in Expo Go
  };
};

/**
 * Test the comprehensive metadata extraction with sample data
 */
export const testComprehensiveExtraction = () => {
  console.log('🧪 Testing Comprehensive Metadata Extraction System');
  
  const testCases = [
    {
      filename: 'Swedish House Mafia, Jacob Mühlrad - Jacob\'s Note.flac',
      uri: '/music/cache/Swedish House Mafia, Jacob Mühlrad - Jacob\'s Note.flac',
      fileSize: 41943040 // ~40MB FLAC
    },
    {
      filename: '03. Jacob\'s Note.flac', 
      uri: '/music/cache/DocumentPicker/03. Jacob\'s Note.flac',
      fileSize: 41943040
    },
    {
      filename: 'Jacob\'s Note.flac',
      uri: '/music/Swedish House Mafia/Until Now/Jacob\'s Note.flac', 
      fileSize: 41943040
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test Case ${index + 1}: ${testCase.filename} ---`);
    const filenameResult = extractFromFilename(testCase.filename, testCase.uri);
    const qualityResult = extractQualityInfo(testCase.filename, testCase.fileSize);
    
    console.log('Filename extraction:', filenameResult);
    console.log('Quality info:', qualityResult);
  });
};