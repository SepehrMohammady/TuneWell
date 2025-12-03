/**
 * TuneWell Color Palette
 * Professional audiophile-inspired dark theme
 */

export const Colors = {
  // Primary brand colors
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5641D9',
  
  // Accent colors for interactive elements
  accent: '#00D9FF',
  accentLight: '#74F0FF',
  accentDark: '#00A8C6',
  
  // Background hierarchy (dark theme)
  background: {
    primary: '#0D0D0D',
    secondary: '#1A1A1A',
    tertiary: '#262626',
    card: '#1E1E1E',
    elevated: '#2A2A2A',
  },
  
  // Text hierarchy
  text: {
    primary: '#FFFFFF',
    secondary: '#B3B3B3',
    tertiary: '#808080',
    disabled: '#4D4D4D',
    inverse: '#0D0D0D',
  },
  
  // Semantic colors
  success: '#00C853',
  warning: '#FFD600',
  error: '#FF5252',
  info: '#448AFF',
  
  // Audio visualization colors
  waveform: {
    primary: '#6C5CE7',
    secondary: '#A29BFE',
    peak: '#FF5252',
    rms: '#00D9FF',
  },
  
  // EQ frequency band colors (10-band)
  eq: {
    band1: '#FF6B6B',  // 32Hz - Sub bass
    band2: '#FF8E72',  // 64Hz - Bass
    band3: '#FFA94D',  // 125Hz - Low-mid
    band4: '#FFD43B',  // 250Hz - Mid
    band5: '#A9E34B',  // 500Hz - Mid
    band6: '#69DB7C',  // 1kHz - High-mid
    band7: '#38D9A9',  // 2kHz - Presence
    band8: '#3BC9DB',  // 4kHz - Brilliance
    band9: '#4DABF7',  // 8kHz - Air
    band10: '#748FFC', // 16kHz - Shimmer
  },
  
  // Audio quality indicators
  quality: {
    hires: '#FFD700',      // Gold for Hi-Res
    lossless: '#00D9FF',   // Cyan for Lossless
    dsd: '#FF69B4',        // Pink for DSD
    standard: '#B3B3B3',   // Gray for standard
  },
  
  // Mood colors
  mood: {
    happy: '#FFD43B',
    sad: '#748FFC',
    energetic: '#FF6B6B',
    calm: '#38D9A9',
    romantic: '#F783AC',
    angry: '#FF5252',
    dreamy: '#A29BFE',
    focus: '#00D9FF',
  },
  
  // Player specific
  player: {
    progress: '#6C5CE7',
    buffer: '#4D4D4D',
    track: '#2A2A2A',
    shuffle: '#00D9FF',
    repeat: '#FFD43B',
  },
  
  // Borders and dividers
  border: {
    primary: '#333333',
    secondary: '#262626',
    focus: '#6C5CE7',
  },
  
  // Overlay colors
  overlay: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.8)',
  },
  
  // Transparent
  transparent: 'transparent',
  
  // White and black
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorKeys = keyof typeof Colors;
