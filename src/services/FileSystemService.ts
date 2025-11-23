import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Track } from '@/types';
import { MetadataService } from './MetadataService';

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.aac', '.ogg', '.opus'];

export class FileSystemService {
    static async requestPermissions(): Promise<boolean> {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        return status === 'granted';
    }

    static async getAudioFiles(): Promise<Track[]> {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            throw new Error('Permission to access media library denied');
        }

        const media = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.audio,
            first: 10000,
            sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });

        console.log(`[FileSystemService] Found ${media.assets.length} audio files`);

        // First pass: Create tracks with basic info (fast - loads immediately)
        const tracks: Track[] = media.assets.map((asset, index) => ({
            id: asset.id || `track-${index}`,
            url: asset.uri,
            title: asset.filename.replace(/\.[^/.]+$/, ''),
            artist: 'Unknown Artist',
            album: asset.albumId || undefined,
            duration: asset.duration,
            artwork: undefined,
        }));

        // Second pass: Extract metadata in background (non-blocking)
        // DISABLED: Causing performance issues and crashes. Will implement on-demand loading later.
        /*
        const batchSize = 10;
        setTimeout(async () => {
            console.log('[FileSystemService] Starting background metadata extraction...');

            for (let i = 0; i < media.assets.length; i += batchSize) {
                const batch = media.assets.slice(i, Math.min(i + batchSize, media.assets.length));

                await Promise.all(
                    batch.map(async (asset, batchIndex) => {
                        const index = i + batchIndex;
                        try {
                            const metadata = await MetadataService.getMetadata(asset.uri);

                            // Update track in place
                            tracks[index].title = metadata.title || tracks[index].title;
                            tracks[index].artist = metadata.artist || 'Unknown Artist';
                            tracks[index].album = metadata.album || tracks[index].album;
                            tracks[index].artwork = metadata.artwork;
                        } catch (error) {
                            console.warn(`Failed to get metadata for track ${index}:`, error);
                            tracks[index].artist = 'Unknown Artist';
                        }
                    })
                );

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log('[FileSystemService] Background metadata extraction complete');
        }, 500);
        */

        return tracks;
    }

    static async getAudioFilesFromUri(uri: string): Promise<Track[]> {
        try {
            const files = await FileSystem.readDirectoryAsync(uri);
            const audioFiles: Track[] = [];

            for (const file of files) {
                const filePath = `${uri}/${file}`;
                const fileInfo = await FileSystem.getInfoAsync(filePath);

                if (fileInfo.isDirectory) {
                    const subFiles = await this.getAudioFilesFromUri(filePath);
                    audioFiles.push(...subFiles);
                } else {
                    const ext = file.substring(file.lastIndexOf('.')).toLowerCase();
                    if (AUDIO_EXTENSIONS.includes(ext)) {
                        const metadata = await MetadataService.getMetadata(filePath);

                        audioFiles.push({
                            id: filePath,
                            url: filePath,
                            title: metadata.title || file.replace(/\.[^/.]+$/, ''),
                            artist: metadata.artist || 'Unknown Artist',
                            album: metadata.album || undefined,
                            duration: undefined,
                            artwork: metadata.artwork || undefined,
                        });
                    }
                }
            }

            return audioFiles;
        } catch (error) {
            console.error('Error reading directory:', error);
            return [];
        }
    }

    static isAudioFile(filename: string): boolean {
        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        return AUDIO_EXTENSIONS.includes(ext);
    }
}
