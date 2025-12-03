/**
 * TuneWell Typography System
 * Professional, readable type scale for audiophile UI
 */

import { TextStyle } from 'react-native';

// Font families
export const FontFamily = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
  mono: 'Courier',
} as const;

// Font weights
export const FontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

// Type scale
export const Typography = {
  // Display - For hero sections
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.25,
  } as TextStyle,
  
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    fontWeight: FontWeight.bold,
    letterSpacing: 0,
  } as TextStyle,
  
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: FontWeight.bold,
    letterSpacing: 0,
  } as TextStyle,
  
  // Headline - For section headers
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0,
  } as TextStyle,
  
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0,
  } as TextStyle,
  
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0,
  } as TextStyle,
  
  // Title - For cards and list items
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: FontWeight.medium,
    letterSpacing: 0,
  } as TextStyle,
  
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.15,
  } as TextStyle,
  
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.1,
  } as TextStyle,
  
  // Body - For content
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeight.regular,
    letterSpacing: 0.5,
  } as TextStyle,
  
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.regular,
    letterSpacing: 0.25,
  } as TextStyle,
  
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeight.regular,
    letterSpacing: 0.4,
  } as TextStyle,
  
  // Label - For buttons and chips
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.1,
  } as TextStyle,
  
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.5,
  } as TextStyle,
  
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.5,
  } as TextStyle,
  
  // Technical - For audio specs and metadata
  technical: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,
  
  // Mono - For timestamps and technical data
  mono: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeight.regular,
    fontFamily: FontFamily.mono,
    letterSpacing: 0,
  } as TextStyle,
  
  monoLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeight.regular,
    fontFamily: FontFamily.mono,
    letterSpacing: 0,
  } as TextStyle,
} as const;

export type TypographyVariant = keyof typeof Typography;
