import { NativeModules, Platform } from 'react-native';

export interface MediaStoreAudioFile {
  id: string;
  uri: string; // content:// URI for playback
  filename: string;
  path: string; // file path (may not be accessible on Android 11+)
  title: string;
  artist: string;
  album: string;
  albumArtUri: string;
  duration: number; // in seconds
  size: number;
  mimeType: string;
  extension: string;
  folder: string;
  dateModified: number;
  dateAdded: number;
}

interface MediaStoreModuleInterface {
  getAudioFiles(): Promise<MediaStoreAudioFile[]>;
  getAudioFilesInFolder(folderPath: string): Promise<MediaStoreAudioFile[]>;
}

const { MediaStoreModule } = NativeModules;

/**
 * Get all audio files from MediaStore
 * Uses content:// URIs which work on all Android versions
 */
export async function getAllAudioFiles(): Promise<MediaStoreAudioFile[]> {
  if (Platform.OS !== 'android') {
    console.warn('MediaStore is only available on Android');
    return [];
  }

  if (!MediaStoreModule) {
    console.warn('MediaStoreModule native module not available');
    return [];
  }

  try {
    return await (MediaStoreModule as MediaStoreModuleInterface).getAudioFiles();
  } catch (error) {
    console.error('Failed to get audio files from MediaStore:', error);
    return [];
  }
}

/**
 * Get audio files in a specific folder
 */
export async function getAudioFilesInFolder(folderPath: string): Promise<MediaStoreAudioFile[]> {
  if (Platform.OS !== 'android') {
    console.warn('MediaStore is only available on Android');
    return [];
  }

  if (!MediaStoreModule) {
    console.warn('MediaStoreModule native module not available');
    return [];
  }

  try {
    return await (MediaStoreModule as MediaStoreModuleInterface).getAudioFilesInFolder(folderPath);
  } catch (error) {
    console.error('Failed to get audio files from folder:', error);
    return [];
  }
}

export default {
  getAllAudioFiles,
  getAudioFilesInFolder,
};
