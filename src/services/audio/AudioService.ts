/**
 * TuneWell Audio Service
 * 
 * High-level audio playback service that wraps TrackPlayer
 * and integrates with the app's state management.
 */

import TrackPlayer, {
  Track as TPTrack,
  State,
  Event,
  usePlaybackState,
  useProgress,
  useActiveTrack,
} from 'react-native-track-player';
import { usePlayerStore, useEQStore } from '../../store';
import { setupTrackPlayer, mapPlayerState, mapRepeatMode } from './TrackPlayerService';
import { eqService } from '../../native/AudioEqualizer';
import type { Track, QueueItem } from '../../types';
import { PLAYBACK_STATES } from '../../config/constants';

/**
 * Convert our Track type to TrackPlayer Track type
 */
/**
 * Get MIME type for audio format
 */
function getContentType(format: string): string | undefined {
  const formatLower = format?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'flac': 'audio/flac',
    'wav': 'audio/x-wav',  // Use x-wav for better compatibility
    'wave': 'audio/x-wav',
    'aac': 'audio/aac',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'opus': 'audio/opus',
    'wma': 'audio/x-ms-wma',
    'aiff': 'audio/x-aiff',
    'aif': 'audio/x-aiff',
    'dsf': 'audio/x-dsf',
    'dff': 'audio/x-dff',
    'dsd': 'audio/x-dsd',
  };
  return mimeTypes[formatLower];
}

function convertToTPTrack(track: Track): TPTrack {
  const contentType = getContentType(track.format);
  
  // For local files, ensure proper URI format
  let url = track.uri;
  
  // Log for debugging
  console.log('[AudioService] Converting track:', {
    title: track.title,
    format: track.format,
    originalUri: track.uri,
    resolvedUrl: url,
    contentType,
    isContentUri: url?.startsWith('content://'),
    isFileUri: url?.startsWith('file://'),
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
      // Initialize EQ with session 0 (global output)
      const result = await eqService.initialize(0);
      
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
        
        console.log('[AudioService] EQ initialized successfully');
      }
    } catch (error) {
      console.error('[AudioService] Failed to initialize EQ:', error);
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

    // Convert to TrackPlayer tracks
    const tpTracks = queue.map((item) => convertToTPTrack(item.track));

    console.log('[AudioService] Playing queue:', {
      trackCount: tpTracks.length,
      startIndex,
      firstTrack: tpTracks[startIndex] ? {
        title: tpTracks[startIndex].title,
        url: tpTracks[startIndex].url,
        contentType: tpTracks[startIndex].contentType,
      } : null,
    });

    try {
      // Reset and load queue
      await TrackPlayer.reset();
      await TrackPlayer.add(tpTracks);
      await TrackPlayer.skip(startIndex);
      await TrackPlayer.play();
    } catch (error) {
      console.error('[AudioService] Playback error:', error);
      throw error;
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
    await TrackPlayer.play();
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    await TrackPlayer.pause();
  }

  /**
   * Toggle play/pause
   */
  async togglePlayPause(): Promise<void> {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === State.Playing) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
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
      await TrackPlayer.skipToPrevious();
      usePlayerStore.getState().skipToPrevious();
      return true;
    } catch {
      return false;
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
