/**
 * TuneWell Streaming Store
 * 
 * Zustand store for managing Spotify connection and imported playlists.
 * Deezer and Qobuz are supported via URL import only (no account login).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import type { 
  SpotifyUser, 
  SpotifyPlaylist, 
  ImportedPlaylist,
  StreamingTrack,
  QobuzUser,
  QobuzPlaylist,
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
  spotifyPlaylistTracks: Record<string, StreamingTrack[]>;
  importedPlaylists: ImportedPlaylist[];
  
  // Qobuz (future — currently "Coming Soon")
  qobuzUserAuthToken: string | null;
  qobuzUser: QobuzUser | null;
  qobuzPlaylists: QobuzPlaylist[];
  
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
  setSpotifyPlaylistTracks: (playlistId: string, tracks: StreamingTrack[]) => void;
  getSpotifyPlaylistTracks: (playlistId: string) => StreamingTrack[];
  addImportedPlaylist: (playlist: ImportedPlaylist) => void;
  updateImportedPlaylist: (id: string, updates: Partial<ImportedPlaylist>) => void;
  removeImportedPlaylist: (id: string) => void;
  
  // Actions - Qobuz
  setQobuzAuth: (token: string, user: QobuzUser) => void;
  clearQobuzAuth: () => void;
  setQobuzPlaylists: (playlists: QobuzPlaylist[]) => void;
  
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
  spotifyPlaylistTracks: {},
  importedPlaylists: [],
  qobuzUserAuthToken: null,
  qobuzUser: null,
  qobuzPlaylists: [],
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
        spotifyPlaylistTracks: {},
      }),
      
      // Playlists
      setSpotifyPlaylists: (playlists) => set({ spotifyPlaylists: playlists }),
      
      setSpotifyPlaylistTracks: (playlistId, tracks) => set((state) => ({
        spotifyPlaylistTracks: { ...state.spotifyPlaylistTracks, [playlistId]: tracks },
      })),
      
      getSpotifyPlaylistTracks: (playlistId) => {
        return get().spotifyPlaylistTracks[playlistId] || [];
      },
      
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
      
      // Qobuz
      setQobuzAuth: (token, user) => set({
        qobuzUserAuthToken: token,
        qobuzUser: user,
      }),
      
      clearQobuzAuth: () => set({
        qobuzUserAuthToken: null,
        qobuzUser: null,
        qobuzPlaylists: [],
      }),
      
      setQobuzPlaylists: (playlists) => set({ qobuzPlaylists: playlists }),
      
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
        // Persist connection state, tokens, and playlists
        spotifyConnected: state.spotifyConnected,
        spotifyUser: state.spotifyUser,
        spotifyRefreshToken: state.spotifyRefreshToken,
        spotifyPlaylists: state.spotifyPlaylists,
        spotifyPlaylistTracks: state.spotifyPlaylistTracks,
        importedPlaylists: state.importedPlaylists,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
