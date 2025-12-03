/**
 * TuneWell Settings Store
 * 
 * Zustand store for managing app settings.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type { AppSettings, AudioOutputSettings } from '../types';

const storage = new MMKV({ id: 'tunewell-settings' });

const zustandStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

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
  crossfade: false,
  crossfadeDuration: 3000,
  
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

interface SettingsState extends AppSettings {
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
