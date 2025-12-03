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
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    const position = await TrackPlayer.getPosition();
    const duration = await TrackPlayer.getDuration();
    const newPosition = Math.min(position + event.interval, duration);
    TrackPlayer.seekTo(newPosition);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    const position = await TrackPlayer.getPosition();
    const newPosition = Math.max(position - event.interval, 0);
    TrackPlayer.seekTo(newPosition);
  });

  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    // Handle playback state changes
    console.log('[TrackPlayer] State changed:', event.state);
  });

  TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
    console.error('[TrackPlayer] Playback error:', event);
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
    const currentTrack = await TrackPlayer.getActiveTrack();
    isSetup = currentTrack !== null;
  } catch {
    // Not initialized yet
    isSetup = false;
  }

  if (!isSetup) {
    await TrackPlayer.setupPlayer({
      // Audio quality settings
      maxCacheSize: 1024 * 1024 * 500, // 500 MB cache
      autoUpdateMetadata: true,
      autoHandleInterruptions: true,
    });

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
      
      // Progress update interval
      progressUpdateEventInterval: 1,
      
      // Android specific
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      
      // Icons for notification
      // icon: require('../assets/images/notification-icon.png'),
      // playIcon: require('../assets/images/play-icon.png'),
      // pauseIcon: require('../assets/images/pause-icon.png'),
      // stopIcon: require('../assets/images/stop-icon.png'),
      // previousIcon: require('../assets/images/previous-icon.png'),
      // nextIcon: require('../assets/images/next-icon.png'),
    });
  }

  return isSetup;
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
