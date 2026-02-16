/**
 * TuneWell Playlist Import Service
 * 
 * Handles importing playlists from external streaming platforms:
 * - URL-based import (paste a playlist URL from any platform)
 * - Uses Odesli/song.link API for cross-platform track matching
 * - Resolves tracks to Spotify/Deezer/Qobuz for playback
 */

import { spotifyService } from './SpotifyService';
import { deezerService } from './DeezerService';
import { qobuzService } from './QobuzService';
import { isQobuzConfigured } from './QobuzService';
import { useStreamingStore } from '../../store/streamingStore';
import type { StreamingTrack, ImportedPlaylist } from '../../types';

// ============================================================================
// Odesli / song.link API
// ============================================================================

const ODESLI_API = 'https://api.song.link/v1-alpha.1/links';

interface OdesliResponse {
  entityUniqueId: string;
  userCountry: string;
  pageUrl: string;
  entitiesByUniqueId: Record<string, {
    id: string;
    type: 'song' | 'album';
    title?: string;
    artistName?: string;
    thumbnailUrl?: string;
    apiProvider: string;
    platforms: string[];
  }>;
  linksByPlatform: Record<string, {
    entityUniqueId: string;
    url: string;
    nativeAppUriDesktop?: string;
    nativeAppUriMobile?: string;
  }>;
}

// ============================================================================
// Platform Detection
// ============================================================================

type PlatformType = 'spotify' | 'deezer' | 'qobuz' | 'youtube_music' | 'apple_music' | 'unknown';

function detectPlatform(url: string): PlatformType {
  const lower = url.toLowerCase();
  
  if (lower.includes('open.spotify.com') || lower.includes('spotify:') || lower.includes('spotify.link')) {
    return 'spotify';
  }
  if (lower.includes('deezer.com') || lower.includes('deezer.page.link')) {
    return 'deezer';
  }
  if (lower.includes('qobuz.com') || lower.includes('play.qobuz.com') || lower.includes('open.qobuz.com')) {
    return 'qobuz';
  }
  if (lower.includes('music.youtube.com') || lower.includes('youtube.com/playlist')) {
    return 'youtube_music';
  }
  if (lower.includes('music.apple.com') || lower.includes('itunes.apple.com')) {
    return 'apple_music';
  }
  
  return 'unknown';
}

