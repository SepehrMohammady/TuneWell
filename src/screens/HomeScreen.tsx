import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { RootStackParamList, AudioTrack } from '../types/navigation';
import { APP_VERSION } from '../version';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [recentTracks, setRecentTracks] = useState<AudioTrack[]>([]);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  useEffect(() => {
    requestAudioPermissions();
  }, []);

  const requestAudioPermissions = async () => {
    try {
      // Note: expo-audio handles audio permissions automatically when playing
      console.log('Audio permissions will be requested automatically when playing audio');

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
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="musical-notes" size={32} color="#007AFF" />
          <Text style={styles.logoText}>TuneWell</Text>
        </View>
        <Text style={styles.version}>v{APP_VERSION.full}</Text>
        <Text style={styles.subtitle}>Professional Audio Experience</Text>
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