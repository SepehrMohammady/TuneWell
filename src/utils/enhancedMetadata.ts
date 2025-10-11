// Enhanced metadata extraction with better filename parsing and demo data
import { AudioTrack } from '../types/navigation';
import { parseFilenameForMetadata } from './metadataExtractor';

/**
 * Create enhanced demo tracks with realistic metadata for testing
 */
export const createEnhancedDemoTracks = (): AudioTrack[] => [
  {
    id: 'demo_1',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: 354000, // 5:54
    uri: 'demo://queen-bohemian-rhapsody.flac',
    format: 'flac',
    bitrate: 1411200,
    sampleRate: 44100,
    bitDepth: 16,
    filePath: '/demo/Queen - A Night at the Opera - Bohemian Rhapsody.flac',
    fileSize: 84000000, // ~84MB FLAC
    dateAdded: new Date().toISOString(),
    playCount: 0,
    isFavorite: false,
    albumArt: 'https://upload.wikimedia.org/wikipedia/en/4/4d/Queen_A_Night_At_The_Opera.png',
  },
  {
    id: 'demo_2', 
    title: 'Hotel California',
    artist: 'Eagles',
    album: 'Hotel California',
    duration: 391000, // 6:31
    uri: 'demo://eagles-hotel-california.mp3',
    format: 'mp3',
    bitrate: 320000,
    sampleRate: 44100,
    filePath: '/demo/Eagles - Hotel California - Hotel California.mp3',
    fileSize: 15000000, // ~15MB MP3
    dateAdded: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    playCount: 5,
    isFavorite: true,
    albumArt: 'https://upload.wikimedia.org/wikipedia/en/4/49/Hotelcalifornia.jpg',
  },
  {
    id: 'demo_jacobsnote',
    title: 'Jacob\'s Note',
    artist: 'Swedish House Mafia, Jacob Mühlrad',
    album: 'Unknown Album', // MX Player shows this as separate from album
    duration: 64000, // 1:04 (matches screenshot)
    uri: 'demo://swedish-house-mafia-jacobs-note.flac',
    format: 'FLAC', // Matches screenshot
    bitrate: 4194304, // High bitrate for FLAC
    sampleRate: 44100,
    bitDepth: 16,
    filePath: '/cache/DocumentPicker/Swedish House Mafia, Jacob Mühlrad - Jacob\'s Note.flac',
    fileSize: 41943040, // ~40MB FLAC (realistic for 1:04 FLAC)
    dateAdded: new Date().toISOString(), // Recently added
    playCount: 0,
    isFavorite: false,
    albumArt: undefined, // No album art shown in screenshot
  },
  {
    id: 'demo_3',
    title: 'Stairway to Heaven',
    artist: 'Led Zeppelin',
    album: 'Led Zeppelin IV',
    duration: 482000, // 8:02
    uri: 'demo://led-zeppelin-stairway-to-heaven.wav',
    format: 'wav',
    bitrate: 1411200,
    sampleRate: 44100,
    bitDepth: 16,
    filePath: '/demo/Led Zeppelin - Led Zeppelin IV - Stairway to Heaven.wav',
    fileSize: 100000000, // ~100MB WAV
    dateAdded: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    playCount: 12,
    isFavorite: true,
    albumArt: 'https://upload.wikimedia.org/wikipedia/en/2/26/Led_Zeppelin_-_Led_Zeppelin_IV.jpg',
  }
];

/**
 * Enhanced audio track creation from file with better metadata parsing
 */
