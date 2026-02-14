/**
 * TuneWell Deezer Service
 * 
 * Handles Deezer authentication (OAuth 2.0), Web API calls,
 * and playlist management.
 * 
 * Register your app at https://developers.deezer.com to get
 * your App ID and Secret, then update the config below.
 */

import { Linking } from 'react-native';
import { useStreamingStore } from '../../store/streamingStore';
import type { DeezerUser, DeezerPlaylist, StreamingTrack, Track } from '../../types';

// ============================================================================
// Deezer API Configuration
// ============================================================================

const DEEZER_CONFIG = {
  appId: 'YOUR_DEEZER_APP_ID',
  appSecret: 'YOUR_DEEZER_APP_SECRET',
  redirectUri: 'tunewell://deezer-callback',
  perms: 'basic_access,email,offline_access,manage_library,listening_history',
  authEndpoint: 'https://connect.deezer.com/oauth/auth.php',
  tokenEndpoint: 'https://connect.deezer.com/oauth/access_token.php',
  apiBaseUrl: 'https://api.deezer.com',
} as const;

// ============================================================================
// Deezer Service
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
  // Authentication
  // --------------------------------------------------------------------------

  /**
   * Start Deezer OAuth flow - opens Deezer login in browser
   */
  async startAuth(): Promise<void> {
    try {
      const params = new URLSearchParams({
        app_id: DEEZER_CONFIG.appId,
        redirect_uri: DEEZER_CONFIG.redirectUri,
        perms: DEEZER_CONFIG.perms,
      });

      const authUrl = `${DEEZER_CONFIG.authEndpoint}?${params.toString()}`;
      console.log('[DeezerService] Opening auth URL');
      await Linking.openURL(authUrl);
    } catch (error) {
      console.error('[DeezerService] Auth start failed:', error);
      useStreamingStore.getState().setError('Failed to start Deezer login');
      throw error;
    }
  }

  /**
   * Handle OAuth callback - exchange code for access token
   * Deezer tokens are long-lived (no expiry unless revoked)
   */
  async handleAuthCallback(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const errorReason = urlObj.searchParams.get('error_reason');

      if (errorReason) {
        console.error('[DeezerService] Auth error:', errorReason);
        useStreamingStore.getState().setError(`Deezer auth failed: ${errorReason}`);
        return false;
      }

      if (!code) {
        console.error('[DeezerService] Missing auth code');
        useStreamingStore.getState().setError('Invalid Deezer auth response');
        return false;
      }

      // Exchange code for token (Deezer uses a GET request for token exchange)
      const tokenUrl = `${DEEZER_CONFIG.tokenEndpoint}?app_id=${DEEZER_CONFIG.appId}&secret=${DEEZER_CONFIG.appSecret}&code=${code}&output=json`;
      const response = await fetch(tokenUrl);

      if (!response.ok) {
        const errData = await response.text();
        console.error('[DeezerService] Token exchange failed:', errData);
        useStreamingStore.getState().setError('Failed to get Deezer token');
        return false;
      }

      const data = await response.json();

      if (data.error) {
        console.error('[DeezerService] Token error:', data.error);
        useStreamingStore.getState().setError(`Deezer error: ${data.error.message || data.error}`);
        return false;
      }

      if (!data.access_token) {
        useStreamingStore.getState().setError('No access token received from Deezer');
        return false;
      }

      useStreamingStore.getState().setDeezerToken(data.access_token);

      // Fetch user profile
      await this.fetchUserProfile();

      console.log('[DeezerService] Auth successful');
      return true;
    } catch (error) {
      console.error('[DeezerService] Auth callback failed:', error);
      useStreamingStore.getState().setError('Deezer auth callback failed');
      return false;
    }
  }

  /**
   * Disconnect Deezer account
   */
  disconnect(): void {
    useStreamingStore.getState().clearDeezerAuth();
    console.log('[DeezerService] Disconnected');
  }

  // --------------------------------------------------------------------------
  // API Helpers
  // --------------------------------------------------------------------------

  private getAccessToken(): string | null {
    return useStreamingStore.getState().deezerAccessToken;
  }

  /**
   * Make authenticated Deezer API request
   * Deezer passes the token as a query parameter
   */
  private async apiRequest<T>(endpoint: string): Promise<T> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Deezer');
    }

    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${DEEZER_CONFIG.apiBaseUrl}${endpoint}${separator}access_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Deezer API error: ${response.status} ${errBody}`);
    }

    const data = await response.json();

    // Deezer returns errors inside 200 responses
    if (data.error) {
      if (data.error.code === 300) {
        // Token expired or invalid
        useStreamingStore.getState().clearDeezerAuth();
        throw new Error('Deezer session expired. Please reconnect.');
      }
      throw new Error(`Deezer API error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    return data;
  }

  // --------------------------------------------------------------------------
  // User Profile
  // --------------------------------------------------------------------------

  async fetchUserProfile(): Promise<DeezerUser | null> {
    try {
      const data = await this.apiRequest<any>('/user/me');

      const user: DeezerUser = {
        id: String(data.id),
        displayName: data.name || data.firstname || 'Deezer User',
        email: data.email,
        imageUrl: data.picture_medium || data.picture,
        country: data.country,
      };

      useStreamingStore.getState().setDeezerUser(user);
      return user;
    } catch (error) {
      console.error('[DeezerService] Failed to fetch user profile:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Playlists
  // --------------------------------------------------------------------------

  /**
   * Fetch user's Deezer playlists
   */
  async fetchPlaylists(limit = 50, offset = 0): Promise<DeezerPlaylist[]> {
    try {
      useStreamingStore.getState().setLoading(true);

      const data = await this.apiRequest<any>(
        `/user/me/playlists?limit=${limit}&index=${offset}`
      );

      const playlists: DeezerPlaylist[] = (data.data || []).map((item: any) => ({
        id: String(item.id),
        name: item.title,
        description: item.description || '',
        imageUrl: item.picture_medium || item.picture,
        creatorName: item.creator?.name || 'Unknown',
        trackCount: item.nb_tracks || 0,
        link: item.link || '',
      }));

      useStreamingStore.getState().setDeezerPlaylists(playlists);
      useStreamingStore.getState().setError(null);

      return playlists;
    } catch (error: any) {
      console.error('[DeezerService] Failed to fetch playlists:', error);
      useStreamingStore.getState().setError(error.message);
      return [];
    } finally {
      useStreamingStore.getState().setLoading(false);
    }
  }

  /**
   * Fetch tracks from a Deezer playlist
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
   * Fetch metadata for a Deezer playlist
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
  // Search
  // --------------------------------------------------------------------------

  /**
   * Search Deezer for tracks
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

  /**
   * Get the redirect URI for deep link handling
   */
  getRedirectUri(): string {
    return DEEZER_CONFIG.redirectUri;
  }

  /**
   * Check if a URL is a Deezer auth callback
   */
  isAuthCallback(url: string): boolean {
    return url.startsWith(DEEZER_CONFIG.redirectUri);
  }
}

export const deezerService = DeezerService.getInstance();
export default DeezerService;
