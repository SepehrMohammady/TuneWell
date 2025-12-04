/**
 * Native Audio Decoder Module Interface
 * 
 * Handles playback of formats not supported by ExoPlayer:
 * - DSD (DSF, DFF) - Converted to PCM
 * - WAV with high bit-depth
 */

import { NativeModules, Platform } from 'react-native';

interface AudioInfo {
  format: string;
  dsdRate?: string;
  encoding?: string;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  duration?: number;
  fileSize?: number;
}

interface CanPlayResult {
  supported: boolean;
  format: string;
  decoder: 'native' | 'exoplayer';
}

interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentUri: string | null;
}

interface NativeAudioDecoderModuleType {
  canPlay(uri: string): Promise<CanPlayResult>;
  getAudioInfo(uri: string): Promise<AudioInfo>;
  play(uri: string): Promise<boolean>;
  pause(): Promise<boolean>;
  resume(): Promise<boolean>;
  stop(): Promise<boolean>;
  getState(): Promise<PlaybackState>;
  getAudioSessionId(): Promise<number>;
  setAudioSessionId(sessionId: number): Promise<boolean>;
}

const { NativeAudioDecoderModule } = NativeModules;

const NativeAudioDecoder: NativeAudioDecoderModuleType | null = 
  Platform.OS === 'android' ? NativeAudioDecoderModule : null;

/**
 * Native Decoder Service
 * Provides a higher-level interface for the native decoder
 */
class NativeDecoderService {
  private currentUri: string | null = null;

  /**
   * Check if a file should use the native decoder
   */
  async shouldUseNativeDecoder(uri: string): Promise<boolean> {
    if (!NativeAudioDecoder) return false;
    
    try {
      const result = await NativeAudioDecoder.canPlay(uri);
      return result.decoder === 'native';
    } catch (error) {
      console.error('[NativeDecoder] canPlay error:', error);
      return false;
    }
  }

  /**
   * Get audio file information
   */
  async getInfo(uri: string): Promise<AudioInfo | null> {
    if (!NativeAudioDecoder) return null;
    
    try {
      return await NativeAudioDecoder.getAudioInfo(uri);
    } catch (error) {
      console.error('[NativeDecoder] getInfo error:', error);
      return null;
    }
  }

  /**
   * Play audio file
   */
  async play(uri: string): Promise<boolean> {
    if (!NativeAudioDecoder) {
      console.log('[NativeDecoder] Not available on this platform');
      return false;
    }
    
    try {
      this.currentUri = uri;
      await NativeAudioDecoder.play(uri);
      console.log('[NativeDecoder] Playing:', uri);
      return true;
    } catch (error) {
      console.error('[NativeDecoder] play error:', error);
      this.currentUri = null;
      return false;
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<boolean> {
    if (!NativeAudioDecoder) return false;
    
    try {
      await NativeAudioDecoder.pause();
      return true;
    } catch (error) {
      console.error('[NativeDecoder] pause error:', error);
      return false;
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<boolean> {
    if (!NativeAudioDecoder) return false;
    
    try {
      await NativeAudioDecoder.resume();
      return true;
    } catch (error) {
      console.error('[NativeDecoder] resume error:', error);
      return false;
    }
  }

  /**
   * Stop playback
   */
  async stop(): Promise<boolean> {
    if (!NativeAudioDecoder) return false;
    
    try {
      await NativeAudioDecoder.stop();
      this.currentUri = null;
      return true;
    } catch (error) {
      console.error('[NativeDecoder] stop error:', error);
      return false;
    }
  }

  /**
   * Get current playback state
   */
  async getState(): Promise<PlaybackState | null> {
    if (!NativeAudioDecoder) return null;
    
    try {
      return await NativeAudioDecoder.getState();
    } catch (error) {
      console.error('[NativeDecoder] getState error:', error);
      return null;
    }
  }

  /**
   * Get the audio session ID (for EQ integration)
   */
  async getAudioSessionId(): Promise<number> {
    if (!NativeAudioDecoder) return 0;
    
    try {
      return await NativeAudioDecoder.getAudioSessionId();
    } catch (error) {
      console.error('[NativeDecoder] getAudioSessionId error:', error);
      return 0;
    }
  }

  /**
   * Set the audio session ID to use (for EQ integration)
   */
  async setAudioSessionId(sessionId: number): Promise<boolean> {
    if (!NativeAudioDecoder) return false;
    
    try {
      return await NativeAudioDecoder.setAudioSessionId(sessionId);
    } catch (error) {
      console.error('[NativeDecoder] setAudioSessionId error:', error);
      return false;
    }
  }

  get isAvailable(): boolean {
    return NativeAudioDecoder !== null;
  }
}

// Export singleton instance
export const nativeDecoderService = new NativeDecoderService();

export {
  NativeAudioDecoder,
  NativeDecoderService,
};

export type {
  AudioInfo,
  CanPlayResult,
  PlaybackState,
};
