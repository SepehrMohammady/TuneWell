/**
 * TuneWell Telegram Store
 * 
 * Persists Telegram bot configuration, channels, and audio file index.
 * Uses Zustand + MMKV for persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import type { TelegramAudioItem, TelegramBotUser } from '../services/telegram';

export interface TelegramChannel {
  id: number;
  title: string;
  username?: string;
  type: 'channel' | 'group' | 'supergroup';
  audioCount: number;
  lastSyncAt: number;
}

interface TelegramState {
  // Bot config
  botToken: string | null;
  botUser: TelegramBotUser | null;
  isConnected: boolean;

  // Channels/groups
  channels: TelegramChannel[];

  // Audio index: chatId -> audio items
  audioFiles: Record<number, TelegramAudioItem[]>;

  // Update tracking
  lastUpdateOffset: number;

  // UI
  isSyncing: boolean;

  // Actions
  setBotToken: (token: string | null) => void;
  setBotUser: (user: TelegramBotUser | null) => void;
  setConnected: (connected: boolean) => void;

  addChannel: (channel: TelegramChannel) => void;
  removeChannel: (chatId: number) => void;
  updateChannelSync: (chatId: number, audioCount: number) => void;

  setAudioFiles: (chatId: number, files: TelegramAudioItem[]) => void;
  addAudioFiles: (chatId: number, files: TelegramAudioItem[]) => void;

  setLastUpdateOffset: (offset: number) => void;
  setSyncing: (syncing: boolean) => void;

  disconnect: () => void;
}

export const useTelegramStore = create<TelegramState>()(
  persist(
    (set, get) => ({
      botToken: null,
      botUser: null,
      isConnected: false,
      channels: [],
      audioFiles: {},
      lastUpdateOffset: 0,
      isSyncing: false,

      setBotToken: (token) => set({ botToken: token }),
      setBotUser: (user) => set({ botUser: user }),
      setConnected: (connected) => set({ isConnected: connected }),

      addChannel: (channel) => {
        const existing = get().channels;
        if (existing.find((c) => c.id === channel.id)) return;
        set({ channels: [...existing, channel] });
      },

      removeChannel: (chatId) => {
        set({
          channels: get().channels.filter((c) => c.id !== chatId),
          audioFiles: (() => {
            const files = { ...get().audioFiles };
            delete files[chatId];
            return files;
          })(),
        });
      },

      updateChannelSync: (chatId, audioCount) => {
        const channels = get().channels.map((c) =>
          c.id === chatId
            ? { ...c, audioCount, lastSyncAt: Date.now() }
            : c,
        );
        set({ channels });
      },

      setAudioFiles: (chatId, files) => {
        set({
          audioFiles: { ...get().audioFiles, [chatId]: files },
        });
      },

      addAudioFiles: (chatId, newFiles) => {
        const existing = get().audioFiles[chatId] || [];
        const existingIds = new Set(existing.map((f) => f.fileUniqueId));
        const unique = newFiles.filter((f) => !existingIds.has(f.fileUniqueId));
        set({
          audioFiles: {
            ...get().audioFiles,
            [chatId]: [...existing, ...unique],
          },
        });
      },

      setLastUpdateOffset: (offset) => set({ lastUpdateOffset: offset }),
      setSyncing: (syncing) => set({ isSyncing: syncing }),

      disconnect: () => {
        set({
          botToken: null,
          botUser: null,
          isConnected: false,
          channels: [],
          audioFiles: {},
          lastUpdateOffset: 0,
          isSyncing: false,
        });
      },
    }),
    {
      name: 'tunewell.telegram',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
