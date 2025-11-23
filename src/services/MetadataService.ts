import { getAudioMetadata } from '@missingcore/audio-metadata';

export interface AudioMetadata {
    title?: string;
    artist?: string;
    album?: string;
    albumArtist?: string;
    year?: number;
    track?: number;
    artwork?: string; // base64 encoded image
}

export class MetadataService {
    private static metadataCache = new Map<string, AudioMetadata>();

    /**
     * Extract metadata from an audio file
     * @param uri File URI
     * @returns Metadata object with title, artist, album, and artwork
     */
    static async getMetadata(uri: string): Promise<AudioMetadata> {
        // Check cache first
        if (this.metadataCache.has(uri)) {
            return this.metadataCache.get(uri)!;
        }

        try {
            const metadata = await getAudioMetadata(uri);

            const result: AudioMetadata = {
                title: metadata.name || undefined,
                artist: metadata.artist || undefined,
                album: metadata.album || undefined,
                albumArtist: metadata.albumArtist || undefined,
                year: metadata.year || undefined,
                track: metadata.track || undefined,
                artwork: metadata.artwork || undefined, // Already base64
            };

            // Cache the result
            this.metadataCache.set(uri, result);

            return result;
        } catch (error) {
            console.warn(`Failed to extract metadata from ${uri}:`, error);

            // Return empty metadata on error
            const emptyMetadata: AudioMetadata = {};
            this.metadataCache.set(uri, emptyMetadata);
            return emptyMetadata;
        }
    }

    /**
     * Extract metadata from multiple files in batch
     * @param uris Array of file URIs
     * @returns Array of metadata objects
     */
    static async getMetadataBatch(uris: string[]): Promise<AudioMetadata[]> {
        const promises = uris.map(uri => this.getMetadata(uri));
        return await Promise.all(promises);
    }

    /**
     * Clear the metadata cache
     */
    static clearCache(): void {
        this.metadataCache.clear();
    }

    /**
     * Get cache size
     */
    static getCacheSize(): number {
        return this.metadataCache.size;
    }
}
