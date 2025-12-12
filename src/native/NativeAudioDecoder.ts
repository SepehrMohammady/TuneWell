/**
 * Native Audio Decoder Module Interface
 * 
 * Handles playback of formats not supported by ExoPlayer:
 * - DSD (DSF, DFF) - Converted to PCM
 * - WAV with high bit-depth
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

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
  position?: number;
  duration?: number;
}

interface ProgressEvent {
  position: number;
  duration: number;
  buffered: number;
}

interface StateEvent {
  state: 'playing' | 'paused' | 'stopped' | 'ended';
  uri: string | null;
}

interface NativeAudioDecoderModuleType {
  canPlay(uri: string): Promise<CanPlayResult>;
  getAudioInfo(uri: string): Promise<AudioInfo>;
  play(uri: string): Promise<boolean>;
  playWithFormat(uri: string, formatHint: string | null): Promise<boolean>;
  pause(): Promise<boolean>;
  resume(): Promise<boolean>;
  stop(): Promise<boolean>;
  seekTo(positionSeconds: number): Promise<boolean>;
  getState(): Promise<PlaybackState>;
  getPosition(): Promise<number>;
  getDuration(): Promise<number>;
  getAudioSessionId(): Promise<number>;
  setAudioSessionId(sessionId: number): Promise<boolean>;
}

const { NativeAudioDecoderModule } = NativeModules;

const NativeAudioDecoder: NativeAudioDecoderModuleType | null = 
  Platform.OS === 'android' ? NativeAudioDecoderModule : null;

// Event emitter for native decoder events
const eventEmitter = NativeAudioDecoderModule ? new NativeEventEmitter(NativeAudioDecoderModule) : null;

/**
 * Native Decoder Service
 * Provides a higher-level interface for the native decoder
 */
class NativeDecoderService {
  private currentUri: string | null = null;
  private progressListener: any = null;
  private stateListener: any = null;
  private onProgressCallback: ((progress: ProgressEvent) => void) | null = null;
  private onStateCallback: ((state: StateEvent) => void) | null = null;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for native decoder events
   */
  private setupEventListeners(): void {
    if (!eventEmitter) return;

    this.progressListener = eventEmitter.addListener(
      'NativeDecoderProgress',
      (event: ProgressEvent) => {
        if (this.onProgressCallback) {
          this.onProgressCallback(event);
        }
      }
    );

    this.stateListener = eventEmitter.addListener(
      'NativeDecoderState',
      (event: StateEvent) => {
        if (this.onStateCallback) {
          this.onStateCallback(event);
        }
      }
    );
  }

  /**
   * Set callback for progress updates
   */
  setOnProgress(callback: ((progress: ProgressEvent) => void) | null): void {
    this.onProgressCallback = callback;
  }

  /**
   * Set callback for state changes
   */
  setOnState(callback: ((state: StateEvent) => void) | null): void {
    this.onStateCallback = callback;
  }

  /**
   * Get current playback position
   */
  async getPosition(): Promise<number> {
    if (!NativeAudioDecoder) return 0;
    
    try {
      return await NativeAudioDecoder.getPosition();
    } catch (error) {
      console.error('[NativeDecoder] getPosition error:', error);
      return 0;
    }
  }

  /**
   * Get current track duration
   */
  async getDuration(): Promise<number> {
    if (!NativeAudioDecoder) return 0;
    
    try {
      return await NativeAudioDecoder.getDuration();
    } catch (error) {
      console.error('[NativeDecoder] getDuration error:', error);
      return 0;
    }
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    if (this.progressListener) {
      this.progressListener.remove();
      this.progressListener = null;
    }
    if (this.stateListener) {
      this.stateListener.remove();
      this.stateListener = null;
    }
    this.onProgressCallback = null;
    this.onStateCallback = null;
  }

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
   * @param uri The content:// or file:// URI
   * @param format Optional format hint (e.g., 'wav', 'dsf', 'dff') for content:// URIs that don't have extensions
   */
  async play(uri: string, format?: string): Promise<boolean> {
    if (!NativeAudioDecoder) {
      console.log('[NativeDecoder] Not available on this platform');
      return false;
    }
    
    try {
      this.currentUri = uri;
      const formatHint = format || null;
      console.log('[NativeDecoder] Calling native playWithFormat - URI:', uri, 'Format:', formatHint);
      const result = await NativeAudioDecoder.playWithFormat(uri, formatHint);
      console.log('[NativeDecoder] Native play returned:', result);
      return true;
    } catch (error: any) {
      console.error('[NativeDecoder] play error:', error?.message || error);
      this.currentUri = null;
      // Re-throw so caller can handle it properly
      throw error;
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
   * Seek to position in seconds
   */
  async seekTo(positionSeconds: number): Promise<boolean> {
    if (!NativeAudioDecoder) return false;
    
    try {
      await NativeAudioDecoder.seekTo(positionSeconds);
      return true;
    } catch (error) {
      console.error('[NativeDecoder] seekTo error:', error);
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
  ProgressEvent,
  StateEvent,
};
