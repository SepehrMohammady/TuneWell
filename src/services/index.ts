/**
 * TuneWell Services Export
 */

// Active services used in the app
export { audioService, PlaybackService, setupTrackPlayer } from './audio';
export * from './metadata';

// Note: libraryScannerService is available but not currently used
// The app uses libraryScanner.ts directly via libraryStore
// The scanner service is kept for potential future modular architecture
