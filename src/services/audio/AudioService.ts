/**
 * TuneWell Audio Service
 * 
 * High-level audio playback service that wraps TrackPlayer
 * and integrates with the app's state management.
 * 
 * Uses native decoder for DSD files (DSF/DFF) as ExoPlayer doesn't support them.
 */

import TrackPlayer, {
  Track as TPTrack,
  State,
  Event,
  usePlaybackState,
  useProgress,
  useActiveTrack,
} from 'react-native-track-player';
import { usePlayerStore, useEQStore, usePlaylistStore } from '../../store';
import { setupTrackPlayer, mapPlayerState, mapRepeatMode } from './TrackPlayerService';
import { eqService } from '../../native/AudioEqualizer';
import { nativeDecoderService } from '../../native/NativeAudioDecoder';
import { getPlayerAudioSessionId } from '../../native/TrackPlayerSession';
import type { Track, QueueItem } from '../../types';
import { PLAYBACK_STATES } from '../../config/constants';

/**
 * Check if a format requires the native decoder
 * DSD formats (DSF/DFF) and WAV require our native decoder.
 * WAV is included because ExoPlayer with content:// URIs can be unreliable.
 */
function requiresNativeDecoder(format: string): boolean {
  const fmt = (format || '').toLowerCase().replace('.', '');
  // DSD and WAV formats use native decoder for reliable playback
  return ['dsf', 'dff', 'dsd', 'wav', 'wave'].includes(fmt);
}

/**
 * Check if this is a DSD format (for showing appropriate messages)
 */
function isDSDFormat(format: string): boolean {
  const fmt = (format || '').toLowerCase().replace('.', '');
  return ['dsf', 'dff', 'dsd'].includes(fmt);
}

/**
 * Convert our Track type to TrackPlayer Track type
 */
/**
 * Get MIME type for audio format
 */
function getContentType(format: string): string | undefined {
  const formatLower = (format || '').toLowerCase().replace('.', '');
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'flac': 'audio/flac',
    'wav': 'audio/wav',
    'wave': 'audio/wav',
    'aac': 'audio/aac',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'opus': 'audio/opus',
    'wma': 'audio/x-ms-wma',
    'aiff': 'audio/aiff',
    'aif': 'audio/aiff',
    'dsf': 'audio/x-dsf',
    'dff': 'audio/x-dff',
    'dsd': 'audio/x-dsd',
  };
  return mimeTypes[formatLower];
}

function convertToTPTrack(track: Track): TPTrack {
  const contentType = getContentType(track.format);
  
  // Use content:// URI for local files (required for scoped storage on Android 10+)
  // file:// paths don't work reliably on modern Android due to storage restrictions
  let url = track.uri;
  
  // If we have a content:// URI, use it (preferred for Android scoped storage)
  // Otherwise fall back to file path if available
  if (!url && track.filePath) {
    // Convert file path to file:// URI as fallback
    url = track.filePath.startsWith('file://') 
      ? track.filePath 
      : `file://${track.filePath}`;
  }
  
  // For DSD formats, log a warning that they won't play
  if (isDSDFormat(track.format)) {
    console.warn('[AudioService] DSD format not supported by ExoPlayer:', track.format);
  }
  
  // Log for debugging
  console.log('[AudioService] Converting track:', {
    title: track.title,
    format: track.format,
    uri: track.uri,
    resolvedUrl: url,
    contentType,
  });
  
  // Build the track object
  const tpTrack: TPTrack = {
    id: track.id,
    url: url,
    title: track.title || track.fileName,
    artist: track.artist || 'Unknown Artist',
    album: track.album || 'Unknown Album',
    artwork: track.artworkUri,
    duration: track.duration,
    // Custom metadata
    genre: track.genre,
    date: track.year?.toString(),
    rating: track.rating,
    isLossless: track.isLossless,
    isHighRes: track.isHighRes,
    isDSD: track.isDSD,
    sampleRate: track.sampleRate,
    bitDepth: track.bitDepth,
    format: track.format,
  };

  // Only add contentType if we have one - ExoPlayer uses this as a hint
  if (contentType) {
    tpTrack.contentType = contentType;
  }

  return tpTrack;
}

class AudioService {
  private initialized = false;
  private eqInitialized = false;
  private eventSubscriptions: (() => void)[] = [];
  private eqUnsubscribe: (() => void) | null = null;

