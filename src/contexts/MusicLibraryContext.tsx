// Music Library Context for managing music collection and playback state
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioTrack } from '../types/navigation';

interface MusicLibraryState {
  tracks: AudioTrack[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentPosition: number;
  isLoading: boolean;
  recentlyAdded: AudioTrack[];
  mostPlayed: AudioTrack[];
  favorites: AudioTrack[];
}

interface MusicLibraryContextType {
  library: MusicLibraryState;
  addTrack: (track: AudioTrack) => Promise<void>;
  removeTrack: (trackId: string) => Promise<void>;
  setCurrentTrack: (track: AudioTrack | null) => void;
  setPlaying: (isPlaying: boolean) => void;
  setPosition: (position: number) => void;
  toggleFavorite: (trackId: string) => Promise<void>;
  incrementPlayCount: (trackId: string) => Promise<void>;
  getRecentlyAdded: () => AudioTrack[];
  getMostPlayed: () => AudioTrack[];
  getFavorites: () => AudioTrack[];
  searchTracks: (query: string) => AudioTrack[];
  clearLibrary: () => Promise<void>;
}

const MusicLibraryContext = createContext<MusicLibraryContextType | undefined>(undefined);

export const useMusicLibrary = (): MusicLibraryContextType => {
  const context = useContext(MusicLibraryContext);
  if (!context) {
    throw new Error('useMusicLibrary must be used within a MusicLibraryProvider');
  }
  return context;
};

export const MusicLibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [library, setLibrary] = useState<MusicLibraryState>({
    tracks: [],
    currentTrack: null,
    isPlaying: false,
    currentPosition: 0,
    isLoading: false,
    recentlyAdded: [],
    mostPlayed: [],
    favorites: [],
  });

  // Load library from storage on mount
  useEffect(() => {
    loadLibrary();
  }, []);

  // Save library to storage whenever tracks change
  useEffect(() => {
    if (library.tracks.length > 0) {
      saveLibrary();
    }
  }, [library.tracks]);

  // Update smart playlists when tracks change
  useEffect(() => {
    updateSmartPlaylists();
  }, [library.tracks]);

