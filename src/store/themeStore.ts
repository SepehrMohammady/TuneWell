/**
 * TuneWell Theme Store
 * 
 * Manages theme state with persistence:
 * - Dark, Light, AMOLED Black themes
 * - System theme support
 * - Persisted via MMKV
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

// Create dedicated storage for theme
const storage = new MMKV({ id: 'tunewell.theme' });

export type ThemeMode = 'dark' | 'light' | 'amoled' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  waveform: string;
  progress: string;
}

// Theme definitions
export const THEMES: Record<Exclude<ThemeMode, 'system'>, ThemeColors> = {
  dark: {
    primary: '#FFFFFF',
    secondary: '#E5E5E5',
    accent: '#D4D4D4',
    background: '#0A0A0A',
    surface: '#141414',
    surfaceLight: '#1F1F1F',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textMuted: '#525252',
    border: '#262626',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#CA8A04',
    info: '#2563EB',
    waveform: '#FFFFFF',
    progress: '#FFFFFF',
  },
  light: {
    primary: '#000000',
    secondary: '#1A1A1A',
    accent: '#2B2B2B',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceLight: '#EBEBEB',
    text: '#000000',
    textSecondary: '#5C5C5C',
    textMuted: '#ADADAD',
    border: '#D9D9D9',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#CA8A04',
    info: '#2563EB',
    waveform: '#000000',
    progress: '#000000',
  },
  amoled: {
    primary: '#FFFFFF',
    secondary: '#E5E5E5',
    accent: '#D4D4D4',
    background: '#000000',
    surface: '#0A0A0A',
    surfaceLight: '#141414',
    text: '#FFFFFF',
    textSecondary: '#9A9A9A',
    textMuted: '#4A4A4A',
    border: '#1A1A1A',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#CA8A04',
    info: '#2563EB',
    waveform: '#FFFFFF',
    progress: '#FFFFFF',
  },
};

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  
  // Actions
  setTheme: (mode: ThemeMode) => void;
  getEffectiveTheme: () => Exclude<ThemeMode, 'system'>;
}

const getStoredMode = (): ThemeMode => {
  const stored = storage.getString('themeMode');
  if (stored && ['dark', 'light', 'amoled', 'system'].includes(stored)) {
    return stored as ThemeMode;
  }
  return 'dark';
};

// Determine actual theme (for system mode, we default to dark for now)
const getEffectiveColors = (mode: ThemeMode): ThemeColors => {
  if (mode === 'system') {
    // In a real app, we'd use Appearance API to detect system theme
    // For now, default to dark
    return THEMES.dark;
  }
  return THEMES[mode];
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: getStoredMode(),
  colors: getEffectiveColors(getStoredMode()),
  
  setTheme: (mode: ThemeMode) => {
    storage.set('themeMode', mode);
    const colors = getEffectiveColors(mode);
    set({ mode, colors });
  },
  
  getEffectiveTheme: () => {
    const { mode } = get();
    if (mode === 'system') {
      // For now, default to dark
      return 'dark';
    }
    return mode;
  },
}));
