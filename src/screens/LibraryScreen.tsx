/**
 * TuneWell Library Screen
 * 
 * Browse and manage music library:
 * - Folder browser
 * - All tracks
 * - Albums and artists
 * - Sorting and filtering
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Alert,
  PermissionsAndroid,
  Platform,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickDirectory } from '@react-native-documents/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { THEME, SORT_OPTIONS } from '../config';
import { useLibraryStore, usePlayerStore, useThemeStore } from '../store';
import { audioService } from '../services/audio';
import { listSubfolders, getFolderName, SubfolderInfo } from '../native/FolderBrowser';
import MiniPlayer from '../components/player/MiniPlayer';
import type { Track } from '../types';
import type { ScannedTrack } from '../services/libraryScanner';

type ViewMode = 'folders' | 'tracks' | 'albums' | 'artists';

const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  
  try {
    const apiLevel = Platform.Version;
    
    // Android 13+ (API 33+) uses granular media permissions
    if (typeof apiLevel === 'number' && apiLevel >= 33) {
      const granted = await PermissionsAndroid.request(
        'android.permission.READ_MEDIA_AUDIO' as any,
        {
          title: 'Audio Permission',
          message: 'TuneWell needs access to your music files to play them.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Grant Access',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // Android 12 and below
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'TuneWell needs access to your music files to play them.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Grant Access',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.warn('Permission request error:', err);
    return false;
  }
};

export default function LibraryScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [manualPath, setManualPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSubfolderModal, setShowSubfolderModal] = useState(false);
  const [subfolders, setSubfolders] = useState<SubfolderInfo[]>([]);
  const [parentFolderUri, setParentFolderUri] = useState<string>('');
  const [parentFolderName, setParentFolderName] = useState<string>('');
  const { currentTrack } = usePlayerStore();
  const { colors, mode: themeMode } = useThemeStore();
  const { 
    scanFolders, 
    tracks,
    isScanning, 
    scanMessage,
    sortBy, 
    sortDescending, 
    stats, 
    addScanFolder, 
    removeScanFolder,
    clearScanFolders,
    startScan,
    setSortBy,
    toggleSortDirection,
  } = useLibraryStore();

  // Sort and filter tracks
  const filteredTracks = useMemo(() => {
    let result = [...tracks];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(track => 
        (track.title?.toLowerCase().includes(query)) ||
        (track.artist?.toLowerCase().includes(query)) ||
        (track.album?.toLowerCase().includes(query)) ||
        (track.filename.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = (a.title || a.filename).localeCompare(b.title || b.filename);
          break;
        case 'artist':
          comparison = (a.artist || 'Unknown').localeCompare(b.artist || 'Unknown');
          break;
        case 'album':
          comparison = (a.album || 'Unknown').localeCompare(b.album || 'Unknown');
          break;
        case 'dateAdded':
          comparison = (a.modifiedAt || 0) - (b.modifiedAt || 0);
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
        default:
          comparison = (a.title || a.filename).localeCompare(b.title || b.filename);
      }
      return sortDescending ? -comparison : comparison;
    });
    
    return result;
  }, [tracks, searchQuery, sortBy, sortDescending]);

  // Handle sort option selection
  const handleSortSelect = useCallback(() => {
    Alert.alert(
      'Sort By',
      'Select sort option:',
      [
        { text: 'Title', onPress: () => setSortBy('title') },
        { text: 'Artist', onPress: () => setSortBy('artist') },
        { text: 'Album', onPress: () => setSortBy('album') },
        { text: 'Date Added', onPress: () => setSortBy('dateAdded') },
        { text: 'Duration', onPress: () => setSortBy('duration') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [setSortBy]);

  // Group tracks by album
  const albumGroups = useMemo(() => {
    const groups: Record<string, { name: string; artist: string; artwork?: string; tracks: ScannedTrack[] }> = {};
    for (const track of filteredTracks) {
      const albumName = track.album || 'Unknown Album';
      if (!groups[albumName]) {
        groups[albumName] = {
          name: albumName,
          artist: track.artist || 'Unknown Artist',
          artwork: track.albumArtUri || track.artwork,
          tracks: [],
        };
      }
      groups[albumName].tracks.push(track);
    }
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTracks]);

  // Group tracks by artist
  const artistGroups = useMemo(() => {
    const groups: Record<string, { name: string; artwork?: string; tracks: ScannedTrack[]; albums: Set<string> }> = {};
    for (const track of filteredTracks) {
      const artistName = track.artist || 'Unknown Artist';
      if (!groups[artistName]) {
        groups[artistName] = {
          name: artistName,
          artwork: track.albumArtUri || track.artwork,
          tracks: [],
          albums: new Set(),
        };
      }
      groups[artistName].tracks.push(track);
      if (track.album) groups[artistName].albums.add(track.album);
    }
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTracks]);

  // Request permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (Platform.OS === 'android') {
        const apiLevel = Platform.Version;
        let permission: any;
        
        if (typeof apiLevel === 'number' && apiLevel >= 33) {
          permission = 'android.permission.READ_MEDIA_AUDIO';
        } else {
          permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        }
        
        const hasIt = await PermissionsAndroid.check(permission);
        setHasPermission(hasIt);
        
        // Auto-request if not granted
        if (!hasIt) {
          const granted = await requestStoragePermission();
          setHasPermission(granted);
        }
      } else {
        setHasPermission(true);
      }
    };
    checkPermission();
  }, []);

  const handleAddFolder = useCallback(async () => {
    try {
      // Ensure we have permission first
      if (!hasPermission) {
        const granted = await requestStoragePermission();
        setHasPermission(granted);
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'TuneWell needs storage permission to access your music files. Please grant permission in Settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Use directory picker to select a folder
      const result = await pickDirectory();

      if (result) {
        const folderPath = result.uri;
        
        // Check if folder already exists
        if (scanFolders.includes(folderPath)) {
          Alert.alert('Already Added', 'This folder is already in your library.');
          return;
        }
        
        // Check for subfolders
        const foundSubfolders = await listSubfolders(folderPath);
        const folderName = await getFolderName(folderPath);
        
        if (foundSubfolders.length > 0) {
          // Show subfolder selection option
          setParentFolderUri(folderPath);
          setParentFolderName(folderName);
          setSubfolders(foundSubfolders);
          setShowSubfolderModal(true);
        } else {
          // No subfolders, just add the folder
          addScanFolder(folderPath);
          Alert.alert(
            'Folder Added', 
            `Added folder to library.\n\nTap "Scan" to find music files.`,
            [
              { text: 'Done', style: 'cancel' },
              { text: 'Add Another', onPress: () => handleAddFolder() },
              { text: 'Scan Now', onPress: () => startScan() }
            ]
          );
        }
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED' && err?.message !== 'User canceled' && !err?.message?.includes('cancel')) {
        console.log('Folder picker error:', err);
        // Show manual entry option
        setShowFolderModal(true);
      }
    }
  }, [addScanFolder, hasPermission, startScan, scanFolders]);

  const handleManualAddFolder = useCallback(() => {
    if (!manualPath.trim()) {
      Alert.alert('Error', 'Please enter a folder path.');
      return;
    }
    
    const path = manualPath.trim();
    if (scanFolders.includes(path)) {
      Alert.alert('Already Added', 'This folder is already in your library.');
      return;
    }
    
    addScanFolder(path);
    setManualPath('');
    setShowFolderModal(false);
    Alert.alert('Folder Added', 'Folder added to library.');
  }, [manualPath, addScanFolder, scanFolders]);

  // Handle adding parent folder (includes all subfolders when scanned)
  const handleAddParentFolder = useCallback(() => {
    if (parentFolderUri && !scanFolders.includes(parentFolderUri)) {
      addScanFolder(parentFolderUri);
    }
    setShowSubfolderModal(false);
    setSubfolders([]);
    setParentFolderUri('');
    setParentFolderName('');
    Alert.alert(
      'Folder Added', 
      `Added folder to library.\n\nTap "Scan" to find music files.`,
      [
        { text: 'Done', style: 'cancel' },
        { text: 'Add Another', onPress: () => handleAddFolder() },
        { text: 'Scan Now', onPress: () => startScan() }
      ]
    );
  }, [parentFolderUri, addScanFolder, scanFolders, startScan, handleAddFolder]);

  // Handle toggling a subfolder (add or remove)
  const handleToggleSubfolder = useCallback((subfolder: SubfolderInfo) => {
    const pathToAdd = subfolder.path || subfolder.uri;
    const isAdded = scanFolders.includes(pathToAdd) || 
                    scanFolders.includes(subfolder.uri) ||
                    scanFolders.some(f => f.endsWith('/' + subfolder.name));
    
    if (isAdded) {
      // Remove the folder - try all possible paths
      if (scanFolders.includes(pathToAdd)) {
        removeScanFolder(pathToAdd);
      } else if (scanFolders.includes(subfolder.uri)) {
        removeScanFolder(subfolder.uri);
      } else {
        // Find and remove by name match
        const match = scanFolders.find(f => f.endsWith('/' + subfolder.name));
        if (match) removeScanFolder(match);
      }
    } else {
      // Add the folder
      addScanFolder(pathToAdd);
    }
  }, [addScanFolder, removeScanFolder, scanFolders]);

  // Check if subfolder is already added (by path or URI)
  const isSubfolderAdded = useCallback((subfolder: SubfolderInfo): boolean => {
    const pathToAdd = subfolder.path || subfolder.uri;
    return scanFolders.includes(pathToAdd) || 
           scanFolders.includes(subfolder.uri) ||
           scanFolders.some(f => f.endsWith('/' + subfolder.name));
  }, [scanFolders]);

  // Handle selecting all subfolders at once
  const handleSelectAllSubfolders = useCallback(() => {
    for (const subfolder of subfolders) {
      if (!isSubfolderAdded(subfolder)) {
        const pathToAdd = subfolder.path || subfolder.uri;
        addScanFolder(pathToAdd);
      }
    }
  }, [subfolders, isSubfolderAdded, addScanFolder]);

  // Handle deselecting all subfolders
  const handleDeselectAllSubfolders = useCallback(() => {
    for (const subfolder of subfolders) {
      if (isSubfolderAdded(subfolder)) {
        const pathToAdd = subfolder.path || subfolder.uri;
        if (scanFolders.includes(pathToAdd)) {
          removeScanFolder(pathToAdd);
        } else if (scanFolders.includes(subfolder.uri)) {
          removeScanFolder(subfolder.uri);
        } else {
          const match = scanFolders.find(f => f.endsWith('/' + subfolder.name));
          if (match) removeScanFolder(match);
        }
      }
    }
  }, [subfolders, isSubfolderAdded, removeScanFolder, scanFolders]);

  // Handle done with subfolder selection
  const handleSubfolderDone = useCallback(() => {
    setShowSubfolderModal(false);
    setSubfolders([]);
    setParentFolderUri('');
    setParentFolderName('');
    Alert.alert(
      'Folders Added', 
      `Tap "Scan" to find music files.`,
      [
        { text: 'Done', style: 'cancel' },
        { text: 'Add Another', onPress: () => handleAddFolder() },
        { text: 'Scan Now', onPress: () => startScan() }
      ]
    );
  }, [startScan, handleAddFolder]);

  const handleRemoveFolder = useCallback((folderPath: string) => {
    Alert.alert(
      'Remove Folder',
      'Remove this folder from your library?\n\nThis will not delete your music files.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeScanFolder(folderPath)
        }
      ]
    );
  }, [removeScanFolder]);

  const handleClearAllFolders = useCallback(() => {
    if (scanFolders.length === 0) return;
    
    Alert.alert(
      'Clear All Folders',
      `Remove all ${scanFolders.length} folder${scanFolders.length !== 1 ? 's' : ''} from your library?\n\nThis will not delete your music files.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => clearScanFolders()
        }
      ]
    );
  }, [scanFolders.length, clearScanFolders]);

  const handleScan = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestStoragePermission();
      setHasPermission(granted);
      if (!granted) {
        Alert.alert('Permission Required', 'Please grant storage permission to scan for music.');
        return;
      }
    }
    
    if (scanFolders.length === 0) {
      Alert.alert('No Folders', 'Please add at least one folder to scan.');
      return;
    }
    startScan();
  }, [scanFolders, startScan, hasPermission]);

  // Convert ScannedTrack to Track format for playback
  const convertToTrack = (scannedTrack: ScannedTrack): Track => ({
    id: scannedTrack.id,
    uri: scannedTrack.uri, // content:// URI from MediaStore
    filePath: scannedTrack.path,
    fileName: scannedTrack.filename,
    folderPath: scannedTrack.folder,
    folderName: scannedTrack.folder.split('/').pop() || 'Music',
    title: scannedTrack.title || scannedTrack.filename.replace(/\.[^/.]+$/, ''),
    artist: scannedTrack.artist || 'Unknown Artist',
    album: scannedTrack.album || 'Unknown Album',
    albumArtist: scannedTrack.albumArtist,
    genre: scannedTrack.genre,
    year: scannedTrack.year ? parseInt(scannedTrack.year, 10) : undefined,
    trackNumber: scannedTrack.trackNumber ? parseInt(scannedTrack.trackNumber, 10) : undefined,
    duration: scannedTrack.duration || 0,
    sampleRate: scannedTrack.sampleRate ? parseInt(scannedTrack.sampleRate, 10) : 44100,
    bitDepth: 16,
    bitRate: scannedTrack.bitrate ? parseInt(scannedTrack.bitrate, 10) : undefined,
    channels: 2,
    format: scannedTrack.extension.replace('.', '').toUpperCase(),
    isLossless: ['.flac', '.wav', '.aiff', '.alac', '.ape'].includes(scannedTrack.extension.toLowerCase()),
    isHighRes: scannedTrack.sampleRate ? parseInt(scannedTrack.sampleRate, 10) > 48000 : false,
    isDSD: ['.dff', '.dsf', '.dsd'].includes(scannedTrack.extension.toLowerCase()),
    // Use album art URI from MediaStore, or embedded artwork
    artworkUri: scannedTrack.albumArtUri || scannedTrack.artwork || undefined,
    playCount: 0,
    isFavorite: false,
    moods: [],
    dateAdded: scannedTrack.modifiedAt,
    dateModified: scannedTrack.modifiedAt,
  });

  const handlePlayTrack = useCallback(async (scannedTrack: ScannedTrack, index: number) => {
    // Check for DSD formats - these use native decoder
    const ext = scannedTrack.extension.toLowerCase();
    const isDSD = ['.dsf', '.dff', '.dsd'].includes(ext);
    
    if (isDSD) {
      console.log('[LibraryScreen] DSD format detected, using native decoder');
    }
    
    try {
      // Initialize audio service if needed
      await audioService.initialize();
      
      // Convert filtered tracks to Track format
      const allTracks: Track[] = filteredTracks.map(convertToTrack);
      
      // If we filtered out the track, show error
      if (allTracks.length === 0) {
        Alert.alert('No Playable Tracks', 'No audio files found.');
        return;
      }
      
      // Find the actual index
      const trackId = `mediastore_${scannedTrack.id.replace('mediastore_', '')}`;
      const trackIndex = allTracks.findIndex(t => t.id === trackId || t.id === scannedTrack.id);
      const playIndex = Math.max(0, trackIndex !== -1 ? trackIndex : Math.min(index, allTracks.length - 1));
      
      // Create queue items
      const queueItems = allTracks.map((track, idx) => ({
        id: `queue_${track.id}_${Date.now()}_${idx}`,
        track,
        addedAt: Date.now(),
        source: 'library' as const,
      }));
      
      // Play the queue starting from the selected track
      await audioService.playQueue(queueItems, playIndex);
    } catch (error: any) {
      console.error('Playback error:', error);
      Alert.alert('Playback Error', error.message || 'Failed to play track');
    }
  }, [filteredTracks]);

  // Play all tracks from a specific folder
  const handlePlayFolder = useCallback(async (folderUri: string) => {
    try {
      // Get the folder path from the URI for matching
      const decodedUri = decodeURIComponent(folderUri);
      
      // Filter tracks that belong to this folder
      // Match against the track's folder path
      const folderTracks = tracks.filter(track => {
        const trackFolder = decodeURIComponent(track.folder || '');
        // Check if track's folder contains the folder URI or matches the folder name
        return trackFolder.includes(decodedUri) || 
               decodedUri.includes(trackFolder) ||
               track.folder === folderUri;
      });
      
      if (folderTracks.length === 0) {
        Alert.alert('No Tracks', 'No audio files found in this folder.');
        return;
      }
      
      // Initialize audio service if needed
      await audioService.initialize();
      
      // Convert to Track format
      const allTracks: Track[] = folderTracks.map(convertToTrack);
      
      // Create queue items
      const queueItems = allTracks.map((track, idx) => ({
        id: `queue_${track.id}_${Date.now()}_${idx}`,
        track,
        addedAt: Date.now(),
        source: 'library' as const,
      }));
      
      // Play the queue starting from the first track
      await audioService.playQueue(queueItems, 0);
      
      // Show brief confirmation
      Alert.alert('Now Playing', `Playing ${folderTracks.length} tracks from folder`);
    } catch (error: any) {
      console.error('Folder playback error:', error);
      Alert.alert('Playback Error', error.message || 'Failed to play folder');
    }
  }, [tracks]);

  const renderViewModeTab = (mode: ViewMode, label: string) => (
    <TouchableOpacity
      style={[styles.tab, viewMode === mode && styles.tabActive]}
      onPress={() => setViewMode(mode)}
    >
      <Text style={[styles.tabText, viewMode === mode && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyLibrary = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="folder-open" size={64} color={THEME.colors.textMuted} />
      <Text style={styles.emptyStateTitle}>No Music Found</Text>
      <Text style={styles.emptyStateSubtext}>
        Add folders containing your music files to start building your library.
      </Text>
      <TouchableOpacity style={styles.addFolderButton} onPress={handleAddFolder}>
        <Text style={styles.addFolderButtonText}>Add Folder</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFolderView = () => (
    <View style={styles.viewContent}>
      {/* Add Folder Button - always visible */}
      <TouchableOpacity style={styles.addFolderRow} onPress={handleAddFolder}>
        <MaterialIcons name="add" size={24} color={THEME.colors.primary} />
        <Text style={styles.addFolderRowText}>Add Music Folder</Text>
      </TouchableOpacity>
      
      {scanFolders.length === 0 ? (
        <View style={styles.emptyFolders}>
          <Text style={styles.emptyFoldersText}>No folders added yet</Text>
          <Text style={styles.emptyFoldersSubtext}>Tap above to add your music folders</Text>
        </View>
      ) : (
        <>
        {/* Clear All button */}
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={handleClearAllFolders}
        >
          <MaterialIcons name="delete-sweep" size={18} color={THEME.colors.error || '#ff6b6b'} />
          <Text style={styles.clearAllText}>Clear All ({scanFolders.length})</Text>
        </TouchableOpacity>
        <FlatList
          data={scanFolders}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <View style={styles.folderItem}>
              <TouchableOpacity 
                style={styles.playFolderButton}
                onPress={() => handlePlayFolder(item)}
              >
                <MaterialIcons name="play-circle-filled" size={36} color={THEME.colors.primary} />
              </TouchableOpacity>
              <View style={styles.folderInfo}>
                <Text style={styles.folderName} numberOfLines={1}>
                  {decodeURIComponent(item.split('/').pop() || item.split('%2F').pop() || 'Folder')}
                </Text>
                <Text style={styles.folderPath} numberOfLines={1}>
                  {decodeURIComponent(item).replace('content://com.android.externalstorage.documents/tree/', '')}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.removeFolderButton}
                onPress={() => handleRemoveFolder(item)}
              >
                <MaterialIcons name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
        </>
      )}
    </View>
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderTracksView = () => (
    <View style={styles.viewContent}>
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={THEME.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tracks, artists, albums..."
          placeholderTextColor={THEME.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
            <MaterialIcons name="close" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Scan status */}
      {isScanning && (
        <View style={styles.scanStatus}>
          <Text style={styles.scanStatusText}>{scanMessage || 'Scanning...'}</Text>
        </View>
      )}
      
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>
          {filteredTracks.length} tracks {searchQuery ? `(filtered)` : ''} {stats?.totalSize ? `• ${formatFileSize(stats.totalSize)}` : ''}
        </Text>
        <View style={styles.sortControls}>
          <TouchableOpacity style={styles.sortButton} onPress={handleSortSelect}>
            <Text style={styles.sortButtonText}>
              {sortBy === 'title' ? 'Title' : 
               sortBy === 'artist' ? 'Artist' : 
               sortBy === 'album' ? 'Album' : 
               sortBy === 'dateAdded' ? 'Date' : 
               sortBy === 'duration' ? 'Duration' : sortBy}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortDirectionBtn} onPress={toggleSortDirection}>
            <Text style={styles.sortDirection}>{sortDescending ? '↓' : '↑'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {filteredTracks.length === 0 ? (
        <View style={styles.emptyFolders}>
          <Text style={styles.emptyFoldersText}>{searchQuery ? 'No matching tracks' : 'No tracks found'}</Text>
          <Text style={styles.emptyFoldersSubtext}>
            {searchQuery 
              ? 'Try a different search term'
              : scanFolders.length === 0 
                ? 'Add a folder first, then tap Scan' 
                : 'Tap Scan to find music files'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={styles.trackItem}
              onPress={() => handlePlayTrack(item, index)}
            >
              {(item.albumArtUri || item.artwork) ? (
                <View style={styles.trackArtwork}>
                  <Image 
                    source={{ uri: item.albumArtUri || item.artwork }}
                    style={styles.trackArtworkImage}
                  />
                </View>
              ) : (
                <View style={styles.trackIcon}>
                  <MaterialIcons name="music-note" size={24} color={THEME.colors.textMuted} />
                </View>
              )}
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {item.title || item.filename}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {item.artist || 'Unknown Artist'} • {item.album || 'Unknown Album'}
                </Text>
                <Text style={styles.trackDetails} numberOfLines={1}>
                  {item.extension.replace('.', '').toUpperCase()}
                  {item.bitrate ? ` • ${item.bitrate} kbps` : ''}
                  {item.sampleRate ? ` • ${item.sampleRate} Hz` : ''}
                </Text>
              </View>
              <View style={[styles.playIcon, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="play-arrow" size={24} color={colors.background} />
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  const handlePlayAlbum = useCallback(async (albumTracks: ScannedTrack[]) => {
    try {
      await audioService.initialize();
      const allTracks: Track[] = albumTracks.map(convertToTrack);
      const queueItems = allTracks.map((track, idx) => ({
        id: `queue_${track.id}_${Date.now()}_${idx}`,
        track,
        addedAt: Date.now(),
        source: 'library' as const,
      }));
      await audioService.playQueue(queueItems, 0);
    } catch (error: any) {
      Alert.alert('Playback Error', error.message || 'Failed to play album');
    }
  }, []);

  const renderAlbumsView = () => (
    <View style={styles.viewContent}>
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={THEME.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search albums..."
          placeholderTextColor={THEME.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
            <MaterialIcons name="close" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {albumGroups.length === 0 ? (
        renderEmptyLibrary()
      ) : (
        <FlatList
          data={albumGroups}
          keyExtractor={(item) => item.name}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.albumItem}
              onPress={() => handlePlayAlbum(item.tracks)}
            >
              {item.artwork ? (
                <Image 
                  source={{ uri: item.artwork }}
                  style={styles.albumArtwork}
                />
              ) : (
                <View style={[styles.albumArtwork, styles.albumArtworkPlaceholder]}>
                  <MaterialIcons name="album" size={40} color={THEME.colors.textMuted} />
                </View>
              )}
              <Text style={styles.albumName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.albumArtist} numberOfLines={1}>{item.artist}</Text>
              <Text style={styles.albumTrackCount}>{item.tracks.length} tracks</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.albumGrid}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  const renderArtistsView = () => (
    <View style={styles.viewContent}>
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={THEME.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search artists..."
          placeholderTextColor={THEME.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
            <MaterialIcons name="close" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {artistGroups.length === 0 ? (
        renderEmptyLibrary()
      ) : (
        <FlatList
          data={artistGroups}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.artistItem}
              onPress={() => handlePlayAlbum(item.tracks)}
            >
              {item.artwork ? (
                <Image 
                  source={{ uri: item.artwork }}
                  style={styles.artistArtwork}
                />
              ) : (
                <View style={[styles.artistArtwork, styles.artistArtworkPlaceholder]}>
                  <MaterialIcons name="person" size={32} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.artistInfo}>
                <Text style={[styles.artistName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.artistStats, { color: colors.textSecondary }]}>
                  {item.albums.size} albums • {item.tracks.length} tracks
                </Text>
              </View>
              <View style={[styles.playIcon, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="play-arrow" size={24} color={colors.background} />
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Library</Text>
        <TouchableOpacity style={[styles.scanButton, { backgroundColor: colors.surface }]} disabled={isScanning} onPress={handleScan}>
          <Text style={[styles.scanButtonText, { color: colors.text }]}>
            {isScanning ? 'Scanning...' : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {renderViewModeTab('folders', 'Folders')}
        {renderViewModeTab('tracks', 'Tracks')}
        {renderViewModeTab('albums', 'Albums')}
        {renderViewModeTab('artists', 'Artists')}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {viewMode === 'folders' && renderFolderView()}
        {viewMode === 'tracks' && renderTracksView()}
        {viewMode === 'albums' && renderAlbumsView()}
        {viewMode === 'artists' && renderArtistsView()}
        
        {/* Spacer for mini player */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Manual Folder Entry Modal */}
      <Modal
        visible={showFolderModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFolderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Folder Manually</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Enter the full path to your music folder
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceLight, color: colors.text, borderColor: colors.border }]}
              value={manualPath}
              onChangeText={setManualPath}
              placeholder="/storage/emulated/0/Music"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalCancelButton, { backgroundColor: colors.surfaceLight }]}
                onPress={() => {
                  setShowFolderModal(false);
                  setManualPath('');
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalAddButton, { backgroundColor: colors.primary }]}
                onPress={handleManualAddFolder}
              >
                <Text style={[styles.modalAddText, { color: colors.background }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Subfolder Selection Modal */}
      <Modal
        visible={showSubfolderModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSubfolderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.subfolderModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Subfolders Found</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {parentFolderName} has {subfolders.length} subfolder{subfolders.length !== 1 ? 's' : ''}
            </Text>
            
            {/* Add parent folder option */}
            <TouchableOpacity
              style={[styles.subfolderOption, { backgroundColor: colors.primary }]}
              onPress={handleAddParentFolder}
            >
              <MaterialIcons name="folder" size={24} color={colors.background} />
              <View style={styles.subfolderTextContainer}>
                <Text style={[styles.subfolderName, { color: colors.background }]}>
                  Add "{parentFolderName}" (includes all subfolders)
                </Text>
              </View>
              <MaterialIcons name="add" size={24} color={colors.background} />
            </TouchableOpacity>
            
            <Text style={[styles.subfolderDivider, { color: colors.textMuted }]}>
              Or select individual subfolders:
            </Text>
            
            {/* Select All / Deselect All buttons */}
            <View style={styles.selectButtonsRow}>
              <TouchableOpacity
                style={[styles.selectAllButton, { borderColor: colors.primary, flex: 1, marginRight: 8 }]}
                onPress={handleSelectAllSubfolders}
              >
                <MaterialIcons name="check-box" size={18} color={colors.primary} />
                <Text style={[styles.selectAllText, { color: colors.primary }]}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectAllButton, { borderColor: colors.error || '#ff6b6b', flex: 1 }]}
                onPress={handleDeselectAllSubfolders}
              >
                <MaterialIcons name="check-box-outline-blank" size={18} color={colors.error || '#ff6b6b'} />
                <Text style={[styles.selectAllText, { color: colors.error || '#ff6b6b' }]}>Deselect All</Text>
              </TouchableOpacity>
            </View>
            
            {/* Subfolder list */}
            <ScrollView style={styles.subfolderList} showsVerticalScrollIndicator={true}>
              {subfolders.map((subfolder) => {
                const isAdded = isSubfolderAdded(subfolder);
                return (
                  <TouchableOpacity
                    key={subfolder.uri}
                    style={[
                      styles.subfolderItem,
                      { backgroundColor: isAdded ? colors.surfaceLight : colors.background, borderColor: isAdded ? colors.primary : colors.border }
                    ]}
                    onPress={() => handleToggleSubfolder(subfolder)}
                  >
                    <MaterialIcons 
                      name={isAdded ? "check-box" : "check-box-outline-blank"}
                      size={20} 
                      color={isAdded ? colors.primary : colors.textMuted} 
                    />
                    <Text 
                      style={[
                        styles.subfolderItemText, 
                        { color: colors.text }
                      ]}
                      numberOfLines={1}
                    >
                      {subfolder.name}
                    </Text>
                    <MaterialIcons 
                      name="folder" 
                      size={20} 
                      color={isAdded ? colors.primary : colors.textMuted} 
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            {/* Action buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalCancelButton, { backgroundColor: colors.surfaceLight }]}
                onPress={() => {
                  setShowSubfolderModal(false);
                  setSubfolders([]);
                  setParentFolderUri('');
                  setParentFolderName('');
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalAddButton, { backgroundColor: colors.primary }]}
                onPress={handleSubfolderDone}
              >
                <Text style={[styles.modalAddText, { color: colors.background }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    paddingBottom: THEME.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  scanButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  scanButtonText: {
    color: THEME.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  tab: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    marginRight: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surface,
  },
  tabActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabText: {
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    fontSize: 14,
  },
  tabTextActive: {
    color: THEME.colors.text,
  },
  content: {
    flex: 1,
  },
  viewContent: {
    paddingHorizontal: THEME.spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xxl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: THEME.spacing.lg,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.xl,
  },
  addFolderButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
  },
  addFolderButtonText: {
    color: THEME.colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: THEME.spacing.lg,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
  },
  playFolderButton: {
    marginRight: THEME.spacing.md,
    padding: 4,
  },
  folderIcon: {
    fontSize: 32,
    marginRight: THEME.spacing.md,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.colors.text,
  },
  folderPath: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  clearAllText: {
    color: THEME.colors.error || '#ff6b6b',
    fontSize: 14,
    marginLeft: THEME.spacing.xs,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  sortLabel: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginRight: THEME.spacing.xs,
  },
  sortButtonText: {
    color: THEME.colors.text,
    fontSize: 13,
  },
  sortDirectionBtn: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  sortDirection: {
    color: THEME.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  statsInfo: {
    padding: THEME.spacing.md,
  },
  statsText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
  },
  gridPlaceholder: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xxl,
  },
  placeholderText: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
  },
  addFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderStyle: 'dashed',
  },
  addFolderRowIcon: {
    fontSize: 20,
    marginRight: THEME.spacing.md,
  },
  addFolderRowText: {
    fontSize: 16,
    color: THEME.colors.primary,
    fontWeight: '500',
  },
  emptyFolders: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
  },
  emptyFoldersText: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
  },
  emptyFoldersSubtext: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    marginTop: THEME.spacing.xs,
  },
  removeFolderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: THEME.spacing.sm,
  },
  removeFolderText: {
    color: THEME.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },
  modalInput: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    fontSize: 14,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: THEME.spacing.sm,
  },
  modalCancelButton: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
  },
  modalCancelText: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
  },
  modalAddButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  modalAddText: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  scanStatus: {
    backgroundColor: THEME.colors.primary + '20',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  scanStatusText: {
    color: THEME.colors.primary,
    fontSize: 14,
    textAlign: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
  },
  trackIcon: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  trackIconText: {
    fontSize: 24,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  trackDetails: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  trackArtwork: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.md,
    marginRight: THEME.spacing.md,
    overflow: 'hidden',
  },
  trackArtworkImage: {
    width: 48,
    height: 48,
    resizeMode: 'cover',
  },
  playIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: THEME.spacing.sm,
  },
  playIconText: {
    color: THEME.colors.text,
    fontSize: 14,
    marginLeft: 2,
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: THEME.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    fontSize: 16,
    color: THEME.colors.text,
  },
  searchClear: {
    padding: THEME.spacing.xs,
  },
  searchClearText: {
    color: THEME.colors.textMuted,
    fontSize: 16,
  },
  // Album styles
  albumGrid: {
    paddingHorizontal: THEME.spacing.xs,
  },
  albumItem: {
    flex: 1,
    margin: THEME.spacing.xs,
    maxWidth: '48%',
  },
  albumArtwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.xs,
  },
  albumArtworkPlaceholder: {
    backgroundColor: THEME.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumArtworkPlaceholderText: {
    fontSize: 40,
  },
  albumName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  albumArtist: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  albumTrackCount: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  // Artist styles
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
  },
  artistArtwork: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: THEME.spacing.md,
  },
  artistArtworkPlaceholder: {
    backgroundColor: THEME.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistArtworkPlaceholderText: {
    fontSize: 24,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  artistStats: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  // Subfolder modal styles
  subfolderModalContent: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  subfolderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  subfolderTextContainer: {
    flex: 1,
    marginHorizontal: THEME.spacing.sm,
  },
  subfolderName: {
    fontSize: 14,
    fontWeight: '500',
  },
  subfolderDivider: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: THEME.spacing.sm,
  },
  subfolderList: {
    maxHeight: 250,
    marginBottom: THEME.spacing.md,
  },
  subfolderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    marginBottom: THEME.spacing.xs,
  },
  subfolderItemText: {
    flex: 1,
    fontSize: 14,
    marginHorizontal: THEME.spacing.sm,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: THEME.spacing.xs,
  },
  selectButtonsRow: {
    flexDirection: 'row',
    marginBottom: THEME.spacing.sm,
  },
});
