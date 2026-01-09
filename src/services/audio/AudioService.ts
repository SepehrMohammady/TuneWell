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
import { usePlayerStore, useEQStore, usePlaylistStore, useSettingsStore } from '../../store';
import { setupTrackPlayer, mapPlayerState, mapRepeatMode } from './TrackPlayerService';
import { eqService } from '../../native/AudioEqualizer';
import { nativeDecoderService } from '../../native/NativeAudioDecoder';
import { getPlayerAudioSessionId } from '../../native/TrackPlayerSession';
import type { Track, QueueItem } from '../../types';
import { PLAYBACK_STATES } from '../../config/constants';

/**
 * Check if a format requires the native decoder
 * DSD formats (DSF/DFF) and WAV files use our native decoder.
 * WAV uses native decoder for better compatibility with high-bit-depth files.
 * Other formats like FLAC, MP3, M4A/AAC/ALAC are handled by ExoPlayer via TrackPlayer.
 */
function requiresNativeDecoder(format: string): boolean {
  const fmt = (format || '').toLowerCase().replace('.', '');
  // DSD formats and WAV use native decoder
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
    'alac': 'audio/mp4', // ALAC is stored in M4A container
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
  const formatLower = (track.format || '').toLowerCase().replace('.', '');
  
  // Use content:// URI for local files (required for scoped storage on Android 10+)
  // file:// paths don't work reliably on modern Android due to storage restrictions
  let url = track.uri;
  
  // NOTE: We used to try file:// for M4A/ALAC but that doesn't work with scoped storage
  // Content providers should handle all formats including ALAC in M4A container
  // Using content:// URI is the correct approach for Android 10+
  
  // If we have a content:// URI, use it (preferred for Android scoped storage)
  // Otherwise fall back to file path if available
  if (!url && track.filePath) {
    // Convert file path to file:// URI as fallback
    url = track.filePath.startsWith('file://') 
      ? track.filePath 
      : `file://${track.filePath}`;
    console.log('[AudioService] No content:// URI, falling back to file://:', url);
  }
  
  // For DSD formats, log a warning that they won't play
  if (isDSDFormat(track.format)) {
    console.warn('[AudioService] DSD format not supported by ExoPlayer:', track.format);
  }
  
  // Warn if no URL is available
  if (!url) {
    console.error('[AudioService] No URL available for track:', {
      title: track.title,
      id: track.id,
      format: track.format,
      uri: track.uri,
      filePath: track.filePath,
    });
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
  private static instance: AudioService | null = null;
  private initialized = false;
  private eqInitialized = false;
  private eventSubscriptions: (() => void)[] = [];
  private eqUnsubscribe: (() => void) | null = null;
  private playerStoreUnsubscribe: (() => void) | null = null;
  private isFading = false;
  private crossfadeInProgress = false;
  private savedVolume = 1.0;
  private lastPreviousPressTime = 0; // For double-press detection

  /**
   * Get singleton instance
   */
  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * Fade volume over duration
   */
  private async fadeVolume(
    fromVolume: number,
    toVolume: number,
    durationMs: number,
    onComplete?: () => Promise<void>
  ): Promise<void> {
    if (durationMs <= 0) {
      await TrackPlayer.setVolume(toVolume);
      if (onComplete) await onComplete();
      return;
    }

    const steps = 20; // Number of steps for smooth fade
    const stepDuration = durationMs / steps;
    const volumeStep = (toVolume - fromVolume) / steps;

    this.isFading = true;
    let currentVolume = fromVolume;

    for (let i = 0; i < steps && this.isFading; i++) {
      currentVolume += volumeStep;
      await TrackPlayer.setVolume(Math.max(0, Math.min(1, currentVolume)));
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }

    // Ensure we end at exact target volume
    await TrackPlayer.setVolume(toVolume);
    this.isFading = false;

    if (onComplete) await onComplete();
  }

  /**
   * Initialize the audio service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await setupTrackPlayer();
    this.setupEventListeners();
    await this.initializeEQ();
    
    // Sync repeat mode from store to TrackPlayer on startup
    const { repeatMode } = usePlayerStore.getState();
    const mappedRepeatMode = mapRepeatMode(repeatMode);
    console.log('[AudioService] Syncing repeat mode on init:', repeatMode, '-> mapped:', mappedRepeatMode);
    try {
      await TrackPlayer.setRepeatMode(mappedRepeatMode);
      console.log('[AudioService] RepeatMode set successfully on init');
    } catch (error) {
      console.error('[AudioService] Failed to set repeat mode on init:', error);
    }
    
    this.initialized = true;
  }

  /**
   * Initialize the equalizer
   */
  private async initializeEQ(): Promise<void> {
    if (this.eqInitialized) return;

    try {
      // First try to get audio session from TrackPlayer's ExoPlayer
      let audioSessionId = 0;
      
      try {
        audioSessionId = await getPlayerAudioSessionId();
        console.log('[AudioService] Got audio session ID from player:', audioSessionId);
      } catch (sessionError) {
        console.warn('[AudioService] Could not get player session yet, will retry when playback starts.');
      }
      
      // If we got a valid session (non-zero), use it. Otherwise use 0 (global output)
      // On modern Android, session 0 should work for global EQ
      const result = await eqService.initialize(audioSessionId);
      
      if (result) {
        this.eqInitialized = true;
        console.log(`[AudioService] EQ initialized with session ${audioSessionId}`, {
          bands: result.numberOfBands,
          hasControl: result.hasControl,
          isEnabled: result.isEnabled,
        });
        
        // Apply current EQ settings from store
        await this.syncEQFromStore();
        
        // Subscribe to EQ store changes
        this.eqUnsubscribe = useEQStore.subscribe(
          async (state, prevState) => {
            // Check what changed and update accordingly
            if (state.isEnabled !== prevState.isEnabled) {
              await eqService.setEnabled(state.isEnabled);
            }
            
            if (state.bands !== prevState.bands) {
              await this.applyEQBands();
            }
            
            // Apply preamp changes
            if (state.preamp !== prevState.preamp) {
              console.log('[AudioService] Preamp changed:', prevState.preamp, '->', state.preamp);
              await eqService.setPreamp(state.preamp);
            }
          }
        );
      }
    } catch (error) {
      console.error('[AudioService] Failed to initialize EQ:', error);
      console.warn('[AudioService] EQ effects will not be available.');
    }
  }

  /**
   * Try to reinitialize EQ with the actual player session ID
   * Called when playback starts to get the real audio session
   */
  private async tryReinitializeEQWithPlayerSession(): Promise<void> {
    try {
      const audioSessionId = await getPlayerAudioSessionId();
      if (audioSessionId && audioSessionId !== 0) {
        console.log('[AudioService] Reinitializing EQ with player session:', audioSessionId);
        
        // Release existing EQ first
        await eqService.release();
        
        // Reinitialize with the actual session
        const result = await eqService.initialize(audioSessionId);
        if (result) {
          console.log('[AudioService] EQ reinitialized with session', audioSessionId, {
            bands: result.numberOfBands,
            hasControl: result.hasControl,
            isEnabled: result.isEnabled,
          });
          
          // Reapply current settings
          await this.syncEQFromStore();
          console.log('[AudioService] EQ settings reapplied after reinitialization');
        }
      } else {
        console.log('[AudioService] Could not get valid player session (got:', audioSessionId, ')');
      }
    } catch (error) {
      console.log('[AudioService] Could not reinitialize EQ with player session:', error);
    }
  }

  /**
   * Sync EQ settings from store to native
   */
  private async syncEQFromStore(): Promise<void> {
    const { isEnabled, bands, preamp } = useEQStore.getState();
    
    console.log('[AudioService] Syncing EQ settings:', { isEnabled, preamp, bandCount: bands.length });
    
    await eqService.setEnabled(isEnabled);
    await this.applyEQBands();
    
    // Apply preamp using LoudnessEnhancer
    await eqService.setPreamp(preamp);
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
    // Track if we've tried to reinitialize EQ with player session
    let eqReinitAttempted = false;
    
    const playbackStateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (event) => {
        const state = mapPlayerState(event.state);
        usePlayerStore.getState().setState(state as any);
        
        // Handle repeat one mode when track ends
        // State.Ended = 6 in react-native-track-player
        if (event.state === State.Ended) {
          const { repeatMode } = usePlayerStore.getState();
          console.log('[AudioService] Track ended, repeat mode:', repeatMode);
          if (repeatMode === 'track') {
            console.log('[AudioService] Repeat one: restarting current track');
            // Seek to beginning and play again
            await TrackPlayer.seekTo(0);
            await TrackPlayer.play();
            return; // Don't update state to stopped
          }
        }
        
        // When playback starts for the first time, try to reinitialize EQ with actual session
        if (state === 'playing' && !eqReinitAttempted) {
          eqReinitAttempted = true;
          // Small delay to ensure ExoPlayer is fully initialized
          setTimeout(() => {
            this.tryReinitializeEQWithPlayerSession();
          }, 500);
        }
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

    // Listen for progress updates to implement crossfade and repeat one
    const progressListener = TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      async (event) => {
        try {
          const { position, duration, buffered } = event;
          const { crossfade, crossfadeDuration } = useSettingsStore.getState();
          const { repeatMode } = usePlayerStore.getState();
          
          // Get duration from TrackPlayer if event doesn't have it
          let trackDuration = duration;
          if (!trackDuration || trackDuration <= 0) {
            const progress = await TrackPlayer.getProgress();
            trackDuration = progress.duration;
          }
          
          if (!trackDuration || trackDuration <= 0) {
            return;
          }
          
          const remainingTime = trackDuration - position;
          
          // REPEAT ONE: When very close to end of track, seek back to start
          // Using 1.5 second window to catch before TrackPlayer auto-advances
          // TrackPlayer's native RepeatMode.Track is buggy in v5 alpha
          if (repeatMode === 'track' && remainingTime > 0 && remainingTime <= 1.5) {
            console.log('[AudioService] Repeat one triggered at', remainingTime.toFixed(2), 's remaining');
            await TrackPlayer.seekTo(0);
            await TrackPlayer.play(); // Ensure playback continues
            return; // Don't process crossfade
          }
          
          // IMPORTANT: Skip crossfade entirely when repeat mode is 'track'
          // Otherwise crossfade triggers at e.g. 5.5s remaining, skipping to next track
          // before we can catch the 1.5s window for repeat one
          if (repeatMode === 'track') {
            return; // Don't process crossfade in repeat one mode
          }
          
          // DEBUG: Log all progress events when crossfade is enabled
          if (crossfade) {
            // Log every second to debug crossfade
            if (Math.floor(position) !== Math.floor(position - 1)) {
              console.log('[CROSSFADE DEBUG] pos:', position.toFixed(1), 
                'dur:', trackDuration?.toFixed(1) || 'N/A', 
                'xfadeDur:', crossfadeDuration,
                'inProgress:', this.crossfadeInProgress);
            }
          }
          
          if (!crossfade || crossfadeDuration <= 0) return;
          if (this.crossfadeInProgress) return;
          
          const crossfadeSeconds = crossfadeDuration / 1000;
          
          // Log when we're getting close to crossfade time (within 30 seconds for debugging)
          if (remainingTime <= 30 && remainingTime > 0) {
            console.log('[CROSSFADE DEBUG] NEAR END - remaining:', remainingTime.toFixed(1), 
              'xfadeSeconds:', crossfadeSeconds, 
              'triggerAt:', `<= ${(crossfadeSeconds + 0.5).toFixed(1)}s`);
          }
          
          // Start crossfade when we're within the crossfade duration of the end
          // Add a small buffer (0.5s) to ensure we don't miss it
          if (remainingTime > 0.5 && remainingTime <= crossfadeSeconds + 0.5) {
            const queue = await TrackPlayer.getQueue();
            const currentIndex = await TrackPlayer.getActiveTrackIndex();
            
            console.log('[CROSSFADE DEBUG] TRIGGER CHECK - queueLen:', queue.length, 
              'currentIndex:', currentIndex, 
              'hasNext:', currentIndex !== undefined && currentIndex < queue.length - 1);
            
            // Check if there's a next track
            if (currentIndex !== undefined && currentIndex !== null && currentIndex < queue.length - 1) {
              this.crossfadeInProgress = true;
              console.log('[CROSSFADE] Starting crossfade with', remainingTime.toFixed(1), 'seconds remaining');
              
              // Save current volume and start fading out
              this.savedVolume = usePlayerStore.getState().volume || 1.0;
              const fadeOutTime = Math.min(remainingTime * 1000 - 500, crossfadeDuration);
              console.log('[CROSSFADE] Fading out over', fadeOutTime, 'ms');
              
              await this.fadeVolume(this.savedVolume, 0, fadeOutTime);
              
              // Skip to next and fade in
              console.log('[CROSSFADE] Skipping to next track');
              await TrackPlayer.skipToNext();
              await TrackPlayer.setVolume(0);
              
              // Small delay to let the new track start
              await new Promise(resolve => setTimeout(resolve, 100));
              
              console.log('[CROSSFADE] Fading in over', crossfadeDuration, 'ms');
              await this.fadeVolume(0, this.savedVolume, crossfadeDuration);
              
              this.crossfadeInProgress = false;
              console.log('[CROSSFADE] Crossfade complete');
            } else {
              console.log('[CROSSFADE DEBUG] No next track available');
            }
          }
        } catch (error) {
          console.error('[CROSSFADE] Error:', error);
          this.crossfadeInProgress = false;
          // Restore volume on error
          await TrackPlayer.setVolume(this.savedVolume || 1.0);
        }
      }
    );

    // Reset crossfade flag on track change
    const trackChangeListener = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      () => {
        // Reset crossfade flag when track actually changes (unless we're doing crossfade)
        if (!this.crossfadeInProgress) {
          this.crossfadeInProgress = false;
        }
      }
    );

    this.eventSubscriptions = [
      playbackStateListener.remove,
      activeTrackListener.remove,
      queueEndedListener.remove,
      progressListener.remove,
      trackChangeListener.remove,
    ];

    // Set up native decoder progress callback for DSD/WAV playback
    nativeDecoderService.setOnProgress((event) => {
      // Update player store with native decoder progress
      usePlayerStore.getState().setProgress({
        position: event.position,
        duration: event.duration,
        buffered: event.buffered,
      });
    });

    nativeDecoderService.setOnState((event) => {
      // Map native decoder state to player state
      const stateMap: Record<string, any> = {
        'playing': PLAYBACK_STATES.PLAYING,
        'paused': PLAYBACK_STATES.PAUSED,
        'stopped': PLAYBACK_STATES.IDLE,
        'ended': PLAYBACK_STATES.IDLE,
      };
      const state = stateMap[event.state] || PLAYBACK_STATES.IDLE;
      usePlayerStore.getState().setState(state);
    });

    // Subscribe to player store changes for repeat mode sync
    this.playerStoreUnsubscribe = usePlayerStore.subscribe(
      async (state, prevState) => {
        // Sync repeat mode changes to TrackPlayer
        if (state.repeatMode !== prevState.repeatMode) {
          console.log('[AudioService] RepeatMode changed in store:', prevState.repeatMode, '->', state.repeatMode);
          await TrackPlayer.setRepeatMode(mapRepeatMode(state.repeatMode));
        }
      }
    );
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.eventSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.eventSubscriptions = [];
    
    // Cleanup native decoder callbacks
    nativeDecoderService.setOnProgress(null);
    nativeDecoderService.setOnState(null);
    
    // Cleanup EQ
    if (this.eqUnsubscribe) {
      this.eqUnsubscribe();
      this.eqUnsubscribe = null;
    }
    
    // Cleanup player store subscription
    if (this.playerStoreUnsubscribe) {
      this.playerStoreUnsubscribe();
      this.playerStoreUnsubscribe = null;
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
   * @param queue The queue of tracks to play
   * @param startIndex The index to start playing from
   * @param startPaused If true, load the queue but don't start playback
   */
  async playQueue(queue: QueueItem[], startIndex = 0, startPaused = false): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Update store
    usePlayerStore.getState().setQueue(queue);
    usePlayerStore.getState().setQueueIndex(startIndex);

    const startTrack = queue[startIndex]?.track;
    
    // Check if the starting track needs native decoder (DSD or WAV)
    if (startTrack && requiresNativeDecoder(startTrack.format)) {
      const formatName = isDSDFormat(startTrack.format) ? 'DSD' : 'WAV';
      console.log(`[AudioService] ${formatName} format detected, using native decoder:`, startTrack.format);
      console.log(`[AudioService] Track details:`, {
        id: startTrack.id,
        uri: startTrack.uri,
        filePath: startTrack.filePath,
        format: startTrack.format,
      });
      
      // Stop TrackPlayer if playing
      await TrackPlayer.reset();
      
      // Use native decoder - try multiple sources for the URI
      let uri = startTrack.uri || startTrack.filePath;
      
      // If still no URI, try to construct from file path
      if (!uri && startTrack.fileName) {
        console.warn(`[AudioService] No URI found, track may not be playable:`, startTrack.fileName);
      }
      
      // Ensure we have a proper URI for the native decoder
      if (uri && !uri.startsWith('content://') && !uri.startsWith('file://')) {
        uri = `file://${uri}`;
      }
      
      console.log(`[AudioService] Playing ${formatName} with native decoder, URI:`, uri, 'Format:', startTrack.format);
      
      if (uri) {
        try {
          // Pass the format to native decoder since content:// URIs don't have extensions
          const success = await nativeDecoderService.play(uri, startTrack.format);
          if (success) {
            // If startPaused, pause immediately after starting
            if (startPaused) {
              await nativeDecoderService.pause();
              usePlayerStore.getState().setState('paused');
              console.log(`[AudioService] ${formatName} loaded and paused (startPaused=true)`);
            } else {
              usePlayerStore.getState().setState('playing');
              console.log(`[AudioService] ${formatName} playback started successfully`);
            }
            
            // Record play in playlist store for tracking
            usePlaylistStore.getState().recordPlay(startTrack.id);
            console.log(`[AudioService] Recorded play for ${formatName} track:`, startTrack.id);
            
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
                console.warn(`[AudioService] Failed to reinitialize EQ for ${formatName}:`, eqError);
              }
            }, 200);
            
            return;
          } else {
            console.error('[AudioService] Native decoder returned false for:', uri);
            throw new Error(`Native decoder failed to start playback`);
          }
        } catch (error: any) {
          console.error('[AudioService] Native decoder failed:', error);
          throw new Error(`Failed to play ${formatName} file: ${error.message || 'Unknown error'}`);
        }
      }
      
      // Only reached if uri is falsy
      throw new Error(`Could not play ${formatName} file - no valid file path available. URI: ${startTrack.uri}, FilePath: ${startTrack.filePath}`);
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
      
      // Only start playback if not startPaused
      if (!startPaused) {
        await TrackPlayer.play();
      }
      
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
    
    // Restore volume if it was faded
    if (this.savedVolume < 1.0) {
      await TrackPlayer.setVolume(this.savedVolume);
    }
    
    await TrackPlayer.play();
    
    // Fade in if resuming from pause and fade is enabled
    const { fadeOnPause, fadeDuration } = useSettingsStore.getState();
    if (fadeOnPause && fadeDuration > 0) {
      // Start from 0 and fade to saved volume
      await TrackPlayer.setVolume(0);
      await this.fadeVolume(0, this.savedVolume, fadeDuration);
    }
  }

  /**
   * Pause playback with optional fade out
   */
  async pause(): Promise<void> {
    // Save current position for resume on startup
    try {
      const progress = await TrackPlayer.getProgress();
      usePlayerStore.getState().setLastPosition(progress.position);
      console.log('[AudioService] Saved position for resume:', progress.position);
    } catch (e) {
      console.warn('[AudioService] Could not save position:', e);
    }
    
    // Check if native decoder is active
    const nativeState = await nativeDecoderService.getState();
    if (nativeState?.isPlaying) {
      await nativeDecoderService.pause();
      usePlayerStore.getState().setState('paused');
      return;
    }
    
    // Check if fade on pause is enabled
    const { fadeOnPause, fadeDuration } = useSettingsStore.getState();
    if (fadeOnPause && fadeDuration > 0) {
      // Save current volume and fade out
      this.savedVolume = usePlayerStore.getState().volume;
      await this.fadeVolume(this.savedVolume, 0, fadeDuration, async () => {
        await TrackPlayer.pause();
        // Restore volume for next play (will fade in)
        await TrackPlayer.setVolume(this.savedVolume);
      });
    } else {
      await TrackPlayer.pause();
    }
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
      // Get current state from store (authoritative source)
      const storeQueue = usePlayerStore.getState().queue;
      const storeQueueIndex = usePlayerStore.getState().queueIndex;
      
      console.log('[AudioService] skipToNext - store queue length:', storeQueue.length, 'currentIndex:', storeQueueIndex);
      
      if (storeQueue.length === 0) {
        console.log('[AudioService] No queue in store');
        return false;
      }
      
      // Check if we can skip to next
      const nextIndex = storeQueueIndex + 1;
      if (nextIndex >= storeQueue.length) {
        console.log('[AudioService] At end of queue, cannot skip to next');
        return false;
      }
      
      const nextTrack = storeQueue[nextIndex]?.track;
      const currentTrack = storeQueue[storeQueueIndex]?.track;
      
      // Check if current track uses native decoder (need to stop it)
      if (currentTrack && requiresNativeDecoder(currentTrack.format)) {
        console.log('[AudioService] Stopping native decoder for current track');
        await nativeDecoderService.stop();
      }
      
      // Check if next track requires native decoder (DSD/WAV)
      if (nextTrack && requiresNativeDecoder(nextTrack.format)) {
        console.log('[AudioService] Next track requires native decoder:', nextTrack.format);
        // Use playQueue which handles native decoder initialization
        await this.playQueue(storeQueue, nextIndex);
        return true;
      }
      
      // For standard audio formats, use TrackPlayer
      const tpQueue = await TrackPlayer.getQueue();
      if (tpQueue.length === 0) {
        console.log('[AudioService] TrackPlayer queue empty, reloading from store');
        await this.playQueue(storeQueue, nextIndex);
        return true;
      }
      
      await TrackPlayer.skipToNext();
      usePlayerStore.getState().skipToNext();
      console.log('[AudioService] skipToNext succeeded (TrackPlayer)');
      return true;
    } catch (error) {
      console.error('[AudioService] skipToNext error:', error);
      return false;
    }
  }

  /**
   * Skip to previous track
   * - Double press (within 2 seconds of a restart): go to previous track
   * - Single press when position > 3 seconds: restart current track
   * - Single press when position <= 3 seconds: go to previous track
   * - If at first track: restart current track
   */
  async skipToPrevious(): Promise<boolean> {
    try {
      const now = Date.now();
      const timeSinceLastPress = now - this.lastPreviousPressTime;
      
      console.log('[AudioService] skipToPrevious called, lastPress:', this.lastPreviousPressTime, 'timeSince:', timeSinceLastPress, 'ms');
      
      // Get current state from store (authoritative source)
      const storeQueue = usePlayerStore.getState().queue;
      const storeQueueIndex = usePlayerStore.getState().queueIndex;
      const currentTrack = storeQueue[storeQueueIndex]?.track;
      
      console.log('[AudioService] skipToPrevious - store queue length:', storeQueue.length, 'currentIndex:', storeQueueIndex);
      
      if (storeQueue.length === 0) {
        console.warn('[AudioService] No queue available for previous');
        return false;
      }
      
      // Get current position based on decoder type
      let position = 0;
      if (currentTrack && requiresNativeDecoder(currentTrack.format)) {
        const nativeProgress = usePlayerStore.getState().getProgress();
        position = nativeProgress?.position || 0;
      } else {
        const progress = await TrackPlayer.getProgress();
        position = progress.position;
      }
      console.log('[AudioService] Current position:', position, 'seconds');
      
      // If at the first track, just seek to start
      if (storeQueueIndex === 0) {
        console.log('[AudioService] At first track, seeking to start');
        await this.seekTo(0);
        return true;
      }
      
      // Double press detection: if pressed within 2 seconds AND position is near start (< 5s),
      // it means user just restarted and wants to go to previous
      const isDoublePressAfterRestart = timeSinceLastPress < 2000 && position < 5;
      
      if (isDoublePressAfterRestart) {
        console.log('[AudioService] Double press after restart detected, skipping to previous track');
        const prevIndex = storeQueueIndex - 1;
        const prevTrack = storeQueue[prevIndex]?.track;
        
        // Check if current track uses native decoder (need to stop it)
        if (currentTrack && requiresNativeDecoder(currentTrack.format)) {
          await nativeDecoderService.stop();
        }
        
        // Check if previous track requires native decoder (DSD/WAV)
        if (prevTrack && requiresNativeDecoder(prevTrack.format)) {
          await this.playQueue(storeQueue, prevIndex);
        } else {
          const tpQueue = await TrackPlayer.getQueue();
          if (tpQueue.length === 0) {
            await this.playQueue(storeQueue, prevIndex);
          } else {
            await TrackPlayer.skipToPrevious();
            usePlayerStore.getState().skipToPrevious();
          }
        }
        
        this.lastPreviousPressTime = 0; // Reset so next press starts fresh
        return true;
      }
      
      // Single press: if more than 3 seconds in, restart current track
      if (position > 3) {
        console.log('[AudioService] Restarting current track (position > 3s)');
        await this.seekTo(0);
        this.lastPreviousPressTime = now; // Record this restart for double-press detection
        return true;
      }
      
      // Single press within first 3 seconds: go to previous track
      console.log('[AudioService] Skipping to previous track (position <= 3s)');
      const prevIndex = storeQueueIndex - 1;
      const prevTrack = storeQueue[prevIndex]?.track;
      
      // Check if current track uses native decoder (need to stop it)
      if (currentTrack && requiresNativeDecoder(currentTrack.format)) {
        await nativeDecoderService.stop();
      }
      
      // Check if previous track requires native decoder (DSD/WAV)
      if (prevTrack && requiresNativeDecoder(prevTrack.format)) {
        await this.playQueue(storeQueue, prevIndex);
      } else {
        const tpQueue = await TrackPlayer.getQueue();
        if (tpQueue.length === 0) {
          await this.playQueue(storeQueue, prevIndex);
        } else {
          await TrackPlayer.skipToPrevious();
          usePlayerStore.getState().skipToPrevious();
        }
      }
      
      this.lastPreviousPressTime = 0; // Reset
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
    const storeQueue = usePlayerStore.getState().queue;
    const storeQueueIndex = usePlayerStore.getState().queueIndex;
    const currentTrack = storeQueue[storeQueueIndex]?.track;
    const targetTrack = storeQueue[index]?.track;
    
    console.log('[AudioService] skipToIndex from', storeQueueIndex, 'to', index);
    
    // Check if current track uses native decoder (need to stop it)
    if (currentTrack && requiresNativeDecoder(currentTrack.format)) {
      await nativeDecoderService.stop();
    }
    
    // Check if target track requires native decoder (DSD/WAV)
    if (targetTrack && requiresNativeDecoder(targetTrack.format)) {
      console.log('[AudioService] Target track requires native decoder:', targetTrack.format);
      await this.playQueue(storeQueue, index);
    } else {
      // For standard formats, use TrackPlayer
      const tpQueue = await TrackPlayer.getQueue();
      if (tpQueue.length === 0) {
        await this.playQueue(storeQueue, index);
      } else {
        await TrackPlayer.skip(index);
        usePlayerStore.getState().skipToIndex(index);
      }
    }
  }

  /**
   * Seek to position in seconds
   */
  async seekTo(position: number): Promise<void> {
    // Check if we're playing with native decoder (DSD/WAV)
    const currentTrack = usePlayerStore.getState().currentTrack;
    if (currentTrack && requiresNativeDecoder(currentTrack.format)) {
      // Use native decoder seek
      await nativeDecoderService.seekTo(position);
      // Update store progress immediately for UI feedback
      const progress = usePlayerStore.getState().progress;
      usePlayerStore.getState().setProgress({
        ...progress,
        position: position,
      });
    } else {
      // Use TrackPlayer seek
      await TrackPlayer.seekTo(position);
    }
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
    const mappedMode = mapRepeatMode(mode);
    console.log('[AudioService] Setting repeat mode:', mode, '-> TrackPlayer RepeatMode:', mappedMode);
    try {
      await TrackPlayer.setRepeatMode(mappedMode);
      console.log('[AudioService] TrackPlayer.setRepeatMode succeeded');
    } catch (error) {
      console.error('[AudioService] TrackPlayer.setRepeatMode failed:', error);
    }
    usePlayerStore.getState().setRepeatMode(mode as any);
  }

  /**
   * Cycle through repeat modes: off -> queue -> track -> off
   */
  async cycleRepeatMode(): Promise<void> {
    const { repeatMode } = usePlayerStore.getState();
    const modes = ['off', 'queue', 'track'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    console.log('[AudioService] Cycling repeat mode:', repeatMode, '->', nextMode);
    await this.setRepeatMode(nextMode);
  }

  /**
   * Toggle shuffle mode
   */
  async toggleShuffle(): Promise<void> {
    const { isShuffled, queue, queueIndex } = usePlayerStore.getState();
    console.log('[AudioService] Toggling shuffle:', isShuffled, '->', !isShuffled);
    
    // Get current playback state and position BEFORE any changes
    const playbackState = await TrackPlayer.getPlaybackState();
    const progress = await TrackPlayer.getProgress();
    const wasPlaying = playbackState.state === State.Playing;
    const currentPosition = progress.position;
    const currentTrackId = queue[queueIndex]?.track.id;
    
    console.log('[AudioService] Shuffle - wasPlaying:', wasPlaying, 'position:', currentPosition);
    
    // Toggle shuffle in store (this reshuffles the queue)
    usePlayerStore.getState().toggleShuffle();
    
    // Rebuild TrackPlayer queue in new order
    const newState = usePlayerStore.getState();
    const tpTracks = newState.queue.map((item) => convertToTPTrack(item.track));
    
    await TrackPlayer.reset();
    await TrackPlayer.add(tpTracks);
    
    // Skip to current track in new queue order
    const newIndex = newState.queue.findIndex((item) => item.track.id === currentTrackId);
    if (newIndex !== -1) {
      await TrackPlayer.skip(newIndex);
      // Restore position
      if (currentPosition > 0) {
        await TrackPlayer.seekTo(currentPosition);
      }
    }
    
    // Resume playback if it was playing before
    if (wasPlaying) {
      await TrackPlayer.play();
    }
    
    console.log('[AudioService] Shuffle toggle complete, resumed:', wasPlaying);
  }

  /**
   * Get current playback position
   */
  async getPosition(): Promise<number> {
    const progress = await TrackPlayer.getProgress();
    return progress.position;
  }

  /**
   * Get current track duration
   */
  async getDuration(): Promise<number> {
    const progress = await TrackPlayer.getProgress();
    return progress.duration;
  }

  /**
   * Get current buffered position
   */
  async getBufferedPosition(): Promise<number> {
    const progress = await TrackPlayer.getProgress();
    return progress.buffered;
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
export const audioService = AudioService.getInstance();

// Export the class for getInstance access
export { AudioService };

// Export hooks for React components
export { usePlaybackState, useProgress, useActiveTrack };

export default audioService;
