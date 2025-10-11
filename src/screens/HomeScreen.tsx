import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import { AudioTrack } from '../types/navigation';
import { APP_VERSION } from '../version';
import { useMusicLibrary } from '../contexts/MusicLibraryContext';
import { useEQ } from '../contexts/EQContext';

const HomeScreen: React.FC = () => {
  const { library, getRecentlyAdded, getMostPlayed, getFavorites } = useMusicLibrary();
  const { eqState } = useEQ();
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  useEffect(() => {
    requestAudioPermissions();
  }, []);

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

  const renderRecentTrack = ({ item }: { item: AudioTrack }) => (
    <TouchableOpacity style={styles.trackItem}>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <Ionicons name="play-outline" size={20} color="#007AFF" />
    </TouchableOpacity>
  );

  const recentTracks = getRecentlyAdded().slice(0, 5);
  const favoriteTracks = getFavorites().slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome to TuneWell</Text>
          <Text style={styles.versionText}>v{APP_VERSION.full}</Text>
          <Text style={styles.subtitleText}>Professional Audio Experience</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="musical-notes" size={24} color="#007AFF" />
            <Text style={styles.statNumber}>{library.tracks.length}</Text>
            <Text style={styles.statLabel}>Total Tracks</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="heart" size={24} color="#FF3B30" />
            <Text style={styles.statNumber}>{getFavorites().length}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="options" size={24} color="#34C759" />
            <Text style={styles.statNumber}>{eqState.isEnabled ? 'ON' : 'OFF'}</Text>
            <Text style={styles.statLabel}>Equalizer</Text>
          </View>
        </View>

        {/* Recently Added Section */}
        {recentTracks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Added</Text>
              <Ionicons name="time-outline" size={20} color="#8E8E93" />
            </View>
            <FlatList
              data={recentTracks}
              renderItem={renderRecentTrack}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Favorites Section */}
        {favoriteTracks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Favorites</Text>
              <Ionicons name="heart-outline" size={20} color="#8E8E93" />
            </View>
            <FlatList
              data={favoriteTracks}
              renderItem={renderRecentTrack}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Getting Started Section */}
        {library.tracks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No Music Yet</Text>
            <Text style={styles.emptySubtitle}>
              Use the Browse tab to add your first tracks
            </Text>
          </View>
        )}

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
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  subtitleText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    minWidth: 90,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#6D6D70',
    textAlign: 'center',
  },
});

export default HomeScreen;