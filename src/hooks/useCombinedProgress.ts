/**
 * TuneWell Combined Progress Hook
 * 
 * Provides progress information from either TrackPlayer or native decoder
 * depending on the current playback source (DSD/WAV vs other formats).
 */

import { useMemo } from 'react';
import { useProgress } from 'react-native-track-player';
import { usePlayerStore } from '../store';

// Formats that use the native decoder
const NATIVE_DECODER_FORMATS = ['dsf', 'dff', 'dsd', 'wav', 'wave'];

/**
 * Check if a format uses the native decoder
 */
function usesNativeDecoder(format: string | undefined): boolean {
  if (!format) return false;
  const formatLower = format.toLowerCase().replace('.', '');
  return NATIVE_DECODER_FORMATS.includes(formatLower);
}

/**
 * Combined progress hook that returns progress from the appropriate source
 * - For DSD/WAV: Uses progress from PlayerStore (updated by native decoder)
 * - For other formats: Uses TrackPlayer's useProgress hook
 */
export function useCombinedProgress() {
  const trackPlayerProgress = useProgress();
  const { currentTrack, progress: storeProgress } = usePlayerStore();
  
  const isNativeDecoder = useMemo(() => {
    return usesNativeDecoder(currentTrack?.format);
  }, [currentTrack?.format]);

  // Return the appropriate progress based on the playback source
  const progress = useMemo(() => {
    if (isNativeDecoder) {
      // Use progress from store (set by native decoder events)
      return {
        position: storeProgress.position,
        duration: storeProgress.duration,
        buffered: storeProgress.buffered,
      };
    }
    
    // Use TrackPlayer progress for regular formats
    return {
      position: trackPlayerProgress.position,
      duration: trackPlayerProgress.duration,
      buffered: trackPlayerProgress.buffered,
    };
  }, [
    isNativeDecoder,
    storeProgress.position,
    storeProgress.duration,
    storeProgress.buffered,
    trackPlayerProgress.position,
    trackPlayerProgress.duration,
    trackPlayerProgress.buffered,
  ]);

  return {
    ...progress,
    isNativeDecoder,
  };
}

export default useCombinedProgress;
