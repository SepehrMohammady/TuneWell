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
  dateAdded: Date;
  playCount: number;
  isFavorite: boolean;
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