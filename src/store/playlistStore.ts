/**
 * Playlist Store - Manages playlists and favorites
 */

import {create} from 'zustand';
import {Playlist, Track, PlaylistType, MoodType} from '@/types';

interface PlaylistStore {
  // State
  playlists: Playlist[];
  favorites: Track[];
  mostPlayed: Track[];
  recentlyAdded: Track[];

  // Actions
  setPlaylists: (playlists: Playlist[]) => void;
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  
  setFavorites: (tracks: Track[]) => void;
  addToFavorites: (track: Track) => void;
  removeFromFavorites: (trackId: string) => void;
  
  setMostPlayed: (tracks: Track[]) => void;
  setRecentlyAdded: (tracks: Track[]) => void;

  // Computed
  getPlaylistById: (id: string) => Playlist | undefined;
  getPlaylistsByType: (type: PlaylistType) => Playlist[];
  getMoodPlaylists: () => Playlist[];
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  // Initial state
  playlists: [],
  favorites: [],
  mostPlayed: [],
  recentlyAdded: [],

  // Actions
  setPlaylists: (playlists) => set({playlists}),

  addPlaylist: (playlist) => {
    const {playlists} = get();
    set({playlists: [...playlists, playlist]});
  },

  updatePlaylist: (id, updates) => {
    const {playlists} = get();
    set({
      playlists: playlists.map(playlist =>
        playlist.id === id ? {...playlist, ...updates} : playlist
      ),
    });
  },

  deletePlaylist: (id) => {
    const {playlists} = get();
    set({playlists: playlists.filter(playlist => playlist.id !== id)});
  },

  addTrackToPlaylist: (playlistId, trackId) => {
    const {playlists} = get();
    set({
      playlists: playlists.map(playlist =>
        playlist.id === playlistId
          ? {
              ...playlist,
              trackIds: [...playlist.trackIds, trackId],
              dateModified: new Date(),
            }
          : playlist
      ),
    });
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    const {playlists} = get();
    set({
      playlists: playlists.map(playlist =>
        playlist.id === playlistId
          ? {
              ...playlist,
              trackIds: playlist.trackIds.filter(id => id !== trackId),
              dateModified: new Date(),
            }
          : playlist
      ),
    });
  },

  setFavorites: (tracks) => set({favorites: tracks}),

  addToFavorites: (track) => {
    const {favorites} = get();
    if (!favorites.find(t => t.id === track.id)) {
      set({favorites: [...favorites, track]});
    }
  },

  removeFromFavorites: (trackId) => {
    const {favorites} = get();
    set({favorites: favorites.filter(track => track.id !== trackId)});
  },

  setMostPlayed: (tracks) => set({mostPlayed: tracks}),
  setRecentlyAdded: (tracks) => set({recentlyAdded: tracks}),

  // Computed getters
  getPlaylistById: (id) => {
    const {playlists} = get();
    return playlists.find(playlist => playlist.id === id);
  },

  getPlaylistsByType: (type) => {
    const {playlists} = get();
    return playlists.filter(playlist => playlist.type === type);
  },

  getMoodPlaylists: () => {
    const {playlists} = get();
    return playlists.filter(playlist => playlist.type === PlaylistType.MOOD);
  },
}));
