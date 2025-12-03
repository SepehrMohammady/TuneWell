/**
 * TuneWell Database Schema
 * 
 * WatermelonDB schema definition for the music player database.
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // ============================================================================
    // Tracks Table
    // ============================================================================
    tableSchema({
      name: 'tracks',
      columns: [
        // File Info
        { name: 'uri', type: 'string' },
        { name: 'file_path', type: 'string', isIndexed: true },
        { name: 'file_name', type: 'string', isIndexed: true },
        { name: 'folder_path', type: 'string', isIndexed: true },
        { name: 'folder_name', type: 'string', isIndexed: true },
        
        // Metadata
        { name: 'title', type: 'string', isIndexed: true },
        { name: 'artist', type: 'string', isIndexed: true },
        { name: 'album', type: 'string', isIndexed: true },
        { name: 'album_artist', type: 'string', isOptional: true },
        { name: 'genre', type: 'string', isOptional: true, isIndexed: true },
        { name: 'year', type: 'number', isOptional: true },
        { name: 'track_number', type: 'number', isOptional: true },
        { name: 'disc_number', type: 'number', isOptional: true },
        { name: 'composer', type: 'string', isOptional: true },
        
        // Audio Properties
        { name: 'duration', type: 'number' },
        { name: 'sample_rate', type: 'number' },
        { name: 'bit_depth', type: 'number' },
        { name: 'bit_rate', type: 'number', isOptional: true },
        { name: 'channels', type: 'number' },
        { name: 'format', type: 'string' },
        { name: 'codec', type: 'string', isOptional: true },
        { name: 'is_lossless', type: 'boolean' },
        { name: 'is_high_res', type: 'boolean' },
        { name: 'is_dsd', type: 'boolean' },
        
        // Artwork
        { name: 'artwork_uri', type: 'string', isOptional: true },
        { name: 'artwork_color', type: 'string', isOptional: true },
        
        // User Data
        { name: 'play_count', type: 'number', isIndexed: true },
        { name: 'last_played_at', type: 'number', isOptional: true, isIndexed: true },
        { name: 'rating', type: 'number', isOptional: true },
        { name: 'is_favorite', type: 'boolean', isIndexed: true },
        { name: 'moods', type: 'string' }, // JSON array of mood IDs
        
        // Timestamps
        { name: 'date_added', type: 'number', isIndexed: true },
        { name: 'date_modified', type: 'number', isIndexed: true },
        
        // ReplayGain
        { name: 'replay_gain_track', type: 'number', isOptional: true },
        { name: 'replay_gain_album', type: 'number', isOptional: true },
      ],
    }),
    
    // ============================================================================
    // Albums Table
    // ============================================================================
    tableSchema({
      name: 'albums',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'artist', type: 'string', isIndexed: true },
        { name: 'artwork_uri', type: 'string', isOptional: true },
        { name: 'year', type: 'number', isOptional: true },
        { name: 'genre', type: 'string', isOptional: true },
        { name: 'track_count', type: 'number' },
        { name: 'total_duration', type: 'number' },
      ],
    }),
    
    // ============================================================================
    // Artists Table
    // ============================================================================
    tableSchema({
      name: 'artists',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'artwork_uri', type: 'string', isOptional: true },
        { name: 'album_count', type: 'number' },
        { name: 'track_count', type: 'number' },
      ],
    }),
    
    // ============================================================================
    // Folders Table
    // ============================================================================
    tableSchema({
      name: 'folders',
      columns: [
        { name: 'path', type: 'string', isIndexed: true },
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'parent_path', type: 'string', isOptional: true },
        { name: 'track_count', type: 'number' },
        { name: 'subfolder_count', type: 'number' },
        { name: 'last_scanned', type: 'number', isOptional: true },
        { name: 'is_watched', type: 'boolean' },
      ],
    }),
    
    // ============================================================================
    // Playlists Table
    // ============================================================================
    tableSchema({
      name: 'playlists',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'type', type: 'string', isIndexed: true },
        { name: 'artwork_uri', type: 'string', isOptional: true },
        { name: 'mood', type: 'string', isOptional: true, isIndexed: true },
        { name: 'smart_criteria', type: 'string', isOptional: true }, // JSON
        { name: 'track_count', type: 'number' },
        { name: 'total_duration', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    
    // ============================================================================
    // Playlist Tracks (Junction Table)
    // ============================================================================
    tableSchema({
      name: 'playlist_tracks',
      columns: [
        { name: 'playlist_id', type: 'string', isIndexed: true },
        { name: 'track_id', type: 'string', isIndexed: true },
        { name: 'position', type: 'number' },
        { name: 'added_at', type: 'number' },
      ],
    }),
    
    // ============================================================================
    // EQ Presets Table
    // ============================================================================
    tableSchema({
      name: 'eq_presets',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'preset_type', type: 'string' }, // 'system' | 'custom'
        { name: 'bands', type: 'string' }, // JSON array of band gains
        { name: 'preamp', type: 'number' },
        { name: 'is_default', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    
    // ============================================================================
    // Play History Table
    // ============================================================================
    tableSchema({
      name: 'play_history',
      columns: [
        { name: 'track_id', type: 'string', isIndexed: true },
        { name: 'played_at', type: 'number', isIndexed: true },
        { name: 'played_duration', type: 'number' }, // How much of the track was played
        { name: 'completed', type: 'boolean' }, // If track was played to completion
      ],
    }),
    
    // ============================================================================
    // Scanned Folders Table
    // ============================================================================
    tableSchema({
      name: 'scanned_folders',
      columns: [
        { name: 'path', type: 'string', isIndexed: true },
        { name: 'display_name', type: 'string' },
        { name: 'is_enabled', type: 'boolean' },
        { name: 'last_scan_at', type: 'number', isOptional: true },
        { name: 'track_count', type: 'number' },
        { name: 'added_at', type: 'number' },
      ],
    }),
  ],
});

export default schema;
