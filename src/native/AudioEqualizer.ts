/**
 * Native Audio Equalizer Module Interface
 * 
 * Interfaces with Android's Equalizer AudioEffect API
 * to apply real-time EQ effects to audio playback.
 */

import { NativeModules, Platform } from 'react-native';

interface EQBandInfo {
  index: number;
  centerFreq: number;
  currentLevel: number;
  minFreq: number;
  maxFreq: number;
}

interface EQInitResult {
  numberOfBands: number;
  minLevel: number;  // in millibels (mB), typically -1500 = -15dB
  maxLevel: number;  // in millibels (mB), typically 1500 = +15dB
  audioSessionId: number;
  centerFrequencies: number[];  // Hz
  presets: string[];
}

interface EQInfo {
  numberOfBands: number;
  minLevel: number;
  maxLevel: number;
  isEnabled: boolean;
  bands: EQBandInfo[];
}

interface AudioEqualizerModuleType {
  initialize(sessionId: number): Promise<EQInitResult>;
  setEnabled(enabled: boolean): Promise<boolean>;
  setBandLevel(bandIndex: number, gainDb: number): Promise<number>;
  setBandLevels(gains: number[]): Promise<boolean>;
  getBandLevel(bandIndex: number): Promise<number>;
  usePreset(presetIndex: number): Promise<string>;
  setBassBoost(strength: number): Promise<number>;
  setVirtualizer(strength: number): Promise<number>;
  getInfo(): Promise<EQInfo>;
  release(): Promise<boolean>;
}

const { AudioEqualizerModule } = NativeModules;

// Type-safe wrapper
const AudioEqualizer: AudioEqualizerModuleType | null = 
  Platform.OS === 'android' ? AudioEqualizerModule : null;

// EQ Service class for easier management
class EQService {
  private initialized = false;
  private numberOfBands = 0;
  private centerFrequencies: number[] = [];

  /**
   * Initialize the equalizer.
   * @param sessionId Audio session ID. Use 0 for global output.
   */
  async initialize(sessionId: number = 0): Promise<EQInitResult | null> {
    if (!AudioEqualizer) {
      console.log('[EQService] Not available on this platform');
      return null;
    }

    try {
      const result = await AudioEqualizer.initialize(sessionId);
      this.initialized = true;
      this.numberOfBands = result.numberOfBands;
      this.centerFrequencies = result.centerFrequencies;
      
      console.log('[EQService] Initialized:', {
        bands: result.numberOfBands,
        range: `${result.minLevel/100}dB to ${result.maxLevel/100}dB`,
        presets: result.presets.length,
      });
      
      return result;
    } catch (error) {
      console.error('[EQService] Failed to initialize:', error);
      return null;
    }
  }

  /**
   * Enable or disable the equalizer
   */
  async setEnabled(enabled: boolean): Promise<boolean> {
    if (!AudioEqualizer || !this.initialized) return false;
    
    try {
      await AudioEqualizer.setEnabled(enabled);
      console.log('[EQService] Enabled:', enabled);
      return true;
    } catch (error) {
      console.error('[EQService] Failed to set enabled:', error);
      return false;
    }
  }

  /**
   * Set the gain for a specific band
   * @param bandIndex Band index (0-based)
   * @param gainDb Gain in dB (-15 to +15 typically)
   */
  async setBandLevel(bandIndex: number, gainDb: number): Promise<boolean> {
    if (!AudioEqualizer || !this.initialized) return false;
    
    try {
      await AudioEqualizer.setBandLevel(bandIndex, gainDb);
      return true;
    } catch (error) {
      console.error(`[EQService] Failed to set band ${bandIndex}:`, error);
      return false;
    }
  }

  /**
   * Set all band levels at once
   * @param gains Array of gains in dB for each band
   */
  async setBandLevels(gains: number[]): Promise<boolean> {
    if (!AudioEqualizer || !this.initialized) return false;
    
    try {
      await AudioEqualizer.setBandLevels(gains);
      console.log('[EQService] Set all band levels:', gains);
      return true;
    } catch (error) {
      console.error('[EQService] Failed to set band levels:', error);
      return false;
    }
  }

  /**
   * Map our 10-band EQ to the device's native bands.
   * Most Android devices have 5 bands, so we need to interpolate.
   */
  async applyCustomEQ(bands: { frequency: number; gain: number }[]): Promise<boolean> {
    if (!AudioEqualizer || !this.initialized || this.centerFrequencies.length === 0) {
      return false;
    }

    try {
      // Map our 10 bands to the device's bands (usually 5)
      const deviceGains: number[] = [];

      for (let i = 0; i < this.centerFrequencies.length; i++) {
        const deviceFreq = this.centerFrequencies[i];
        
        // Find the closest bands in our 10-band EQ
        let totalWeight = 0;
        let weightedGain = 0;
        
        for (const band of bands) {
          // Calculate how close this band is to the device frequency
          const ratio = Math.log(deviceFreq) / Math.log(band.frequency);
          const distance = Math.abs(1 - ratio);
          
          if (distance < 1) { // Only consider nearby bands
            const weight = 1 - distance;
            weightedGain += band.gain * weight;
            totalWeight += weight;
          }
        }
        
        const interpolatedGain = totalWeight > 0 ? weightedGain / totalWeight : 0;
        deviceGains.push(interpolatedGain);
      }

      console.log('[EQService] Mapped gains:', {
        input: bands.map(b => `${b.frequency}Hz:${b.gain}dB`),
        output: deviceGains.map((g, i) => `${this.centerFrequencies[i]}Hz:${g.toFixed(1)}dB`),
      });

      await AudioEqualizer.setBandLevels(deviceGains);
      return true;
    } catch (error) {
      console.error('[EQService] Failed to apply custom EQ:', error);
      return false;
    }
  }

  /**
   * Set bass boost level
   * @param strength 0-100 (will be scaled to 0-1000)
   */
  async setBassBoost(strength: number): Promise<boolean> {
    if (!AudioEqualizer || !this.initialized) return false;
    
    try {
      await AudioEqualizer.setBassBoost(strength * 10);
      return true;
    } catch (error) {
      console.error('[EQService] Failed to set bass boost:', error);
      return false;
    }
  }

  /**
   * Set virtualizer/stereo widening level
   * @param strength 0-100 (will be scaled to 0-1000)
   */
  async setVirtualizer(strength: number): Promise<boolean> {
    if (!AudioEqualizer || !this.initialized) return false;
    
    try {
      await AudioEqualizer.setVirtualizer(strength * 10);
      return true;
    } catch (error) {
      console.error('[EQService] Failed to set virtualizer:', error);
      return false;
    }
  }

  /**
   * Get current EQ info
   */
  async getInfo(): Promise<EQInfo | null> {
    if (!AudioEqualizer || !this.initialized) return null;
    
    try {
      return await AudioEqualizer.getInfo();
    } catch (error) {
      console.error('[EQService] Failed to get info:', error);
      return null;
    }
  }

  /**
   * Release equalizer resources
   */
  async release(): Promise<void> {
    if (!AudioEqualizer) return;
    
    try {
      await AudioEqualizer.release();
      this.initialized = false;
      console.log('[EQService] Released');
    } catch (error) {
      console.error('[EQService] Failed to release:', error);
    }
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get bandCount(): number {
    return this.numberOfBands;
  }

  get frequencies(): number[] {
    return this.centerFrequencies;
  }
}

// Export singleton instance
export const eqService = new EQService();

export {
  AudioEqualizer,
  EQService,
  EQInitResult,
  EQInfo,
  EQBandInfo,
};
