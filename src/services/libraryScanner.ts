/**
 * TuneWell Library Scanner Service
 * 
 * Scans for audio files using MediaStore API for Android compatibility.
 */

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { extractMetadata, AudioMetadata } from '../native/MetadataExtractor';
import { getAllAudioFiles, getAudioFilesInFolder, MediaStoreAudioFile } from '../native/MediaStore';

// Supported audio formats
const AUDIO_EXTENSIONS = [
  // Lossless
  '.flac', '.wav', '.aiff', '.aif', '.alac', '.ape', '.wv',
  // DSD (not playable on Android but we can show them)
  '.dff', '.dsf', '.dsd',
  // Lossy
  '.mp3', '.aac', '.m4a', '.ogg', '.opus', '.wma',
];

export interface ScannedTrack {
  id: string;
  uri: string; // content:// URI for Android, file:// for others
  filename: string;
  path: string;
  folder: string;
  extension: string;
  size: number;
  modifiedAt: number;
  // Metadata
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  albumArtUri?: string; // Album art content URI
  genre?: string;
  year?: string;
  trackNumber?: string;
  duration?: number;
  bitrate?: string;
  sampleRate?: string;
  artwork?: string; // Base64 encoded (from embedded art)
  mimeType?: string;
}

export interface ScanResult {
  tracks: ScannedTrack[];
  totalTracks: number;
  totalSize: number;
  formats: Record<string, number>;
  folders: string[];
  errors: string[];
}

/**
 * Convert a content URI to a file path that can be read
 */
const resolveContentUri = async (uri: string): Promise<string | null> => {
  // Content URIs from SAF (Storage Access Framework) need special handling
  if (uri.startsWith('content://')) {
    // For document provider URIs, we can try to use them directly with RNFS
    // Or extract the path from the URI
    try {
      // Try to decode the URI to get the actual path
      const decoded = decodeURIComponent(uri);
      
      // Check if it's an external storage document
      if (decoded.includes('primary:')) {
        const pathPart = decoded.split('primary:')[1];
        if (pathPart) {
          const basePath = RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';
          return `${basePath}/${pathPart}`;
        }
      }
      
      // For other document providers, try the decoded URI
      return decoded;
    } catch (e) {
      console.log('Failed to resolve content URI:', e);
      return null;
    }
  }
  
  return uri;
};

/**
 * Check if a file is an audio file based on extension
 */
const isAudioFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return AUDIO_EXTENSIONS.includes(ext);
};

/**
 * Get the file extension
 */
const getExtension = (filename: string): string => {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
};

/**
 * Generate a unique ID for a track
 */
const generateTrackId = (path: string): string => {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    const char = path.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `track_${Math.abs(hash).toString(16)}`;
};

/**
 * Scan a single directory for audio files (non-recursive)
 */
const scanDirectory = async (
  dirPath: string,
  onProgress?: (message: string) => void
): Promise<ScannedTrack[]> => {
  const tracks: ScannedTrack[] = [];
  
  try {
    onProgress?.(`Scanning: ${dirPath}`);
    
    const exists = await RNFS.exists(dirPath);
    if (!exists) {
      console.log('Directory does not exist:', dirPath);
      return tracks;
    }
    
    const items = await RNFS.readDir(dirPath);
    
    for (const item of items) {
      if (item.isFile() && isAudioFile(item.name)) {
        tracks.push({
          id: generateTrackId(item.path),
          uri: `file://${item.path}`,
          filename: item.name,
          path: item.path,
          folder: dirPath,
          extension: getExtension(item.name),
          size: item.size,
          modifiedAt: new Date(item.mtime || Date.now()).getTime(),
          title: item.name.replace(/\.[^/.]+$/, ''), // Use filename without extension as title
        });
      }
    }
  } catch (error) {
    console.log('Error scanning directory:', dirPath, error);
  }
  
  return tracks;
};

/**
 * Recursively scan a directory for audio files
 */
