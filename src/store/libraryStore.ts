/**
 * Library Store - Manages music library state
 */

import {create} from 'zustand';
import {Track, Folder, SortOption, SortDirection} from '@/types';

interface LibraryStore {
  // State
  tracks: Track[];
  folders: Folder[];
  isScanning: boolean;
  currentFolder?: string;
  sortBy: SortOption;
  sortDirection: SortDirection;
  searchQuery: string;

  // Actions
  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  deleteTrack: (id: string) => void;
  
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  
  setIsScanning: (isScanning: boolean) => void;
  setCurrentFolder: (folder?: string) => void;
  
  setSortBy: (sortBy: SortOption) => void;
  setSortDirection: (direction: SortDirection) => void;
  setSearchQuery: (query: string) => void;

  // Computed
  getFilteredTracks: () => Track[];
  getSortedTracks: () => Track[];
  getTracksByFolder: (folderPath: string) => Track[];
  getTracksByArtist: (artist: string) => Track[];
  getTracksByAlbum: (album: string) => Track[];
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  // Initial state
  tracks: [],
  folders: [],
  isScanning: false,
  currentFolder: undefined,
  sortBy: SortOption.TITLE,
  sortDirection: SortDirection.ASC,
  searchQuery: '',

  // Actions
  setTracks: (tracks) => set({tracks}),
  
  addTrack: (track) => {
    const {tracks} = get();
    set({tracks: [...tracks, track]});
  },

  updateTrack: (id, updates) => {
    const {tracks} = get();
    set({
      tracks: tracks.map(track => 
        track.id === id ? {...track, ...updates} : track
      ),
    });
  },

  deleteTrack: (id) => {
    const {tracks} = get();
    set({tracks: tracks.filter(track => track.id !== id)});
  },

  setFolders: (folders) => set({folders}),
  
  addFolder: (folder) => {
    const {folders} = get();
    set({folders: [...folders, folder]});
  },

  setIsScanning: (isScanning) => set({isScanning}),
  setCurrentFolder: (currentFolder) => set({currentFolder}),
  setSortBy: (sortBy) => set({sortBy}),
  setSortDirection: (sortDirection) => set({sortDirection}),
  setSearchQuery: (searchQuery) => set({searchQuery}),

  // Computed getters
  getFilteredTracks: () => {
    const {tracks, searchQuery, currentFolder} = get();
    let filtered = tracks;

    // Filter by folder if selected
    if (currentFolder) {
      filtered = filtered.filter(track => track.folderPath === currentFolder);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        track =>
          track.title.toLowerCase().includes(query) ||
          track.artist?.toLowerCase().includes(query) ||
          track.album?.toLowerCase().includes(query)
      );
    }

    return filtered;
  },

  getSortedTracks: () => {
    const {getFilteredTracks, sortBy, sortDirection} = get();
    const tracks = getFilteredTracks();

    const sorted = [...tracks].sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortBy) {
        case SortOption.FOLDER_NAME:
          compareA = a.folderPath;
          compareB = b.folderPath;
          break;
        case SortOption.FILE_NAME:
          compareA = a.path;
          compareB = b.path;
          break;
        case SortOption.DATE_ADDED:
          compareA = a.dateAdded.getTime();
          compareB = b.dateAdded.getTime();
          break;
        case SortOption.DATE_MODIFIED:
          compareA = a.dateModified.getTime();
          compareB = b.dateModified.getTime();
          break;
        case SortOption.ARTIST:
          compareA = a.artist || '';
          compareB = b.artist || '';
          break;
        case SortOption.ALBUM:
          compareA = a.album || '';
          compareB = b.album || '';
          break;
        case SortOption.TITLE:
          compareA = a.title;
          compareB = b.title;
          break;
        case SortOption.DURATION:
          compareA = a.duration;
          compareB = b.duration;
          break;
        case SortOption.PLAY_COUNT:
          compareA = a.playCount;
          compareB = b.playCount;
          break;
        default:
          compareA = a.title;
          compareB = b.title;
      }

      if (compareA < compareB) {
        return sortDirection === SortDirection.ASC ? -1 : 1;
      }
      if (compareA > compareB) {
        return sortDirection === SortDirection.ASC ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  },

  getTracksByFolder: (folderPath) => {
    const {tracks} = get();
    return tracks.filter(track => track.folderPath === folderPath);
  },

  getTracksByArtist: (artist) => {
    const {tracks} = get();
    return tracks.filter(track => track.artist === artist);
  },

  getTracksByAlbum: (album) => {
    const {tracks} = get();
    return tracks.filter(track => track.album === album);
  },
}));
