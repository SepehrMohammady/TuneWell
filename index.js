import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { playbackService } from './src/services/AudioService';

// Register the playback service
TrackPlayer.registerPlaybackService(() => playbackService);

// Register the main component
registerRootComponent(App);
