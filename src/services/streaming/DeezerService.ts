/**
 * TuneWell Deezer Service
 * 
 * Uses Deezer's public Simple API (no authentication needed) to:
 * - Import public playlists by URL
 * - Search the Deezer catalog
 * - Convert Deezer tracks to TuneWell format
 * 
 * Note: Deezer is not accepting new developer app registrations,
 * so OAuth-based features (user playlists, account connection) are
 * not available. The public API works without any app_id.
 */

import type { DeezerPlaylist, StreamingTrack, Track } from '../../types';

// ============================================================================
// Deezer Public API Configuration
// ============================================================================

const DEEZER_API = 'https://api.deezer.com' as const;

// ============================================================================
// Deezer Service (Public API — no auth required)
// ============================================================================

class DeezerService {
  private static instance: DeezerService;

  private constructor() {}

  static getInstance(): DeezerService {
    if (!DeezerService.instance) {
      DeezerService.instance = new DeezerService();
    }
    return DeezerService.instance;
  }

  // --------------------------------------------------------------------------
  // Public API Helpers
  // --------------------------------------------------------------------------

  /**
   * Make a public (unauthenticated) Deezer API request.
   * Deezer's Simple API allows reading public data without an app_id.
   */
  private async apiRequest<T>(endpoint: string): Promise<T> {
    const url = `${DEEZER_API}${endpoint}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Deezer API error: ${response.status} ${errBody}`);
    }

    const data = await response.json();

    // Deezer returns errors inside 200 responses
    if (data.error) {
      throw new Error(`Deezer API error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    return data;
  }

  // --------------------------------------------------------------------------
  // Public Playlists
  // --------------------------------------------------------------------------

  /**
   * Fetch tracks from a public Deezer playlist (no auth needed)
   */
  async fetchPlaylistTracks(playlistId: string, limit = 100, offset = 0): Promise<StreamingTrack[]> {
    try {
      const data = await this.apiRequest<any>(
        `/playlist/${playlistId}/tracks?limit=${limit}&index=${offset}`
      );

      const tracks: StreamingTrack[] = (data.data || [])
        .filter((item: any) => item.readable !== false)
        .map((item: any) => ({
          id: String(item.id),
          name: item.title || 'Unknown',
          artist: item.artist?.name || 'Unknown',
          album: item.album?.title || 'Unknown',
          duration: (item.duration || 0) * 1000, // Deezer duration is in seconds → ms
          imageUrl: item.album?.cover_medium || item.album?.cover,
          uri: `deezer:track:${item.id}`,
          previewUrl: item.preview,
          isPlayable: item.readable !== false,
        }));

      return tracks;
    } catch (error) {
      console.error('[DeezerService] Failed to fetch playlist tracks:', error);
      throw error;
    }
  }

  /**
   * Fetch metadata for a public Deezer playlist (no auth needed)
   */
  async fetchPlaylistMetadata(playlistId: string): Promise<DeezerPlaylist | null> {
    try {
      const data = await this.apiRequest<any>(`/playlist/${playlistId}`);
      return {
        id: String(data.id),
        name: data.title,
        description: data.description || '',
        imageUrl: data.picture_medium || data.picture,
        creatorName: data.creator?.name || 'Unknown',
        trackCount: data.nb_tracks || 0,
        link: data.link || '',
      };
    } catch (error) {
      console.error('[DeezerService] Failed to fetch playlist metadata:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Search (public — no auth needed)
  // --------------------------------------------------------------------------

  /**
   * Search Deezer catalog for tracks
   */
  async searchTracks(query: string, limit = 20): Promise<StreamingTrack[]> {
    try {
      const data = await this.apiRequest<any>(
        `/search/track?q=${encodeURIComponent(query)}&limit=${limit}`
      );

      return (data.data || []).map((item: any) => ({
        id: String(item.id),
        name: item.title || 'Unknown',
        artist: item.artist?.name || 'Unknown',
        album: item.album?.title || 'Unknown',
        duration: (item.duration || 0) * 1000,
        imageUrl: item.album?.cover_medium || item.album?.cover,
        uri: `deezer:track:${item.id}`,
        previewUrl: item.preview,
        isPlayable: item.readable !== false,
      }));
    } catch (error) {
      console.error('[DeezerService] Search failed:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Utility
  // --------------------------------------------------------------------------

  /**
   * Convert a StreamingTrack to TuneWell Track format
   */
  deezerTrackToTrack(track: StreamingTrack): Track {
    return {
      id: `deezer_${track.id}`,
      uri: track.previewUrl || track.uri,
      filePath: '',
      fileName: track.name,
      folderPath: '',
      folderName: 'Deezer',
      title: track.name,
      artist: track.artist,
      album: track.album,
      duration: track.duration / 1000,
      sampleRate: 0,
      bitDepth: 0,
      channels: 2,
      format: 'streaming',
      isLossless: false,
      isHighRes: false,
      isDSD: false,
      artworkUri: track.imageUrl,
      playCount: 0,
      isFavorite: false,
      moods: [],
      dateAdded: Date.now(),
      dateModified: Date.now(),
      streamingSource: 'deezer',
      streamingArtworkUrl: track.imageUrl,
      previewUrl: track.previewUrl,
    };
  }
}

export const deezerService = DeezerService.getInstance();
export default DeezerService;
