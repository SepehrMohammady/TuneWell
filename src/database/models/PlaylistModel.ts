/**
 * TuneWell Playlist Model
 * 
 * WatermelonDB model for playlists.
 */

import { Model, Query } from '@nozbe/watermelondb';
import { field, text, json, children, lazy } from '@nozbe/watermelondb/decorators';
import type { PlaylistType, MoodId } from '../../config/constants';
import type { SmartPlaylistCriteria } from '../../types';
import type PlaylistTrackModel from './PlaylistTrackModel';

export default class PlaylistModel extends Model {
  static table = 'playlists';
  
  static associations = {
    playlist_tracks: { type: 'has_many' as const, foreignKey: 'playlist_id' },
  };
  
  @text('name') name!: string;
  @text('description') description?: string;
  @text('type') type!: PlaylistType;
  @text('artwork_uri') artworkUri?: string;
  @text('mood') mood?: MoodId;
  @json('smart_criteria', (json: string) => json ? JSON.parse(json) : null) smartCriteria?: SmartPlaylistCriteria;
  @field('track_count') trackCount!: number;
  @field('total_duration') totalDuration!: number;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
  
  @children('playlist_tracks') playlistTracks!: Query<PlaylistTrackModel>;
  
  get isSmartPlaylist(): boolean {
    return this.type === 'smart' && !!this.smartCriteria;
  }
  
  get isMoodPlaylist(): boolean {
    return this.type === 'mood' && !!this.mood;
  }
  
  get isSystemPlaylist(): boolean {
    return ['favorites', 'mostPlayed', 'recentlyAdded', 'recentlyPlayed'].includes(this.type);
  }
  
  get formattedDuration(): string {
    const hours = Math.floor(this.totalDuration / 3600);
    const minutes = Math.floor((this.totalDuration % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  }
  
  get trackCountLabel(): string {
    return `${this.trackCount} ${this.trackCount === 1 ? 'track' : 'tracks'}`;
  }
}
