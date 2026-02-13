/**
 * TuneWell Spotify Service
 * 
 * Handles Spotify authentication (PKCE flow), Web API calls,
 * and playback control via Spotify Connect / App Remote.
 * 
 * Requires Spotify app installed on the device for playback.
 * Uses Spotify Web API for metadata, playlists, and search.
 */

import { Linking, Platform } from 'react-native';
import { useStreamingStore } from '../../store/streamingStore';
import type { SpotifyUser, SpotifyPlaylist, SpotifyTrack, Track } from '../../types';

// ============================================================================
// Spotify API Configuration
// ============================================================================

const SPOTIFY_CONFIG = {
  clientId: '19c09aad825e44c18131d16661f5f3d5',
  redirectUri: 'tunewell://spotify-callback',
  scopes: [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read',
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
  ].join(' '),
  authEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
  apiBaseUrl: 'https://api.spotify.com/v1',
} as const;

// ============================================================================
// PKCE Helpers
// ============================================================================

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const array = new Uint8Array(length);
  // Simple random for RN (crypto.getRandomValues not available everywhere)
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

/**
 * Pure JavaScript SHA-256 implementation for React Native/Hermes
 * (crypto.subtle is not available in Hermes engine)
 */
function sha256(plain: string): Uint8Array {
  // Convert string to UTF-8 byte array
  const encoder = new TextEncoder();
  const msg = encoder.encode(plain);

  // SHA-256 constants
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const rr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  // Pre-processing: padding
  const bitLen = msg.length * 8;
  const padded = new Uint8Array(Math.ceil((msg.length + 9) / 64) * 64);
  padded.set(msg);
  padded[msg.length] = 0x80;
  // Set length as 64-bit big-endian
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen, false);

  // Initial hash values
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  // Process each 512-bit (64-byte) block
  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Array<number>(64);
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rr(w[i-15], 7) ^ rr(w[i-15], 18) ^ (w[i-15] >>> 3);
      const s1 = rr(w[i-2], 17) ^ rr(w[i-2], 19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g_ = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25);
      const ch = (e & f) ^ (~e & g_);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g_; g_ = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g_) | 0; h7 = (h7 + h) | 0;
  }

  // Produce final hash
  const result = new Uint8Array(32);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, h0, false); rv.setUint32(4, h1, false);
  rv.setUint32(8, h2, false); rv.setUint32(12, h3, false);
  rv.setUint32(16, h4, false); rv.setUint32(20, h5, false);
  rv.setUint32(24, h6, false); rv.setUint32(28, h7, false);
  return result;
}

function base64URLEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ============================================================================
// Spotify Service
// ============================================================================

class SpotifyService {
  private static instance: SpotifyService;
  private codeVerifier: string | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SpotifyService {
    if (!SpotifyService.instance) {
      SpotifyService.instance = new SpotifyService();
    }
    return SpotifyService.instance;
  }

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  /**
   * Start Spotify OAuth PKCE flow - opens Spotify login in browser
   */
  async startAuth(): Promise<void> {
    try {
      this.codeVerifier = generateRandomString(64);
      
      const hashed = sha256(this.codeVerifier);
      const codeChallenge = base64URLEncode(hashed);
      
      const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.clientId,
        response_type: 'code',
        redirect_uri: SPOTIFY_CONFIG.redirectUri,
        scope: SPOTIFY_CONFIG.scopes,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        show_dialog: 'true',
      });

      const authUrl = `${SPOTIFY_CONFIG.authEndpoint}?${params.toString()}`;
      
