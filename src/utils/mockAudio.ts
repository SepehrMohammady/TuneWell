// Mock audio track generator for testing purposes
import { AudioTrack } from '../types/navigation';

export const generateMockAudioTrack = (overrides: Partial<AudioTrack> = {}): AudioTrack => {
  const baseTrack: AudioTrack = {
    id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Track',
    artist: 'Test Artist',
    album: 'Test Album',
    duration: 240000, // 4 minutes
    uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Sample audio URL
    format: 'wav',
    bitrate: 1411200,
    sampleRate: 44100,
    bitDepth: 16,
    filePath: '/mock/test-track.wav',
    fileSize: 42000000, // ~42MB
    dateAdded: new Date().toISOString(),
    playCount: 0,
    isFavorite: false,
    albumArt: undefined,
    ...overrides,
  };

  return baseTrack;
};

export const getMockPlaylist = (): AudioTrack[] => [
  generateMockAudioTrack({
    id: '1',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: 354000,
    format: 'flac',
    playCount: 25,
    isFavorite: true,
  }),
  generateMockAudioTrack({
    id: '2',
    title: 'Stairway to Heaven',
    artist: 'Led Zeppelin', 
    album: 'Led Zeppelin IV',
    duration: 482000,
    format: 'flac',
    bitrate: 1411200,
    playCount: 18,
    isFavorite: true,
  }),
  generateMockAudioTrack({
    id: '3',
    title: 'Hotel California',
    artist: 'Eagles',
    album: 'Hotel California',
    duration: 391000,
    format: 'mp3',
    bitrate: 320000,
    playCount: 12,
    isFavorite: false,
  }),
  generateMockAudioTrack({
    id: '4',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    album: 'Thriller',
    duration: 294000,
    format: 'wav',
    playCount: 8,
    isFavorite: false,
    dateAdded: new Date(Date.now() - 86400000).toISOString(), // Yesterday
  }),
  generateMockAudioTrack({
    id: '5',
    title: 'Imagine',
    artist: 'John Lennon',
    album: 'Imagine',
    duration: 183000,
    format: 'flac',
    playCount: 15,
    isFavorite: true,
  }),
];

export const createRealAudioTrackFromFile = (
  name: string, 
  uri: string, 
  size?: number
): AudioTrack => {
  const fileName = name.replace(/\.[^/.]+$/, '');
  const format = name.split('.').pop()?.toLowerCase() || 'unknown';
  
  // Enhanced filename parsing
  let title = 'Unknown Title';
  let artist = 'Unknown Artist';
  let album = 'Unknown Album';
  
  // Try to parse common patterns
  if (fileName.includes(' - ')) {
    const parts = fileName.split(' - ');
    if (parts.length >= 2) {
      artist = parts[0].trim();
      title = parts[1].trim();
    }
    if (parts.length >= 3) {
      // Format: Artist - Album - Title
      album = parts[1].trim();
      title = parts[2].trim();
    }
  } else {
    title = fileName || 'Unknown Title';
  }
  
  return {
    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    artist,
    album,
    duration: 0, // Will be determined when loaded
    uri,
    format,
    bitrate: format === 'flac' ? 1411200 : format === 'mp3' ? 320000 : undefined,
    sampleRate: 44100,
    bitDepth: format === 'flac' ? 16 : undefined,
    filePath: uri,
    fileSize: size || 0,
    dateAdded: new Date().toISOString(),
    playCount: 0,
    isFavorite: false,
    albumArt: undefined,
  };
};