function extractPlaylistId(url: string, platform: PlatformType): string | null {
  try {
    const urlObj = new URL(url);
    
    switch (platform) {
      case 'spotify': {
        // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
        const match = urlObj.pathname.match(/\/playlist\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
      }
      case 'deezer': {
        // https://www.deezer.com/playlist/1234567
        // https://www.deezer.com/us/playlist/1234567
        const match = urlObj.pathname.match(/\/playlist\/(\d+)/);
        return match ? match[1] : null;
      }
      case 'qobuz': {
        // https://play.qobuz.com/playlist/1234567
        // https://open.qobuz.com/playlist/1234567
        const match = urlObj.pathname.match(/\/playlist\/(\d+)/);
        return match ? match[1] : null;
      }
      case 'youtube_music': {
        // https://music.youtube.com/playlist?list=PLxxxxxx
        return urlObj.searchParams.get('list');
      }
      case 'apple_music': {
        // https://music.apple.com/us/playlist/name/pl.xxxxxxx
        const match = urlObj.pathname.match(/\/playlist\/[^/]+\/(pl\.[a-zA-Z0-9]+)/);
        return match ? match[1] : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ============================================================================
// Playlist Import Service
// ============================================================================

class PlaylistImportService {
  private static instance: PlaylistImportService;

  private constructor() {}

  static getInstance(): PlaylistImportService {
    if (!PlaylistImportService.instance) {
      PlaylistImportService.instance = new PlaylistImportService();
    }
    return PlaylistImportService.instance;
  }

  /**
   * Import a playlist from a URL. 
   * Detects the platform and resolves tracks to Spotify URIs.
   */
  async importFromUrl(url: string): Promise<ImportedPlaylist | null> {
    const platform = detectPlatform(url);
    
    console.log(`[PlaylistImport] Detected platform: ${platform} for URL: ${url}`);
    useStreamingStore.getState().setLoading(true);
    useStreamingStore.getState().setError(null);
    
    try {
      switch (platform) {
        case 'spotify':
          return await this.importSpotifyPlaylist(url);
        case 'deezer':
          return await this.importDeezerPlaylist(url);
        case 'qobuz':
          return await this.importQobuzPlaylist(url);
        case 'youtube_music':
        case 'apple_music':
          return await this.importViaOdesli(url, platform);
        default:
          // Try Odesli as a fallback for unknown URLs
          return await this.importViaOdesli(url, 'unknown');
      }
    } catch (error: any) {
      console.error('[PlaylistImport] Import failed:', error);
      useStreamingStore.getState().setError(error.message || 'Import failed');
      return null;
    } finally {
      useStreamingStore.getState().setLoading(false);
    }
  }

  /**
   * Resolve a shortened URL (e.g. spotify.link) to its final destination.
   * Uses Spotify oEmbed API (most reliable) + GET with HTML parsing as fallback.
   * React Native's fetch on Android does not support redirect:'manual', so we
   * avoid that approach entirely.
   */
  private async resolveShortUrl(url: string): Promise<string> {
    // Approach 1: Spotify oEmbed API — accepts any Spotify URL including short links
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
      console.log('[PlaylistImport] Trying oEmbed resolve:', oembedUrl);
      const oembedRes = await fetch(oembedUrl);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        // oEmbed returns iframe_url like "https://open.spotify.com/embed/playlist/xxxxx"
        const iframeUrl: string | undefined = oembedData.iframe_url;
        if (iframeUrl && iframeUrl.includes('open.spotify.com')) {
          // Convert embed URL to standard URL: /embed/playlist/ID -> /playlist/ID
          const resolved = iframeUrl.replace('/embed/', '/');
          console.log('[PlaylistImport] oEmbed resolved to:', resolved);
          return resolved;
        }
      }
    } catch (oembedErr) {
      console.warn('[PlaylistImport] oEmbed resolve failed:', oembedErr);
    }

    // Approach 2: GET request with automatic redirect following + HTML parsing
    try {
      console.log('[PlaylistImport] Trying GET resolve for:', url);
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
      });

      // Check response.url (works in some React Native versions)
      if (response.url && response.url.includes('open.spotify.com')) {
        console.log('[PlaylistImport] response.url resolved to:', response.url);
        return response.url;
      }

      // Parse HTML for the actual Spotify URL
      const html = await response.text();

      // Look for og:url meta tag
      const ogUrlMatch = html.match(/property=["']og:url["']\s+content=["']([^"']+)["']/);
      if (ogUrlMatch?.[1]?.includes('open.spotify.com')) {
        console.log('[PlaylistImport] og:url resolved to:', ogUrlMatch[1]);
        return ogUrlMatch[1];
      }

      // Look for canonical link
      const canonicalMatch = html.match(/rel=["']canonical["']\s+href=["']([^"']+)["']/);
      if (canonicalMatch?.[1]?.includes('open.spotify.com')) {
        console.log('[PlaylistImport] canonical resolved to:', canonicalMatch[1]);
        return canonicalMatch[1];
      }

      // Look for any open.spotify.com URL in the HTML
      const spotifyUrlMatch = html.match(/https:\/\/open\.spotify\.com\/[^\s"'<>]+/);
      if (spotifyUrlMatch?.[0]) {
        console.log('[PlaylistImport] HTML regex resolved to:', spotifyUrlMatch[0]);
        return spotifyUrlMatch[0];
      }
    } catch (getErr) {
      console.warn('[PlaylistImport] GET resolve failed:', getErr);
    }

    console.warn('[PlaylistImport] Could not resolve short URL, returning original:', url);
    return url;
  }

  /**
   * Import a Spotify playlist directly via Spotify API
   */
  private async importSpotifyPlaylist(url: string): Promise<ImportedPlaylist | null> {
    // Resolve shortened URLs (spotify.link, etc.)
    let resolvedUrl = url;
    const isShortUrl = url.includes('spotify.link');
    
    if (isShortUrl) {
      console.log('[PlaylistImport] Resolving shortened Spotify URL...');
      resolvedUrl = await this.resolveShortUrl(url);
      console.log('[PlaylistImport] Resolved to:', resolvedUrl);
    }

    // Check if the resolved URL is for a track or album (not a playlist)
    if (resolvedUrl.includes('/track/') || resolvedUrl.includes('/album/') || resolvedUrl.includes('/artist/')) {
      const resourceType = resolvedUrl.includes('/track/') ? 'track' : 
                           resolvedUrl.includes('/album/') ? 'album' : 'artist';
      throw new Error(
        `This is a Spotify ${resourceType} link, not a playlist. ` +
        'Please share a playlist link instead: open the playlist in Spotify → tap Share → "Copy link".'
      );
    }

    let playlistId = extractPlaylistId(resolvedUrl, 'spotify');
    
    // If short URL didn't resolve properly, try Odesli as final fallback
    if (!playlistId && isShortUrl) {
      console.warn('[PlaylistImport] Could not extract playlist ID from resolved URL, trying Odesli');
      try {
        const odesliResponse = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}`);
        if (odesliResponse.ok) {
          const odesliData = await odesliResponse.json();
          const spotifyLink = odesliData.linksByPlatform?.spotify?.url;
          if (spotifyLink) {
            console.log('[PlaylistImport] Odesli resolved to:', spotifyLink);
            // Odesli mostly returns track/album URLs, check if it's a playlist
            if (spotifyLink.includes('/track/') || spotifyLink.includes('/album/')) {
              throw new Error(
                'This Spotify link points to a track or album, not a playlist. ' +
                'Please share a playlist link instead: open the playlist in Spotify → tap Share → "Copy link".'
              );
            }
            playlistId = extractPlaylistId(spotifyLink, 'spotify');
          }
        }
      } catch (odesliErr: any) {
        // Re-throw our custom error messages
        if (odesliErr?.message?.includes('not a playlist')) {
          throw odesliErr;
        }
        console.warn('[PlaylistImport] Odesli fallback failed:', odesliErr);
      }
    }

    if (!playlistId) {
      throw new Error(
        'Could not extract playlist ID from this URL. ' +
        'Make sure you are sharing a playlist (not a track or album). ' +
        'Open the playlist in Spotify → tap Share → "Copy link".'
      );
    }

    console.log('[PlaylistImport] Extracted playlist ID:', playlistId);

    // Fetch playlist metadata from API (works for any public/accessible playlist)
    let playlistName = 'Spotify Playlist';
    let playlistImage: string | undefined;
    try {
      const meta = await spotifyService.fetchPlaylistMetadata(playlistId);
      if (meta) {
        playlistName = meta.name;
        playlistImage = meta.imageUrl;
      }
    } catch (e) {
      console.warn('[PlaylistImport] Could not fetch playlist metadata:', e);
    }

    const tracks = await spotifyService.fetchPlaylistTracks(playlistId);
    
    const imported: ImportedPlaylist = {
      id: `import_spotify_${playlistId}_${Date.now()}`,
      name: playlistName,
      source: 'spotify',
      sourceUrl: url,
      imageUrl: playlistImage,
      tracks,
      trackCount: tracks.length,
      importedAt: Date.now(),
    };

    useStreamingStore.getState().addImportedPlaylist(imported);
    return imported;
  }

  /**
   * Import a Deezer playlist directly via Deezer API
   */
  private async importDeezerPlaylist(url: string): Promise<ImportedPlaylist | null> {
    const playlistId = extractPlaylistId(url, 'deezer');
    
    if (!playlistId) {
      throw new Error('Invalid Deezer playlist URL');
    }

    let playlistName = 'Deezer Playlist';
    let playlistImage: string | undefined;
    try {
      const meta = await deezerService.fetchPlaylistMetadata(playlistId);
      if (meta) {
        playlistName = meta.name;
        playlistImage = meta.imageUrl;
      }
    } catch (e) {
      console.warn('[PlaylistImport] Could not fetch Deezer playlist metadata:', e);
    }

    const tracks = await deezerService.fetchPlaylistTracks(playlistId);
    
    const imported: ImportedPlaylist = {
      id: `import_deezer_${playlistId}_${Date.now()}`,
      name: playlistName,
      source: 'deezer',
      sourceUrl: url,
      imageUrl: playlistImage,
      tracks,
      trackCount: tracks.length,
      importedAt: Date.now(),
    };

    useStreamingStore.getState().addImportedPlaylist(imported);
    return imported;
  }

  /**
   * Import a Qobuz playlist directly via Qobuz API
   */
  private async importQobuzPlaylist(url: string): Promise<ImportedPlaylist | null> {
    if (!isQobuzConfigured()) {
      throw new Error('Qobuz integration is coming soon. API access is pending partner approval.');
    }

    const playlistId = extractPlaylistId(url, 'qobuz');
    
    if (!playlistId) {
      throw new Error('Invalid Qobuz playlist URL');
    }

    let playlistName = 'Qobuz Playlist';
    let playlistImage: string | undefined;
    try {
      const meta = await qobuzService.fetchPlaylistMetadata(playlistId);
      if (meta) {
        playlistName = meta.name;
        playlistImage = meta.imageUrl;
      }
    } catch (e) {
      console.warn('[PlaylistImport] Could not fetch Qobuz playlist metadata:', e);
    }

    const tracks = await qobuzService.fetchPlaylistTracks(playlistId);
    
    const imported: ImportedPlaylist = {
      id: `import_qobuz_${playlistId}_${Date.now()}`,
      name: playlistName,
      source: 'qobuz',
      sourceUrl: url,
      imageUrl: playlistImage,
      tracks,
      trackCount: tracks.length,
      importedAt: Date.now(),
    };

    useStreamingStore.getState().addImportedPlaylist(imported);
    return imported;
  }

  /**
   * Import via Odesli API - resolves cross-platform URLs to Spotify tracks
   */
  private async importViaOdesli(url: string, platform: PlatformType): Promise<ImportedPlaylist | null> {
    // Odesli works best for individual songs, not full playlists
    // For playlists, we resolve the URL to get the playlist name,
    // then search Spotify for matching tracks
    
    try {
      const response = await fetch(`${ODESLI_API}?url=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        console.warn('[PlaylistImport] Odesli API returned:', response.status);
        throw new Error(
          `Could not resolve ${platform === 'youtube_music' ? 'YouTube Music' : 
            platform === 'apple_music' ? 'Apple Music' : 'this'} URL. ` +
          'Try pasting individual song links or search on the Streaming tab.'
        );
      }

      const data: OdesliResponse = await response.json();
      
      // Try to get Spotify link from Odesli response
      const spotifyLink = data.linksByPlatform?.spotify;
      
      if (spotifyLink) {
        // Found Spotify equivalent - import that
        return this.importSpotifyPlaylist(spotifyLink.url);
      }

      // No Spotify equivalent found - try to match by name
      const entity = Object.values(data.entitiesByUniqueId)[0];
      if (entity?.title && entity?.artistName) {
        // Search Spotify for this track
        const searchResults = await spotifyService.searchTracks(
          `${entity.title} ${entity.artistName}`,
          5
        );
        
        if (searchResults.length > 0) {
          const imported: ImportedPlaylist = {
            id: `import_${platform}_${Date.now()}`,
            name: entity.title,
            source: platform === 'unknown' ? 'url' : platform,
            sourceUrl: url,
            imageUrl: entity.thumbnailUrl,
            tracks: searchResults.slice(0, 1), // Best match only
            trackCount: 1,
            importedAt: Date.now(),
          };
          
          useStreamingStore.getState().addImportedPlaylist(imported);
          return imported;
        }
      }

      throw new Error('Could not find matching tracks on Spotify');
    } catch (error: any) {
      if (error.message.includes('Could not')) throw error;
      console.error('[PlaylistImport] Odesli resolution failed:', error);
      throw new Error('Failed to resolve URL. Please check the link and try again.');
    }
  }

  /**
   * Search and import by query text (artist + track name)
   */
  async searchAndImport(query: string): Promise<StreamingTrack[]> {
    try {
      useStreamingStore.getState().setLoading(true);
      const results = await spotifyService.searchTracks(query, 20);
      return results;
    } catch (error: any) {
      console.error('[PlaylistImport] Search failed:', error);
      useStreamingStore.getState().setError(error.message);
      return [];
    } finally {
      useStreamingStore.getState().setLoading(false);
    }
  }

  /**
   * Detect if a string is a valid streaming URL
   */
  isStreamingUrl(text: string): boolean {
    return (
      text.includes('open.spotify.com') ||
      text.includes('spotify.link') ||
      text.includes('deezer.com') ||
      text.includes('deezer.page.link') ||
      text.includes('qobuz.com') ||
      text.includes('play.qobuz.com') ||
      text.includes('open.qobuz.com') ||
      text.includes('music.youtube.com') ||
      text.includes('music.apple.com') ||
      text.includes('youtube.com/playlist') ||
      text.includes('song.link') ||
      text.includes('odesli.co')
    );
  }

  /**
   * Get friendly platform name for display
   */
  getPlatformName(url: string): string {
    const platform = detectPlatform(url);
    switch (platform) {
      case 'spotify': return 'Spotify';
      case 'deezer': return 'Deezer';
      case 'qobuz': return 'Qobuz';
      case 'youtube_music': return 'YouTube Music';
      case 'apple_music': return 'Apple Music';
      default: return 'URL';
    }
  }
}

export const playlistImportService = PlaylistImportService.getInstance();
export default PlaylistImportService;
