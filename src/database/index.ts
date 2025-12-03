/**
 * TuneWell Database Configuration
 * 
 * WatermelonDB database setup and initialization.
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import {
  TrackModel,
  AlbumModel,
  ArtistModel,
  FolderModel,
  PlaylistModel,
  PlaylistTrackModel,
  EQPresetModel,
  PlayHistoryModel,
  ScannedFolderModel,
} from './models';

// Database adapter configuration
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'tunewell',
  jsi: true, // Enable JSI for better performance
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

// Create database instance
export const database = new Database({
  adapter,
  modelClasses: [
    TrackModel,
    AlbumModel,
    ArtistModel,
    FolderModel,
    PlaylistModel,
    PlaylistTrackModel,
    EQPresetModel,
    PlayHistoryModel,
    ScannedFolderModel,
  ],
});

// Collection helpers for type-safe access
export const tracksCollection = database.get<TrackModel>('tracks');
export const albumsCollection = database.get<AlbumModel>('albums');
export const artistsCollection = database.get<ArtistModel>('artists');
export const foldersCollection = database.get<FolderModel>('folders');
export const playlistsCollection = database.get<PlaylistModel>('playlists');
export const playlistTracksCollection = database.get<PlaylistTrackModel>('playlist_tracks');
export const eqPresetsCollection = database.get<EQPresetModel>('eq_presets');
export const playHistoryCollection = database.get<PlayHistoryModel>('play_history');
export const scannedFoldersCollection = database.get<ScannedFolderModel>('scanned_folders');

/**
 * Reset database (for development/debugging)
 */
export async function resetDatabase(): Promise<void> {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  tracks: number;
  albums: number;
  artists: number;
  playlists: number;
  folders: number;
}> {
  const [tracks, albums, artists, playlists, folders] = await Promise.all([
    tracksCollection.query().fetchCount(),
    albumsCollection.query().fetchCount(),
    artistsCollection.query().fetchCount(),
    playlistsCollection.query().fetchCount(),
    foldersCollection.query().fetchCount(),
  ]);
  
  return { tracks, albums, artists, playlists, folders };
}

export default database;
