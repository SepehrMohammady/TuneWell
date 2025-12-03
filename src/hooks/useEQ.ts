/**
 * TuneWell useEQ Hook
 * Interface for the 10-band equalizer
 */

import { useCallback } from 'react';
import { useEQStore, BUILT_IN_PRESETS } from '../store/eqStore';

export const useEQ = () => {
  const {
    isEnabled,
    bands,
    preamp,
    currentPreset,
    customPresets,
    toggleEnabled,
    setBandGain,
    setBands,
    resetToFlat,
    setPreamp,
    setPreset,
    saveCustomPreset,
    deleteCustomPreset,
  } = useEQStore();

  // Get all available presets (built-in + custom)
  const getAllPresets = useCallback(() => {
    const builtIn = Object.entries(BUILT_IN_PRESETS).map(([id, gains]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      bands: gains,
    }));
    const custom = Object.entries(customPresets).map(([id, settings]) => ({
      id,
      name: id,
      bands: settings.bands.map(b => b.gain),
    }));
    return [...builtIn, ...custom];
  }, [customPresets]);

  // Get current preset name
  const getCurrentPresetName = useCallback(() => {
    return currentPreset.charAt(0).toUpperCase() + currentPreset.slice(1);
  }, [currentPreset]);

  // Check if current settings match the active preset
  const isPresetModified = useCallback(() => {
    const presetGains = BUILT_IN_PRESETS[currentPreset];
    if (!presetGains) return true;
    
    return bands.some((band, index) => band.gain !== presetGains[index]);
  }, [currentPreset, bands]);

  // Apply a preset by ID
  const applyPreset = useCallback((presetId: string) => {
    setPreset(presetId as any);
  }, [setPreset]);

  // Save current settings as a new custom preset
  const saveAsPreset = useCallback((name: string) => {
    saveCustomPreset(name);
  }, [saveCustomPreset]);

  // Get band gain as percentage (-12dB to +12dB -> 0% to 100%)
  const getBandPercentage = useCallback((index: number): number => {
    const gain = bands[index]?.gain || 0;
    return ((gain + 12) / 24) * 100;
  }, [bands]);

  // Set band gain from percentage
  const setBandFromPercentage = useCallback((index: number, percentage: number) => {
    const gain = (percentage / 100) * 24 - 12;
    const frequency = bands[index]?.frequency || 0;
    setBandGain(frequency, gain);
  }, [setBandGain, bands]);

  // Get the frequency label for a band
  const getFrequencyLabel = useCallback((index: number): string => {
    const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    const freq = frequencies[index];
    if (freq >= 1000) {
      return `${freq / 1000}k`;
    }
    return freq.toString();
  }, []);

  // Get the frequency value for a band
  const getFrequency = useCallback((index: number): number => {
    const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    return frequencies[index];
  }, []);

  return {
    // State
    isEnabled,
    bands,
    preGain: preamp,
    currentPresetId: currentPreset,
    customPresets,
    
    // Computed
    currentPresetName: getCurrentPresetName(),
    isModified: isPresetModified(),
    allPresets: getAllPresets(),
    builtInPresets: BUILT_IN_PRESETS,
    
    // Actions
    toggleEQ: toggleEnabled,
    setBandGain,
    setAllBands: setBands,
    resetBands: resetToFlat,
    setPreGain: setPreamp,
    applyPreset,
    saveAsPreset,
    deleteCustomPreset,
    
    // Helpers
    getBandPercentage,
    setBandFromPercentage,
    getFrequencyLabel,
    getFrequency,
  };
};
