/**
 * TuneWell Library Scanner Service
 * 
 * Scans folders for audio files and extracts metadata.
 */

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

// Supported audio formats
const AUDIO_EXTENSIONS = [
  // Lossless
  '.flac', '.wav', '.aiff', '.aif', '.alac', '.ape', '.wv',
  // DSD
  '.dff', '.dsf', '.dsd',
  // Lossy
  '.mp3', '.aac', '.m4a', '.ogg', '.opus', '.wma',
];

export interface ScannedTrack {
  id: string;
  uri: string;
  filename: string;
  path: string;
  folder: string;
  extension: string;
  size: number;
  modifiedAt: number;
  // Metadata (to be populated later)
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
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
  currentCount: number = 0
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
          currentCount + tracks.length
        );
        tracks.push(...subTracks);
      } else if (item.isFile() && isAudioFile(item.name)) {
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
 * Main scan function - scans all configured folders
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
  
  // If no folders specified, scan common music directories
  let foldersToScan = folders.length > 0 ? folders : getCommonMusicPaths();
  
  // Resolve content URIs to file paths
  const resolvedFolders: string[] = [];
  for (const folder of foldersToScan) {
    const resolved = await resolveContentUri(folder);
    if (resolved) {
      resolvedFolders.push(resolved);
    } else {
      result.errors.push(`Could not resolve: ${folder}`);
    }
  }
  
  onProgress?.('Starting scan...', 0);
  
  // Scan each folder
  for (const folder of resolvedFolders) {
    try {
      const tracks = await scanDirectoryRecursive(
        folder,
        onProgress,
        result.tracks.length
      );
      result.tracks.push(...tracks);
      result.folders.push(folder);
    } catch (error: any) {
      console.log('Error scanning folder:', folder, error);
      result.errors.push(`Error scanning ${folder}: ${error.message}`);
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
        const tracks = await scanDirectoryRecursive(resolved);
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
  quickScan,
  AUDIO_EXTENSIONS,
};