const scanDirectoryRecursive = async (
  dirPath: string,
  onProgress?: (message: string, count: number) => void,
  currentCount: number = 0,
  extractMeta: boolean = true
): Promise<ScannedTrack[]> => {
  const tracks: ScannedTrack[] = [];
  
  try {
    onProgress?.(`Scanning: ${dirPath.split('/').pop() || dirPath}`, currentCount);
    
    const exists = await RNFS.exists(dirPath);
    if (!exists) {
      console.log('Directory does not exist:', dirPath);
      return tracks;
    }
    
    const items = await RNFS.readDir(dirPath);
    
    for (const item of items) {
      if (item.isDirectory()) {
        // Recursively scan subdirectories
        const subTracks = await scanDirectoryRecursive(
          item.path, 
          onProgress, 
          currentCount + tracks.length,
          extractMeta
        );
        tracks.push(...subTracks);
      } else if (item.isFile() && isAudioFile(item.name)) {
        const track: ScannedTrack = {
          id: generateTrackId(item.path),
          uri: `file://${item.path}`,
          filename: item.name,
          path: item.path,
          folder: dirPath,
          extension: getExtension(item.name),
          size: item.size,
          modifiedAt: new Date(item.mtime || Date.now()).getTime(),
          title: item.name.replace(/\.[^/.]+$/, ''), // Default to filename
        };
        
        // Extract metadata using native module
        if (extractMeta) {
          try {
            const metadata = await extractMetadata(item.path);
            if (metadata.title) track.title = metadata.title;
            if (metadata.artist) track.artist = metadata.artist;
            if (metadata.album) track.album = metadata.album;
            if (metadata.albumArtist) track.albumArtist = metadata.albumArtist;
            if (metadata.genre) track.genre = metadata.genre;
            if (metadata.year) track.year = metadata.year;
            if (metadata.trackNumber) track.trackNumber = metadata.trackNumber;
            if (metadata.duration) track.duration = metadata.duration;
            if (metadata.bitrate) track.bitrate = metadata.bitrate;
            if (metadata.sampleRate) track.sampleRate = metadata.sampleRate;
            if (metadata.artwork) track.artwork = metadata.artwork;
          } catch (metaError) {
            console.log('Failed to extract metadata for:', item.path, metaError);
          }
        }
        
        tracks.push(track);
        
        if (tracks.length % 10 === 0) {
          onProgress?.(`Found ${currentCount + tracks.length} tracks...`, currentCount + tracks.length);
        }
      }
    }
  } catch (error) {
    console.log('Error scanning directory:', dirPath, error);
  }
  
  return tracks;
};

/**
 * Scan common music directories on Android
 */
const getCommonMusicPaths = (): string[] => {
  const basePath = RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';
  return [
    `${basePath}/Music`,
    `${basePath}/Download`,
    `${basePath}/Downloads`,
    `${basePath}/DCIM`,
    `${basePath}/media`,
    `${basePath}/Audio`,
  ];
};

/**
 * Main scan function - scans all configured folders using MediaStore
 * Uses content:// URIs for Android 11+ compatibility
 */
export const scanLibrary = async (
  folders: string[],
  onProgress?: (message: string, count: number) => void
): Promise<ScanResult> => {
  const result: ScanResult = {
    tracks: [],
    totalTracks: 0,
    totalSize: 0,
    formats: {},
    folders: [],
    errors: [],
  };
  
  if (folders.length === 0) {
    result.errors.push('No folders selected');
    return result;
  }
  
  // Resolve content URIs to file paths for matching
  const resolvedFolders: string[] = [];
  for (const folder of folders) {
    const resolved = await resolveContentUri(folder);
    if (resolved) {
      resolvedFolders.push(resolved);
    }
  }
  
  onProgress?.('Querying MediaStore...', 0);
  
  // Use MediaStore to get all audio files with content:// URIs
  if (Platform.OS === 'android') {
    try {
      const allAudioFiles = await getAllAudioFiles();
      
      onProgress?.(`Found ${allAudioFiles.length} total audio files, filtering...`, 0);
      
      // Filter to only include files from selected folders
      for (const file of allAudioFiles) {
        const fileFolder = file.folder || file.path.substring(0, file.path.lastIndexOf('/'));
        
        // Check if file is in any of the selected folders (including subfolders)
        const isInSelectedFolder = resolvedFolders.some(folder => 
          fileFolder.startsWith(folder) || file.path.startsWith(folder)
        );
        
        if (isInSelectedFolder) {
          const track: ScannedTrack = {
            id: `mediastore_${file.id}`,
            uri: file.uri, // content:// URI for playback
            filename: file.filename,
            path: file.path,
            folder: file.folder,
            extension: file.extension,
            size: file.size,
            modifiedAt: file.dateModified,
            title: file.title || file.filename.replace(/\.[^/.]+$/, ''),
            artist: file.artist || undefined,
            album: file.album || undefined,
            albumArtUri: file.albumArtUri,
            duration: file.duration,
            mimeType: file.mimeType,
          };

          result.tracks.push(track);

          if (file.folder && !result.folders.includes(file.folder)) {
            result.folders.push(file.folder);
          }
        }
      }

      // Calculate statistics
      result.totalTracks = result.tracks.length;
      result.totalSize = result.tracks.reduce((sum, track) => sum + track.size, 0);

      // Count formats
      for (const track of result.tracks) {
        const ext = track.extension.replace('.', '').toUpperCase();
        result.formats[ext] = (result.formats[ext] || 0) + 1;
      }

      onProgress?.(`Scan complete: ${result.totalTracks} tracks found`, result.totalTracks);
    } catch (error: any) {
      console.error('MediaStore scan error:', error);
      result.errors.push(`MediaStore error: ${error.message}`);
      
      // Fallback to file system scanning
      onProgress?.('Falling back to file system scan...', 0);
      for (const folder of resolvedFolders) {
        try {
          const tracks = await scanDirectoryRecursive(folder, onProgress, result.tracks.length);
          result.tracks.push(...tracks);
          result.folders.push(folder);
        } catch (err: any) {
          result.errors.push(`Error scanning ${folder}: ${err.message}`);
        }
      }
    }
  } else {
    // Non-Android: use file system scanning
    for (const folder of resolvedFolders) {
      try {
        const tracks = await scanDirectoryRecursive(folder, onProgress, result.tracks.length);
        result.tracks.push(...tracks);
        result.folders.push(folder);
      } catch (error: any) {
        result.errors.push(`Error scanning ${folder}: ${error.message}`);
      }
    }
  }
  
  return result;
};