      console.log('[SpotifyService] Opening auth URL');
      await Linking.openURL(authUrl);
    } catch (error) {
      console.error('[SpotifyService] Auth start failed:', error);
      useStreamingStore.getState().setError('Failed to start Spotify login');
      throw error;
    }
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  async handleAuthCallback(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (error) {
        console.error('[SpotifyService] Auth error:', error);
        useStreamingStore.getState().setError(`Spotify auth failed: ${error}`);
        return false;
      }

      if (!code || !this.codeVerifier) {
        console.error('[SpotifyService] Missing code or verifier');
        useStreamingStore.getState().setError('Invalid auth response');
        return false;
      }

      // Exchange code for tokens
      const response = await fetch(SPOTIFY_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_CONFIG.redirectUri,
          client_id: SPOTIFY_CONFIG.clientId,
          code_verifier: this.codeVerifier,
        }).toString(),
      });

      if (!response.ok) {
        const errData = await response.text();
        console.error('[SpotifyService] Token exchange failed:', errData);
        useStreamingStore.getState().setError('Failed to get Spotify tokens');
        return false;
      }

      const data = await response.json();
      
      useStreamingStore.getState().setSpotifyTokens(
        data.access_token,
        data.refresh_token,
        data.expires_in
      );

      // Fetch user profile
      await this.fetchUserProfile();
      
      this.codeVerifier = null;
      console.log('[SpotifyService] Auth successful');
      return true;
    } catch (error) {
      console.error('[SpotifyService] Auth callback failed:', error);
      useStreamingStore.getState().setError('Auth callback failed');
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<boolean> {
    const { spotifyRefreshToken } = useStreamingStore.getState();
    
    if (!spotifyRefreshToken) {
      console.warn('[SpotifyService] No refresh token available');
      return false;
    }

    try {
      const response = await fetch(SPOTIFY_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: spotifyRefreshToken,
          client_id: SPOTIFY_CONFIG.clientId,
        }).toString(),
      });

      if (!response.ok) {
        console.error('[SpotifyService] Token refresh failed');
        useStreamingStore.getState().clearSpotifyAuth();
        return false;
      }

      const data = await response.json();
      
      useStreamingStore.getState().setSpotifyTokens(
        data.access_token,
        data.refresh_token || null,
        data.expires_in
      );

      return true;
    } catch (error) {
      console.error('[SpotifyService] Token refresh error:', error);
      return false;
    }
  }

  /**
   * Disconnect Spotify account
   */
  disconnect(): void {
    useStreamingStore.getState().clearSpotifyAuth();
    console.log('[SpotifyService] Disconnected');
  }

  // --------------------------------------------------------------------------
  // API Helpers
  // --------------------------------------------------------------------------

  /**
   * Get valid access token, refreshing if needed
   */
  private async getAccessToken(): Promise<string | null> {
    const store = useStreamingStore.getState();
    
    if (store.isTokenValid()) {
      return store.spotifyAccessToken;
    }

    // Try refreshing
    const refreshed = await this.refreshToken();
    if (refreshed) {
      return useStreamingStore.getState().spotifyAccessToken;
    }

    return null;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new Error('Not authenticated with Spotify');
    }

    const response = await fetch(`${SPOTIFY_CONFIG.apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, try refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newToken = useStreamingStore.getState().spotifyAccessToken;
        const retryResponse = await fetch(`${SPOTIFY_CONFIG.apiBaseUrl}${endpoint}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        if (!retryResponse.ok) {
          throw new Error(`Spotify API error: ${retryResponse.status}`);
        }
        return retryResponse.json();
      }
      throw new Error('Spotify authentication expired');
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    return response.json();
  }

  // --------------------------------------------------------------------------
  // User Profile
  // --------------------------------------------------------------------------

  async fetchUserProfile(): Promise<SpotifyUser | null> {
    try {
      const data = await this.apiRequest<any>('/me');
      
      const user: SpotifyUser = {
        id: data.id,
        displayName: data.display_name || data.id,
        email: data.email,
        imageUrl: data.images?.[0]?.url,
        product: data.product,
      };

      useStreamingStore.getState().setSpotifyUser(user);
      return user;
    } catch (error) {
      console.error('[SpotifyService] Failed to fetch user profile:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Playlists
  // --------------------------------------------------------------------------

  /**
   * Fetch user's Spotify playlists
   */
  async fetchPlaylists(limit = 50, offset = 0): Promise<SpotifyPlaylist[]> {
    try {
      useStreamingStore.getState().setLoading(true);
      
      const data = await this.apiRequest<any>(`/me/playlists?limit=${limit}&offset=${offset}`);
      
      const playlists: SpotifyPlaylist[] = data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        imageUrl: item.images?.[0]?.url,
        ownerName: item.owner?.display_name || 'Unknown',
        trackCount: item.tracks?.total || 0,
        uri: item.uri,
      }));

      useStreamingStore.getState().setSpotifyPlaylists(playlists);
      useStreamingStore.getState().setLastSyncAt(Date.now());
      useStreamingStore.getState().setError(null);
      
      return playlists;
    } catch (error: any) {
      console.error('[SpotifyService] Failed to fetch playlists:', error);
      useStreamingStore.getState().setError(error.message);
      return [];
    } finally {
      useStreamingStore.getState().setLoading(false);
    }
  }

  /**
   * Fetch tracks from a Spotify playlist
   */
  async fetchPlaylistTracks(playlistId: string, limit = 100, offset = 0): Promise<SpotifyTrack[]> {
    try {
      const data = await this.apiRequest<any>(
        `/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&fields=items(track(id,name,artists,album,duration_ms,preview_url,uri,is_playable,album(images)))`
      );

      const tracks: SpotifyTrack[] = data.items
        .filter((item: any) => item.track && item.track.id)
        .map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
          album: item.track.album?.name || 'Unknown',
          duration: item.track.duration_ms,
          imageUrl: item.track.album?.images?.[0]?.url,
          uri: item.track.uri,
          previewUrl: item.track.preview_url,
          isPlayable: item.track.is_playable !== false,
        }));

      return tracks;
    } catch (error) {
      console.error('[SpotifyService] Failed to fetch playlist tracks:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------

  /**
   * Search Spotify for tracks
   */
  async searchTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const data = await this.apiRequest<any>(
        `/search?q=${encodedQuery}&type=track&limit=${limit}`
      );

      return data.tracks.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
        album: item.album?.name || 'Unknown',
        duration: item.duration_ms,
        imageUrl: item.album?.images?.[0]?.url,
        uri: item.uri,
        previewUrl: item.preview_url,
        isPlayable: item.is_playable !== false,
      }));
    } catch (error) {
      console.error('[SpotifyService] Search failed:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Playback Control (via Spotify Connect Web API)
  // --------------------------------------------------------------------------

  /**
   * Start playback of a Spotify URI (requires Spotify Premium + active device)
   */
  async play(uri: string, positionMs = 0): Promise<boolean> {
    try {
      const body: any = {};
      
      if (uri.includes('track')) {
        body.uris = [uri];
      } else if (uri.includes('playlist') || uri.includes('album')) {
        body.context_uri = uri;
      }
      
      if (positionMs > 0) {
        body.position_ms = positionMs;
      }

      await this.apiRequest('/me/player/play', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      return true;
    } catch (error) {
      console.error('[SpotifyService] Play failed:', error);
      
      // Try opening in Spotify app as fallback
      try {
        await Linking.openURL(uri);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<boolean> {
    try {
      await this.apiRequest('/me/player/pause', { method: 'PUT' });
      return true;
    } catch (error) {
      console.error('[SpotifyService] Pause failed:', error);
      return false;
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<boolean> {
    try {
      await this.apiRequest('/me/player/play', { method: 'PUT' });
      return true;
    } catch (error) {
      console.error('[SpotifyService] Resume failed:', error);
      return false;
    }
  }

  /**
   * Skip to next track
   */
  async skipNext(): Promise<boolean> {
    try {
      await this.apiRequest('/me/player/next', { method: 'POST' });
      return true;
    } catch (error) {
      console.error('[SpotifyService] Skip next failed:', error);
      return false;
    }
  }

  /**
   * Skip to previous track
   */
  async skipPrevious(): Promise<boolean> {
    try {
      await this.apiRequest('/me/player/previous', { method: 'POST' });
      return true;
    } catch (error) {
      console.error('[SpotifyService] Skip previous failed:', error);
      return false;
    }
  }

  /**
   * Seek to position
   */
  async seek(positionMs: number): Promise<boolean> {
    try {
      await this.apiRequest(`/me/player/seek?position_ms=${positionMs}`, { method: 'PUT' });
      return true;
    } catch (error) {
      console.error('[SpotifyService] Seek failed:', error);
      return false;
    }
  }

  /**
   * Get current playback state
   */
  async getPlaybackState(): Promise<any> {
    try {
      return await this.apiRequest('/me/player');
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Utility
  // --------------------------------------------------------------------------

  /**
   * Convert SpotifyTrack to TuneWell Track format
   */
  spotifyTrackToTrack(spotifyTrack: SpotifyTrack): Track {
    return {
      id: `spotify_${spotifyTrack.id}`,
      uri: spotifyTrack.uri,
      filePath: '',
      fileName: spotifyTrack.name,
      folderPath: '',
      folderName: 'Spotify',
      title: spotifyTrack.name,
      artist: spotifyTrack.artist,
      album: spotifyTrack.album,
      duration: spotifyTrack.duration / 1000, // Convert ms to seconds
      sampleRate: 0,
      bitDepth: 0,
      channels: 2,
      format: 'streaming',
      isLossless: false,
      isHighRes: false,
      isDSD: false,
      artworkUri: spotifyTrack.imageUrl,
      playCount: 0,
      isFavorite: false,
      moods: [],
      dateAdded: Date.now(),
      dateModified: Date.now(),
      streamingSource: 'spotify',
      spotifyUri: spotifyTrack.uri,
      streamingArtworkUrl: spotifyTrack.imageUrl,
      previewUrl: spotifyTrack.previewUrl,
    };
  }

  /**
   * Check if Spotify app is installed
   */
  async isSpotifyInstalled(): Promise<boolean> {
    try {
      return await Linking.canOpenURL('spotify://');
    } catch {
      return false;
    }
  }

  /**
   * Get the redirect URI for deep link handling
   */
  getRedirectUri(): string {
    return SPOTIFY_CONFIG.redirectUri;
  }

  /**
   * Check if a URL is a Spotify auth callback
   */
  isAuthCallback(url: string): boolean {
    return url.startsWith(SPOTIFY_CONFIG.redirectUri);
  }
}

export const spotifyService = SpotifyService.getInstance();
export default SpotifyService;
