/**
 * TuneWell Folder Model
 * 
 * WatermelonDB model for folder structure.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class FolderModel extends Model {
  static table = 'folders';
  
  @text('path') path!: string;
  @text('name') name!: string;
  @text('parent_path') parentPath?: string;
  @field('track_count') trackCount!: number;
  @field('subfolder_count') subfolderCount!: number;
  @field('last_scanned') lastScanned?: number;
  @field('is_watched') isWatched!: boolean;
  
  get hasSubfolders(): boolean {
    return this.subfolderCount > 0;
  }
  
  get hasTracks(): boolean {
    return this.trackCount > 0;
  }
  
  get contentLabel(): string {
    const parts: string[] = [];
    
    if (this.trackCount > 0) {
      parts.push(`${this.trackCount} ${this.trackCount === 1 ? 'track' : 'tracks'}`);
    }
    
    if (this.subfolderCount > 0) {
      parts.push(`${this.subfolderCount} ${this.subfolderCount === 1 ? 'folder' : 'folders'}`);
    }
    
    return parts.join(' • ') || 'Empty';
  }
}
