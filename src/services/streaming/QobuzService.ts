/**
 * TuneWell Qobuz Service
 * 
 * Handles Qobuz authentication (username/password login),
 * Web API calls, and playlist management.
 * 
 * Qobuz API requires an App ID obtained through their partner program.
 * Update the appId below with your credentials.
 * 
 * Qobuz is known for lossless/hi-res audio streaming.
 */

import { useStreamingStore } from '../../store/streamingStore';
import type { QobuzUser, QobuzPlaylist, StreamingTrack, Track } from '../../types';

// ============================================================================
// Qobuz API Configuration
// ============================================================================

const QOBUZ_CONFIG = {
  appId: 'YOUR_QOBUZ_APP_ID',
  apiBaseUrl: 'https://www.qobuz.com/api.json/0.2',
} as const;

// ============================================================================
// Qobuz Service
// ============================================================================

class QobuzService {
  private static instance: QobuzService;

  private constructor() {}

  static getInstance(): QobuzService {
    if (!QobuzService.instance) {
      QobuzService.instance = new QobuzService();
    }
    return QobuzService.instance;
  }

  // --------------------------------------------------------------------------
  // Authentication (Username/Password)
  // --------------------------------------------------------------------------

  /**
   * Log in to Qobuz with email and password.
   * Unlike Spotify/Deezer, Qobuz uses direct credential-based auth.
   */
  async login(email: string, password: string): Promise<boolean> {
    try {
      useStreamingStore.getState().setLoading(true);
      useStreamingStore.getState().setError(null);

      const response = await fetch(`${QOBUZ_CONFIG.apiBaseUrl}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-App-Id': QOBUZ_CONFIG.appId,
        },
        body: new URLSearchParams({
          email,
          password,
          app_id: QOBUZ_CONFIG.appId,
        }).toString(),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[QobuzService] Login failed:', response.status, errText);
        useStreamingStore.getState().setError('Qobuz login failed. Check your credentials.');
        return false;
      }

      const data = await response.json();

      if (!data.user_auth_token) {
        console.error('[QobuzService] No auth token in response');
        useStreamingStore.getState().setError('Qobuz login failed: no token received');
        return false;
      }

      const user: QobuzUser = {
        id: String(data.user?.id || ''),
        displayName: data.user?.display_name || data.user?.login || email,
        email: data.user?.email || email,
        imageUrl: data.user?.avatar || undefined,
        subscription: data.user?.credential?.label || data.user?.subscription?.offer || 'Free',
      };

      useStreamingStore.getState().setQobuzAuth(data.user_auth_token, user);
      console.log('[QobuzService] Login successful');
      return true;
    } catch (error: any) {
      console.error('[QobuzService] Login error:', error);
      useStreamingStore.getState().setError(error.message || 'Qobuz login failed');
      return false;
    } finally {
      useStreamingStore.getState().setLoading(false);
    }
  }

  /**
   * Disconnect Qobuz account
   */
  disconnect(): void {
    useStreamingStore.getState().clearQobuzAuth();
    console.log('[QobuzService] Disconnected');
  }

  // --------------------------------------------------------------------------
  // API Helpers
  // --------------------------------------------------------------------------

  /**
   * Make authenticated Qobuz API request
   */
  private async apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const token = useStreamingStore.getState().qobuzUserAuthToken;
    if (!token) {
      throw new Error('Not authenticated with Qobuz');
    }

    const allParams = new URLSearchParams({
      ...params,
      app_id: QOBUZ_CONFIG.appId,
    });

    const url = `${QOBUZ_CONFIG.apiBaseUrl}${endpoint}?${allParams.toString()}`;

    const response = await fetch(url, {
      headers: {
        'X-App-Id': QOBUZ_CONFIG.appId,
        'X-User-Auth-Token': token,
      },
    });

    if (response.status === 401) {
      useStreamingStore.getState().clearQobuzAuth();
      throw new Error('Qobuz session expired. Please log in again.');
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Qobuz API error: ${response.status} ${errBody}`);
    }

    return response.json();
  }

  // --------------------------------------------------------------------------
  // Playlists
  // --------------------------------------------------------------------------

