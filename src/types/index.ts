/**
 * Core Type Definitions for TuneWell
 */

export enum AudioFormat {
  MP3 = 'mp3',
  FLAC = 'flac',
  WAV = 'wav',
  AAC = 'aac',
  M4A = 'm4a',
  OGG = 'ogg',
  OPUS = 'opus',
  DSF = 'dsf',
  DFF = 'dff',
  ALAC = 'alac',
  APE = 'ape',
  WV = 'wv',
}

export interface Track {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  duration: number;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  format: AudioFormat;
  path: string;
  folderPath: string;
  dateAdded: Date;
  dateModified: Date;
  artwork?: string;
  playCount: number;
  isFavorite: boolean;
  lastPlayed?: Date;
  trackNumber?: number;
  discNumber?: number;
  comment?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  type: PlaylistType;
  mood?: MoodType;
  trackIds: string[];
  dateCreated: Date;
  dateModified: Date;
  artwork?: string;
}

export enum PlaylistType {
  CUSTOM = 'custom',
  FAVORITES = 'favorites',
  MOST_PLAYED = 'most_played',
  RECENTLY_ADDED = 'recently_added',
  MOOD = 'mood',
}

export enum MoodType {
  SAD = 'sad',
  ENERGETIC = 'energetic',
  RELAXATION = 'relaxation',
  FOCUS = 'focus',
  WORKOUT = 'workout',
  SLEEP = 'sleep',
  PARTY = 'party',
  CHILL = 'chill',
}

export interface Folder {
  id: string;
  name: string;
  path: string;
  trackCount: number;
  dateScanned: Date;
}

export interface EQPreset {
  id: string;
  name: string;
  isCustom: boolean;
  bands: EQBand[];
}

export interface EQBand {
  frequency: number;
  gain: number;
  q: number;
}

export enum SortOption {
  FOLDER_NAME = 'folder_name',
  FILE_NAME = 'file_name',
  DATE_ADDED = 'date_added',
  DATE_MODIFIED = 'date_modified',
  ARTIST = 'artist',
  ALBUM = 'album',
  TITLE = 'title',
  DURATION = 'duration',
  PLAY_COUNT = 'play_count',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export interface AudioOutputConfig {
  sampleRate: number;
  bitDepth: number;
  bufferSize: number;
  exclusiveMode: boolean;
  bitPerfect: boolean;
  resamplingQuality: ResamplingQuality;
}

export enum ResamplingQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

export interface PlaybackState {
  currentTrack?: Track;
  isPlaying: boolean;
  position: number;
  duration: number;
  queue: Track[];
  queueIndex: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  volume: number;
}

export enum RepeatMode {
  OFF = 'off',
  ONE = 'one',
  ALL = 'all',
}

export interface ScanProgress {
  currentFolder: string;
  processedFiles: number;
  totalFiles: number;
  isScanning: boolean;
}
