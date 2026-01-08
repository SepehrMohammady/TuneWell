/**
 * TuneWell EQ Store
 * 
 * Zustand store for managing equalizer state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { EQ_FREQUENCIES, EQ_PRESETS } from '../config/constants';
import type { EQPreset } from '../config/constants';
import type { EQBand, EQSettings } from '../types';

// Default flat EQ bands
const createFlatBands = (): EQBand[] => 
  EQ_FREQUENCIES.map((frequency) => ({
    frequency,
    gain: 0,
    q: 1,
  }));

// Built-in EQ presets
export const BUILT_IN_PRESETS: Record<string, number[]> = {
  [EQ_PRESETS.FLAT]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [EQ_PRESETS.BASS_BOOST]: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  [EQ_PRESETS.TREBLE_BOOST]: [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
  [EQ_PRESETS.VOCAL]: [-2, -1, 0, 2, 4, 4, 3, 2, 1, 0],
  [EQ_PRESETS.ROCK]: [4, 3, 2, 0, -1, 0, 2, 3, 4, 4],
  [EQ_PRESETS.POP]: [-1, 0, 2, 4, 4, 3, 1, 0, 0, -1],
  [EQ_PRESETS.JAZZ]: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  [EQ_PRESETS.CLASSICAL]: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  [EQ_PRESETS.ELECTRONIC]: [5, 4, 2, 0, -2, 0, 1, 3, 4, 5],
  [EQ_PRESETS.ACOUSTIC]: [3, 2, 1, 1, 2, 2, 3, 3, 3, 2],
};

interface EQState {
  // Current EQ settings
  isEnabled: boolean;
  currentPreset: EQPreset;
  currentCustomPresetId: string | null; // Track which custom preset is loaded
  bands: EQBand[];
  preamp: number;
  
  // Custom presets stored by user
  customPresets: Record<string, EQSettings>;
  
  // Per-track EQ overrides
  trackOverrides: Record<string, string>; // trackId -> presetId
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  
  setPreset: (preset: EQPreset) => void;
  setBandGain: (frequency: number, gain: number) => void;
  setBands: (bands: EQBand[]) => void;
  setPreamp: (preamp: number) => void;
  
  resetToFlat: () => void;
  
  // Custom preset management
  saveCustomPreset: (name: string, description?: string) => string;
  deleteCustomPreset: (presetId: string) => void;
  loadCustomPreset: (presetId: string) => void;
  importPreset: (presetData: object) => string | null;
  exportPreset: (presetId: string) => object | null;
  
  // Per-track overrides
  setTrackOverride: (trackId: string, presetId: string) => void;
  clearTrackOverride: (trackId: string) => void;
  getTrackPreset: (trackId: string) => string | null;
  
  // Utility
  reset: () => void;
}

const initialState = {
  isEnabled: true,
  currentPreset: EQ_PRESETS.FLAT as EQPreset,
  currentCustomPresetId: null as string | null,
  bands: createFlatBands(),
  preamp: 0,
  customPresets: {},
  trackOverrides: {},
};

export const useEQStore = create<EQState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setEnabled: (enabled) => set({ isEnabled: enabled }),
      
      toggleEnabled: () => set((state) => ({ isEnabled: !state.isEnabled })),
      
      setPreset: (preset) => {
        const presetGains = BUILT_IN_PRESETS[preset];
        if (presetGains) {
          const bands = EQ_FREQUENCIES.map((frequency, index) => ({
            frequency,
            gain: presetGains[index] || 0,
            q: 1,
          }));
          set({ currentPreset: preset, bands, currentCustomPresetId: null });
        }
      },
      
      setBandGain: (frequency, gain) => {
        const { bands } = get();
        const clampedGain = Math.max(-12, Math.min(12, gain));
        const newBands = bands.map((band) =>
          band.frequency === frequency ? { ...band, gain: clampedGain } : band
        );
        set({ bands: newBands, currentPreset: EQ_PRESETS.CUSTOM });
      },
      
      setBands: (bands) => set({ bands, currentPreset: EQ_PRESETS.CUSTOM }),
      
      setPreamp: (preamp) => {
        const clampedPreamp = Math.max(-12, Math.min(12, preamp));
        set({ preamp: clampedPreamp });
      },
      
      resetToFlat: () => set({
        currentPreset: EQ_PRESETS.FLAT,
        currentCustomPresetId: null,
        bands: createFlatBands(),
        preamp: 0,
      }),
      
      saveCustomPreset: (name, description) => {
        const { bands, preamp, customPresets } = get();
        const id = `custom_${Date.now()}`;
        
        const newPreset: EQSettings = {
          id,
          name,
          preset: EQ_PRESETS.CUSTOM,
          isCustom: true,
          bands: [...bands],
          preamp,
          isEnabled: true,
        };
        
        set({
          customPresets: {
            ...customPresets,
            [id]: newPreset,
          },
        });
        
        return id;
      },
      
      deleteCustomPreset: (presetId) => {
        const { customPresets, trackOverrides } = get();
        const { [presetId]: removed, ...remainingPresets } = customPresets;
        
        // Remove any track overrides using this preset
        const newOverrides: Record<string, string> = {};
        Object.entries(trackOverrides).forEach(([trackId, pId]) => {
          if (pId !== presetId) {
            newOverrides[trackId] = pId;
          }
        });
        
        set({ customPresets: remainingPresets, trackOverrides: newOverrides });
      },
      
      loadCustomPreset: (presetId) => {
        const { customPresets } = get();
        const preset = customPresets[presetId];
        
        if (preset) {
          set({
            bands: [...preset.bands],
            preamp: preset.preamp,
            currentPreset: EQ_PRESETS.CUSTOM,
            currentCustomPresetId: presetId,
          });
        }
      },
      
      importPreset: (presetData: any) => {
        try {
          if (!presetData.name || !presetData.bands || !Array.isArray(presetData.bands)) {
            return null;
          }
          
          const id = `imported_${Date.now()}`;
          const bands = EQ_FREQUENCIES.map((frequency, index) => ({
            frequency,
            gain: presetData.bands[index] || 0,
            q: 1,
          }));
          
          const newPreset: EQSettings = {
            id,
            name: presetData.name,
            preset: EQ_PRESETS.CUSTOM,
            isCustom: true,
            bands,
            preamp: presetData.preamp || 0,
            isEnabled: true,
          };
          
          set((state) => ({
            customPresets: {
              ...state.customPresets,
              [id]: newPreset,
            },
          }));
          
          return id;
        } catch {
          return null;
        }
      },
      
      exportPreset: (presetId) => {
        const { customPresets, bands, preamp, currentPreset } = get();
        
        // If exporting current settings
        if (!presetId || presetId === 'current') {
          return {
            name: currentPreset === EQ_PRESETS.CUSTOM ? 'Custom' : currentPreset,
            bands: bands.map((b) => b.gain),
            preamp,
            frequencies: [...EQ_FREQUENCIES],
            version: 1,
            app: 'TuneWell',
            exportedAt: new Date().toISOString(),
          };
        }
        
        const preset = customPresets[presetId];
        if (!preset) return null;
        
        return {
          name: preset.name,
          bands: preset.bands.map((b) => b.gain),
          preamp: preset.preamp,
          frequencies: [...EQ_FREQUENCIES],
          version: 1,
          app: 'TuneWell',
          exportedAt: new Date().toISOString(),
        };
      },
      
      setTrackOverride: (trackId, presetId) => {
        set((state) => ({
          trackOverrides: {
            ...state.trackOverrides,
            [trackId]: presetId,
          },
        }));
      },
      
      clearTrackOverride: (trackId) => {
        const { trackOverrides } = get();
        const { [trackId]: removed, ...remaining } = trackOverrides;
        set({ trackOverrides: remaining });
      },
      
      getTrackPreset: (trackId) => {
        const { trackOverrides } = get();
        return trackOverrides[trackId] || null;
      },
      
      reset: () => set(initialState),
    }),
    {
      name: 'eq-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

export default useEQStore;
