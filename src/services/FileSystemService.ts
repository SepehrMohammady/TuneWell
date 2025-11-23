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
            first: 10000, // Get up to 10000 tracks
            sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });

        // Extract metadata for all tracks
        const tracks: Track[] = await Promise.all(
            media.assets.map(async (asset, index) => {
                const metadata = await MetadataService.getMetadata(asset.uri);

                return {
                    id: asset.id || `track-${index}`,
                    url: asset.uri,
                    title: metadata.title || asset.filename.replace(/\.[^/.]+$/, ''),
                    artist: metadata.artist || 'Unknown Artist',
                    album: metadata.album || asset.albumId || undefined,
                    duration: asset.duration,
                    artwork: metadata.artwork || undefined,
                };
            })
        );

        return tracks;
    }

    static async getAudioFilesFromUri(uri: string): Promise<Track[]> {
        try {
            const files = await FileSystem.readDirectoryAsync(uri);
            const audioFiles: Track[] = [];

            for (const file of files) {
                const filePath = `${uri}/${file}`;
                const fileInfo = await FileSystem.getInfoAsync(filePath);

                // Check if it's a directory (recursive)
                if (fileInfo.isDirectory) {
                    const subFiles = await this.getAudioFilesFromUri(filePath);
                    audioFiles.push(...subFiles);
                } else {
                    // Check if it's an audio file
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
