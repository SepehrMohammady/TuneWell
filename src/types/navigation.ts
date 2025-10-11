export type RootStackParamList = {
  Home: undefined;
  Player: {
    track?: AudioTrack;
    playlist?: AudioTrack[];
  };
  Playlist: {
    type?: 'favorites' | 'mostPlayed' | 'recentlyAdded' | 'custom';
    playlistId?: string;
  };
  Equalizer: undefined;
  FolderBrowser: {
    path?: string;
  };
};

export type TabParamList = {
  Home: undefined;
  Player: undefined;
  Playlists: undefined;
  Browse: undefined;
  Equalizer: undefined;
};

export type MoodType = 'happy' | 'sad' | 'energetic' | 'calm' | 'romantic' | 'angry' | 'dreamy' | 'confident';

export interface MoodInfo {
  type: MoodType;
  emoji: string;
  description: string;
  musicVibe: string;
}

export const MOOD_OPTIONS: MoodInfo[] = [
  { type: 'happy', emoji: '😊', description: 'Happy / Joyful', musicVibe: 'Upbeat, major key, lively' },
  { type: 'sad', emoji: '😢', description: 'Sad / Melancholic', musicVibe: 'Slow, minor key, reflective' },
  { type: 'energetic', emoji: '⚡', description: 'Energetic / Pumped', musicVibe: 'Dance, workout, high BPM' },
  { type: 'calm', emoji: '😌', description: 'Calm / Relaxed', musicVibe: 'Acoustic, ambient, chill' },
  { type: 'romantic', emoji: '💖', description: 'Romantic / Loving', musicVibe: 'Soft, melodic, warm' },
  { type: 'angry', emoji: '😠', description: 'Angry / Intense', musicVibe: 'Rock, metal, aggressive' },
  { type: 'dreamy', emoji: '🌙', description: 'Dreamy / Reflective', musicVibe: 'Atmospheric, ethereal' },
  { type: 'confident', emoji: '😎', description: 'Confident / Cool', musicVibe: 'Funk, groove, swagger' },
];

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  uri: string;
  format: string;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  filePath: string;
  fileSize: number;
  dateAdded: string; // Changed from Date to string for serialization
  playCount: number;
  isFavorite: boolean;
  albumArt?: string; // Optional album art URI
  moods?: MoodType[]; // Array of assigned moods
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: AudioTrack[];
  createdAt: Date;
  updatedAt: Date;
  type: 'favorites' | 'mostPlayed' | 'recentlyAdded' | 'custom';
}

export interface EqualizerPreset {
  id: string;
  name: string;
  gains: number[]; // Array of 10 frequency band gains (-12 to +12 dB)
  isCustom: boolean;
}

export interface SortOptions {
  field: 'folderName' | 'fileName' | 'dateAdded' | 'artist' | 'album' | 'title';
  direction: 'asc' | 'desc';
}