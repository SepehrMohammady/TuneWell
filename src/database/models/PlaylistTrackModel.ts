/**
 * TuneWell Playlist Track Model
 * 
 * Junction table model for playlist-track relationships.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, relation, immutableRelation } from '@nozbe/watermelondb/decorators';
import type TrackModel from './TrackModel';
import type PlaylistModel from './PlaylistModel';

export default class PlaylistTrackModel extends Model {
  static table = 'playlist_tracks';
  
  static associations = {
    playlists: { type: 'belongs_to' as const, key: 'playlist_id' },
    tracks: { type: 'belongs_to' as const, key: 'track_id' },
  };
  
  @text('playlist_id') playlistId!: string;
  @text('track_id') trackId!: string;
  @field('position') position!: number;
  @field('added_at') addedAt!: number;
  
  @immutableRelation('playlists', 'playlist_id') playlist!: PlaylistModel;
  @immutableRelation('tracks', 'track_id') track!: TrackModel;
}
