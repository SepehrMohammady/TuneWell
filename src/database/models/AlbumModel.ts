/**
 * TuneWell Album Model
 * 
 * WatermelonDB model for albums.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class AlbumModel extends Model {
  static table = 'albums';
  
  @text('name') name!: string;
  @text('artist') artist!: string;
  @text('artwork_uri') artworkUri?: string;
  @field('year') year?: number;
  @text('genre') genre?: string;
  @field('track_count') trackCount!: number;
  @field('total_duration') totalDuration!: number;
  
  get displayName(): string {
    return this.name || 'Unknown Album';
  }
  
  get displayArtist(): string {
    return this.artist || 'Unknown Artist';
  }
  
  get formattedDuration(): string {
    const hours = Math.floor(this.totalDuration / 3600);
    const minutes = Math.floor((this.totalDuration % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  }
}
