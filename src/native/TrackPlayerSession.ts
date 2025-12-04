/**
 * TrackPlayer Session Module Interface
 * 
 * Provides access to the audio session ID used by react-native-track-player's ExoPlayer.
 * This allows EQ effects to be attached to the actual audio output.
 */

import { NativeModules, Platform } from 'react-native';

interface SessionResult {
  sessionId: number;
  source: 'exoplayer' | 'global_output' | 'generated';
  isMusicActive?: boolean;
  note?: string;
}

interface TrackPlayerSessionModuleType {
  getAudioSessionId(): Promise<SessionResult>;
  getGeneratedSessionId(): Promise<SessionResult>;
}

const { TrackPlayerSessionModule } = NativeModules;

// Type-safe wrapper
const TrackPlayerSession: TrackPlayerSessionModuleType | null = 
  Platform.OS === 'android' ? TrackPlayerSessionModule : null;

/**
 * Get the audio session ID from TrackPlayer's ExoPlayer.
 * Falls back to global output (session 0) if not available.
 */
export async function getPlayerAudioSessionId(): Promise<number> {
  if (!TrackPlayerSession) {
    console.warn('[TrackPlayerSession] Not available on this platform');
    return 0;
  }
  
  try {
    const result = await TrackPlayerSession.getAudioSessionId();
    console.log('[TrackPlayerSession] Got session:', result);
    return result.sessionId;
  } catch (error) {
    console.error('[TrackPlayerSession] Failed to get session:', error);
    return 0; // Fallback to global output
  }
}

/**
 * Get a generated audio session ID (may not match ExoPlayer's session)
 */
export async function getGeneratedAudioSessionId(): Promise<number> {
  if (!TrackPlayerSession) {
    return 0;
  }
  
  try {
    const result = await TrackPlayerSession.getGeneratedSessionId();
    return result.sessionId;
  } catch (error) {
    console.error('[TrackPlayerSession] Failed to generate session:', error);
    return 0;
  }
}

export default TrackPlayerSession;
