/**
 * TuneWell Home Screen
 * 
 * Personalized landing screen showing:
 * - Your Library overview
 * - Recently Played tracks
 * - Favorites
 * - Custom Playlists
 * - Mood Playlists
 * - Streaming Playlists
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  FlatList,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { THEME, ROUTES, MOOD_CATEGORIES, MoodId } from '../config';
import { usePlayerStore, usePlaylistStore, useLibraryStore, useThemeStore, useStreamingStore } from '../store';
import { useSettingsStore } from '../store/settingsStore';
import { audioService } from '../services/audio';
import MiniPlayer from '../components/player/MiniPlayer';
import type { Track, QueueItem } from '../types';
import type { ScannedTrack } from '../services/libraryScanner';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { currentTrack } = usePlayerStore();
  const { getFavoriteIds, getRecentlyPlayedIds, getTracksByMood, trackMeta, recentlyPlayed, customPlaylists } = usePlaylistStore();
  const { tracks, stats, scanFolders } = useLibraryStore();
  const { colors, mode: themeMode } = useThemeStore();
  const { spotifyPlaylists, spotifyConnected } = useStreamingStore();
  const { homeSections, toggleHomeSection, moveHomeSection, resetHomeSections } = useSettingsStore();
  const [customizeVisible, setCustomizeVisible] = useState(false);
  
  // Recently played tracks (last 5)
  const recentlyPlayedTracks = useMemo(() => {
    return recentlyPlayed.slice(0, 5).map(trackId => {
      const track = tracks.find(t => t.id === trackId);
      return track ? { id: trackId, track } : null;
    }).filter(Boolean) as { id: string; track: ScannedTrack }[];
  }, [recentlyPlayed, tracks]);

  // Favorite tracks (last 5 added favorites)
  const favoriteTracks = useMemo(() => {
    const favIds = getFavoriteIds();
    return favIds.slice(0, 5).map(trackId => {
      const track = tracks.find(t => t.id === trackId);
      return track ? { id: trackId, track } : null;
    }).filter(Boolean) as { id: string; track: ScannedTrack }[];
  }, [trackMeta, tracks]);

  const favoritesCount = useMemo(() => {
    return Object.values(trackMeta).filter(m => m.isFavorite).length;
  }, [trackMeta]);
  
  // Mood track counts
  const moodTrackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MOOD_CATEGORIES.forEach(mood => {
      counts[mood.id] = Object.values(trackMeta).filter(m => m.moods?.includes(mood.id as MoodId)).length;
    });
    return counts;
  }, [trackMeta]);

  // convert ScannedTrack -> Track for playback
  const convertToTrack = useCallback((st: ScannedTrack): Track => ({
    id: st.id,
    uri: st.uri,
    filePath: st.path,
    fileName: st.filename,
    folderPath: st.folder,
    folderName: st.folder.split('/').pop() || 'Music',
    title: st.title || st.filename.replace(/\.[^/.]+$/, ''),
    artist: st.artist || 'Unknown Artist',
    album: st.album || 'Unknown Album',
    albumArtist: st.albumArtist,
    genre: st.genre,
    year: st.year ? parseInt(st.year, 10) : undefined,
    trackNumber: st.trackNumber ? parseInt(st.trackNumber, 10) : undefined,
    duration: st.duration || 0,
    sampleRate: st.sampleRate ? parseInt(st.sampleRate, 10) : 44100,
    bitDepth: 16,
    bitRate: st.bitrate ? parseInt(st.bitrate, 10) : undefined,
    channels: 2,
    format: st.extension.replace('.', '').toUpperCase(),
    fileSize: st.size,
    isLossless: ['.flac', '.wav', '.aiff', '.alac', '.ape'].includes(st.extension.toLowerCase()),
    isHighRes: st.sampleRate ? parseInt(st.sampleRate, 10) > 48000 : false,
    isDSD: ['.dff', '.dsf', '.dsd'].includes(st.extension.toLowerCase()),
    artworkUri: st.albumArtUri || st.artwork || undefined,
    playCount: 0,
    isFavorite: false,
    moods: [],
    dateAdded: st.modifiedAt,
    dateModified: st.modifiedAt,
  }), []);

  const handlePlayTrack = useCallback(async (scannedTrack: ScannedTrack, allScannedTracks: ScannedTrack[], index: number) => {
    try {
      await audioService.initialize();
      const allTracks = allScannedTracks.map(convertToTrack);
      const queueItems: QueueItem[] = allTracks.map((track, idx) => ({
        id: `queue_${track.id}_${Date.now()}_${idx}`,
        track,
        addedAt: Date.now(),
        source: 'library' as const,
      }));
      await audioService.playQueue(queueItems, index);
    } catch (error: any) {
      Alert.alert('Playback Error', error.message || 'Failed to play');
    }
  }, [convertToTrack]);

  const handleMoodPress = (moodId: MoodId, moodName: string) => {
    const count = moodTrackCounts[moodId] || 0;
    if (count === 0) {
      Alert.alert('Empty Playlist', `No tracks in ${moodName} yet.\nAdd moods to tracks from the player screen.`);
    } else {
      navigation.navigate(ROUTES.PLAYLIST_DETAIL, { playlistId: moodId });
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // --- Section renderers ---
  const renderLibrary = () => (
    <View style={styles.section} key="library">
      <TouchableOpacity onPress={() => navigation.navigate(ROUTES.LIBRARY)}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Library</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.statsCard, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate(ROUTES.LIBRARY)}
        activeOpacity={0.7}
      >
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="music-note" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalTracks || tracks.length || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tracks</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="album" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalAlbums || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Albums</Text>
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
      </TouchableOpacity>
    </View>
  );

  const renderRecentlyPlayed = () => (
    <View style={styles.section} key="recentlyPlayed">
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently Played</Text>
        {recentlyPlayedTracks.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('SystemPlaylistDetail', { type: 'recentlyPlayed' })}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      {recentlyPlayedTracks.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="history" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
            Start playing music to see your history
          </Text>
        </View>
      ) : (
        <View style={[styles.trackListCard, { backgroundColor: colors.surface }]}>
          {recentlyPlayedTracks.map(({ id, track }, index) => (
            <TouchableOpacity
              key={`recent-${id}-${index}`}
              style={[styles.trackRow, index < recentlyPlayedTracks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => handlePlayTrack(track, recentlyPlayedTracks.map(r => r.track), index)}
              activeOpacity={0.7}
            >
              {(track.albumArtUri || track.artwork) ? (
                <Image source={{ uri: track.albumArtUri || track.artwork }} style={styles.trackThumb} />
              ) : (
                <View style={[styles.trackThumbPlaceholder, { backgroundColor: colors.surfaceLight }]}>
                  <MaterialIcons name="music-note" size={18} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.trackRowInfo}>
                <Text style={[styles.trackRowTitle, { color: colors.text }]} numberOfLines={1}>
                  {track.title || track.filename}
                </Text>
                <Text style={[styles.trackRowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {track.artist || 'Unknown Artist'}
                </Text>
              </View>
              <Text style={[styles.trackRowDuration, { color: colors.textMuted }]}>
                {track.duration ? formatDuration(track.duration) : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderFavorites = () => (
    <View style={styles.section} key="favorites">
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Favorites</Text>
        {favoriteTracks.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('SystemPlaylistDetail', { type: 'favorites' })}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      {favoriteTracks.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="favorite-border" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
            Tap the heart icon on tracks to add favorites
          </Text>
        </View>
      ) : (
        <View style={[styles.trackListCard, { backgroundColor: colors.surface }]}>
          {favoriteTracks.map(({ id, track }, index) => (
            <TouchableOpacity
              key={`fav-${id}-${index}`}
              style={[styles.trackRow, index < favoriteTracks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => handlePlayTrack(track, favoriteTracks.map(f => f.track), index)}
              activeOpacity={0.7}
            >
              {(track.albumArtUri || track.artwork) ? (
                <Image source={{ uri: track.albumArtUri || track.artwork }} style={styles.trackThumb} />
              ) : (
                <View style={[styles.trackThumbPlaceholder, { backgroundColor: colors.surfaceLight }]}>
                  <MaterialIcons name="favorite" size={18} color={colors.primary} />
                </View>
              )}
              <View style={styles.trackRowInfo}>
                <Text style={[styles.trackRowTitle, { color: colors.text }]} numberOfLines={1}>
                  {track.title || track.filename}
                </Text>
                <Text style={[styles.trackRowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {track.artist || 'Unknown Artist'}
                </Text>
              </View>
              <Text style={[styles.trackRowDuration, { color: colors.textMuted }]}>
                {track.duration ? formatDuration(track.duration) : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderMyPlaylists = () => {
    if (customPlaylists.length === 0) return null;
    return (
      <View style={styles.section} key="myPlaylists">
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Playlists</Text>
          <TouchableOpacity onPress={() => navigation.navigate(ROUTES.PLAYLISTS)}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {customPlaylists.slice(0, 6).map((playlist) => {
            const playlistTracks = playlist.trackIds.slice(0, 1).map(tid => tracks.find(t => t.id === tid)).filter(Boolean);
            const artworkUri = playlistTracks[0]?.albumArtUri || playlistTracks[0]?.artwork;
            return (
              <TouchableOpacity
                key={playlist.id}
                style={[styles.playlistCard, { backgroundColor: colors.surface }]}
                onPress={() => navigation.navigate(ROUTES.PLAYLIST_DETAIL, { playlistId: playlist.id })}
                activeOpacity={0.7}
              >
                {artworkUri ? (
                  <Image source={{ uri: artworkUri }} style={styles.playlistCardImage} />
                ) : (
                  <View style={[styles.playlistCardImage, { backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialIcons name="queue-music" size={28} color={colors.textMuted} />
                  </View>
                )}
                <Text style={[styles.playlistCardName, { color: colors.text }]} numberOfLines={1}>
                  {playlist.name}
                </Text>
                <Text style={[styles.playlistCardCount, { color: colors.textSecondary }]}>
                  {playlist.trackIds.length} tracks
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderMoodPlaylists = () => (
    <View style={styles.section} key="moodPlaylists">
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
  );

  const renderSpotifyPlaylists = () => {
    if (!spotifyConnected || spotifyPlaylists.length === 0) return null;
    return (
      <View style={styles.section} key="spotifyPlaylists">
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Spotify Playlists</Text>
          <TouchableOpacity onPress={() => navigation.navigate(ROUTES.STREAMING)}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {spotifyPlaylists.slice(0, 6).map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={[styles.playlistCard, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate(ROUTES.SPOTIFY_PLAYLIST_DETAIL, { playlistId: playlist.id })}
              activeOpacity={0.7}
            >
              {playlist.imageUrl ? (
                <Image source={{ uri: playlist.imageUrl }} style={styles.playlistCardImage} />
              ) : (
                <View style={[styles.playlistCardImage, { backgroundColor: '#1DB954', justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialCommunityIcons name="spotify" size={28} color="#FFFFFF" />
                </View>
              )}
              <Text style={[styles.playlistCardName, { color: colors.text }]} numberOfLines={1}>
                {playlist.name}
              </Text>
              <Text style={[styles.playlistCardCount, { color: colors.textSecondary }]}>
                {playlist.trackCount} tracks
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const sectionMap: Record<string, () => React.ReactNode> = {
    library: renderLibrary,
    recentlyPlayed: renderRecentlyPlayed,
    favorites: renderFavorites,
    myPlaylists: renderMyPlaylists,
    moodPlaylists: renderMoodPlaylists,
    spotifyPlaylists: renderSpotifyPlaylists,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />

      {/* Header with customize button */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Home</Text>
        <TouchableOpacity
          style={[styles.customizeBtn, { backgroundColor: colors.surface }]}
          onPress={() => setCustomizeVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="dashboard-customize" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {homeSections
          .filter(s => s.visible)
          .map(section => (
            <React.Fragment key={section.id}>
              {sectionMap[section.id]?.()}
            </React.Fragment>
          ))}

        {/* Spacer for mini player */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mini Player */}
      {currentTrack && <MiniPlayer />}

      {/* Customize Modal */}
      <Modal
        visible={customizeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomizeVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Customize Home</Text>
              <TouchableOpacity onPress={() => setCustomizeVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Show or hide sections and reorder them
            </Text>
            <ScrollView style={styles.modalList}>
              {homeSections.map((section, index) => (
                <View key={section.id} style={[styles.customizeRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.customizeLeft}>
                    <MaterialIcons
                      name={section.id === 'library' ? 'library-music' :
                            section.id === 'recentlyPlayed' ? 'history' :
                            section.id === 'favorites' ? 'favorite' :
                            section.id === 'myPlaylists' ? 'queue-music' :
                            section.id === 'moodPlaylists' ? 'mood' : 'cloud'}
                      size={20}
                      color={section.visible ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.customizeLabel, { color: section.visible ? colors.text : colors.textMuted }]}>
                      {section.label}
                    </Text>
                  </View>
                  <View style={styles.customizeRight}>
                    <TouchableOpacity
                      onPress={() => moveHomeSection(section.id, 'up')}
                      disabled={index === 0}
                      style={styles.arrowBtn}
                    >
                      <MaterialIcons name="keyboard-arrow-up" size={22} color={index === 0 ? colors.textMuted : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveHomeSection(section.id, 'down')}
                      disabled={index === homeSections.length - 1}
                      style={styles.arrowBtn}
                    >
                      <MaterialIcons name="keyboard-arrow-down" size={22} color={index === homeSections.length - 1 ? colors.textMuted : colors.textSecondary} />
                    </TouchableOpacity>
                    <Switch
                      value={section.visible}
                      onValueChange={() => toggleHomeSection(section.id)}
                      trackColor={{ false: colors.border, true: colors.primary + '80' }}
                      thumbColor={section.visible ? colors.primary : colors.textMuted}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: colors.border }]}
              onPress={() => {
                resetHomeSections();
                Alert.alert('Reset', 'Home layout restored to default.');
              }}
            >
              <MaterialIcons name="restore" size={18} color={colors.textSecondary} />
              <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>Reset to Default</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  customizeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: THEME.spacing.md,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
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
  // Track rows
  trackListCard: {
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm + 2,
  },
  trackThumb: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.sm,
  },
  trackThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackRowInfo: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  trackRowTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  trackRowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  trackRowDuration: {
    fontSize: 12,
    marginLeft: THEME.spacing.sm,
  },
  // Empty states
  emptyCard: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: THEME.spacing.sm,
  },
  // Horizontal playlist cards
  horizontalScroll: {
    marginHorizontal: -THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.lg,
  },
  playlistCard: {
    width: 130,
    marginRight: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
  },
  playlistCardImage: {
    width: 130,
    height: 130,
    borderRadius: THEME.borderRadius.lg,
  },
  playlistCardName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.xs,
  },
  playlistCardCount: {
    fontSize: 11,
    paddingHorizontal: THEME.spacing.xs,
    paddingBottom: THEME.spacing.sm,
  },
  // Mood grid
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
  // Customize modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xl + 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  modalList: {
    paddingHorizontal: THEME.spacing.lg,
  },
  customizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.sm + 4,
    borderBottomWidth: 1,
  },
  customizeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customizeLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: THEME.spacing.md,
  },
  customizeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  arrowBtn: {
    padding: 4,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.md,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: THEME.spacing.sm,
  },
});
