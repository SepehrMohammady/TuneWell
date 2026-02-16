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
   * Uses multiple approaches since React Native's fetch behaves differently from browsers.
   */
  private async resolveShortUrl(url: string): Promise<string> {
    // Approach 1: Spotify oEmbed API — accepts Spotify URLs and may resolve short links
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
      console.log('[PlaylistImport] Trying oEmbed resolve...');
      const oembedRes = await fetch(oembedUrl);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        const iframeUrl: string | undefined = oembedData.iframe_url;
        if (iframeUrl && iframeUrl.includes('open.spotify.com')) {
          const resolved = iframeUrl.replace('/embed/', '/');
          console.log('[PlaylistImport] oEmbed resolved to:', resolved);
          return resolved;
        }
      }
    } catch (oembedErr) {
      console.warn('[PlaylistImport] oEmbed resolve failed:', oembedErr);
    }

    // Approach 2: GET with default User-Agent (React Native / OkHttp follows redirects)
    try {
      console.log('[PlaylistImport] Trying GET resolve (default UA)...');
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
      });

      if (response.url && response.url.includes('open.spotify.com')) {
        console.log('[PlaylistImport] response.url resolved to:', response.url);
        return response.url;
      }

      const html = await response.text();
      const urlFromHtml = this.extractSpotifyUrlFromHtml(html);
      if (urlFromHtml) {
        console.log('[PlaylistImport] HTML parse resolved to:', urlFromHtml);
        return urlFromHtml;
      }
    } catch (err1) {
      console.warn('[PlaylistImport] GET resolve (default) failed:', err1);
    }

    // Approach 3: GET with browser User-Agent (some CDNs behave differently)
    try {
      console.log('[PlaylistImport] Trying GET resolve (browser UA)...');
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      if (response.url && response.url.includes('open.spotify.com')) {
        console.log('[PlaylistImport] response.url (browser) resolved to:', response.url);
        return response.url;
      }

      const html = await response.text();
      const urlFromHtml = this.extractSpotifyUrlFromHtml(html);
      if (urlFromHtml) {
        console.log('[PlaylistImport] HTML parse (browser) resolved to:', urlFromHtml);
        return urlFromHtml;
      }
    } catch (err2) {
      console.warn('[PlaylistImport] GET resolve (browser) failed:', err2);
    }

    // Approach 4: GET with curl-like User-Agent (forces simple redirect)
    try {
      console.log('[PlaylistImport] Trying GET resolve (curl UA)...');
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'curl/7.88.0' },
      });

      if (response.url && response.url.includes('open.spotify.com')) {
        console.log('[PlaylistImport] response.url (curl) resolved to:', response.url);
        return response.url;
      }

      const html = await response.text();
      const urlFromHtml = this.extractSpotifyUrlFromHtml(html);
      if (urlFromHtml) {
        console.log('[PlaylistImport] HTML parse (curl) resolved to:', urlFromHtml);
        return urlFromHtml;
      }
    } catch (err3) {
      console.warn('[PlaylistImport] GET resolve (curl) failed:', err3);
    }

    console.warn('[PlaylistImport] Could not resolve short URL, returning original:', url);
    return url;
  }

  /**
   * Extract an open.spotify.com URL from HTML content
   */
  private extractSpotifyUrlFromHtml(html: string): string | null {
    // og:url meta tag (either attribute order)
    const ogUrl1 = html.match(/property=["']og:url["'][^>]*content=["']([^"']+)["']/);
    if (ogUrl1?.[1]?.includes('open.spotify.com')) return ogUrl1[1];
    const ogUrl2 = html.match(/content=["']([^"']+open\.spotify\.com[^"']*)["'][^>]*property=["']og:url["']/);
    if (ogUrl2?.[1]) return ogUrl2[1];

    // canonical link (either attribute order)
    const canon1 = html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/);
    if (canon1?.[1]?.includes('open.spotify.com')) return canon1[1];
    const canon2 = html.match(/href=["']([^"']+open\.spotify\.com[^"']*)["'][^>]*rel=["']canonical["']/);
    if (canon2?.[1]) return canon2[1];

    // meta http-equiv="refresh" redirect
    const refresh = html.match(/http-equiv=["']refresh["'][^>]*url=([^"'\s>]+)/i);
    if (refresh?.[1]?.includes('open.spotify.com')) return refresh[1];

    // JavaScript redirect: window.location = "..."
    const jsRedirect = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+open\.spotify\.com[^"']*)["']/);
    if (jsRedirect?.[1]) return jsRedirect[1];

    // Any open.spotify.com URL in the HTML (playlist preferred)
    const playlistUrl = html.match(/https:\/\/open\.spotify\.com\/playlist\/[a-zA-Z0-9]+/);
    if (playlistUrl?.[0]) return playlistUrl[0];

    // Any open.spotify.com URL
    const anyUrl = html.match(/https:\/\/open\.spotify\.com\/[^\s"'<>]+/);
    if (anyUrl?.[0]) return anyUrl[0];

    return null;
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

    // Fetch playlist metadata from API
    let playlistName = 'Spotify Playlist';
    let playlistImage: string | undefined;
    try {
      const meta = await spotifyService.fetchPlaylistMetadata(playlistId);
      if (meta) {
        playlistName = meta.name;
        playlistImage = meta.imageUrl;
      }
    } catch (metaErr: any) {
      const metaMsg = metaErr?.message || '';
      // If metadata fetch returns 404, the playlist doesn't exist or isn't accessible
      if (metaMsg.includes('404') || metaMsg.includes('not found') || metaMsg.includes('Resource not found')) {
        throw new Error(
          'This playlist could not be found on Spotify.\n\n' +
          'Possible reasons:\n' +
          '• The link may point to a track or album, not a playlist\n' +
          '• The playlist may be private or deleted\n' +
          '• The shared link may have expired\n\n' +
          'To import a playlist: open it in Spotify → tap the ⋮ menu → Share → "Copy link"'
        );
      }
      console.warn('[PlaylistImport] Could not fetch playlist metadata:', metaErr);
    }

    let tracks: StreamingTrack[] = [];
    try {
      tracks = await spotifyService.fetchPlaylistTracks(playlistId);
    } catch (tracksErr: any) {
      const tracksMsg = tracksErr?.message || '';
      if (tracksMsg.includes('404') || tracksMsg.includes('not found') || tracksMsg.includes('Resource not found')) {
        throw new Error(
          'This playlist could not be found on Spotify.\n\n' +
          'Make sure you\'re sharing a playlist link (not a track or album).\n' +
          'Open the playlist in Spotify → tap ⋮ → Share → "Copy link"'
        );
      }
      throw tracksErr;
    }
    
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
