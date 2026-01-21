/**
 * TuneWell Player Screen
 * 
 * Full-screen now playing view with:
 * - Album artwork
 * - Track info and audio quality badges
 * - Playback controls
 * - Progress bar
 * - Queue access
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  Modal,
  ScrollView,
  Alert,
  PanResponder,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { useCombinedProgress } from '../hooks';
import { THEME, ROUTES, MOOD_CATEGORIES } from '../config';
import { usePlayerStore, useEQStore, usePlaylistStore, useThemeStore } from '../store';
import { audioService } from '../services/audio';
import { formatDuration } from '../services/metadata';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH - 80;

export default function PlayerScreen() {
  const navigation = useNavigation();
  const { colors, mode: themeMode } = useThemeStore();
  // Use combined progress hook that works with both TrackPlayer and native decoder
  const progress = useCombinedProgress();
  const {
    currentTrack,
    state,
    repeatMode,
    isShuffled,
  } = usePlayerStore();
  
  const { isEnabled: eqEnabled } = useEQStore();
  const { 
    toggleFavorite, 
    isFavorite, 
    getTrackMoods, 
    addMoodToTrack, 
    removeMoodFromTrack,
    customPlaylists,
    addToPlaylist,
    getPlayCount,
    createPlaylist,
  } = usePlaylistStore();

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [dynamicFileSize, setDynamicFileSize] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Fetch file size when track changes or info modal opens
  useEffect(() => {
    const fetchFileSize = async () => {
      if (currentTrack?.filePath && showInfoModal) {
        try {
          // If track already has fileSize, use it
          if (currentTrack.fileSize && currentTrack.fileSize > 0) {
            setDynamicFileSize(currentTrack.fileSize);
            return;
          }
          // Otherwise, fetch it from filesystem
          const stat = await RNFS.stat(currentTrack.filePath);
          setDynamicFileSize(stat.size);
        } catch (error) {
          console.log('[FileSize] Could not get file size:', error);
          setDynamicFileSize(null);
        }
      }
    };
    fetchFileSize();
  }, [currentTrack?.id, currentTrack?.filePath, currentTrack?.fileSize, showInfoModal]);

  // Progress bar width for seek calculations
  const progressBarWidth = SCREEN_WIDTH - (THEME.spacing.xl * 2);

  // Use ref to store current duration for PanResponder
  const durationRef = useRef(progress.duration);
  durationRef.current = progress.duration;

  // PanResponder for draggable progress bar
  const panResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setIsDragging(true);
        const locationX = e.nativeEvent.locationX;
        const duration = durationRef.current;
        if (duration > 0) {
          const seekPosition = Math.max(0, Math.min(1, locationX / progressBarWidth)) * duration;
          setDragPosition(seekPosition);
        }
      },
      onPanResponderMove: (e, gestureState) => {
        const locationX = e.nativeEvent.locationX;
        const duration = durationRef.current;
        if (duration > 0) {
          const seekPosition = Math.max(0, Math.min(1, locationX / progressBarWidth)) * duration;
          setDragPosition(seekPosition);
        }
      },
      onPanResponderRelease: (e) => {
        const locationX = e.nativeEvent.locationX;
        const duration = durationRef.current;
        if (duration > 0) {
          const seekPosition = Math.max(0, Math.min(1, locationX / progressBarWidth)) * duration;
          if (seekPosition >= 0 && seekPosition <= duration) {
            audioService.seekTo(seekPosition);
          }
        }
        setIsDragging(false);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    }),
  [progressBarWidth]);

  const isPlaying = state === 'playing';
  const trackIsFavorite = currentTrack ? isFavorite(currentTrack.id) : false;
  const trackMoods = currentTrack ? getTrackMoods(currentTrack.id) : [];

  const handleToggleFavorite = useCallback(() => {
    if (!currentTrack) return;
    const newState = toggleFavorite(currentTrack.id);
    // Could show a toast here
  }, [currentTrack, toggleFavorite]);

  const handleShare = useCallback(async () => {
    if (!currentTrack) return;
    if (isSharing) return; // Prevent double-tap
    
    const filePath = currentTrack.filePath;
    
    // Check if we have a valid file path
    if (!filePath || !filePath.startsWith('/')) {
      // No valid file path, share text instead
      try {
        const shareMessage = [
          `🎵 ${currentTrack.title}`,
          `👤 Artist: ${currentTrack.artist}`,
          currentTrack.album ? `💿 Album: ${currentTrack.album}` : null,
          '',
          'Shared from TuneWell',
        ].filter(Boolean).join('\n');
        
        await Share.open({
          message: shareMessage,
          title: `${currentTrack.title} - ${currentTrack.artist}`,
          failOnCancel: false,
        });
      } catch (err: any) {
        if (!err?.message?.includes('cancel')) {
          Alert.alert('Share Error', 'Could not share this track');
        }
      }
      return;
    }
    
    setIsSharing(true);
    
    try {
      // Get the file extension
      const ext = currentTrack.format?.toLowerCase() || filePath.split('.').pop() || 'mp3';
      
      // Create a clean filename for sharing
      const safeTitle = (currentTrack.title || 'audio').replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
      const safeArtist = (currentTrack.artist || 'Unknown').replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
      const shareFileName = `${safeArtist} - ${safeTitle}.${ext}`;
      
      // Copy file to cache directory for sharing
      const cacheDir = RNFS.CachesDirectoryPath;
      const cachePath = `${cacheDir}/${shareFileName}`;
      
      // Check if source file exists
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('Audio file not found');
      }
      
      // Copy the file to cache
      await RNFS.copyFile(filePath, cachePath);
      
      // Get the proper mime type
      const mimeType = ext === 'mp3' ? 'audio/mpeg' : 
                       ext === 'flac' ? 'audio/flac' :
                       ext === 'wav' ? 'audio/wav' :
                       ext === 'm4a' ? 'audio/mp4' :
                       ext === 'aac' ? 'audio/aac' :
                       ext === 'ogg' ? 'audio/ogg' :
                       ext === 'opus' ? 'audio/opus' :
                       `audio/${ext}`;
      
      // Create a visual share message with TuneWell branding
      const shareMessage = [
        `🎵 ${currentTrack.title}`,
        `🎤 ${currentTrack.artist}`,
        currentTrack.album ? `💿 ${currentTrack.album}` : null,
        '',
        '🎧 Shared via TuneWell',
      ].filter(Boolean).join('\n');
      
      // Share the cached file
      await Share.open({
        url: `file://${cachePath}`,
        type: mimeType,
        filename: shareFileName,
        message: shareMessage,
        title: `${currentTrack.title} - ${currentTrack.artist}`,
        subject: `${currentTrack.title} - ${currentTrack.artist}`,
        failOnCancel: false,
      });
      
      // Clean up cache file after a delay
      setTimeout(async () => {
        try {
          await RNFS.unlink(cachePath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 30000); // Clean up after 30 seconds
      
    } catch (error: any) {
      // User cancelled is not an error
      if (error?.message && !error.message.includes('cancel') && !error.message.includes('dismiss')) {
        console.log('[Share] Error:', error?.message || error);
        Alert.alert('Share Error', 'Could not share this audio file');
      }
    } finally {
      setIsSharing(false);
    }
  }, [currentTrack, isSharing]);

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleMoodToggle = useCallback((moodId: string) => {
    if (!currentTrack) return;
    if (trackMoods.includes(moodId as any)) {
      removeMoodFromTrack(currentTrack.id, moodId as any);
    } else {
      addMoodToTrack(currentTrack.id, moodId as any);
    }
  }, [currentTrack, trackMoods, addMoodToTrack, removeMoodFromTrack]);

  const handleAddToPlaylist = useCallback((playlistId: string) => {
    if (!currentTrack) return;
    addToPlaylist(playlistId, [currentTrack.id]);
    setShowPlaylistModal(false);
    Alert.alert('Added', 'Track added to playlist');
  }, [currentTrack, addToPlaylist]);

  if (!currentTrack) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <MaterialIcons name="music-off" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyStateText, { color: colors.text }]}>No track playing</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <MaterialIcons name="keyboard-arrow-down" size={32} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Now Playing</Text>
          {currentTrack.isHighRes && (
            <View style={[styles.qualityBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.qualityBadgeText, { color: colors.background }]}>Hi-Res</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowInfoModal(true)} style={styles.headerButton}>
            <MaterialIcons name="info-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate(ROUTES.QUEUE as never)}
            style={styles.headerButton}
          >
            <MaterialIcons name="queue-music" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Artwork */}
      <View style={styles.artworkContainer}>
        {currentTrack.artworkUri ? (
          <Image
            source={{ uri: currentTrack.artworkUri }}
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="music-note" size={80} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
          {currentTrack.artist} • {currentTrack.album}
        </Text>
        
        {/* Audio Quality Info */}
        <View style={styles.audioInfo}>
          <Text style={[styles.audioInfoText, { color: colors.textMuted }]}>
            {currentTrack.format.toUpperCase()} • {currentTrack.sampleRate / 1000}kHz • {currentTrack.bitDepth}-bit
          </Text>
          {eqEnabled && (
            <View style={[styles.eqBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.eqBadgeText, { color: colors.background }]}>EQ</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[styles.progressBar, { backgroundColor: colors.surface }]}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary },
              {
                width: progress.duration > 0
                  ? `${((isDragging ? dragPosition : progress.position) / progress.duration) * 100}%`
                  : '0%',
              },
            ]}
          />
          {/* Progress Thumb */}
          <View
            style={[
              styles.progressThumb,
              { 
                backgroundColor: colors.primary,
                left: progress.duration > 0
                  ? `${((isDragging ? dragPosition : progress.position) / progress.duration) * 100}%`
                  : '0%',
                transform: [{ translateX: -8 }],
              },
            ]}
          />
        </View>
        <View style={styles.progressTime}>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatDuration(isDragging ? dragPosition : progress.position)}</Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatDuration(progress.duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Shuffle */}
        <TouchableOpacity
          style={[styles.secondaryControl, isShuffled && styles.secondaryControlActive]}
          onPress={() => audioService.toggleShuffle()}
        >
          <MaterialIcons 
            name="shuffle" 
            size={24} 
            color={isShuffled ? colors.primary : colors.textMuted} 
          />
        </TouchableOpacity>

        {/* Previous */}
        <TouchableOpacity style={styles.controlButton} onPress={() => audioService.skipToPrevious()}>
          <MaterialIcons name="skip-previous" size={40} color={colors.text} />
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.primary }]} onPress={() => audioService.togglePlayPause()}>
          <MaterialIcons 
            name={isPlaying ? 'pause' : 'play-arrow'} 
            size={48} 
            color={colors.background} 
          />
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity style={styles.controlButton} onPress={() => audioService.skipToNext()}>
          <MaterialIcons name="skip-next" size={40} color={colors.text} />
        </TouchableOpacity>

        {/* Repeat */}
        <TouchableOpacity
          style={[styles.secondaryControl, repeatMode !== 'off' && styles.secondaryControlActive]}
          onPress={() => audioService.cycleRepeatMode()}
        >
          <MaterialIcons 
            name={repeatMode === 'track' ? 'repeat-one' : 'repeat'} 
            size={24} 
            color={repeatMode !== 'off' ? colors.primary : colors.textMuted} 
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {/* Favorite */}
        <TouchableOpacity style={styles.bottomAction} onPress={handleToggleFavorite}>
          <MaterialIcons 
            name={trackIsFavorite ? 'favorite' : 'favorite-outline'} 
            size={26} 
            color={trackIsFavorite ? colors.primary : colors.text} 
          />
        </TouchableOpacity>
        
        {/* EQ */}
        <TouchableOpacity
          style={[styles.bottomAction, eqEnabled && styles.activeAction]}
          onPress={() => navigation.navigate(ROUTES.EQUALIZER as never)}
        >
          <MaterialIcons 
            name="tune" 
            size={26} 
            color={eqEnabled ? colors.primary : colors.text} 
          />
        </TouchableOpacity>
        
        {/* Share */}
        <TouchableOpacity style={styles.bottomAction} onPress={handleShare}>
          <MaterialIcons name="share" size={26} color={colors.text} />
        </TouchableOpacity>
        
        {/* Mood */}
        <TouchableOpacity style={styles.bottomAction} onPress={() => setShowMoodModal(true)}>
          <MaterialIcons 
            name="mood" 
            size={26} 
            color={trackMoods.length > 0 ? colors.primary : colors.text} 
          />
        </TouchableOpacity>
        
        {/* Add to Playlist */}
        <TouchableOpacity style={styles.bottomAction} onPress={() => setShowPlaylistModal(true)}>
          <MaterialIcons name="playlist-add" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Mood Selection Modal */}
      <Modal visible={showMoodModal} transparent animationType="slide" onRequestClose={() => setShowMoodModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Mood</Text>
            <Text style={styles.modalSubtitle}>Tap to toggle moods for this track</Text>
            <ScrollView style={styles.moodGrid} contentContainerStyle={styles.moodGridContent}>
              {MOOD_CATEGORIES.map((mood) => {
                const isSelected = trackMoods.includes(mood.id as any);
                return (
                  <TouchableOpacity
                    key={mood.id}
                    style={[styles.moodItem, isSelected && styles.moodItemSelected]}
                    onPress={() => handleMoodToggle(mood.id)}
                  >
                    <Text style={styles.moodItemIcon}>{mood.icon}</Text>
                    <Text style={[styles.moodItemText, isSelected && styles.moodItemTextSelected]}>
                      {mood.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowMoodModal(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add to Playlist Modal */}
      <Modal visible={showPlaylistModal} transparent animationType="slide" onRequestClose={() => setShowPlaylistModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add to Playlist</Text>
            
            {/* Create New Playlist Button */}
            <TouchableOpacity
              style={[styles.createPlaylistRow, { backgroundColor: colors.surfaceLight }]}
              onPress={() => {
                setShowPlaylistModal(false);
                setShowCreatePlaylistModal(true);
              }}
            >
              <MaterialIcons name="add" size={24} color={colors.primary} />
              <Text style={[styles.createPlaylistRowText, { color: colors.primary }]}>Create New Playlist</Text>
            </TouchableOpacity>
            
            {customPlaylists.length === 0 ? (
              <View style={styles.emptyPlaylists}>
                <Text style={styles.emptyPlaylistsText}>No playlists yet</Text>
                <Text style={styles.emptyPlaylistsSubtext}>Create a new playlist to add this track</Text>
              </View>
            ) : (
              <ScrollView style={styles.playlistList}>
                {customPlaylists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.playlistItem}
                    onPress={() => handleAddToPlaylist(playlist.id)}
                  >
                    <Text style={styles.playlistItemText}>{playlist.name}</Text>
                    <Text style={styles.playlistItemCount}>{playlist.trackIds.length} tracks</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowPlaylistModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Playlist Modal */}
      <Modal visible={showCreatePlaylistModal} transparent animationType="fade" onRequestClose={() => setShowCreatePlaylistModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Playlist</Text>
            <TextInput
              style={[styles.createPlaylistInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Playlist name"
              placeholderTextColor={colors.textMuted}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <View style={styles.createPlaylistButtons}>
              <TouchableOpacity
                style={[styles.createPlaylistCancelBtn, { backgroundColor: colors.surfaceLight }]}
                onPress={() => {
                  setShowCreatePlaylistModal(false);
                  setNewPlaylistName('');
                }}
              >
                <Text style={[styles.createPlaylistCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createPlaylistConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (newPlaylistName.trim()) {
                    const playlistId = createPlaylist(newPlaylistName.trim());
                    if (currentTrack) {
                      addToPlaylist(playlistId, currentTrack.id);
                      Alert.alert('Success', `Added "${currentTrack.title}" to "${newPlaylistName.trim()}"`);
                    }
                    setShowCreatePlaylistModal(false);
                    setNewPlaylistName('');
                  }
                }}
              >
                <Text style={[styles.createPlaylistConfirmText, { color: colors.background }]}>Create & Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Track Info Modal */}
      <Modal visible={showInfoModal} transparent animationType="slide" onRequestClose={() => setShowInfoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.infoModalContent]}>
            <Text style={styles.modalTitle}>Track Information</Text>
            {currentTrack && (
              <ScrollView style={styles.infoList}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Title</Text>
                  <Text style={styles.infoValue}>{currentTrack.title}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Artist</Text>
                  <Text style={styles.infoValue}>{currentTrack.artist}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Album</Text>
                  <Text style={styles.infoValue}>{currentTrack.album || 'Unknown'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>{formatDuration(currentTrack.duration)}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Format</Text>
                  <Text style={styles.infoValue}>{currentTrack.format?.toUpperCase() || 'Unknown'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Sample Rate</Text>
                  <Text style={styles.infoValue}>{currentTrack.sampleRate ? `${(currentTrack.sampleRate / 1000).toFixed(1)} kHz` : 'Unknown'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Bit Depth</Text>
                  <Text style={styles.infoValue}>{currentTrack.bitDepth ? `${currentTrack.bitDepth}-bit` : 'Unknown'}</Text>
                </View>
                {currentTrack.bitRate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Bit Rate</Text>
                    <Text style={styles.infoValue}>{`${Math.round(currentTrack.bitRate / 1000)} kbps`}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Channels</Text>
                  <Text style={styles.infoValue}>{currentTrack.channels === 2 ? 'Stereo' : currentTrack.channels === 1 ? 'Mono' : `${currentTrack.channels || 2} channels`}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>File Size</Text>
                  <Text style={styles.infoValue}>{dynamicFileSize ? formatFileSize(dynamicFileSize) : 'Loading...'}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>File Name</Text>
                  <Text style={[styles.infoValue, styles.infoValueSmall]} numberOfLines={2}>{currentTrack.fileName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={[styles.infoValue, styles.infoValueSmall]} numberOfLines={3}>{currentTrack.folderPath}</Text>
                </View>
                {currentTrack.genre && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Genre</Text>
                    <Text style={styles.infoValue}>{currentTrack.genre}</Text>
                  </View>
                )}
                {currentTrack.year && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Year</Text>
                    <Text style={styles.infoValue}>{currentTrack.year}</Text>
                  </View>
                )}
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Quality</Text>
                  <Text style={styles.infoValue}>
                    {currentTrack.isDSD ? 'DSD' : currentTrack.isHighRes ? 'Hi-Res' : currentTrack.isLossless ? 'Lossless' : 'Lossy'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Play Count</Text>
                  <Text style={styles.infoValue}>{getPlayCount(currentTrack.id)}</Text>
                </View>
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowInfoModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
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
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 24,
    color: THEME.colors.text,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  qualityBadge: {
    backgroundColor: THEME.colors.surfaceLight,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    marginLeft: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  qualityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  artworkContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: THEME.spacing.md,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: THEME.borderRadius.lg,
  },
  artworkPlaceholder: {
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  artworkPlaceholderText: {
    fontSize: 80,
    color: THEME.colors.textMuted,
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.xl,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  trackArtist: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  audioInfoText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  eqBadge: {
    backgroundColor: THEME.colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    marginLeft: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  eqBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  progressContainer: {
    paddingHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.xl,
  },
  progressBar: {
    height: 8,
    backgroundColor: THEME.colors.surface,
    borderRadius: 4,
    overflow: 'visible',
    justifyContent: 'center',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.text,
    borderRadius: 4,
  },
  progressThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  progressTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.sm,
  },
  timeText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.xl,
    paddingHorizontal: THEME.spacing.lg,
  },
  secondaryControl: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryControlActive: {},
  secondaryControlText: {
    fontSize: 20,
    color: THEME.colors.textMuted,
  },
  secondaryControlTextActive: {
    color: THEME.colors.text,
  },
  controlButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: THEME.spacing.sm,
  },
  controlButtonText: {
    fontSize: 36,
    color: THEME.colors.text,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: THEME.spacing.md,
  },
  playButtonText: {
    fontSize: 36,
    color: THEME.colors.background,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: THEME.spacing.xl,
    gap: THEME.spacing.xl,
  },
  bottomAction: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionText: {
    fontSize: 24,
    color: THEME.colors.text,
  },
  bottomActionActive: {
    color: '#FF4444',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
    color: THEME.colors.textMuted,
  },
  emptyStateText: {
    fontSize: 18,
    color: THEME.colors.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
  },
  moodGrid: {
    maxHeight: 300,
  },
  moodGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: THEME.spacing.md,
    justifyContent: 'center',
  },
  moodItem: {
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    margin: THEME.spacing.xs,
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  moodItemSelected: {
    backgroundColor: THEME.colors.text,
    borderColor: THEME.colors.text,
  },
  moodItemIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
  },
  moodItemText: {
    fontSize: 14,
    color: THEME.colors.text,
    flex: 1,
  },
  moodItemTextSelected: {
    color: THEME.colors.background,
    fontWeight: '600',
  },
  modalClose: {
    marginTop: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    marginHorizontal: THEME.spacing.lg,
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  emptyPlaylists: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  emptyPlaylistsText: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  emptyPlaylistsSubtext: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  playlistList: {
    maxHeight: 300,
    paddingHorizontal: THEME.spacing.md,
  },
  playlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
  },
  playlistItemText: {
    fontSize: 16,
    color: THEME.colors.text,
  },
  playlistItemCount: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  createPlaylistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },
  createPlaylistRowText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createPlaylistInput: {
    fontSize: 16,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
  },
  createPlaylistButtons: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  createPlaylistCancelBtn: {
    flex: 1,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  createPlaylistCancelText: {
    fontSize: 16,
  },
  createPlaylistConfirmBtn: {
    flex: 1,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  createPlaylistConfirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Info Modal styles
  infoModalContent: {
    maxHeight: '80%',
  },
  infoList: {
    paddingHorizontal: THEME.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: THEME.colors.text,
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  infoValueSmall: {
    fontSize: 12,
  },
  infoDivider: {
    height: 1,
    backgroundColor: THEME.colors.primary,
    marginVertical: THEME.spacing.md,
    opacity: 0.3,
  },
});
