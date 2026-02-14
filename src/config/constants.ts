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

// Neuro-Mood Categories - Based on neuropsychology for music selection
// Matches the detailed NEURO_MOOD_DATA in NeuroMoodSelector.tsx
export const MOOD_CATEGORIES = [
  {
    id: 'mood_happy',
    name: 'Happy / Joyful',
    icon: 'emoticon-happy-outline',
    color: '#FFFFFF',
  },
  {
    id: 'mood_sad',
    name: 'Sad / Melancholic',
    icon: 'emoticon-sad-outline',
    color: '#FFFFFF',
  },
  {
    id: 'mood_energy',
    name: 'Energetic / Pumped',
    icon: 'lightning-bolt-outline',
    color: '#FFFFFF',
  },
  {
    id: 'mood_calm',
    name: 'Calm / Relaxed',
    icon: 'tea-outline',
    color: '#FFFFFF',
  },
  {
    id: 'mood_focus',
    name: 'Focus / Flow',
    icon: 'bullseye-arrow',
    color: '#FFFFFF',
  },
  {
    id: 'mood_angry',
    name: 'Angry / Intense',
    icon: 'fire',
    color: '#FFFFFF',
  },
  {
    id: 'mood_romantic',
    name: 'Romantic / Loving',
    icon: 'heart-outline',
    color: '#FFFFFF',
  },
  {
    id: 'mood_dreamy',
    name: 'Dreamy / Ethereal',
    icon: 'cloud-outline',
    color: '#FFFFFF',
  },
  {
    id: 'mood_nostalgic',
    name: 'Nostalgic / Retro',
    icon: 'cassette',
    color: '#FFFFFF',
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

// Streaming Sources
export const STREAMING_SOURCES = {
  LOCAL: 'local',
  SPOTIFY: 'spotify',
  DEEZER: 'deezer',
  QOBUZ: 'qobuz',
} as const;

export type StreamingSource = typeof STREAMING_SOURCES[keyof typeof STREAMING_SOURCES];

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
  STREAMING: '@tunewell/streaming',
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
  
  // Streaming
  STREAMING: 'Streaming',
  SPOTIFY_PLAYLIST_DETAIL: 'SpotifyPlaylistDetail',
  IMPORT_PLAYLIST: 'ImportPlaylist',
} as const;

export type Route = typeof ROUTES[keyof typeof ROUTES];

// Theme - Minimal neutral design with subtle amber accent
export const THEME = {
  colors: {
    primary: '#D4A574',
    secondary: '#E5E5E5',
    accent: '#C9A065',
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
