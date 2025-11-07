/**
 * Settings Store - Manages app settings and configuration
 */

import {create} from 'zustand';
import {AudioOutputConfig, EQPreset, ResamplingQuality} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsStore {
  // Audio settings
  audioConfig: AudioOutputConfig;
  selectedEQPreset?: EQPreset;
  eqEnabled: boolean;
  
  // App settings
  theme: 'dark' | 'light';
  autoScan: boolean;
  gaplessPlayback: boolean;
  crossfade: number;

  // Actions
  setAudioConfig: (config: Partial<AudioOutputConfig>) => void;
  setSelectedEQPreset: (preset?: EQPreset) => void;
  setEQEnabled: (enabled: boolean) => void;
  
  setTheme: (theme: 'dark' | 'light') => void;
  setAutoScan: (enabled: boolean) => void;
  setGaplessPlayback: (enabled: boolean) => void;
  setCrossfade: (seconds: number) => void;

  // Persistence
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const DEFAULT_AUDIO_CONFIG: AudioOutputConfig = {
  sampleRate: 48000,
  bitDepth: 24,
  bufferSize: 512,
  exclusiveMode: false,
  bitPerfect: false,
  resamplingQuality: ResamplingQuality.HIGH,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // Initial state
  audioConfig: DEFAULT_AUDIO_CONFIG,
  selectedEQPreset: undefined,
  eqEnabled: false,
  
  theme: 'dark',
  autoScan: true,
  gaplessPlayback: true,
  crossfade: 0,

  // Actions
  setAudioConfig: (config) => {
    const {audioConfig} = get();
    set({audioConfig: {...audioConfig, ...config}});
    get().saveSettings();
  },

  setSelectedEQPreset: (preset) => {
    set({selectedEQPreset: preset});
    get().saveSettings();
  },

  setEQEnabled: (enabled) => {
    set({eqEnabled: enabled});
    get().saveSettings();
  },

  setTheme: (theme) => {
    set({theme});
    get().saveSettings();
  },

  setAutoScan: (autoScan) => {
    set({autoScan});
    get().saveSettings();
  },

  setGaplessPlayback: (gaplessPlayback) => {
    set({gaplessPlayback});
    get().saveSettings();
  },

  setCrossfade: (crossfade) => {
    set({crossfade});
    get().saveSettings();
  },

  // Persistence
  loadSettings: async () => {
    try {
      const settingsJson = await AsyncStorage.getItem('tunewell_settings');
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        set({
          audioConfig: settings.audioConfig || DEFAULT_AUDIO_CONFIG,
          eqEnabled: settings.eqEnabled ?? false,
          theme: settings.theme || 'dark',
          autoScan: settings.autoScan ?? true,
          gaplessPlayback: settings.gaplessPlayback ?? true,
          crossfade: settings.crossfade || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  saveSettings: async () => {
    try {
      const {audioConfig, eqEnabled, theme, autoScan, gaplessPlayback, crossfade} = get();
      const settings = {
        audioConfig,
        eqEnabled,
        theme,
        autoScan,
        gaplessPlayback,
        crossfade,
      };
      await AsyncStorage.setItem('tunewell_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
}));
