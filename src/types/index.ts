/**
 * TuneWell Core Types
 * 
 * Type definitions for the music player application.
 */

import type { MoodId, PlaylistType, EQPreset, PlaybackState, RepeatMode, SortOption } from '../config/constants';

// ============================================================================
// Audio Track Types
// ============================================================================

export interface Track {
  id: string;
  uri: string;
  filePath: string;
  fileName: string;
  folderPath: string;
  folderName: string;
  
  // Metadata
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  composer?: string;
  
  // Audio Properties
  duration: number; // in seconds
  sampleRate: number;
  bitDepth: number;
  bitRate?: number;
  channels: number;
  format: string;
  codec?: string;
  fileSize?: number; // in bytes
  isLossless: boolean;
  isHighRes: boolean;
  isDSD: boolean;
  
  // Artwork
  artworkUri?: string;
  artworkColor?: string;
  
  // User Data
  playCount: number;
  lastPlayedAt?: number;
  rating?: number;
  isFavorite: boolean;
  moods: MoodId[];
  
  // Timestamps
  dateAdded: number;
  dateModified: number;
  
  // ReplayGain
  replayGainTrack?: number;
  replayGainAlbum?: number;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artworkUri?: string;
  year?: number;
  genre?: string;
  trackCount: number;
  totalDuration: number;
  tracks: string[]; // Track IDs
}

export interface Artist {
  id: string;
  name: string;
  artworkUri?: string;
  albumCount: number;
  trackCount: number;
  albums: string[]; // Album IDs
}

export interface Folder {
  id: string;
  path: string;
  name: string;
  parentPath?: string;
  trackCount: number;
  subfolderCount: number;
  lastScanned?: number;
  isWatched: boolean;
}

// ============================================================================
// Playlist Types
// ============================================================================

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  type: PlaylistType;
  artworkUri?: string;
  
  // For mood playlists
  mood?: MoodId;
  
  // Smart playlist criteria
  smartCriteria?: SmartPlaylistCriteria;
  
  // Track IDs for manual playlists
  tracks: string[];
  
  // Metadata
  trackCount: number;
  totalDuration: number;
  createdAt: number;
  updatedAt: number;
}

export interface SmartPlaylistCriteria {
  rules: SmartPlaylistRule[];
  matchAll: boolean; // true = AND, false = OR
  limit?: number;
  sortBy?: SortOption;
  sortDescending?: boolean;
}

export interface SmartPlaylistRule {
  field: keyof Track;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'between' | 'inLast' | 'notInLast';
  value: string | number | boolean | [number, number];
}

// ============================================================================
// EQ Types
// ============================================================================

export interface EQBand {
  frequency: number;
  gain: number; // -12 to +12 dB
  q?: number; // For parametric EQ
}

export interface EQSettings {
  id: string;
  name: string;
  preset: EQPreset;
  isCustom: boolean;
  bands: EQBand[];
  preamp: number; // -12 to +12 dB
  isEnabled: boolean;
}

export interface EQPresetData {
  id: string;
  name: string;
  description?: string;
  bands: number[]; // Gain values for each frequency band
  preamp: number;
}

// ============================================================================
// Playback Types
// ============================================================================

export interface PlaybackProgress {
  position: number;
  duration: number;
  buffered: number;
}

export interface QueueItem {
  id: string;
  track: Track;
  addedAt: number;
  source: 'library' | 'playlist' | 'folder' | 'search';
  sourceId?: string;
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: QueueItem[];
  queueIndex: number;
  state: PlaybackState;
  progress: PlaybackProgress;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  shuffleOrder: number[];
}

// ============================================================================
// Audio Output Types
// ============================================================================

export interface AudioDevice {
  id: string;
  name: string;
  type: 'speaker' | 'headphones' | 'bluetooth' | 'usb' | 'airplay' | 'chromecast';
  isDefault: boolean;
  isConnected: boolean;
  sampleRates?: number[];
  bitDepths?: number[];
  supportsExclusiveMode: boolean;
  supportsDSD: boolean;
}

export interface AudioOutputSettings {
  selectedDeviceId?: string;
  sampleRate: number;
  bitDepth: number;
  exclusiveMode: boolean;
  gaplessPlayback: boolean;
  replayGainMode: 'off' | 'track' | 'album';
  replayGainPreamp: number;
  dsdOutputMode: 'pcm' | 'dop' | 'native';
}

// ============================================================================
// Library Types
// ============================================================================

export interface LibraryScanResult {
  totalFiles: number;
  scannedFiles: number;
  newTracks: number;
  updatedTracks: number;
  failedFiles: string[];
  duration: number;
}

export interface LibraryStats {
  totalTracks: number;
  totalAlbums: number;
  totalArtists: number;
  totalDuration: number;
  totalSize: number;
  formats: Record<string, number>;
  highResCount: number;
  dsdCount: number;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface AppSettings {
  // General
  theme: 'dark' | 'light' | 'system';
  language: string;
  
  // Library
  scanFolders: string[];
  autoScanOnStartup: boolean;
  watchForChanges: boolean;
  
  // Playback
  resumeOnStartup: boolean;
  fadeOnPause: boolean;
  fadeDuration: number;
  crossfade: boolean;
  crossfadeDuration: number;
  
  // Audio Output
  audioOutput: AudioOutputSettings;
  
  // UI
  showRemainingTime: boolean;
  showBitrate: boolean;
  showSampleRate: boolean;
  artworkQuality: 'low' | 'medium' | 'high';
  
  // Notifications
  showNowPlayingNotification: boolean;
  
  // Data
  lastLibraryScan?: number;
}

// ============================================================================
// Navigation Types
// ============================================================================

export type RootStackParamList = {
  MainTabs: undefined;
  Player: undefined;
  Queue: undefined;
  AddToPlaylist: { trackIds: string[] };
  CreatePlaylist: { trackIds?: string[] };
  TrackInfo: { trackId: string };
  SelectFolder: undefined;
  EQPresetDetail: { presetId: string };
};

export type MainTabsParamList = {
  Home: undefined;
  Library: undefined;
  Playlists: undefined;
  Equalizer: undefined;
  Settings: undefined;
};

export type LibraryStackParamList = {
  LibraryMain: undefined;
  Folders: undefined;
  FolderDetail: { folderId: string };
  Albums: undefined;
  AlbumDetail: { albumId: string };
  Artists: undefined;
  ArtistDetail: { artistId: string };
  Tracks: undefined;
  Genres: undefined;
  GenreDetail: { genre: string };
};

export type PlaylistsStackParamList = {
  PlaylistsMain: undefined;
  Favorites: undefined;
  MostPlayed: undefined;
  RecentlyAdded: undefined;
  RecentlyPlayed: undefined;
  MoodPlaylists: undefined;
  MoodPlaylistDetail: { mood: MoodId };
  CustomPlaylists: undefined;
  PlaylistDetail: { playlistId: string };
};
