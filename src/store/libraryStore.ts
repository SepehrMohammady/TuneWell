/**
 * TuneWell Library Store
 * 
 * Zustand store for managing library state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import type { SortOption } from '../config/constants';
import { SORT_OPTIONS } from '../config/constants';
import type { LibraryScanResult, LibraryStats } from '../types';

interface LibraryState {
  // Scan folders
  scanFolders: string[];
  
  // Scan state
  isScanning: boolean;
  scanProgress: number;
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
  isScanning: false,
  scanProgress: 0,
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
