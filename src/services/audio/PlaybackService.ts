/**
 * Playback Service - Background playback handler
 */

import TrackPlayer, {Event} from 'react-native-track-player';
import {updatePlayCount} from '../database/Database';

export async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, event => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async event => {
    // Track ended, update play count
    const currentTrack = await TrackPlayer.getActiveTrack();
    if (currentTrack && event.position > 0) {
      await updatePlayCount(currentTrack.id);
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async event => {
    // Track changed, update play count for the previous track if it was played significantly
    if (event.lastTrack && event.lastPosition && event.lastPosition > 30) {
      await updatePlayCount(event.lastTrack.id);
    }
  });
}
