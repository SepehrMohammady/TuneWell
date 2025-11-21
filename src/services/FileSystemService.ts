import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Track } from '@/types';

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

        const tracks: Track[] = media.assets.map((asset, index) => ({
            id: asset.id || `track-${index}`,
            url: asset.uri,
            title: asset.filename.replace(/\.[^/.]+$/, ''), // Remove extension
            artist: 'Unknown Artist',
            album: asset.albumId || undefined,
            duration: asset.duration,
        }));

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
                        audioFiles.push({
                            id: filePath,
                            url: filePath,
                            title: file.replace(/\.[^/.]+$/, ''),
                            artist: 'Unknown Artist',
                            duration: undefined,
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
