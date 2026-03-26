/**
 * TuneWell Settings Store
 * 
 * Zustand store for managing app settings.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import type { AppSettings, AudioOutputSettings } from '../types';

const defaultAudioOutput: AudioOutputSettings = {
  selectedDeviceId: undefined,
  sampleRate: 44100,
  bitDepth: 16,
  exclusiveMode: false,
  gaplessPlayback: true,
  replayGainMode: 'off',
  replayGainPreamp: 0,
  dsdOutputMode: 'pcm',
};

const defaultSettings: AppSettings = {
  // General
  theme: 'dark',
  language: 'en',
  
  // Library
  scanFolders: [],
  autoScanOnStartup: true,
  watchForChanges: true,
  
  // Playback
  resumeOnStartup: true,
  fadeOnPause: true,
  fadeDuration: 200,
  crossfade: true,
  crossfadeDuration: 5000,
  
  // Audio Output
  audioOutput: defaultAudioOutput,
  
  // UI
  showRemainingTime: false,
  showBitrate: true,
  showSampleRate: true,
  artworkQuality: 'high',
  
  // Notifications
  showNowPlayingNotification: true,
  
  // Data
  lastLibraryScan: undefined,
};

// Home screen section configuration
export interface HomeSectionConfig {
  id: string;
  label: string;
  visible: boolean;
}

const defaultHomeSections: HomeSectionConfig[] = [
  { id: 'library', label: 'Your Library', visible: true },
  { id: 'recentlyPlayed', label: 'Recently Played', visible: true },
  { id: 'favorites', label: 'Favorites', visible: true },
  { id: 'myPlaylists', label: 'My Playlists', visible: true },
  { id: 'moodPlaylists', label: 'Mood Playlists', visible: true },
  { id: 'telegram', label: 'Telegram Music', visible: true },
  // Spotify Playlists hidden — streaming APIs require business agreements for public release
];

interface SettingsState extends AppSettings {
  // Home screen sections
  homeSections: HomeSectionConfig[];
  
  // Actions - Home sections
  setHomeSections: (sections: HomeSectionConfig[]) => void;
  toggleHomeSection: (sectionId: string) => void;
  moveHomeSection: (sectionId: string, direction: 'up' | 'down') => void;
  resetHomeSections: () => void;
  
  // Actions
  setTheme: (theme: AppSettings['theme']) => void;
  setLanguage: (language: string) => void;
  
  setAutoScanOnStartup: (enabled: boolean) => void;
  setWatchForChanges: (enabled: boolean) => void;
  
  setResumeOnStartup: (enabled: boolean) => void;
  setFadeOnPause: (enabled: boolean) => void;
  setFadeDuration: (duration: number) => void;
  setCrossfade: (enabled: boolean) => void;
  setCrossfadeDuration: (duration: number) => void;
  
  setAudioOutput: (settings: Partial<AudioOutputSettings>) => void;
  
  setShowRemainingTime: (show: boolean) => void;
  setShowBitrate: (show: boolean) => void;
  setShowSampleRate: (show: boolean) => void;
  setArtworkQuality: (quality: AppSettings['artworkQuality']) => void;
  
  setShowNowPlayingNotification: (show: boolean) => void;
  
  setLastLibraryScan: (timestamp: number) => void;
  
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      
      // Home sections
      homeSections: defaultHomeSections,
      
      setHomeSections: (sections) => set({ homeSections: sections }),
      
      toggleHomeSection: (sectionId) => {
        const sections = [...get().homeSections];
        const idx = sections.findIndex(s => s.id === sectionId);
        if (idx !== -1) {
          sections[idx] = { ...sections[idx], visible: !sections[idx].visible };
          set({ homeSections: sections });
        }
      },
      
      moveHomeSection: (sectionId, direction) => {
        const sections = [...get().homeSections];
        const idx = sections.findIndex(s => s.id === sectionId);
        if (idx === -1) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= sections.length) return;
        [sections[idx], sections[swapIdx]] = [sections[swapIdx], sections[idx]];
        set({ homeSections: sections });
      },
      
      resetHomeSections: () => set({ homeSections: defaultHomeSections }),
      
      setTheme: (theme) => set({ theme }),
      
      setLanguage: (language) => set({ language }),
      
      setAutoScanOnStartup: (autoScanOnStartup) => set({ autoScanOnStartup }),
      
      setWatchForChanges: (watchForChanges) => set({ watchForChanges }),
      
      setResumeOnStartup: (resumeOnStartup) => set({ resumeOnStartup }),
      
      setFadeOnPause: (fadeOnPause) => set({ fadeOnPause }),
      
      setFadeDuration: (fadeDuration) => set({ fadeDuration }),
      
      setCrossfade: (crossfade) => set({ crossfade }),
      
      setCrossfadeDuration: (crossfadeDuration) => set({ crossfadeDuration }),
      
      setAudioOutput: (settings) => {
        const { audioOutput } = get();
        set({ audioOutput: { ...audioOutput, ...settings } });
      },
      
      setShowRemainingTime: (showRemainingTime) => set({ showRemainingTime }),
      
      setShowBitrate: (showBitrate) => set({ showBitrate }),
      
      setShowSampleRate: (showSampleRate) => set({ showSampleRate }),
      
      setArtworkQuality: (artworkQuality) => set({ artworkQuality }),
      
      setShowNowPlayingNotification: (showNowPlayingNotification) => 
        set({ showNowPlayingNotification }),
      
      setLastLibraryScan: (lastLibraryScan) => set({ lastLibraryScan }),
      
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

export default useSettingsStore;