  /**
   * Initialize the audio service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await setupTrackPlayer();
    this.setupEventListeners();
    await this.initializeEQ();
    this.initialized = true;
  }

  /**
   * Initialize the equalizer
   */
  private async initializeEQ(): Promise<void> {
    if (this.eqInitialized) return;

    try {
      // Try to get the actual audio session ID from TrackPlayer's ExoPlayer
      // This allows EQ effects to be applied to the player's audio output
      let audioSessionId = 0;
      
      try {
        audioSessionId = await getPlayerAudioSessionId();
        console.log('[AudioService] Got audio session ID from player:', audioSessionId);
      } catch (sessionError) {
        console.warn('[AudioService] Could not get player session, using global output:', sessionError);
        audioSessionId = 0; // Fallback to global output
      }
      
      // Initialize EQ with the audio session
      // Note: Session 0 is global output, which works on some devices but not all.
      // A non-zero session from ExoPlayer should work more reliably.
      const result = await eqService.initialize(audioSessionId);
      
      if (result) {
        this.eqInitialized = true;
        
        // Apply current EQ settings from store
        await this.syncEQFromStore();
        
        // Subscribe to EQ store changes
        this.eqUnsubscribe = useEQStore.subscribe(
          async (state, prevState) => {
            // Check what changed and update accordingly
            if (state.isEnabled !== prevState.isEnabled) {
              await eqService.setEnabled(state.isEnabled);
            }
            
            if (state.bands !== prevState.bands || state.preamp !== prevState.preamp) {
              await this.applyEQBands();
            }
          }
        );
        
        console.log('[AudioService] EQ initialized successfully with session 0 (global output)');
        console.log('[AudioService] Note: EQ may have limited effect on some Android devices.');
        console.log('[AudioService] For best results, use system-level EQ or DAC-specific apps.');
      }
    } catch (error) {
      console.error('[AudioService] Failed to initialize EQ:', error);
      console.warn('[AudioService] EQ effects will not be available.');
    }
  }

  /**
   * Sync EQ settings from store to native
   */
  private async syncEQFromStore(): Promise<void> {
    const { isEnabled, bands, preamp } = useEQStore.getState();
    
    await eqService.setEnabled(isEnabled);
    await this.applyEQBands();
    
    // Apply preamp as bass boost (approximation)
    if (preamp > 0) {
      await eqService.setBassBoost(preamp * 5); // Scale preamp to bass boost
    }
  }

  /**
   * Apply EQ bands from store to native equalizer
   */
  private async applyEQBands(): Promise<void> {
    const { bands } = useEQStore.getState();
    await eqService.applyCustomEQ(bands);
  }

  /**
   * Set up event listeners to sync with store
   */
  private setupEventListeners(): void {
    const playbackStateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (event) => {
        const state = mapPlayerState(event.state);
        usePlayerStore.getState().setState(state as any);
      }
    );

