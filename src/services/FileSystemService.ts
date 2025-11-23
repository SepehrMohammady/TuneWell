import * * MediaLibrary from 'expo-media-library';
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

        // Create tracks immediately with basic info - NO metadata extraction here
        const tracks: Track[] = media.assets.map((asset, index) => ({
            id: asset.id || `track-${index}`,
            url: asset.uri,
            title: asset.filename.replace(/\.[^/.]+$/, ''),
            artist: 'Unknown Artist', // Will be updated in background
            album: asset.albumId || undefined,
            duration: asset.duration,
            artwork: undefined, // Will be updated in background
        }));

        // Extract metadata in background - DO NOT await this
        // This allows tracks to be added to player immediately
        this.extractMetadataInBackground(tracks, media.assets).catch(error => {
            console.error('[FileSystemService] Background metadata extraction failed:', error);
        });

        return tracks;
    }

    private static async extractMetadataInBackground(tracks: Track[], assets: any[]) {
        console.log('[FileSystemService] Starting background metadata extraction...');
        const batchSize = 5; // Smaller batches for better responsiveness

        for (let i = 0; i < assets.length; i += batchSize) {
            const batch = assets.slice(i, Math.min(i + batchSize, assets.length));

            await Promise.all(
                batch.map(async (asset, batchIndex) => {
                    const index = i + batchIndex;
                    try {
                        const metadata = await MetadataService.getMetadata(asset.uri);

                        // Update track object in place
                        if (metadata.title) tracks[index].title = metadata.title;
                        if (metadata.artist) tracks[index].artist = metadata.artist;
                        if (metadata.album) tracks[index].album = metadata.album;
                        if (metadata.artwork) tracks[index].artwork = metadata.artwork;
                    } catch (error) {
                        // Silently fail for individual tracks
                        console.warn(`Failed to get metadata for track ${index}`);
                    }
                })
            );

            // Small delay between batches to not block UI thread
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log('[FileSystemService] Background metadata extraction complete');
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
