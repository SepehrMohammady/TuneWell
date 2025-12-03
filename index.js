/**
 * TuneWell - Professional Audiophile Music Player
 * @format
 */

import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './src/App';
import { name as appName } from './app.json';
import { PlaybackService } from './src/services/audio/TrackPlayerService';

// Register the main application component
AppRegistry.registerComponent(appName, () => App);

// Register the background playback service
TrackPlayer.registerPlaybackService(() => PlaybackService);
