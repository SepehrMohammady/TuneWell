/**
 * TuneWell Spacing System
 * Consistent spacing scale based on 4px grid
 */

export const Spacing = {
  // Base unit: 4px
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  
  // Larger spacing for sections
  section: 40,
  screen: 48,
  
  // Component-specific
  cardPadding: 16,
  listItemPadding: 12,
  buttonPadding: 16,
  inputPadding: 12,
  iconPadding: 8,
  
  // Screen margins
  screenHorizontal: 16,
  screenVertical: 20,
  
  // Player-specific
  playerArtwork: 300,
  miniPlayerHeight: 64,
  tabBarHeight: 60,
  headerHeight: 56,
  
  // Grid
  gridGap: 12,
  gridItemSize: 160,
} as const;

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
  
  // Component-specific
  button: 12,
  card: 12,
  input: 8,
  chip: 16,
  artwork: 8,
  artworkLarge: 16,
  avatar: 9999,
} as const;

export const IconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 40,
  
  // Player controls
  playerSmall: 24,
  playerMedium: 32,
  playerLarge: 48,
  playerMain: 64,
  
  // Tab bar
  tabBar: 24,
  
  // Artwork placeholders
  artworkSmall: 40,
  artworkMedium: 56,
  artworkLarge: 80,
} as const;

export const Shadow = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 16,
  },
  // Colored shadow for primary elements
  primary: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  // Glow effect for active elements
  glow: {
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
} as const;

export type SpacingKeys = keyof typeof Spacing;
export type BorderRadiusKeys = keyof typeof BorderRadius;
export type IconSizeKeys = keyof typeof IconSize;
export type ShadowKeys = keyof typeof Shadow;