  const loadLibrary = async () => {
    try {
      setLibrary(prev => ({ ...prev, isLoading: true }));
      
      const [tracksData, currentTrackData, playbackState] = await Promise.all([
        AsyncStorage.getItem('@tunewell_tracks'),
        AsyncStorage.getItem('@tunewell_current_track'),
        AsyncStorage.getItem('@tunewell_playback_state'),
      ]);

      const tracks: AudioTrack[] = tracksData ? JSON.parse(tracksData) : [];
      const currentTrack: AudioTrack | null = currentTrackData ? JSON.parse(currentTrackData) : null;
      const { isPlaying = false, currentPosition = 0 } = playbackState ? JSON.parse(playbackState) : {};

      setLibrary(prev => ({
        ...prev,
        tracks,
        currentTrack,
        isPlaying,
        currentPosition,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error loading music library:', error);
      setLibrary(prev => ({ ...prev, isLoading: false }));
    }
  };

  const saveLibrary = async () => {
    try {
      await AsyncStorage.setItem('@tunewell_tracks', JSON.stringify(library.tracks));
    } catch (error) {
      console.error('Error saving music library:', error);
    }
  };

  const saveCurrentTrack = async (track: AudioTrack | null) => {
    try {
      if (track) {
        await AsyncStorage.setItem('@tunewell_current_track', JSON.stringify(track));
      } else {
        await AsyncStorage.removeItem('@tunewell_current_track');
      }
    } catch (error) {
      console.error('Error saving current track:', error);
    }
  };

  const savePlaybackState = async (isPlaying: boolean, position: number) => {
    try {
      await AsyncStorage.setItem('@tunewell_playback_state', JSON.stringify({
        isPlaying,
        currentPosition: position,
      }));
    } catch (error) {
      console.error('Error saving playback state:', error);
    }
  };

  const updateSmartPlaylists = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Recently Added (last 7 days)
    const recentlyAdded = library.tracks
      .filter(track => new Date(track.dateAdded) > oneWeekAgo)
      .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
      .slice(0, 50);

    // Most Played (sorted by play count)
    const mostPlayed = library.tracks
      .filter(track => track.playCount > 0)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 50);

    // Favorites
    const favorites = library.tracks
      .filter(track => track.isFavorite)
      .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

    setLibrary(prev => ({
      ...prev,
      recentlyAdded,
      mostPlayed,
      favorites,
    }));
  };

  const addTrack = async (track: AudioTrack) => {
    // Check if track already exists
    const existingIndex = library.tracks.findIndex(t => t.uri === track.uri);
    
    if (existingIndex >= 0) {
      // Update existing track
      const updatedTracks = [...library.tracks];
      updatedTracks[existingIndex] = { ...track, dateAdded: new Date().toISOString() };
      setLibrary(prev => ({ ...prev, tracks: updatedTracks }));
    } else {
      // Add new track
      const newTrack = { ...track, dateAdded: new Date().toISOString() };
      setLibrary(prev => ({ ...prev, tracks: [...prev.tracks, newTrack] }));
    }
  };

  const removeTrack = async (trackId: string) => {
    const updatedTracks = library.tracks.filter(track => track.id !== trackId);
    setLibrary(prev => ({ ...prev, tracks: updatedTracks }));

    // Clear current track if it's the one being removed
    if (library.currentTrack?.id === trackId) {
      setCurrentTrack(null);
    }
  };

  const setCurrentTrack = (track: AudioTrack | null) => {
    setLibrary(prev => ({ ...prev, currentTrack: track }));
    saveCurrentTrack(track);
  };

  const setPlaying = (isPlaying: boolean) => {
    setLibrary(prev => ({ ...prev, isPlaying }));
    savePlaybackState(isPlaying, library.currentPosition);
  };

  const setPosition = (position: number) => {
    setLibrary(prev => ({ ...prev, currentPosition: position }));
  };

  const toggleFavorite = async (trackId: string) => {
    const updatedTracks = library.tracks.map(track =>
      track.id === trackId ? { ...track, isFavorite: !track.isFavorite } : track
    );
    setLibrary(prev => ({ ...prev, tracks: updatedTracks }));
  };

  const incrementPlayCount = async (trackId: string) => {
    const updatedTracks = library.tracks.map(track =>
      track.id === trackId ? { ...track, playCount: track.playCount + 1 } : track
    );
    setLibrary(prev => ({ ...prev, tracks: updatedTracks }));
  };

  const getRecentlyAdded = () => library.recentlyAdded;
  const getMostPlayed = () => library.mostPlayed;
  const getFavorites = () => library.favorites;

  const searchTracks = (query: string): AudioTrack[] => {
    if (!query.trim()) return library.tracks;
    
    const searchTerm = query.toLowerCase();
    return library.tracks.filter(track =>
      track.title.toLowerCase().includes(searchTerm) ||
      track.artist.toLowerCase().includes(searchTerm) ||
      track.album.toLowerCase().includes(searchTerm)
    );
  };

  const clearLibrary = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('@tunewell_tracks'),
        AsyncStorage.removeItem('@tunewell_current_track'),
        AsyncStorage.removeItem('@tunewell_playback_state'),
      ]);
      
      setLibrary({
        tracks: [],
        currentTrack: null,
        isPlaying: false,
        currentPosition: 0,
        isLoading: false,
        recentlyAdded: [],
        mostPlayed: [],
        favorites: [],
      });
    } catch (error) {
      console.error('Error clearing library:', error);
    }
  };

  return (
    <MusicLibraryContext.Provider
      value={{
        library,
        addTrack,
        removeTrack,
        setCurrentTrack,
        setPlaying,
        setPosition,
        toggleFavorite,
        incrementPlayCount,
        getRecentlyAdded,
        getMostPlayed,
        getFavorites,
        searchTracks,
        clearLibrary,
      }}
    >
      {children}
    </MusicLibraryContext.Provider>
  );
};