/**
 * TuneWell Track Player Service
 * 
 * Background service for react-native-track-player.
 * Handles playback events and remote controls.
 */

import TrackPlayer, {
  Event,
  State,
  Capability,
  RepeatMode,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';

/**
 * Register playback service for background operation
 */
export async function PlaybackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    // Import dynamically to avoid circular dependency
    const { audioService } = await import('./AudioService');
    await audioService.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    // Import dynamically to avoid circular dependency
    const { audioService } = await import('./AudioService');
    await audioService.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    const progress = await TrackPlayer.getProgress();
    const newPosition = Math.min(progress.position + event.interval, progress.duration);
    TrackPlayer.seekTo(newPosition);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    const progress = await TrackPlayer.getProgress();
    const newPosition = Math.max(progress.position - event.interval, 0);
    TrackPlayer.seekTo(newPosition);
  });

  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    // Handle playback state changes
    console.log('[TrackPlayer] State changed:', event.state);
  });

  TrackPlayer.addEventListener(Event.PlaybackError, async (event) => {
    console.error('[TrackPlayer] Playback error:', JSON.stringify(event, null, 2));
    // Get current track info for debugging
    try {
      const track = await TrackPlayer.getActiveTrack();
      if (track) {
        console.error('[TrackPlayer] Error on track:', {
          title: track.title,
          url: track.url,
          contentType: (track as any).contentType,
          format: (track as any).format,
        });
      }
    } catch (e) {
      // Ignore if we can't get track info
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
    console.log('[TrackPlayer] Track changed:', event.track?.title);
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => {
    console.log('[TrackPlayer] Queue ended, position:', event.position);
  });
}

/**
 * Initialize Track Player with capabilities
 */
export async function setupTrackPlayer(): Promise<boolean> {
  let isSetup = false;
  
  try {
    // Check if already initialized
    try {
      const currentTrack = await TrackPlayer.getActiveTrack();
      isSetup = true; // If we got here without error, it's already set up
    } catch {
      // Not initialized yet - this is expected
      isSetup = false;
    }

    if (!isSetup) {
      await TrackPlayer.setupPlayer({
        // Audio quality settings
        maxCacheSize: 1024 * 1024 * 500, // 500 MB cache
        autoUpdateMetadata: true,
        autoHandleInterruptions: true,
      });
      
      console.log('[TrackPlayer] Setup complete');
    }

    // Always update options (in case they changed or weren't set)
    await TrackPlayer.updateOptions({
      // Capabilities for lock screen / notification
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      
      // Progress update interval - required for crossfade
      progressUpdateEventInterval: 1,
      
      // Android specific
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
    });
    
    console.log('[TrackPlayer] Options updated');

    return true;
  } catch (error) {
    console.error('[TrackPlayer] Setup failed:', error);
    return false;
  }
}

/**
 * Convert Track Player state to our PlaybackState
 */
export function mapPlayerState(state: State): string {
  switch (state) {
    case State.None:
    case State.Stopped:
      return 'stopped';
    case State.Playing:
      return 'playing';
    case State.Paused:
      return 'paused';
    case State.Buffering:
    case State.Loading:
      return 'loading';
    case State.Ready:
      return 'paused';
    case State.Ended:
      return 'stopped';
    case State.Error:
      return 'error';
    default:
      return 'idle';
  }
}

/**
 * Convert our RepeatMode to Track Player RepeatMode
 */
export function mapRepeatMode(mode: string): RepeatMode {
  switch (mode) {
    case 'track':
      return RepeatMode.Track;
    case 'queue':
      return RepeatMode.Queue;
    default:
      return RepeatMode.Off;
  }
}

export default {
  PlaybackService,
  setupTrackPlayer,
  mapPlayerState,
  mapRepeatMode,
};
