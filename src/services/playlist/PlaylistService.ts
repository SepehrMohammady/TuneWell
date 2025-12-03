/**
 * TuneWell Playlist Service
 * 
 * Service for managing playlists including:
 * - User-created playlists
 * - Smart playlists (auto-generated based on criteria)
 * - Mood playlists
 * - System playlists (favorites, most played, recently added)
 */

import { Q } from '@nozbe/watermelondb';
import { database, playlistsCollection, playlistTracksCollection, tracksCollection } from '../../database';
import type { Playlist, SmartPlaylistCriteria, Track } from '../../types';
import type { MoodId, PlaylistType } from '../../config/constants';
import { PLAYLIST_TYPES, MOOD_CATEGORIES } from '../../config/constants';

class PlaylistService {
  /**
   * Create a new user playlist
   */
  async createPlaylist(
    name: string,
    description?: string,
    trackIds: string[] = []
  ): Promise<string> {
    let playlistId = '';

    await database.write(async () => {
      const playlist = await playlistsCollection.create((record: any) => {
        playlistId = record.id;
        record.name = name;
        record.description = description;
        record.type = PLAYLIST_TYPES.USER;
        record.trackCount = trackIds.length;
        record.totalDuration = 0;
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
      });

      // Add tracks to playlist
      if (trackIds.length > 0) {
        const batch = trackIds.map((trackId, index) =>
          playlistTracksCollection.prepareCreate((record: any) => {
            record.playlistId = playlistId;
            record.trackId = trackId;
            record.position = index;
            record.addedAt = Date.now();
          })
        );
        await database.batch(...batch);
      }
    });

    return playlistId;
  }

  /**
   * Create a mood playlist
   */
  async createMoodPlaylist(mood: MoodId): Promise<string> {
    const moodInfo = MOOD_CATEGORIES.find((m) => m.id === mood);
    if (!moodInfo) throw new Error('Invalid mood');

    let playlistId = '';

    await database.write(async () => {
      await playlistsCollection.create((record: any) => {
        playlistId = record.id;
        record.name = moodInfo.name;
        record.description = `Tracks tagged as ${moodInfo.name}`;
        record.type = PLAYLIST_TYPES.MOOD;
        record.mood = mood;
        record.trackCount = 0;
        record.totalDuration = 0;
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
      });
    });

    return playlistId;
  }

  /**
   * Create a smart playlist with criteria
   */
  async createSmartPlaylist(
    name: string,
    criteria: SmartPlaylistCriteria,
    description?: string
  ): Promise<string> {
    let playlistId = '';

    await database.write(async () => {
      await playlistsCollection.create((record: any) => {
        playlistId = record.id;
        record.name = name;
        record.description = description;
        record.type = PLAYLIST_TYPES.SMART;
        record.smartCriteria = JSON.stringify(criteria);
        record.trackCount = 0;
        record.totalDuration = 0;
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
      });
    });

    return playlistId;
  }

  /**
   * Add tracks to a playlist
   */
  async addTracksToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    const playlist = await playlistsCollection.find(playlistId);
    if (!playlist) throw new Error('Playlist not found');

