/**
 * TuneWell App Constants
 * 
 * Central configuration for app-wide constants and settings.
 */

// Audio Format Support
export const SUPPORTED_AUDIO_FORMATS = [
  '.flac',
  '.dsf',
  '.dff',
  '.wav',
  '.mp3',
  '.aac',
  '.m4a',
  '.alac',
  '.ape',
  '.ogg',
  '.wma',
  '.aiff',
  '.aif',
] as const;

export const HIGH_RES_FORMATS = ['.flac', '.dsf', '.dff', '.wav', '.aiff', '.alac'] as const;
export const DSD_FORMATS = ['.dsf', '.dff'] as const;
export const LOSSLESS_FORMATS = ['.flac', '.wav', '.aiff', '.alac', '.ape'] as const;

// Sample Rate Definitions
export const SAMPLE_RATES = {
  CD_QUALITY: 44100,
  DVD_AUDIO: 48000,
  HI_RES_96: 96000,
  HI_RES_192: 192000,
  DSD64: 2822400,
  DSD128: 5644800,
  DSD256: 11289600,
  DSD512: 22579200,
} as const;

// Bit Depth Definitions
export const BIT_DEPTHS = {
  STANDARD: 16,
  HIGH_RES: 24,
  STUDIO: 32,
  FLOAT: 32,
} as const;

// Mood Categories
export const MOOD_CATEGORIES = [
  {
    id: 'happy',
    name: 'Happy/Joyful',
    icon: '😊',
    color: '#FFD700',
  },
  {
    id: 'sad',
    name: 'Sad/Melancholic',
    icon: '😢',
    color: '#6495ED',
  },
  {
    id: 'energetic',
    name: 'Energetic/Pumped',
    icon: '⚡',
    color: '#FF4500',
  },
  {
    id: 'calm',
    name: 'Calm/Relaxed/Chill',
    icon: '🌿',
    color: '#90EE90',
  },
  {
    id: 'romantic',
    name: 'Romantic/Loving',
    icon: '💕',
    color: '#FF69B4',
  },
  {
    id: 'angry',
    name: 'Angry/Intense',
    icon: '🔥',
    color: '#DC143C',
  },
  {
    id: 'dreamy',
    name: 'Dreamy/Reflective',
    icon: '🌙',
    color: '#9370DB',
  },
  {
    id: 'focus',
    name: 'Focus',
    icon: '🎯',
    color: '#4169E1',
  },
] as const;

export type MoodId = typeof MOOD_CATEGORIES[number]['id'];

// Sort Options
export const SORT_OPTIONS = {
  FOLDER_NAME: 'folderName',
  FILE_NAME: 'fileName',
  DATE_ADDED: 'dateAdded',
  DATE_MODIFIED: 'dateModified',
  TITLE: 'title',
  ARTIST: 'artist',
  ALBUM: 'album',
  DURATION: 'duration',
  PLAY_COUNT: 'playCount',
  LAST_PLAYED: 'lastPlayed',
} as const;

export type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS];

// Playlist Types
export const PLAYLIST_TYPES = {
  USER: 'user',
  SMART: 'smart',
  MOOD: 'mood',
  FAVORITES: 'favorites',
  MOST_PLAYED: 'mostPlayed',
  RECENTLY_ADDED: 'recentlyAdded',
  RECENTLY_PLAYED: 'recentlyPlayed',
} as const;

export type PlaylistType = typeof PLAYLIST_TYPES[keyof typeof PLAYLIST_TYPES];

// EQ Presets
export const EQ_PRESETS = {
  FLAT: 'flat',
  BASS_BOOST: 'bassBoost',
  TREBLE_BOOST: 'trebleBoost',
  VOCAL: 'vocal',
  ROCK: 'rock',
  POP: 'pop',
  JAZZ: 'jazz',
  CLASSICAL: 'classical',
  ELECTRONIC: 'electronic',
  ACOUSTIC: 'acoustic',
  CUSTOM: 'custom',
} as const;

export type EQPreset = typeof EQ_PRESETS[keyof typeof EQ_PRESETS];

// EQ Band Frequencies (10-band graphic EQ)
export const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

// Playback States
export const PLAYBACK_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  BUFFERING: 'buffering',
  ERROR: 'error',
} as const;

export type PlaybackState = typeof PLAYBACK_STATES[keyof typeof PLAYBACK_STATES];

// Repeat Modes
export const REPEAT_MODES = {
  OFF: 'off',
  TRACK: 'track',
  QUEUE: 'queue',
} as const;

export type RepeatMode = typeof REPEAT_MODES[keyof typeof REPEAT_MODES];

// Storage Keys
export const STORAGE_KEYS = {
  SETTINGS: '@tunewell/settings',
  LAST_PLAYED_TRACK: '@tunewell/lastPlayedTrack',
  PLAYBACK_POSITION: '@tunewell/playbackPosition',
  QUEUE: '@tunewell/queue',
  EQ_SETTINGS: '@tunewell/eqSettings',
  SELECTED_FOLDERS: '@tunewell/selectedFolders',
  THEME: '@tunewell/theme',
  AUDIO_OUTPUT: '@tunewell/audioOutput',
} as const;

// Navigation Routes
export const ROUTES = {
  // Main Tabs
  HOME: 'Home',
  LIBRARY: 'Library',
  PLAYLISTS: 'Playlists',
  EQUALIZER: 'Equalizer',
  SETTINGS: 'Settings',
  
  // Library Sub-routes
  FOLDERS: 'Folders',
  ALBUMS: 'Albums',
  ARTISTS: 'Artists',
  TRACKS: 'Tracks',
  GENRES: 'Genres',
  
  // Playlist Sub-routes
  FAVORITES: 'Favorites',
  MOST_PLAYED: 'MostPlayed',
  RECENTLY_ADDED: 'RecentlyAdded',
  MOOD_PLAYLISTS: 'MoodPlaylists',
  CUSTOM_PLAYLISTS: 'CustomPlaylists',
  PLAYLIST_DETAIL: 'PlaylistDetail',
  
  // Player
  PLAYER: 'Player',
  QUEUE: 'Queue',
  
  // Modals
  ADD_TO_PLAYLIST: 'AddToPlaylist',
  CREATE_PLAYLIST: 'CreatePlaylist',
  TRACK_INFO: 'TrackInfo',
  SELECT_FOLDER: 'SelectFolder',
  EQ_PRESET_DETAIL: 'EQPresetDetail',
} as const;

export type Route = typeof ROUTES[keyof typeof ROUTES];

// Theme
export const THEME = {
  colors: {
    primary: '#6366F1',
    secondary: '#818CF8',
    accent: '#C7D2FE',
    background: '#0F0F0F',
    surface: '#1A1A1A',
    surfaceLight: '#2A2A2A',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#666666',
    border: '#333333',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',
    waveform: '#6366F1',
    progress: '#818CF8',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as const },
    h2: { fontSize: 24, fontWeight: '600' as const },
    h3: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 14, fontWeight: '400' as const },
    small: { fontSize: 12, fontWeight: '400' as const },
  },
} as const;