    const activeTrackListener = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async (event) => {
        if (event.track) {
          const queue = usePlayerStore.getState().queue;
          const index = queue.findIndex((item) => item.track.id === event.track?.id);
          if (index !== -1) {
            usePlayerStore.getState().setQueueIndex(index);
          }
          
          // Record play in playlist store for tracking
          const trackId = event.track.id;
          if (trackId) {
            usePlaylistStore.getState().recordPlay(trackId);
            console.log('[AudioService] Recorded play for track:', trackId);
          }
        }
      }
    );

    const queueEndedListener = TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      async () => {
        const { repeatMode, skipToNext } = usePlayerStore.getState();
        if (repeatMode === 'queue') {
          skipToNext();
          await TrackPlayer.play();
        }
      }
    );

    this.eventSubscriptions = [
      playbackStateListener.remove,
      activeTrackListener.remove,
      queueEndedListener.remove,
    ];
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.eventSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.eventSubscriptions = [];
    
    // Cleanup EQ
    if (this.eqUnsubscribe) {
      this.eqUnsubscribe();
      this.eqUnsubscribe = null;
    }
    eqService.release();
    this.eqInitialized = false;
    
    this.initialized = false;
  }

  /**
   * Play a single track
   */
  async playTrack(track: Track): Promise<void> {
    const queueItem: QueueItem = {
      id: `queue_${track.id}_${Date.now()}`,
      track,
      addedAt: Date.now(),
      source: 'library',
    };

    await this.playQueue([queueItem], 0);
  }

  /**
   * Play a queue of tracks
   */
  async playQueue(queue: QueueItem[], startIndex = 0): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Update store
    usePlayerStore.getState().setQueue(queue);
    usePlayerStore.getState().setQueueIndex(startIndex);

    const startTrack = queue[startIndex]?.track;
    
    // Check if the starting track needs native decoder (DSD)
    if (startTrack && requiresNativeDecoder(startTrack.format)) {
      console.log('[AudioService] DSD format detected, using native decoder:', startTrack.format);
      
      // Stop TrackPlayer if playing
      await TrackPlayer.reset();
      
      // Use native decoder for DSD - prefer file path over content:// URI
      let uri = startTrack.filePath || startTrack.uri;
      
      // Ensure we have a proper file:// URI for the native decoder
      if (uri && !uri.startsWith('content://') && !uri.startsWith('file://')) {
        uri = `file://${uri}`;
      }
      
      console.log('[AudioService] Playing DSD with native decoder:', uri);
      
      if (uri) {
        try {
          const success = await nativeDecoderService.play(uri);
          if (success) {
            usePlayerStore.getState().setState('playing');
            console.log('[AudioService] DSD playback started successfully');
            
            // Record play in playlist store for tracking (DSD files)
            usePlaylistStore.getState().recordPlay(startTrack.id);
            console.log('[AudioService] Recorded play for DSD track:', startTrack.id);
            
            // Reinitialize EQ with the native decoder's audio session
            setTimeout(async () => {
              try {
                const sessionId = await nativeDecoderService.getAudioSessionId();
                if (sessionId > 0) {
                  console.log('[AudioService] Reinitializing EQ with native decoder session:', sessionId);
                  await eqService.release();
                  await eqService.initialize(sessionId);
                  await this.syncEQFromStore();
                }
              } catch (eqError) {
                console.warn('[AudioService] Failed to reinitialize EQ for DSD:', eqError);
              }
            }, 200);
            
            return;
          } else {
            console.error('[AudioService] Native decoder returned false');
          }
        } catch (error: any) {
          console.error('[AudioService] Native decoder failed:', error);
          throw new Error(`Failed to play DSD file: ${error.message || 'Unknown error'}`);
        }
      }
      
      throw new Error('Could not determine file path for DSD playback');
    }

    // Convert to TrackPlayer tracks (for non-DSD formats)
    const tpTracks = queue.map((item) => convertToTPTrack(item.track));

    console.log('[AudioService] Playing queue:', {
      trackCount: tpTracks.length,
      startIndex,
      firstTrack: tpTracks[startIndex] ? {
        title: tpTracks[startIndex].title,
        url: tpTracks[startIndex].url,
        contentType: tpTracks[startIndex].contentType,
        format: queue[startIndex]?.track?.format,
      } : null,
    });

    try {
      // Stop native decoder if it was playing
      await nativeDecoderService.stop();
      
      // Reset and load queue
      await TrackPlayer.reset();
      await TrackPlayer.add(tpTracks);
      await TrackPlayer.skip(startIndex);
      await TrackPlayer.play();
      
      // Re-initialize EQ with the correct audio session after playback starts
      // (ExoPlayer session may not be available until playback begins)
      setTimeout(() => this.reinitializeEQ(), 500);
    } catch (error) {
      console.error('[AudioService] Playback error:', error);
      throw error;
    }
  }
  
  /**
   * Re-initialize EQ to get the correct audio session from the player
   */
  private async reinitializeEQ(): Promise<void> {
    try {
      const audioSessionId = await getPlayerAudioSessionId();
      if (audioSessionId !== 0) {
        console.log('[AudioService] Re-initializing EQ with player session:', audioSessionId);
        await eqService.release();
        await eqService.initialize(audioSessionId);
        await this.syncEQFromStore();
      }
    } catch (error) {
      console.warn('[AudioService] Failed to reinitialize EQ:', error);
    }
  }

  /**
   * Add tracks to queue
   */
  async addToQueue(tracks: Track[], position: 'next' | 'last' = 'last'): Promise<void> {
    const queueItems: QueueItem[] = tracks.map((track) => ({
      id: `queue_${track.id}_${Date.now()}`,
      track,
      addedAt: Date.now(),
      source: 'library',
    }));

    usePlayerStore.getState().addToQueue(queueItems, position);

    const tpTracks = tracks.map(convertToTPTrack);
    
    if (position === 'next') {
      const currentIndex = await TrackPlayer.getActiveTrackIndex();
      if (currentIndex !== null && currentIndex !== undefined) {
        await TrackPlayer.add(tpTracks, currentIndex + 1);
      } else {
        await TrackPlayer.add(tpTracks);
      }
    } else {
      await TrackPlayer.add(tpTracks);
    }
  }

  /**
   * Remove track from queue by index
   */
  async removeFromQueue(index: number): Promise<void> {
    usePlayerStore.getState().removeFromQueue(index);
    await TrackPlayer.remove(index);
  }

  /**
   * Clear the queue
   */
  async clearQueue(): Promise<void> {
    usePlayerStore.getState().clearQueue();
    await TrackPlayer.reset();
  }

  /**
   * Play/Resume playback
   */
  async play(): Promise<void> {
    // Check if native decoder is active
    const nativeState = await nativeDecoderService.getState();
    if (nativeState?.isPaused) {
      await nativeDecoderService.resume();
      usePlayerStore.getState().setState('playing');
      return;
    }
    
    // Check if there's a queue loaded in TrackPlayer
    const queue = await TrackPlayer.getQueue();
    if (queue.length === 0) {
      // No queue - try to reload from store
      const storeQueue = usePlayerStore.getState().queue;
      if (storeQueue.length > 0) {
        const queueIndex = usePlayerStore.getState().queueIndex;
        await this.playQueue(storeQueue, queueIndex);
        return;
      }
      console.warn('[AudioService] No queue to play');
      return;
    }
    
    await TrackPlayer.play();
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    // Check if native decoder is active
    const nativeState = await nativeDecoderService.getState();
    if (nativeState?.isPlaying) {
      await nativeDecoderService.pause();
      usePlayerStore.getState().setState('paused');
      return;
    }
    await TrackPlayer.pause();
  }

  /**
   * Toggle play/pause
   * Optimized for responsiveness - uses store state to avoid extra async calls
   */
  async togglePlayPause(): Promise<void> {
    // Use store state for immediate response instead of querying TrackPlayer
    const storeState = usePlayerStore.getState().state;
    
    // Check if native decoder is active (quick async check)
    const nativeState = await nativeDecoderService.getState();
    if (nativeState?.currentUri) {
      if (nativeState.isPaused) {
        await this.play();
      } else if (nativeState.isPlaying) {
        await this.pause();
      }
      return;
    }
    
    // Use store state for faster response
    if (storeState === 'playing') {
      await this.pause();
    } else {
      await this.play();
    }
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    await nativeDecoderService.stop();
    await TrackPlayer.stop();
  }

  /**
   * Skip to next track
   */
  async skipToNext(): Promise<boolean> {
    try {
      await TrackPlayer.skipToNext();
      usePlayerStore.getState().skipToNext();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Skip to previous track
   */
  async skipToPrevious(): Promise<boolean> {
    try {
      const position = await TrackPlayer.getPosition();
      if (position > 3) {
        // Restart current track if more than 3 seconds in
        await TrackPlayer.seekTo(0);
        return true;
      }
      
      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getActiveTrackIndex();
      
      // If at the beginning or no track, just seek to start
      if (currentIndex === undefined || currentIndex === null || currentIndex === 0) {
        await TrackPlayer.seekTo(0);
        return true;
      }
      
      // Skip to previous track
      await TrackPlayer.skipToPrevious();
      return true;
    } catch (error) {
      console.error('[AudioService] skipToPrevious error:', error);
      // On error, try to seek to beginning
      try {
        await TrackPlayer.seekTo(0);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Skip to specific index in queue
   */
  async skipToIndex(index: number): Promise<void> {
    await TrackPlayer.skip(index);
    usePlayerStore.getState().skipToIndex(index);
  }

  /**
   * Seek to position in seconds
   */
  async seekTo(position: number): Promise<void> {
    await TrackPlayer.seekTo(position);
  }

  /**
   * Set volume (0-1)
   */
  async setVolume(volume: number): Promise<void> {
    await TrackPlayer.setVolume(Math.max(0, Math.min(1, volume)));
    usePlayerStore.getState().setVolume(volume);
  }

  /**
   * Set repeat mode
   */
  async setRepeatMode(mode: string): Promise<void> {
    await TrackPlayer.setRepeatMode(mapRepeatMode(mode));
    usePlayerStore.getState().setRepeatMode(mode as any);
  }

  /**
   * Toggle shuffle mode
   */
  async toggleShuffle(): Promise<void> {
    const { isShuffled, queue, queueIndex } = usePlayerStore.getState();
    
    usePlayerStore.getState().toggleShuffle();
    
    // Rebuild TrackPlayer queue in new order
    const newState = usePlayerStore.getState();
    const tpTracks = newState.queue.map((item) => convertToTPTrack(item.track));
    const currentTrackId = queue[queueIndex]?.track.id;
    
    await TrackPlayer.reset();
    await TrackPlayer.add(tpTracks);
    
    // Skip to current track in new queue order
    const newIndex = newState.queue.findIndex((item) => item.track.id === currentTrackId);
    if (newIndex !== -1) {
      await TrackPlayer.skip(newIndex);
    }
  }

  /**
   * Get current playback position
   */
  async getPosition(): Promise<number> {
    return await TrackPlayer.getPosition();
  }

  /**
   * Get current track duration
   */
  async getDuration(): Promise<number> {
    return await TrackPlayer.getDuration();
  }

  /**
   * Get current buffered position
   */
  async getBufferedPosition(): Promise<number> {
    return await TrackPlayer.getBufferedPosition();
  }

  /**
   * Get current playback state
   */
  async getState(): Promise<State> {
    const state = await TrackPlayer.getPlaybackState();
    return state.state;
  }
}

// Export singleton instance
export const audioService = new AudioService();

// Export hooks for React components
export { usePlaybackState, useProgress, useActiveTrack };

export default audioService;
