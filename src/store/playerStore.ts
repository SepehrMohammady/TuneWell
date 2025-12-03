/**
 * TuneWell Player Store
 * 
 * Zustand store for managing playback state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import type { Track, QueueItem, PlaybackProgress } from '../types';
import type { PlaybackState, RepeatMode } from '../config/constants';
import { PLAYBACK_STATES, REPEAT_MODES } from '../config/constants';

interface PlayerState {
  // Current playback
  currentTrack: Track | null;
  queue: QueueItem[];
  queueIndex: number;
  originalQueue: QueueItem[]; // For un-shuffling
  
  // Playback state
  state: PlaybackState;
  progress: PlaybackProgress;
  volume: number;
  isMuted: boolean;
  
  // Playback modes
  repeatMode: RepeatMode;
  isShuffled: boolean;
  
  // Actions
  setCurrentTrack: (track: Track | null) => void;
  setQueue: (queue: QueueItem[]) => void;
  addToQueue: (items: QueueItem[], position?: 'next' | 'last') => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setQueueIndex: (index: number) => void;
  
  setState: (state: PlaybackState) => void;
  setProgress: (progress: PlaybackProgress) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  
  // Navigation
  skipToNext: () => boolean;
  skipToPrevious: () => boolean;
  skipToIndex: (index: number) => void;
  
  // Utility
  reset: () => void;
}

const initialState = {
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  originalQueue: [],
  state: PLAYBACK_STATES.IDLE as PlaybackState,
  progress: { position: 0, duration: 0, buffered: 0 },
  volume: 1,
  isMuted: false,
  repeatMode: REPEAT_MODES.OFF as RepeatMode,
  isShuffled: false,
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setCurrentTrack: (track) => set({ currentTrack: track }),
      
      setQueue: (queue) => set({ 
        queue, 
        originalQueue: queue,
        queueIndex: queue.length > 0 ? 0 : -1,
      }),
      
      addToQueue: (items, position = 'last') => {
        const { queue, queueIndex } = get();
        let newQueue: QueueItem[];
        
        if (position === 'next' && queueIndex >= 0) {
          newQueue = [
            ...queue.slice(0, queueIndex + 1),
            ...items,
            ...queue.slice(queueIndex + 1),
          ];
        } else {
          newQueue = [...queue, ...items];
        }
        
        set({ queue: newQueue, originalQueue: newQueue });
      },
      
      removeFromQueue: (index) => {
        const { queue, queueIndex } = get();
        const newQueue = queue.filter((_, i) => i !== index);
        let newIndex = queueIndex;
        
        if (index < queueIndex) {
          newIndex = queueIndex - 1;
        } else if (index === queueIndex && index >= newQueue.length) {
          newIndex = newQueue.length - 1;
        }
        
        set({ 
          queue: newQueue, 
          originalQueue: newQueue,
          queueIndex: newIndex,
        });
      },
      
      clearQueue: () => set({ 
        queue: [], 
        originalQueue: [],
        queueIndex: -1, 
        currentTrack: null,
        state: PLAYBACK_STATES.IDLE,
      }),
      
      setQueueIndex: (index) => {
        const { queue } = get();
        if (index >= 0 && index < queue.length) {
          set({ 
            queueIndex: index,
            currentTrack: queue[index]?.track || null,
          });
        }
      },
      
      setState: (state) => set({ state }),
      
      setProgress: (progress) => set({ progress }),
      
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      
      setRepeatMode: (mode) => set({ repeatMode: mode }),
      
      cycleRepeatMode: () => {
        const { repeatMode } = get();
        const modes: RepeatMode[] = [REPEAT_MODES.OFF, REPEAT_MODES.QUEUE, REPEAT_MODES.TRACK];
        const currentIndex = modes.indexOf(repeatMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        set({ repeatMode: modes[nextIndex] });
      },
      
      toggleShuffle: () => {
        const { isShuffled, queue, originalQueue, queueIndex, currentTrack } = get();
        
        if (isShuffled) {
          // Un-shuffle: restore original queue
          const newIndex = originalQueue.findIndex(
            (item) => item.track.id === currentTrack?.id
          );
          set({ 
            isShuffled: false, 
            queue: originalQueue,
            queueIndex: newIndex >= 0 ? newIndex : 0,
          });
        } else {
          // Shuffle: randomize queue keeping current track at current position
          const currentItem = queue[queueIndex];
          const otherItems = queue.filter((_, i) => i !== queueIndex);
          
          // Fisher-Yates shuffle
          for (let i = otherItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [otherItems[i], otherItems[j]] = [otherItems[j], otherItems[i]];
          }
          
          const shuffledQueue = [
            ...otherItems.slice(0, queueIndex),
            currentItem,
            ...otherItems.slice(queueIndex),
          ].filter(Boolean);
          
          set({ 
            isShuffled: true, 
            queue: shuffledQueue,
            queueIndex: currentItem ? shuffledQueue.indexOf(currentItem) : 0,
          });
        }
      },
      
      skipToNext: () => {
        const { queue, queueIndex, repeatMode } = get();
        
        if (queue.length === 0) return false;
        
        let nextIndex = queueIndex + 1;
        
        if (nextIndex >= queue.length) {
          if (repeatMode === REPEAT_MODES.QUEUE) {
            nextIndex = 0;
          } else {
            return false;
          }
        }
        
        set({ 
          queueIndex: nextIndex,
          currentTrack: queue[nextIndex]?.track || null,
        });
        
        return true;
      },
      
      skipToPrevious: () => {
        const { queue, queueIndex, repeatMode, progress } = get();
        
        if (queue.length === 0) return false;
        
        // If more than 3 seconds into track, restart instead
        if (progress.position > 3) {
          set({ progress: { ...progress, position: 0 } });
          return true;
        }
        
        let prevIndex = queueIndex - 1;
        
        if (prevIndex < 0) {
          if (repeatMode === REPEAT_MODES.QUEUE) {
            prevIndex = queue.length - 1;
          } else {
            prevIndex = 0;
          }
        }
        
        set({ 
          queueIndex: prevIndex,
          currentTrack: queue[prevIndex]?.track || null,
        });
        
        return true;
      },
      
      skipToIndex: (index) => {
        const { queue } = get();
        if (index >= 0 && index < queue.length) {
          set({ 
            queueIndex: index,
            currentTrack: queue[index]?.track || null,
          });
        }
      },
      
      reset: () => set(initialState),
    }),
    {
      name: 'player-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        currentTrack: state.currentTrack,
        queue: state.queue,
        queueIndex: state.queueIndex,
        volume: state.volume,
        repeatMode: state.repeatMode,
        isShuffled: state.isShuffled,
      }),
    }
  )
);

export default usePlayerStore;
