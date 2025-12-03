/**
 * TuneWell Scanned Folder Model
 * 
 * WatermelonDB model for user-selected scan folders.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class ScannedFolderModel extends Model {
  static table = 'scanned_folders';
  
  @text('path') path!: string;
  @text('display_name') displayName!: string;
  @field('is_enabled') isEnabled!: boolean;
  @field('last_scan_at') lastScanAt?: number;
  @field('track_count') trackCount!: number;
  @field('added_at') addedAt!: number;
  
  get lastScanDate(): Date | null {
    return this.lastScanAt ? new Date(this.lastScanAt) : null;
  }
  
  get formattedLastScan(): string {
    if (!this.lastScanAt) {
      return 'Never scanned';
    }
    return new Date(this.lastScanAt).toLocaleString();
  }
  
  get statusLabel(): string {
    if (!this.isEnabled) {
      return 'Disabled';
    }
    if (!this.lastScanAt) {
      return 'Pending scan';
    }
    return `${this.trackCount} tracks`;
  }
}
