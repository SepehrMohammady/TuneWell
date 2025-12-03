/**
 * TuneWell useDatabase Hook
 * Access and manage the WatermelonDB database
 */

import { useCallback, useState, useEffect } from 'react';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import { Track, Playlist } from '../types';

// Helper to convert DB record to Track (with defaults for missing fields)
const recordToTrack = (record: any): Track => ({
  id: record.id,
  uri: record.uri || record.filePath || '',
  filePath: record.filePath || '',
  fileName: record.fileName || '',
  folderPath: record.folderPath || '',
  folderName: record.folderName || '',
  title: record.title || 'Unknown',
  artist: record.artist || 'Unknown Artist',
  album: record.album || '',
  albumArtist: record.albumArtist,
  genre: record.genre,
  year: record.year,
  trackNumber: record.trackNumber,
  discNumber: record.discNumber,
  duration: record.duration || 0,
  sampleRate: record.sampleRate || 44100,
  bitDepth: record.bitDepth || 16,
  bitRate: record.bitRate,
  channels: record.channels || 2,
  format: record.format || '',
  isLossless: record.isLossless || false,
  isHighRes: record.isHighRes || false,
  isDSD: record.isDSD || false,
  artworkUri: record.artwork || record.artworkUri,
  playCount: record.playCount || 0,
  lastPlayedAt: record.lastPlayed,
  isFavorite: record.isFavorite || false,
  moods: record.moods || [],
  dateAdded: record.dateAdded || Date.now(),
  dateModified: record.dateModified || Date.now(),
});

// Helper to convert DB record to Playlist
const recordToPlaylist = (record: any): Playlist => ({
  id: record.id,
  name: record.name || 'Untitled',
  description: record.description,
  type: record.type || 'user',
  artworkUri: record.artwork || record.artworkUri,
  tracks: record.trackIds || [],
  trackCount: record.trackCount || 0,
  totalDuration: record.totalDuration || 0,
  createdAt: record.createdAt || Date.now(),
  updatedAt: record.updatedAt || Date.now(),
});

export const useDatabase = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Database is ready when this hook is used
    setIsReady(true);
  }, []);

  // Get all tracks
  const getTracks = useCallback(async (): Promise<Track[]> => {
    const collection = database.get('tracks');
    const records = await collection.query().fetch();
    return records.map(recordToTrack);
  }, []);

  // Get tracks sorted by a field
  const getTracksSorted = useCallback(async (
    sortBy: 'title' | 'artist' | 'album' | 'dateAdded' | 'playCount' | 'fileName',
    ascending: boolean = true
  ): Promise<Track[]> => {
    const collection = database.get('tracks');
    const records = await collection
      .query(Q.sortBy(sortBy, ascending ? Q.asc : Q.desc))
      .fetch();
    return records.map(recordToTrack);
  }, []);

  // Get favorite tracks
  const getFavorites = useCallback(async (): Promise<Track[]> => {
    const collection = database.get('tracks');
    const records = await collection
      .query(Q.where('is_favorite', true))
      .fetch();
    return records.map(recordToTrack);
  }, []);

  // Get most played tracks
  const getMostPlayed = useCallback(async (limit: number = 50): Promise<Track[]> => {
    const collection = database.get('tracks');
    const records = await collection
      .query(
        Q.where('play_count', Q.gt(0)),
        Q.sortBy('play_count', Q.desc),
        Q.take(limit)
      )
      .fetch();
    return records.map(recordToTrack);
  }, []);

  // Get recently added tracks
  const getRecentlyAdded = useCallback(async (limit: number = 50): Promise<Track[]> => {
    const collection = database.get('tracks');
    const records = await collection
      .query(
        Q.sortBy('date_added', Q.desc),
        Q.take(limit)
      )
      .fetch();
    return records.map(recordToTrack);
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (trackId: string): Promise<void> => {
    const collection = database.get('tracks');
    const record = await collection.find(trackId);
    await database.write(async () => {
      await record.update((track: any) => {
        track.isFavorite = !track.isFavorite;
      });
    });
  }, []);

  // Increment play count
  const incrementPlayCount = useCallback(async (trackId: string): Promise<void> => {
    const collection = database.get('tracks');
    const record = await collection.find(trackId);
    await database.write(async () => {
      await record.update((track: any) => {
        track.playCount = (track.playCount || 0) + 1;
        track.lastPlayed = Date.now();
      });
    });
  }, []);

  // Get all playlists
  const getPlaylists = useCallback(async (): Promise<Playlist[]> => {
    const collection = database.get('playlists');
    const records = await collection.query().fetch();
    return records.map(recordToPlaylist);
  }, []);

  // Create a new playlist
  const createPlaylist = useCallback(async (
    name: string,
    description?: string
  ): Promise<string> => {
    const collection = database.get('playlists');
    let playlistId = '';
    
    await database.write(async () => {
      const playlist = await collection.create((p: any) => {
        p.name = name;
        p.description = description || '';
        p.artwork = null;
        p.isSmartPlaylist = false;
        p.createdAt = Date.now();
        p.updatedAt = Date.now();
      });
      playlistId = playlist.id;
    });
    
    return playlistId;
  }, []);

  // Add track to playlist
  const addToPlaylist = useCallback(async (
    playlistId: string,
    trackId: string
  ): Promise<void> => {
    const playlistTracksCollection = database.get('playlist_tracks');
    await database.write(async () => {
      await playlistTracksCollection.create((pt: any) => {
        pt.playlistId = playlistId;
        pt.trackId = trackId;
        pt.order = Date.now(); // Use timestamp for ordering
      });
    });
  }, []);

  // Search tracks
  const searchTracks = useCallback(async (query: string): Promise<Track[]> => {
    if (!query.trim()) return [];
    
    const collection = database.get('tracks');
    const lowerQuery = query.toLowerCase();
    const records = await collection
      .query(
        Q.or(
          Q.where('title', Q.like(`%${lowerQuery}%`)),
          Q.where('artist', Q.like(`%${lowerQuery}%`)),
          Q.where('album', Q.like(`%${lowerQuery}%`))
        )
      )
      .fetch();
    return records.map(recordToTrack);
  }, []);

  return {
    isReady,
    database,
    getTracks,
    getTracksSorted,
    getFavorites,
    getMostPlayed,
    getRecentlyAdded,
    toggleFavorite,
    incrementPlayCount,
    getPlaylists,
    createPlaylist,
    addToPlaylist,
    searchTracks,
  };
};
