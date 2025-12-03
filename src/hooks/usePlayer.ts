/**
 * TuneWell usePlayer Hook
 * Simplified interface for player controls and state
 */

import { useCallback, useEffect } from 'react';
import TrackPlayer, {
  usePlaybackState,
  useProgress,
  useActiveTrack,
  State,
} from 'react-native-track-player';
import { usePlayerStore } from '../store';
import { PLAYBACK_STATES } from '../config/constants';

export const usePlayer = () => {
  const playbackState = usePlaybackState();
  const progress = useProgress();
  const activeTrack = useActiveTrack();
  
  const {
    state,
    currentTrack,
    queue,
    queueIndex,
    isShuffled,
    repeatMode,
    setState,
    setCurrentTrack,
    setProgress,
    toggleShuffle,
    cycleRepeatMode,
  } = usePlayerStore();

  // Determine if playing from state
  const isPlaying = state === PLAYBACK_STATES.PLAYING;

  // Sync playback state
  useEffect(() => {
    const isNowPlaying = playbackState.state === State.Playing;
    if (isNowPlaying && state !== PLAYBACK_STATES.PLAYING) {
      setState(PLAYBACK_STATES.PLAYING);
    } else if (!isNowPlaying && playbackState.state === State.Paused && state !== PLAYBACK_STATES.PAUSED) {
      setState(PLAYBACK_STATES.PAUSED);
    }
  }, [playbackState.state, state, setState]);

  // Sync progress
  useEffect(() => {
    setProgress({
      position: progress.position,
      duration: progress.duration,
      buffered: progress.buffered,
    });
  }, [progress.position, progress.duration, progress.buffered, setProgress]);

  // Sync active track
  useEffect(() => {
    if (activeTrack && activeTrack.id !== currentTrack?.id) {
      // Update current track from active track
      setCurrentTrack({
        id: activeTrack.id as string,
        uri: (activeTrack as any).url || '',
        title: activeTrack.title || 'Unknown',
        artist: activeTrack.artist || 'Unknown Artist',
        album: activeTrack.album || '',
        artworkUri: activeTrack.artwork as string | undefined,
        duration: activeTrack.duration || 0,
        filePath: (activeTrack as any).filePath || '',
        fileName: (activeTrack as any).fileName || '',
        folderPath: (activeTrack as any).folderPath || '',
        folderName: (activeTrack as any).folderName || '',
        format: (activeTrack as any).format || '',
        bitRate: (activeTrack as any).bitRate || 0,
        sampleRate: (activeTrack as any).sampleRate || 0,
        bitDepth: (activeTrack as any).bitDepth || 0,
        channels: (activeTrack as any).channels || 2,
        isLossless: (activeTrack as any).isLossless || false,
        isHighRes: (activeTrack as any).isHighRes || false,
        isDSD: (activeTrack as any).isDSD || false,
        playCount: (activeTrack as any).playCount || 0,
        isFavorite: (activeTrack as any).isFavorite || false,
        moods: (activeTrack as any).moods || [],
        dateAdded: (activeTrack as any).dateAdded || Date.now(),
        dateModified: (activeTrack as any).dateModified || Date.now(),
      });
    }
  }, [activeTrack, currentTrack?.id, setCurrentTrack]);

  const play = useCallback(async () => {
    await TrackPlayer.play();
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  const skipToNext = useCallback(async () => {
    await TrackPlayer.skipToNext();
  }, []);

  const skipToPrevious = useCallback(async () => {
    await TrackPlayer.skipToPrevious();
  }, []);

  const seekTo = useCallback(async (position: number) => {
    await TrackPlayer.seekTo(position);
  }, []);

  const seekBy = useCallback(async (offset: number) => {
    const newPosition = Math.max(0, progress.position + offset);
    await TrackPlayer.seekTo(newPosition);
  }, [progress.position]);

  const setVolume = useCallback(async (volume: number) => {
    await TrackPlayer.setVolume(Math.max(0, Math.min(1, volume)));
  }, []);

  const stop = useCallback(async () => {
    await TrackPlayer.stop();
  }, []);

  const reset = useCallback(async () => {
    await TrackPlayer.reset();
  }, []);

  return {
    // State
    isPlaying,
    currentTrack,
    queue,
    currentIndex: queueIndex,
    shuffleMode: isShuffled,
    repeatMode,
    position: progress.position,
    duration: progress.duration,
    buffered: progress.buffered,
    
    // Playback controls
    play,
    pause,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
    seekBy,
    setVolume,
    stop,
    reset,
    
    // Mode controls
    toggleShuffle,
    toggleRepeat: cycleRepeatMode,
    
    // Loading states
    isBuffering: playbackState.state === State.Buffering,
    isLoading: playbackState.state === State.Loading,
  };
};
