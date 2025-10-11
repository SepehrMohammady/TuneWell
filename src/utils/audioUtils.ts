// Audio utility functions for TuneWell
import { Audio } from 'expo-av';
import { AudioTrack } from '../types/navigation';

export const SUPPORTED_FORMATS = [
  'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'aiff', 'wma'
];

export const EXPERIMENTAL_FORMATS = [
  'dsf', 'dff' // DSD formats - require native audio processing
];

export const LOSSLESS_FORMATS = ['flac', 'wav', 'aiff'];
export const DSD_FORMATS = ['dsf', 'dff']; // DSD formats
export const COMPRESSED_FORMATS = ['mp3', 'aac', 'm4a', 'ogg', 'wma'];

export interface AudioConfiguration {
  sampleRate: number;
  bitDepth?: number;
  channels: number;
  bitrate?: number;
}

export const getAudioConfiguration = async (uri: string): Promise<AudioConfiguration | null> => {
  try {
    // In a real implementation, this would analyze the audio file
    // For now, return mock configuration based on file extension
    const extension = uri.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'flac':
        return {
          sampleRate: 44100,
          bitDepth: 16,
          channels: 2,
          bitrate: 1411200, // ~1411 kbps
        };
      case 'dsf':
        return {
          sampleRate: 2822400, // DSD64
          channels: 2,
        };
      case 'wav':
        return {
          sampleRate: 44100,
          bitDepth: 16,
          channels: 2,
        };
      case 'mp3':
        return {
          sampleRate: 44100,
          channels: 2,
          bitrate: 320000, // 320 kbps
        };
      default:
        return null;
    }
  } catch (error) {
    console.error('Error analyzing audio configuration:', error);
    return null;
  }
};

export const isHighQualityFormat = (format: string): boolean => {
  return LOSSLESS_FORMATS.includes(format.toLowerCase());
};

export const isFormatSupported = (format: string): boolean => {
  const fmt = format.toLowerCase();
  return SUPPORTED_FORMATS.includes(fmt);
};

export const isDSDFormat = (format: string): boolean => {
  return DSD_FORMATS.includes(format.toLowerCase());
};

export const getFormatCompatibilityMessage = (format: string): string | null => {
  const fmt = format.toLowerCase();
  
  if (DSD_FORMATS.includes(fmt)) {
    return `${format.toUpperCase()} format is not supported in Expo Go. Use development build for DSD playback.`;
  }
  
  if (!SUPPORTED_FORMATS.includes(fmt)) {
    return `${format.toUpperCase()} format is not supported.`;
  }
  
  return null;
};

export const formatBitrate = (bitrate?: number): string => {
  if (!bitrate) return 'Unknown';
  
  if (bitrate >= 1000000) {
    return `${(bitrate / 1000000).toFixed(1)}Mbps`;
  } else if (bitrate >= 1000) {
    return `${Math.round(bitrate / 1000)}kbps`;
  } else {
    return `${bitrate}bps`;
  }
};

export const formatSampleRate = (sampleRate?: number): string => {
  if (!sampleRate) return 'Unknown';
  
  if (sampleRate >= 1000000) {
    return `${(sampleRate / 1000000).toFixed(1)}MHz`;
  } else if (sampleRate >= 1000) {
    return `${(sampleRate / 1000).toFixed(1)}kHz`;
  } else {
    return `${sampleRate}Hz`;
  }
};

export const getQualityBadge = (track: AudioTrack): string | null => {
  const format = track.format.toLowerCase();
  
  if (format === 'dsf' || format === 'dff') {
    return 'DSD';
  } else if (format === 'flac') {
    return 'Lossless';
  } else if (track.bitrate && track.bitrate >= 1000000) {
    return 'Hi-Res';
  } else if (track.bitrate && track.bitrate >= 320000) {
    return 'HQ';
  }
  
  return null;
};

export const initializeAudio = async (): Promise<boolean> => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    
    return true;
  } catch (error) {
    console.error('Error initializing audio:', error);
    return false;
  }
};

export const calculateDuration = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};