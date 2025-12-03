/**
 * TuneWell EQ Preset Model
 * 
 * WatermelonDB model for EQ presets.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, json } from '@nozbe/watermelondb/decorators';
import { EQ_FREQUENCIES } from '../../config/constants';

export default class EQPresetModel extends Model {
  static table = 'eq_presets';
  
  @text('name') name!: string;
  @text('description') description?: string;
  @text('preset_type') presetType!: 'system' | 'custom';
  @json('bands', (json: string) => JSON.parse(json || '[]')) bands!: number[];
  @field('preamp') preamp!: number;
  @field('is_default') isDefault!: boolean;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
  
  get isSystemPreset(): boolean {
    return this.presetType === 'system';
  }
  
  get isCustomPreset(): boolean {
    return this.presetType === 'custom';
  }
  
  get formattedBands(): Array<{ frequency: number; gain: number }> {
    return EQ_FREQUENCIES.map((freq, index) => ({
      frequency: freq,
      gain: this.bands[index] || 0,
    }));
  }
  
  /**
   * Converts preset to exportable JSON format
   */
  toExportFormat(): object {
    return {
      name: this.name,
      description: this.description,
      bands: this.bands,
      preamp: this.preamp,
      frequencies: [...EQ_FREQUENCIES],
      version: 1,
      app: 'TuneWell',
    };
  }
}
