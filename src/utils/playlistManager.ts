// Playlist management utilities for TuneWell
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioTrack, Playlist, SortOptions } from '../types/navigation';

const PLAYLISTS_KEY = 'tunewell_playlists';
const FAVORITES_KEY = 'tunewell_favorites';
const PLAY_COUNTS_KEY = 'tunewell_play_counts';
const RECENT_TRACKS_KEY = 'tunewell_recent_tracks';

export class PlaylistManager {
  // Favorites management
  static async getFavorites(): Promise<AudioTrack[]> {
    try {
      const favorites = await AsyncStorage.getItem(FAVORITES_KEY);
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  }

  static async addToFavorites(track: AudioTrack): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const existingIndex = favorites.findIndex(t => t.id === track.id);
      
      if (existingIndex === -1) {
        const updatedTrack = { ...track, isFavorite: true };
        favorites.push(updatedTrack);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  }

  static async removeFromFavorites(trackId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filtered = favorites.filter(track => track.id !== trackId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  }

  static async isFavorite(trackId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(track => track.id === trackId);
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  // Play count management
  static async incrementPlayCount(trackId: string): Promise<void> {
    try {
      const playCountsData = await AsyncStorage.getItem(PLAY_COUNTS_KEY);
      const playCounts = playCountsData ? JSON.parse(playCountsData) : {};
      
      playCounts[trackId] = (playCounts[trackId] || 0) + 1;
      await AsyncStorage.setItem(PLAY_COUNTS_KEY, JSON.stringify(playCounts));
    } catch (error) {
      console.error('Error updating play count:', error);
    }
  }

  static async getPlayCount(trackId: string): Promise<number> {
    try {
      const playCountsData = await AsyncStorage.getItem(PLAY_COUNTS_KEY);
      const playCounts = playCountsData ? JSON.parse(playCountsData) : {};
      return playCounts[trackId] || 0;
    } catch (error) {
      console.error('Error getting play count:', error);
      return 0;
    }
  }

  static async getMostPlayedTracks(limit: number = 50): Promise<AudioTrack[]> {
    try {
      const playCountsData = await AsyncStorage.getItem(PLAY_COUNTS_KEY);
      const playCounts = playCountsData ? JSON.parse(playCountsData) : {};
      
      // This would need to be combined with actual track data
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting most played tracks:', error);
      return [];
    }
  }

  // Recent tracks management
  static async addToRecentlyPlayed(track: AudioTrack): Promise<void> {
    try {
      const recentData = await AsyncStorage.getItem(RECENT_TRACKS_KEY);
      const recentTracks = recentData ? JSON.parse(recentData) : [];
      
      // Remove existing entry if present
      const filtered = recentTracks.filter((t: AudioTrack) => t.id !== track.id);
      
      // Add to beginning of array
      filtered.unshift(track);
      
      // Keep only last 100 tracks
      const limited = filtered.slice(0, 100);
      
      await AsyncStorage.setItem(RECENT_TRACKS_KEY, JSON.stringify(limited));
    } catch (error) {
      console.error('Error adding to recently played:', error);
    }
  }

  static async getRecentlyPlayed(limit: number = 50): Promise<AudioTrack[]> {
    try {
      const recentData = await AsyncStorage.getItem(RECENT_TRACKS_KEY);
      const recentTracks = recentData ? JSON.parse(recentData) : [];
      return recentTracks.slice(0, limit);
    } catch (error) {
      console.error('Error getting recently played:', error);
      return [];
    }
  }

  // Custom playlists management
  static async getCustomPlaylists(): Promise<Playlist[]> {
    try {
      const playlistsData = await AsyncStorage.getItem(PLAYLISTS_KEY);
      return playlistsData ? JSON.parse(playlistsData) : [];
    } catch (error) {
      console.error('Error loading playlists:', error);
      return [];
    }
  }

  static async createPlaylist(name: string, description?: string): Promise<Playlist> {
    try {
      const playlists = await this.getCustomPlaylists();
      
      const newPlaylist: Playlist = {
        id: `playlist_${Date.now()}`,
        name,
        description: description || '',
        tracks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        type: 'custom',
      };
      
      playlists.push(newPlaylist);
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
      
      return newPlaylist;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  static async updatePlaylist(playlistId: string, updates: Partial<Playlist>): Promise<void> {
    try {
      const playlists = await this.getCustomPlaylists();
      const index = playlists.findIndex(p => p.id === playlistId);
      
      if (index !== -1) {
        playlists[index] = {
          ...playlists[index],
          ...updates,
          updatedAt: new Date(),
        };
        
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
    }
  }

  static async deletePlaylist(playlistId: string): Promise<void> {
    try {
      const playlists = await this.getCustomPlaylists();
      const filtered = playlists.filter(p => p.id !== playlistId);
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  }

  static async addTrackToPlaylist(playlistId: string, track: AudioTrack): Promise<void> {
    try {
      const playlists = await this.getCustomPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);
      
      if (playlist) {
        const existingIndex = playlist.tracks.findIndex(t => t.id === track.id);
        if (existingIndex === -1) {
          playlist.tracks.push(track);
          playlist.updatedAt = new Date();
          await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
        }
      }
    } catch (error) {
      console.error('Error adding track to playlist:', error);
    }
  }

  static async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    try {
      const playlists = await this.getCustomPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);
      
      if (playlist) {
        playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
        playlist.updatedAt = new Date();
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
      }
    } catch (error) {
      console.error('Error removing track from playlist:', error);
    }
  }

  // Sorting utilities
  static sortTracks(tracks: AudioTrack[], sortOptions: SortOptions): AudioTrack[] {
    return [...tracks].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'artist':
          aValue = a.artist.toLowerCase();
          bValue = b.artist.toLowerCase();
          break;
        case 'album':
          aValue = a.album.toLowerCase();
          bValue = b.album.toLowerCase();
          break;
        case 'dateAdded':
          aValue = a.dateAdded.getTime();
          bValue = b.dateAdded.getTime();
          break;
        case 'fileName':
          aValue = a.filePath.split('/').pop()?.toLowerCase() || '';
          bValue = b.filePath.split('/').pop()?.toLowerCase() || '';
          break;
        case 'folderName':
          aValue = a.filePath.split('/').slice(-2, -1)[0]?.toLowerCase() || '';
          bValue = b.filePath.split('/').slice(-2, -1)[0]?.toLowerCase() || '';
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (sortOptions.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        PLAYLISTS_KEY,
        FAVORITES_KEY,
        PLAY_COUNTS_KEY,
        RECENT_TRACKS_KEY,
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}