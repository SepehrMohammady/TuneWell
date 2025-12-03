/**
 * TuneWell Library Scanner Service
 * 
 * Scans user-selected folders for audio files and indexes them
 * into the database.
 */

import { database, tracksCollection, foldersCollection, albumsCollection, artistsCollection } from '../../database';
import { isSupportedAudioFile, parseAudioMetadata, createTrackFromMetadata } from '../metadata';
import { useLibraryStore } from '../../store';
import type { Track, LibraryScanResult } from '../../types';

export interface ScanProgress {
  phase: 'discovering' | 'scanning' | 'indexing' | 'complete';
  totalFiles: number;
  scannedFiles: number;
  currentFile?: string;
  newTracks: number;
  updatedTracks: number;
}

export type ScanProgressCallback = (progress: ScanProgress) => void;

class LibraryScannerService {
  private isScanning = false;
  private abortController: AbortController | null = null;

  /**
   * Check if a scan is in progress
   */
  get scanning(): boolean {
    return this.isScanning;
  }

  /**
   * Abort current scan
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isScanning = false;
    useLibraryStore.getState().setScanning(false);
  }

  /**
   * Scan all configured folders for audio files
   */
  async scanLibrary(
    folders: string[],
    onProgress?: ScanProgressCallback
  ): Promise<LibraryScanResult> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    this.abortController = new AbortController();
    useLibraryStore.getState().setScanning(true);

    const startTime = Date.now();
    const result: LibraryScanResult = {
      totalFiles: 0,
      scannedFiles: 0,
      newTracks: 0,
      updatedTracks: 0,
      failedFiles: [],
      duration: 0,
    };

    const progress: ScanProgress = {
      phase: 'discovering',
      totalFiles: 0,
      scannedFiles: 0,
      newTracks: 0,
      updatedTracks: 0,
    };

    try {
      // Phase 1: Discover files
      onProgress?.({ ...progress });
      
      const audioFiles: Array<{ path: string; uri: string }> = [];
      
      for (const folder of folders) {
        if (this.abortController.signal.aborted) break;
        
        const files = await this.discoverAudioFiles(folder);
        audioFiles.push(...files);
        progress.totalFiles = audioFiles.length;
        onProgress?.({ ...progress });
      }

      result.totalFiles = audioFiles.length;
      progress.phase = 'scanning';
      onProgress?.({ ...progress });

      // Phase 2: Scan and parse metadata
      const tracks: Track[] = [];
      
      for (const file of audioFiles) {
        if (this.abortController.signal.aborted) break;

        try {
          progress.currentFile = file.path;
          progress.scannedFiles++;
          
          const metadata = await parseAudioMetadata(file.path, file.uri);
          
          if (metadata) {
            const track = createTrackFromMetadata(file.path, file.uri, metadata);
            tracks.push(track);
            progress.newTracks++;
          }
          
          result.scannedFiles++;
          useLibraryStore.getState().setScanProgress(
            (progress.scannedFiles / progress.totalFiles) * 100
          );
          onProgress?.({ ...progress });
          
        } catch (error) {
          result.failedFiles.push(file.path);
          console.error(`Failed to scan file: ${file.path}`, error);
        }
      }

      // Phase 3: Index into database
      progress.phase = 'indexing';
      onProgress?.({ ...progress });

      if (!this.abortController.signal.aborted && tracks.length > 0) {
        await this.indexTracks(tracks);
        result.newTracks = tracks.length;
      }

      // Complete
      progress.phase = 'complete';
      onProgress?.({ ...progress });

    } catch (error) {
      console.error('Library scan error:', error);
      throw error;
    } finally {
      result.duration = Date.now() - startTime;
      this.isScanning = false;
      this.abortController = null;
      useLibraryStore.getState().setScanning(false);
      useLibraryStore.getState().setLastScanResult(result);
    }

