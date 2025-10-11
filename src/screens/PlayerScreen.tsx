import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { RootStackParamList, AudioTrack } from '../types/navigation';
import { useMusicLibrary } from '../contexts/MusicLibraryContext';
import { useEQ } from '../contexts/EQContext';
import { isFormatSupported, isDSDFormat, getFormatCompatibilityMessage, calculateDuration } from '../utils/audioUtils';

type PlayerScreenProps = StackScreenProps<RootStackParamList, 'Player'>;

const PlayerScreen: React.FC<PlayerScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { track, playlist } = route.params || {};
  
  const { library, setCurrentTrack, setPlaying, setPosition, incrementPlayCount, toggleFavorite: toggleTrackFavorite, addTrack } = useMusicLibrary();
  const { eqState } = useEQ();
  
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use library state instead of local state
  const currentTrack = library.currentTrack || track;
  const isPlaying = library.isPlaying;
  const position = library.currentPosition;

  useEffect(() => {
    if (currentTrack) {
      loadAudio();
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [currentTrack]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (sound) {
        await sound.unloadAsync();
      }

      if (!currentTrack) return;

      // Check format compatibility
      const compatibilityMessage = getFormatCompatibilityMessage(currentTrack.format);
      if (compatibilityMessage) {
        setError(compatibilityMessage);
        setIsLoading(false);
        Alert.alert('Unsupported Format', compatibilityMessage);
        return;
      }

      // Set current track in library if not already there
      if (!library.tracks.find(t => t.uri === currentTrack.uri)) {
        await addTrack(currentTrack);
      }
      setCurrentTrack(currentTrack);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentTrack.uri },
        { shouldPlay: false },
        updatePlaybackStatus
      );
      
      setSound(newSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not load audio file';
      setError(`Loading failed: ${errorMessage}`);
      Alert.alert('Error', errorMessage);
      setIsLoading(false);
    }
  };

  const updatePlaybackStatus = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setPlaying(status.isPlaying || false);
    }
    if (status.didJustFinish) {
      handleTrackEnd();
    }
  };

  const togglePlayback = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const seekTo = async (value: number) => {
    if (!sound) return;
    try {
      await sound.setPositionAsync(value);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleToggleFavorite = () => {
    if (currentTrack) {
      toggleTrackFavorite(currentTrack.id);
    }
  };

  const handleTrackEnd = async () => {
    if (currentTrack) {
      await incrementPlayCount(currentTrack.id);
    }
    // Auto-play next track if in playlist
    // TODO: Implement next track functionality
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
    <SafeAreaView style={styles.container}>
      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={24} color="#ff4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.artworkContainer}>
        <View style={styles.artwork}>
          {currentTrack.albumArt ? (
            <Image 
              source={{ uri: currentTrack.albumArt }} 
              style={styles.albumArtImage}
              onError={() => console.log('Failed to load album art')}
            />
          ) : (
            <View style={styles.defaultArtwork}>
              <Ionicons name="musical-notes" size={80} color="#007AFF" />
              <Text style={styles.noArtworkText}>No Album Art</Text>
            </View>
          )}
        </View>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.title} numberOfLines={2}>
          {currentTrack.title || 'Unknown Title'}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack.artist || 'Unknown Artist'}
        </Text>
        <Text style={styles.album} numberOfLines={1}>
          {currentTrack.album || 'Unknown Album'}
        </Text>
        <View style={styles.formatInfo}>
          <Text style={styles.format}>
            {(currentTrack.format || 'unknown').toUpperCase()}
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
          maximumValue={duration}
          value={position}
          onSlidingComplete={seekTo}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#333333"

        />
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{formatTime(position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleToggleFavorite}
        >
          <Ionicons 
            name={currentTrack.isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={currentTrack.isFavorite ? "#FF3B30" : "#ffffff"} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => Alert.alert('Previous Track', 'Previous track functionality will be available with playlist support')}
        >
          <Ionicons name="play-skip-back" size={32} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.playButton]}
          onPress={togglePlayback}
          disabled={isLoading || !sound}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={40} 
            color="#ffffff" 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => Alert.alert('Next Track', 'Next track functionality will be available with playlist support')}
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
    </SafeAreaView>
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
  errorContainer: {
    backgroundColor: '#330000',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  albumArtImage: {
    width: 280,
    height: 280,
    borderRadius: 12,
  },
  defaultArtwork: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noArtworkText: {
    color: '#666666',
    fontSize: 12,
    marginTop: 8,
  },
});

export default PlayerScreen;