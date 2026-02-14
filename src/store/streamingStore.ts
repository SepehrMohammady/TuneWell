/**
 * TuneWell Streaming Store
 * 
 * Zustand store for managing Spotify, Deezer, and Qobuz
 * connections and imported playlists.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import type { 
  SpotifyUser, 
  SpotifyPlaylist, 
  DeezerUser,
  DeezerPlaylist,
  QobuzUser,
  QobuzPlaylist,
  StreamingTrack,
  ImportedPlaylist,
} from '../types';

interface StreamingStoreState {
  // Spotify connection
  spotifyConnected: boolean;
  spotifyUser: SpotifyUser | null;
  spotifyAccessToken: string | null;
  spotifyRefreshToken: string | null;
  spotifyTokenExpiry: number | null;
  
  // Deezer connection
  deezerConnected: boolean;
  deezerUser: DeezerUser | null;
  deezerAccessToken: string | null;
  
  // Qobuz connection
  qobuzConnected: boolean;
  qobuzUser: QobuzUser | null;
  qobuzUserAuthToken: string | null;
  
  // Playlists
  spotifyPlaylists: SpotifyPlaylist[];
  deezerPlaylists: DeezerPlaylist[];
  qobuzPlaylists: QobuzPlaylist[];
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
  
  // Actions - Deezer Auth
  setDeezerToken: (accessToken: string) => void;
  setDeezerUser: (user: DeezerUser | null) => void;
  clearDeezerAuth: () => void;
  
  // Actions - Qobuz Auth
  setQobuzAuth: (token: string, user: QobuzUser) => void;
  clearQobuzAuth: () => void;
  
  // Actions - Playlists
  setSpotifyPlaylists: (playlists: SpotifyPlaylist[]) => void;
  setDeezerPlaylists: (playlists: DeezerPlaylist[]) => void;
  setQobuzPlaylists: (playlists: QobuzPlaylist[]) => void;
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
  deezerConnected: false,
  deezerUser: null,
  deezerAccessToken: null,
  qobuzConnected: false,
  qobuzUser: null,
  qobuzUserAuthToken: null,
  spotifyPlaylists: [],
  deezerPlaylists: [],
  qobuzPlaylists: [],
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
      
      // Deezer Auth
      setDeezerToken: (accessToken) => set({
        deezerAccessToken: accessToken,
        deezerConnected: true,
      }),
      
      setDeezerUser: (user) => set({ deezerUser: user }),
      
      clearDeezerAuth: () => set({
        deezerConnected: false,
        deezerUser: null,
        deezerAccessToken: null,
        deezerPlaylists: [],
      }),
      
      // Qobuz Auth
      setQobuzAuth: (token, user) => set({
        qobuzUserAuthToken: token,
        qobuzUser: user,
        qobuzConnected: true,
      }),
      
      clearQobuzAuth: () => set({
        qobuzConnected: false,
        qobuzUser: null,
        qobuzUserAuthToken: null,
        qobuzPlaylists: [],
      }),
      
      // Playlists
      setSpotifyPlaylists: (playlists) => set({ spotifyPlaylists: playlists }),
      
      setDeezerPlaylists: (playlists) => set({ deezerPlaylists: playlists }),
      
      setQobuzPlaylists: (playlists) => set({ qobuzPlaylists: playlists }),
      
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
        // Persist connection state and tokens, NOT UI state
        spotifyConnected: state.spotifyConnected,
        spotifyUser: state.spotifyUser,
        spotifyRefreshToken: state.spotifyRefreshToken,
        deezerConnected: state.deezerConnected,
        deezerUser: state.deezerUser,
        deezerAccessToken: state.deezerAccessToken, // long-lived, no expiry
        qobuzConnected: state.qobuzConnected,
        qobuzUser: state.qobuzUser,
        qobuzUserAuthToken: state.qobuzUserAuthToken,
        importedPlaylists: state.importedPlaylists,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
