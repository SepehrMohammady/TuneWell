import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import { RootStackParamList, AudioTrack } from '../types/navigation';
import { APP_VERSION } from '../version';
import { useMusicLibrary } from '../contexts/MusicLibraryContext';
import { useEQ } from '../contexts/EQContext';
import { runAllMetadataTests } from '../utils/testMetadata';
import { testComprehensiveExtraction } from '../utils/advancedMetadata';
import { testJacobsNoteMetadata, testCollaborationFormats } from '../utils/testJacobsNote';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { library, getRecentlyAdded, getMostPlayed, getFavorites } = useMusicLibrary();
  const { eqState } = useEQ();
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  useEffect(() => {
    requestAudioPermissions();
  }, []);

  const handleTestMetadata = () => {
    try {
      console.log('🧪 Starting comprehensive metadata extraction test...');
      
      // Test Jacob's Note specifically (matches your MX Player screenshot)
      console.log('\n🎵 TESTING YOUR EXACT FILE: Jacob\'s Note 🎵');
      const jacobsResult = testJacobsNoteMetadata();
      
      // Test collaboration formats
      testCollaborationFormats();
      
      // Test the comprehensive system
      testComprehensiveExtraction();
      
      // Also run the original tests
      const results = runAllMetadataTests();
      
      Alert.alert(
        'Metadata Test Complete',
        `✅ Tested "Jacob's Note" metadata extraction specifically!\n\nResult: "${jacobsResult.artist}" - "${jacobsResult.title}"\n\nCheck console for detailed comparison with MX Player results.`,
        [{ text: 'Perfect!', style: 'default' }]
      );
    } catch (error) {
      console.error('❌ Metadata test error:', error);
      Alert.alert('Error', 'Failed to run metadata tests');
    }
  };

  const requestAudioPermissions = async () => {
    try {
      const audioPermission = await Audio.requestPermissionsAsync();
      if (!audioPermission.granted) {
        Alert.alert(
          'Permission Required',
          'TuneWell needs audio permissions to play music files.'
        );
      }

      if (permissionResponse?.status !== 'granted') {
        const mediaPermission = await requestPermission();
        if (!mediaPermission.granted) {
          Alert.alert(
            'Permission Required',
            'TuneWell needs media library access to browse your music collection.'
          );
        }
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const menuItems = [
    {
      title: 'Browse Folders',
      subtitle: 'Explore your music collection',
      icon: 'folder-outline' as const,
      onPress: () => navigation.navigate('FolderBrowser', {}),
    },
    {
      title: 'Favorites',
      subtitle: 'Your liked tracks',
      icon: 'heart-outline' as const,
      onPress: () => navigation.navigate('Playlist', { type: 'favorites' }),
    },
    {
      title: 'Most Played',
      subtitle: 'Frequently played songs',
      icon: 'trending-up-outline' as const,
      onPress: () => navigation.navigate('Playlist', { type: 'mostPlayed' }),
    },
    {
      title: 'Recently Added',
      subtitle: 'Latest additions to your library',
      icon: 'time-outline' as const,
      onPress: () => navigation.navigate('Playlist', { type: 'recentlyAdded' }),
    },
    {
      title: 'Equalizer',
      subtitle: 'Audio enhancement settings',
      icon: 'options-outline' as const,
      onPress: () => navigation.navigate('Equalizer'),
    },
    {
      title: 'Playlists',
      subtitle: 'Manage your custom playlists',
      icon: 'list-outline' as const,
      onPress: () => navigation.navigate('Playlist', { type: 'custom' }),
    },
    {
      title: 'Test Metadata',
      subtitle: 'Verify metadata extraction',
      icon: 'code-slash-outline' as const,
      onPress: handleTestMetadata,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="musical-notes" size={32} color="#007AFF" />
            <Text style={styles.logoText}>TuneWell</Text>
          </View>
          <Text style={styles.version}>v{APP_VERSION.full}</Text>
          <Text style={styles.subtitle}>Professional Audio Experience</Text>
        </View>

        {/* Now Playing Section */}
        {library.currentTrack && (
          <TouchableOpacity
            style={styles.nowPlayingContainer}
            onPress={() => navigation.navigate('Player', { track: library.currentTrack! })}
          >
            <View style={styles.nowPlayingInfo}>
              <View style={styles.nowPlayingText}>
                <Text style={styles.nowPlayingTitle} numberOfLines={1}>
                  {library.currentTrack.title}
                </Text>
                <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                  {library.currentTrack.artist}
                </Text>
              </View>
              <View style={styles.nowPlayingControls}>
                <Ionicons 
                  name={library.isPlaying ? 'pause' : 'play'} 
                  size={24} 
                  color="#4CAF50" 
                />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Library Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{library.tracks.length}</Text>
            <Text style={styles.statLabel}>Total Tracks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getFavorites().length}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getRecentlyAdded().length}</Text>
            <Text style={styles.statLabel}>Recently Added</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{eqState.isEnabled ? 'ON' : 'OFF'}</Text>
            <Text style={styles.statLabel}>Equalizer</Text>
          </View>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <Ionicons name={item.icon} size={28} color="#007AFF" />
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Designed for audiophiles and sound engineers
          </Text>
          <Text style={styles.footerSubtext}>
            Supports FLAC, DSF, WAV, and other professional formats
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 10,
  },
  version: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
  },
  nowPlayingContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 15,
  },
  nowPlayingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nowPlayingText: {
    flex: 1,
    marginRight: 15,
  },
  nowPlayingTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  nowPlayingArtist: {
    color: '#cccccc',
    fontSize: 14,
  },
  nowPlayingControls: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  menuGrid: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  menuItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  menuItemContent: {
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 10,
    marginBottom: 5,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#444444',
    textAlign: 'center',
  },
});

export default HomeScreen;