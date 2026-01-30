/**
 * TuneWell Home Screen
 * 
 * Main landing screen showing:
 * - Now playing mini player
 * - Recently played
 * - Quick access to favorites and playlists
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { THEME, ROUTES, MOOD_CATEGORIES, MoodId } from '../config';
import { usePlayerStore, usePlaylistStore, useLibraryStore, useThemeStore } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { currentTrack } = usePlayerStore();
  const { getFavoriteIds, getRecentlyPlayedIds, getTracksByMood, trackMeta, recentlyPlayed } = usePlaylistStore();
  const { tracks, stats, scanFolders } = useLibraryStore();
  const { colors, mode: themeMode } = useThemeStore();
  
  // Calculate counts for quick actions - use trackMeta as dependency
  const favoritesCount = useMemo(() => {
    return Object.values(trackMeta).filter(m => m.isFavorite).length;
  }, [trackMeta]);
  
  const recentlyPlayedTracks = useMemo(() => {
    return recentlyPlayed.slice(0, 10);
  }, [recentlyPlayed]);
  
  // Get mood track counts - use trackMeta as dependency
  const moodTrackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MOOD_CATEGORIES.forEach(mood => {
      counts[mood.id] = Object.values(trackMeta).filter(m => m.moods?.includes(mood.id as MoodId)).length;
    });
    return counts;
  }, [trackMeta]);
  
  const handleMoodPress = (moodId: MoodId, moodName: string) => {
    const count = moodTrackCounts[moodId] || 0;
    if (count === 0) {
      Alert.alert('Empty Playlist', `No tracks in ${moodName} yet. Add mood to tracks from the player screen.`);
    } else {
      Alert.alert('Coming Soon', `Playing ${count} ${moodName} tracks`);
    }
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Library Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Library</Text>
          <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="music-note" size={24} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalTracks || tracks.length || 0}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tracks</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="folder" size={24} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{scanFolders.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Folders</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="favorite" size={24} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{favoritesCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Favorites</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="storage" size={24} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{formatSize(stats?.totalSize || 0)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Size</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recently Played */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently Played</Text>
          {recentlyPlayedTracks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="music-note" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyStateText, { color: colors.text }]}>No recently played tracks</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                Add folders to your library to start listening
              </Text>
            </View>
          ) : (
            <View style={[styles.recentList, { backgroundColor: colors.surface }]}>
              {recentlyPlayedTracks.map((trackId, index) => {
                const track = tracks.find(t => t.id === trackId);
                return (
                  <View key={`${trackId}-${index}`} style={[styles.recentItem, { borderBottomColor: colors.border }]}>
                    <MaterialIcons name="music-note" size={20} color={colors.textMuted} style={styles.recentIcon} />
                    <View style={styles.recentInfo}>
                      <Text style={[styles.recentItemText, { color: colors.text }]} numberOfLines={1}>
                        {track?.title || track?.fileName || 'Unknown Track'}
                      </Text>
                      <Text style={[styles.recentItemSubtext, { color: colors.textSecondary }]} numberOfLines={1}>
                        {track?.artist || 'Unknown Artist'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Mood Playlists */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Mood Playlists</Text>
          <View style={styles.moodGrid}>
            {MOOD_CATEGORIES.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[styles.moodCard, { backgroundColor: colors.surface }]}
                onPress={() => handleMoodPress(mood.id as MoodId, mood.name)}
              >
                <MaterialCommunityIcons name={mood.icon} size={24} color={colors.text} />
                <Text style={[styles.moodName, { color: colors.text }]}>{mood.name}</Text>
                <Text style={[styles.moodCount, { color: colors.textSecondary }]}>
                  {moodTrackCounts[mood.id] || 0}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
  },
  section: {
    marginBottom: THEME.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: THEME.spacing.md,
  },
  statsCard: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: THEME.spacing.md,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  recentList: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
  },
  recentIcon: {
    marginRight: THEME.spacing.sm,
  },
  recentInfo: {
    flex: 1,
  },
  recentItemText: {
    fontSize: 14,
  },
  recentItemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodCard: {
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    width: '31%',
    aspectRatio: 1,
    justifyContent: 'center',
  },
  moodName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  moodCount: {
    fontSize: 11,
    marginTop: 4,
  },
});
