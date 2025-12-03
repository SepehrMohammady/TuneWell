/**
 * TuneWell Theme
 * Unified theme export for consistent styling
 */

export { Colors } from './colors';
export { Typography, FontFamily, FontWeight } from './typography';
export { Spacing, BorderRadius, IconSize, Shadow } from './spacing';

import { Colors } from './colors';
import { Typography, FontFamily, FontWeight } from './typography';
import { Spacing, BorderRadius, IconSize, Shadow } from './spacing';

// Complete theme object for context/provider usage
export const Theme = {
  colors: Colors,
  typography: Typography,
  fontFamily: FontFamily,
  fontWeight: FontWeight,
  spacing: Spacing,
  borderRadius: BorderRadius,
  iconSize: IconSize,
  shadow: Shadow,
} as const;

export type ThemeType = typeof Theme;

// Helper function to get audio quality color
export const getQualityColor = (
  bitDepth: number,
  sampleRate: number,
  format: string
): string => {
  const formatLower = format.toLowerCase();
  
  // DSD formats
  if (formatLower === 'dff' || formatLower === 'dsf' || formatLower === 'dsd') {
    return Colors.quality.dsd;
  }
  
  // Hi-Res: 24-bit and/or > 48kHz
  if (bitDepth >= 24 || sampleRate > 48000) {
    return Colors.quality.hires;
  }
  
  // Lossless: FLAC, ALAC, WAV, AIFF at CD quality
  const losslessFormats = ['flac', 'alac', 'wav', 'aiff', 'ape', 'wv'];
  if (losslessFormats.includes(formatLower)) {
    return Colors.quality.lossless;
  }
  
  // Standard quality
  return Colors.quality.standard;
};

// Helper function to get mood color
export const getMoodColor = (mood: string): string => {
  const moodLower = mood.toLowerCase() as keyof typeof Colors.mood;
  return Colors.mood[moodLower] || Colors.text.secondary;
};

// Helper function to get EQ band color
export const getEQBandColor = (bandIndex: number): string => {
  const bandKey = `band${bandIndex + 1}` as keyof typeof Colors.eq;
  return Colors.eq[bandKey] || Colors.primary;
};
