/**
 * Folder Browser Screen - Browse and select folders
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function FolderBrowserScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Select a folder to scan</Text>
        <TouchableOpacity style={styles.addButton}>
          <Icon name="folder-plus" size={24} color="#1DB954" />
          <Text style={styles.addText}>Add Folder</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.emptyContainer}>
        <Icon name="folder-music-outline" size={80} color="#333333" />
        <Text style={styles.emptyText}>No folders added</Text>
        <Text style={styles.emptySubtext}>
          Add folders containing your music files
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerText: {
    fontSize: 16,
    color: '#999999',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addText: {
    color: '#1DB954',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
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
    textAlign: 'center',
  },
});
