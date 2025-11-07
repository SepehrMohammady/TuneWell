/**
 * Library Screen - Main music library view
 */

import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function LibraryScreen() {
  const [sortBy, setSortBy] = useState('title');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <TouchableOpacity style={styles.scanButton}>
          <Icon name="folder-music" size={24} color="#1DB954" />
          <Text style={styles.scanText}>Scan Folders</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity style={styles.sortOption}>
          <Text style={styles.sortText}>Title</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortOption}>
          <Text style={styles.sortText}>Artist</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortOption}>
          <Text style={styles.sortText}>Date Added</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.emptyContainer}>
        <Icon name="music-box-multiple-outline" size={80} color="#333333" />
        <Text style={styles.emptyText}>No music in library</Text>
        <Text style={styles.emptySubtext}>
          Tap "Scan Folders" to add music files
        </Text>
      </View>
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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanText: {
    color: '#1DB954',
    marginLeft: 8,
    fontWeight: '600',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sortLabel: {
    color: '#999999',
    fontSize: 14,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
  },
  sortText: {
    color: '#ffffff',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444444',
    marginTop: 8,
  },
});
