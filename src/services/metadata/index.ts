export {
  isSupportedAudioFile,
  parseAudioMetadata,
  createTrackFromMetadata,
  formatDuration,
  formatSampleRate,
  formatBitDepth,
  formatBitRate,
  getQualityLabel,
  scannedTrackToTrack,
} from './MetadataService';

export type { AudioMetadata } from './MetadataService';
