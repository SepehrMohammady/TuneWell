/**
 * TuneWell Library Store
 * 
 * Zustand store for managing library state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import { zustandStorage } from '../utils/storage';
import type { SortOption } from '../config/constants';
import { SORT_OPTIONS } from '../config/constants';
import type { LibraryScanResult, LibraryStats } from '../types';
import { scanLibrary, scanWithMediaStore, ScannedTrack } from '../services/libraryScanner';

interface LibraryState {
  // Scan folders
  scanFolders: string[];
  
  // Scanned tracks
  tracks: ScannedTrack[];
  
  // Scan state
  isScanning: boolean;
  scanProgress: number;
  scanMessage: string;
  lastScanResult: LibraryScanResult | null;
  lastScanAt: number | null;
  
  // Library stats
  stats: LibraryStats | null;
  
  // View preferences
  sortBy: SortOption;
  sortDescending: boolean;
  viewMode: 'list' | 'grid';
  groupBy: 'none' | 'album' | 'artist' | 'folder' | 'genre';
  
  // Search
  searchQuery: string;
  
  // Actions
  addScanFolder: (path: string) => void;
  removeScanFolder: (path: string) => void;
  clearScanFolders: () => void;
  
  startScan: () => void;
  setScanning: (isScanning: boolean) => void;
  setScanProgress: (progress: number) => void;
  setLastScanResult: (result: LibraryScanResult) => void;
  
  setStats: (stats: LibraryStats) => void;
  
  setSortBy: (sortBy: SortOption) => void;
  setSortDescending: (descending: boolean) => void;
  toggleSortDirection: () => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  setGroupBy: (groupBy: 'none' | 'album' | 'artist' | 'folder' | 'genre') => void;
  
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  reset: () => void;
}

const initialState = {
  scanFolders: [],
  tracks: [] as ScannedTrack[],
  isScanning: false,
  scanProgress: 0,
  scanMessage: '',
  lastScanResult: null,
  lastScanAt: null,
  stats: null,
  sortBy: SORT_OPTIONS.TITLE as SortOption,
  sortDescending: false,
  viewMode: 'list' as const,
  groupBy: 'none' as const,
  searchQuery: '',
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      addScanFolder: (path) => {
        const { scanFolders } = get();
        if (!scanFolders.includes(path)) {
          set({ scanFolders: [...scanFolders, path] });
        }
      },
      
      removeScanFolder: (path) => {
        const { scanFolders } = get();
        set({ scanFolders: scanFolders.filter((p) => p !== path) });
      },
      
      clearScanFolders: () => set({ scanFolders: [] }),
      
      startScan: async () => {
        const { scanFolders, isScanning } = get();
        if (isScanning) return;
        
        if (scanFolders.length === 0) {
          set({ scanMessage: 'Please add folders first' });
          return;
        }
        
        set({ isScanning: true, scanProgress: 0, scanMessage: 'Starting scan...' });
        
        try {
          // Use folder-based scanning with MediaStore
          const result = await scanLibrary(scanFolders, (message, count) => {
            set({ scanMessage: message, scanProgress: Math.min(count, 100) });
          });
          
          // Get unique artists and albums
          const artists = new Set<string>();
          const albums = new Set<string>();
          
          for (const track of result.tracks) {
            if (track.artist) artists.add(track.artist);
            if (track.album) albums.add(track.album);
          }
          
          set({ 
            isScanning: false, 
            scanProgress: 100,
            scanMessage: `Found ${result.totalTracks} tracks`,
            lastScanAt: Date.now(),
            tracks: result.tracks,
            stats: {
              totalTracks: result.totalTracks,
              totalAlbums: albums.size,
              totalArtists: artists.size,
              totalDuration: 0,
              totalSize: result.totalSize,
              formats: result.formats,
              highResCount: 0,
              dsdCount: (result.formats['DFF'] || 0) + (result.formats['DSF'] || 0) + (result.formats['DSD'] || 0),
            }
          });
        } catch (error: any) {
          console.error('Scan error:', error);
          set({ 
            isScanning: false, 
            scanMessage: `Scan failed: ${error.message}`,
          });
        }
      },
      
      setScanning: (isScanning) => {
        if (isScanning) {
          set({ isScanning: true, scanProgress: 0 });
        } else {
          set({ isScanning: false, lastScanAt: Date.now() });
        }
      },
      
      setScanProgress: (progress) => set({ scanProgress: progress }),
      
      setLastScanResult: (result) => set({ 
        lastScanResult: result,
        lastScanAt: Date.now(),
      }),
      
      setStats: (stats) => set({ stats }),
      
      setSortBy: (sortBy) => set({ sortBy }),
      
      setSortDescending: (descending) => set({ sortDescending: descending }),
      
      toggleSortDirection: () => set((state) => ({ 
        sortDescending: !state.sortDescending 
      })),
      
      setViewMode: (mode) => set({ viewMode: mode }),
      
      setGroupBy: (groupBy) => set({ groupBy }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      clearSearch: () => set({ searchQuery: '' }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'library-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        scanFolders: state.scanFolders,
        lastScanAt: state.lastScanAt,
        sortBy: state.sortBy,
        sortDescending: state.sortDescending,
        viewMode: state.viewMode,
        groupBy: state.groupBy,
      }),
    }
  )
);

export default useLibraryStore;
