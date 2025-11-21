import { create } from 'zustand';
import { Track, PlayerState } from '@/types';
import TrackPlayer, { State, RepeatMode } from 'react-native-track-player';

interface PlayerStore extends PlayerState {
    // Actions
    setPlaying: (playing: boolean) => void;
    setCurrentTrack: (track: Track | null) => void;
    setQueue: (queue: Track[]) => void;
    addToQueue: (track: Track | Track[]) => void;
    removeFromQueue: (index: number) => void;
    setCurrentIndex: (index: number) => void;
    setProgress: (progress: number) => void;
    setDuration: (duration: number) => void;
    setVolume: (volume: number) => void;
    toggleShuffle: () => void;
    cycleRepeatMode: () => void;

    // Playback controls
    play: () => Promise<void>;
    pause: () => Promise<void>;
    next: () => Promise<void>;
    previous: () => Promise<void>;
    seekTo: (position: number) => Promise<void>;
    playTrack: (track: Track, queue?: Track[]) => Promise<void>;
    clearQueue: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
    // Initial state
    isPlaying: false,
    currentTrack: null,
    queue: [],
    currentIndex: -1,
    progress: 0,
    duration: 0,
    volume: 1.0,
    shuffleMode: false,
    repeatMode: 'off',

    // Setters
    setPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentTrack: (track) => set({ currentTrack: track }),
    setQueue: (queue) => set({ queue }),
    addToQueue: async (track) => {
        const tracks = Array.isArray(track) ? track : [track];
        const currentQueue = get().queue;

        // Add to track player
        await TrackPlayer.add(tracks);

        set({ queue: [...currentQueue, ...tracks] });
    },
    removeFromQueue: async (index) => {
        await TrackPlayer.remove(index);
        const newQueue = [...get().queue];
        newQueue.splice(index, 1);
        set({ queue: newQueue });
    },
    setCurrentIndex: (index) => set({ currentIndex: index }),
    setProgress: (progress) => set({ progress }),
    setDuration: (duration) => set({ duration }),
    setVolume: async (volume) => {
        await TrackPlayer.setVolume(volume);
        set({ volume });
    },
    toggleShuffle: () => {
        const newShuffleMode = !get().shuffleMode;
        set({ shuffleMode: newShuffleMode });
        // Note: Shuffle implementation would require queue reordering
    },
    cycleRepeatMode: async () => {
        const modes: Array<'off' | 'one' | 'all'> = ['off', 'one', 'all'];
        const currentMode = get().repeatMode;
        const currentIndex = modes.indexOf(currentMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];

        // Set repeat mode in TrackPlayer
        const repeatModeMap = {
            'off': RepeatMode.Off,
            'one': RepeatMode.Track,
            'all': RepeatMode.Queue,
        };

        await TrackPlayer.setRepeatMode(repeatModeMap[nextMode]);
        set({ repeatMode: nextMode });
    },

    // Playback controls
    play: async () => {
        await TrackPlayer.play();
        set({ isPlaying: true });
    },
    pause: async () => {
        await TrackPlayer.pause();
        set({ isPlaying: false });
    },
    next: async () => {
        await TrackPlayer.skipToNext();
    },
    previous: async () => {
        await TrackPlayer.skipToPrevious();
    },
    seekTo: async (position) => {
        await TrackPlayer.seekTo(position);
        set({ progress: position });
    },
    playTrack: async (track, queue) => {
        await TrackPlayer.reset();

        const tracksToAdd = queue || [track];
        await TrackPlayer.add(tracksToAdd);

        const trackIndex = queue ? queue.findIndex(t => t.id === track.id) : 0;
        await TrackPlayer.skip(trackIndex);
        await TrackPlayer.play();

        set({
            currentTrack: track,
            queue: tracksToAdd,
            currentIndex: trackIndex,
            isPlaying: true,
        });
    },
    clearQueue: async () => {
        await TrackPlayer.reset();
        set({
            queue: [],
            currentTrack: null,
            currentIndex: -1,
            isPlaying: false,
            progress: 0,
            duration: 0,
        });
    },
}));
