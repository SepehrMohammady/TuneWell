/**
 * TuneWell Track Model
 * 
 * WatermelonDB model for audio tracks.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, json, readonly, date, children } from '@nozbe/watermelondb/decorators';
import type { MoodId } from '../../config/constants';

export default class TrackModel extends Model {
  static table = 'tracks';
  
  static associations = {
    playlist_tracks: { type: 'has_many' as const, foreignKey: 'track_id' },
    play_history: { type: 'has_many' as const, foreignKey: 'track_id' },
  };
  
  // File Info
  @text('uri') uri!: string;
  @text('file_path') filePath!: string;
  @text('file_name') fileName!: string;
  @text('folder_path') folderPath!: string;
  @text('folder_name') folderName!: string;
  
  // Metadata
  @text('title') title!: string;
  @text('artist') artist!: string;
  @text('album') album!: string;
  @text('album_artist') albumArtist?: string;
  @text('genre') genre?: string;
  @field('year') year?: number;
  @field('track_number') trackNumber?: number;
  @field('disc_number') discNumber?: number;
  @text('composer') composer?: string;
  
  // Audio Properties
  @field('duration') duration!: number;
  @field('sample_rate') sampleRate!: number;
  @field('bit_depth') bitDepth!: number;
  @field('bit_rate') bitRate?: number;
  @field('channels') channels!: number;
  @text('format') format!: string;
  @text('codec') codec?: string;
  @field('is_lossless') isLossless!: boolean;
  @field('is_high_res') isHighRes!: boolean;
  @field('is_dsd') isDSD!: boolean;
  
  // Artwork
  @text('artwork_uri') artworkUri?: string;
  @text('artwork_color') artworkColor?: string;
  
  // User Data
  @field('play_count') playCount!: number;
  @field('last_played_at') lastPlayedAt?: number;
  @field('rating') rating?: number;
  @field('is_favorite') isFavorite!: boolean;
  @json('moods', (json: string) => JSON.parse(json || '[]')) moods!: MoodId[];
  
  // Timestamps
  @field('date_added') dateAdded!: number;
  @field('date_modified') dateModified!: number;
  
  // ReplayGain
  @field('replay_gain_track') replayGainTrack?: number;
  @field('replay_gain_album') replayGainAlbum?: number;
  
  // Computed properties
  get displayTitle(): string {
    return this.title || this.fileName.replace(/\.[^/.]+$/, '');
  }
  
  get displayArtist(): string {
    return this.artist || 'Unknown Artist';
  }
  
  get displayAlbum(): string {
    return this.album || 'Unknown Album';
  }
  
  get formattedDuration(): string {
    const minutes = Math.floor(this.duration / 60);
    const seconds = Math.floor(this.duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  get formattedSampleRate(): string {
    if (this.sampleRate >= 1000000) {
      // DSD rates
      return `DSD${Math.round(this.sampleRate / 44100)}`;
    }
    return `${this.sampleRate / 1000} kHz`;
  }
  
  get formattedBitDepth(): string {
    if (this.isDSD) {
      return '1-bit';
    }
    return `${this.bitDepth}-bit`;
  }
  
  get qualityLabel(): string {
    if (this.isDSD) {
      return this.formattedSampleRate;
    }
    if (this.isHighRes) {
      return `Hi-Res ${this.formattedSampleRate}/${this.formattedBitDepth}`;
    }
    if (this.isLossless) {
      return 'Lossless';
    }
    return this.format.toUpperCase();
  }
}
