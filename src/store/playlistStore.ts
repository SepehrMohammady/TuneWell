/**
 * TuneWell Playlist Store
 * 
 * Zustand store for managing playlists, favorites, and track metadata.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import type { MoodId } from '../config/constants';

export interface TrackMeta {
  id: string;
  isFavorite: boolean;
  playCount: number;
  lastPlayedAt: number | null;
  addedAt: number;
  moods: MoodId[];
  rating: number;
}

export interface CustomPlaylist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

interface PlaylistState {
  // Track metadata (favorites, play counts, moods)
  trackMeta: Record<string, TrackMeta>;
  
  // Custom playlists
  customPlaylists: CustomPlaylist[];
  
  // Recently played track IDs (most recent first)
  recentlyPlayed: string[];
  
  // Actions - Favorites
  toggleFavorite: (trackId: string) => boolean;
  isFavorite: (trackId: string) => boolean;
  getFavoriteIds: () => string[];
  
  // Actions - Play tracking
  recordPlay: (trackId: string) => void;
  getPlayCount: (trackId: string) => number;
  getMostPlayedIds: (limit?: number) => string[];
  getRecentlyPlayedIds: (limit?: number) => string[];
  
  // Actions - Moods
  setTrackMoods: (trackId: string, moods: MoodId[]) => void;
  addMoodToTrack: (trackId: string, mood: MoodId) => void;
  removeMoodFromTrack: (trackId: string, mood: MoodId) => void;
  getTrackMoods: (trackId: string) => MoodId[];
  getTracksByMood: (mood: MoodId) => string[];
  
  // Actions - Rating
  setTrackRating: (trackId: string, rating: number) => void;
  getTrackRating: (trackId: string) => number;
  
  // Actions - Custom Playlists
  createPlaylist: (name: string, description?: string) => string;
  deletePlaylist: (playlistId: string) => void;
  renamePlaylist: (playlistId: string, name: string) => void;
  addToPlaylist: (playlistId: string, trackIds: string[]) => void;
  removeFromPlaylist: (playlistId: string, trackIds: string[]) => void;
  getPlaylist: (playlistId: string) => CustomPlaylist | undefined;
  
  // Actions - Track Meta
  getTrackMeta: (trackId: string) => TrackMeta;
  ensureTrackMeta: (trackId: string) => TrackMeta;
  
  // Utility
  reset: () => void;
}

const createDefaultMeta = (trackId: string): TrackMeta => ({
  id: trackId,
  isFavorite: false,
  playCount: 0,
  lastPlayedAt: null,
  addedAt: Date.now(),
  moods: [],
  rating: 0,
});

const initialState = {
  trackMeta: {} as Record<string, TrackMeta>,
  customPlaylists: [] as CustomPlaylist[],
  recentlyPlayed: [] as string[],
};

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Favorites
      toggleFavorite: (trackId) => {
        const meta = get().ensureTrackMeta(trackId);
        const newFavorite = !meta.isFavorite;
        
        set((state) => ({
          trackMeta: {
            ...state.trackMeta,
            [trackId]: { ...meta, isFavorite: newFavorite },
          },
        }));
        
        return newFavorite;
      },
      
      isFavorite: (trackId) => {
        return get().trackMeta[trackId]?.isFavorite || false;
      },
      
      getFavoriteIds: () => {
        const { trackMeta } = get();
        return Object.entries(trackMeta)
          .filter(([_, meta]) => meta.isFavorite)
          .map(([id]) => id);
      },
      
      // Play tracking
      recordPlay: (trackId) => {
        const meta = get().ensureTrackMeta(trackId);
        const now = Date.now();
        
        set((state) => {
          // Update track meta
          const newMeta = {
            ...meta,
            playCount: meta.playCount + 1,
            lastPlayedAt: now,
          };
          
          // Update recently played (add to front, remove duplicates, limit to 100)
          const recentlyPlayed = [
            trackId,
            ...state.recentlyPlayed.filter((id) => id !== trackId),
          ].slice(0, 100);
          
          return {
            trackMeta: { ...state.trackMeta, [trackId]: newMeta },
            recentlyPlayed,
          };
        });
      },
      
      getPlayCount: (trackId) => {
        return get().trackMeta[trackId]?.playCount || 0;
      },
      
      getMostPlayedIds: (limit = 50) => {
        const { trackMeta } = get();
        return Object.entries(trackMeta)
          .filter(([_, meta]) => meta.playCount > 0)
          .sort((a, b) => b[1].playCount - a[1].playCount)
          .slice(0, limit)
          .map(([id]) => id);
      },
      
      getRecentlyPlayedIds: (limit = 50) => {
        return get().recentlyPlayed.slice(0, limit);
      },
      
      // Moods
      setTrackMoods: (trackId, moods) => {
        const meta = get().ensureTrackMeta(trackId);
        set((state) => ({
          trackMeta: {
            ...state.trackMeta,
            [trackId]: { ...meta, moods },
          },
        }));
      },
      
      addMoodToTrack: (trackId, mood) => {
        const meta = get().ensureTrackMeta(trackId);
        if (!meta.moods.includes(mood)) {
          set((state) => ({
            trackMeta: {
              ...state.trackMeta,
              [trackId]: { ...meta, moods: [...meta.moods, mood] },
            },
          }));
        }
      },
      
      removeMoodFromTrack: (trackId, mood) => {
        const meta = get().ensureTrackMeta(trackId);
        set((state) => ({
          trackMeta: {
            ...state.trackMeta,
            [trackId]: { ...meta, moods: meta.moods.filter((m) => m !== mood) },
          },
        }));
      },
      
      getTrackMoods: (trackId) => {
        return get().trackMeta[trackId]?.moods || [];
      },
      
      getTracksByMood: (mood) => {
        const { trackMeta } = get();
        return Object.entries(trackMeta)
          .filter(([_, meta]) => meta.moods.includes(mood))
          .map(([id]) => id);
      },
      
      // Rating
      setTrackRating: (trackId, rating) => {
        const meta = get().ensureTrackMeta(trackId);
        set((state) => ({
          trackMeta: {
            ...state.trackMeta,
            [trackId]: { ...meta, rating: Math.max(0, Math.min(5, rating)) },
          },
        }));
      },
      
      getTrackRating: (trackId) => {
        return get().trackMeta[trackId]?.rating || 0;
      },
      
      // Custom Playlists
      createPlaylist: (name, description) => {
        const id = `playlist_${Date.now()}`;
        const now = Date.now();
        
        const playlist: CustomPlaylist = {
          id,
          name,
          description,
          trackIds: [],
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          customPlaylists: [...state.customPlaylists, playlist],
        }));
        
        return id;
      },
      
      deletePlaylist: (playlistId) => {
        set((state) => ({
          customPlaylists: state.customPlaylists.filter((p) => p.id !== playlistId),
        }));
      },
      
      renamePlaylist: (playlistId, name) => {
        set((state) => ({
          customPlaylists: state.customPlaylists.map((p) =>
            p.id === playlistId ? { ...p, name, updatedAt: Date.now() } : p
          ),
        }));
      },
      
      addToPlaylist: (playlistId, trackIds) => {
        set((state) => ({
          customPlaylists: state.customPlaylists.map((p) => {
            if (p.id !== playlistId) return p;
            const newIds = trackIds.filter((id) => !p.trackIds.includes(id));
            return {
              ...p,
              trackIds: [...p.trackIds, ...newIds],
              updatedAt: Date.now(),
            };
          }),
        }));
      },
      
      removeFromPlaylist: (playlistId, trackIds) => {
        set((state) => ({
          customPlaylists: state.customPlaylists.map((p) => {
            if (p.id !== playlistId) return p;
            return {
              ...p,
              trackIds: p.trackIds.filter((id) => !trackIds.includes(id)),
              updatedAt: Date.now(),
            };
          }),
        }));
      },
      
      getPlaylist: (playlistId) => {
        return get().customPlaylists.find((p) => p.id === playlistId);
      },
      
      // Track Meta
      getTrackMeta: (trackId) => {
        return get().trackMeta[trackId] || createDefaultMeta(trackId);
      },
      
      ensureTrackMeta: (trackId) => {
        const existing = get().trackMeta[trackId];
        if (existing) return existing;
        
        const newMeta = createDefaultMeta(trackId);
        set((state) => ({
          trackMeta: { ...state.trackMeta, [trackId]: newMeta },
        }));
        return newMeta;
      },
      
      reset: () => set(initialState),
    }),
    {
      name: 'tunewell-playlists',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

// Re-export for convenience
export default usePlaylistStore;
