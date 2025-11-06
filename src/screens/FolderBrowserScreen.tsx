import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackScreenProps, StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import { RootStackParamList, AudioTrack, SortOptions } from '../types/navigation';
import { createRealAudioTrackFromFile } from '../utils/mockAudio';
import { useMusicLibrary } from '../contexts/MusicLibraryContext';
import { createAudioTrackWithMetadata } from '../utils/metadataExtractor';
import { createEnhancedAudioTrack } from '../utils/enhancedMetadata';
import { createAudioTrackWithComprehensiveMetadata } from '../utils/advancedMetadata';

type FolderBrowserScreenProps = StackScreenProps<RootStackParamList, 'FolderBrowser'>;

interface FileItem {
  id: string;
  name: string;
  uri: string;
  type: 'folder' | 'audio';
  size?: number;
  dateAdded?: Date;
}

const SUPPORTED_FORMATS = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'dsf', 'dff', 'ogg'];

const FolderBrowserScreen: React.FC<FolderBrowserScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { path } = route.params || {};
  
  const { addTrack, setCurrentTrack } = useMusicLibrary();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'fileName',
    direction: 'asc',
  });

  useEffect(() => {
    loadFiles();
  }, [path, sortOptions]);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      // Request permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'TuneWell needs media library access to browse your music files.'
        );
        setIsLoading(false);
        return;
      }

      // Get audio files from media library
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: 1000, // Load up to 1000 tracks
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      // Convert media assets to FileItem format
      const audioFiles: FileItem[] = media.assets.map((asset) => ({
        id: asset.id,
        name: asset.filename,
        uri: asset.uri,
        type: 'audio' as const,
        size: asset.duration * 1000, // Approximate size from duration
        dateAdded: new Date(asset.modificationTime || asset.creationTime), // Use modification time as "added" time
      }));

      const sortedFiles = sortFiles(audioFiles);
      setFiles(sortedFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      Alert.alert('Error', 'Could not load audio files from media library');
    } finally {
      setIsLoading(false);
    }
  };

  const sortFiles = (fileList: FileItem[]): FileItem[] => {
    return [...fileList].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'fileName':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'dateAdded':
          aValue = a.dateAdded?.getTime() || 0;
          bValue = b.dateAdded?.getTime() || 0;
          break;
        case 'folderName':
          // For simplicity, treating folder name same as file name
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOptions.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const handleItemPress = async (file: FileItem) => {
    if (file.type === 'folder') {
      // Navigate to folder contents
      navigation.navigate('FolderBrowser', { path: file.uri });
    } else if (file.type === 'audio') {
      try {
        console.log('🎵 Creating track with comprehensive metadata extraction...');
        
        // Use comprehensive metadata extraction for better results
        const audioTrack = await createAudioTrackWithComprehensiveMetadata(
          file.uri, 
          file.name, 
          file.size
        );
        
        console.log('✅ Created track:', audioTrack);
        
        // Add to library and set as current
        await addTrack(audioTrack);
        setCurrentTrack(audioTrack);

        navigation.navigate('Player', { track: audioTrack });
      } catch (error) {
        console.error('❌ Error creating audio track:', error);
        Alert.alert('Error', 'Failed to load audio file metadata');
      }
    }
  };

  const handlePickFiles = async () => {
    try {
      setIsLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      // Process selected files with comprehensive metadata extraction
      const newFiles: FileItem[] = await Promise.all(
        result.assets.map(async (asset, index) => {
          try {
            console.log(`🔍 Processing file: ${asset.name}`);
            
            // Use comprehensive metadata extraction for each file
            const audioTrack = await createAudioTrackWithComprehensiveMetadata(
              asset.uri, 
              asset.name, 
              asset.size
            );
            
            console.log(`✅ Extracted metadata: ${audioTrack.artist} - ${audioTrack.title}`);
            
            // Add to library immediately
            await addTrack(audioTrack);
            
            return {
              id: `picked_${index}`,
              name: asset.name,
              uri: asset.uri,
              type: 'audio' as const,
              size: asset.size,
              dateAdded: new Date(),
            };
          } catch (error) {
            console.warn(`❌ Failed to process ${asset.name}:`, error);
            // Still add the file even if metadata extraction fails
            return {
              id: `picked_${index}`,
              name: asset.name,
              uri: asset.uri,
              type: 'audio' as const,
              size: asset.size,
              dateAdded: new Date(),
            };
          }
        })
      );

      setFiles(prev => [...prev, ...newFiles]);
      
      if (newFiles.length > 0) {
        Alert.alert(
          'Success', 
          `Added ${newFiles.length} audio file${newFiles.length > 1 ? 's' : ''} to your library`
        );
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Could not access files');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSortDirection = () => {
    setSortOptions(prev => ({
      ...prev,
      direction: prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const changeSortField = (field: SortOptions['field']) => {
    setSortOptions(prev => ({
      field,
      direction: 'asc',
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderFileItem = ({ item }: { item: FileItem }) => {
    const isSupported = item.type === 'audio' && 
      SUPPORTED_FORMATS.includes(item.name.split('.').pop()?.toLowerCase() || '');
    
    return (
      <TouchableOpacity
        style={[
          styles.fileItem,
          !isSupported && item.type === 'audio' && styles.unsupportedFile,
        ]}
        onPress={() => handleItemPress(item)}
        disabled={item.type === 'audio' && !isSupported}
      >
        <View style={styles.fileIcon}>
          <Ionicons
            name={
              item.type === 'folder' 
                ? 'folder' 
                : item.name.includes('.flac') || item.name.includes('.dsf')
                  ? 'diamond'
                  : 'musical-note'
            }
            size={24}
            color={
              item.type === 'folder' 
                ? '#FFD60A' 
                : isSupported 
                  ? '#007AFF' 
                  : '#666666'
            }
          />
        </View>
        
        <View style={styles.fileInfo}>
          <Text style={[
            styles.fileName,
            !isSupported && item.type === 'audio' && styles.unsupportedText,
          ]} numberOfLines={1}>
            {item.name}
          </Text>
          
          {item.type === 'audio' && (
            <View style={styles.fileDetails}>
              {item.size && (
                <Text style={styles.fileSize}>
                  {formatFileSize(item.size)}
                </Text>
              )}
              <Text style={styles.fileFormat}>
                {item.name.split('.').pop()?.toUpperCase()}
              </Text>
              {item.name.includes('.flac') && (
                <Text style={styles.qualityBadge}>Lossless</Text>
              )}
              {item.name.includes('.dsf') && (
                <Text style={styles.qualityBadge}>DSD</Text>
              )}
            </View>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#666666"
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.sortControls}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => changeSortField('fileName')}
          >
            <Text style={[
              styles.sortButtonText,
              sortOptions.field === 'fileName' && styles.activeSortButton,
            ]}>
              Name
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => changeSortField('dateAdded')}
          >
            <Text style={[
              styles.sortButtonText,
              sortOptions.field === 'dateAdded' && styles.activeSortButton,
            ]}>
              Date
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.sortDirectionButton}
            onPress={toggleSortDirection}
          >
            <Ionicons
              name={sortOptions.direction === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={16}
              color="#007AFF"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.pickFilesButton}
          onPress={handlePickFiles}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.pickFilesText}>Pick Files</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading files...</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.id}
          style={styles.fileList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#cccccc',
  },
  activeSortButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sortDirectionButton: {
    padding: 8,
  },
  pickFilesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pickFilesText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#cccccc',
    marginTop: 10,
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  unsupportedFile: {
    opacity: 0.5,
  },
  fileIcon: {
    width: 40,
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  unsupportedText: {
    color: '#666666',
  },
  fileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileSize: {
    fontSize: 12,
    color: '#888888',
    marginRight: 8,
  },
  fileFormat: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 8,
  },
  qualityBadge: {
    fontSize: 10,
    color: '#FFD60A',
    backgroundColor: '#333333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
});

export default FolderBrowserScreen;