import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackScreenProps, StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, AudioTrack, Playlist } from '../types/navigation';
import { useMusicLibrary } from '../contexts/MusicLibraryContext';
import { getMockPlaylist } from '../utils/mockAudio';
import { createEnhancedDemoTracks } from '../utils/enhancedMetadata';

type PlaylistScreenProps = StackScreenProps<RootStackParamList, 'Playlist'>;

const PlaylistScreen: React.FC<PlaylistScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { type, playlistId } = route.params || {};
  
  const { library, getFavorites, getMostPlayed, getRecentlyAdded } = useMusicLibrary();
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    loadContent();
  }, [type, playlistId]);

  const loadContent = async () => {
    setIsLoading(true);
    
    try {
      if (type === 'custom' && !playlistId) {
        // Load all custom playlists
        const mockPlaylists: Playlist[] = [
          {
            id: '1',
            name: 'My Favorites',
            description: 'Personal favorite tracks',
            tracks: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            type: 'custom',
          },
          {
            id: '2',
            name: 'High Quality Audio',
            description: 'FLAC and DSD tracks only',
            tracks: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            type: 'custom',
          },
        ];
        setPlaylists(mockPlaylists);
      } else {
        // Load tracks for specific playlist type
        let playlistTracks: AudioTrack[] = [];
        
        if (library.tracks.length > 0) {
          // Use real library data
          switch (type) {
            case 'favorites':
              playlistTracks = getFavorites();
              break;
            case 'mostPlayed':
              playlistTracks = getMostPlayed();
              break;
            case 'recentlyAdded':
              playlistTracks = getRecentlyAdded();
              break;
            default:
              playlistTracks = library.tracks;
          }
        } else {
          // Use enhanced demo data with realistic metadata
          playlistTracks = createEnhancedDemoTracks();
          if (type === 'favorites') {
            playlistTracks = playlistTracks.filter(track => track.isFavorite);
          } else if (type === 'mostPlayed') {
            playlistTracks = playlistTracks.sort((a, b) => b.playCount - a.playCount);
          }
        }
        
        setTracks(playlistTracks);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      Alert.alert('Error', 'Could not load playlist content');
    } finally {
      setIsLoading(false);
    }
  };

  const getMockTracksForType = (playlistType?: string): AudioTrack[] => {
    const baseTracks: AudioTrack[] = [
      {
        id: '1',
        title: 'Sample FLAC Track',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 240000,
        uri: 'sample1.flac',
        format: 'flac',
        bitrate: 1411200,
        sampleRate: 44100,
        bitDepth: 16,
        filePath: '/music/sample1.flac',
        fileSize: 52428800,
        dateAdded: new Date().toISOString(),
        playCount: 15,
        isFavorite: true,
        albumArt: undefined,
      },
      {
        id: '2',
        title: 'DSD Audio File',
        artist: 'Another Artist',
        album: 'High Res Album',
        duration: 180000,
        uri: 'sample2.dsf',
        format: 'dsf',
        bitrate: 2822400,
        sampleRate: 2822400,
        filePath: '/music/sample2.dsf',
        fileSize: 104857600,
        dateAdded: new Date(Date.now() - 86400000).toISOString(),
        playCount: 8,
        isFavorite: false,
        albumArt: undefined,
      },
    ];

    switch (playlistType) {
      case 'favorites':
        return baseTracks.filter(track => track.isFavorite);
      case 'mostPlayed':
        return baseTracks.sort((a, b) => b.playCount - a.playCount);
      case 'recentlyAdded':
        return baseTracks.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
      default:
        return baseTracks;
    }
  };

  const getPlaylistTitle = (): string => {
    switch (type) {
      case 'favorites':
        return 'Favorite Tracks';
      case 'mostPlayed':
        return 'Most Played';
      case 'recentlyAdded':
        return 'Recently Added';
      case 'custom':
        return 'My Playlists';
      default:
        return 'Playlist';
    }
  };

  const handleTrackPress = (track: AudioTrack) => {
    navigation.navigate('Player', { track, playlist: tracks });
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    navigation.navigate('Playlist', { type: 'custom', playlistId: playlist.id });
  };

  const createNewPlaylist = () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      description: '',
      tracks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      type: 'custom',
    };

    setPlaylists(prev => [...prev, newPlaylist]);
    setNewPlaylistName('');
    setShowCreateModal(false);
  };

  const toggleFavorite = (trackId: string) => {
    setTracks(prev => 
      prev.map(track => 
        track.id === trackId 
          ? { ...track, isFavorite: !track.isFavorite }
          : track
      )
    );
  };

  const formatDuration = (millis: number): string => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderTrackItem = ({ item }: { item: AudioTrack }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => handleTrackPress(item)}
    >
      <View style={styles.trackIcon}>
        <Ionicons
          name={item.format === 'flac' || item.format === 'dsf' ? 'diamond' : 'musical-note'}
          size={20}
          color={item.format === 'flac' || item.format === 'dsf' ? '#FFD60A' : '#007AFF'}
        />
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist} • {item.album}
        </Text>
        <View style={styles.trackDetails}>
          <Text style={styles.trackFormat}>
            {item.format.toUpperCase()}
          </Text>
          {item.bitrate && (
            <Text style={styles.trackBitrate}>
              {Math.round(item.bitrate / 1000)}kbps
            </Text>
          )}
          <Text style={styles.trackDuration}>
            {formatDuration(item.duration)}
          </Text>
          <Text style={styles.trackSize}>
            {formatFileSize(item.fileSize)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={() => toggleFavorite(item.id)}
      >
        <Ionicons
          name={item.isFavorite ? 'heart' : 'heart-outline'}
          size={20}
          color={item.isFavorite ? '#FF3B30' : '#666666'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => handlePlaylistPress(item)}
    >
      <View style={styles.playlistIcon}>
        <Ionicons name="list" size={24} color="#007AFF" />
      </View>

      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.playlistDescription} numberOfLines={1}>
          {item.description || `${item.tracks.length} tracks`}
        </Text>
        <Text style={styles.playlistDate}>
          Created {item.createdAt.toLocaleDateString()}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#666666" />
    </TouchableOpacity>
  );

  // Set navigation title
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: getPlaylistTitle(),
      headerRight: type === 'custom' && !playlistId ? () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      ) : undefined,
    });
  }, [navigation, type, playlistId]);

  const isShowingPlaylists = type === 'custom' && !playlistId;

  return (
    <View style={styles.container}>
      {isShowingPlaylists ? (
        <FlatList
          data={playlists}
          renderItem={renderPlaylistItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderTrackItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Playlist</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor="#666666"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={createNewPlaylist}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  list: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  trackIcon: {
    width: 32,
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 6,
  },
  trackDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackFormat: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 8,
  },
  trackBitrate: {
    fontSize: 11,
    color: '#888888',
    marginRight: 8,
  },
  trackDuration: {
    fontSize: 11,
    color: '#888888',
    marginRight: 8,
  },
  trackSize: {
    fontSize: 11,
    color: '#666666',
  },
  favoriteButton: {
    padding: 8,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  playlistIcon: {
    width: 40,
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistName: {
    fontSize: 17,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 4,
  },
  playlistDate: {
    fontSize: 12,
    color: '#888888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333333',
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlaylistScreen;