/**
 * Playlists Screen - Manage playlists
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function PlaylistsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Playlists</Text>
        <TouchableOpacity style={styles.createButton}>
          <Icon name="plus" size={24} color="#1DB954" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Playlists</Text>
          
          <TouchableOpacity style={styles.playlistCard}>
            <Icon name="heart" size={24} color="#FF4444" />
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName}>Favorites</Text>
              <Text style={styles.playlistCount}>0 tracks</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playlistCard}>
            <Icon name="fire" size={24} color="#FF8800" />
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName}>Most Played</Text>
              <Text style={styles.playlistCount}>0 tracks</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playlistCard}>
            <Icon name="clock-outline" size={24} color="#4488FF" />
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName}>Recently Added</Text>
              <Text style={styles.playlistCount}>0 tracks</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Playlists</Text>
          
          <TouchableOpacity style={styles.playlistCard}>
            <Icon name="emoticon-sad-outline" size={24} color="#6666FF" />
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName}>Sad</Text>
              <Text style={styles.playlistCount}>0 tracks</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playlistCard}>
            <Icon name="lightning-bolt" size={24} color="#FFDD00" />
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName}>Energetic</Text>
              <Text style={styles.playlistCount}>0 tracks</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playlistCard}>
            <Icon name="spa" size={24} color="#44DD88" />
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName}>Relaxation</Text>
              <Text style={styles.playlistCount}>0 tracks</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Playlists</Text>
          
          <View style={styles.emptyPlaylists}>
            <Icon name="playlist-music-outline" size={48} color="#333333" />
            <Text style={styles.emptyText}>No custom playlists</Text>
            <Text style={styles.emptySubtext}>Tap + to create one</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  playlistInfo: {
    marginLeft: 16,
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  playlistCount: {
    fontSize: 13,
    color: '#999999',
    marginTop: 4,
  },
  emptyPlaylists: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#444444',
    marginTop: 4,
  },
});
