/**
 * TuneWell Streaming Store
 * 
 * Zustand store for managing Spotify connection and imported playlists.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import type { 
  SpotifyUser, 
  SpotifyPlaylist, 
  SpotifyTrack,
  ImportedPlaylist,
} from '../types';

interface StreamingStoreState {
  // Spotify connection
  spotifyConnected: boolean;
  spotifyUser: SpotifyUser | null;
  spotifyAccessToken: string | null;
  spotifyRefreshToken: string | null;
  spotifyTokenExpiry: number | null;
  
  // Playlists
  spotifyPlaylists: SpotifyPlaylist[];
  importedPlaylists: ImportedPlaylist[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  lastSyncAt: number | null;
  
  // Actions - Spotify Auth
  setSpotifyConnected: (connected: boolean) => void;
  setSpotifyUser: (user: SpotifyUser | null) => void;
  setSpotifyTokens: (accessToken: string, refreshToken: string | null, expiresIn: number) => void;
  clearSpotifyAuth: () => void;
  
  // Actions - Playlists
  setSpotifyPlaylists: (playlists: SpotifyPlaylist[]) => void;
  addImportedPlaylist: (playlist: ImportedPlaylist) => void;
  updateImportedPlaylist: (id: string, updates: Partial<ImportedPlaylist>) => void;
  removeImportedPlaylist: (id: string) => void;
  
  // Actions - UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastSyncAt: (timestamp: number) => void;
  
  // Utility
  reset: () => void;
  isTokenValid: () => boolean;
}

const initialState = {
  spotifyConnected: false,
  spotifyUser: null,
  spotifyAccessToken: null,
  spotifyRefreshToken: null,
  spotifyTokenExpiry: null,
  spotifyPlaylists: [],
  importedPlaylists: [],
  isLoading: false,
  error: null,
  lastSyncAt: null,
};

export const useStreamingStore = create<StreamingStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Spotify Auth
      setSpotifyConnected: (connected) => set({ spotifyConnected: connected }),
      
      setSpotifyUser: (user) => set({ spotifyUser: user }),
      
      setSpotifyTokens: (accessToken, refreshToken, expiresIn) => set({
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken ?? get().spotifyRefreshToken,
        spotifyTokenExpiry: Date.now() + (expiresIn * 1000),
        spotifyConnected: true,
      }),
      
      clearSpotifyAuth: () => set({
        spotifyConnected: false,
        spotifyUser: null,
        spotifyAccessToken: null,
        spotifyRefreshToken: null,
        spotifyTokenExpiry: null,
        spotifyPlaylists: [],
      }),
      
      // Playlists
      setSpotifyPlaylists: (playlists) => set({ spotifyPlaylists: playlists }),
      
      addImportedPlaylist: (playlist) => set((state) => ({
        importedPlaylists: [...state.importedPlaylists, playlist],
      })),
      
      updateImportedPlaylist: (id, updates) => set((state) => ({
        importedPlaylists: state.importedPlaylists.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      })),
      
      removeImportedPlaylist: (id) => set((state) => ({
        importedPlaylists: state.importedPlaylists.filter((p) => p.id !== id),
      })),
      
      // UI
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
      
      // Utility
      reset: () => set(initialState),
      
      isTokenValid: () => {
        const { spotifyAccessToken, spotifyTokenExpiry } = get();
        if (!spotifyAccessToken || !spotifyTokenExpiry) return false;
        // Token is valid if it expires more than 60 seconds from now
        return spotifyTokenExpiry > Date.now() + 60000;
      },
    }),
    {
      name: 'tunewell-streaming',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        // Persist connection state and playlists, NOT tokens (security)
        spotifyConnected: state.spotifyConnected,
        spotifyUser: state.spotifyUser,
        spotifyRefreshToken: state.spotifyRefreshToken,
        importedPlaylists: state.importedPlaylists,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
