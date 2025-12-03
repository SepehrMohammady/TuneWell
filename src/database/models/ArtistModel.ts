/**
 * TuneWell Artist Model
 * 
 * WatermelonDB model for artists.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class ArtistModel extends Model {
  static table = 'artists';
  
  @text('name') name!: string;
  @text('artwork_uri') artworkUri?: string;
  @field('album_count') albumCount!: number;
  @field('track_count') trackCount!: number;
  
  get displayName(): string {
    return this.name || 'Unknown Artist';
  }
  
  get statsLabel(): string {
    const albums = `${this.albumCount} ${this.albumCount === 1 ? 'album' : 'albums'}`;
    const tracks = `${this.trackCount} ${this.trackCount === 1 ? 'track' : 'tracks'}`;
    return `${albums} • ${tracks}`;
  }
}
