// EQ Context for managing equalizer state globally
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EQBand {
  frequency: number;
  gain: number; // -12 to +12 dB
  label: string;
}

export interface EQPreset {
  id: string;
  name: string;
  bands: EQBand[];
  isCustom: boolean;
}

export interface EQState {
  isEnabled: boolean;
  currentPreset: string;
  presets: EQPreset[];
  customBands: EQBand[];
}

const DEFAULT_BANDS: EQBand[] = [
  { frequency: 32, gain: 0, label: '32Hz' },
  { frequency: 64, gain: 0, label: '64Hz' },
  { frequency: 125, gain: 0, label: '125Hz' },
  { frequency: 250, gain: 0, label: '250Hz' },
  { frequency: 500, gain: 0, label: '500Hz' },
  { frequency: 1000, gain: 0, label: '1kHz' },
  { frequency: 2000, gain: 0, label: '2kHz' },
  { frequency: 4000, gain: 0, label: '4kHz' },
  { frequency: 8000, gain: 0, label: '8kHz' },
  { frequency: 16000, gain: 0, label: '16kHz' },
];

const DEFAULT_PRESETS: EQPreset[] = [
  {
    id: 'flat',
    name: 'Flat',
    bands: DEFAULT_BANDS,
    isCustom: false,
  },
  {
    id: 'rock',
    name: 'Rock',
    bands: [
      { frequency: 32, gain: 5, label: '32Hz' },
      { frequency: 64, gain: 3, label: '64Hz' },
      { frequency: 125, gain: -2, label: '125Hz' },
      { frequency: 250, gain: -1, label: '250Hz' },
      { frequency: 500, gain: 0, label: '500Hz' },
      { frequency: 1000, gain: 2, label: '1kHz' },
      { frequency: 2000, gain: 4, label: '2kHz' },
      { frequency: 4000, gain: 5, label: '4kHz' },
      { frequency: 8000, gain: 3, label: '8kHz' },
      { frequency: 16000, gain: 1, label: '16kHz' },
    ],
    isCustom: false,
  },
  {
    id: 'pop',
    name: 'Pop',
    bands: [
      { frequency: 32, gain: -1, label: '32Hz' },
      { frequency: 64, gain: 2, label: '64Hz' },
      { frequency: 125, gain: 4, label: '125Hz' },
      { frequency: 250, gain: 3, label: '250Hz' },
      { frequency: 500, gain: 0, label: '500Hz' },
      { frequency: 1000, gain: -2, label: '1kHz' },
      { frequency: 2000, gain: -1, label: '2kHz' },
      { frequency: 4000, gain: 2, label: '4kHz' },
      { frequency: 8000, gain: 4, label: '8kHz' },
      { frequency: 16000, gain: 3, label: '16kHz' },
    ],
    isCustom: false,
  },
  {
    id: 'classical',
    name: 'Classical',
    bands: [
      { frequency: 32, gain: 3, label: '32Hz' },
      { frequency: 64, gain: 2, label: '64Hz' },
      { frequency: 125, gain: 0, label: '125Hz' },
      { frequency: 250, gain: 0, label: '250Hz' },
      { frequency: 500, gain: -2, label: '500Hz' },
      { frequency: 1000, gain: -2, label: '1kHz' },
      { frequency: 2000, gain: 0, label: '2kHz' },
      { frequency: 4000, gain: 2, label: '4kHz' },
      { frequency: 8000, gain: 4, label: '8kHz' },
      { frequency: 16000, gain: 3, label: '16kHz' },
    ],
    isCustom: false,
  },
];

interface EQContextType {
  eqState: EQState;
  toggleEQ: () => void;
  selectPreset: (presetId: string) => void;
  updateBand: (index: number, gain: number) => void;
  saveCustomPreset: (name: string) => Promise<void>;
  deletePreset: (presetId: string) => Promise<void>;
  resetToFlat: () => void;
}

const EQContext = createContext<EQContextType | undefined>(undefined);

export const useEQ = (): EQContextType => {
  const context = useContext(EQContext);
  if (!context) {
    throw new Error('useEQ must be used within an EQProvider');
  }
  return context;
};

export const EQProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [eqState, setEQState] = useState<EQState>({
    isEnabled: false,
    currentPreset: 'flat',
    presets: DEFAULT_PRESETS,
    customBands: [...DEFAULT_BANDS],
  });

  // Load EQ settings from storage on mount
  useEffect(() => {
    loadEQSettings();
  }, []);

  // Save EQ settings to storage whenever state changes
  useEffect(() => {
    saveEQSettings();
  }, [eqState]);

  const loadEQSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('@tunewell_eq_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setEQState(prev => ({
          ...prev,
          ...parsed,
          presets: [...DEFAULT_PRESETS, ...parsed.customPresets || []],
        }));
      }
    } catch (error) {
      console.error('Error loading EQ settings:', error);
    }
  };

  const saveEQSettings = async () => {
    try {
      const customPresets = eqState.presets.filter(p => p.isCustom);
      const settingsToSave = {
        isEnabled: eqState.isEnabled,
        currentPreset: eqState.currentPreset,
        customBands: eqState.customBands,
        customPresets,
      };
      await AsyncStorage.setItem('@tunewell_eq_settings', JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Error saving EQ settings:', error);
    }
  };

  const toggleEQ = () => {
    setEQState(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  };

  const selectPreset = (presetId: string) => {
    const preset = eqState.presets.find(p => p.id === presetId);
    if (preset) {
      setEQState(prev => ({
        ...prev,
        currentPreset: presetId,
        customBands: [...preset.bands],
      }));
    }
  };

  const updateBand = (index: number, gain: number) => {
    const newBands = [...eqState.customBands];
    newBands[index] = { ...newBands[index], gain };
    setEQState(prev => ({
      ...prev,
      customBands: newBands,
      currentPreset: 'custom',
    }));
  };

  const saveCustomPreset = async (name: string) => {
    const customPreset: EQPreset = {
      id: `custom_${Date.now()}`,
      name,
      bands: [...eqState.customBands],
      isCustom: true,
    };

    setEQState(prev => ({
      ...prev,
      presets: [...prev.presets, customPreset],
      currentPreset: customPreset.id,
    }));
  };

  const deletePreset = async (presetId: string) => {
    const preset = eqState.presets.find(p => p.id === presetId);
    if (preset && preset.isCustom) {
      setEQState(prev => ({
        ...prev,
        presets: prev.presets.filter(p => p.id !== presetId),
        currentPreset: prev.currentPreset === presetId ? 'flat' : prev.currentPreset,
      }));
    }
  };

  const resetToFlat = () => {
    selectPreset('flat');
  };

  return (
    <EQContext.Provider
      value={{
        eqState,
        toggleEQ,
        selectPreset,
        updateBand,
        saveCustomPreset,
        deletePreset,
        resetToFlat,
      }}
    >
      {children}
    </EQContext.Provider>
  );
};