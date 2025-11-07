/**
 * Playback Store - Manages audio playback state
 */

import {create} from 'zustand';
import TrackPlayer, {State, Event, Track as TPTrack} from 'react-native-track-player';
import {Track, RepeatMode, PlaybackState} from '@/types';

interface PlaybackStore extends PlaybackState {
  // Actions
  setCurrentTrack: (track?: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setQueue: (queue: Track[]) => void;
  setQueueIndex: (index: number) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setShuffleEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  
  // Player controls
  play: () => Promise<void>;
  pause: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  
  // Queue management
  addToQueue: (track: Track) => Promise<void>;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // Initial state
  currentTrack: undefined,
  isPlaying: false,
  position: 0,
  duration: 0,
  queue: [],
  queueIndex: -1,
  repeatMode: RepeatMode.OFF,
  shuffleEnabled: false,
  volume: 1.0,

  // State setters
  setCurrentTrack: (track) => set({currentTrack: track}),
  setIsPlaying: (isPlaying) => set({isPlaying}),
  setPosition: (position) => set({position}),
  setDuration: (duration) => set({duration}),
  setQueue: (queue) => set({queue}),
  setQueueIndex: (index) => set({queueIndex: index}),
  setRepeatMode: (mode) => set({repeatMode: mode}),
  setShuffleEnabled: (enabled) => set({shuffleEnabled: enabled}),
  setVolume: (volume) => {
    TrackPlayer.setVolume(volume);
    set({volume});
  },

  // Player controls
  play: async () => {
    await TrackPlayer.play();
    set({isPlaying: true});
  },

  pause: async () => {
    await TrackPlayer.pause();
    set({isPlaying: false});
  },

  skipToNext: async () => {
    const {queue, queueIndex} = get();
    if (queueIndex < queue.length - 1) {
      await TrackPlayer.skipToNext();
      set({queueIndex: queueIndex + 1});
    }
  },

  skipToPrevious: async () => {
    const {queueIndex} = get();
    if (queueIndex > 0) {
      await TrackPlayer.skipToPrevious();
      set({queueIndex: queueIndex - 1});
    }
  },

  seekTo: async (position) => {
    await TrackPlayer.seekTo(position);
    set({position});
  },

  // Queue management
  addToQueue: async (track) => {
    const {queue} = get();
    const newQueue = [...queue, track];
    
    // Convert Track to TrackPlayer Track format
    const tpTrack: TPTrack = {
      id: track.id,
      url: track.path,
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: track.artwork,
      duration: track.duration,
    };
    
    await TrackPlayer.add(tpTrack);
    set({queue: newQueue});
  },

  removeFromQueue: (index) => {
    const {queue} = get();
    const newQueue = queue.filter((_, i) => i !== index);
    set({queue: newQueue});
  },

  clearQueue: () => {
    TrackPlayer.reset();
    set({
      queue: [],
      queueIndex: -1,
      currentTrack: undefined,
      isPlaying: false,
      position: 0,
      duration: 0,
    });
  },

  shuffleQueue: () => {
    const {queue} = get();
    const shuffled = [...queue].sort(() => Math.random() - 0.5);
    set({queue: shuffled});
  },
}));
