/**
 * Audio Service - Core audio playback initialization
 */

import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode as TPRepeatMode,
} from 'react-native-track-player';
import {Platform} from 'react-native';

let isInitialized = false;

export async function initializeAudioService(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
      autoUpdateMetadata: true,
      waitForBuffer: true,
    });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      progressUpdateEventInterval: 1,
    });

    isInitialized = true;
    console.log('Audio service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize audio service:', error);
    throw error;
  }
}

export async function resetAudioService(): Promise<void> {
  try {
    await TrackPlayer.reset();
    isInitialized = false;
  } catch (error) {
    console.error('Failed to reset audio service:', error);
  }
}

export function isAudioServiceReady(): boolean {
  return isInitialized;
}
