export interface Track {
    id: string;
    url: string;
    title: string;
    artist: string;
    album?: string;
    duration?: number;
    artwork?: string;
    year?: string;
    genre?: string;
}

export interface PlayerState {
    isPlaying: boolean;
    currentTrack: Track | null;
    queue: Track[];
    currentIndex: number;
    progress: number;
    duration: number;
    volume: number;
    shuffleMode: boolean;
    repeatMode: 'off' | 'one' | 'all';
}

export interface LibraryState {
    selectedFolders: string[];
    tracks: Track[];
    isLoading: boolean;
    searchQuery: string;
}

export interface Metadata {
    title: string;
    artist: string;
    album?: string;
    year?: string;
    genre?: string;
    duration?: number;
    picture?: {
        data: Buffer;
        format: string;
    };
}
