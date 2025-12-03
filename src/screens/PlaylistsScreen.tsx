/**
 * TuneWell Playlists Screen
 * 
 * Manage playlists:
 * - System playlists (Favorites, Most Played, Recently Added)
 * - Mood playlists
 * - User-created playlists
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME, MOOD_CATEGORIES } from '../config';
import { usePlayerStore } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';

type Section = 'system' | 'mood' | 'custom';

interface CustomPlaylist {
  id: string;
  name: string;
  trackCount: number;
  createdAt: number;
}

export default function PlaylistsScreen() {
  const [expandedSection, setExpandedSection] = useState<Section | null>('system');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([]);
  const { currentTrack } = usePlayerStore();

  const toggleSection = (section: Section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleCreatePlaylist = useCallback(() => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    
    const newPlaylist: CustomPlaylist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      trackCount: 0,
      createdAt: Date.now(),
    };
    
    setCustomPlaylists(prev => [...prev, newPlaylist]);
    setNewPlaylistName('');
    setShowCreateModal(false);
    Alert.alert('Success', `Playlist "${newPlaylist.name}" created!`);
  }, [newPlaylistName]);

  const renderSectionHeader = (section: Section, title: string, count: number) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
    >
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      <Text style={styles.chevron}>
        {expandedSection === section ? '▼' : '▶'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Playlists</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Create Playlist Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor={THEME.colors.textSecondary}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCreate]}
                onPress={handleCreatePlaylist}
              >
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* System Playlists */}
        {renderSectionHeader('system', 'System Playlists', 4)}
        {expandedSection === 'system' && (
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.playlistItem}>
              <View style={[styles.playlistIcon, { backgroundColor: '#FF6B6B' }]}>
                <Text style={styles.playlistIconText}>❤️</Text>
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>Favorites</Text>
                <Text style={styles.playlistMeta}>0 tracks</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.playlistItem}>
              <View style={[styles.playlistIcon, { backgroundColor: '#4ECDC4' }]}>
                <Text style={styles.playlistIconText}>🔥</Text>
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>Most Played</Text>
                <Text style={styles.playlistMeta}>0 tracks</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.playlistItem}>
              <View style={[styles.playlistIcon, { backgroundColor: '#45B7D1' }]}>
                <Text style={styles.playlistIconText}>✨</Text>
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>Recently Added</Text>
                <Text style={styles.playlistMeta}>0 tracks</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.playlistItem}>
              <View style={[styles.playlistIcon, { backgroundColor: '#96CEB4' }]}>
                <Text style={styles.playlistIconText}>🕐</Text>
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>Recently Played</Text>
                <Text style={styles.playlistMeta}>0 tracks</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Mood Playlists */}
        {renderSectionHeader('mood', 'Mood Playlists', MOOD_CATEGORIES.length)}
        {expandedSection === 'mood' && (
          <View style={styles.sectionContent}>
            {MOOD_CATEGORIES.map((mood) => (
              <TouchableOpacity key={mood.id} style={styles.playlistItem}>
                <View style={[styles.playlistIcon, { backgroundColor: mood.color }]}>
                  <Text style={styles.playlistIconText}>{mood.icon}</Text>
                </View>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName}>{mood.name}</Text>
                  <Text style={styles.playlistMeta}>0 tracks</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Custom Playlists */}
        {renderSectionHeader('custom', 'My Playlists', customPlaylists.length)}
        {expandedSection === 'custom' && (
          <View style={styles.sectionContent}>
            {customPlaylists.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📋</Text>
                <Text style={styles.emptyStateText}>No custom playlists yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap "+ New" to create your first playlist
                </Text>
              </View>
            ) : (
              customPlaylists.map((playlist) => (
                <TouchableOpacity key={playlist.id} style={styles.playlistItem}>
                  <View style={[styles.playlistIcon, { backgroundColor: THEME.colors.primary }]}>
                    <Text style={styles.playlistIconText}>🎵</Text>
                  </View>
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistMeta}>{playlist.trackCount} tracks</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Spacer for mini player */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mini Player */}
      {currentTrack && <MiniPlayer />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  createButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  createButtonText: {
    color: THEME.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: THEME.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  sectionCount: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginLeft: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
  },
  chevron: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  sectionContent: {
    paddingVertical: THEME.spacing.sm,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md,
  },
  playlistIconText: {
    fontSize: 24,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.colors.text,
  },
  playlistMeta: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },
  emptyStateText: {
    fontSize: 16,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    fontSize: 16,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: THEME.colors.background,
    marginRight: THEME.spacing.sm,
  },
  modalButtonCreate: {
    backgroundColor: THEME.colors.primary,
    marginLeft: THEME.spacing.sm,
  },
  modalButtonText: {
    color: THEME.colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
});