  /**
   * Fetch user's Qobuz playlists
   */
  async fetchPlaylists(limit = 50, offset = 0): Promise<QobuzPlaylist[]> {
    try {
      useStreamingStore.getState().setLoading(true);
      const user = useStreamingStore.getState().qobuzUser;
      if (!user) throw new Error('No Qobuz user');

      const data = await this.apiRequest<any>('/playlist/getUserPlaylists', {
        user_id: user.id,
        limit: String(limit),
        offset: String(offset),
      });

      const playlists: QobuzPlaylist[] = (data.playlists?.items || []).map((item: any) => ({
        id: String(item.id),
        name: item.name,
        description: item.description || '',
        imageUrl: item.images300?.[0] || item.image_rectangle?.[0] || undefined,
        ownerName: item.owner?.name || 'Unknown',
        trackCount: item.tracks_count || 0,
      }));

      useStreamingStore.getState().setQobuzPlaylists(playlists);
      useStreamingStore.getState().setError(null);

      return playlists;
    } catch (error: any) {
      console.error('[QobuzService] Failed to fetch playlists:', error);
      useStreamingStore.getState().setError(error.message);
      return [];
    } finally {
      useStreamingStore.getState().setLoading(false);
    }
  }

  /**
   * Fetch tracks from a Qobuz playlist
   */
  async fetchPlaylistTracks(playlistId: string, limit = 100, offset = 0): Promise<StreamingTrack[]> {
    try {
      const data = await this.apiRequest<any>('/playlist/get', {
        playlist_id: playlistId,
        extra: 'tracks',
        limit: String(limit),
        offset: String(offset),
      });

      const tracks = data.tracks?.items || [];

      return tracks.map((item: any) => ({
        id: String(item.id),
        name: item.title || item.work?.title || 'Unknown',
        artist: item.performer?.name || item.composer?.name || 'Unknown',
        album: item.album?.title || 'Unknown',
        duration: (item.duration || 0) * 1000, // Qobuz duration is in seconds → ms
        imageUrl: item.album?.image?.large || item.album?.image?.small,
        uri: `qobuz:track:${item.id}`,
        previewUrl: item.sample_url || undefined,
        isPlayable: item.streamable === true,
      }));
    } catch (error) {
      console.error('[QobuzService] Failed to fetch playlist tracks:', error);
      throw error;
    }
  }

  /**
   * Fetch metadata for a Qobuz playlist
   */
  async fetchPlaylistMetadata(playlistId: string): Promise<QobuzPlaylist | null> {
    try {
      const data = await this.apiRequest<any>('/playlist/get', {
        playlist_id: playlistId,
      });

      return {
        id: String(data.id),
        name: data.name,
        description: data.description || '',
        imageUrl: data.images300?.[0] || undefined,
        ownerName: data.owner?.name || 'Unknown',
        trackCount: data.tracks_count || 0,
      };
    } catch (error) {
      console.error('[QobuzService] Failed to fetch playlist metadata:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------

  /**
   * Search Qobuz for tracks
   */
  async searchTracks(query: string, limit = 20): Promise<StreamingTrack[]> {
    try {
      const data = await this.apiRequest<any>('/track/search', {
        query,
        limit: String(limit),
      });

      return (data.tracks?.items || []).map((item: any) => ({
        id: String(item.id),
        name: item.title || 'Unknown',
        artist: item.performer?.name || 'Unknown',
        album: item.album?.title || 'Unknown',
        duration: (item.duration || 0) * 1000,
        imageUrl: item.album?.image?.large || item.album?.image?.small,
        uri: `qobuz:track:${item.id}`,
        previewUrl: item.sample_url || undefined,
        isPlayable: item.streamable === true,
      }));
    } catch (error) {
      console.error('[QobuzService] Search failed:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Utility
  // --------------------------------------------------------------------------

  /**
   * Convert a StreamingTrack to TuneWell Track format
   * Qobuz is known for lossless audio, so isLossless defaults to true
   */
  qobuzTrackToTrack(track: StreamingTrack): Track {
    return {
      id: `qobuz_${track.id}`,
      uri: track.previewUrl || track.uri,
      filePath: '',
      fileName: track.name,
      folderPath: '',
      folderName: 'Qobuz',
      title: track.name,
      artist: track.artist,
      album: track.album,
      duration: track.duration / 1000,
      sampleRate: 0,
      bitDepth: 0,
      channels: 2,
      format: 'streaming',
      isLossless: true, // Qobuz streams are lossless
      isHighRes: false,
      isDSD: false,
      artworkUri: track.imageUrl,
      playCount: 0,
      isFavorite: false,
      moods: [],
      dateAdded: Date.now(),
      dateModified: Date.now(),
      streamingSource: 'qobuz',
      streamingArtworkUrl: track.imageUrl,
      previewUrl: track.previewUrl,
    };
  }
}

export const qobuzService = QobuzService.getInstance();
export default QobuzService;
