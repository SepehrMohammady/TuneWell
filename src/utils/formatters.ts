/**
 * TuneWell Formatting Utilities
 * Helper functions for formatting display data
 */

/**
 * Format duration from seconds to MM:SS or HH:MM:SS
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format duration to long form (1h 23m 45s)
 */
export const formatDurationLong = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0s';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
};

/**
 * Get quality label based on audio specs
 */
export const getQualityLabel = (
  bitDepth: number,
  sampleRate: number,
  format: string
): string => {
  const formatLower = format.toLowerCase();
  
  // DSD formats
  if (formatLower === 'dff' || formatLower === 'dsf' || formatLower === 'dsd') {
    if (sampleRate >= 11289600) return 'DSD256';
    if (sampleRate >= 5644800) return 'DSD128';
    if (sampleRate >= 2822400) return 'DSD64';
    return 'DSD';
  }
  
  // Hi-Res Audio (24-bit or > 48kHz)
  if (bitDepth >= 24 || sampleRate > 48000) {
    if (sampleRate >= 192000) return 'Hi-Res 192';
    if (sampleRate >= 96000) return 'Hi-Res 96';
    if (bitDepth >= 24) return 'Hi-Res 24';
    return 'Hi-Res';
  }
  
  // Lossless formats
  const losslessFormats = ['flac', 'alac', 'wav', 'aiff', 'ape', 'wv'];
  if (losslessFormats.includes(formatLower)) {
    return 'Lossless';
  }
  
  // Standard quality
  return '';
};

/**
 * Format sample rate for display
 */
export const formatSampleRate = (sampleRate: number): string => {
  if (!sampleRate) return '';
  
  if (sampleRate >= 1000000) {
    // DSD rates
    return `${(sampleRate / 1000000).toFixed(2)} MHz`;
  }
  
  if (sampleRate >= 1000) {
    return `${(sampleRate / 1000).toFixed(1)} kHz`;
  }
  
  return `${sampleRate} Hz`;
};

/**
 * Format bit depth for display
 */
export const formatBitDepth = (bitDepth: number): string => {
  if (!bitDepth) return '';
  return `${bitDepth}-bit`;
};

/**
 * Format file size in human readable form
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes || isNaN(bytes)) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
};

/**
 * Format bitrate for display
 */
export const formatBitrate = (bitrate: number): string => {
  if (!bitrate) return '';
  
  if (bitrate >= 1000) {
    return `${Math.round(bitrate / 1000)} kbps`;
  }
  
  return `${bitrate} bps`;
};

/**
 * Format date to relative time (e.g., "2 days ago")
 */
export const formatRelativeTime = (date: Date | string | number): string => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
};

/**
 * Format date to short format (e.g., "Jan 15, 2024")
 */
export const formatDate = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format track count with proper pluralization
 */
export const formatTrackCount = (count: number): string => {
  if (count === 1) return '1 track';
  return `${count} tracks`;
};

/**
 * Format album count with proper pluralization
 */
export const formatAlbumCount = (count: number): string => {
  if (count === 1) return '1 album';
  return `${count} albums`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
};

/**
 * Format EQ gain value for display
 */
export const formatEQGain = (gain: number): string => {
  const rounded = Math.round(gain * 10) / 10;
  if (rounded > 0) return `+${rounded} dB`;
  if (rounded < 0) return `${rounded} dB`;
  return '0 dB';
};

/**
 * Format frequency for EQ display
 */
export const formatFrequency = (frequency: number): string => {
  if (frequency >= 1000) {
    return `${(frequency / 1000).toFixed(0)}k`;
  }
  return `${frequency}`;
};

/**
 * Format play count with abbreviation for large numbers
 */
export const formatPlayCount = (count: number): string => {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
};