    return result;
  }

  /**
   * Discover audio files in a folder recursively
   * 
   * Note: This is a placeholder implementation. In a real app,
   * this would use react-native-fs or expo-file-system to
   * actually traverse the file system.
   */
  private async discoverAudioFiles(
    folderPath: string
  ): Promise<Array<{ path: string; uri: string }>> {
    // Placeholder - in real implementation, use file system APIs
    // to recursively scan the folder for audio files
    
    const files: Array<{ path: string; uri: string }> = [];
    
    // This would be replaced with actual file system scanning:
    // const items = await RNFS.readDir(folderPath);
    // for (const item of items) {
    //   if (item.isDirectory()) {
    //     const subFiles = await this.discoverAudioFiles(item.path);
    //     files.push(...subFiles);
    //   } else if (isSupportedAudioFile(item.path)) {
    //     files.push({ path: item.path, uri: `file://${item.path}` });
    //   }
    // }
    
    return files;
  }

  /**
   * Index tracks into the database
   */
  private async indexTracks(tracks: Track[]): Promise<void> {
    await database.write(async () => {
      // Group tracks by album and artist for batch creation
      const albums = new Map<string, { name: string; artist: string; tracks: Track[] }>();
      const artists = new Map<string, { name: string; trackCount: number }>();

      for (const track of tracks) {
        // Group by album
        const albumKey = `${track.album}|${track.artist}`;
        if (!albums.has(albumKey)) {
          albums.set(albumKey, {
            name: track.album,
            artist: track.artist,
            tracks: [],
          });
        }
        albums.get(albumKey)!.tracks.push(track);

        // Group by artist
        if (!artists.has(track.artist)) {
          artists.set(track.artist, { name: track.artist, trackCount: 0 });
        }
        artists.get(track.artist)!.trackCount++;
      }

      // Create track records
      const trackBatch = tracks.map((track) =>
        tracksCollection.prepareCreate((record: any) => {
          record._raw.id = track.id;
          record.uri = track.uri;
          record.filePath = track.filePath;
          record.fileName = track.fileName;
          record.folderPath = track.folderPath;
          record.folderName = track.folderName;
          record.title = track.title;
          record.artist = track.artist;
          record.album = track.album;
          record.albumArtist = track.albumArtist;
          record.genre = track.genre;
          record.year = track.year;
          record.trackNumber = track.trackNumber;
          record.discNumber = track.discNumber;
          record.composer = track.composer;
          record.duration = track.duration;
          record.sampleRate = track.sampleRate;
          record.bitDepth = track.bitDepth;
          record.bitRate = track.bitRate;
          record.channels = track.channels;
          record.format = track.format;
          record.codec = track.codec;
          record.isLossless = track.isLossless;
          record.isHighRes = track.isHighRes;
          record.isDSD = track.isDSD;
          record.artworkUri = track.artworkUri;
          record.playCount = 0;
          record.isFavorite = false;
          record.moods = JSON.stringify([]);
          record.dateAdded = track.dateAdded;
          record.dateModified = track.dateModified;
        })
      );

      // Create album records
      const albumBatch = Array.from(albums.values()).map((album) =>
        albumsCollection.prepareCreate((record: any) => {
          record.name = album.name;
          record.artist = album.artist;
          record.trackCount = album.tracks.length;
          record.totalDuration = album.tracks.reduce((sum, t) => sum + t.duration, 0);
        })
      );

      // Create artist records
      const artistBatch = Array.from(artists.values()).map((artist) =>
        artistsCollection.prepareCreate((record: any) => {
          record.name = artist.name;
          record.albumCount = 0; // Will be updated later
          record.trackCount = artist.trackCount;
        })
      );

      // Batch write all records
      await database.batch(...trackBatch, ...albumBatch, ...artistBatch);
    });
  }

  /**
   * Rescan a single track for updated metadata
   */
  async rescanTrack(trackId: string): Promise<Track | null> {
    const track = await tracksCollection.find(trackId);
    
    if (!track) return null;

    const metadata = await parseAudioMetadata(track.filePath, track.uri);
    
    if (!metadata) return null;

    await database.write(async () => {
      await track.update((record: any) => {
        record.title = metadata.title || record.title;
        record.artist = metadata.artist || record.artist;
        record.album = metadata.album || record.album;
        record.albumArtist = metadata.albumArtist;
        record.genre = metadata.genre;
        record.year = metadata.year;
        record.trackNumber = metadata.trackNumber;
        record.discNumber = metadata.discNumber;
        record.composer = metadata.composer;
        record.duration = metadata.duration;
        record.sampleRate = metadata.sampleRate;
        record.bitDepth = metadata.bitDepth;
        record.bitRate = metadata.bitRate;
        record.channels = metadata.channels;
        record.dateModified = Date.now();
      });
    });

    return track as unknown as Track;
  }

  /**
   * Remove tracks that no longer exist on disk
   */
  async cleanupMissingTracks(): Promise<number> {
    // In a real implementation, check each track's file path
    // and remove if the file no longer exists
    
    let removedCount = 0;
    
    // const allTracks = await tracksCollection.query().fetch();
    // for (const track of allTracks) {
    //   const exists = await RNFS.exists(track.filePath);
    //   if (!exists) {
    //     await database.write(async () => {
    //       await track.destroyPermanently();
    //     });
    //     removedCount++;
    //   }
    // }
    
    return removedCount;
  }
}

export const libraryScannerService = new LibraryScannerService();

export default libraryScannerService;
