/**
 * TuneWell Library Screen
 * 
 * Browse and manage music library:
 * - Folder browser
 * - All tracks
 * - Albums and artists
 * - Sorting and filtering
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME, SORT_OPTIONS } from '../config';
import { useLibraryStore, usePlayerStore } from '../store';
import MiniPlayer from '../components/player/MiniPlayer';

type ViewMode = 'folders' | 'tracks' | 'albums' | 'artists';

export default function LibraryScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const { currentTrack } = usePlayerStore();
  const { scanFolders, isScanning, sortBy, sortDescending, stats } = useLibraryStore();

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
      <Text style={styles.emptyStateIcon}>📁</Text>
      <Text style={styles.emptyStateTitle}>No Music Found</Text>
      <Text style={styles.emptyStateSubtext}>
        Add folders containing your music files to start building your library.
      </Text>
      <TouchableOpacity style={styles.addFolderButton}>
        <Text style={styles.addFolderButtonText}>Add Folder</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFolderView = () => (
    <View style={styles.viewContent}>
      {scanFolders.length === 0 ? (
        renderEmptyLibrary()
      ) : (
        <FlatList
          data={scanFolders}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.folderItem}>
              <Text style={styles.folderIcon}>📂</Text>
              <View style={styles.folderInfo}>
                <Text style={styles.folderName}>{item.split('/').pop()}</Text>
                <Text style={styles.folderPath}>{item}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );

  const renderTracksView = () => (
    <View style={styles.viewContent}>
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity style={styles.sortButton}>
          <Text style={styles.sortButtonText}>{sortBy}</Text>
          <Text style={styles.sortDirection}>{sortDescending ? '↓' : '↑'}</Text>
        </TouchableOpacity>
      </View>
      
      {stats?.totalTracks === 0 ? (
        renderEmptyLibrary()
      ) : (
        <View style={styles.statsInfo}>
          <Text style={styles.statsText}>
            {stats?.totalTracks || 0} tracks • {stats?.totalAlbums || 0} albums • {stats?.totalArtists || 0} artists
          </Text>
        </View>
      )}
    </View>
  );

  const renderAlbumsView = () => (
    <View style={styles.viewContent}>
      {stats?.totalAlbums === 0 ? (
        renderEmptyLibrary()
      ) : (
        <View style={styles.gridPlaceholder}>
          <Text style={styles.placeholderText}>Albums will appear here</Text>
        </View>
      )}
    </View>
  );

  const renderArtistsView = () => (
    <View style={styles.viewContent}>
      {stats?.totalArtists === 0 ? (
        renderEmptyLibrary()
      ) : (
        <View style={styles.gridPlaceholder}>
          <Text style={styles.placeholderText}>Artists will appear here</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <TouchableOpacity style={styles.scanButton} disabled={isScanning}>
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.tabs}>
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
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  sortLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginRight: THEME.spacing.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  sortButtonText: {
    color: THEME.colors.text,
    marginRight: THEME.spacing.xs,
  },
  sortDirection: {
    color: THEME.colors.primary,
    fontWeight: '600',
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
});