export const createEnhancedAudioTrack = (
  filename: string,
  uri: string,
  fileSize?: number
): AudioTrack => {
  // Parse the filename for metadata
  const metadata = parseFilenameForMetadata(filename);
  const format = filename.split('.').pop()?.toLowerCase() || 'unknown';
  
  // Generate realistic metadata based on filename patterns
  let { title = 'Unknown Title', artist = 'Unknown Artist', album = 'Unknown Album' } = metadata;
  
  // Smart guessing based on common filename patterns
  const cleanFilename = filename.replace(/\.[^/.]+$/, '');
  
  // Pattern matching for better extraction
  const patterns = [
    // "Artist - Album - Track Title"
    /^(.+?)\s*-\s*(.+?)\s*-\s*(.+)$/,
    // "Artist - Track Title"
    /^(.+?)\s*-\s*(.+)$/,
    // "Track Number - Artist - Title"
    /^\d+\.?\s*-?\s*(.+?)\s*-\s*(.+)$/,
    // "(Year) Artist - Album - Title"
    /^\(\d{4}\)\s*(.+?)\s*-\s*(.+?)\s*-\s*(.+)$/,
  ];
  
  for (const pattern of patterns) {
    const match = cleanFilename.match(pattern);
    if (match) {
      if (match.length === 4) {
        // Artist - Album - Title
        artist = match[1]?.trim() || artist;
        album = match[2]?.trim() || album;
        title = match[3]?.trim() || title;
        break;
      } else if (match.length === 3) {
        // Artist - Title
        artist = match[1]?.trim() || artist;
        title = match[2]?.trim() || title;
        break;
      }
    }
  }
  
  // If still unknown, try folder-based guessing (simulate)
  if (artist === 'Unknown Artist' && uri.includes('/')) {
    const pathParts = uri.split('/');
    if (pathParts.length >= 2) {
      // Try to extract artist from path: /Music/Artist/Album/Track.mp3
      const possibleArtist = pathParts[pathParts.length - 3];
      const possibleAlbum = pathParts[pathParts.length - 2];
      
      if (possibleArtist && !possibleArtist.includes('.')) {
        artist = possibleArtist;
      }
      if (possibleAlbum && !possibleAlbum.includes('.')) {
        album = possibleAlbum;
      }
    }
  }
  
  return {
    id: `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    artist,
    album,
    duration: 0, // Will be extracted when playing
    uri,
    format,
    bitrate: getBitrateEstimate(format, fileSize),
    sampleRate: getSampleRateEstimate(format),
    bitDepth: getBitDepthEstimate(format),
    filePath: uri,
    fileSize: fileSize || 0,
    dateAdded: new Date().toISOString(),
    playCount: 0,
    isFavorite: false,
    albumArt: undefined, // Album art extraction requires native modules
  };
};

/**
 * Estimate bitrate based on format and file size
 */
const getBitrateEstimate = (format: string, fileSize?: number): number | undefined => {
  const fmt = format.toLowerCase();
  
  // If we have file size, calculate approximate bitrate
  if (fileSize && fileSize > 0) {
    // Rough estimate: assume 3-4 minute average track
    const averageDurationSeconds = 210; // 3.5 minutes
    const bitsPerSecond = (fileSize * 8) / averageDurationSeconds;
    
    // Round to common bitrates
    if (bitsPerSecond > 1000000) return Math.round(bitsPerSecond / 100000) * 100000;
    if (bitsPerSecond > 100000) return Math.round(bitsPerSecond / 10000) * 10000;
    return Math.round(bitsPerSecond / 1000) * 1000;
  }
  
  // Default estimates by format
  switch (fmt) {
    case 'flac':
      return 1411200; // CD quality
    case 'wav':
    case 'aiff':
      return 1411200; // CD quality  
    case 'mp3':
      return 320000; // High quality MP3
    case 'aac':
    case 'm4a':
      return 256000; // High quality AAC
    case 'ogg':
      return 320000; // High quality OGG
    default:
      return undefined;
  }
};

/**
 * Estimate sample rate based on format
 */
const getSampleRateEstimate = (format: string): number => {
  const fmt = format.toLowerCase();
  
  switch (fmt) {
    case 'dsf':
    case 'dff':
      return 2822400; // DSD64
    case 'flac':
    case 'wav':
    case 'aiff':
      return 44100; // CD quality (could be higher)
    default:
      return 44100; // Standard
  }
};

/**
 * Estimate bit depth based on format  
 */
const getBitDepthEstimate = (format: string): number | undefined => {
  const fmt = format.toLowerCase();
  
  switch (fmt) {
    case 'flac':
    case 'wav':
    case 'aiff':
      return 16; // CD quality (could be 24-bit)
    case 'dsf':
    case 'dff':
      return 1; // DSD is 1-bit
    default:
      return undefined; // Compressed formats don't have bit depth
  }
};

/**
 * Generate a realistic album art placeholder URL
 */
export const generateAlbumArtPlaceholder = (artist: string, album: string): string => {
  // Create a placeholder with artist and album info
  const cleanArtist = encodeURIComponent(artist.replace(/[^a-zA-Z0-9\s]/g, ''));
  const cleanAlbum = encodeURIComponent(album.replace(/[^a-zA-Z0-9\s]/g, ''));
  
  // Use a placeholder service (this is just for demo - real implementation would need actual album art)
  return `https://via.placeholder.com/300x300/1a1a1a/ffffff?text=${cleanArtist}%0A${cleanAlbum}`;
};