/**
 * Scan using MediaStore API (recommended for Android 11+)
 * This returns content:// URIs that work with ExoPlayer
 */
export const scanWithMediaStore = async (
  onProgress?: (message: string, count: number) => void
): Promise<ScanResult> => {
  const result: ScanResult = {
    tracks: [],
    totalTracks: 0,
    totalSize: 0,
    formats: {},
    folders: [],
    errors: [],
  };

  if (Platform.OS !== 'android') {
    result.errors.push('MediaStore is only available on Android');
    return result;
  }

  onProgress?.('Querying MediaStore...', 0);

  try {
    const audioFiles = await getAllAudioFiles();
    
    onProgress?.(`Found ${audioFiles.length} audio files`, audioFiles.length);

    for (const file of audioFiles) {
      const track: ScannedTrack = {
        id: `mediastore_${file.id}`,
        uri: file.uri, // content:// URI
        filename: file.filename,
        path: file.path,
        folder: file.folder,
        extension: file.extension,
        size: file.size,
        modifiedAt: file.dateModified,
        title: file.title || file.filename.replace(/\.[^/.]+$/, ''),
        artist: file.artist || undefined,
        album: file.album || undefined,
        albumArtUri: file.albumArtUri,
        duration: file.duration,
        mimeType: file.mimeType,
      };

      result.tracks.push(track);

      // Track folders
      if (file.folder && !result.folders.includes(file.folder)) {
        result.folders.push(file.folder);
      }
    }

    // Calculate statistics
    result.totalTracks = result.tracks.length;
    result.totalSize = result.tracks.reduce((sum, track) => sum + track.size, 0);

    // Count formats
    for (const track of result.tracks) {
      const ext = track.extension.replace('.', '').toUpperCase();
      result.formats[ext] = (result.formats[ext] || 0) + 1;
    }

    onProgress?.(`Scan complete: ${result.totalTracks} tracks found`, result.totalTracks);
  } catch (error: any) {
    console.error('MediaStore scan error:', error);
    result.errors.push(`MediaStore error: ${error.message}`);
  }

  return result;
};

/**
 * Quick scan - just count files without full metadata extraction
 */
export const quickScan = async (
  folders: string[]
): Promise<{ count: number; formats: Record<string, number> }> => {
  let count = 0;
  const formats: Record<string, number> = {};
  
  for (const folder of folders) {
    try {
      const resolved = await resolveContentUri(folder);
      if (resolved) {
        // Pass false for extractMeta to skip metadata extraction for quick scan
        const tracks = await scanDirectoryRecursive(resolved, undefined, 0, false);
        count += tracks.length;
        
        for (const track of tracks) {
          const ext = track.extension.replace('.', '').toUpperCase();
          formats[ext] = (formats[ext] || 0) + 1;
        }
      }
    } catch (error) {
      console.log('Quick scan error:', error);
    }
  }
  
  return { count, formats };
};

export default {
  scanLibrary,
  scanWithMediaStore,
  quickScan,
  AUDIO_EXTENSIONS,
};
