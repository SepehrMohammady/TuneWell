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
import { THEME, ROUTES, VERSION, MOOD_CATEGORIES, MoodId } from '../config';
import { usePlayerStore, usePlaylistStore, useLibraryStore, useThemeStore } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { currentTrack } = usePlayerStore();
  const { getFavoriteIds, getRecentlyPlayedIds, getTracksByMood } = usePlaylistStore();
  const { tracks } = useLibraryStore();
  const { colors, mode: themeMode } = useThemeStore();
  
  // Calculate counts for quick actions
  const favoritesCount = useMemo(() => getFavoriteIds().length, [getFavoriteIds]);
  const recentlyPlayedTracks = useMemo(() => {
    return getRecentlyPlayedIds(10);
  }, [getRecentlyPlayedIds]);
  
  // Get mood track counts
  const moodTrackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MOOD_CATEGORIES.forEach(mood => {
      counts[mood.id] = getTracksByMood(mood.id as MoodId).length;
    });
    return counts;
  }, [getTracksByMood]);
  
  const handleMoodPress = (moodId: MoodId, moodName: string) => {
    const count = moodTrackCounts[moodId] || 0;
    if (count === 0) {
      Alert.alert('Empty Playlist', `No tracks in ${moodName} yet. Add mood to tracks from the player screen.`);
    } else {
      Alert.alert('Coming Soon', `Playing ${count} ${moodName} tracks`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>TuneWell</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>v{VERSION.versionString}</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate(ROUTES.LIBRARY as never)}
            >
              <Text style={[styles.quickActionIcon, { color: colors.text }]}>♫</Text>
              <Text style={[styles.quickActionText, { color: colors.text }]}>Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate(ROUTES.PLAYLISTS as never)}
            >
              <Text style={[styles.quickActionIcon, { color: colors.text }]}>♡</Text>
              <Text style={[styles.quickActionText, { color: colors.text }]}>Favorites</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate(ROUTES.EQUALIZER as never)}
            >
              <Text style={[styles.quickActionIcon, { color: colors.text }]}>☰</Text>
              <Text style={[styles.quickActionText, { color: colors.text }]}>Equalizer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate(ROUTES.SETTINGS as never)}
            >
              <Text style={[styles.quickActionIcon, { color: colors.text }]}>⚙</Text>
              <Text style={[styles.quickActionText, { color: colors.text }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recently Played */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently Played</Text>
          {recentlyPlayedTracks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyStateIcon, { color: colors.textMuted }]}>♪</Text>
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
                    <Text style={[styles.recentItemText, { color: colors.text }]} numberOfLines={1}>
                      {track?.title || track?.fileName || 'Unknown Track'}
                    </Text>
                    <Text style={[styles.recentItemSubtext, { color: colors.textSecondary }]} numberOfLines={1}>
                      {track?.artist || 'Unknown Artist'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Mood Playlists */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Mood Playlists</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodContainer}
          >
            {MOOD_CATEGORIES.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[styles.moodCard, { backgroundColor: colors.surface, borderColor: mood.color }]}
                onPress={() => handleMoodPress(mood.id as MoodId, mood.name)}
              >
                <Text style={styles.moodIcon}>{mood.icon}</Text>
                <Text style={[styles.moodName, { color: colors.text }]}>{mood.name}</Text>
                <Text style={[styles.moodCount, { color: colors.textSecondary }]}>
                  {moodTrackCounts[mood.id] || 0}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Audio Quality Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Audio Quality</Text>
          <View style={[styles.qualityCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.qualityItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.qualityLabel, { color: colors.textSecondary }]}>Supported Formats</Text>
              <Text style={[styles.qualityValue, { color: colors.text }]}>FLAC, DSD, WAV, MP3, AAC</Text>
            </View>
            <View style={[styles.qualityItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.qualityLabel, { color: colors.textSecondary }]}>High-Res Audio</Text>
              <Text style={[styles.qualityValue, { color: colors.text }]}>Up to 32-bit/384kHz, DSD512</Text>
            </View>
            <View style={[styles.qualityItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.qualityLabel, { color: colors.textSecondary }]}>DAC Support</Text>
              <Text style={[styles.qualityValue, { color: colors.text }]}>USB DAC, Bluetooth HD</Text>
            </View>
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
  header: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: THEME.spacing.lg,
  },
  section: {
    marginBottom: THEME.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: THEME.spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickActionBadge: {
    position: 'relative',
    marginBottom: 8,
  },
  badgeText: {
    position: 'absolute',
    top: -4,
    right: -8,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    textAlign: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  moodContainer: {
    paddingRight: THEME.spacing.lg,
  },
  moodCard: {
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginRight: THEME.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    width: 90,
    height: 90,
    justifyContent: 'center',
  },
  moodIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  moodCount: {
    fontSize: 11,
    marginTop: 4,
  },
  recentList: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
  },
  recentItem: {
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
  },
  recentItemText: {
    fontSize: 14,
  },
  recentItemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  qualityCard: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
  },
  qualityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
  },
  qualityLabel: {
    fontSize: 14,
  },
  qualityValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
