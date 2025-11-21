import { create } from 'zustand';
import { Track, LibraryState } from '@/types';

interface LibraryStore extends LibraryState {
    // Actions
    setSelectedFolders: (folders: string[]) => void;
    addFolder: (folder: string) => void;
    removeFolder: (folder: string) => void;
    setTracks: (tracks: Track[]) => void;
    addTracks: (tracks: Track[]) => void;
    setLoading: (loading: boolean) => void;
    setSearchQuery: (query: string) => void;
    getFilteredTracks: () => Track[];
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
    // Initial state
    selectedFolders: [],
    tracks: [],
    isLoading: false,
    searchQuery: '',

    // Actions
    setSelectedFolders: (folders) => set({ selectedFolders: folders }),
    addFolder: (folder) => {
        const current = get().selectedFolders;
        if (!current.includes(folder)) {
            set({ selectedFolders: [...current, folder] });
        }
    },
    removeFolder: (folder) => {
        const current = get().selectedFolders;
        set({ selectedFolders: current.filter(f => f !== folder) });
    },
    setTracks: (tracks) => set({ tracks }),
    addTracks: (tracks) => {
        const current = get().tracks;
        set({ tracks: [...current, ...tracks] });
    },
    setLoading: (loading) => set({ isLoading: loading }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    getFilteredTracks: () => {
        const { tracks, searchQuery } = get();
        if (!searchQuery) return tracks;

        const query = searchQuery.toLowerCase();
        return tracks.filter(
            track =>
                track.title.toLowerCase().includes(query) ||
                track.artist.toLowerCase().includes(query) ||
                track.album?.toLowerCase().includes(query)
        );
    },
}));
