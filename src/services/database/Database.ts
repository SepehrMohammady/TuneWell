/**
 * Database Service - SQLite database management
 */

import SQLite, {SQLiteDatabase} from 'react-native-sqlite-storage';
import {Track, Playlist, Folder, EQPreset} from '@types/index';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

let database: SQLiteDatabase | null = null;
const DB_NAME = 'tunewell.db';

export async function initializeDatabase(): Promise<void> {
  try {
    database = await SQLite.openDatabase({
      name: DB_NAME,
      location: 'default',
    });

    await createTables();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  if (!database) {
    throw new Error('Database not initialized');
  }

  // Tracks table
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      albumArtist TEXT,
      genre TEXT,
      year INTEGER,
      duration REAL NOT NULL,
      bitrate INTEGER,
      sampleRate INTEGER,
      bitDepth INTEGER,
      format TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      folderPath TEXT NOT NULL,
      dateAdded INTEGER NOT NULL,
      dateModified INTEGER NOT NULL,
      artwork TEXT,
      playCount INTEGER DEFAULT 0,
      isFavorite INTEGER DEFAULT 0,
      lastPlayed INTEGER,
      trackNumber INTEGER,
      discNumber INTEGER,
      comment TEXT
    );
  `);

  // Playlists table
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      mood TEXT,
      dateCreated INTEGER NOT NULL,
      dateModified INTEGER NOT NULL,
      artwork TEXT
    );
  `);

  // Playlist tracks junction table
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlistId TEXT NOT NULL,
      trackId TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (trackId) REFERENCES tracks(id) ON DELETE CASCADE,
      PRIMARY KEY (playlistId, trackId)
    );
  `);

  // Folders table
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      trackCount INTEGER DEFAULT 0,
      dateScanned INTEGER NOT NULL
    );
  `);

  // EQ presets table
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS eq_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isCustom INTEGER DEFAULT 1,
      bands TEXT NOT NULL
    );
  `);

  // Create indexes for better performance
  await database.executeSql('CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);');
  await database.executeSql('CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);');
  await database.executeSql('CREATE INDEX IF NOT EXISTS idx_tracks_folder ON tracks(folderPath);');
  await database.executeSql('CREATE INDEX IF NOT EXISTS idx_tracks_favorite ON tracks(isFavorite);');
  await database.executeSql('CREATE INDEX IF NOT EXISTS idx_tracks_playcount ON tracks(playCount);');
  await database.executeSql('CREATE INDEX IF NOT EXISTS idx_tracks_dateadded ON tracks(dateAdded);');

  // Insert default EQ presets
  await insertDefaultEQPresets();
}

async function insertDefaultEQPresets(): Promise<void> {
  if (!database) return;

  const defaultPresets: EQPreset[] = [
    {
      id: 'flat',
      name: 'Flat',
      isCustom: false,
      bands: [
        {frequency: 32, gain: 0, q: 1.0},
        {frequency: 64, gain: 0, q: 1.0},
        {frequency: 125, gain: 0, q: 1.0},
        {frequency: 250, gain: 0, q: 1.0},
        {frequency: 500, gain: 0, q: 1.0},
        {frequency: 1000, gain: 0, q: 1.0},
        {frequency: 2000, gain: 0, q: 1.0},
        {frequency: 4000, gain: 0, q: 1.0},
        {frequency: 8000, gain: 0, q: 1.0},
        {frequency: 16000, gain: 0, q: 1.0},
      ],
    },
    {
      id: 'bass_boost',
      name: 'Bass Boost',
      isCustom: false,
      bands: [
        {frequency: 32, gain: 6, q: 1.0},
        {frequency: 64, gain: 5, q: 1.0},
        {frequency: 125, gain: 3, q: 1.0},
        {frequency: 250, gain: 1, q: 1.0},
        {frequency: 500, gain: 0, q: 1.0},
        {frequency: 1000, gain: 0, q: 1.0},
        {frequency: 2000, gain: 0, q: 1.0},
        {frequency: 4000, gain: 0, q: 1.0},
        {frequency: 8000, gain: 0, q: 1.0},
        {frequency: 16000, gain: 0, q: 1.0},
      ],
    },
    {
      id: 'treble_boost',
      name: 'Treble Boost',
      isCustom: false,
      bands: [
        {frequency: 32, gain: 0, q: 1.0},
        {frequency: 64, gain: 0, q: 1.0},
        {frequency: 125, gain: 0, q: 1.0},
        {frequency: 250, gain: 0, q: 1.0},
        {frequency: 500, gain: 0, q: 1.0},
        {frequency: 1000, gain: 1, q: 1.0},
        {frequency: 2000, gain: 2, q: 1.0},
        {frequency: 4000, gain: 4, q: 1.0},
        {frequency: 8000, gain: 5, q: 1.0},
        {frequency: 16000, gain: 6, q: 1.0},
      ],
    },
    {
      id: 'vocal_boost',
      name: 'Vocal Boost',
      isCustom: false,
      bands: [
        {frequency: 32, gain: -2, q: 1.0},
        {frequency: 64, gain: -1, q: 1.0},
        {frequency: 125, gain: 0, q: 1.0},
        {frequency: 250, gain: 2, q: 1.0},
        {frequency: 500, gain: 3, q: 1.0},
        {frequency: 1000, gain: 4, q: 1.0},
        {frequency: 2000, gain: 3, q: 1.0},
        {frequency: 4000, gain: 2, q: 1.0},
        {frequency: 8000, gain: 0, q: 1.0},
        {frequency: 16000, gain: -1, q: 1.0},
      ],
    },
  ];

  for (const preset of defaultPresets) {
    const bandsJson = JSON.stringify(preset.bands);
    await database.executeSql(
      `INSERT OR IGNORE INTO eq_presets (id, name, isCustom, bands) VALUES (?, ?, ?, ?)`,
      [preset.id, preset.name, preset.isCustom ? 1 : 0, bandsJson]
    );
  }
}

export async function updatePlayCount(trackId: string): Promise<void> {
  if (!database) return;

  await database.executeSql(
    `UPDATE tracks SET playCount = playCount + 1, lastPlayed = ? WHERE id = ?`,
    [Date.now(), trackId]
  );
}

export async function closeDatabase(): Promise<void> {
  if (database) {
    await database.close();
    database = null;
  }
}

export function getDatabase(): SQLiteDatabase | null {
  return database;
}