    await database.write(async () => {
      // Get current max position
      const existingTracks = await playlistTracksCollection
        .query(Q.where('playlist_id', playlistId))
        .fetch();
      
      let maxPosition = existingTracks.reduce(
        (max, t: any) => Math.max(max, t.position),
        -1
      );

      // Add new tracks
      const batch = trackIds.map((trackId, index) =>
        playlistTracksCollection.prepareCreate((record: any) => {
          record.playlistId = playlistId;
          record.trackId = trackId;
          record.position = maxPosition + 1 + index;
          record.addedAt = Date.now();
        })
      );

      // Update playlist track count
      const updatePlaylist = playlist.prepareUpdate((record: any) => {
        record.trackCount = existingTracks.length + trackIds.length;
        record.updatedAt = Date.now();
      });

      await database.batch(...batch, updatePlaylist);
    });
  }

  /**
   * Remove tracks from a playlist
   */
  async removeTracksFromPlaylist(
    playlistId: string,
    trackIds: string[]
  ): Promise<void> {
    await database.write(async () => {
      const toRemove = await playlistTracksCollection
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('track_id', Q.oneOf(trackIds))
        )
        .fetch();

      const batch: any[] = toRemove.map((pt) => pt.prepareDestroyPermanently());

      // Update playlist
      const playlist = await playlistsCollection.find(playlistId);
      if (playlist) {
        const updatePlaylist = playlist.prepareUpdate((record: any) => {
          record.trackCount = Math.max(0, record.trackCount - toRemove.length);
          record.updatedAt = Date.now();
        });
        batch.push(updatePlaylist);
      }

      await database.batch(...batch);
    });
  }

  /**
   * Reorder tracks in a playlist
   */
  async reorderPlaylistTracks(
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<void> {
    await database.write(async () => {
      const tracks = await playlistTracksCollection
        .query(Q.where('playlist_id', playlistId), Q.sortBy('position', Q.asc))
        .fetch();

      const batch = tracks.map((track: any, index) => {
        let newPosition = index;
        
        if (index === fromIndex) {
          newPosition = toIndex;
        } else if (fromIndex < toIndex && index > fromIndex && index <= toIndex) {
          newPosition = index - 1;
        } else if (fromIndex > toIndex && index >= toIndex && index < fromIndex) {
          newPosition = index + 1;
        }

        return track.prepareUpdate((record: any) => {
          record.position = newPosition;
        });
      });

      const playlist = await playlistsCollection.find(playlistId);
      if (playlist) {
        batch.push(
          playlist.prepareUpdate((record: any) => {
            record.updatedAt = Date.now();
          })
        );
      }

      await database.batch(...batch);
    });
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    await database.write(async () => {
      // Delete playlist tracks first
      const playlistTracks = await playlistTracksCollection
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      const batch: any[] = playlistTracks.map((pt) => pt.prepareDestroyPermanently());

      // Delete playlist
      const playlist = await playlistsCollection.find(playlistId);
      if (playlist) {
        batch.push(playlist.prepareDestroyPermanently());
      }

      await database.batch(...batch);
    });
  }

  /**
   * Update playlist details
   */
  async updatePlaylist(
    playlistId: string,
    updates: { name?: string; description?: string; artworkUri?: string }
  ): Promise<void> {
    await database.write(async () => {
      const playlist = await playlistsCollection.find(playlistId);
      if (!playlist) throw new Error('Playlist not found');

      await playlist.update((record: any) => {
        if (updates.name !== undefined) record.name = updates.name;
        if (updates.description !== undefined) record.description = updates.description;
        if (updates.artworkUri !== undefined) record.artworkUri = updates.artworkUri;
        record.updatedAt = Date.now();
      });
    });
  }

  /**
   * Get all user playlists
   */
  async getUserPlaylists(): Promise<Playlist[]> {
    const playlists = await playlistsCollection
      .query(Q.where('type', PLAYLIST_TYPES.USER))
      .fetch();
    
    return playlists as unknown as Playlist[];
  }

  /**
   * Get mood playlists
   */
  async getMoodPlaylists(): Promise<Playlist[]> {
    const playlists = await playlistsCollection
      .query(Q.where('type', PLAYLIST_TYPES.MOOD))
      .fetch();
    
    return playlists as unknown as Playlist[];
  }

  /**
   * Get favorite tracks
   */
  async getFavorites(): Promise<Track[]> {
    const tracks = await tracksCollection
      .query(Q.where('is_favorite', true))
      .fetch();
    
    return tracks as unknown as Track[];
  }

  /**
   * Toggle track favorite status
   */
  async toggleFavorite(trackId: string): Promise<boolean> {
    let isFavorite = false;

    await database.write(async () => {
      const track = await tracksCollection.find(trackId);
      if (!track) throw new Error('Track not found');

      await track.update((record: any) => {
        isFavorite = !record.isFavorite;
        record.isFavorite = isFavorite;
      });
    });

    return isFavorite;
  }

  /**
   * Get most played tracks
   */
  async getMostPlayed(limit = 50): Promise<Track[]> {
    const tracks = await tracksCollection
      .query(
        Q.where('play_count', Q.gt(0)),
        Q.sortBy('play_count', Q.desc),
        Q.take(limit)
      )
      .fetch();
    
    return tracks as unknown as Track[];
  }

  /**
   * Get recently added tracks
   */
  async getRecentlyAdded(limit = 50): Promise<Track[]> {
    const tracks = await tracksCollection
      .query(
        Q.sortBy('date_added', Q.desc),
        Q.take(limit)
      )
      .fetch();
    
    return tracks as unknown as Track[];
  }

  /**
   * Get recently played tracks
   */
  async getRecentlyPlayed(limit = 50): Promise<Track[]> {
    const tracks = await tracksCollection
      .query(
        Q.where('last_played_at', Q.notEq(null)),
        Q.sortBy('last_played_at', Q.desc),
        Q.take(limit)
      )
      .fetch();
    
    return tracks as unknown as Track[];
  }

  /**
   * Get tracks by mood
   */
  async getTracksByMood(mood: MoodId): Promise<Track[]> {
    const tracks = await tracksCollection
      .query(Q.where('moods', Q.like(`%"${mood}"%`)))
      .fetch();
    
    return tracks as unknown as Track[];
  }

  /**
   * Set track mood
   */
  async setTrackMood(trackId: string, mood: MoodId): Promise<void> {
    await database.write(async () => {
      const track = await tracksCollection.find(trackId);
      if (!track) throw new Error('Track not found');

      await track.update((record: any) => {
        const moods: MoodId[] = JSON.parse(record.moods || '[]');
        if (!moods.includes(mood)) {
          moods.push(mood);
          record.moods = JSON.stringify(moods);
        }
      });
    });
  }

  /**
   * Remove track mood
   */
  async removeTrackMood(trackId: string, mood: MoodId): Promise<void> {
    await database.write(async () => {
      const track = await tracksCollection.find(trackId);
      if (!track) throw new Error('Track not found');

      await track.update((record: any) => {
        const moods: MoodId[] = JSON.parse(record.moods || '[]');
        const filtered = moods.filter((m) => m !== mood);
        record.moods = JSON.stringify(filtered);
      });
    });
  }

  /**
   * Increment play count for a track
   */
  async incrementPlayCount(trackId: string): Promise<void> {
    await database.write(async () => {
      const track = await tracksCollection.find(trackId);
      if (!track) return;

      await track.update((record: any) => {
        record.playCount = (record.playCount || 0) + 1;
        record.lastPlayedAt = Date.now();
      });
    });
  }
}

export const playlistService = new PlaylistService();

export default playlistService;
