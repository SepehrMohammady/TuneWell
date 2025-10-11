import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useMockAudioPlayer } from '../utils/mockAudioPlayer';
import { RootStackParamList, AudioTrack } from '../types/navigation';

type PlayerScreenProps = StackScreenProps<RootStackParamList, 'Player'>;

const PlayerScreen: React.FC<PlayerScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { track, playlist } = route.params || {};
  
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(track || null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use mock audio player for Expo Go compatibility
  // For development builds, replace this with: useAudioPlayer from 'expo-audio'
  const player = useMockAudioPlayer(currentTrack?.uri || '');

  useEffect(() => {
    if (currentTrack?.uri) {
      loadAudio();
    }
  }, [currentTrack]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      if (currentTrack?.uri) {
        // The player will handle loading automatically with the new API
        console.log('Loading audio:', currentTrack.uri);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      Alert.alert('Error', 'Could not load audio file');
      setIsLoading(false);
    }
  };

  const togglePlayback = async () => {
    try {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const seekTo = async (value: number) => {
    try {
      player.seekTo(value / 1000); // Convert to seconds
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleFavorite = () => {
    // TODO: Implement favorite toggle functionality
    Alert.alert('Feature Coming Soon', 'Favorite functionality will be implemented soon.');
  };

  if (!currentTrack) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes-outline" size={64} color="#666666" />
          <Text style={styles.emptyStateText}>No track selected</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('FolderBrowser', {})}
          >
            <Text style={styles.browseButtonText}>Browse Music</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.artworkContainer}>
        <View style={styles.artwork}>
          <Ionicons name="musical-notes" size={80} color="#007AFF" />
        </View>
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.title} numberOfLines={2}>
          {currentTrack.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack.artist}
        </Text>
        <Text style={styles.album} numberOfLines={1}>
          {currentTrack.album}
        </Text>
        <View style={styles.formatInfo}>
          <Text style={styles.format}>
            {currentTrack.format.toUpperCase()}
          </Text>
          {currentTrack.bitrate && (
            <Text style={styles.bitrate}>
              {Math.round(currentTrack.bitrate / 1000)}kbps
            </Text>
          )}
          {currentTrack.sampleRate && (
            <Text style={styles.sampleRate}>
              {currentTrack.sampleRate / 1000}kHz
            </Text>
          )}
        </View>
      </View>

      <View style={styles.progressContainer}>
        <Slider
          style={styles.progressSlider}
          minimumValue={0}
          maximumValue={(player.duration || 0) * 1000}
          value={(player.currentTime || 0) * 1000}
          onSlidingComplete={seekTo}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#333333"

        />
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{formatTime((player.currentTime || 0) * 1000)}</Text>
          <Text style={styles.time}>{formatTime((player.duration || 0) * 1000)}</Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={toggleFavorite}
        >
          <Ionicons 
            name={currentTrack.isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={currentTrack.isFavorite ? "#FF3B30" : "#ffffff"} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {/* TODO: Previous track */}}
        >
          <Ionicons name="play-skip-back" size={32} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.playButton]}
          onPress={togglePlayback}
          disabled={isLoading}
        >
          <Ionicons 
            name={player.playing ? "pause" : "play"} 
            size={40} 
            color="#ffffff" 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {/* TODO: Next track */}}
        >
          <Ionicons name="play-skip-forward" size={32} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => navigation.navigate('Equalizer')}
        >
          <Ionicons name="options-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 20,
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  artworkContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  artwork: {
    width: 280,
    height: 280,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  trackInfo: {
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  artist: {
    fontSize: 18,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 4,
  },
  album: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 12,
  },
  formatInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  format: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 12,
  },
  bitrate: {
    fontSize: 12,
    color: '#666666',
    marginRight: 12,
  },
  sampleRate: {
    fontSize: 12,
    color: '#666666',
  },
  progressContainer: {
    paddingHorizontal: 30,
  },
  progressSlider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -10,
  },
  time: {
    fontSize: 14,
    color: '#666666',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    backgroundColor: '#007AFF',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PlayerScreen;