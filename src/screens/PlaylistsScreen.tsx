/**
 * TuneWell Playlists Screen
 * 
 * Manage playlists:
 * - System playlists (Favorites, Most Played, Recently Added)
 * - Mood playlists
 * - User-created playlists
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import { THEME, MOOD_CATEGORIES, MoodId } from '../config';
import { usePlayerStore, usePlaylistStore, useThemeStore } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';

type Section = 'system' | 'mood' | 'custom';

export default function PlaylistsScreen() {
  const [expandedSection, setExpandedSection] = useState<Section | null>('system');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const { currentTrack } = usePlayerStore();
  const { colors, mode: themeMode } = useThemeStore();
  
  // Get playlist store data
  const { 
    getFavoriteIds,
    getRecentlyPlayedIds,
    getMostPlayedIds,
    getTracksByMood,
    customPlaylists,
    createPlaylist,
  } = usePlaylistStore();
  
  // Calculate track counts
  const favoritesCount = useMemo(() => getFavoriteIds().length, [getFavoriteIds]);
  const recentlyPlayedCount = useMemo(() => getRecentlyPlayedIds(50).length, [getRecentlyPlayedIds]);
  const mostPlayedCount = useMemo(() => getMostPlayedIds(50).length, [getMostPlayedIds]);
  // Note: recentlyAdded would need to be tracked separately if needed
  const recentlyAddedCount = 0;
  
  // Get mood track counts
  const moodTrackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MOOD_CATEGORIES.forEach(mood => {
      counts[mood.id] = getTracksByMood(mood.id as MoodId).length;
    });
    return counts;
  }, [getTracksByMood]);

  const toggleSection = (section: Section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleCreatePlaylist = useCallback(() => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    
    createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowCreateModal(false);
    Alert.alert('Success', `Playlist "${newPlaylistName.trim()}" created!`);
  }, [newPlaylistName, createPlaylist]);
  
  // Play a system playlist
  const handlePlaySystemPlaylist = useCallback(async (type: 'favorites' | 'mostPlayed' | 'recentlyAdded' | 'recentlyPlayed') => {
    let trackIds: string[] = [];
    
    switch (type) {
      case 'favorites':
        trackIds = getFavoriteIds();
        break;
      case 'mostPlayed':
        trackIds = getMostPlayedIds(50);
        break;
      case 'recentlyAdded':
        // Not yet implemented
        trackIds = [];
        break;
      case 'recentlyPlayed':
        trackIds = getRecentlyPlayedIds(50);
        break;
    }
    
    if (trackIds.length === 0) {
      Alert.alert('Empty Playlist', 'No tracks in this playlist yet.');
      return;
    }
    
    // TODO: Load actual track data and play
    Alert.alert('Coming Soon', `Playing ${trackIds.length} tracks from playlist`);
  }, [getFavoriteIds, getMostPlayedIds, getRecentlyPlayedIds]);
  
  // Play a mood playlist
  const handlePlayMoodPlaylist = useCallback(async (moodId: MoodId) => {
    const trackIds = getTracksByMood(moodId);
    
    if (trackIds.length === 0) {
      Alert.alert('Empty Playlist', 'No tracks with this mood yet. Add mood to tracks from the player screen.');
      return;
    }
    
    // TODO: Load actual track data and play
    Alert.alert('Coming Soon', `Playing ${trackIds.length} ${moodId} tracks`);
  }, [getTracksByMood]);

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Playlists</Text>
        <TouchableOpacity style={[styles.createButton, { backgroundColor: colors.surface }]} onPress={() => setShowCreateModal(true)}>
          <Text style={[styles.createButtonText, { color: colors.text }]}>+ New</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Playlist</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
              placeholder="Playlist name"
              placeholderTextColor={colors.textSecondary}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: colors.surfaceLight }]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCreate, { backgroundColor: colors.primary }]}
                onPress={handleCreatePlaylist}
              >
                <Text style={[styles.modalButtonText, { color: colors.background }]}>Create</Text>
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
            <TouchableOpacity 
              style={styles.playlistItem}
              onPress={() => handlePlaySystemPlaylist('favorites')}
            >
              <View style={[styles.playlistIcon, { backgroundColor: '#FF6B6B' }]}>
                <Text style={styles.playlistIconText}>♥</Text>
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>Favorites</Text>
                <Text style={styles.playlistMeta}>{favoritesCount} tracks</Text>
              </View>
              <Text style={styles.playArrow}>▶</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.playlistItem}
              onPress={() => handlePlaySystemPlaylist('mostPlayed')}
            >
              <View style={[styles.playlistIcon, { backgroundColor: '#4ECDC4' }]}>
                <Text style={styles.playlistIconText}>⚡</Text>
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>Most Played</Text>
                <Text style={styles.playlistMeta}>{mostPlayedCount} tracks</Text>
              </View>
              <Text style={styles.playArrow}>▶</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.playlistItem}
              onPress={() => handlePlaySystemPlaylist('recentlyAdded')}
            >
              <View style={[styles.playlistIcon, { backgroundColor: '#45B7D1' }]}>
                <Text style={styles.playlistIconText}>★</Text>
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>Recently Added</Text>
                <Text style={styles.playlistMeta}>{recentlyAddedCount} tracks</Text>
              </View>
              <Text style={styles.playArrow}>▶</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.playlistItem}
              onPress={() => handlePlaySystemPlaylist('recentlyPlayed')}
            >
              <View style={[styles.playlistIcon, { backgroundColor: '#96CEB4' }]}>
                <Text style={styles.playlistIconText}>◷</Text>
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>Recently Played</Text>
                <Text style={styles.playlistMeta}>{recentlyPlayedCount} tracks</Text>
              </View>
              <Text style={styles.playArrow}>▶</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mood Playlists */}
        {renderSectionHeader('mood', 'Mood Playlists', MOOD_CATEGORIES.length)}
        {expandedSection === 'mood' && (
          <View style={styles.sectionContent}>
            {MOOD_CATEGORIES.map((mood) => (
              <TouchableOpacity 
                key={mood.id} 
                style={styles.playlistItem}
                onPress={() => handlePlayMoodPlaylist(mood.id as MoodId)}
              >
                <View style={[styles.playlistIcon, { backgroundColor: mood.color }]}>
                  <Text style={styles.playlistIconText}>{mood.icon}</Text>
                </View>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName}>{mood.name}</Text>
                  <Text style={styles.playlistMeta}>{moodTrackCounts[mood.id] || 0} tracks</Text>
                </View>
                <Text style={styles.playArrow}>▶</Text>
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
                <Text style={styles.emptyStateIcon}>♫</Text>
                <Text style={styles.emptyStateText}>No custom playlists yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap "+ New" to create your first playlist
                </Text>
              </View>
            ) : (
              customPlaylists.map((playlist) => (
                <TouchableOpacity key={playlist.id} style={styles.playlistItem}>
                  <View style={[styles.playlistIcon, { backgroundColor: THEME.colors.primary }]}>
                    <Text style={styles.playlistIconText}>♪</Text>
                  </View>
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistMeta}>{playlist.tracks.length} tracks</Text>
                  </View>
                  <Text style={styles.playArrow}>▶</Text>
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
  playArrow: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginLeft: THEME.spacing.sm,
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
