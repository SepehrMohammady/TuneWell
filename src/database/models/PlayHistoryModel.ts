/**
 * TuneWell Play History Model
 * 
 * WatermelonDB model for tracking play history.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, immutableRelation } from '@nozbe/watermelondb/decorators';
import type TrackModel from './TrackModel';

export default class PlayHistoryModel extends Model {
  static table = 'play_history';
  
  static associations = {
    tracks: { type: 'belongs_to' as const, key: 'track_id' },
  };
  
  @text('track_id') trackId!: string;
  @field('played_at') playedAt!: number;
  @field('played_duration') playedDuration!: number;
  @field('completed') completed!: boolean;
  
  @immutableRelation('tracks', 'track_id') track!: TrackModel;
  
  get playedDate(): Date {
    return new Date(this.playedAt);
  }
  
  get formattedPlayedAt(): string {
    return this.playedDate.toLocaleString();
  }
  
  get completionPercentage(): number {
    return this.completed ? 100 : 0; // Will be calculated based on track duration
  }
}
