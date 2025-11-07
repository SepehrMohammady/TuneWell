/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import TrackPlayer from 'react-native-track-player';
import {playbackService} from './src/services/audio/PlaybackService';

AppRegistry.registerComponent(appName, () => App);

// Register the playback service for background audio
TrackPlayer.registerPlaybackService(() => playbackService);
